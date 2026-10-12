# Entheos Wiki

Wiki de consulta sobre el mundo de **Entheos**: continentes, regiones, ciudades, razas, personajes, objetos, facciones y lenguas. Es un proyecto full-stack renderizado en el servidor con **Node.js + Express + EJS** y **MySQL**, con autenticación por sesiones, roles (Lector / Editor / Administrador), moderación de comentarios, un chat de comunidad y generación de reportes en PDF.

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
│   ├── base-de-datos.sql         # Esquema (33 tablas) + datos iniciales
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
│   ├── herramientas/             # crear-base, crear-admin, importar, exportar
│   └── pruebas/smoke.test.js     # Pruebas automáticas (node:test)
├── web/                          # Archivos públicos
│   ├── estilos/estilos.css
│   ├── scripts/aplicacion.js
│   ├── imagenes/
│   ├── fuentes/
│   └── subidas/                  # Imágenes subidas (no va al repo)
├── .env.example                  # Plantilla de configuración
├── INSTALAR-OTRA-PC.txt          # Guía paso a paso para otra PC
└── package.json
```

---

## Requisitos previos

- **Windows 10/11**
- **Node.js 20 o superior** y **npm**
- **MySQL 8** (o MariaDB compatible) corriendo localmente
- **Microsoft Edge** (se usa para generar los PDF)
- **Git** (opcional, para clonar)

---

## Configuración

### 1. Clonar el repositorio

```powershell
git clone https://github.com/KendryMAX/entheos-wiki.git
cd entheos-wiki
```

El repositorio es **privado**: hay que estar agregado como colaborador.

### 2. Instalar las dependencias

```powershell
npm install
```

### 3. Crear el archivo `.env`

```powershell
Copy-Item .env.example .env
```

y completar como mínimo:

```ini
PUERTO=3000
ENTORNO=desarrollo

BD_HOST=127.0.0.1
BD_PUERTO=3306
BD_USUARIO=entheos
BD_CONTRASENA=LaClaveQueElijas123
BD_NOMBRE=entheos

# Generar con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESION_SECRETO=cambia_este_valor_por_uno_aleatorio

EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
ARTICULOS_PAGINA=12
```

> El archivo `.env` **no** se sube al repositorio (está en `.gitignore`).

### 4. Crear el usuario y la base de datos

Desde MySQL como `root`:

```sql
CREATE USER 'entheos'@'localhost' IDENTIFIED BY 'LaClaveQueElijas123';
GRANT ALL PRIVILEGES ON entheos.* TO 'entheos'@'localhost';
FLUSH PRIVILEGES;
```

La contraseña debe coincidir con `BD_CONTRASENA` del `.env`.

---

## Instalación y ejecución

```powershell
# 1. Crear la base, el esquema y los datos iniciales
npm run bd:crear

# 2. Levantar el servidor (con recarga automática)
npm run dev
```

El proyecto queda disponible en `http://localhost:3000` (o el `PUERTO` que tenga el `.env`).

Para probar en modo producción (sin recarga automática):

```powershell
npm run iniciar
```

Para apagarlo: `Ctrl + C` en esa terminal.

### Atajo con scripts (.bat)

Para no escribir los comandos a mano en Windows hay dos archivos:

1. **`INSTALAR.bat`** — se ejecuta **una sola vez**: instala las dependencias,
   crea el `.env` si falta y arma la base de datos.
2. **`INICIAR.bat`** — se ejecuta **cada vez** que se quiere usar el proyecto:
   enciende el servidor (y, si existe la carpeta `mysql-portatil\`, también
   levanta ese MySQL).

> Si preferís no instalar MySQL en la PC, se puede descomprimir un **MySQL
> portátil** dentro de la carpeta `mysql-portatil\` (esa carpeta no va al
> repositorio). `INICIAR.bat` lo detecta y lo levanta automáticamente.

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

Creadas por `npm run bd:crear`:

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

## Seguridad

- `.env` (contraseñas) y `certificados/` (clave privada HTTPS) están ignorados
  por Git. **Nunca** hacer `git add -f` sobre ellos.
- Si alguna vez se sube una contraseña por error, cambiarla de inmediato.
- Las cuentas de prueba tienen contraseñas temporales: cambiarlas antes de
  entregar.

## Notas

- El servidor usa HTTP por defecto. Para HTTPS local (`https://entheoswiki.local`)
  hay que agregar una línea en el archivo `hosts` y generar un certificado; ver
  `INSTALAR-OTRA-PC.txt`, paso 7.
- La guía completa de instalación en otra computadora está en
  **`INSTALAR-OTRA-PC.txt`**.
- No se suben al repositorio: `.env`, `certificados/`, `node_modules/`,
  `web/subidas/` y `pdf-generados/`.
