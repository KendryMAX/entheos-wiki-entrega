@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Entheos Wiki

if not exist ".env" (
  echo Falta el archivo .env. Ejecuta primero INSTALAR.bat
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Faltan las dependencias. Ejecuta primero INSTALAR.bat
  pause
  exit /b 1
)

rem --- MySQL portatil (opcional) ---
rem Si existe la carpeta mysql-portatil\, se intenta levantar sola.
if exist "mysql-portatil\bin\mysqld.exe" (
  tasklist /fi "imagename eq mysqld.exe" | find /i "mysqld.exe" >nul
  if errorlevel 1 (
    echo Iniciando MySQL portatil...
    start "MySQL Entheos" /min "mysql-portatil\bin\mysqld.exe" --console
    timeout /t 6 /nobreak >nul
  )
)

echo.
echo Iniciando Entheos Wiki...
echo Para detenerlo: Ctrl + C
echo.
call npm run iniciar
pause
