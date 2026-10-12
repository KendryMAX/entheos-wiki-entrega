# Entheos Wiki

Wiki de consulta sobre el mundo de **Entheos**: continentes, regiones, ciudades, razas, personajes, objetos, facciones y lenguas. Es un proyecto full-stack renderizado en el servidor con **Node.js + Express + EJS** y **MySQL**, con autenticación por sesiones, roles (Lector / Editor / Administrador), moderación de comentarios, un chat de comunidad y generación de reportes en PDF.

---

## Inicio rápido en Windows (recomendado)

La forma normal de instalar y arrancar el proyecto son los dos archivos de la
raíz. **No hace falta escribir comandos ni editar el `.env` a mano.**

### Requisitos

1. **Node.js 20 o superior** (descargar el instalador **LTS** de <https://nodejs.org> e instalarlo con las opciones por defecto).
2. **MySQL 8**. Dos opciones:
   - Una **carpeta `mysql-portatil\`** con un MySQL ya armado por el equipo
     (usuario `root`, contraseña `Kendry9922`). Los `.bat` la levantan solos.
   - O un MySQL 8 **instalado** en la PC (cualquier instalación sirve; luego
     hay que poner su usuario y contraseña en el `.env`).

### Pasos

1. **Descargar/clonar el proyecto** (el repositorio es privado: hay que estar
   agregado como colaborador).

   ```powershell
   git clone https://github.com/KendryMAX/entheos-wiki.git
   cd entheos-wiki
   ```

2. **Doble clic en `INSTALAR.bat`** — se ejecuta **una sola vez**. Instala las
   dependencias, crea el `.env` (con un secreto de sesión aleatorio), levanta el
   MySQL portátil si existe y arma la base de datos con los datos iniciales.

3. **Doble clic en `INICIAR.bat`** — cada vez que se quiera usar el proyecto.
   Enciende el servidor.

4. Abrir **<http://localhost:3000>** en el navegador.

> Se puede cerrar la ventana de `INICIAR.bat` o usar `Ctrl + C` para apagar el
> servidor. El puerto por defecto es `3000` (se cambia con `PUERTO` en `.env`).

### Si la base no se pudo crear

`INSTALAR.bat` termina en `[ERROR] No se pudo crear la base de datos`. Es casi
siempre la contraseña del MySQL:

- Si usás la carpeta `mysql-portatil\`: el `.env` ya trae las credenciales
  correctas; avisá al equipo si el error persiste.
- Si tenés MySQL instalado: abrí `.env` con el Bloc de notas y cambiá las
  líneas `BD_USUARIO` y `BD_CONTRASENA` por las de tu MySQL, y volvé a ejecutar
  `INSTALAR.bat`.

---

## Instalación manual (alternativa)

Para quien prefiera hacerlo por consola en vez de usar los `.bat`:

```powershell
# 1. Instalar las librerías
npm install

# 2. Crear el .env a partir de la plantilla
Copy-Item .env.example .env
# y editar .env: BD_USUARIO / BD_CONTRASENA de tu MySQL.
# SESION_SECRETO se puede generar con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Crear la base, el esquema y los datos iniciales
npm run bd:crear

# 4. Levantar el servidor (con recarga automática)
npm run dev
```

El proyecto queda en `http://localhost:3000` (o el `PUERTO` del `.env`). Para
apagarlo: `Ctrl + C`. Sin recarga automática: `npm run iniciar`.

> Por defecto el `.env` espera `root / Kendry9922` (la configuración del MySQL
> portátil). Si preferís un usuario dedicado de MySQL:

> ```sql
> CREATE USER 'entheos'@'localhost' IDENTIFIED BY 'LaClaveQueElijas123';
> GRANT ALL PRIVILEGES ON entheos.* TO 'entheos'@'localhost';
> FLUSH PRIVILEGES;
> ```

> y poner ese usuario/contraseña en el `.env`.

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
│   ├── aplicacion.js             # Express: middleware y montaje de rutas
│   ├── configuracion.js          # Lectura del .env
│   ├── capas/                    # Autenticación y manejo de errores
│   ├── datos/base.js             # Conexión y consultas a MySQL
│   ├── rutas/                    # inicio, articulos, comunidad, cuenta, panel, reportes
│   ├── servicios/                # contenido, tablas de raza, secciones, PDF, correo
│   ├── plantillas/               # Vistas EJS (parciales/, panel/, errores/)
│   ├── herramientas/             # crear-base, preparar-env, crear-admin, importar, exportar
│   └── pruebas/smoke.test.js     # Pruebas automáticas (node:test)
├── web/                          # Archivos públicos
│   ├── estilos/estilos.css
│   ├── scripts/aplicacion.js
│   ├── imagenes/
│   ├── fuentes/
│   └── subidas/                  # Imágenes subidas (no va al repo)
├── INSTALAR.bat                  # Instalación (una sola vez) ★ camino principal
├── INICIAR.bat                   # Arranque (cada vez) ★ camino principal
├── .env.example                  # Plantilla de configuración
└── package.json
```

---

## Comandos útiles

```powershell
npm install          # Descarga las librerías
npm run dev          # Servidor con recarga automática (nodemon)
npm run iniciar      # Servidor normal
npm run prueba       # Pruebas automáticas (deben dar 10/10)
npm run bd:crear     # Crea la base y carga esquema + datos
npm run bd:reiniciar # Borra la base y la recrea desde cero
npm run admin        # Alta de cuentas, cambio de contraseña y de rol
npm run exportar     # Exporta artículos y reportes a PDF
npm run importar     # Importa el vault de Obsidian (herramienta interna)
npm run formato      # Formatea el código con Prettier
```

---

## Funcionalidades

- Portada con las categorías y los últimos artículos.
- Listado de artículos con filtros por categoría y paginación.
- Ficha de artículo en Markdown, con índice, ficha lateral y relacionadas.
- **Fichas de raza** con tablas que se generan a partir de las relaciones
  `raza_localidad` (Población actual) y `raza_religion` (Religiones).
- **Comunidad**: chat donde los usuarios dejan mensajes y se listan los miembros.
- Comentarios moderados por el Editor.
- Roles: **Lector**, **Editor** y **Administrador**.
- Panel de gestión: artículos, revisión, comentarios y usuarios.
- Reportes exportables a PDF.
- Diseño responsivo en español.

---

## Cuentas de prueba

Creadas por `INSTALAR.bat` / `npm run bd:crear`:

| Usuario | Contraseña | Rol           |
| ------- | ---------- | ------------- |
| Kendry  | Kendry123  | Administrador |
| Angel   | Angel123   | Editor        |
| Adriano | Adriano123 | Lector        |

> Son contraseñas de prueba: **cambiarlas antes de entregar**.

---

## Repositorio y equipo

Repositorio **privado**: <https://github.com/KendryMAX/entheos-wiki>. Para clonar
hay que estar agregado como colaborador y aceptar la invitación (llega al correo
o se acepta en <https://github.com/KendryMAX/entheos-wiki/invitations>).

- Colaboradores: `KendryMAX`, `AngelDanielZ4914`, `adrianodev`.

Al trabajar en equipo: partir siempre de `main` actualizada, crear una rama por
tarea, subirla y abrir un Pull Request. No hacer `git push` directo a `main`.

## Notas

- El servidor usa HTTP por defecto. Para HTTPS local (`https://entheoswiki.local`)
  hay que agregar una línea en el archivo `hosts` y generar un certificado; ver
  `INSTALAR-OTRA-PC.txt`, paso 7.
- La guía detallada de instalación paso a paso está en
  **`INSTALAR-OTRA-PC.txt`**.
- No se suben al repositorio: `.env`, `certificados/`, `node_modules/`,
  `web/subidas/`, `pdf-generados/` y `mysql-portatil/`. **Nunca** hacer
  `git add -f` sobre ellos.
- Si una contraseña se sube por error, cambiarla de inmediato. Las cuentas de
  prueba traen contraseñas temporales: cambiarlas antes de entregar.