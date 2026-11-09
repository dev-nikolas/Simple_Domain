import os
import sys
import time
from playwright.sync_api import sync_playwright

def test_routing_and_views(base_url="http://localhost:5173", output_dir="screenshots"):
    os.makedirs(output_dir, exist_ok=True)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # ----------------------------------------------------
        # TEST 1: Carga inicial en http://localhost:5173/
        # Debe PERMANECER en '/' (sin redirigir a /c/... ni /app ni /home)
        # ----------------------------------------------------
        print(f"[TEST 1] Navegando a la raíz {base_url}/...")
        page.goto(f"{base_url}/")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        initial_url = page.url
        print(f"[TEST 1] URL cargada: {initial_url}")
        
        # Comprobar que no hay redirección forzada a /c/...
        assert not "/c/" in initial_url, f"FALLO: La URL inicial redirigió indebidamente a una conversación: {initial_url}"
        assert not "/app" in initial_url, f"FALLO: La URL contiene /app: {initial_url}"
        assert not "/home" in initial_url, f"FALLO: La URL contiene /home: {initial_url}"
        assert initial_url.rstrip("/") == base_url.rstrip("/"), f"FALLO: Se esperaba raíz limpia {base_url}/ pero se obtuvo {initial_url}"

        # Comprobar vista Home limpia
        welcome_title = page.locator("text=¿Por dónde empezamos?")
        assert welcome_title.is_visible(), "FALLO: No se muestra la pantalla de bienvenida inicial!"
        page.screenshot(path=os.path.join(output_dir, "11_root_clean_home.png"))
        print("[PASS 1] Inicio limpio en la raíz sin redirección forzada.")
        results.append("Inicio en raíz (5173/) sin auto-redirección: PASS")

        # ----------------------------------------------------
        # TEST 2: Clic en tile de acción rápida inicia sesión y navega a /c/:id
        # ----------------------------------------------------
        print("[TEST 2] Clic en tile sugerido para iniciar nueva conversación...")
        tile_btn = page.locator("button:has-text('Crea un script en PowerShell')").first
        assert tile_btn.is_visible(), "FALLO: El botón de tile sugerido no es visible!"
        tile_btn.click()
        time.sleep(1.5)

        post_prompt_url = page.url
        print(f"[TEST 2] URL tras iniciar chat: {post_prompt_url}")
        assert "/c/" in post_prompt_url, f"FALLO: No navegó a /c/:id tras enviar prompt! ({post_prompt_url})"
        created_conv_id = post_prompt_url.split("/c/")[1].split("/")[0]
        page.screenshot(path=os.path.join(output_dir, "12_chat_session_created.png"))
        print(f"[PASS 2] Sesión {created_conv_id} creada y enrutada a /c/{created_conv_id}.")
        results.append(f"Creación de sesión y transición a /c/{created_conv_id}: PASS")

        # ----------------------------------------------------
        # TEST 3: Clic en '+ NUEVO CHAT' en el Sidebar debe regresar a '/'
        # ----------------------------------------------------
        print("[TEST 3] Abriendo Sidebar para pulsar NUEVO CHAT...")
        page.locator("header button[aria-label='Abrir panel lateral']").first.click()
        time.sleep(0.5)

        page.locator("aside button:has-text('NUEVO CHAT')").click()
        time.sleep(1)

        new_chat_url = page.url
        print(f"[TEST 3] URL tras pulsar NUEVO CHAT: {new_chat_url}")
        assert new_chat_url.rstrip("/") == base_url.rstrip("/"), f"FALLO: NUEVO CHAT no regresó a la raíz! ({new_chat_url})"
        assert page.locator("text=¿Por dónde empezamos?").is_visible(), "FALLO: No regresó a la vista Home limpia!"
        page.screenshot(path=os.path.join(output_dir, "13_returned_to_clean_root.png"))
        print("[PASS 3] 'NUEVO CHAT' regresa limpiamente a la raíz '/'.")
        results.append("NUEVO CHAT regresa a la raíz limpia (5173/): PASS")

        # ----------------------------------------------------
        # TEST 4: Navegación a /memory-episodic y regreso a '/'
        # ----------------------------------------------------
        print("[TEST 4] Abriendo Sidebar para ir a Memoria Episódica...")
        page.locator("header button[aria-label='Abrir panel lateral']").first.click()
        time.sleep(0.5)

        page.locator("aside button:has-text('MEMORIA EPISÓDICA')").click()
        time.sleep(1)

        mem_url = page.url
        print(f"[TEST 4] URL Memoria: {mem_url}")
        assert "/memory-episodic" in mem_url, f"FALLO: URL no es /memory-episodic ({mem_url})"
        assert page.locator("h1:has-text('MEMORIA EPISÓDICA RELIC')").is_visible()

        page.locator("button:has-text('VOLVER')").click()
        time.sleep(1)
        assert page.url.rstrip("/") == base_url.rstrip("/"), f"FALLO: Botón VOLVER no regresó a la raíz! ({page.url})"
        print("[PASS 4] Navegación y retorno de /memory-episodic correctos.")
        results.append("Página /memory-episodic y retorno a raíz: PASS")

        context.close()
        browser.close()

        print("\n" + "="*50)
        print("TODOS LOS TESTS DE ENRUTAMIENTO PASARON:")
        for r in results:
            print(f"  ✓ {r}")
        print("="*50)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
    test_routing_and_views(url)
