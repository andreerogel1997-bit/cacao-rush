import assert from "node:assert/strict";
import { test } from "node:test";

import { consumeEdges, pollActions, setInjectedKeys, withoutEdges } from "./input.ts";

function soltarTodo() {
  setInjectedKeys([]);
  pollActions();
  consumeEdges();
}

test("una pulsación de salto sobrevive a los fotogramas sin paso de simulación", () => {
  soltarTodo();
  setInjectedKeys(["Space"]);
  const primero = pollActions();
  assert.equal(primero.jump, true, "el flanco aparece en el fotograma de la pulsación");

  // A 120 Hz, el siguiente fotograma llega sin que toque ningún paso de la
  // simulación. Antes el flanco se evaporaba aquí y el salto no salía.
  const segundo = pollActions();
  assert.equal(segundo.jump, true, "sigue pendiente hasta que un paso lo consuma");

  consumeEdges();
  const tercero = pollActions();
  assert.equal(tercero.jump, false, "consumido, no vuelve a saltar por la misma pulsación");
  assert.equal(tercero.jumpHeld, true, "aunque la tecla siga apretada");
  soltarTodo();
});

test("soltar y volver a pulsar produce un flanco nuevo", () => {
  soltarTodo();
  setInjectedKeys(["Space"]);
  pollActions();
  consumeEdges();
  setInjectedKeys([]);
  assert.equal(pollActions().jump, false);
  setInjectedKeys(["Space"]);
  assert.equal(pollActions().jump, true);
  soltarTodo();
});

test("el poder se conserva igual que el salto", () => {
  soltarTodo();
  setInjectedKeys(["KeyJ"]);
  assert.equal(pollActions().power, true);
  assert.equal(pollActions().power, true);
  consumeEdges();
  assert.equal(pollActions().power, false);
  soltarTodo();
});

test("los pasos extra de un fotograma no ven las pulsaciones", () => {
  soltarTodo();
  setInjectedKeys(["Space", "KeyJ", "KeyD"]);
  const conFlancos = pollActions();
  const sinFlancos = withoutEdges(conFlancos);
  assert.equal(sinFlancos.jump, false);
  assert.equal(sinFlancos.power, false);
  assert.equal(sinFlancos.jumpHeld, true, "mantener el salto sí se conserva");
  assert.equal(sinFlancos.moveX, 1, "y el movimiento también");
  soltarTodo();
});
