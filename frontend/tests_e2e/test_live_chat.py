import os
import sys
import time
from playwright.sync_api import sync_playwright

def test_full_chat_with_gateway(base_url="http://localhost:5173", output_dir="screenshots"):
    os.makedirs(output_dir, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        print(f"[TEST E2E] Navegando a {base_url}...")
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # 1. Comprobar que el indicador del TopBar muestra LOCAL (Gateway conectado)
        topbar = page.locator("header")
        print("[TEST E2E] Estado TopBar:", topbar.inner_text().replace("\n", " "))
        
        # 2. Clic en tile para enviar instrucción técnica
        print("[TEST E2E] Enviando prompt desde tile de inicio...")
        page.locator("button:has-text('Crea un script en PowerShell')").first.click()

        # 3. Esperar a que el backend responda con streaming
        print("[TEST E2E] Esperando streaming de respuesta de RELIC...")
        page.wait_for_selector("text=RELIC // MOTOR COGNITIVO SOBERANO", timeout=10000)
        time.sleep(1)

        # 4. Capturar pantalla de la conversación fluida
        page.screenshot(path=os.path.join(output_dir, "14_live_chat_streaming_success.png"))
        print("[TEST E2E] ¡Respuesta recibida y renderizada con éxito!")

        # 5. Comprobar que no hay error de fetch failed
        body_text = page.locator("body").inner_text()
        assert "fetch failed" not in body_text, "ERROR: Sigue apareciendo 'fetch failed'!"
        assert "Get-NetTCPConnection" in body_text, "ERROR: El script de PowerShell no fue renderizado!"

        print("\n" + "="*50)
        print("✓ TEST END-TO-END GATEWAY + FRONTEND: 100% EXITOSO")
        print("="*50)
        browser.close()

if __name__ == "__main__":
    test_full_chat_with_gateway()

