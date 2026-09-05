export const VIEW_W = 960;
export const VIEW_H = 540;
export const FIXED_DT = 1 / 60;
export const MAX_LIVES = 5;
export const CAMPAIGN_COUNT = 12;
export const WORLD_COUNT = 12;
export const WORLD_TOTAL = 17;

export type PlatKind = "solid" | "oneway" | "moving" | "crate" | "ice" | "gold";

export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatKind;
  move?: {
    ox: number;
    oy: number;
    ax: number;
    ay: number;
    period: number;
    phase: number;
  };
  broken?: boolean;
  dx: number;
  dy: number;
  deco?: "llama" | "sealion";
};

export type HazardKind = "spikes" | "lava" | "saw" | "fireball" | "snake" | "icicle" | "crab" | "shark" | "laser" | "rock";

export type Hazard = {
  kind: HazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  ox?: number;
  oy?: number;
  ax?: number;
  ay?: number;
  period?: number;
  phase?: number;
  vx?: number;
  range?: number;
};

export type PickupKind = "bean" | "fish" | "chocolate";

export type Pickup = {
  x: number;
  y: number;
  r: number;
  taken: boolean;
  kind?: PickupKind;
};

export type Checkpoint = {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  secret?: WorldId;
  returnTo?: WorldId;
  rideOx?: number;
  rideOy?: number;
};

export type Goal = {
  x: number;
  y: number;
  w: number;
  h: number;
  taken: boolean;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
};

export type FlyingCoin = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  kind?: PickupKind;
};

export type CharacterId = "maya" | "teko" | "luma" | "rok" | "nix";

export type CharacterDef = {
  id: CharacterId;
  name: string;
  title: string;
  power: string;
  powerHint: string;
  blurb: string;
  color: string;
  accent: string;
  jumps: number;
  jumpVel: number;
  runSpeed: number;
  gravityMul: number;
};

export type WorldId =
  | "selva"
  | "ruinas"
  | "rio"
  | "volcan"
  | "templo"
  | "glaciar"
  | "cueva"
  | "isabela"
  | "amazonia"
  | "llamas"
  | "quito"
  | "museo"
  | "cascada"
  | "fernandina"
  | "pueblo"
  | "gruta"
  | "risco";

export type Level = {
  id: string;
  world: WorldId;
  index: number;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  platforms: Platform[];
  hazards: Hazard[];
  coins: Pickup[];
  checkpoints: Checkpoint[];
  goal: Goal;
  sky: string;
  tile: string;
  fog: string;
  waterline?: number;
  canSwim?: boolean;
  goalKind?: "cacao" | "explorer" | "sol";
  falls?: { x: number; y: number; w: number; h: number }[];
  portal?: { world: WorldId; x: number; y: number };
};

export type Actions = {
  moveX: number;
  jump: boolean;
  jumpHeld: boolean;
  down: boolean;
  power: boolean;
  pause: boolean;
  restart: boolean;
};

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  jumpsLeft: number;
  coyote: number;
  jumpBuffer: number;
  wallDir: number;
  wallCoyote: number;
  wallLock: number;
  dashing: boolean;
  dashT: number;
  dashCd: number;
  gliding: boolean;
  pounding: boolean;
  dropT: number;
  invuln: number;
  squash: number;
  stretch: number;
  animT: number;
  riding: Platform | null;
  onIce: boolean;
  inWater: boolean;
  breath: number;
  maxBreath: number;
  catchT: number;
  wallHopT: number;
  pounceT: number;
  crouching: boolean;
  dragging: boolean;
  climbing: boolean;
  hanging: boolean;
  hangDir: 1 | -1;
  hangPlat: Platform | null;
};

export type LightBeam = {
  x: number;
  y: number;
  t: number;
  max: number;
  secret: boolean;
};

export type Warp = {
  world: WorldId;
  spawnX?: number;
  spawnY?: number;
  intro: boolean;
};

export type GameStatus = "playing" | "paused" | "dead" | "win" | "over";

export type Game = {
  level: Level;
  character: CharacterDef;
  player: Player;
  lives: number;
  coins: number;
  totalCoins: number;
  bagX: number;
  bagY: number;
  flying: FlyingCoin[];
  particles: Particle[];
  trauma: number;
  hitstop: number;
  time: number;
  status: GameStatus;
  spawnX: number;
  spawnY: number;
  spawnPole: number;
  deathT: number;
  winT: number;
  message: string;
  messageT: number;
  beam: LightBeam | null;
  warp: Warp | null;
  warpT: number;
  atPole: boolean;
  poleHint: string;
  saveFlag: boolean;
  poleIndex: number;
  foundSecret: WorldId | null;
  poleLockT: number;
};
