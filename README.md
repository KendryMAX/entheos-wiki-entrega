# Entheos Wiki

Wiki de consulta sobre el mundo de Entheos. Proyecto final de Programación Web.

Repositorio privado: <https://github.com/KendryMAX/entheos-wiki>

## Guía de instalación

**La guía completa está en `INSTALAR-OTRA-PC.txt`** (en la raíz del proyecto).
Ese archivo tiene todos los pasos para montar y ejecutar el proyecto en otra
computadora a partir de lo subido a GitHub: requerimientos, clonar, `npm
install`, crear el `.env`, crear la base, arrancar, probar y los problemas
comunes.

Resumen mínimo:

```powershell
git clone https://github.com/KendryMAX/entheos-wiki.git
cd entheos-wiki
npm install
Copy-Item .env.example .env      # y editar el .env
npm run bd:crear
npm run dev                       # http://localhost:3000
```

## Repositorio y equipo

Repositorio **privado**. Para clonar hay que estar agregado como colaborador y
aceptar la invitación (llega al correo, o en
<https://github.com/KendryMAX/entheos-wiki/invitations>).

- Colaboradores: `KendryMAX`, `AngelDanielZ4914`, `adrianodev`.

Al trabajar en equipo: partir siempre de `main` actualizada, crear una rama por
tarea, subirla y abrir un Pull Request. No hacer `git push` directo a `main`.

## Seguridad

- `.env` (contraseñas) y `certificados/` (llave privada HTTPS) están ignorados.
  **Nunca** hacer `git add -f` sobre ellos.
- Si alguna vez se sube una contraseña por error, cámbiala de inmediato.
