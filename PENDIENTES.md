# Pendientes

Notas internas. No forma parte de la documentacion del equipo.

Ultima sesion: servidor apagado, todos los `.js` del servidor compilan, pero
**las pruebas no se volvieron a correr** despues de los cambios de abajo.

## Hecho y verificado

- `servidor/herramientas/certificado.ps1`: `$raiz` subia un solo nivel y apuntaba
  a `servidor/`, asi que el certificado se guardaba en el lugar equivocado. Ahora
  sube dos niveles y cae en la raiz del proyecto, que es donde lo busca `.env`.
- `servidor/herramientas/crear-admin.js`: usaba la columna `contrasena_hash`,
  que no existe. El esquema y todo el resto del codigo usan `password_hash`.
  Corregido en el `INSERT` y en el `UPDATE`.
- `servidor/herramientas/exportar.js`: el destino por defecto ya terminaba en
  `reportes` y despues le agregaba `reportes` otra vez, asi que los PDF salian
  en `pdf-generados/reportes/reportes`. Reescrito.
- `servidor/herramientas/pdf.js` estaba duplicado con `exportar.js` (misma
  consulta, mismo PDF) y por eso se borro. Ahora hay una sola herramienta.
- `package.json`: se saco el script `pdf` y la dependencia `multer`.
- `servidor/servicios/correo.js`: el mensaje de error apuntaba a
  `INSTALACION-ENTHEOS.txt`, un archivo que ya no existe.

## Lo que quedo a medias (importante)

- **El refactor de los `try/catch` de las rutas NO se aplico.** Se intento, se
  rompio la sintaxis y se revirtio todo desde un respaldo. Las cuatro rutas
  siguen intactas con sus 23 `try`:
  - `servidor/rutas/panel.js` 13
  - `servidor/rutas/inicio.js` 5
  - `servidor/rutas/articulos.js` 3
  - `servidor/rutas/cuenta.js` 2
- Ya se sabe por que fallaba el script: al contar llaves, el `});` del
  `res.render(...)` se tomaba como el cierre del `try`, cuando el cierre real
  es la linea `} catch (error) {`. Hay que buscar esa linea de catch
  directamente en vez de inferirla contando llaves. Esta en
  `C:\Users\Kendry\AppData\Local\Temp\opencode\quitar-try-catch.js`.
- Respaldo de las cuatro rutas intactas en
  `C:\Users\Kendry\AppData\Local\Temp\opencode\respaldo-rutas`.
- Las rutas no usan `next` para nada mas que para ese `catch`. Cuando se saque,
  el `async (req, res, next)` de cada handler tambien sobra y hay que pasarlo a
  `async (req, res)`. Ojo: `cuenta.js` tiene 4 `next(error)` y solo 2 `try`, asi
  que esos 2 de mas hay que mirarlos a mano.

## Cambios aplicados que falta verificar

- `exportar.js` quedo reescrito con banderas nuevas (`--slug=`, `--articulos`,
  `--reportes`) y una carpeta destino por tipo (`articulos/`, `reportes/`).
  Compila, pero **no se ejecuto nunca**: falta `npm run exportar` contra la base
  real para confirmar que los PDF salen donde corresponde.
- Se borro `multer` de `package.json` pero **no se corrio `npm install`**, asi
  que `package-lock.json` todavia lo lista. Hay que correr `npm install` para
  atualizar el lock.
- La documentacion todavia habla de cosas que ya no existen. Hay que editar las
  fuentes en `C:\Users\Kendry\AppData\Local\Temp\opencode\fuentes\` y regenerar:
  - `index.html` linea 250, 747 y 1365: siguen diciendo `npm run pdf`.
  - `index.html` linea 1015: sigue listando `multer` en la tabla de dependencias.
  - Varias partes dicen `base-de-datos/consultas/`, pero la carpeta real se
    llama `base-de-datos/Reportes/`. Hay que decidir el nombre canonico y
    arreglarlo en codigo, `.env.example` y documentacion.

## Codigo muerto detectado (sin tocar, pendiente de borrar)

Ninguno de estos se modifico todavia:

- `config.rutas.estilos`, `config.rutas.scripts`, `config.rutas.imagenes`,
  `config.rutas.subidas` y `config.rutas.base` no los usa nadie.
- `errores.sinPermiso` esta definido y exportado, pero no se usa en ningun lado.
- `NOMBRES` se exporta desde `capas/autenticacion.js` pero solo se usa adentro
  de ese mismo archivo.
- `res.locals.puede` y `res.locals.NIVELES` no los usa ninguna plantilla; las
  rutas los llaman para comprobar permisos. Se puede dejar solo
  `res.locals.esEditor` y `res.locals.esAdministrador`, que ya existen.
- `requiereSesion` esta encadenado antes de `requiereEditor` o
  `requiereAdministrador` en unas 14 rutas de `panel.js`. Es redundante: los dos
  mandan al 403 igual cuando no hay sesion.
- `multer` no se usa en ninguna parte del codigo. Las imagenes de articulos y
  avatares nunca se suba. O se implementa la subida o se saca de la
  documentacion la promesa de que existe.

## SQL duplicado

Las consultas de reportes estan escritas dos veces:

1. En `base-de-datos/Reportes/*.sql`, que es la version legible y la que se
   valido contra el esquema real.
2. Dentro de `servidor/herramientas/exportar.js`, en cadenas de texto.

El problema no es solo la duplicacion. `exportar.js` solo tiene el reporte 1.
Los otros cinco existen como archivo pero nunca se exportan.

### Opcion A: que el JavaScript lea los .sql

`exportar.js` abre `base-de-datos/Reportes/` y corre cada archivo.

- A favor: los .sql quedan como unica fuente de verdad. Editas el .sql y el
  reporte cambia.
- En contra: hay que resolver la conexion y el cuidado con los parametros.

### Opcion B: vistas CREATE VIEW

Se agrega `CREATE VIEW reporte_1 AS ...` al final de `base-de-datos.sql` y el
JavaScript hace `SELECT * FROM reporte_1`.

- A favor: la consulta se escribe una sola vez, en el archivo de esquema. Es
  ademas SQL de verdad, con lo que si el tutor mira el modelado ve que se saben
  usar vistas.
- En contra: las vistas no se pueden indexar ni usar algunos `JOIN` complejos.

## Que falta del enunciado

- ABM de las 23 entidades que faltan (solo hay `articulo`, `comentario`,
  `usuario`).
- ABM de las 8 tablas puente.
- Exponer los reportes en la web, si el enunciado lo pide.
- Credenciales de Gmail para probar el envio real.
- Internacionalizacion ES/EN.
- Confirmar con el tutor que Node + Express + MySQL esta permitido.

## Cosas que no se devem olvidar

- Las contrasenas de las tres cuentas (`Kendry`, `Angel`, `Adriano`) son de
  prueba. Cambiarlas antes de exponer el proyecto.
- `.env` tiene la contrasena de MySQL y el secreto de sesion. No compartirlo.
- `certificados/clave.txt` es la clave privada del certificado de HTTPS.
- El dominio `entheoswiki.local` solo resuelve en la computadora donde se
configuro el archivo hosts.