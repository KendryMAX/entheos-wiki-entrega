'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const app = require('../aplicacion');
const db = require('../datos/base');

const servidor = app.listen(0);

function pedir(ruta, opciones = {}) {
  return fetch(`http://127.0.0.1:${servidor.address().port}${ruta}`, opciones);
}

test.after(async () => {
  await new Promise((resolver) => servidor.close(resolver));
  await db.grupo.end();
});

test('la aplicacion arranca y la base responde', async () => {
  const laConexion = await db.comprobarConexion();
  assert.ok(laConexion, 'debe responder la consulta de comprobacion');
});

test('la portada carga', async () => {
  const respuesta = await pedir('/');
  assert.strictEqual(respuesta.status, 200);
  const html = await respuesta.text();
  assert.match(html, /Entheos/);
});

test('el listado de articulos carga', async () => {
  const respuesta = await pedir('/articulos');
  assert.strictEqual(respuesta.status, 200);
});

test('las paginas publicas responden 200', async () => {
  for (const ruta of ['/personajes', '/lugares', '/comunidad', '/acceso', '/registro']) {
    const respuesta = await pedir(ruta);
    assert.strictEqual(respuesta.status, 200, `${ruta} deberia responder 200`);
  }
});

test('una ruta inexistente responde 404', async () => {
  const respuesta = await pedir('/ruta-que-no-existe');
  assert.strictEqual(respuesta.status, 404);
});

test('el panel esta protegido sin sesion', async () => {
  const respuesta = await pedir('/panel/usuarios', { redirect: 'manual' });
  assert.ok(
    [302, 403].includes(respuesta.status),
    'el panel no deberia ser accesible sin iniciar sesion'
  );
});

test('el buscador responde JSON para el autocompletado', async () => {
  const respuesta = await pedir('/buscar?formato=json&q=a', {
    headers: { Accept: 'application/json' },
  });
  assert.strictEqual(respuesta.status, 200);
  const datos = await respuesta.json();
  assert.ok(Array.isArray(datos), 'debe devolver un arreglo');
});

test('el login valida la contrasena', async () => {
  const cuerpo = new URLSearchParams({
    correo: 'Kendry',
    contrasena: 'contrasena-incorrecta',
  });

  const respuesta = await pedir('/acceso', {
    method: 'POST',
    body: cuerpo,
    redirect: 'manual',
  });

  assert.strictEqual(respuesta.status, 401);
});

test('las plantillas estan en la carpeta configurada', () => {
  const plantillas = path.join(__dirname, '..', 'plantillas');
  assert.ok(require('fs').existsSync(path.join(plantillas, 'parciales', 'cabecera.ejs')));
  assert.ok(require('fs').existsSync(path.join(plantillas, 'errores', '404.ejs')));
});

test('los archivos del navegador estan en web/', () => {
  const web = path.join(__dirname, '..', '..', 'web');
  assert.ok(require('fs').existsSync(path.join(web, 'estilos', 'estilos.css')));
  assert.ok(require('fs').existsSync(path.join(web, 'scripts', 'aplicacion.js')));
  assert.ok(require('fs').existsSync(path.join(web, 'imagenes', 'icono.svg')));
});