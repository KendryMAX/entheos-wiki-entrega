# Agrega el dominio local entheoswiki.localhost al archivo hosts de Windows.
# Lo usa INSTALAR.bat. Imprime HOSTS_OK si quedo configurado (o ya estaba),
# o HOSTS_FALLO si no tiene permiso para editarlo.
#
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File "servidor\herramientas\hosts.ps1"

$dominio = 'entheoswiki.localhost'
$rutaHosts = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'

try {
    $yaEsta = Select-String -LiteralPath $rutaHosts -Pattern ([regex]::Escape($dominio)) -Quiet
    if (-not $yaEsta) {
        Add-Content -LiteralPath $rutaHosts -Value "127.0.0.1`t$dominio" -ErrorAction Stop
    }
    'HOSTS_OK'
} catch {
    'HOSTS_FALLO'
}