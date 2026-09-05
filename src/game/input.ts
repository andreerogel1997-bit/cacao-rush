import type { Actions } from "./types.ts";

const GAME_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Space",
  "KeyJ",
  "KeyK",
  "KeyF",
  "ShiftLeft",
  "ShiftRight",
  "Escape",
  "KeyP",
  "KeyR",
]);

type TouchBits = {
  left: boolean;
  right: boolean;
  jump: boolean;
  down: boolean;
  power: boolean;
};

const keys = new Set<string>();
const injected = new Set<string>();
const touch: TouchBits = { left: false, right: false, jump: false, down: false, power: false };

let jumpEdge = false;
let powerEdge = false;
let pauseEdge = false;
let restartEdge = false;
let prevJump = false;
let prevPower = false;
let prevPause = false;
let prevRestart = false;
let bound = false;

function activeCodes(): Set<string> {
  if (injected.size > 0) return injected;
  return keys;
}

function onKeyDown(e: KeyboardEvent) {
  if (GAME_CODES.has(e.code)) e.preventDefault();
  keys.add(e.code);
}

function onKeyUp(e: KeyboardEvent) {
  keys.delete(e.code);
}

function clearHeld() {
  keys.clear();
}

export function bindInput() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearHeld);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearHeld();
  });
}

export function unbindInput() {
  if (!bound || typeof window === "undefined") return;
  bound = false;
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("blur", clearHeld);
}

export function setTouch(part: keyof TouchBits, down: boolean) {
  touch[part] = down;
}

export function clearTouch() {
  touch.left = touch.right = touch.jump = touch.down = touch.power = false;
}

export function setInjectedKeys(codes: string[]) {
  injected.clear();
  for (const c of codes) injected.add(c);
}

export function pollActions(): Actions {
  const k = activeCodes();
  let moveX = 0;
  if (k.has("KeyA") || k.has("ArrowLeft") || touch.left) moveX -= 1;
  if (k.has("KeyD") || k.has("ArrowRight") || touch.right) moveX += 1;

  const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
  for (const pad of pads) {
    if (!pad || pad.mapping !== "standard") continue;
    const ax = pad.axes[0] ?? 0;
    const mag = Math.abs(ax);
    if (mag > 0.18) {
      const scaled = (mag - 0.18) / 0.82;
      moveX += Math.sign(ax) * scaled;
    }
    if (pad.buttons[14]?.pressed) moveX -= 1;
    if (pad.buttons[15]?.pressed) moveX += 1;
    if (pad.buttons[12]?.pressed || pad.buttons[0]?.pressed) k.add("__padJump");
    if (pad.buttons[13]?.pressed) k.add("__padDown");
    if (pad.buttons[1]?.pressed || pad.buttons[2]?.pressed) k.add("__padPower");
    if (pad.buttons[9]?.pressed) k.add("__padPause");
    if (pad.buttons[8]?.pressed) k.add("__padRestart");
  }
  moveX = Math.max(-1, Math.min(1, moveX));

  const jumpHeld =
    k.has("Space") ||
    k.has("KeyW") ||
    k.has("ArrowUp") ||
    k.has("__padJump") ||
    touch.jump;
  const powerHeld =
    k.has("KeyJ") ||
    k.has("KeyK") ||
    k.has("KeyF") ||
    k.has("ShiftLeft") ||
    k.has("ShiftRight") ||
    k.has("__padPower") ||
    touch.power;
  const pauseHeld = k.has("Escape") || k.has("KeyP") || k.has("__padPause");
  const restartHeld = k.has("KeyR") || k.has("__padRestart");

  jumpEdge = jumpHeld && !prevJump;
  powerEdge = powerHeld && !prevPower;
  pauseEdge = pauseHeld && !prevPause;
  restartEdge = restartHeld && !prevRestart;
  prevJump = jumpHeld;
  prevPower = powerHeld;
  prevPause = pauseHeld;
  prevRestart = restartHeld;

  return {
    moveX,
    jump: jumpEdge,
    jumpHeld,
    down: k.has("KeyS") || k.has("ArrowDown") || k.has("__padDown") || touch.down,
    power: powerEdge,
    pause: pauseEdge,
    restart: restartEdge,
  };
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getX: () => number;
  getVx: () => number;
  getY?: () => number;
  getVy?: () => number;
  getWallDir?: () => number;
  getJumpsLeft?: () => number;
  getStatus?: () => string;
  getLives?: () => number;
  getCoins?: () => number;
  getBreath?: () => number;
  getInWater?: () => boolean;
  getWorld?: () => string;
  getSpawnX?: () => number;
  getSpawnY?: () => number;
  getBeam?: () => number;
  getAtPole?: () => boolean;
  getWarp?: () => string;
  getLevelCount?: () => number;
  getLevelWorlds?: () => string;
  getCrouching?: () => boolean;
  getDragging?: () => boolean;
  getClimbing?: () => boolean;
  getHanging?: () => boolean;
  getH?: () => number;
  setPos?: (x: number, y: number) => void;
  setKeys: (codes: string[]) => void;
  setSteer: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
