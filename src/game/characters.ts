import type { CharacterDef, CharacterId } from "./types.ts";

export const CHARACTERS: CharacterDef[] = [
  {
    id: "maya",
    name: "Maya",
    title: "La Exploradora",
    power: "Dash y buceo",
    powerHint: "J, K, F o Shift: dash. Bajo el agua: WASD para nadar, dash de burbuja, peces para el aire. Maya aguanta 14s.",
    blurb: "Senderismo, pueblos chicos, café, buceo a pulmón y un dash cuando el suelo —o el mar— se acaba.",
    color: "#3d8a72",
    accent: "#f3e6d0",
    jumps: 2,
    jumpVel: -720,
    runSpeed: 290,
    gravityMul: 1,
  },
  {
    id: "teko",
    name: "Teko",
    title: "El Jaguar",
    power: "Super salto",
    powerHint: "Tercer salto automático en el aire. WS recarga el impulso en la pared.",
    blurb: "Jaguar del Napo. Cacao fresco, tres saltos y el cielo todavía no se acaba.",
    color: "#c45c26",
    accent: "#f3e6d0",
    jumps: 3,
    jumpVel: -860,
    runSpeed: 300,
    gravityMul: 0.96,
  },
  {
    id: "luma",
    name: "Luma",
    title: "La Quetzal",
    power: "Planeo",
    powerHint: "En el aire mantén el salto para planear. Suelta para caer. WS también.",
    blurb: "Nació en la nube. Té de muña, plumas en las ventanas y abismos sin prisa.",
    color: "#2f7d62",
    accent: "#f3e6d0",
    jumps: 2,
    jumpVel: -700,
    runSpeed: 280,
    gravityMul: 0.9,
  },
  {
    id: "rok",
    name: "Rok",
    title: "El Guardián",
    power: "Golpe de tierra",
    powerHint: "En el aire, abajo o Poder para aplastar y romper cajas. WS trepa.",
    blurb: "Guardian de templo. Lentejas con ají, muros firmes y la tierra de su lado.",
    color: "#8a5a3c",
    accent: "#f3e6d0",
    jumps: 2,
    jumpVel: -680,
    runSpeed: 250,
    gravityMul: 1.15,
  },
  {
    id: "nix",
    name: "Nix",
    title: "La Nocturna",
    power: "Escala maestra",
    powerHint: "Pégate al muro y mantén salto para trepar. Cada hop recarga el doble salto.",
    blurb: "Camina de noche. Chocolate amargo, techos y paredes que son familia.",
    color: "#3a4a62",
    accent: "#f3e6d0",
    jumps: 2,
    jumpVel: -740,
    runSpeed: 295,
    gravityMul: 1,
  },
];

export function getCharacter(id: CharacterId): CharacterDef {
  const found = CHARACTERS.find((c) => c.id === id);
  if (found) return found;
  const fallback = CHARACTERS[0];
  if (!fallback) throw new Error("No hay héroes");
  return fallback;
}
