export type FrameSets = Record<string, HTMLImageElement[]>;

export type ArtPack = {
  idle: FrameSets;
  run: FrameSets;
  jump: FrameSets;
  wall: FrameSets;
  swim: FrameSets;
  dash: FrameSets;
  catch: FrameSets;
  glide: FrameSets;
  pound: FrameSets;
  pounce: FrameSets;
  crouch: FrameSets;
  crawl: FrameSets;
  climb: FrameSets;
  shimmy: FrameSets;
  coin?: HTMLImageElement;
  bean?: HTMLImageElement;
  bag?: HTMLImageElement;
  checkpoint?: HTMLImageElement;
  goal?: HTMLImageElement;
  snake?: HTMLImageElement;
  llama?: HTMLImageElement;
  explorer?: HTMLImageElement;
  shark?: HTMLImageElement;
  sealion?: HTMLImageElement;
  fish?: HTMLImageElement;
  chocolate?: HTMLImageElement;
  sol?: HTMLImageElement;
  sky: Record<string, HTMLImageElement>;
  tile: Record<string, HTMLImageElement>;
};

export const HERO_IDS = ["maya", "teko", "luma", "rok", "nix"] as const;

export const WORLD_ART = [
  "jungle",
  "ruins",
  "cocoa",
  "volcano",
  "temple",
  "glacier",
  "cave",
  "isabela",
  "amazon",
  "paramo",
  "quito",
  "museum",
] as const;

/** El mundo que se ve detrás de la portada. */
export const TITLE_WORLD = "jungle";

/**
 * En GitHub Pages el juego cuelga de /<repo>/ y no de la raíz del dominio, así
 * que toda ruta absoluta de asset se resuelve contra la base del build.
 */
export function assetUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL || "/";
  return base.replace(/\/$/, "") + path;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = assetUrl(src);
  });
}

/**
 * Pide los fotogramas a la vez y se queda con los que lleguen hasta el primer
 * hueco: no todos los héroes tienen todas las animaciones, y la lista debe
 * conservar el orden. Antes esto encadenaba un `await` por fotograma, lo que
 * convertía cada animación en una fila de saltos de red.
 */
async function loadFrameSet(id: string, kind: string, max: number): Promise<HTMLImageElement[]> {
  const settled = await Promise.allSettled(
    Array.from({ length: max }, (_, i) => loadImage(`/game/sprites/${id}/${kind}-${i + 1}.png`)),
  );
  const frames: HTMLImageElement[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") break;
    frames.push(result.value);
  }
  return frames;
}

export function createArt(): ArtPack {
  const empty = (): FrameSets => ({});
  return {
    idle: empty(),
    run: empty(),
    jump: empty(),
    wall: empty(),
    swim: empty(),
    dash: empty(),
    catch: empty(),
    glide: empty(),
    pound: empty(),
    pounce: empty(),
    crouch: empty(),
    crawl: empty(),
    climb: empty(),
    shimmy: empty(),
    sky: {},
    tile: {},
  };
}

/** Cielo y suelo de un mundo. Es lo único que hace falta para dibujarlo. */
export async function loadWorldArt(art: ArtPack, world: string): Promise<void> {
  const [sky, tile] = await Promise.allSettled([
    loadImage(`/game/maps/${world}-sky.jpg`),
    loadImage(`/game/maps/${world}-tile.jpg`),
  ]);
  if (sky.status === "fulfilled") art.sky[world] = sky.value;
  if (tile.status === "fulfilled") art.tile[world] = tile.value;
}

/** Solo el cielo: sirve de miniatura en la pantalla de mundos. */
export async function loadWorldSky(art: ArtPack, world: string): Promise<void> {
  if (art.sky[world]) return;
  try {
    art.sky[world] = await loadImage(`/game/maps/${world}-sky.jpg`);
  } catch {
    /* la tarjeta se dibuja sin miniatura */
  }
}

/** El primer fotograma quieto de cada héroe: los retratos del menú. */
export async function loadHeroPortraits(art: ArtPack): Promise<void> {
  await Promise.all(
    HERO_IDS.map(async (id) => {
      if (art.idle[id]?.length) return;
      try {
        art.idle[id] = [await loadImage(`/game/sprites/${id}/idle-1.png`)];
      } catch {
        /* la ficha se dibuja sin retrato */
      }
    }),
  );
}

const ANIMS: { key: keyof ArtPack & string; kind: string; max: number; only?: string }[] = [
  { key: "idle", kind: "idle", max: 4 },
  { key: "run", kind: "run", max: 6 },
  { key: "jump", kind: "jump", max: 4 },
  { key: "wall", kind: "wall", max: 4 },
  { key: "swim", kind: "swim", max: 4 },
  { key: "crouch", kind: "crouch", max: 6 },
  { key: "crawl", kind: "crawl", max: 6 },
  { key: "climb", kind: "climb", max: 6 },
  { key: "shimmy", kind: "shimmy", max: 6 },
  { key: "dash", kind: "dash", max: 4, only: "maya" },
  { key: "catch", kind: "catch", max: 4, only: "maya" },
  { key: "glide", kind: "glide", max: 4, only: "luma" },
  { key: "pound", kind: "pound", max: 4, only: "rok" },
  { key: "pounce", kind: "pounce", max: 4, only: "teko" },
];

/** Todas las animaciones de un héroe. Se pide al entrar a jugar con él. */
export async function loadHero(art: ArtPack, id: string): Promise<void> {
  await Promise.all(
    ANIMS.map(async (anim) => {
      if (anim.only && anim.only !== id) {
        const bucket = art[anim.key] as FrameSets;
        bucket[id] ??= [];
        return;
      }
      const bucket = art[anim.key] as FrameSets;
      if (bucket[id]?.length && bucket[id].length > 1) return;
      bucket[id] = await loadFrameSet(id, anim.kind, anim.max);
    }),
  );
}

const PROPS = [
  "coin",
  "bean",
  "bag",
  "checkpoint",
  "goal",
  "snake",
  "llama",
  "explorer",
  "shark",
  "sealion",
  "fish",
  "chocolate",
  "sol",
] as const;

/** Monedas, bolso, tótems y bichos sueltos. */
export async function loadProps(art: ArtPack): Promise<void> {
  await Promise.all(
    PROPS.map(async (name) => {
      if (art[name]) return;
      try {
        art[name] = await loadImage(`/game/sprites/${name}.png`);
      } catch {
        /* el render dibuja una forma de respaldo */
      }
    }),
  );
}
