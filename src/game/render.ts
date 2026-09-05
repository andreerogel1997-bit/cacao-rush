import type { ArtPack } from "./assets";
import { flyingPos, laserOn } from "./sim";
import type { Game } from "./types";
import { VIEW_H, VIEW_W } from "./types";

export type Cam = { x: number; y: number };

/** Recorrido total del cielo entre un extremo y otro del nivel, en píxeles. */
const SKY_DRIFT_X = 96;
const SKY_DRIFT_Y = 48;

let veilCache: CanvasGradient | null = null;
let veilCtx: CanvasRenderingContext2D | null = null;

/** El degradado del velo no cambia nunca; se rehace solo si cambia el contexto. */
function skyVeil(ctx: CanvasRenderingContext2D): CanvasGradient {
  if (veilCache && veilCtx === ctx) return veilCache;
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(20,14,12,0.16)");
  g.addColorStop(0.55, "rgba(20,14,12,0.30)");
  g.addColorStop(1, "rgba(20,14,12,0.46)");
  veilCache = g;
  veilCtx = ctx;
  return g;
}

export function cameraOf(game: Game): Cam {
  const p = game.player;
  const look = p.facing * 90;
  let x = p.x + p.w / 2 - VIEW_W / 2 + look;
  let y = p.y + p.h / 2 - VIEW_H / 2 - 36;
  x = Math.max(0, Math.min(x, game.level.width - VIEW_W));
  y = Math.max(0, Math.min(y, game.level.height - VIEW_H));
  const shake = game.trauma * game.trauma;
  if (shake > 0.001) {
    x += (Math.random() * 2 - 1) * 14 * shake;
    y += (Math.random() * 2 - 1) * 10 * shake;
  }
  return { x: Math.round(x), y: Math.round(y) };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawTiled(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  cam: Cam,
  tint?: string,
) {
  const sx = x - cam.x;
  const sy = y - cam.y;
  if (sx + w < -40 || sy + h < -40 || sx > VIEW_W + 40 || sy > VIEW_H + 40) return;
  ctx.save();
  roundRect(ctx, sx, sy, w, h, 6);
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    const tw = 64;
    const th = 64;
    for (let ix = 0; ix < w + tw; ix += tw) {
      for (let iy = 0; iy < h + th; iy += th) {
        ctx.drawImage(img, sx + ix, sy + iy, tw, th);
      }
    }
  } else {
    ctx.fillStyle = tint ?? "#4a3428";
    ctx.fillRect(sx, sy, w, h);
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "rgba(243,230,208,0.16)";
  ctx.fillRect(sx, sy, w, 5);
  ctx.strokeStyle = "rgba(20,14,12,0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, sx, sy, w, h, 6);
  ctx.stroke();
  ctx.restore();
}

function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cam: Cam) {
  const sx = x - cam.x;
  const sy = y - cam.y;
  ctx.beginPath();
  const n = Math.max(2, Math.round(w / 16));
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.moveTo(sx + i * bw, sy + h);
    ctx.lineTo(sx + i * bw + bw / 2, sy);
    ctx.lineTo(sx + (i + 1) * bw, sy + h);
  }
  ctx.closePath();
  ctx.fillStyle = "#c9c4bc";
  ctx.fill();
  ctx.strokeStyle = "#2c1810";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawIcicles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cam: Cam) {
  const sx = x - cam.x;
  const sy = y - cam.y;
  ctx.beginPath();
  const n = Math.max(2, Math.round(w / 16));
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.moveTo(sx + i * bw, sy);
    ctx.lineTo(sx + i * bw + bw / 2, sy + h);
    ctx.lineTo(sx + (i + 1) * bw, sy);
  }
  ctx.closePath();
  ctx.fillStyle = "#cfe8f6";
  ctx.fill();
  ctx.strokeStyle = "#6a8aa0";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function pick(frames: HTMLImageElement[] | undefined, i: number): HTMLImageElement | undefined {
  if (!frames || frames.length === 0) return undefined;
  const n = frames.length;
  const idx = ((i % n) + n) % n;
  return frames[idx];
}

function frameOf(game: Game, art: ArtPack | null): HTMLImageElement | undefined {
  if (!art) return undefined;
  const id = game.character.id;
  const p = game.player;
  const run = art.run[id];
  const idle = art.idle[id];
  const jump = art.jump[id];
  const wall = art.wall[id];
  const swim = art.swim[id];
  const dash = art.dash[id];
  const catchF = art.catch[id];
  const glide = art.glide[id];
  const pound = art.pound[id];
  const pounce = art.pounce[id];
  const crouch = art.crouch[id];
  const crawl = art.crawl[id];
  const climb = art.climb[id];
  const shimmy = art.shimmy[id];

  if (p.catchT > 0) {
    const i = Math.min(3, Math.floor((1 - p.catchT / 0.7) * 4));
    return pick(catchF, i) ?? pick(swim, i) ?? pick(jump, 2);
  }
  if (p.dashing) return pick(dash, Math.floor(p.animT * 16)) ?? pick(run, Math.floor(p.animT * 18));
  if (p.pounding) {
    if (!p.grounded && p.vy > 200) return pick(pound, 1) ?? pick(jump, 3);
    if (p.grounded) return pick(pound, 2) ?? pick(jump, 0);
    return pick(pound, 0) ?? pick(jump, 3);
  }
  if (p.gliding) return pick(glide, Math.floor(p.animT * 8)) ?? pick(jump, 2);
  if (p.inWater && (!p.grounded || Math.hypot(p.vx, p.vy) > 28)) {
    const fps = 6 + Math.min(6, Math.hypot(p.vx, p.vy) / 50);
    return pick(swim, Math.floor(p.animT * fps)) ?? pick(jump, Math.floor(p.animT * fps));
  }

  if (p.hanging) {
    return pick(shimmy, Math.floor(p.animT * 9)) ?? pick(wall, 0) ?? pick(jump, 0);
  }
  if (p.climbing) {
    const fps = p.vy < -30 ? 11 : 6;
    return pick(climb, Math.floor(p.animT * fps)) ?? pick(wall, p.vy > 40 ? 1 : 0);
  }

  if (p.wallHopT > 0) return pick(wall, 3) ?? pick(jump, 1);
  const onWall = !p.grounded && p.wallDir !== 0 && p.wallLock <= 0;
  if (onWall) {
    if (p.vy > 50) return pick(wall, 1) ?? pick(jump, 0);
    return pick(wall, 0) ?? pick(jump, 0);
  }

  if (!p.grounded) {
    if (p.pounceT > 0) {
      const i = p.vy < -80 ? 1 : p.vy > 80 ? 3 : 2;
      return pick(pounce, i) ?? pick(jump, i);
    }
    if (p.vy < -140) return pick(jump, 1) ?? pick(run, 4);
    if (p.vy > 160) return pick(jump, 3) ?? pick(run, 2);
    return pick(jump, 2) ?? pick(idle, 0);
  }

  if (p.dragging || p.crouching) {
    if (p.dragging || Math.abs(p.vx) > 18) {
      const fps = p.dragging ? 12 : 9;
      return pick(crawl, Math.floor(p.animT * fps)) ?? pick(crouch, Math.floor(p.animT * fps));
    }
    return pick(crouch, Math.floor(p.animT * 6)) ?? pick(idle, 0);
  }

  if (Math.abs(p.vx) > 36 && run && run.length > 0) {
    const fps = 9 + Math.min(8, Math.abs(p.vx) / 40);
    return pick(run, Math.floor(p.animT * fps));
  }

  if (idle && idle.length > 0) return pick(idle, Math.floor(p.animT * 6));
  return undefined;
}


export function renderGame(ctx: CanvasRenderingContext2D, game: Game, art: ArtPack | null, cam: Cam) {
  const { level, player: p } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  const sky = art?.sky[level.sky];
  if (sky && sky.complete && sky.naturalWidth > 0) {
    // Una sola capa de cielo, con recorrido propio y siempre cubriendo el
    // encuadre. Antes se dibujaba dos veces —la segunda al 35 % y desplazada
    // hacia abajo—, lo que marcaba una costura horizontal a media pantalla en
    // todos los mundos.
    const spanX = Math.max(1, level.width - VIEW_W);
    const spanY = Math.max(1, level.height - VIEW_H);
    const ox = -(cam.x / spanX) * SKY_DRIFT_X;
    const oy = -(cam.y / spanY) * SKY_DRIFT_Y;
    ctx.drawImage(sky, ox, oy, VIEW_W + SKY_DRIFT_X, VIEW_H + SKY_DRIFT_Y);
  } else {
    ctx.fillStyle = level.fog;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Velo atmosférico: aparta el paisaje del plano donde se juega. Denso abajo,
  // que es donde vive el suelo y donde el fondo competía con las plataformas.
  ctx.fillStyle = skyVeil(ctx);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (level.waterline != null) {
    const wy = level.waterline - cam.y;
    if (wy < VIEW_H) {
      const fill =
        level.world === "volcan"
          ? "rgba(180,40,20,0.55)"
          : level.world === "glaciar"
            ? "rgba(70,150,200,0.5)"
            : level.world === "isabela"
              ? "rgba(12,70,118,0.62)"
              : level.world === "amazonia"
                ? "rgba(28,72,42,0.5)"
                : "rgba(90,45,20,0.55)";
      const rim =
        level.world === "volcan"
          ? "rgba(255,140,40,0.35)"
          : level.world === "glaciar"
            ? "rgba(210,240,255,0.5)"
            : level.world === "isabela"
              ? "rgba(90,200,210,0.4)"
              : level.world === "amazonia"
                ? "rgba(80,140,70,0.35)"
                : "rgba(210,140,70,0.3)";
      ctx.fillStyle = fill;
      ctx.fillRect(0, wy, VIEW_W, VIEW_H - wy + 40);
      ctx.fillStyle = rim;
      ctx.fillRect(0, wy, VIEW_W, 6);
      ctx.fillStyle = "rgba(210,240,255,0.18)";
      const wave = Math.sin(game.time * 2.2) * 4;
      ctx.fillRect(0, wy - 2 + wave * 0.15, VIEW_W, 3);
    }
  }

  for (const fall of level.falls ?? []) {
    const fx = fall.x - cam.x;
    const fy = fall.y - cam.y;
    const grd = ctx.createLinearGradient(fx, fy, fx, fy + fall.h);
    grd.addColorStop(0, "rgba(180,220,230,0.15)");
    grd.addColorStop(0.5, "rgba(140,200,220,0.45)");
    grd.addColorStop(1, "rgba(90,170,190,0.2)");
    ctx.fillStyle = grd;
    ctx.fillRect(fx, fy, fall.w, fall.h);
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 7; i++) {
      const ox = fx + ((i + 0.5) / 7) * fall.w + Math.sin(game.time * 6 + i) * 2;
      ctx.fillStyle = "rgba(220,240,250,0.35)";
      ctx.fillRect(ox, fy, 3, fall.h);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(180,220,230,0.25)";
    ctx.beginPath();
    ctx.ellipse(fx + fall.w / 2, fy + fall.h, fall.w * 0.7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tile = art?.tile[level.tile];
  for (const plat of level.platforms) {
    if (plat.broken) continue;
    if (plat.kind === "oneway") {
      const sx = plat.x - cam.x;
      const sy = plat.y - cam.y;
      ctx.fillStyle = "rgba(243,230,208,0.18)";
      roundRect(ctx, sx, sy, plat.w, Math.min(14, plat.h), 4);
      ctx.fill();
      ctx.fillStyle = "rgba(243,230,208,0.5)";
      ctx.fillRect(sx + 2, sy, plat.w - 4, 3);
      continue;
    }
    if (plat.kind === "crate") {
      const sx = plat.x - cam.x;
      const sy = plat.y - cam.y;
      ctx.fillStyle = "#6b4228";
      roundRect(ctx, sx, sy, plat.w, plat.h, 4);
      ctx.fill();
      ctx.strokeStyle = "#2c1810";
      ctx.stroke();
      ctx.strokeStyle = "rgba(243,230,208,0.25)";
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 4);
      ctx.lineTo(sx + plat.w - 4, sy + plat.h - 4);
      ctx.moveTo(sx + plat.w - 4, sy + 4);
      ctx.lineTo(sx + 4, sy + plat.h - 4);
      ctx.stroke();
      continue;
    }
    drawTiled(ctx, tile, plat.x, plat.y, plat.w, plat.h, cam);
    if (plat.kind === "ice") {
      const sx = plat.x - cam.x;
      const sy = plat.y - cam.y;
      ctx.fillStyle = "rgba(180,230,255,0.28)";
      ctx.fillRect(sx, sy, plat.w, 7);
    }
    if (plat.kind === "gold") {
      const sx = plat.x - cam.x;
      const sy = plat.y - cam.y;
      ctx.fillStyle = "rgba(212,168,75,0.38)";
      ctx.fillRect(sx, sy, plat.w, plat.h);
      ctx.fillStyle = "rgba(255,220,120,0.45)";
      ctx.fillRect(sx, sy, plat.w, 6);
    }
    if (plat.kind === "moving") {
      const sx = plat.x - cam.x;
      const sy = plat.y - cam.y;
      ctx.fillStyle = "rgba(61,138,114,0.35)";
      ctx.fillRect(sx + 8, sy + 6, plat.w - 16, 4);
    }
    if (plat.deco === "llama" || plat.deco === "sealion") {
      const img = plat.deco === "llama" ? art?.llama : art?.sealion;
      const sx = plat.x - cam.x + plat.w / 2;
      const sy = plat.y - cam.y;
      if (img && img.complete) ctx.drawImage(img, sx - 28, sy - 52, 56, 56);
      else {
        ctx.fillStyle = plat.deco === "llama" ? "#e8d7b8" : "#6a7a88";
        ctx.fillRect(sx - 16, sy - 36, 32, 36);
      }
    }
  }

  for (const h of level.hazards) {
    if (h.kind === "spikes") drawSpikes(ctx, h.x, h.y, h.w, h.h, cam);
    else if (h.kind === "icicle") drawIcicles(ctx, h.x, h.y, h.w, h.h, cam);
    else if (h.kind === "lava") {
      const sx = h.x - cam.x;
      const sy = h.y - cam.y;
      const icy = level.world === "glaciar" || level.world === "isabela";
      ctx.fillStyle = icy ? "#2a6f8a" : level.world === "amazonia" ? "#245c38" : "#c45c26";
      ctx.fillRect(sx, sy, h.w, h.h);
      ctx.fillStyle = icy ? "rgba(180,230,255,0.45)" : "rgba(255,180,60,0.45)";
      ctx.fillRect(sx, sy, h.w, 5);
    } else if (h.kind === "saw") {
      const sx = h.x - cam.x;
      const sy = h.y - cam.y;
      const r = h.r ?? 16;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(game.time * 6);
      ctx.fillStyle = "#c8c2b8";
      ctx.beginPath();
      const teeth = 10;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const a2 = a + Math.PI / teeth;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a2) * (r * 0.62), Math.sin(a2) * (r * 0.62));
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8a4030";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (h.kind === "fireball") {
      const sx = h.x - cam.x;
      const sy = h.y - cam.y;
      ctx.fillStyle = "#ffb040";
      ctx.beginPath();
      ctx.arc(sx + 9, sy + 9, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c45c26";
      ctx.beginPath();
      ctx.arc(sx + 9, sy + 9, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (h.kind === "snake") {
      const img = art?.snake;
      const t = game.time * ((Math.PI * 2) / (h.period ?? 3.2)) + (h.phase ?? 0);
      const facing = Math.cos(t) >= 0 ? 1 : -1;
      const sx = h.x - cam.x + h.w / 2;
      const sy = h.y - cam.y + h.h;
      const dw = 112;
      const dh = 46;
      if (img && img.complete) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(facing, 1);
        ctx.shadowColor = "rgba(20,14,12,0.85)";
        ctx.shadowBlur = 14;
        ctx.drawImage(img, -dw / 2, -dh + 8, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = "#2f7d62";
        ctx.fillRect(h.x - cam.x, h.y - cam.y, h.w, h.h);
      }
    } else if (h.kind === "crab") {
      const t = game.time * ((Math.PI * 2) / (h.period ?? 2.5)) + (h.phase ?? 0);
      const facing = Math.cos(t) >= 0 ? 1 : -1;
      const sx = h.x - cam.x + h.w / 2;
      const sy = h.y - cam.y + h.h;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(facing, 1);
      ctx.fillStyle = "#c45c26";
      ctx.beginPath();
      ctx.ellipse(0, -8, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2c1810";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.lineTo(-24, -18);
      ctx.moveTo(16, -10);
      ctx.lineTo(24, -18);
      ctx.stroke();
      ctx.fillStyle = "#1a100c";
      ctx.beginPath();
      ctx.arc(-6, -12, 2.2, 0, Math.PI * 2);
      ctx.arc(6, -12, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (h.kind === "rock") {
      const sx = h.x - cam.x + h.w / 2;
      const sy = h.y - cam.y + h.h / 2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(game.time * 4 + (h.phase ?? 0));
      ctx.fillStyle = "#6a4a38";
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.lineTo(-8, -10);
      ctx.lineTo(3, -12);
      ctx.lineTo(12, -4);
      ctx.lineTo(10, 8);
      ctx.lineTo(-4, 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8a6a52";
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(2, -8);
      ctx.lineTo(4, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (h.kind === "shark") {
      const img = art?.shark;
      const t = game.time * ((Math.PI * 2) / (h.period ?? 4.2)) + (h.phase ?? 0);
      const facing = Math.cos(t) >= 0 ? 1 : -1;
      const sx = h.x - cam.x + h.w / 2;
      const sy = h.y - cam.y + h.h;
      const dw = 128;
      const dh = 52;
      if (img && img.complete) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(facing, 1);
        ctx.shadowColor = "rgba(8,20,36,0.9)";
        ctx.shadowBlur = 16;
        ctx.drawImage(img, -dw / 2, -dh + 10, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = "#4a6278";
        ctx.fillRect(h.x - cam.x, h.y - cam.y, h.w, h.h);
      }
    } else if (h.kind === "laser") {
      if (!laserOn(h, game.time)) continue;
      const sx = h.x - cam.x;
      const sy = h.y - cam.y;
      ctx.save();
      ctx.shadowColor = "#e85a3a";
      ctx.shadowBlur = 16;
      const grd = ctx.createLinearGradient(sx, sy, sx + h.w, sy + h.h);
      grd.addColorStop(0, "rgba(255, 210, 140, 0.15)");
      grd.addColorStop(0.5, "rgba(232, 90, 58, 0.9)");
      grd.addColorStop(1, "rgba(255, 210, 140, 0.15)");
      ctx.fillStyle = grd;
      ctx.fillRect(sx, sy, h.w, h.h);
      ctx.fillStyle = "rgba(255, 240, 210, 0.95)";
      if (h.h >= h.w) ctx.fillRect(sx + h.w * 0.35, sy, Math.max(2, h.w * 0.3), h.h);
      else ctx.fillRect(sx, sy + h.h * 0.3, h.w, Math.max(2, h.h * 0.4));
      ctx.restore();
    }
  }

  for (const c of level.coins) {
    if (c.taken) continue;
    const bob = Math.sin(game.time * 4 + c.x * 0.05) * 4;
    const kind = c.kind ?? "bean";
    const img = kind === "fish" ? art?.fish : kind === "chocolate" ? art?.chocolate : art?.bean;
    const sx = c.x - cam.x;
    const sy = c.y - cam.y + bob;
    const size = kind === "fish" ? 32 : 28;
    if (img && img.complete) ctx.drawImage(img, sx - size / 2, sy - size / 2, size, size);
    else {
      ctx.fillStyle = kind === "fish" ? "#7ec8d4" : kind === "chocolate" ? "#6b3a1f" : "#6b3a1f";
      ctx.beginPath();
      ctx.ellipse(sx, sy, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const cp of level.checkpoints) {
    const img = art?.checkpoint;
    const sx = cp.x - cam.x;
    const sy = cp.y - cam.y;
    if (img && img.complete) {
      ctx.save();
      if (cp.active) {
        ctx.shadowColor = "#3d8a72";
        ctx.shadowBlur = 16;
      }
      ctx.drawImage(img, sx, sy, cp.w, cp.h);
      ctx.restore();
    } else {
      ctx.fillStyle = cp.active ? "#3d8a72" : "#6a5a4a";
      ctx.fillRect(sx + 14, sy, 8, cp.h);
    }
    if (cp.secret || cp.returnTo) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(game.time * 3) * 0.2;
      ctx.strokeStyle = cp.active ? "#f6e27a" : "#b8a48c";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 6, sy + 8, cp.w - 12, 10);
      ctx.restore();
    }
  }

  const g = level.goal;
  if (!g.taken) {
    const bob = Math.sin(game.time * 3) * 6;
    const rescue = level.goalKind === "explorer";
    const sun = level.goalKind === "sol";
    const img = rescue ? art?.explorer : sun ? art?.sol : art?.goal ?? art?.coin;
    const sx = g.x - cam.x;
    const sy = g.y - cam.y + bob;
    ctx.save();
    ctx.shadowColor = rescue ? "#f3e6d0" : "#d4a84b";
    ctx.shadowBlur = sun ? 28 : 22;
    if (img && img.complete) ctx.drawImage(img, sx, sy, g.w, g.h);
    else {
      ctx.fillStyle = "#d4a84b";
      ctx.beginPath();
      ctx.ellipse(sx + 24, sy + 28, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const bag = art?.bag;
  const bx = game.bagX - cam.x;
  const by = game.bagY - cam.y;
  if (bag && bag.complete) ctx.drawImage(bag, bx - 18, by - 10, 36, 36);
  else {
    ctx.fillStyle = "#5a3a24";
    ctx.fillRect(bx - 12, by, 24, 20);
  }

  for (const f of game.flying) {
    const pos = flyingPos(f);
    const kind = f.kind ?? "bean";
    const img = kind === "fish" ? art?.fish : kind === "chocolate" ? art?.chocolate : art?.bean;
    const size = kind === "fish" ? 24 : 20;
    if (img && img.complete) ctx.drawImage(img, pos.x - cam.x - size / 2, pos.y - cam.y - size / 2, size, size);
  }

  const spr = frameOf(game, art);
  const crawling = p.dragging || (p.crouching && Math.abs(p.vx) > 18);
  const dw = (
    p.hanging ? 58 :
    p.climbing ? 52 :
    p.dragging ? 84 :
    p.crouching ? (crawling ? 76 : 58) : 56
  ) * p.squash;
  const dh = (
    p.hanging ? 64 :
    p.climbing ? 68 :
    p.dragging ? 34 :
    p.crouching ? (crawling ? 38 : 42) : 70
  ) * p.stretch;
  const dx = p.x + p.w / 2 - cam.x;
  const dy = p.y + p.h - cam.y;
  const onWall = !p.grounded && p.wallDir !== 0 && p.wallLock <= 0 && !p.hanging;
  ctx.save();
  if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(dx, dy);
  ctx.scale(p.facing, 1);
  if (p.climbing) {
    ctx.rotate(-0.12);
    ctx.translate(4, 0);
  } else if (p.hanging) {
    ctx.rotate(0.08);
  } else if (onWall) {
    ctx.rotate(-0.28);
    ctx.translate(6, 0);
  } else if (p.wallHopT > 0) {
    ctx.rotate(p.facing * 0.18);
  } else if (p.inWater && !p.grounded) {
    const tilt = Math.max(-0.35, Math.min(0.35, p.vy / 420));
    ctx.rotate(tilt);
  } else if (p.dashing) {
    ctx.rotate(-0.12);
  } else if (p.gliding) {
    ctx.rotate(-0.08);
  } else if (p.pounding && !p.grounded) {
    ctx.rotate(0.06);
  }
  if (spr && spr.complete) {
    if (p.dashing) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(spr, -dw / 2 - 18, -dh, dw, dh);
      ctx.globalAlpha = 0.12;
      ctx.drawImage(spr, -dw / 2 - 32, -dh, dw, dh);
      ctx.restore();
    }
    ctx.drawImage(spr, -dw / 2, -dh, dw, dh);
  } else {
    ctx.fillStyle = game.character.color;
    roundRect(ctx, -dw / 2, -dh, dw, dh, 8);
    ctx.fill();
  }
  ctx.restore();

  if (p.inWater) {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const phase = game.time * (0.7 + i * 0.11) + i * 1.7;
      const rise = (phase % 1.6) / 1.6;
      const bx = p.x + p.w / 2 - cam.x + Math.sin(phase * 3 + i) * 14;
      const by = p.y + p.h * 0.35 - cam.y - rise * 58;
      const r = 1.4 + (i % 3) * 1.1;
      ctx.globalAlpha = 0.45 * (1 - rise);
      ctx.strokeStyle = "rgba(190,230,245,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const part of game.particles) {
    const a = Math.max(0, part.life / part.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = part.color;
    ctx.fillRect(part.x - cam.x, part.y - cam.y, part.size, part.size);
    ctx.globalAlpha = 1;
  }

  if (game.beam) {
    const b = game.beam;
    const k = Math.max(0, b.t / b.max);
    const grow = 1 - k;
    const bx = b.x - cam.x;
    const by = b.y - cam.y;
    const rise = Math.max(80, grow * (VIEW_H + 120));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(bx, by + 10, bx, by - rise);
    beam.addColorStop(0, b.secret ? "rgba(246,226,122,1)" : "rgba(232,140,58,0.95)");
    beam.addColorStop(0.2, b.secret ? "rgba(246,226,122,0.7)" : "rgba(243,230,208,0.7)");
    beam.addColorStop(1, "rgba(243,230,208,0)");
    ctx.fillStyle = beam;
    const half = 8 + grow * 16;
    ctx.beginPath();
    ctx.moveTo(bx - 14, by + 8);
    ctx.lineTo(bx + 14, by + 8);
    ctx.lineTo(bx + half, by - rise);
    ctx.lineTo(bx - half, by - rise);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.secret ? "rgba(255,250,220,0.95)" : "rgba(255,236,200,0.9)";
    ctx.fillRect(bx - 3, by - rise, 6, rise + 8);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = k * 0.22;
    ctx.fillStyle = b.secret ? "#f6e27a" : "#f3e6d0";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, "rgba(20,14,12,0.18)");
  grd.addColorStop(0.55, "rgba(20,14,12,0)");
  grd.addColorStop(1, "rgba(20,14,12,0.28)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
