# Pruebas de punta a punta

Las pruebas unitarias (`npm test`) cubren la física y los niveles. Estas otras
abren el juego en un Chromium real con Playwright y lo juegan: sirven para lo que
pasa entre React, el bucle de pantalla y la simulación.

```bash
npm run dev                              # el juego en 127.0.0.1:8123
~/.venv/cortex/bin/python3.12 e2e/secreto_ida_y_vuelta.py   # requiere COIN='{"cx":256,"cy":608}'
~/.venv/cortex/bin/python3.12 e2e/movil_mando_tactil.py
~/.venv/cortex/bin/python3.12 e2e/produccion_saltos.py      # contra el sitio publicado
```

- `secreto_ida_y_vuelta.py`: recoge un grano en el Volcán, cruza al Risco por el
  tótem, vuelve, comprueba que el grano y el tótem siguen ahí, muere y reaparece
  en el tótem, y usa el botón «Volver a Volcán Ember» desde la victoria.
- `movil_mando_tactil.py`: pantalla de 390 px con dedo: mando visible, avisos sin
  «W», el toque en «Saltar» guarda en el tótem.
- `produccion_saltos.py`: diez pulsaciones de salto de 12 ms en el sitio publicado.
  A 120 Hz, antes salían cinco.

Las pruebas usan `window.__controlsTest` (posición, teclas inyectadas, lectores de
estado), que el juego expone a propósito para esto.

Por qué no basta la extensión de Chrome: su pestaña queda en segundo plano y el
navegador congela `requestAnimationFrame`, así que el juego parece muerto.
