import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  Backpack,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Waves,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import {
  createArt,
  loadHero,
  loadHeroPortraits,
  loadProps,
  loadWorldArt,
  loadWorldSky,
  TITLE_WORLD,
  WORLD_ART,
  type ArtPack,
} from "@/game/assets";
import { CHARACTERS, getCharacter } from "@/game/characters";
import { createLevels, SECRET_WORLDS, WORLDS } from "@/game/levels";
import {
  bindInput,
  clearTouch,
  pollActions,
  setInjectedKeys,
  setTouch,
  unbindInput,
} from "@/game/input";
import { resetMusic, setMuted, stopNarration, tickMusic, unlockAudio } from "@/game/audio";
import { discoverSecret, loadSave, recordWin, writeResume, writeSave, type SaveData } from "@/game/save";
import { cameraOf, renderGame } from "@/game/render";
import { createGame, updateGame } from "@/game/sim";
import { getDossier, getStory, type StoryCard } from "@/game/stories";
import type { Ajustes, CharacterId, Game } from "@/game/types";
import { CAMPAIGN_COUNT, FIXED_DT, MAX_LIVES, VIEW_H, VIEW_W, WORLD_COUNT, WORLD_TOTAL } from "@/game/types";

type Screen = "title" | "chars" | "worlds" | "how" | "play";

const LEVELS = createLevels();
const IDLE_INPUT = {
  moveX: 0,
  jump: false,
  jumpHeld: false,
  down: false,
  power: false,
  pause: false,
  restart: false,
};

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  // El arte llega por partes y se va acumulando en este mismo objeto; `artTick`
  // solo existe para que React vuelva a pintar cuando entra algo nuevo.
  const artRef = useRef<ArtPack>(createArt());
  const hudRef = useRef<(patch: Partial<Hud>) => void>(() => {});
  const restartRef = useRef<() => void>(() => {});
  const [, setArtTick] = useState(0);
  const art = artRef.current;
  const [worldReady, setWorldReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("title");
  const [save, setSave] = useState<SaveData>({
    version: 1,
    unlocked: 1,
    best: Array.from({ length: WORLD_TOTAL }, () => 0),
    character: "maya",
    muted: false,
    secrets: [],
    resume: null,
    assist: false,
    shake: 1,
  });
  const [charId, setCharId] = useState<CharacterId>(save.character);
  const [levelIndex, setLevelIndex] = useState(0);
  const [hud, setHud] = useState<Hud>({
    coins: 0,
    total: 0,
    lives: MAX_LIVES,
    status: "playing",
    name: "",
    power: "",
    dash: 1,
    breath: 7,
    maxBreath: 7,
    canSwim: false,
    inWater: false,
    note: "",
    poleHint: "",
  });
  const [muted, setMutedUi] = useState(save.muted);
  const [touchUi, setTouchUi] = useState(false);
  const [intro, setIntro] = useState<StoryCard | null>(null);
  const [factId, setFactId] = useState<string | null>(null);
  const [knowMore, setKnowMore] = useState(false);
  const introRef = useRef(false);
  const spawnRef = useRef<{ x: number; y: number; lives?: number; coins?: number; taken?: boolean[]; poleIndex?: number } | null>(null);
  const skipIntroRef = useRef(false);

  // Lo que el jugador ha decidido sobre dificultad y sacudida. La simulación
  // los recibe al crear la partida, así que cambian al reiniciar el nivel.
  const ajustes: Ajustes = { shake: save.shake, assist: save.assist };

  function guardarAjuste(patch: Partial<SaveData>) {
    const next = { ...save, ...patch };
    setSave(next);
    writeSave(next);
    // La sacudida se puede cambiar en caliente; la ayuda espera al reinicio.
    const g = gameRef.current;
    if (g && typeof patch.shake === "number") g.shake = patch.shake;
  }

  // El bucle propone un HUD sesenta veces por segundo, pero sus valores cambian
  // de tanto en tanto. Comparar aquí evita que React reconcilie el árbol entero
  // del juego en cada fotograma; antes esto era el mayor gasto fuera del canvas.
  const hudMirror = useRef<Hud>(hud);
  hudRef.current = (patch) => {
    const prev = hudMirror.current;
    let changed = false;
    for (const key of Object.keys(patch) as (keyof Hud)[]) {
      if (prev[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    const next = { ...prev, ...patch };
    hudMirror.current = next;
    setHud(next);
  };

  /** Reemplaza el HUD entero (cambio de nivel o reinicio). */
  function applyHud(next: Hud) {
    hudMirror.current = next;
    setHud(next);
  }

  function haltVoice() {
    stopNarration();
  }

  function dismissIntro() {
    introRef.current = false;
    setIntro(null);
    haltVoice();
  }

  function hardRestart() {
    unlockAudio();
    introRef.current = false;
    setIntro(null);
    haltVoice();
    const ch = getCharacter(charId);
    const level = LEVELS[levelIndex];
    if (!level) return;
    const game = createGame(level, ch, undefined, ajustes);
    gameRef.current = game;
    resetMusic();
    applyHud({
      coins: 0,
      total: game.totalCoins,
      lives: game.lives,
      status: "playing",
      name: level.name,
      power: ch.power,
      dash: 1,
      breath: game.player.breath,
      maxBreath: game.player.maxBreath,
      canSwim: !!level.canSwim,
      inWater: false,
      note: "",
      poleHint: "",
    });
  }
  restartRef.current = hardRestart;

  // El arte se pide por tramos, según lo que se esté mirando. Antes se
  // descargaban los diecinueve megas de golpe —doscientas cincuenta peticiones,
  // casi todas en fila— antes de poder tocar el primer botón.

  // Portada: basta el cielo del fondo.
  useEffect(() => {
    let live = true;
    void loadWorldSky(artRef.current, TITLE_WORLD).then(() => {
      if (live) setArtTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, []);

  // Los retratos de los cinco héroes, al abrir la selección.
  useEffect(() => {
    if (screen !== "chars") return;
    let live = true;
    void loadHeroPortraits(artRef.current).then(() => {
      if (live) setArtTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [screen]);

  // Las miniaturas de la pantalla de mundos entran una a una, para que la
  // cuadrícula se vaya poblando en vez de quedarse en negro hasta el final.
  useEffect(() => {
    if (screen !== "worlds") return;
    let live = true;
    void (async () => {
      for (const world of WORLD_ART) {
        if (!live) return;
        await loadWorldSky(artRef.current, world);
        if (live) setArtTick((n) => n + 1);
      }
    })();
    return () => {
      live = false;
    };
  }, [screen]);

  // Al jugar: el héroe elegido, el mundo donde cae y los objetos sueltos.
  useEffect(() => {
    if (screen !== "play") return;
    const level = LEVELS[levelIndex];
    if (!level) return;
    let live = true;
    setWorldReady(false);
    const jobs = [
      loadHero(artRef.current, charId),
      loadWorldArt(artRef.current, level.sky),
      loadProps(artRef.current),
    ];
    if (level.tile !== level.sky) jobs.push(loadWorldArt(artRef.current, level.tile));
    void Promise.all(jobs).then(() => {
      if (!live) return;
      setArtTick((n) => n + 1);
      setWorldReady(true);
    });
    return () => {
      live = false;
    };
  }, [screen, charId, levelIndex]);

  useEffect(() => {
    const loaded = loadSave();
    setSave(loaded);
    setCharId(loaded.character);
    setMutedUi(loaded.muted);
    setMuted(loaded.muted);
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
    setTouchUi(coarse);
  }, []);

  useEffect(() => {
    if (screen !== "play") return;
    bindInput();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // El lienzo medía 960×540 y se estiraba por CSS, así que en pantallas
    // Retina y en el móvil el juego se veía borroso. Se dibuja a la densidad
    // real del dispositivo y el render sigue trabajando en las mismas
    // coordenadas lógicas.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(VIEW_W * dpr);
    canvas.height = Math.round(VIEW_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ch = getCharacter(charId);
    const level = LEVELS[levelIndex];
    if (!level) return;
    const resume = spawnRef.current ?? undefined;
    spawnRef.current = null;
    if (skipIntroRef.current) {
      skipIntroRef.current = false;
      introRef.current = false;
      setIntro(null);
    }
    const game = createGame(level, ch, resume, ajustes);
    gameRef.current = game;
    resetMusic();
    applyHud({
      coins: game.coins,
      total: game.totalCoins,
      lives: game.lives,
      status: "playing",
      name: level.name,
      power: ch.power,
      dash: 1,
      breath: game.player.breath,
      maxBreath: game.player.maxBreath,
      canSwim: !!level.canSwim,
      inWater: false,
      note: "",
      poleHint: "",
    });

    window.__controlsTest = {
      getYaw: () => 0,
      getSpeed: () => Math.abs(gameRef.current?.player.vx ?? 0),
      getX: () => gameRef.current?.player.x ?? 0,
      getVx: () => gameRef.current?.player.vx ?? 0,
      getY: () => gameRef.current?.player.y ?? 0,
      getVy: () => gameRef.current?.player.vy ?? 0,
      getWallDir: () => gameRef.current?.player.wallDir ?? 0,
      getJumpsLeft: () => gameRef.current?.player.jumpsLeft ?? 0,
      getStatus: () => gameRef.current?.status ?? "",
      getLives: () => gameRef.current?.lives ?? 0,
      getCoins: () => gameRef.current?.coins ?? 0,
      getBreath: () => gameRef.current?.player.breath ?? 0,
      getInWater: () => !!gameRef.current?.player.inWater,
      getWorld: () => gameRef.current?.level.world ?? "",
      getSpawnX: () => gameRef.current?.spawnX ?? 0,
      getSpawnY: () => gameRef.current?.spawnY ?? 0,
      getBeam: () => gameRef.current?.beam?.t ?? 0,
      getAtPole: () => !!gameRef.current?.atPole,
      getWarp: () => gameRef.current?.warp?.world ?? "",
      getLevelCount: () => LEVELS.length,
      getLevelWorlds: () => LEVELS.map((l) => l.world).join(","),
      getCrouching: () => !!gameRef.current?.player.crouching,
      getDragging: () => !!gameRef.current?.player.dragging,
      getClimbing: () => !!gameRef.current?.player.climbing,
      getHanging: () => !!gameRef.current?.player.hanging,
      getH: () => gameRef.current?.player.h ?? 0,
      setPos: (x, y) => {
        const g = gameRef.current;
        if (!g) return;
        g.player.x = x;
        g.player.y = y;
        g.player.vx = 0;
        g.player.vy = 0;
        g.player.crouching = false;
        g.player.dragging = false;
        g.player.climbing = false;
        g.player.hanging = false;
        g.player.hangPlat = null;
        g.player.h = 42;
      },
      setKeys: (codes) => setInjectedKeys(codes),
      setSteer: () => {},
    };

    let acc = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const raw = Math.min(0.05, (now - last) / 1000);
      last = now;
      const live = gameRef.current;
      if (live) {
        const input = pollActions();
        if (input.restart) restartRef.current();
        if (input.pause && !introRef.current) {
          if (live.status === "playing") live.status = "paused";
          else if (live.status === "paused") live.status = "playing";
        }
        acc += raw;
        while (acc >= FIXED_DT) {
          acc -= FIXED_DT;
          const blocked = introRef.current;
          if (!blocked) {
            updateGame(live, live.status === "playing" ? input : IDLE_INPUT, FIXED_DT);
            if (live.status === "playing") tickMusic(FIXED_DT);
          }
        }
        renderGame(ctx, live, artRef.current, cameraOf(live));
        hudRef.current({
          coins: live.coins,
          total: live.totalCoins,
          lives: live.lives,
          status: live.status,
          name: live.level.name,
          power: live.character.power,
          dash: live.player.dashCd <= 0 ? 1 : 0,
          breath: Math.round(live.player.breath * 10) / 10,
          maxBreath: live.player.maxBreath,
          canSwim: !!live.level.canSwim,
          inWater: live.player.inWater,
          note: live.message,
          poleHint: live.poleHint,
        });
        if (live.saveFlag) {
          live.saveFlag = false;
          const taken = live.level.coins.map((c) => c.taken);
          const next = writeResume({
            world: live.level.world,
            levelIndex: live.level.index,
            spawnX: live.spawnX,
            spawnY: live.spawnY,
            poleIndex: live.poleIndex,
            lives: live.lives,
            coins: live.coins,
            taken,
            character: charId,
          });
          if (live.foundSecret) {
            const found = discoverSecret(live.foundSecret);
            next.secrets = found.secrets;
            live.foundSecret = null;
          }
          setSave(next);
        }
        if (live.warp && live.warpT <= 0) {
          const w = live.warp;
          const dest = LEVELS.findIndex((l) => l.world === w.world);
          if (dest < 0) {
            live.warp = null;
          } else {
            live.warp = null;
            spawnRef.current =
              w.spawnX != null && w.spawnY != null
                ? { x: w.spawnX, y: w.spawnY, lives: live.lives }
                : { x: LEVELS[dest]!.spawnX, y: LEVELS[dest]!.spawnY, lives: live.lives };
            skipIntroRef.current = !w.intro;
            const chNow = getCharacter(charId);
            const destLevel = LEVELS[dest]!;
            if (w.intro) {
              introRef.current = true;
              const story = getStory(chNow, destLevel.world, destLevel.name, destLevel.subtitle);
              setIntro(story);
            } else {
              introRef.current = false;
              setIntro(null);
              haltVoice();
            }
            setLevelIndex(dest);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      unbindInput();
      setInjectedKeys([]);
      clearTouch();
      gameRef.current = null;
      window.__controlsTest = undefined;
    };
  }, [screen, charId, levelIndex]);

  function startLevel(i: number, opts?: { continue?: boolean }) {
    unlockAudio();
    const using = opts?.continue ? save.resume : null;
    const id = using?.character ?? charId;
    const ch = getCharacter(id);
    if (using) setCharId(using.character);
    const level = LEVELS[i];
    if (using) {
      spawnRef.current = {
        x: using.spawnX,
        y: using.spawnY,
        lives: using.lives,
        coins: using.coins,
        taken: using.taken,
        poleIndex: using.poleIndex,
      };
    } else {
      spawnRef.current = null;
    }
    setLevelIndex(i);
    setScreen("play");
    if (level && !opts?.continue) {
      const story = getStory(ch, level.world, level.name, level.subtitle);
      introRef.current = true;
      setIntro(story);
    } else {
      introRef.current = false;
      setIntro(null);
      haltVoice();
    }
  }

  function continueRun() {
    const r = save.resume;
    if (!r) {
      setScreen("chars");
      return;
    }
    setCharId(r.character);
    startLevel(r.levelIndex, { continue: true });
  }

  function onWin() {
    const g = gameRef.current;
    if (!g) return;
    const next = recordWin(g.level.index, g.coins, g.level.world);
    setSave(next);
  }

  useEffect(() => {
    if (hud.status === "win") onWin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.status]);

  function toggleMute() {
    const v = !muted;
    setMutedUi(v);
    setMuted(v);
    const s = { ...save, muted: v };
    setSave(s);
    writeSave(s);
  }

  function pickChar(id: CharacterId) {
    setCharId(id);
    setFactId(null);
    setKnowMore(false);
    const s = { ...save, character: id };
    setSave(s);
    writeSave(s);
  }

  useEffect(() => {
    if (!intro) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "KeyE" || e.code === "Escape") {
        e.preventDefault();
        dismissIntro();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro]);

  const ch = getCharacter(charId);
  const dossier = getDossier(charId);
  const openFact = dossier.facts.find((f) => f.id === factId);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg font-sans text-fg">
      {screen !== "play" && <MenuBackdrop art={art} screen={screen} levelIndex={levelIndex} />}

      {screen === "title" && (
        <Shell>
          <p className="text-sm font-medium tracking-[0.22em] text-muted uppercase">Plataformas de cacao</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl">Cacao Rush</h1>
          <p className="mt-4 max-w-md text-muted">
            Corre, salta y guarda cada grano. Cinco héroes, doce mundos del Ecuador —selva, glaciar, Los Túneles, el páramo, Quito y el Museo del Oro— y una meta de oro al final de cada camino.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Primary
              onClick={() => {
                unlockAudio();
                setFactId(null);
                setKnowMore(false);
                setScreen("chars");
              }}
            >
              Jugar
            </Primary>
            {save.resume && (
              <Ghost
                onClick={() => {
                  unlockAudio();
                  continueRun();
                }}
              >
                Continuar
              </Ghost>
            )}
            <Ghost onClick={() => setScreen("how")}>Cómo se juega</Ghost>
          </div>
        </Shell>
      )}

      {screen === "how" && (
        <Shell>
          <Back onClick={() => setScreen("title")} />
          <h2 className="mt-4 font-display text-4xl">Cómo se juega</h2>
          <ul className="mt-6 max-w-lg space-y-3 text-sm leading-relaxed text-muted">
            <li>Moverse con flechas o WASD. Saltar con W, flecha arriba o espacio. Doble salto en el aire.</li>
            <li>Arrástrate con S o flecha abajo. En precipicios, S + izquierda/derecha te cuelga y te mueve de lado por el borde. S + arriba escala muros y montañas. Nix trepa más rápido. En plataformas de una vía, abajo + salto las atraviesa.</li>
            <li>Pégate a un muro y salta para un hop. Hacia el muro: hop de escala. Lejos: patada. Cada hop recarga el doble salto. Poder del héroe: J, K, F o Shift. El golpe de Rok es abajo en el aire.</li>
            <li>Las monedas vuelan al bolso. La meta es el cacao de oro. En cada tótem pulsa W: se guarda la partida y un destello sube al cielo. Si pierdes una vida, vuelves al último tótem guardado.</li>
            <li>Cinco vidas. Al caer, reapareces en el último tótem. Sin vidas, pulsa Reiniciar o R. Continuar en el título retoma el último destello.</li>
            <li>Al elegir héroe verás una ficha breve: cómo sacar el poder y datos. Toca las etiquetas y, si quieres el relato, pulsa Conocer más.</li>
            <li>Tras el Templo Dorado sigue la expedición: glaciar, cueva, Los Túneles de Isabela, Amazonía y el rescate en el páramo. Quito cierra con oro colonial, chocolate y el Museo del Oro Precolombino.</li>
            <li>En Los Túneles se bucea: WASD bajo el agua, el aire se acaba. Maya aguanta más (14s). Los peces restauran el aliento —ella pesca para la cena— y el chocolate caliente también. Ojo con los tiburones martillo; los leones marinos se pueden montar.</li>
            <li>En el Centro Histórico: gradas de San Francisco, el oro de La Compañía, paradas de chocolate (STEBEN GAVIÑO, República del Cacao, Pacari) y criptas bajo el adoquín.</li>
            <li>En el Museo del Oro: vitrinas de La Tolita, alarmas de sala y el Sol de Oro al fondo. No se roba: se visita. Espera el parpadeo rojo para cruzar.</li>
            <li>Algunos tótems brillan distinto. W guarda; W otra vez abre un camino oculto: cueva bajo la cascada, Isla Fernandina, un pueblo escondido, una gruta, y el Risco de las Rocas —escala, salta y esquiva las piedras. El destello te lleva y te devuelve.</li>
          </ul>
          <div className="mt-8">
            <Primary
              onClick={() => {
                setFactId(null);
                setKnowMore(false);
                setScreen("chars");
              }}
            >
              Elegir héroe
            </Primary>
          </div>
        </Shell>
      )}

      {screen === "chars" && (
        <Shell align="start">
          <Back
            onClick={() => {
              haltVoice();
              setScreen("title");
            }}
          />
          <h2 className="mt-4 font-display text-4xl">Elige héroe</h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Toca un retrato. En la ficha está el poder, cómo sacarlo y datos. Si quieres el relato completo, pulsa Conocer más.
          </p>
          <div className="mt-6 grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="order-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:order-1 lg:grid-cols-2 xl:grid-cols-3">
              {CHARACTERS.map((c) => {
                const frame = art?.idle[c.id]?.[0];
                const on = c.id === charId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickChar(c.id)}
                    className={
                      "flex flex-col items-center rounded-xl border px-3 py-4 text-center transition-transform duration-[var(--motion-fast)] " +
                      (on ? "border-accent bg-elevated" : "border-border bg-surface/80 hover:border-border-strong")
                    }
                  >
                    {frame ? (
                      <img src={frame.src} alt="" className="h-24 w-16 object-contain sm:h-28 sm:w-20" />
                    ) : (
                      <div className="h-24 w-16 rounded-md bg-elevated sm:h-28 sm:w-20" />
                    )}
                    <span className="mt-2 font-display text-lg">{c.name}</span>
                    <span className="text-xs text-muted">{c.power}</span>
                  </button>
                );
              })}
            </div>
            <article className="order-1 rounded-xl border border-border bg-surface/80 px-5 py-5 lg:order-2">
              <p className="text-xs tracking-[0.18em] text-muted uppercase">Ficha de campo</p>
              <p className="mt-2 font-display text-3xl">{ch.name}</p>
              <p className="text-sm text-muted">
                {ch.title} · {ch.power}
              </p>
              <p className="mt-3 text-sm leading-relaxed">{dossier.brief}</p>
              <div className="mt-4 rounded-lg border border-border bg-elevated px-4 py-3">
                <p className="text-xs tracking-[0.16em] text-muted uppercase">Cómo sacar el poder</p>
                <p className="mt-1 font-display text-lg">{ch.power}</p>
                <p className="mt-1 text-sm leading-relaxed">{dossier.powerHow}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{dossier.extra}</p>
              </div>
              <p className="mt-4 text-xs tracking-[0.16em] text-muted uppercase">Datos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dossier.facts.map((f) => {
                  const on = f.id === factId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFactId(on ? null : f.id)}
                      className={
                        "h-10 rounded-lg border px-3 text-sm " +
                        (on ? "border-accent bg-elevated text-fg" : "border-border bg-surface text-muted")
                      }
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              {openFact ? <p className="mt-3 text-sm leading-relaxed">{openFact.body}</p> : null}
              <button
                type="button"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 text-sm"
                onClick={() => setKnowMore((v) => !v)}
              >
                <BookOpen className="size-4" />
                {knowMore ? "Cerrar relato" : "Conocer más"}
              </button>
              {knowMore ? (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-sm leading-relaxed">{dossier.tale}</p>
                  <p className="mt-3 font-display text-xl leading-snug">“{dossier.quote}”</p>
                </div>
              ) : null}
            </article>
          </div>
          <div className="mt-6 pb-8">
            <Primary
              onClick={() => {
                haltVoice();
                setScreen("worlds");
              }}
            >
              Elegir mundo
            </Primary>
          </div>
        </Shell>
      )}

      {screen === "worlds" && (
        <Shell align="start">
          <Back
            onClick={() => {
              setFactId(null);
              setKnowMore(false);
              setScreen("chars");
            }}
          />
          <h2 className="mt-4 font-display text-4xl">Mundos</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Completa uno para abrir el siguiente. Algunos tótems esconden otros mundos — el destello al cielo marca el guardado.
          </p>
          <WorldSection
            title="Campaña del cacao"
            worlds={WORLDS.slice(0, 5)}
            offset={0}
            save={save}
            art={art}
            onStart={startLevel}
          />
          <WorldSection
            title="Expedición Ecuador"
            worlds={WORLDS.slice(5, 10)}
            offset={5}
            save={save}
            art={art}
            onStart={startLevel}
          />
          <WorldSection
            title="Quito"
            worlds={WORLDS.slice(10)}
            offset={10}
            save={save}
            art={art}
            onStart={startLevel}
            cols="grid-cols-2 max-w-xl"
          />
          <WorldSection
            title="Secretos"
            worlds={SECRET_WORLDS}
            offset={CAMPAIGN_COUNT}
            save={save}
            art={art}
            onStart={startLevel}
            cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
            secrets
          />
        </Shell>
      )}

      {screen === "play" && (
        <div className="flex min-h-dvh flex-col bg-bg">
          <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-center">
            <HudBar
              hud={hud}
              muted={muted}
              onMute={toggleMute}
              onPause={() => {
                const g = gameRef.current;
                if (!g) return;
                if (g.status === "playing") g.status = "paused";
                else if (g.status === "paused") g.status = "playing";
              }}
              onRestart={hardRestart}
              onMenu={() => {
                dismissIntro();
                setScreen("worlds");
              }}
            />
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={VIEW_W}
                height={VIEW_H}
                className="mx-auto block max-h-[calc(100dvh-3.5rem)] w-full touch-none bg-bg object-contain"
                style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
              />

              {!worldReady && (
                <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-bg/70">
                  <p className="font-display text-2xl text-cream">Cargando el mundo…</p>
                </div>
              )}

              {intro && (
                <StoryIntro
                  story={intro}
                  portrait={art?.idle[charId]?.[0]}
                  onSkip={dismissIntro}
                />
              )}

              {hud.status === "paused" && !intro && (
                <Overlay>
                  <h3 className="font-display text-4xl">Pausa</h3>

                  <div className="mt-6 w-full max-w-sm space-y-3 text-left">
                    <Ajuste
                      titulo="Modo asistido"
                      detalle={
                        save.assist
                          ? "Ocho vidas, más aire y más margen tras un golpe."
                          : "Cinco vidas. Reinicia el mundo para aplicar el cambio."
                      }
                      activo={save.assist}
                      onToggle={() => guardarAjuste({ assist: !save.assist })}
                    />
                    <Ajuste
                      titulo="Sacudida de cámara"
                      detalle={
                        save.shake === 0
                          ? "Apagada."
                          : save.shake < 1
                            ? "A la mitad."
                            : "Completa."
                      }
                      activo={save.shake > 0}
                      onToggle={() =>
                        guardarAjuste({ shake: save.shake === 1 ? 0.5 : save.shake === 0.5 ? 0 : 1 })
                      }
                      etiquetaBoton={save.shake === 1 ? "Bajar" : save.shake === 0.5 ? "Apagar" : "Volver"}
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Primary
                      onClick={() => {
                        const g = gameRef.current;
                        if (g) g.status = "playing";
                      }}
                    >
                      Seguir
                    </Primary>
                    <Ghost onClick={hardRestart}>Reiniciar</Ghost>
                    <Ghost onClick={() => setScreen("worlds")}>Mundos</Ghost>
                  </div>
                </Overlay>
              )}
              {hud.status === "win" && (
                <Overlay>
                  <h3 className="font-display text-4xl">
                    {LEVELS[levelIndex]?.goalKind === "sol"
                      ? "Sol de Oro"
                      : LEVELS[levelIndex]?.index != null && LEVELS[levelIndex]!.index >= CAMPAIGN_COUNT
                        ? "Secreto hallado"
                        : LEVELS[levelIndex]?.world === "quito"
                          ? "Hasta la vuelta, Señor"
                          : LEVELS[levelIndex]?.goalKind === "explorer"
                            ? "Explorador a salvo"
                            : levelIndex >= WORLD_COUNT - 1
                              ? "Expedición completa"
                              : "Cacao de oro"}
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {LEVELS[levelIndex]?.goalKind === "sol"
                      ? `La Tolita te mira de frente. El bolso guarda ${hud.coins} granos.`
                      : LEVELS[levelIndex]?.world === "quito"
                        ? `El bolso guarda ${hud.coins} granos. El oro de La Compañía, el chocolate y las criptas ya son camino andado.`
                        : LEVELS[levelIndex]?.goalKind === "explorer"
                          ? `Lo encontraste en el páramo. El bolso guarda ${hud.coins} granos.`
                          : `El bolso guarda ${hud.coins} granos. La meta está completa.`}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {levelIndex < CAMPAIGN_COUNT - 1 && save.unlocked > levelIndex + 1 && (
                      <Primary onClick={() => startLevel(levelIndex + 1)}>Siguiente mundo</Primary>
                    )}
                    <Ghost onClick={hardRestart}>Reiniciar</Ghost>
                    <Ghost onClick={() => setScreen("worlds")}>Mundos</Ghost>
                  </div>
                </Overlay>
              )}
              {hud.status === "over" && (
                <Overlay>
                  <h3 className="font-display text-4xl">Cinco vidas</h3>
                  <p className="mt-2 text-sm text-muted">El mundo se reinicia. El bolso se vacía. El cacao de oro espera.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Primary onClick={hardRestart}>Reiniciar</Primary>
                    <Ghost onClick={() => setScreen("worlds")}>Mundos</Ghost>
                  </div>
                </Overlay>
              )}

              {hud.note && !intro && (
                <p className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-border bg-cacao/80 px-3 py-1.5 font-display text-sm sm:hidden">
                  {hud.note}
                </p>
              )}
              {hud.poleHint && !intro && (
                <p className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-border bg-cacao/80 px-3 py-1.5 font-display text-sm">
                  {hud.poleHint}
                </p>
              )}

              {touchUi && hud.status === "playing" && !intro && <TouchPad />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Hud = {
  coins: number;
  total: number;
  lives: number;
  status: string;
  name: string;
  power: string;
  dash: number;
  breath: number;
  maxBreath: number;
  canSwim: boolean;
  inWater: boolean;
  note: string;
  poleHint: string;
};

function HudBar({
  hud,
  muted,
  onMute,
  onPause,
  onRestart,
  onMenu,
}: {
  hud: Hud;
  muted: boolean;
  onMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-cacao px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onMenu} className="grid size-10 place-items-center rounded-md text-fg" aria-label="Mundos">
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="font-display text-lg leading-none">{hud.name}</p>
          <p className="text-xs text-muted">{hud.power}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hud.canSwim && (
          <div className="flex items-center gap-2" aria-label={`Aire ${Math.max(0, Math.ceil(hud.breath))} segundos`}>
            <Waves className={"size-4 " + (hud.inWater ? "text-accent" : "text-muted")} />
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-elevated sm:w-28">
              <div
                className={"h-full origin-left " + (hud.breath < 3 ? "bg-ember" : "bg-accent")}
                style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.breath / Math.max(1, hud.maxBreath)))})` }}
              />
            </div>
          </div>
        )}
        <div className="flex gap-0.5" aria-label={`${hud.lives} vidas`}>
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <Heart
              key={i}
              className={"size-4 " + (i < hud.lives ? "fill-ember text-ember" : "text-subtle")}
            />
          ))}
        </div>
        <span className="h-4 w-px bg-border" />
        <Backpack className="size-4 text-fg" />
        <span className="tabular-nums text-sm">
          {hud.coins}/{hud.total}
        </span>
        {hud.note ? <span className="font-display text-sm text-cream">{hud.note}</span> : null}
        {hud.poleHint ? <span className="font-display text-sm text-cream">{hud.poleHint}</span> : null}
        <button type="button" onClick={onRestart} className="grid size-10 place-items-center" aria-label="Reiniciar">
          <RotateCcw className="size-4" />
        </button>
        <button type="button" onClick={onPause} className="grid size-10 place-items-center" aria-label="Pausa">
          {hud.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
        <button type="button" onClick={onMute} className="grid size-10 place-items-center" aria-label="Sonido">
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function Ajuste({
  titulo,
  detalle,
  activo,
  onToggle,
  etiquetaBoton,
}: {
  titulo: string;
  detalle: string;
  activo: boolean;
  onToggle: () => void;
  etiquetaBoton?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface/80 px-4 py-3">
      <div>
        <p className="font-display text-lg leading-tight">{titulo}</p>
        <p className="text-xs leading-snug text-muted">{detalle}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={activo}
        className={
          "h-10 shrink-0 rounded-lg border px-4 text-sm font-medium " +
          (activo ? "border-accent bg-elevated text-fg" : "border-border bg-surface text-muted")
        }
      >
        {etiquetaBoton ?? (activo ? "Quitar" : "Activar")}
      </button>
    </div>
  );
}

function TouchPad() {
  const hold = (key: "left" | "right" | "jump" | "down" | "power") => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setTouch(key, true);
    },
    onPointerUp: () => setTouch(key, false),
    onPointerCancel: () => setTouch(key, false),
  });
  const btn = "grid h-14 min-w-14 place-items-center rounded-lg border border-border bg-cacao/70 text-sm font-medium";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex gap-2">
        <button type="button" className={btn} {...hold("left")} aria-label="Izquierda">
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" className={btn} {...hold("right")} aria-label="Derecha">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="pointer-events-auto flex gap-2">
        <button type="button" className={btn} {...hold("down")} aria-label="Agachar">
          <ChevronDown className="size-5" />
        </button>
        <button type="button" className={btn} {...hold("power")} aria-label="Poder">
          Poder
        </button>
        <button type="button" className={btn + " min-w-20"} {...hold("jump")} aria-label="Saltar">
          Salto
        </button>
      </div>
    </div>
  );
}

function MenuBackdrop({ art, screen, levelIndex }: { art: ArtPack | null; screen: Screen; levelIndex: number }) {
  const key =
    screen === "worlds" ? (LEVELS[Math.min(levelIndex, LEVELS.length - 1)]?.sky ?? "jungle") : "jungle";
  const sky = art?.sky[key];
  return (
    <div className="pointer-events-none absolute inset-0">
      {sky ? (
        <img src={sky.src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-cacao" />
      )}
      <div className="absolute inset-0 bg-cacao/70" />
    </div>
  );
}

function WorldSection({
  title,
  worlds,
  offset,
  save,
  art,
  onStart,
  cols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
  secrets = false,
}: {
  title: string;
  worlds: typeof WORLDS;
  offset: number;
  save: SaveData;
  art: ArtPack | null;
  onStart: (i: number) => void;
  cols?: string;
  secrets?: boolean;
}) {
  return (
    <section className="mt-5 w-full max-w-5xl">
      <h3 className="font-display text-xl">{title}</h3>
      <div className={"mt-2 grid gap-2 " + cols}>
        {worlds.map((w, k) => {
          const i = offset + k;
          const locked = secrets ? !save.secrets.includes(w.id) : i >= save.unlocked;
          const sky = art?.sky[w.sky];
          return (
            <button
              key={w.id}
              type="button"
              disabled={locked}
              onClick={() => onStart(i)}
              className="overflow-hidden rounded-xl border border-border bg-surface text-left disabled:opacity-40"
            >
              <div className="relative h-14 overflow-hidden sm:h-16">
                {sky && <img src={sky.src} alt="" className="h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-cacao/35" />
              </div>
              <div className="px-3 py-2">
                <p className="font-display text-base leading-tight">{w.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">
                  {locked ? (secrets ? "Un tótem te espera" : "Completa el mundo anterior") : w.tag}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Shell({ children, align = "center" }: { children: ReactNode; align?: "center" | "start" }) {
  return (
    <main
      className={
        "relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col overflow-y-auto px-5 py-8 sm:px-8 " +
        (align === "start" ? "justify-start pb-16" : "justify-center")
      }
    >
      {children}
    </main>
  );
}

function StoryIntro({
  story,
  portrait,
  onSkip,
}: {
  story: StoryCard;
  portrait?: HTMLImageElement;
  onSkip: () => void;
}) {
  const [more, setMore] = useState(false);
  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-cacao/60 px-4 py-5 sm:items-center sm:py-8"
      onClick={onSkip}
    >
      <article
        className="max-h-[min(88dvh,640px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface px-5 py-5 shadow-[var(--shadow-panel)] sm:px-7 sm:py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs tracking-[0.2em] text-muted uppercase">
          {story.kicker} · {story.narrator}
        </p>
        <div className="mt-4 flex items-start gap-4">
          {portrait ? (
            <img src={portrait.src} alt="" className="h-28 w-20 shrink-0 object-contain object-bottom sm:h-32 sm:w-24" />
          ) : (
            <div className="h-28 w-20 shrink-0 rounded-md bg-elevated sm:h-32 sm:w-24" />
          )}
          <div>
            <h3 className="font-display text-3xl leading-tight sm:text-4xl">{story.name}</h3>
            <p className="text-sm text-muted">
              {story.title} · {story.worldName}
            </p>
            <p className="mt-1 text-xs text-muted">
              {story.worldTag} · {story.power}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{story.hook}</p>
        {more ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-muted">{story.tale}</p>
            <p className="mt-3 font-display text-xl leading-snug">“{story.quote}”</p>
          </>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Primary onClick={onSkip}>Correr</Primary>
          <Ghost onClick={() => setMore((v) => !v)}>{more ? "Cerrar relato" : "Conocer más"}</Ghost>
        </div>
      </article>
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-cacao/70 px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface px-6 py-7 text-center shadow-[var(--shadow-panel)]">
        {children}
      </div>
    </div>
  );
}

function Primary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 min-w-44 rounded-lg bg-cream px-5 text-sm font-medium text-cacao transition-transform duration-[var(--motion-fast)] hover:brightness-95 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 min-w-36 rounded-lg border border-border-strong bg-surface px-5 text-sm font-medium text-fg"
    >
      {children}
    </button>
  );
}

function Back({ onClick }: { children?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
      <ChevronLeft className="size-4" />
      Volver
    </button>
  );
}
