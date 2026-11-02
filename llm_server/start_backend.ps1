# start_backend.ps1
Write-Host "Inicializando Dolphin 3B en llama-server (Puerto: 8081, Prioridad: BelowNormal)..." -ForegroundColor Cyan

$processOptions = @{
    FilePath = ".\llama-server.exe"
    ArgumentList = "-m .\dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf -c 4096 -t 4 -ngl 0 --host 127.0.0.1 --port 8081 --flash-attn on"
    PassThru = $true
    WindowStyle = "Normal"
}

$proc = Start-Process @processOptions
# Asignacion estricta de prioridad para evitar inanicion del Middleware/UI
$proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal

Write-Host "[OK] Motor LLM activo en http://127.0.0.1:8081 (PID: $($proc.Id))" -ForegroundColor Green
