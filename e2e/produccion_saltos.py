from playwright.sync_api import sync_playwright
URL = "https://andreerogel1997-bit.github.io/cacao-rush/"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 800})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL, wait_until="networkidle"); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.clear()"); pg.reload(wait_until="networkidle")
    pg.get_by_role("button", name="Jugar").click(); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Elegir mundo").click(); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Selva Dulce").click()
    pg.get_by_role("button", name="Correr").click(timeout=10000)
    pg.wait_for_function("() => window.__controlsTest && !document.body.innerText.includes('Cargando el mundo')", timeout=20000)
    pg.wait_for_timeout(800)
    C = lambda e: pg.evaluate(f"() => window.__controlsTest.{e}")
    # diez pulsaciones cortas de salto: ¿cuántas salen?
    saltos = 0
    for i in range(10):
        pg.wait_for_function("() => Math.abs(window.__controlsTest.getVy()) < 1 && window.__controlsTest.getH() === 42", timeout=5000)
        pg.keyboard.down("Space"); pg.wait_for_timeout(12); pg.keyboard.up("Space"); pg.wait_for_timeout(80)
        if C("getVy()") < -200: saltos += 1
        pg.wait_for_timeout(700)
    print("saltos que salieron de 10 pulsaciones de 12 ms:", saltos)
    print("mundo:", C("getWorld()"), "| vidas:", C("getLives()"), "| estado:", C("getStatus()"))
    print("errores en producción:", errs or "ninguno")
    b.close()
