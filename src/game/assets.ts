export type ArtPack = {
  idle: Record<string, HTMLImageElement[]>;
  run: Record<string, HTMLImageElement[]>;
  jump: Record<string, HTMLImageElement[]>;
  wall: Record<string, HTMLImageElement[]>;
  swim: Record<string, HTMLImageElement[]>;
  dash: Record<string, HTMLImageElement[]>;
  catch: Record<string, HTMLImageElement[]>;
  glide: Record<string, HTMLImageElement[]>;
  pound: Record<string, HTMLImageElement[]>;
  pounce: Record<string, HTMLImageElement[]>;
  crouch: Record<string, HTMLImageElement[]>;
  crawl: Record<string, HTMLImageElement[]>;
  climb: Record<string, HTMLImageElement[]>;
  shimmy: Record<string, HTMLImageElement[]>;
  coin: HTMLImageElement;
  bean: HTMLImageElement;
  bag: HTMLImageElement;
  checkpoint: HTMLImageElement;
  goal: HTMLImageElement;
  snake: HTMLImageElement;
  llama: HTMLImageElement;
  explorer: HTMLImageElement;
  shark: HTMLImageElement;
  sealion: HTMLImageElement;
  fish: HTMLImageElement;
  chocolate: HTMLImageElement;
  sol: HTMLImageElement;
  sky: Record<string, HTMLImageElement>;
  tile: Record<string, HTMLImageElement>;
};

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

async function loadFrameSet(id: string, kind: string, max: number): Promise<HTMLImageElement[]> {
  const frames: HTMLImageElement[] = [];
  for (let i = 1; i <= max; i++) {
    try {
      frames.push(await loadImage(`/game/sprites/${id}/${kind}-${i}.png`));
    } catch {
      break;
    }
  }
  return frames;
}

export async function loadArt(): Promise<ArtPack> {
  const ids = ["maya", "teko", "luma", "rok", "nix"];
  const worlds = [
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
  ];
  const idle: ArtPack["idle"] = {};
  const run: ArtPack["run"] = {};
  const jump: ArtPack["jump"] = {};
  const wall: ArtPack["wall"] = {};
  const swim: ArtPack["swim"] = {};
  const dash: ArtPack["dash"] = {};
  const catchF: ArtPack["catch"] = {};
  const glide: ArtPack["glide"] = {};
  const pound: ArtPack["pound"] = {};
  const pounce: ArtPack["pounce"] = {};
  const crouch: ArtPack["crouch"] = {};
  const crawl: ArtPack["crawl"] = {};
  const climb: ArtPack["climb"] = {};
  const shimmy: ArtPack["shimmy"] = {};
  await Promise.all(
    ids.map(async (id) => {
      idle[id] = await loadFrameSet(id, "idle", 4);
      run[id] = await loadFrameSet(id, "run", 6);
      jump[id] = await loadFrameSet(id, "jump", 4);
      wall[id] = await loadFrameSet(id, "wall", 4);
      swim[id] = await loadFrameSet(id, "swim", 4);
      dash[id] = id === "maya" ? await loadFrameSet(id, "dash", 4) : [];
      catchF[id] = id === "maya" ? await loadFrameSet(id, "catch", 4) : [];
      glide[id] = id === "luma" ? await loadFrameSet(id, "glide", 4) : [];
      pound[id] = id === "rok" ? await loadFrameSet(id, "pound", 4) : [];
      pounce[id] = id === "teko" ? await loadFrameSet(id, "pounce", 4) : [];
      crouch[id] = await loadFrameSet(id, "crouch", 6);
      crawl[id] = await loadFrameSet(id, "crawl", 6);
      climb[id] = await loadFrameSet(id, "climb", 6);
      shimmy[id] = await loadFrameSet(id, "shimmy", 6);
    }),
  );
  const [coin, bean, bag, checkpoint, goal, snake, llama, explorer, shark, sealion, fish, chocolate, sol] = await Promise.all([
    loadImage("/game/sprites/coin.png"),
    loadImage("/game/sprites/bean.png"),
    loadImage("/game/sprites/bag.png"),
    loadImage("/game/sprites/checkpoint.png"),
    loadImage("/game/sprites/goal.png"),
    loadImage("/game/sprites/snake.png"),
    loadImage("/game/sprites/llama.png"),
    loadImage("/game/sprites/explorer.png"),
    loadImage("/game/sprites/shark.png"),
    loadImage("/game/sprites/sealion.png"),
    loadImage("/game/sprites/fish.png"),
    loadImage("/game/sprites/chocolate.png"),
    loadImage("/game/sprites/sol.png"),
  ]);
  const sky: ArtPack["sky"] = {};
  const tile: ArtPack["tile"] = {};
  await Promise.all(
    worlds.map(async (w) => {
      sky[w] = await loadImage(`/game/maps/${w}-sky.jpg`);
      tile[w] = await loadImage(`/game/maps/${w}-tile.jpg`);
    }),
  );
  return {
    idle,
    run,
    jump,
    wall,
    swim,
    dash,
    catch: catchF,
    glide,
    pound,
    pounce,
    crouch,
    crawl,
    climb,
    shimmy,
    coin,
    bean,
    bag,
    checkpoint,
    goal,
    snake,
    llama,
    explorer,
    shark,
    sealion,
    fish,
    chocolate,
    sol,
    sky,
    tile,
  };
}
