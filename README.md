# Cacao Rush

Plataformas 2D ambientado en Ecuador. Cinco héroes, doce mundos de campaña y cinco
mundos secretos: selva, ruinas, río de chocolate, volcán, templo, Chimborazo, cueva,
Los Túneles de Isabela, Amazonía, páramo, Centro Histórico de Quito y el Museo del Oro.

Origen: prototipo generado en la plataforma Grok (`XfW64Kv9pikcN576-grok-workspace.zip`,
5 de septiembre de 2026), rescatado y reconstruido como proyecto propio.

## Arrancar

```bash
npm install     # instala en ~/.cortex-local/games/cacao-rush/node_modules
npm run dev     # http://localhost:8080
```

## Dónde vive cada cosa

| Ruta | Qué es |
|---|---|
| `src/game/` | El juego: simulación, render, niveles, audio, guardado, personajes |
| `src/components/game/` | La capa React: bucle, HUD, pantallas |
| `public/game/` | Assets servidos: mapas, sprites, voces |
| `_masters/` | Fuentes originales del arte (352 MB). **Fuera de git y del build** |
| `docs/origen-grok/` | Contrato y referencias de la plataforma de origen |

## Decisiones de infraestructura

Este proyecto vive dentro de Google Drive, así que dos cosas se sacan de ahí a
propósito:

- **`.git` está en `~/.cortex-local/games/cacao-rush.git`** (repo con
  `--separate-git-dir`). El sync de Drive corrompe `.git/objects`.
- **`node_modules` es un enlace** a `~/.cortex-local/games/cacao-rush/node_modules`.
  Decenas de miles de archivos sincronizándose clavan `fileproviderd`.

El archivo `.git` que ves en la raíz es un puntero de una línea, no un directorio.

## Controles

Mover con flechas o WASD. Saltar con W, arriba o espacio; doble salto en el aire.
Bajar para arrastrarse; en un borde, abajo + dirección cuelga y permite avanzar de
lado. Abajo + arriba escala muros. Poder del héroe: J, K, F o Shift. Pausa con Escape
o P. Reiniciar con R. Mando estándar soportado.

Cada héroe tiene su poder: Maya hace dash y bucea 14 s, Teko salta tres veces, Luma
planea, Rok golpea el suelo y rompe cajas, Nix trepa paredes.
