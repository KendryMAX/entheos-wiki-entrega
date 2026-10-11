# Pendientes

Notas internas. No forma parte de la documentación del equipo. Este archivo
servirá de base para armar la guía del proyecto (pendiente, "luego").

Última sesión: importación de Obsidian aplicada, base reconstruida y
**las pruebas pasan (10/10)** con el servidor encendido.

## Hecho en la última sesión (importación + seguridad)

### Importador Obsidian → wiki

- Nuevo `servidor/herramientas/importar-obsidian.js` y script
  `npm run importar` (sin banderas hace un *plan*; `--aplicar` escribe;
  `--vault=RUTA` si no está en `OBSIDIAN_VAULT`).
- Lee el vault (50 notas), convierte frontmatter + cuerpo (quita
  infobox/dataview, `=this.*`, plantillas "Guía a rellenar") y crea/actualiza:
  51 artículos (1 semilla + 50), 2 continentes, 17 zonas, 1 reino,
  4 localidades, 6 distritos, 5 razas, 3 subrazas, 1 lengua, 1 ítem,
  1 recurso, 2 facciones, 2 personajes y 32 imágenes en `web/subidas/`
  con sus filas en `imagen`.
- Es idempotente (vuelve a correr sin duplicar) y usa la capa `datos/base.js`.
- Se saltan: `.trash`, `.stversions`, `.obsidian`, Templates, Configuración,
  Sistemas, Temporadas, `Recursos y Referencias/Audio` y los archivos
  `Ejemplo*`, `*- Index.md`, `Timeline.md`, `Artistas Referencias.md` e
  `INBOX/Evento N`.
- `servidor/herramientas/crear-base.js`: ahora desactiva
  `FOREIGN_KEY_CHECKS` durante el DDL (el archivo la traía en un comentario
  `/*!...*/` que el filtro descartaba) y el `separarSentencias` ya no corta
  puntos y comas que van dentro de comillas (rompía `COMMENT '...; ...'` de
  la tabla `lengua`).

### Seguridad verificada

- Contraseñas: bcryptjs (10 rondas) en `cuenta.js` (registro), `panel.js`
  (cambio de contraseña) y `crear-admin.js`. Las 3 semillas tienen hashes
  bcrypt válidos (se dejó la decisión de no cambiarlos).
- Login: `session.regenerate()`, comparación con hash de relleno para evitar
  *timing*, cookie `httpOnly` + `sameSite=lax` + `secure` en producción.
- Cabeceras con helmet (CSP `'self'` + `data:` para `img`), límite de peticiones
  10/15 min en `/acceso` y `/registro`, y todas las consultas pasan por
  `db.ejecutar` con parámetros (sin concatenar SQL).

### Ortografía en toda la página + cierre del login

- Se corrigieron las tildes y eñes en **todos los textos visibles**: las 17
  plantillas EJS (`cabecera`, `pie`, `inicio`, `articulo`, `articulos`,
  `buscar`, `cronologia`, `personajes`, `lugares`, `acceso`, `registro`,
  `errores/403·404·500`, `panel/*`), los mensajes de las rutas
  (`articulos.js`, `cuenta.js`, `panel.js`), la capa `capas/errores.js` y el
  script `web/scripts/aplicacion.js`. Se usa voseo con tilde: "escribí",
  "tenés", "podés", "volvé".
- La tarjeta de acceso ahora tiene una X (`a.hoja-cerrar`) en su esquina que
  lleva al inicio (`/`). Estilos en `estilos.css` (`.hoja` es `position:
  relative`).
- Quedan sin tilde a propósito los identificadores técnicos (`id`/`name` de
  inputs como `contrasena`, columnas SQL, etc.), que no son texto visible.
- `importar-obsidian.js` y `exportar.js` son **herramientas internas de
  desarrollo**: no se presentan como funciones de la app en la documentación.
- Idioma: la página base es español; la documentación debe mantener tildes y
  eñes. A futuro debe poder existir una versión en inglés (ver "Que falta del
  enunciado": Internacionalización ES/EN).

## Hecho y verificado

- `servidor/herramientas/certificado.ps1`: `$raiz` subía un solo nivel y
  apuntaba a `servidor/`, así que el certificado se guardaba en el lugar
  equivocado. Ahora sube dos niveles y cae en la raíz del proyecto, que es
  donde lo busca `.env`.
- `servidor/herramientas/crear-admin.js`: usaba la columna `contrasena_hash`,
  que no existe. El esquema y todo el resto del código usan `password_hash`.
  Corregido en el `INSERT` y en el `UPDATE`.
- `servidor/herramientas/exportar.js`: el destino por defecto ya terminaba en
  `reportes` y después le agregaba `reportes` otra vez, así que los PDF salían
  en `pdf-generados/reportes/reportes`. Reescrito.
- `servidor/herramientas/pdf.js` estaba duplicado con `exportar.js` (misma
  consulta, mismo PDF) y por eso se borró. Ahora hay una sola herramienta.
- `package.json`: se sacó el script `pdf` y la dependencia `multer`.
- `servidor/servicios/correo.js`: el mensaje de error apuntaba a
  `INSTALACION-ENTHEOS.txt`, un archivo que ya no existe.

## Lo que quedó a medias (importante)

- **El refactor de los `try/catch` de las rutas NO se aplicó.** Se intentó, se
  rompió la sintaxis y se revirtió todo desde un respaldo. Las cuatro rutas
  siguen intactas con sus 23 `try`:
  - `servidor/rutas/panel.js` 13
  - `servidor/rutas/inicio.js` 5
  - `servidor/rutas/articulos.js` 3
  - `servidor/rutas/cuenta.js` 2
- Ya se sabe por qué fallaba el script: al contar llaves, el `});` del
  `res.render(...)` se tomaba como el cierre del `try`, cuando el cierre real
  es la línea `} catch (error) {`. Hay que buscar esa línea de catch
  directamente en vez de inferirla contando llaves. Está en
  `C:\Users\Kendry\AppData\Local\Temp\opencode\quitar-try-catch.js`.
- Respaldo de las cuatro rutas intactas en
  `C:\Users\Kendry\AppData\Local\Temp\opencode\respaldo-rutas`.
- Las rutas no usan `next` para nada más que para ese `catch`. Cuando se quite,
  el `async (req, res, next)` de cada *handler* también sobra y hay que pasarlo
  a `async (req, res)`. Ojo: `cuenta.js` tiene 4 `next(error)` y solo 2 `try`,
  así que esos 2 de más hay que mirarlos a mano.

## Cambios aplicados que falta verificar

- `exportar.js` quedó reescrito con banderas nuevas (`--slug=`, `--articulos`,
  `--reportes`) y una carpeta destino por tipo (`articulos/`, `reportes/`).
  Compila, pero **no se ejecutó nunca**: falta `npm run exportar` contra la
  base real para confirmar que los PDF salen donde corresponde.
- Se borró `multer` de `package.json` y se corrió `npm install`:
  `package-lock.json` ya no lo lista. Quedan 3 avisos *high* de `braces`
  (vía `nodemon` → `chokidar`), solo en desarrollo; se puede subir `nodemon`
  a la versión actual para limpiarlos.
- La documentación todavía habla de cosas que ya no existen. Hay que editar las
  fuentes en `C:\Users\Kendry\AppData\Local\Temp\opencode\fuentes\` y regenerar:
  - `index.html` línea 250, 747 y 1365: siguen diciendo `npm run pdf`.
  - `index.html` línea 1015: sigue listando `multer` en la tabla de dependencias.
  - Varias partes dicen `base-de-datos/consultas/`, pero la carpeta real se
    llama `base-de-datos/Reportes/`. Hay que decidir el nombre canónico y
    arreglarlo en código, `.env.example` y documentación.

## Código muerto detectado (sin tocar, pendiente de borrar)

Ninguno de estos se modificó todavía:

- `config.rutas.estilos`, `config.rutas.scripts`, `config.rutas.imagenes`,
  `config.rutas.subidas` y `config.rutas.base` no los usa nadie.
- `errores.sinPermiso` está definido y exportado, pero no se usa en ningún
  lado.
- `NOMBRES` se exporta desde `capas/autenticacion.js` pero solo se usa adentro
  de ese mismo archivo.
- `res.locals.puede` y `res.locals.NIVELES` no los usa ninguna plantilla; las
  rutas los llaman para comprobar permisos. Se puede dejar solo
  `res.locals.esEditor` y `res.locals.esAdministrador`, que ya existen.
- `requiereSesion` está encadenado antes de `requiereEditor` o
  `requiereAdministrador` en unas 14 rutas de `panel.js`. Es redundante: los
  dos mandan al 403 igual cuando no hay sesión.
- `multer` no se usa en ninguna parte del código. Las imágenes de artículos y
  avatares nunca se suben. O se implementa la subida o se saca de la
  documentación la promesa de que existe.

## SQL duplicado

Las consultas de reportes están escritas dos veces:

1. En `base-de-datos/Reportes/*.sql`, que es la versión legible y la que se
   validó contra el esquema real.
2. Dentro de `servidor/herramientas/exportar.js`, en cadenas de texto.

El problema no es solo la duplicación. `exportar.js` solo tiene el reporte 1.
Los otros cinco existen como archivo pero nunca se exportan.

### Opción A: que el JavaScript lea los .sql

`exportar.js` abre `base-de-datos/Reportes/` y corre cada archivo.

- A favor: los .sql quedan como única fuente de verdad. Se edita el .sql y el
  reporte cambia.
- En contra: hay que resolver la conexión y el cuidado con los parámetros.

### Opción B: vistas CREATE VIEW

Se agrega `CREATE VIEW reporte_1 AS ...` al final de `base-de-datos.sql` y el
JavaScript hace `SELECT * FROM reporte_1`.

- A favor: la consulta se escribe una sola vez, en el archivo de esquema. Es
  además SQL de verdad, con lo que si el tutor mira el modelado ve que se saben
  usar vistas.
- En contra: las vistas no se pueden indexar ni usar algunos `JOIN` complejos.

## Qué falta del enunciado

- ABM de las 23 entidades que faltan (solo hay `articulo`, `comentario`,
  `usuario`).
- ABM de las 8 tablas puente.
- Exponer los reportes en la web, si el enunciado lo pide.
- Credenciales de Gmail para probar el envío real.
- Internacionalización ES/EN: la página base es español; debe poderse ofrecer
  una versión en inglés.
- Confirmar con el tutor que Node + Express + MySQL está permitido.

## Cosas que no se deben olvidar

- Las contraseñas de las tres cuentas (`Kendry`, `Angel`, `Adriano`) son de
  prueba. Cambiarlas antes de exponer el proyecto.
- `.env` tiene la contraseña de MySQL y el secreto de sesión. No compartirlo.
- `certificados/clave.txt` es la clave privada del certificado de HTTPS.
- El dominio `entheoswiki.local` solo resuelve en el equipo donde se configuró
  el archivo `hosts`.
- **Escribir siempre con tildes y eñes** en la documentación: este archivo se
  usará después como guía.