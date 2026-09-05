import { sfxCheck, sfxCoin, sfxDash, sfxDouble, sfxGoal, sfxHurt, sfxJump, sfxLand, sfxPound, sfxSave, sfxWin } from "./audio.ts";
import type { Actions, Ajustes, CharacterDef, Game, Hazard, Level, Particle, Platform, Player } from "./types.ts";
import { AJUSTES_POR_DEFECTO, ASSIST_LIVES, MAX_LIVES } from "./types.ts";

const PW = 26;
const PH = 42;
const PH_CROUCH = 24;
const PH_PRONE = 14;
const GRAV_UP = 2100;
const GRAV_DOWN = 3400;
const GRAV_APEX = 1200;
const APEX = 80;
const MAX_FALL = 1100;
const ACCEL_G = 4600;
const ACCEL_A = 2800;
const FRICTION = 4200;
const COYOTE = 0.1;
const BUFFER = 0.12;
const CUT = 0.48;

function aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function burst(game: Game, x: number, y: number, n: number, color: string, speed = 180) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random());
    const p: Particle = {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 60,
      life: 0.35 + Math.random() * 0.4,
      max: 0.8,
      size: 2 + Math.random() * 4,
      color,
      rot: Math.random() * 6,
    };
    p.max = p.life;
    if (game.particles.length < 220) game.particles.push(p);
  }
}

function submerged(game: Game, p: Player) {
  const wl = game.level.waterline;
  return !!game.level.canSwim && wl != null && p.y + p.h * 0.42 > wl;
}

function makePlayer(x: number, y: number, maxBreath = 7): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    w: PW,
    h: PH,
    facing: 1,
    grounded: false,
    jumpsLeft: 2,
    coyote: 0,
    jumpBuffer: 0,
    wallDir: 0,
    wallCoyote: 0,
    wallLock: 0,
    dashing: false,
    dashT: 0,
    dashCd: 0,
    gliding: false,
    pounding: false,
    dropT: 0,
    invuln: 0,
    squash: 1,
    stretch: 1,
    animT: 0,
    riding: null,
    onIce: false,
    inWater: false,
    breath: maxBreath,
    maxBreath,
    catchT: 0,
    wallHopT: 0,
    pounceT: 0,
    crouching: false,
    dragging: false,
    climbing: false,
    hanging: false,
    hangDir: 1,
    hangPlat: null,
  };
}

export function createGame(
  level: Level,
  character: CharacterDef,
  resume?: { x: number; y: number; lives?: number; coins?: number; taken?: boolean[]; poleIndex?: number },
  ajustes: Ajustes = AJUSTES_POR_DEFECTO,
): Game {
  const platforms = level.platforms.map((p) => ({ ...p, broken: false, dx: 0, dy: 0, move: p.move ? { ...p.move } : undefined }));
  const hazards = level.hazards.map((h) => ({ ...h }));
  const coins = level.coins.map((c, i) => ({ ...c, taken: resume?.taken?.[i] ?? false }));
  const pole = resume?.poleIndex ?? -1;
  const checkpoints = level.checkpoints.map((c, i) => ({ ...c, active: i === pole && pole >= 0 }));
  const cloned: Level = {
    ...level,
    platforms,
    hazards,
    coins,
    checkpoints,
    goal: { ...level.goal, taken: false },
  };
  const base = character.id === "maya" ? 14 : 7;
  // En modo asistido el aire rinde la mitad más y las vidas suben a ocho.
  const maxBreath = ajustes.assist ? base * 1.5 : base;
  const sx = resume?.x ?? level.spawnX;
  const sy = resume?.y ?? level.spawnY;
  const game: Game = {
    level: cloned,
    character,
    player: makePlayer(sx, sy, maxBreath),
    lives: resume?.lives ?? (ajustes.assist ? ASSIST_LIVES : MAX_LIVES),
    coins: resume?.coins ?? coins.filter((c) => c.taken).length,
    totalCoins: coins.length,
    bagX: sx - 28,
    bagY: sy,
    flying: [],
    particles: [],
    trauma: 0,
    hitstop: 0,
    time: 0,
    status: "playing",
    spawnX: sx,
    spawnY: sy,
    spawnPole: pole,
    deathT: 0,
    winT: 0,
    message: "",
    messageT: 0,
    beam: null,
    warp: null,
    warpT: 0,
    atPole: false,
    poleHint: "",
    saveFlag: false,
    poleIndex: pole,
    foundSecret: null,
    poleLockT: 0,
    camLook: 0,
    camY: sy + PH / 2,
    shake: ajustes.shake,
    assist: ajustes.assist,
  };
  ridePoles(game);
  const cp = game.level.checkpoints[pole];
  if (cp) {
    game.spawnX = cp.x + 4;
    game.spawnY = cp.y + cp.h - PH;
    game.player.x = game.spawnX;
    game.player.y = game.spawnY;
    game.bagX = game.player.x - 28;
    game.bagY = game.player.y;
  }
  return game;
}

function doJump(game: Game, extra = false) {
  const p = game.player;
  const ch = game.character;
  p.vy = extra ? ch.jumpVel * 0.9 : ch.jumpVel;
  p.grounded = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  if (extra) p.jumpsLeft -= 1;
  if (extra) {
    p.pounceT = 0.32;
    p.squash = 0.64;
    p.stretch = 1.38;
  } else {
    p.squash = 0.72;
    p.stretch = 1.28;
  }
  p.pounding = false;
  p.crouching = false;
  p.dragging = false;
  p.climbing = false;
  p.hanging = false;
  p.hangPlat = null;
  if (p.h < PH) setHeight(p, PH);
  burst(game, p.x + p.w / 2, p.y + p.h, 6, "#f3e6d0", 120);
  if (extra) sfxDouble();
  else sfxJump();
}

function doWallJump(game: Game, dir: number, climb: boolean) {
  const p = game.player;
  const ch = game.character;
  const nix = ch.id === "nix";
  if (climb) {
    p.vx = -dir * (nix ? 48 : 86);
    p.vy = ch.jumpVel * (nix ? 1.06 : 0.92);
  } else {
    p.vx = -dir * (nix ? 420 : 350);
    p.vy = ch.jumpVel * (nix ? 1.0 : 0.95);
  }
  p.facing = -dir as 1 | -1;
  p.grounded = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.wallCoyote = 0;
  p.wallDir = 0;
  p.wallLock = climb ? 0.12 : 0.08;
  p.jumpsLeft = Math.max(p.jumpsLeft, Math.max(1, ch.jumps - 1));
  p.pounding = false;
  p.crouching = false;
  p.dragging = false;
  p.climbing = false;
  p.hanging = false;
  p.hangPlat = null;
  if (p.h < PH) setHeight(p, PH);
  p.squash = 0.7;
  p.stretch = 1.32;
  p.wallHopT = 0.26;
  game.hitstop = Math.max(game.hitstop, 0.018);
  const sparkX = p.x + (dir > 0 ? p.w : 0);
  burst(game, sparkX, p.y + p.h / 2, climb ? 8 : 10, nix ? "#9aa7c2" : "#f3e6d0", climb ? 140 : 180);
  if (climb) sfxDouble();
  else sfxJump();
}

function kill(game: Game) {
  if (game.player.invuln > 0 || game.status !== "playing") return;
  const p = game.player;
  sfxHurt();
  game.trauma = Math.min(1, game.trauma + 0.55);
  game.hitstop = 0.07;
  burst(game, p.x + p.w / 2, p.y + p.h / 2, 16, "#c45c26", 240);
  game.lives -= 1;
  if (game.lives <= 0) {
    game.status = "over";
    game.message = "Sin vidas";
    return;
  }
  game.status = "dead";
  game.deathT = 0.7;
  game.player.invuln = game.assist ? 2.2 : 1.4;
}

function ridePoles(game: Game) {
  for (const cp of game.level.checkpoints) {
    if (cp.rideOx == null || cp.rideOy == null) continue;
    const plat = game.level.platforms.find(
      (p) => p.move && Math.abs(p.move.ox - cp.rideOx!) < 1 && Math.abs(p.move.oy - cp.rideOy!) < 1,
    );
    if (!plat) continue;
    cp.x = plat.x + (plat.w - cp.w) / 2;
    cp.y = plat.y - cp.h;
  }
}

function respawn(game: Game) {
  ridePoles(game);
  const cp = game.level.checkpoints[game.spawnPole];
  if (cp) {
    game.spawnX = cp.x + 4;
    game.spawnY = cp.y + cp.h - PH;
  }
  const p = makePlayer(game.spawnX, game.spawnY, game.player.maxBreath);
  p.invuln = game.assist ? 2 : 1.2;
  game.player = p;
  // La cámara se planta en el punto de reaparición en vez de barrer el mapa.
  game.camY = game.spawnY + p.h / 2;
  game.camLook = 0;
  game.status = "playing";
  game.bagX = p.x - 30;
  game.bagY = p.y;
}

function updateMovers(game: Game, dt: number) {
  for (const plat of game.level.platforms) {
    plat.dx = 0;
    plat.dy = 0;
    if (plat.kind !== "moving" || !plat.move || plat.broken) continue;
    const m = plat.move;
    const t = game.time * ((Math.PI * 2) / m.period) + m.phase;
    const nx = m.ox + Math.sin(t) * m.ax;
    const ny = m.oy + Math.sin(t) * m.ay;
    plat.dx = nx - plat.x;
    plat.dy = ny - plat.y;
    plat.x = nx;
    plat.y = ny;
  }
  ridePoles(game);
  for (const h of game.level.hazards) {
    if ((h.kind === "saw" || h.kind === "snake" || h.kind === "crab" || h.kind === "shark") && h.period) {
      const t = game.time * ((Math.PI * 2) / h.period) + (h.phase ?? 0);
      h.x = (h.ox ?? h.x) + Math.sin(t) * (h.ax ?? 0);
      h.y = (h.oy ?? h.y) + Math.sin(t) * (h.ay ?? 0);
      if (h.kind === "snake") h.y = (h.oy ?? h.y) + Math.sin(t * 2) * 5;
      if (h.kind === "shark") h.y = (h.oy ?? h.y) + Math.sin(t * 1.4) * 18;
    }
    if (h.kind === "fireball") {
      h.x += (h.vx ?? 0) * dt;
      const ox = h.ox ?? h.x;
      const range = h.range ?? 200;
      if (h.x > ox + range || h.x < ox) {
        h.x = ox;
        h.y = h.oy ?? h.y;
      }
    }
    if (h.kind === "rock") {
      const oy = h.oy ?? h.y;
      const ox = h.ox ?? h.x;
      const range = h.range ?? 360;
      const speed = h.vx ?? 260;
      const shift = (h.phase ?? 0) * 90;
      const along = (game.time * speed + shift) % (range + 90);
      h.y = along > range ? oy - 120 : oy + along;
      h.x = ox + Math.sin(game.time * 2.4 + (h.phase ?? 0)) * (h.ax ?? 0);
    }
  }
}

function solids(game: Game): Platform[] {
  return game.level.platforms.filter((p) => !p.broken && p.kind !== "oneway");
}

function setHeight(p: Player, h: number) {
  const feet = p.y + p.h;
  p.h = h;
  p.y = feet - h;
}

function canRiseTo(game: Game, p: Player, h: number): boolean {
  if (p.h >= h) return true;
  const ny = p.y + p.h - h;
  for (const s of solids(game)) {
    if (aabb(p.x + 2, ny, p.w - 4, h - 2, s.x, s.y, s.w, s.h)) return false;
  }
  return true;
}

function setPose(p: Player, h: number, crouch: boolean, drag: boolean) {
  setHeight(p, h);
  p.crouching = crouch;
  p.dragging = drag;
}

function crouchDown(p: Player) {
  if (p.dragging) return;
  if (p.crouching && p.h <= PH_CROUCH) return;
  setPose(p, PH_CROUCH, true, false);
}

function dragDown(p: Player) {
  setPose(p, PH_PRONE, true, true);
}

function riseTo(game: Game, p: Player, h: number): boolean {
  if (p.h >= h) {
    if (h >= PH) {
      p.crouching = false;
      p.dragging = false;
    }
    return true;
  }
  if (!canRiseTo(game, p, h)) return false;
  setPose(p, h, h < PH, h <= PH_PRONE);
  return true;
}

function standUp(game: Game, p: Player): boolean {
  return riseTo(game, p, PH);
}

function onOneWay(game: Game, p: Player): boolean {
  const feet = p.y + p.h;
  for (const s of game.level.platforms) {
    if (s.broken || s.kind !== "oneway") continue;
    if (p.x + p.w > s.x + 2 && p.x < s.x + s.w - 2 && feet >= s.y - 3 && feet <= s.y + 10) return true;
  }
  return false;
}

function updateCrouch(game: Game, input: Actions) {
  const p = game.player;
  if (p.climbing || p.hanging) {
    p.crouching = false;
    p.dragging = false;
    if (p.h < PH) setHeight(p, PH);
    return;
  }
  if (p.inWater || p.pounding) {
    standUp(game, p);
    return;
  }
  const wantCrawl = p.grounded && input.down;
  if (wantCrawl) {
    const moving = Math.abs(input.moveX) > 0.18 || Math.abs(p.vx) > 22;
    if (moving) dragDown(p);
    else if (p.dragging || p.h < PH_CROUCH) {
      if (!riseTo(game, p, PH_CROUCH)) dragDown(p);
    } else crouchDown(p);
    return;
  }
  if (!p.grounded) {
    if (!input.down) standUp(game, p);
    return;
  }
  standUp(game, p);
}

function platAtFeet(game: Game, p: Player): Platform | null {
  const feet = p.y + p.h;
  for (const s of solids(game)) {
    if (p.x + p.w > s.x + 2 && p.x < s.x + s.w - 2 && feet >= s.y - 4 && feet <= s.y + 16) return s;
  }
  return null;
}

function hasFloorAhead(game: Game, p: Player, dir: number): boolean {
  if (dir === 0) return true;
  const x = dir > 0 ? p.x + p.w + 2 : p.x - 12;
  const y = p.y + p.h + 1;
  for (const s of solids(game)) {
    if (aabb(x, y, 12, 12, s.x, s.y, s.w, s.h)) return true;
  }
  return false;
}

function platNearLip(game: Game, p: Player): Platform | null {
  const hand = p.y + 8;
  let best: Platform | null = null;
  let bestDist = 28;
  for (const s of solids(game)) {
    const dy = Math.abs(s.y - hand);
    if (dy > 26) continue;
    if (p.x + p.w < s.x - 18 || p.x > s.x + s.w + 18) continue;
    if (dy < bestDist) {
      best = s;
      bestDist = dy;
    }
  }
  return best;
}

function startHang(p: Player, plat: Platform, side: 1 | -1) {
  p.hanging = true;
  p.climbing = false;
  p.grounded = false;
  p.dragging = false;
  p.crouching = false;
  p.hangDir = side;
  p.facing = side;
  p.hangPlat = plat;
  if (p.h !== PH) setHeight(p, PH);
  if (side > 0) p.x = plat.x + plat.w - p.w * 0.4;
  else p.x = plat.x - p.w * 0.6;
  p.y = plat.y - 8;
  p.vx = 0;
  p.vy = 0;
}

function startClimb(p: Player, dir: number) {
  p.climbing = true;
  p.hanging = false;
  p.hangPlat = null;
  p.grounded = false;
  p.dragging = false;
  p.crouching = false;
  p.wallDir = dir;
  p.facing = dir < 0 ? -1 : 1;
  if (p.h !== PH) setHeight(p, PH);
  p.vx = 0;
}

function snapClimbWall(game: Game, p: Player): boolean {
  const dir = p.wallDir || p.facing;
  const ox = dir > 0 ? p.x + p.w - 2 : p.x - 8;
  for (const s of solids(game)) {
    if (!aabb(ox, p.y + 6, 10, p.h - 12, s.x, s.y, s.w, s.h)) continue;
    if (dir > 0) p.x = s.x - p.w;
    else p.x = s.x + s.w;
    p.wallDir = dir;
    return true;
  }
  return probeWall(game, dir) !== 0;
}

function applyClimb(game: Game, input: Actions, dt: number) {
  const p = game.player;
  const nix = game.character.id === "nix";
  if (p.hanging) {
    const plat = p.hangPlat && !p.hangPlat.broken ? p.hangPlat : platNearLip(game, p);
    p.hangPlat = plat;
    if (!input.down) {
      p.hanging = false;
      p.hangPlat = null;
      return;
    }
    if (!plat) {
      p.hanging = false;
      return;
    }
    if (input.jumpHeld) {
      p.hanging = false;
      p.hangPlat = null;
      p.x = Math.max(plat.x, Math.min(p.x, plat.x + plat.w - p.w));
      p.y = plat.y - PH;
      p.vy = -60;
      p.grounded = true;
      return;
    }
    const dir = Math.abs(input.moveX) > 0.15 ? Math.sign(input.moveX) : 0;
    const speed = nix ? 150 : 115;
    p.vx = dir * speed;
    if (dir) {
      p.facing = dir as 1 | -1;
      p.hangDir = dir as 1 | -1;
    }
    p.vy = 0;
    p.y = plat.y - 8;
    if (dir && (p.x + p.w < plat.x - 4 || p.x > plat.x + plat.w + 4)) {
      const next = platNearLip(game, p);
      if (next) {
        p.hangPlat = next;
        p.y = next.y - 8;
      } else if (snapClimbWall(game, p)) {
        startClimb(p, p.wallDir || dir);
      }
    }
    return;
  }

  if (p.climbing) {
    if (!input.down) {
      p.climbing = false;
      return;
    }
    if (!snapClimbWall(game, p)) {
      const lip = platNearLip(game, p);
      if (lip) startHang(p, lip, p.facing);
      else p.climbing = false;
      return;
    }
    p.vx = 0;
    const up = nix ? 230 : 165;
    const down = nix ? 28 : 72;
    if (input.jumpHeld) p.vy = -up;
    else p.vy = down;
    if (Math.abs(input.moveX) > 0.45 && Math.sign(input.moveX) !== p.wallDir) {
      const lip = platNearLip(game, p);
      if (lip) startHang(p, lip, p.facing);
    }
  }
}

function tryEnterClimb(game: Game, input: Actions) {
  const p = game.player;
  if (p.climbing || p.hanging) return;
  if (!input.down || p.inWater || p.pounding || p.dashing) return;
  const dir =
    p.wallDir ||
    probeWall(game, p.facing) ||
    probeWall(game, input.moveX >= 0 ? 1 : -1);
  if (input.jumpHeld && dir) {
    startClimb(p, dir);
    return;
  }
  if (p.grounded) {
    const side = Math.abs(input.moveX) > 0.2 ? (Math.sign(input.moveX) as 1 | -1) : p.facing;
    if (!hasFloorAhead(game, p, side)) {
      const plat = platAtFeet(game, p);
      if (plat) startHang(p, plat, side);
    }
    return;
  }
  if (dir) startClimb(p, dir);
}

export function laserOn(h: Hazard, time: number): boolean {
  if (h.kind !== "laser") return false;
  const t = time * ((Math.PI * 2) / (h.period ?? 2.4)) + (h.phase ?? 0);
  return Math.sin(t) > 0.18;
}

function probeWall(game: Game, dir: number): number {
  if (dir === 0) return 0;
  const p = game.player;
  const ox = dir > 0 ? p.x + p.w : p.x - 4;
  for (const s of solids(game)) {
    if (aabb(ox, p.y + 6, 4, p.h - 12, s.x, s.y, s.w, s.h)) return dir;
  }
  return 0;
}

function resolveX(game: Game, dt: number) {
  const p = game.player;
  p.x += p.vx * dt;
  if (!p.climbing && !p.hanging) p.wallDir = 0;
  for (const s of solids(game)) {
    if (p.hanging && s === p.hangPlat) continue;
    if (!aabb(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) continue;
    if (p.vx > 0) {
      p.x = s.x - p.w;
      p.wallDir = 1;
    } else if (p.vx < 0) {
      p.x = s.x + s.w;
      p.wallDir = -1;
    } else {
      const left = p.x + p.w - s.x;
      const right = s.x + s.w - p.x;
      if (left < right) {
        p.x = s.x - p.w;
        p.wallDir = 1;
      } else {
        p.x = s.x + s.w;
        p.wallDir = -1;
      }
    }
    if (!p.dashing) p.vx = 0;
  }
  p.x = Math.max(0, Math.min(p.x, game.level.width - p.w));
}

function resolveY(game: Game, dt: number) {
  const p = game.player;
  const prevBottom = p.y + p.h;
  p.y += p.vy * dt;
  let grounded = false;
  p.riding = null;
  p.onIce = false;

  const ignoreOne = p.dropT > 0 || p.vy < 0;
  const list: Platform[] = [
    ...solids(game),
    ...game.level.platforms.filter((pl) => !pl.broken && pl.kind === "oneway" && !ignoreOne),
  ];

  for (const s of list) {
    if (p.hanging && s === p.hangPlat) continue;
    if (!aabb(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) continue;
    if (s.kind === "oneway") {
      if (p.vy < 0) continue;
      if (prevBottom > s.y + 6) continue;
    }
    if (p.vy >= 0) {
      p.y = s.y - p.h;
      if (p.vy > 280) {
        p.squash = 1.22;
        p.stretch = 0.82;
        sfxLand();
        burst(game, p.x + p.w / 2, p.y + p.h, 8, p.inWater ? "#7ec8d4" : "#f3e6d0", 90);
        game.trauma = Math.min(1, game.trauma + Math.min(0.25, p.vy / 4000));
      }
      if (p.pounding) {
        p.pounding = false;
        sfxPound();
        game.trauma = Math.min(1, game.trauma + 0.45);
        game.hitstop = 0.05;
        p.invuln = Math.max(p.invuln, 0.28);
        burst(game, p.x + p.w / 2, p.y + p.h, 20, "#c45c26", 260);
        for (const c of game.level.platforms) {
          if (c.kind !== "crate" || c.broken) continue;
          const cx = c.x + c.w / 2;
          const cy = c.y + c.h / 2;
          if (Math.hypot(cx - (p.x + p.w / 2), cy - (p.y + p.h)) < 96) {
            c.broken = true;
            burst(game, cx, cy, 14, "#8a5a3c", 200);
          }
        }
      }
      p.vy = 0;
      grounded = true;
      p.onIce = s.kind === "ice";
      p.riding = s.kind === "moving" ? s : p.riding;
      if (s.kind === "moving") p.riding = s;
    } else {
      p.y = s.y + s.h;
      p.vy = 0;
    }
  }
  p.grounded = grounded;
}

function applyPower(game: Game, input: Actions) {
  const p = game.player;
  const id = game.character.id;

  if (id === "maya" && input.power && p.dashCd <= 0) {
    p.dashing = true;
    p.dashT = p.inWater ? 0.22 : 0.16;
    p.dashCd = p.inWater ? 0.55 : 0.72;
    p.vx = p.facing * (p.inWater ? 520 : 640);
    p.vy = p.inWater ? (input.down ? 140 : input.jumpHeld ? -110 : 20) : 0;
    p.invuln = Math.max(p.invuln, p.inWater ? 0.22 : 0.16);
    p.pounding = false;
    p.squash = 1.32;
    p.stretch = 0.76;
    sfxDash();
    burst(game, p.x + p.w / 2, p.y + p.h / 2, 10, p.inWater ? "#7ec8d4" : "#3d8a72", 200);
  }

  if (id === "luma") {
    p.gliding = !p.grounded && !p.inWater && input.jumpHeld && p.vy > 40;
  } else {
    p.gliding = false;
  }

  if (id === "rok" && !p.grounded && !p.inWater && (input.down || input.power) && !p.dashing && !p.climbing && !p.hanging) {
    p.pounding = true;
    p.vy = 980;
  }
}

function skyBeam(game: Game, x: number, y: number, secret: boolean) {
  game.beam = { x, y, t: secret ? 0.85 : 0.62, max: secret ? 0.85 : 0.62, secret };
  game.trauma = Math.min(1, game.trauma + (secret ? 0.38 : 0.2));
  for (let i = 0; i < (secret ? 18 : 12); i++) {
    const p: Particle = {
      x: x + (Math.random() - 0.5) * 18,
      y: y - Math.random() * 20,
      vx: (Math.random() - 0.5) * 40,
      vy: -220 - Math.random() * 420,
      life: 0.5 + Math.random() * 0.5,
      max: 1,
      size: 2 + Math.random() * 4,
      color: secret ? "#f6e27a" : "#f3e6d0",
      rot: 0,
    };
    p.max = p.life;
    if (game.particles.length < 220) game.particles.push(p);
  }
  sfxSave();
}

function collect(game: Game, input: Actions) {
  const p = game.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  for (const c of game.level.coins) {
    if (c.taken) continue;
    if (Math.hypot(c.x - cx, c.y - cy) < 28) {
      c.taken = true;
      const kind = c.kind ?? "bean";
      game.flying.push({ x: c.x, y: c.y, tx: game.bagX, ty: game.bagY, t: 0, kind });
      sfxCoin();
      if (kind === "fish") {
        const bonus = game.character.id === "maya" ? p.maxBreath : 3.5;
        p.breath = Math.min(p.maxBreath, p.breath + bonus);
        burst(game, c.x, c.y, 10, "#7ec8d4", 160);
        if (game.character.id === "maya") {
          p.catchT = 0.7;
          game.message = "Cena de Maya";
          game.messageT = 2.2;
        } else {
          game.message = "Un pez";
          game.messageT = 1.4;
        }
      } else if (kind === "chocolate") {
        p.breath = p.maxBreath;
        p.invuln = Math.max(p.invuln, 0.9);
        burst(game, c.x, c.y, 10, "#6b3a1f", 150);
        game.message = "Chocolate caliente";
        game.messageT = 1.8;
      } else {
        burst(game, c.x, c.y, 8, "#d4a84b", 140);
      }
    }
  }
  for (const [i, cp] of game.level.checkpoints.entries()) {
    if (!aabb(p.x, p.y, p.w, p.h, cp.x, cp.y, cp.w, cp.h)) continue;
    game.atPole = true;
    game.poleIndex = i;
    const ready = cp.active && !!(cp.secret || cp.returnTo);
    game.poleHint = cp.returnTo && cp.active
      ? "W — volver"
      : cp.secret && cp.active
        ? "W — camino oculto"
        : "W — guardar";
    const press = input.jump || (ready && input.jumpHeld && game.poleLockT <= 0);
    if (!press || game.warp) continue;
    if (ready) {
      const dest = cp.secret ?? cp.returnTo;
      if (!dest) continue;
      skyBeam(game, cp.x + cp.w / 2, cp.y + 8, true);
      game.message = cp.returnTo ? "El destello te devuelve" : "El destello abre un camino";
      game.messageT = 1.8;
      const portal = game.level.portal;
      game.warp = cp.returnTo && portal
        ? { world: dest, spawnX: portal.x, spawnY: portal.y, intro: false }
        : { world: dest, intro: true };
      game.warpT = 0.55;
      game.saveFlag = true;
      game.poleLockT = 0.4;
      continue;
    }
    const first = !cp.active;
    cp.active = true;
    game.spawnX = cp.x + 4;
    game.spawnY = cp.y + cp.h - PH;
    game.spawnPole = i;
    skyBeam(game, cp.x + cp.w / 2, cp.y + 8, !!cp.secret);
    game.saveFlag = true;
    game.poleLockT = 0.35;
    if (cp.secret) game.foundSecret = cp.secret;
    if (first) {
      sfxCheck();
      game.message = cp.secret || cp.returnTo ? "Tótem guardado — W otra vez" : "Partida guardada";
      game.messageT = 1.8;
    } else {
      game.message = "Partida guardada";
      game.messageT = 1.2;
    }
  }
  const g = game.level.goal;
  if (!g.taken && aabb(p.x, p.y, p.w, p.h, g.x, g.y, g.w, g.h)) {
    g.taken = true;
    game.status = "win";
    game.winT = 0;
    sfxGoal();
    sfxWin();
    game.trauma = 0.35;
    burst(game, g.x + 24, g.y + 24, 28, "#d4a84b", 280);
  }
}

function hazards(game: Game) {
  const p = game.player;
  if (p.invuln > 0 || p.dashing) return;
  for (const h of game.level.hazards) {
    if (h.kind === "saw") {
      const r = h.r ?? 16;
      const hx = h.x;
      const hy = h.y;
      const nx = Math.max(p.x, Math.min(hx, p.x + p.w));
      const ny = Math.max(p.y, Math.min(hy, p.y + p.h));
      if (Math.hypot(hx - nx, hy - ny) < r - 2) {
        kill(game);
        return;
      }
      continue;
    }
    if (h.kind === "lava" && game.level.canSwim) continue;
    if (h.kind === "shark") {
      if (aabb(p.x, p.y + 4, p.w, p.h - 6, h.x, h.y, h.w, h.h)) {
        kill(game);
        return;
      }
      continue;
    }
    if (h.kind === "laser" && !laserOn(h, game.time)) continue;
    if (aabb(p.x, p.y + 6, p.w, p.h - 8, h.x, h.y, h.w, h.h)) {
      kill(game);
      return;
    }
  }
  if (p.y > game.level.height + 40) kill(game);
}

export function updateGame(game: Game, input: Actions, dt: number) {
  if (game.status === "paused") return;
  if (game.status === "win") {
    game.winT += dt;
    game.time += dt;
    updateMovers(game, dt);
    return;
  }
  if (game.status === "over") return;
  if (game.status === "dead") {
    game.deathT -= dt;
    if (game.deathT <= 0) respawn(game);
    return;
  }

  if (game.hitstop > 0) {
    game.hitstop -= dt;
    return;
  }

  const steps = Math.max(1, Math.ceil((Math.abs(game.player.vx) + Math.abs(game.player.vy)) * dt / 12));
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) step(game, input, sdt, i === 0);
}

function step(game: Game, input: Actions, dt: number, first: boolean) {
  const p = game.player;
  const ch = game.character;
  game.time += dt;

  if (first) updateMovers(game, dt);

  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.dropT = Math.max(0, p.dropT - dt);
  p.wallLock = Math.max(0, p.wallLock - dt);
  p.catchT = Math.max(0, p.catchT - dt);
  p.wallHopT = Math.max(0, p.wallHopT - dt);
  p.pounceT = Math.max(0, p.pounceT - dt);
  game.poleLockT = Math.max(0, game.poleLockT - dt);
  game.messageT = Math.max(0, game.messageT - dt);
  if (game.messageT <= 0) game.message = "";
  p.animT += dt;
  p.squash += (1 - p.squash) * Math.min(1, 12 * dt);
  p.stretch += (1 - p.stretch) * Math.min(1, 12 * dt);
  game.trauma = Math.max(0, game.trauma - dt * 1.6);

  if (p.riding) {
    p.x += p.riding.dx;
    p.y += p.riding.dy;
  }

  const wasWet = p.inWater;
  p.inWater = submerged(game, p);

  if (p.dashing) {
    p.dashT -= dt;
    if (p.inWater) {
      p.vx = p.facing * 520;
    } else {
      p.vx = p.facing * 640;
      p.vy = 0;
    }
    if (p.dashT <= 0) p.dashing = false;
  } else if (p.inWater) {
    const cap = ch.runSpeed * (ch.id === "maya" ? 0.86 : 0.72);
    const accel = 3200;
    const target = input.moveX * cap;
    if (Math.abs(input.moveX) > 0.12) {
      p.vx += Math.sign(target - p.vx) * accel * dt;
      if (Math.abs(p.vx) > cap) p.vx = Math.sign(p.vx) * cap;
      p.facing = input.moveX > 0 ? 1 : -1;
    } else {
      p.vx *= 1 - Math.min(1, 2.4 * dt);
    }
    let swimY = 0;
    if (input.jumpHeld) swimY -= 1;
    if (input.down) swimY += 1;
    const vcap = ch.id === "maya" ? 260 : 210;
    if (swimY !== 0) {
      p.vy += swimY * 2800 * dt;
    } else {
      p.vy += (-36 - p.vy) * Math.min(1, 2.1 * dt);
    }
    if (p.vy < -vcap) p.vy = -vcap;
    if (p.vy > vcap + 40) p.vy = vcap + 40;
    p.pounding = false;
    p.gliding = false;
    p.crouching = false;
    p.dragging = false;
    p.climbing = false;
    p.hanging = false;
    p.hangPlat = null;
    if (p.h < PH) setHeight(p, PH);
  } else if (p.climbing || p.hanging) {
    applyClimb(game, input, dt);
  } else {
    const ice = p.grounded && p.onIce;
    const accel = p.grounded ? (ice ? 1600 : ACCEL_G) : ACCEL_A;
    const cap = ch.runSpeed * (ice ? 1.28 : p.dragging ? 0.26 : p.crouching ? 0.4 : 1);
    const target = input.moveX * cap;
    if (Math.abs(input.moveX) > 0.12) {
      p.vx += Math.sign(target - p.vx) * accel * dt;
      if (Math.abs(p.vx) > cap) p.vx = Math.sign(p.vx) * cap;
      p.facing = input.moveX > 0 ? 1 : -1;
    } else if (p.grounded) {
      const s = Math.sign(p.vx);
      p.vx -= s * (ice ? 420 : FRICTION) * dt;
      if (Math.sign(p.vx) !== s) p.vx = 0;
    } else {
      p.vx *= 1 - Math.min(1, 1.4 * dt);
    }

    let g = p.vy < 0 ? GRAV_UP : GRAV_DOWN;
    if (Math.abs(p.vy) < APEX) g = GRAV_APEX;
    g *= ch.gravityMul;
    if (p.gliding) g *= 0.22;
    if (p.pounding) g *= 1.8;
    p.vy += g * dt;
    if (p.gliding && p.vy > 90) p.vy = 90;
    if (p.vy > MAX_FALL) p.vy = MAX_FALL;
  }

  if (p.dashing) {
    p.squash = 1.3;
    p.stretch = 0.78;
  } else if (p.catchT > 0) {
    p.squash = 1.08;
    p.stretch = 0.94;
  } else if (p.pounding && !p.grounded) {
    p.squash = 0.7;
    p.stretch = 1.34;
  } else if (p.gliding) {
    p.squash = 1.2;
    p.stretch = 0.86;
  } else if (p.climbing) {
    p.squash = 0.88;
    p.stretch = 1.12;
  } else if (p.hanging) {
    p.squash = 0.9;
    p.stretch = 1.18;
  } else if (p.dragging && p.grounded) {
    p.squash = 1.22;
    p.stretch = 0.72;
  } else if (p.crouching && p.grounded) {
    p.squash = 1.06;
    p.stretch = 0.92;
  } else if (p.inWater && !p.grounded) {
    p.squash = 1.12;
    p.stretch = 0.9;
  } else if (!p.grounded && p.wallDir !== 0 && p.wallLock <= 0) {
    p.squash = 0.84;
    p.stretch = 1.16;
  }

  if (p.grounded && !p.climbing && !p.hanging) {
    p.coyote = COYOTE;
    p.jumpsLeft = Math.max(0, ch.jumps - 1);
    p.wallDir = 0;
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
  }

  const sliding =
    !p.inWater &&
    p.wallDir !== 0 &&
    !p.grounded &&
    !p.pounding &&
    !p.dashing &&
    !p.climbing &&
    !p.hanging &&
    p.wallLock <= 0;
  if (sliding) {
    p.wallCoyote = 0.16;
    const holdingIn = Math.sign(input.moveX) === p.wallDir;
    if (holdingIn) {
      p.facing = p.wallDir as 1 | -1;
      const cap = ch.id === "nix" ? 72 : 150;
      if (p.vy > cap) p.vy = cap;
      if (ch.id === "nix" && input.jumpHeld && p.vy > -160) {
        p.vy = Math.min(p.vy, -120);
      }
      if (p.vy > 30 && Math.random() < dt * 12) {
        burst(game, p.x + (p.wallDir > 0 ? p.w : 0), p.y + p.h * 0.55, 1, "#f3e6d0", 40);
      }
    }
  } else {
    p.wallCoyote = Math.max(0, p.wallCoyote - dt);
  }

  if (input.jump) p.jumpBuffer = BUFFER;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  const dropping = p.grounded && input.down && onOneWay(game, p) && p.jumpBuffer > 0;
  if (dropping) {
    p.dropT = 0.22;
    p.jumpBuffer = 0;
  }

  updateCrouch(game, input);
  if (p.dragging && !p.climbing && !p.hanging) p.jumpBuffer = 0;
  tryEnterClimb(game, input);
  if (p.climbing || p.hanging) p.jumpBuffer = 0;

  if (!p.inWater) {
    const canGroundJump = p.jumpBuffer > 0 && (p.grounded || p.coyote > 0) && !p.crouching && !p.dragging && !p.climbing && !p.hanging;
    const canAirJump = p.jumpBuffer > 0 && !p.grounded && p.coyote <= 0 && p.jumpsLeft > 0;
    const wallReady =
      p.jumpBuffer > 0 &&
      !p.grounded &&
      p.coyote <= 0 &&
      p.wallLock <= 0 &&
      (p.wallDir !== 0 || p.wallCoyote > 0);

    if (wallReady) {
      const dir = p.wallDir !== 0 ? p.wallDir : Math.sign(p.vx) || -p.facing;
      const climb = Math.sign(input.moveX) !== -dir;
      doWallJump(game, dir, climb);
    } else if (p.crouching && p.jumpBuffer > 0 && !dropping && !input.down && (p.grounded || p.coyote > 0)) {
      if (standUp(game, p)) doJump(game, false);
      else p.jumpBuffer = 0;
    } else if (canGroundJump) {
      doJump(game, false);
    } else if (canAirJump) {
      doJump(game, true);
    }

    if (!input.jumpHeld && p.vy < 0 && !p.dashing) p.vy *= Math.pow(CUT, dt * 8);
  }

  if (first) applyPower(game, input);

  resolveX(game, dt);
  if (!p.inWater && p.wallLock <= 0 && p.wallDir === 0 && !p.grounded && !p.dashing && Math.abs(input.moveX) > 0.2) {
    p.wallDir = probeWall(game, Math.sign(input.moveX));
  }
  if (p.wallLock > 0) p.wallDir = 0;
  resolveY(game, dt);
  if (p.hanging && p.hangPlat) p.y = p.hangPlat.y - 8;
  updateCrouch(game, input);
  if (first && p.dragging && p.grounded && Math.abs(p.vx) > 18 && Math.random() < dt * 14) {
    burst(game, p.x + p.w * 0.5 - p.facing * 8, p.y + p.h, 1, "#c4a574", 28);
  }

  p.inWater = submerged(game, p);
  if (wasWet && !p.inWater && input.jumpHeld && p.vy > -360) {
    p.vy = -420;
    burst(game, p.x + p.w / 2, p.y + p.h, 12, "#7ec8d4", 140);
  }

  if (game.level.canSwim) {
    if (p.inWater) {
      const drain = ch.id === "maya" ? 0.78 : 1;
      p.breath -= dt * drain;
      if (first && Math.random() < dt * 10) {
        burst(game, p.x + p.w / 2 + p.facing * 8, p.y + 8, 1, "#9ee4ee", 30);
      }
      if (p.breath <= 0) {
        p.breath = 0;
        kill(game);
      }
    } else {
      p.breath = Math.min(p.maxBreath, p.breath + dt * 3.4);
    }
  }

  if (first) {
    game.atPole = false;
    game.poleHint = "";
    collect(game, input);
    if (game.beam) {
      game.beam.t -= dt;
      if (game.beam.t <= 0) game.beam = null;
    }
    if (game.warpT > 0) {
      game.warpT -= dt;
      p.vx *= 0.82;
    }
    hazards(game);
  }

  // Cámara. El adelanto sigue a la mirada con retardo, para que girar no dé un
  // tirón; la altura solo se mueve cuando el héroe sale de una banda central,
  // más estrecha en el suelo que en el aire —así los saltos no marean—.
  const lookTarget = p.facing * 96;
  game.camLook += (lookTarget - game.camLook) * Math.min(1, 3.4 * dt);
  const centro = p.y + p.h / 2;
  const banda = p.grounded ? 44 : 104;
  if (centro < game.camY - banda) game.camY = centro + banda;
  else if (centro > game.camY + banda) game.camY = centro - banda;
  if (p.grounded) game.camY += (centro - game.camY) * Math.min(1, 2.6 * dt);

  const follow = 1 - Math.exp(-10 * dt);
  const bagTargetX = p.x + p.w / 2 - p.facing * 34;
  const bagTargetY = p.y + 10;
  game.bagX += (bagTargetX - game.bagX) * follow;
  game.bagY += (bagTargetY - game.bagY) * follow;

  for (const f of game.flying) {
    f.t += dt * 2.6;
    f.tx = game.bagX;
    f.ty = game.bagY;
  }
  game.flying = game.flying.filter((f) => {
    if (f.t >= 1) {
      game.coins += 1;
      burst(game, game.bagX, game.bagY, 5, "#d4a84b", 80);
      return false;
    }
    return true;
  });

  for (const part of game.particles) {
    part.life -= dt;
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    if (part.color === "#9ee4ee" || part.color === "#7ec8d4") part.vy -= 420 * dt;
    else part.vy += 520 * dt;
  }
  game.particles = game.particles.filter((part) => part.life > 0);
}

export function flyingPos(f: { x: number; y: number; tx: number; ty: number; t: number }) {
  const t = Math.min(1, f.t);
  const e = 1 - (1 - t) * (1 - t);
  return {
    x: f.x + (f.tx - f.x) * e,
    y: f.y + (f.ty - f.y) * e - Math.sin(t * Math.PI) * 40,
  };
}
