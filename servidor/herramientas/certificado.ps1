$ErrorActionPreference = 'Stop'

# Este script vive en servidor/herramientas/, pero el certificado va en la raiz
# del proyecto (certificados/), que es donde lo busca el .env.
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $raiz

$carpeta = Join-Path $raiz 'certificados'
New-Item -ItemType Directory -Path $carpeta -Force | Out-Null

Write-Host ""
Write-Host "Generando el certificado local de Entheos Wiki"
Write-Host "-------------------------------------------"
Write-Host ""

$bytes = New-Object byte[] 24
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$clave = -join ($bytes | ForEach-Object { $_.ToString('x2') })

$vistos = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object { $_.Subject -eq 'CN=entheoswiki.local' }

foreach ($c in $vistos) {
    $t = $c.Thumbprint
    Remove-Item "Cert:\CurrentUser\Root\$t" -Force -ErrorAction SilentlyContinue
    Remove-Item "Cert:\CurrentUser\My\$t" -Force -ErrorAction SilentlyContinue
}

Write-Host "1 de 4. Creando el certificado..."

$cert = New-SelfSignedCertificate `
    -Subject 'CN=entheoswiki.local' `
    -DnsName @('entheoswiki.local', 'localhost') `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -NotAfter (Get-Date).AddYears(5) `
    -KeyExportPolicy Exportable `
    -Type SSLServerAuthentication

Write-Host "2 de 4. Exportando el PFX..."

$segura = ConvertTo-SecureString -String $clave -AsPlainText -Force
$pfx = Join-Path $carpeta 'entheoswiki.pfx'
$cer = Join-Path $carpeta 'entheoswiki.cer'

Export-PfxCertificate -Cert $cert -FilePath $pfx -Password $segura | Out-Null
Export-Certificate -Cert $cert -FilePath $cer | Out-Null

Write-Host "3 de 4. Guardando la clave..."

[System.IO.File]::WriteAllText(
    (Join-Path $carpeta 'clave.txt'),
    $clave,
    (New-Object System.Text.UTF8Encoding $false)
)

Write-Host "4 de 4. Instalando el certificado como confiable..."

Import-Certificate -FilePath $cer -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null

$dominio = 'entheoswiki.local'
$rutaHosts = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$yaEsta = Select-String -LiteralPath $rutaHosts -Pattern ([regex]::Escape($dominio)) -Quiet

if ($yaEsta) {
    Write-Host "   El dominio ya estaba en el archivo hosts."
} else {
    Write-Host ""
    Write-Host "ATENCION: falta agregar el dominio al archivo hosts."
    Write-Host "Abrir PowerShell como Administrador y ejecutar:"
    Write-Host ""
    Write-Host ('  Add-Content -LiteralPath "' + $rutaHosts + '" -Value "127.0.0.1 ' + $dominio + '"')
    Write-Host "  ipconfig /flushdns"
    Write-Host ""
}

Write-Host ""
Write-Host "LISTO. Ahora pegar esta clave en el archivo .env:"
Write-Host ""
Write-Host "  HTTPS_PFX=certificados/entheoswiki.pfx"
Write-Host ("  HTTPS_CLAVE=" + $clave)
Write-Host ""
Write-Host "Despues: npm run dev  y abrir https://$dominio"
Start-Sleep -Seconds 4