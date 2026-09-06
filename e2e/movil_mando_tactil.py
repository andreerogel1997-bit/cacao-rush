from playwright.sync_api import sync_playwright
URL = "http://127.0.0.1:8123/"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("""localStorage.setItem('cacao-rush-save-v1', JSON.stringify({version:5, unlocked:12, best:Array.from({length:17},()=>0), character:'maya', muted:true, secrets:[], resume:null, host:null, assist:false, shake:1}))""")
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Jugar").click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Elegir mundo").click(); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Volcán Ember").click()
    pg.get_by_role("button", name="Correr").click(timeout=8000)
    pg.wait_for_function("() => window.__controlsTest && !document.body.innerText.includes('Cargando el mundo')", timeout=15000)
    pg.evaluate("() => window.__controlsTest.setPos(1412, 150)"); pg.wait_for_timeout(600)
    texto = pg.evaluate("() => document.body.innerText")
    print("botones en pantalla:", pg.evaluate("() => [...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0,20))"))
    print("touchUi (ancho):", pg.evaluate("() => ({w: innerWidth, coarse: matchMedia('(pointer: coarse)').matches, estado: window.__controlsTest.getStatus()})"))
    print("mando táctil visible:", pg.get_by_role("button", name="Saltar").count() > 0)
    print("veces que aparece el aviso del tótem:", texto.count("Salto — guardar"))
    print("¿queda alguna 'W —' en pantalla?:", "W —" in texto)
    # pulsa Salto con el dedo y comprueba que guarda
    salto = pg.get_by_role("button", name="Saltar")
    box = salto.bounding_box()
    # Un dedo de verdad: toca, mantiene un poco y suelta.
    pg.touchscreen.tap(box["x"] + box["width"]/2, box["y"] + box["height"]/2); pg.wait_for_timeout(500)
    print("spawnX tras tocar Salto en el tótem:", pg.evaluate("() => window.__controlsTest.getSpawnX()"))
    pg.screenshot(path="/Users/andree/.claude/jobs/ab62c1c5/tmp/movil.png")
    print("errores:", errs or "ninguno")
    b.close()
