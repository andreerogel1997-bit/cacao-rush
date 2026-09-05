import assert from "node:assert/strict";
import { test } from "node:test";

import { getCharacter } from "./characters.ts";
import { createGame, updateGame } from "./sim.ts";
import type { Actions, CharacterId, Level, Platform } from "./types.ts";
import { ASSIST_LIVES, FIXED_DT, MAX_LIVES } from "./types.ts";

const QUIETO: Actions = {
  moveX: 0,
  jump: false,
  jumpHeld: false,
  down: false,
  power: false,
  pause: false,
  restart: false,
};

function acciones(over: Partial<Actions> = {}): Actions {
  return { ...QUIETO, ...over };
}

function suelo(x: number, y: number, w: number, h = 64, kind: Platform["kind"] = "solid"): Platform {
  return { x, y, w, h, kind, dx: 0, dy: 0 };
}

/** Un nivel mínimo y controlado: suelo de 800 px a la altura 500. */
function nivel(over: Partial<Level> = {}): Level {
  return {
    id: "prueba",
    world: "selva",
    index: 0,
    name: "Prueba",
    subtitle: "",
    width: 2000,
    height: 800,
    spawnX: 100,
    spawnY: 400,
    platforms: [suelo(0, 500, 800)],
    hazards: [],
    coins: [],
    checkpoints: [],
    goal: { x: 1900, y: 440, w: 48, h: 56, taken: false },
    sky: "jungle",
    tile: "jungle",
    fog: "#102018",
    ...over,
  };
}

function partida(over: Partial<Level> = {}, heroe: CharacterId = "maya") {
  return createGame(nivel(over), getCharacter(heroe));
}

/** Avanza la simulación n fotogramas con las mismas acciones. */
function correr(game: ReturnType<typeof partida>, n: number, input: Actions = QUIETO) {
  for (let i = 0; i < n; i++) updateGame(game, input, FIXED_DT);
}

test("la gravedad deja al héroe de pie sobre la plataforma", () => {
  const g = partida();
  correr(g, 60);
  assert.equal(g.player.grounded, true);
  assert.equal(g.player.y + g.player.h, 500, "los pies deben quedar en el borde del suelo");
  assert.equal(g.player.vy, 0);
});

test("saltar despega del suelo y la subida se corta al soltar", () => {
  const g = partida();
  correr(g, 60);
  const alturaEnSuelo = g.player.y;

  updateGame(g, acciones({ jump: true, jumpHeld: true }), FIXED_DT);
  assert.ok(g.player.vy < 0, "el salto debe dar velocidad hacia arriba");

  correr(g, 6, acciones({ jumpHeld: true }));
  const conSalto = g.player.y;
  assert.ok(conSalto < alturaEnSuelo, "debe haber subido");

  // Mismo salto, pero soltando el botón: sube menos.
  const h = partida();
  correr(h, 60);
  updateGame(h, acciones({ jump: true, jumpHeld: true }), FIXED_DT);
  correr(h, 6);
  assert.ok(h.player.y > conSalto, "soltar el salto debe cortar la subida");
});

test("el coyote deja saltar justo después de dejar el borde", () => {
  // Suelo corto: el héroe cae por el borde derecho mientras corre.
  const g = partida({ platforms: [suelo(0, 500, 200)], spawnX: 150, spawnY: 458 });
  correr(g, 30);
  assert.equal(g.player.grounded, true);

  // Un paso a la derecha lo saca de la plataforma.
  correr(g, 12, acciones({ moveX: 1 }));
  assert.equal(g.player.grounded, false, "ya debería estar en el aire");

  const antes = g.player.vy;
  updateGame(g, acciones({ moveX: 1, jump: true, jumpHeld: true }), FIXED_DT);
  assert.ok(g.player.vy < antes, "dentro del coyote el salto todavía responde");
  assert.ok(g.player.vy < -300, "y debe ser un salto de verdad, no un roce");
});

test("el buffer guarda un salto pulsado justo antes de aterrizar", () => {
  const g = partida({ spawnY: 380 });
  // Cae libre; pulsa salto en el aire, aún lejos del suelo.
  correr(g, 4);
  assert.equal(g.player.grounded, false);
  updateGame(g, acciones({ jump: true, jumpHeld: true }), FIXED_DT);

  // Sigue cayendo sin volver a pulsar: al tocar suelo el salto guardado sale.
  let salto = false;
  for (let i = 0; i < 7; i++) {
    updateGame(g, acciones({ jumpHeld: true }), FIXED_DT);
    if (g.player.vy < -300) salto = true;
  }
  assert.ok(salto, "el salto pulsado antes de aterrizar debe ejecutarse al tocar suelo");
});

test("no atraviesa el suelo aunque llegue muy rápido", () => {
  const g = partida({ spawnY: 100 });
  g.player.vy = 3000;
  correr(g, 40);
  assert.ok(g.player.y + g.player.h <= 501, "debe quedarse encima, no colarse");
  assert.equal(g.player.grounded, true);
});

test("las plataformas de una vía se atraviesan desde abajo", () => {
  const g = partida({
    platforms: [suelo(0, 500, 800), suelo(100, 380, 200, 16, "oneway")],
    spawnX: 150,
    spawnY: 458,
  });
  correr(g, 30);
  const desde = g.player.y;
  // Salto largo: debe pasar por encima de la plataforma fina sin chocar contra ella.
  correr(g, 1, acciones({ jump: true, jumpHeld: true }));
  correr(g, 14, acciones({ jumpHeld: true }));
  assert.ok(g.player.y < desde - 60, "debe subir atravesándola");
});

test("un grano recogido acaba contado en el bolso", () => {
  const g = partida({
    coins: [{ x: 113, y: 470, r: 12, taken: false }],
    spawnX: 100,
    spawnY: 458,
  });
  assert.equal(g.totalCoins, 1);
  correr(g, 90);
  assert.equal(g.level.coins[0]?.taken, true, "el grano se recoge al pasar por encima");
  assert.equal(g.coins, 1, "y termina sumado tras volar al bolso");
});

test("los pinchos quitan una vida y devuelven al punto de guardado", () => {
  const g = partida({
    hazards: [{ kind: "spikes", x: 90, y: 470, w: 60, h: 30 }],
    spawnX: 100,
    spawnY: 400,
  });
  assert.equal(g.lives, MAX_LIVES);
  correr(g, 30);
  assert.equal(g.lives, MAX_LIVES - 1, "debe costar exactamente una vida");
  correr(g, 60);
  assert.equal(g.status, "playing", "y volver al juego tras la pausa de muerte");
});

test("caer fuera del nivel también cuesta una vida", () => {
  const g = partida({ platforms: [], spawnY: 700 });
  correr(g, 90);
  assert.ok(g.lives < MAX_LIVES, "el vacío mata");
});

test("sin vidas la partida se acaba", () => {
  const g = partida({
    hazards: [{ kind: "spikes", x: 60, y: 470, w: 200, h: 30 }],
    spawnX: 100,
    spawnY: 400,
  });
  for (let i = 0; i < 900 && g.status !== "over"; i++) updateGame(g, QUIETO, FIXED_DT);
  assert.equal(g.status, "over");
  assert.equal(g.lives, 0);
});

test("cada héroe salta las veces que le tocan", () => {
  const saltos = (id: CharacterId) => {
    const g = partida({}, id);
    correr(g, 40);
    let n = 0;
    for (let i = 0; i < 5; i++) {
      const antes = g.player.vy;
      updateGame(g, acciones({ jump: true, jumpHeld: true }), FIXED_DT);
      if (g.player.vy < antes && g.player.vy < -300) n += 1;
      correr(g, 8, acciones({ jumpHeld: true }));
    }
    return n;
  };
  assert.equal(saltos("maya"), 2, "Maya salta dos veces");
  assert.equal(saltos("teko"), 3, "Teko, el jaguar, salta tres");
});

test("bajo el agua el héroe flota hacia la superficie", () => {
  const g = partida({
    canSwim: true,
    waterline: 300,
    platforms: [suelo(0, 760, 800)],
    spawnX: 100,
    spawnY: 400,
  });
  correr(g, 60);
  assert.equal(g.player.inWater, true, "debajo de la línea de agua está sumergido");
  const hondo = g.player.y;
  correr(g, 120);
  assert.ok(g.player.y < hondo, "sin tocar nada, el agua lo empuja hacia arriba");
});

test("quedarse hundido gasta el aliento y acaba costando una vida", () => {
  const g = partida({
    canSwim: true,
    waterline: 300,
    platforms: [suelo(0, 760, 800)],
    spawnX: 100,
    spawnY: 400,
  });
  const inicial = g.player.breath;
  // Nadando hacia abajo no llega a la superficie: es la situación que ahoga.
  const bucear = acciones({ down: true });
  correr(g, 60, bucear);
  assert.ok(g.player.breath < inicial, "el aliento debe bajar mientras está sumergido");

  for (let i = 0; i < 60 * 25 && g.lives === MAX_LIVES; i++) updateGame(g, bucear, FIXED_DT);
  assert.ok(g.lives < MAX_LIVES, "quedarse sin aire cuesta una vida");
});

test("Maya aguanta el doble de aire que el resto", () => {
  const maya = partida({ canSwim: true, waterline: 300 }, "maya");
  const rok = partida({ canSwim: true, waterline: 300 }, "rok");
  assert.equal(maya.player.maxBreath, 14);
  assert.equal(rok.player.maxBreath, 7);
});

test("un tótem mueve el punto de reaparición", () => {
  const g = partida({
    checkpoints: [{ x: 300, y: 458, w: 32, h: 42, active: false }],
    spawnX: 300,
    spawnY: 400,
  });
  const origen = g.spawnX;
  correr(g, 30);
  updateGame(g, acciones({ jump: true, jumpHeld: true }), FIXED_DT);
  assert.equal(g.level.checkpoints[0]?.active, true, "el tótem debe quedar encendido");
  assert.notEqual(g.spawnX, origen, "y la reaparición se muda a él");
});

test("tocar la meta gana el nivel", () => {
  const g = partida({ goal: { x: 96, y: 440, w: 60, h: 60, taken: false } });
  correr(g, 40);
  assert.equal(g.status, "win");
});

test("la serpiente repara en el héroe y va a por él, sin salir de su tramo", () => {
  // Serpiente con un tramo de 120 px a cada lado de x = 400.
  const serpiente = {
    kind: "snake" as const,
    x: 400,
    y: 470,
    w: 40,
    h: 24,
    ox: 400,
    oy: 470,
    ax: 120,
    period: 3.2,
  };
  const g = partida({ hazards: [serpiente], spawnX: 300, spawnY: 458 });
  const viva = g.level.hazards[0];
  assert.ok(viva);

  // De lejos, ni se entera.
  g.player.x = 60;
  correr(g, 30);
  assert.ok((viva.alert ?? 0) < 0.2, "a esa distancia no debería haber reparado en nadie");

  // Cerca y a su altura: despierta y viene.
  g.player.x = 300;
  g.player.y = 458;
  const desde = viva.x;
  correr(g, 60);
  assert.ok((viva.alert ?? 0) > 0.55, "debería haber reparado en el héroe");
  assert.ok(viva.x < desde, "y haberse movido hacia él");

  // Pero nunca más allá de su tramo.
  for (let i = 0; i < 600; i++) {
    g.player.x = 40;
    g.player.y = 458;
    updateGame(g, QUIETO, FIXED_DT);
    assert.ok(viva.x >= 400 - 120 - 1, "no puede abandonar el trecho que defiende");
  }
});

test("una caja rota deja de estorbar el paso", () => {
  // Rok cae sobre una caja apoyada en el suelo y la revienta con su golpe.
  const g = partida(
    {
      platforms: [suelo(0, 620, 800), suelo(160, 540, 64, 80, "crate")],
      spawnX: 175,
      spawnY: 300,
    },
    "rok",
  );
  const caja = g.level.platforms[1];
  assert.equal(caja?.kind, "crate");

  correr(g, 60, acciones({ down: true }));
  assert.equal(caja?.broken, true, "el golpe de Rok debe romperla");

  // Y con ella rota, el héroe termina en el suelo de abajo, no encima del hueco.
  correr(g, 90);
  assert.ok(
    g.player.y + g.player.h > 560,
    "tras romperse, la caja ya no puede seguir sosteniendo al héroe",
  );
});

test("el modo asistido da más vidas, más aire y más margen", () => {
  const normal = createGame(nivel(), getCharacter("rok"));
  const asistido = createGame(nivel(), getCharacter("rok"), undefined, { shake: 1, assist: true });

  assert.equal(normal.lives, MAX_LIVES);
  assert.equal(asistido.lives, ASSIST_LIVES);
  assert.ok(asistido.player.maxBreath > normal.player.maxBreath, "el aire rinde más");

  // Tras un golpe, la invulnerabilidad es más larga.
  const conPinchos = { hazards: [{ kind: "spikes" as const, x: 90, y: 470, w: 60, h: 30 }], spawnY: 400 };
  const a = createGame(nivel(conPinchos), getCharacter("rok"));
  const b = createGame(nivel(conPinchos), getCharacter("rok"), undefined, { shake: 1, assist: true });
  correr(a, 30);
  correr(b, 30);
  assert.ok(b.player.invuln > a.player.invuln, "el modo asistido perdona más tiempo");
});

test("la cámara mira hacia donde mira el héroe", () => {
  const g = partida();
  correr(g, 40);
  correr(g, 40, acciones({ moveX: 1 }));
  assert.ok(g.camLook > 40, "corriendo a la derecha, la cámara se adelanta a la derecha");

  correr(g, 60, acciones({ moveX: -1 }));
  assert.ok(g.camLook < -40, "y al girar, se adelanta al otro lado");
});

test("la misma partida jugada igual da exactamente la misma cámara", () => {
  const jugar = () => {
    const g = partida();
    correr(g, 30);
    correr(g, 20, acciones({ moveX: 1, jump: true, jumpHeld: true }));
    correr(g, 40, acciones({ moveX: -1 }));
    return { look: g.camLook, y: g.camY };
  };
  const uno = jugar();
  const dos = jugar();
  assert.deepEqual(uno, dos, "la cámara no puede depender del azar");
});

test("estar en pausa congela la simulación", () => {
  const g = partida({ spawnY: 200 });
  correr(g, 5);
  const y = g.player.y;
  g.status = "paused";
  correr(g, 60);
  assert.equal(g.player.y, y, "en pausa nada se mueve");
});
