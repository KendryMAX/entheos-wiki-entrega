@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Entheos Wiki - Instalacion

echo ============================================
echo   Entheos Wiki - Instalacion (solo una vez)
echo ============================================
echo.

rem ---------- 1. Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js.
  echo         Instalalo desde https://nodejs.org ^(boton LTS^) y volve a ejecutar este archivo.
  pause
  exit /b 1
)

rem ---------- 2. Dependencias ----------
echo [1/4] Instalando dependencias (npm install)...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install. Revisa la conexion a internet.
    pause
    exit /b 1
  )
) else (
  echo       Ya estan instaladas.
)

rem ---------- 3. Archivo .env ----------
echo [2/4] Preparando el archivo .env...
if not exist ".env" (
  echo       Escribi la contrasena del usuario root de tu MySQL
  echo       ^(la que pusiste al instalar MySQL^):
  set /p "CLAVE_BD=Contrasena de root de MySQL: "
  call node servidor\herramientas\preparar-env.js --clave=%CLAVE_BD%
  if errorlevel 1 (
    echo [ERROR] No se pudo crear el .env.
    pause
    exit /b 1
  )
  echo       Se creo .env con el usuario root y tu contrasena.
) else (
  echo       Ya existe .env. Si tu MySQL no usa root, revisa BD_USUARIO.
)

rem ---------- 4. Dominio local ----------
echo [3/4] Configurando el dominio entheoswiki.localhost...
for /f "delims=" %%L in ('powershell -NoProfile -ExecutionPolicy Bypass -File "servidor\herramientas\hosts.ps1"') do set "HOSTS_RES=%%L"
if "%HOSTS_RES%"=="HOSTS_OK" (
  echo       Dominio entheoswiki.localhost configurado en el archivo hosts.
) else (
  echo       No se pudo editar el archivo hosts.
  echo       Si entheoswiki.localhost no abre, ejecuta INSTALAR.bat como
  echo       administrador o agrega a mano la linea:  127.0.0.1 entheoswiki.localhost
)

rem ---------- 5. Base de datos ----------
echo [4/4] Creando la base de datos y cargando los datos...
call npm run bd:crear
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo crear la base de datos.
  echo         Revisa que MySQL este encendido y que la contrasena que
  echo         escribiste sea la del usuario root de esta PC.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   LISTO. Cuentas creadas:
echo     Kendry   / Kendry123     Administrador
echo     Angel    / Angel123      Editor
echo     Adriano  / Adriano123    Lector
echo ============================================
echo   Para arrancar: INICIAR.bat  y abrir http://entheoswiki.localhost
pause