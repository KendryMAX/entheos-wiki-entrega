'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');

const app = require('./aplicacion');
const config = require('./configuracion');
const db = require('./datos/base');

const PUERTO_HTTPS = 443;

function credencialesDelCertificado() {
  const archivo = config.https.pfx;

  if (!archivo) {
    console.log('Sin HTTPS: la variable HTTPS_PFX del .env esta vacia.');
    return null;
  }

  if (!fs.existsSync(archivo)) {
    console.warn('No se encontro el certificado en ' + archivo + '. Solo HTTP.');
    return null;
  }

  return { pfx: fs.readFileSync(archivo), passphrase: config.https.clave };
}

function avisarError(error, puerto, salir) {
  if (error.code === 'EADDRINUSE') {
    console.error('El puerto ' + puerto + ' ya esta ocupado.');
    console.error('Cierra el otro servidor o cambia el puerto en el archivo .env.');
  } else {
    console.error(error);
  }

  if (salir) process.exit(1);
}

function crearServidor(motor, opciones, nombre, puerto, salirSiFalla) {
  const servidor = motor.createServer(opciones || {}, app);

  servidor.on('error', (error) => avisarError(error, puerto, salirSiFalla));
  servidor.listen(puerto, () => console.log('Entheos Wiki escuchando en ' + nombre));

  return servidor;
}

async function comprobarBaseDeDatos() {
  try {
    await db.comprobarConexion();
  } catch (error) {
    console.error('No se pudo conectar con MySQL: ' + error.message);
    console.error('Revisa que el servicio MySQL96 este corriendo y que el .env este bien.');
    process.exit(1);
  }

  console.log('Base de datos conectada: ' + config.baseDeDatos.nombre);
  console.log('Entorno: ' + config.entorno);
}

function apagar() {
  console.log('\nCerrando el servidor...');
  db.grupo.end().then(() => process.exit(0));
}

async function arrancar() {
  await comprobarBaseDeDatos();

  const credenciales = credencialesDelCertificado();

  if (credenciales) {
    crearServidor(https, credenciales, 'https://entheoswiki.local', PUERTO_HTTPS, false);
  }

  crearServidor(http, null, 'http://localhost:' + config.puerto, config.puerto, true);

  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

arrancar();