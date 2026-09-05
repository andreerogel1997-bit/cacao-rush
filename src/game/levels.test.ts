import assert from "node:assert/strict";
import { test } from "node:test";

import { createLevels, SECRET_WORLDS, WORLDS } from "./levels.ts";
import type { Level, WorldId } from "./types.ts";
import { CAMPAIGN_COUNT, WORLD_TOTAL } from "./types.ts";

const niveles = createLevels();
const campana = niveles.filter((l) => l.index < CAMPAIGN_COUNT);
const secretos = niveles.filter((l) => l.index >= CAMPAIGN_COUNT);

/** ¿El punto cae dentro de alguna plataforma que bloquea el paso? */
function dentroDeSolido(nivel: Level, x: number, y: number): boolean {
  return nivel.platforms.some(
    (p) => p.kind !== "oneway" && x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h,
  );
}

/** Distancia al primer suelo por debajo del punto, o null si no hay ninguno. */
function sueloBajo(nivel: Level, x: number, y: number): number | null {
  let mejor: number | null = null;
  for (const p of nivel.platforms) {
    if (x < p.x || x > p.x + p.w) continue;
    const caida = p.y - y;
    if (caida < 0) continue;
    if (mejor === null || caida < mejor) mejor = caida;
  }
  return mejor;
}

test("el catálogo declara los mundos que el juego construye", () => {
  assert.equal(niveles.length, WORLD_TOTAL, "deben existir los diecisiete niveles");
  assert.equal(campana.length, CAMPAIGN_COUNT, "doce de campaña");
  assert.equal(secretos.length, WORLD_TOTAL - CAMPAIGN_COUNT, "cinco secretos");
  assert.equal(WORLDS.length, CAMPAIGN_COUNT);
  assert.equal(SECRET_WORLDS.length, WORLD_TOTAL - CAMPAIGN_COUNT);
});

test("cada nivel tiene identidad propia y su índice en orden", () => {
  const mundos = new Set<WorldId>();
  const ids = new Set<string>();
  niveles.forEach((nivel, i) => {
    assert.equal(nivel.index, i, `${nivel.id}: el índice debe coincidir con su puesto`);
    assert.ok(!mundos.has(nivel.world), `${nivel.world}: mundo repetido`);
    assert.ok(!ids.has(nivel.id), `${nivel.id}: identificador repetido`);
    mundos.add(nivel.world);
    ids.add(nivel.id);
    assert.ok(nivel.name.length > 0, `${nivel.id}: le falta el nombre`);
  });
});

test("las piezas de cada nivel caben dentro de su propio mapa", () => {
  for (const nivel of niveles) {
    const { width: w, height: h, id } = nivel;
    assert.ok(w > 0 && h > 0, `${id}: el mapa no puede ser de tamaño cero`);

    assert.ok(nivel.spawnX >= 0 && nivel.spawnX <= w, `${id}: el arranque se sale de lado`);
    assert.ok(nivel.spawnY >= 0 && nivel.spawnY <= h, `${id}: el arranque se sale por arriba o abajo`);

    for (const p of nivel.platforms) {
      assert.ok(p.w > 0 && p.h > 0, `${id}: hay una plataforma sin superficie`);
    }
    for (const c of nivel.coins) {
      assert.ok(c.x >= 0 && c.x <= w && c.y >= 0 && c.y <= h, `${id}: un grano cae fuera del mapa`);
    }
    for (const cp of nivel.checkpoints) {
      assert.ok(cp.x >= 0 && cp.x <= w, `${id}: un tótem se sale de lado`);
      assert.ok(cp.y >= 0 && cp.y <= h, `${id}: un tótem se sale por arriba o abajo`);
    }
    assert.ok(
      nivel.goal.x >= 0 && nivel.goal.x + nivel.goal.w <= w,
      `${id}: la meta se sale del mapa`,
    );
  }
});

test("todos los niveles se pueden empezar y terminar", () => {
  for (const nivel of niveles) {
    const { id } = nivel;
    assert.ok(nivel.platforms.length > 0, `${id}: no hay dónde pisar`);
    assert.ok(nivel.checkpoints.length > 0, `${id}: no hay dónde guardar la partida`);

    // Hay suelo bajo el punto de arranque, y no se arranca dentro de un bloque.
    assert.ok(
      !dentroDeSolido(nivel, nivel.spawnX + 13, nivel.spawnY + 21),
      `${id}: el héroe arranca metido dentro de una plataforma`,
    );
    const caidaInicial = sueloBajo(nivel, nivel.spawnX + 13, nivel.spawnY + 42);
    assert.ok(caidaInicial !== null, `${id}: bajo el punto de arranque no hay suelo, solo vacío`);

    // La meta se apoya en algo: sin suelo debajo es inalcanzable.
    const bajoLaMeta = sueloBajo(nivel, nivel.goal.x + nivel.goal.w / 2, nivel.goal.y + nivel.goal.h);
    assert.ok(bajoLaMeta !== null, `${id}: la meta flota sobre el vacío`);
  }
});

test("ningún grano queda enterrado dentro de una plataforma", () => {
  for (const nivel of niveles) {
    for (const c of nivel.coins) {
      assert.ok(
        !dentroDeSolido(nivel, c.x, c.y),
        `${nivel.id}: hay un grano dentro de un bloque, en (${c.x}, ${c.y})`,
      );
    }
  }
});

test("los caminos ocultos llevan a un mundo que existe", () => {
  const porMundo = new Map(niveles.map((l) => [l.world, l]));
  const declarados = new Set(SECRET_WORLDS.map((s) => s.id));
  const enlazados = new Set<WorldId>();

  for (const nivel of campana) {
    for (const cp of nivel.checkpoints) {
      if (!cp.secret) continue;
      assert.ok(porMundo.has(cp.secret), `${nivel.id}: el tótem apunta a "${cp.secret}", que no existe`);
      assert.ok(declarados.has(cp.secret), `${cp.secret} no está en la lista de secretos`);
      enlazados.add(cp.secret);
    }
  }

  assert.equal(enlazados.size, SECRET_WORLDS.length, "los cinco secretos deben tener quien los abra");
});

test("de cada secreto se puede volver por donde se entró", () => {
  const porMundo = new Map(niveles.map((l) => [l.world, l]));
  for (const nivel of secretos) {
    const portal = nivel.portal;
    assert.ok(portal, `${nivel.id}: no hay portal de vuelta`);
    const destino = porMundo.get(portal.world);
    assert.ok(destino, `${nivel.id}: la vuelta apunta a "${portal.world}", que no existe`);
    assert.ok(
      portal.x >= 0 && portal.x <= destino.width,
      `${nivel.id}: la vuelta deja al héroe fuera del mapa`,
    );
    assert.ok(
      !dentroDeSolido(destino, portal.x + 13, portal.y + 21),
      `${nivel.id}: la vuelta deja al héroe dentro de una plataforma`,
    );
  }
});

test("solo se nada donde hay agua declarada", () => {
  for (const nivel of niveles) {
    if (!nivel.canSwim) continue;
    assert.ok(
      typeof nivel.waterline === "number",
      `${nivel.id}: se puede nadar pero no hay línea de agua`,
    );
    assert.ok(
      nivel.waterline! > 0 && nivel.waterline! < nivel.height,
      `${nivel.id}: la línea de agua cae fuera del mapa`,
    );
  }
});
