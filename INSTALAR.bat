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
echo [1/5] Instalando dependencias (npm install)...
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
echo [2/5] Preparando el archivo .env...
call node servidor\herramientas\preparar-env.js
if errorlevel 1 (
  echo [ERROR] No se pudo crear el .env.
  pause
  exit /b 1
)

rem ---------- 4. MySQL ----------
echo [3/5] Buscando MySQL...
if exist "mysql-portatil\bin\mysqld.exe" (
  tasklist /fi "imagename eq mysqld.exe" | find /i "mysqld.exe" >nul
  if errorlevel 1 (
    if not exist "mysql-portatil\data" (
      echo       Primera vez: inicializando la carpeta de datos...
      "mysql-portatil\bin\mysqld.exe" --initialize-insecure --datadir="%CD%\mysql-portatil\data"
      start "MySQL Entheos" /min "mysql-portatil\bin\mysqld.exe" --datadir="%CD%\mysql-portatil\data" --console
      timeout /t 10 /nobreak >nul
      "mysql-portatil\bin\mysql.exe" -u root -h 127.0.0.1 -P 3306 -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Kendry9922'; FLUSH PRIVILEGES;"
    ) else (
      start "MySQL Entheos" /min "mysql-portatil\bin\mysqld.exe" --datadir="%CD%\mysql-portatil\data" --console
      timeout /t 8 /nobreak >nul
    )
    echo       MySQL portatil encendido.
  ) else (
    echo       MySQL ya esta encendido; se reutiliza.
  )
) else (
  echo       No se encontro la carpeta mysql-portatil.
  echo       Se usara el MySQL instalado: debe estar encendido y con el
  echo       usuario y contrasena que figuran en el .env.
)

rem ---------- 5. Base de datos ----------
echo [4/5] Creando la base de datos y cargando los datos...
call npm run bd:crear
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo crear la base de datos.
  echo         Revisa que MySQL este encendido y que BD_USUARIO y BD_CONTRASENA
  echo         del archivo .env coincidan con el MySQL de esta PC.
  pause
  exit /b 1
)

echo [5/5] Listo.
echo.
echo Para arrancar el proyecto, ejecuta INICIAR.bat
pause