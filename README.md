# Entheos Wiki

Wiki de consulta sobre el mundo de **Entheos**: continentes, regiones, ciudades, razas, personajes, objetos, facciones y lenguas. Es un proyecto full-stack renderizado en el servidor con **Node.js + Express + EJS** y **MySQL**, con autenticación por sesiones, roles (Lector / Editor / Administrador), moderación de comentarios, un chat de comunidad y generación de reportes en PDF.

---

## Inicio rápido en Windows

El proyecto se abre en **<http://entheoswiki.localhost>** y se instala con dos
archivos de la raíz: **no hace falta escribir comandos ni editar el `.env` a
mano.**

### Requisitos (solo esto)

1. **Node.js 20 o superior** — el instalador **LTS** desde <https://nodejs.org>,
   con las opciones por defecto.
2. **MySQL 8 instalado** — cualquier instalación de MySQL
   (<https://dev.mysql.com/downloads/installer/>). Durante la instalación de
   MySQL se elige una contraseña para el usuario `root`: esa es la que vas a
   escribir en el paso 2.

### Pasos

1. **Descargar/clonar el proyecto** (el repositorio es privado: hay que estar
   agregado como colaborador).

   ```powershell
   git clone https://github.com/KendryMAX/entheos-wiki.git
   cd entheos-wiki
   ```

2. **Doble clic en `INSTALAR.bat`** — se ejecuta **una sola vez**. El instalador:
   - instala las librerías (`npm install`);
   - te pide la **contraseña de `root` de tu MySQL** y crea el `.env` solo
     (con esa contraseña y un secreto de sesión aleatorio);
   - agrega el dominio `entheoswiki.localhost` al archivo `hosts` de Windows
     (si no tiene permiso, lo avisa);
   - crea la base de datos con el esquema (32 tablas), los datos iniciales y
     las 3 cuentas del equipo.

3. **Doble clic en `INICIAR.bat`** — cada vez que se quiera usar el proyecto.
   Enciende el servidor.

4. Abrir **<http://entheoswiki.localhost>** en el navegador.

> Se apaga con `Ctrl + C` en la ventana de `INICIAR.bat`. El puerto por defecto
> es `80` (se cambia con `PUERTO` en `.env`).

### Cuentas creadas por la instalación

| Usuario | Contraseña | Rol           |
| ------- | ---------- | ------------- |
| Kendry  | Kendry123  | Administrador |
| Angel   | Angel123   | Editor        |
| Adriano | Adriano123 | Lector        |

### Si la base no se pudo crear

`INSTALAR.bat` termina en `[ERROR] No se pudo crear la base de datos`. Es casi
siempre la contraseña del MySQL o el servicio apagado:

- Verificar que el servicio de MySQL esté **encendido** (en PowerShell:
  `Get-Service | Where-Object { $_.Name -like 'MySQL*' }`).
- Volver a ejecutar `INSTALAR.bat` escribiendo la contraseña correcta de
  `root`.
- Si hace falta cambiarla después: editar `BD_CONTRASENA` en `.env` y volver a
  correr `npm run bd:crear`.

### Dominio local (`entheoswiki.localhost`)

`INSTALAR.bat` agrega la línea `127.0.0.1 entheoswiki.localhost` al archivo
`hosts` de Windows cuando tiene permiso. Si no pudo, abrir **PowerShell como
administrador** y ejecutar:

```powershell
Add-Content -LiteralPath "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 entheoswiki.localhost"
ipconfig /flushdns
```

Los navegadores modernos ya resuelven `*.localhost` a la propia PC; la línea en
`hosts` solo hace falta si no abre.

---

## Configuración (`.env`)

El `.env` guarda las contraseñas y **no viaja en el repositorio** (está en
`.gitignore`). `INSTALAR.bat` lo crea solo. Principales variables:

| Variable          | Qué es                                   | Valor típico                          |
| ----------------- | ---------------------------------------- | ------------------------------------- |
| `BD_USUARIO`      | Usuario de MySQL                         | `root`                                |
| `BD_CONTRASENA`   | Contraseña de MySQL                      | la que pusiste al instalar MySQL      |
| `BD_HOST`/`BD_PUERTO`/`BD_NOMBRE` | Servidor, puerto y base | `127.0.0.1` / `3306` / `entheos` |
| `PUERTO`          | Puerto HTTP                              | `80`                                  |
| `SESION_SECRETO`  | Secreto de sesión (lo genera el instalador) | valor aleatorio largo              |
| `EDGE`            | Ruta de `msedge.exe` para los PDF        | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| `GMAIL_USUARIO`/`GMAIL_CONTRASENA`/`GMAIL_DESDE` | Correo de salida (opcional) | ejemplo en `.env.example` |
| `HTTPS_PFX`/`HTTPS_CLAVE` | Certificado HTTPS local (opcional) | `certificados/entheoswiki.pfx` |

---

## Stack Tecnológico

### Servidor

- **Node.js 20+**
- **Express 5** — framework web
- **EJS 6** — motor de plantillas (renderizado en el servidor)
- **MySQL 8** — base de datos relacional (driver `mysql2`)
- **express-session** — sesiones
- **bcryptjs** — hashing de contraseñas
- **helmet** + **express-rate-limit** — seguridad y límite de intentos
- **marked** + **sanitize-html** — Markdown a HTML seguro
- **puppeteer-core** + **Microsoft Edge** — generación de PDF
- **nodemailer** — envío de correo (opcional)
- **dotenv** — variables de entorno

### Cliente

- **HTML + CSS** (diseño propio, `web/estilos/estilos.css`)
- **JavaScript vanilla** (`web/scripts/aplicacion.js`): menú radial, autocompletado, validación de formularios y contadores

---

## Estructura del proyecto

```
.
├── base-de-datos/
│   ├── base-de-datos.sql         # Esquema (32 tablas) + datos iniciales
│   └── Reportes/                 # Consultas SQL de los reportes
├── servidor/
│   ├── index.js                  # Punto de entrada (HTTP/HTTPS)
│   ├── aplicacion.js             # Arma Express: seguridad, sesión y rutas
│   ├── configuracion.js          # Lee las variables del .env
│   ├── capas/                    # Sesión, roles y manejo de errores
│   ├── datos/base.js             # Conexión y consultas a MySQL
│   ├── rutas/                    # Una ruta por página del sitio
│   ├── servicios/                # Markdown, PDF, correo y tablas de contenido
│   ├── plantillas/               # Vistas EJS (páginas, parciales y panel)
│   ├── herramientas/             # Scripts de consola (base, admin, certificado…)
│   └── pruebas/                  # Pruebas automáticas
├── web/                          # Archivos públicos: estilos, scripts e imágenes
├── INSTALAR.bat                  # Instalación (una sola vez)
├── INICIAR.bat                   # Arranque (cada vez)
├── .env.example                  # Plantilla de configuración
└── package.json                  # Dependencias y comandos
```

---

## Funcionalidades

- Portada con las categorías y el buscador.
- Listado de artículos con artículos recientes, filtros por categoría y paginación.
- Ficha de artículo en Markdown, con índice, ficha lateral y relacionadas.
- **Comunidad**: chat donde los usuarios dejan mensajes y se listan los miembros.
- Comentarios moderados por el Editor.
- Roles: **Lector**, **Editor** y **Administrador**.
- Panel de gestión: artículos, revisión, comentarios y usuarios.
- Reportes exportables a PDF.
- Diseño responsivo en español.

---

## Repositorio y equipo

Repositorio **privado**: <https://github.com/KendryMAX/entheos-wiki>. Para clonar
hay que estar agregado como colaborador y aceptar la invitación (llega al correo
o se acepta en <https://github.com/KendryMAX/entheos-wiki/invitations>).

- Colaboradores: `KendryMAX`, `AngelDanielZ4914`, `adrianodev`.

---

## Notas

- **Imágenes repetidas:** varias fichas comparten la misma ilustración o reutilizan
  la de otro artículo. El material gráfico disponible es limitado y se fue
  reaprovechando —por distintas razones (arte todavía en producción, priorizar
  que ninguna ficha quede sin imagen, personajes o lugares que aún no tienen
  arte propio)—; es algo intencional por ahora, no un error.
- El servidor usa HTTP por defecto en `http://entheoswiki.localhost`. Para
  HTTPS local (`https://entheoswiki.localhost`) hay que generar el certificado:
  `powershell -ExecutionPolicy Bypass -File ".\servidor\herramientas\certificado.ps1"`
  y pegar la clave en `HTTPS_CLAVE` del `.env` (ver `INSTALAR-OTRA-PC.txt`, paso 7).
- La guía detallada de instalación está en **`INSTALAR-OTRA-PC.txt`**.
- No se suben al repositorio: `.env`, `certificados/`, `node_modules/`,
  `web/subidas/` y `pdf-generados/`. **Nunca** hacer `git add -f` sobre ellos.
- Si una contraseña se sube por error, cambiarla de inmediato. Las cuentas de
  prueba traen contraseñas temporales: cambiarlas antes de entregar.

---

## ⚠️ Estado de la entrega

Esta versión (rama `desarrollo/razas-colapsable`) es la **entrega final del proyecto** para la fecha límite. El desarrollo **continúa activamente** en el repositorio privado del equipo. La versión definitiva incorporará **cambios** posteriores.

Para seguir el desarrollo futuro, consultar el repositorio privado del equipo.