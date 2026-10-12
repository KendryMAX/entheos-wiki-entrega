@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Entheos Wiki - Instalacion

echo ============================================
echo   Entheos Wiki - Instalacion (solo una vez)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js.
  echo         Instalalo desde https://nodejs.org y volve a ejecutar este archivo.
  pause
  exit /b 1
)

echo [1/4] Instalando dependencias (npm install)...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install.
    pause
    exit /b 1
  )
) else (
  echo       Ya estan instaladas.
)

echo [2/4] Preparando el archivo .env...
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo       Se creo .env a partir de .env.example.
  echo       Completa BD_CONTRASENA y SESION_SECRETO. Se abrira el Bloc de notas.
  notepad ".env"
) else (
  echo       Ya existe .env.
)

echo [3/4] Creando la base de datos y cargando los datos...
call npm run bd:crear
if errorlevel 1 (
  echo [ERROR] No se pudo crear la base.
  echo         Revisa que MySQL este encendido y que la contrasena del .env sea correcta.
  pause
  exit /b 1
)

echo [4/4] Listo.
echo.
echo Para arrancar el proyecto, ejecuta INICIAR.bat
pause
