import json, os, sys, time
from playwright.sync_api import sync_playwright

COIN = json.loads(os.environ["COIN"])
URL = "http://127.0.0.1:8123/"
log = []
def say(*a): log.append(" ".join(str(x) for x in a)); print(*a, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 800})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.evaluate("""localStorage.setItem('cacao-rush-save-v1', JSON.stringify({version:5, unlocked:12, best:Array.from({length:17},()=>0), character:'maya', muted:true, secrets:[], resume:null, host:null, assist:false, shake:1}))""")
    pg.reload(); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Jugar").click(); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Elegir mundo").click(); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Volcán Ember").click()
    pg.get_by_role("button", name="Correr").click(timeout=8000)
    pg.wait_for_function("() => window.__controlsTest && !document.body.innerText.includes('Cargando el mundo')", timeout=15000)
    pg.wait_for_timeout(300)
    C = lambda expr: pg.evaluate(f"() => window.__controlsTest.{expr}")

    def pulsa_en_totem(etiqueta):
        pg.wait_for_function("() => { const c = window.__controlsTest; return c.getAtPole() && Math.abs(c.getVy()) < 1; }", timeout=6000)
        # Sin GPU el lienzo va a pocos fotogramas por segundo: la pulsación tiene que durar
        # lo bastante para que el bucle la vea al menos una vez.
        pg.evaluate("() => window.__controlsTest.setKeys(['Space'])"); pg.wait_for_timeout(420)
        pg.evaluate("() => window.__controlsTest.setKeys([])"); pg.wait_for_timeout(250)
        say(f"  [{etiqueta}] warp:", repr(C("getWarp()")), "| atPole:", C("getAtPole()"), "| spawnX:", C("getSpawnX()"), "| y:", round(C("getY()")))
        pg.wait_for_timeout(700)
    fps = pg.evaluate("() => new Promise(res => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); }; requestAnimationFrame(tick); })")
    say("fps en headless:", fps, "| mundo:", C("getWorld()"), "| vidas:", C("getLives()"))

    # 1) recoge un grano
    pg.evaluate(f"() => window.__controlsTest.setPos({COIN['cx']-13}, {COIN['cy']-20})"); pg.wait_for_timeout(900)
    coins_antes = C("getCoins()")
    say("granos tras recoger uno:", coins_antes)

    # 2) al tótem secreto (1408,120,36x72): pies en 192
    pg.evaluate("() => window.__controlsTest.setPos(1412, 150)"); pg.wait_for_timeout(500)
    say("en el tótem:", C("getAtPole()"))
    pulsa_en_totem("guardar en el tótem secreto")
    pulsa_en_totem("abrir el camino")
    pg.wait_for_function("() => window.__controlsTest && window.__controlsTest.getWorld() === 'risco'", timeout=10000)
    pg.get_by_role("button", name="Correr").click(timeout=8000)
    pg.wait_for_function("() => !document.body.innerText.includes('Cargando el mundo')", timeout=15000)
    pg.wait_for_timeout(400)
    say("→ en el secreto:", C("getWorld()"), "| granos aquí:", C("getCoins()"), "| vidas:", C("getLives()"))
    host = pg.evaluate("() => JSON.parse(localStorage.getItem('cacao-rush-save-v1')).host")
    say("host guardado:", json.dumps({k: host.get(k) for k in ('world','levelIndex','coins','poleIndex','lives')}) if host else None)

    # 3) vuelve por el tótem de regreso (128,1176,36x72): pies en 1248
    pg.evaluate("() => window.__controlsTest.setPos(132, 1206)"); pg.wait_for_timeout(500)
    say("en el tótem de vuelta:", C("getAtPole()"))
    pulsa_en_totem("guardar en el tótem de vuelta")
    pulsa_en_totem("volver")
    pg.wait_for_function("() => window.__controlsTest && window.__controlsTest.getWorld() === 'volcan'", timeout=10000)
    pg.wait_for_function("() => !document.body.innerText.includes('Cargando el mundo')", timeout=15000)
    pg.wait_for_timeout(500)
    say("← de vuelta:", C("getWorld()"), "| granos:", C("getCoins()"), "(esperados", coins_antes, ") | spawnX:", C("getSpawnX()"), "(esperado ~1412) | x:", round(C("getX()")))
    ok_vuelta = C("getCoins()") == coins_antes and abs(C("getSpawnX()") - 1412) < 8
    host2 = pg.evaluate("() => JSON.parse(localStorage.getItem('cacao-rush-save-v1')).host")
    say("host limpiado tras volver:", host2 is None)

    # 4) morir tras volver: ¿reaparece en el tótem?
    pg.evaluate("() => window.__controlsTest.setPos(1412, 3000)"); pg.wait_for_timeout(1600)
    say("tras caer al vacío: vidas", C("getLives()"), "| x:", round(C("getX()")), "(reaparece en el tótem si ≈1412)")

    # 5) victoria en el secreto → botón Volver
    pg.evaluate("() => window.__controlsTest.setPos(1412, 150)"); pg.wait_for_timeout(400)
    # El tótem ya está encendido tras la vuelta: una sola pulsación abre el camino.
    pulsa_en_totem("abrir otra vez")
    pg.wait_for_function("() => window.__controlsTest && window.__controlsTest.getWorld() === 'risco'", timeout=10000)
    pg.get_by_role("button", name="Correr").click(timeout=8000)
    pg.wait_for_function("() => !document.body.innerText.includes('Cargando el mundo')", timeout=15000)
    pg.evaluate("() => window.__controlsTest.setPos(2250, 100)"); pg.wait_for_timeout(1200)
    say("estado en la meta del secreto:", C("getStatus()"))
    btn = pg.get_by_role("button", name="Volver a Volcán Ember")
    say("botón 'Volver a Volcán Ember' visible:", btn.count() > 0)
    btn.click(timeout=5000)
    pg.wait_for_function("() => window.__controlsTest && window.__controlsTest.getWorld() === 'volcan'", timeout=10000)
    pg.wait_for_timeout(600)
    say("← tras Volver desde la victoria:", C("getWorld()"), "| granos:", C("getCoins()"), "| spawnX:", C("getSpawnX()"))
    pg.screenshot(path="/Users/andree/.claude/jobs/ab62c1c5/tmp/e2e_vuelta.png")
    say("errores de consola:", errs[:5] if errs else "ninguno")
    say("RESULTADO:", "OK" if ok_vuelta and not errs else "REVISAR")
    b.close()
