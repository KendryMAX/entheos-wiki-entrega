'use strict';

const path = require('path');

const raiz = path.join(__dirname, '..');

require('dotenv').config({ path: path.join(raiz, '.env') });

const porDefecto = {
  PUERTO: 3000,
  ENTORNO: 'desarrollo',
  BD_HOST: '127.0.0.1',
  BD_PUERTO: 3306,
  BD_USUARIO: 'root',
  BD_NOMBRE: 'entheos',
  BD_CONEXIONES: 10,
  SESION_MINUTOS: 120,
  EDGE: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ARTICULOS_PAGINA: 12,
};

function leer(nombre, obligatorio = true) {
  const valor = process.env[nombre] ?? porDefecto[nombre];

  if (obligatorio && (valor === undefined || valor === null || valor === '')) {
    throw new Error(
      `Falta la variable ${nombre} en el archivo .env. Revisa que se llame .env y no .env.txt.`
    );
  }

  return valor;
}

function leerNumero(nombre, obligatorio = true) {
  const valor = leer(nombre, obligatorio);
  if (valor === undefined || valor === '') return undefined;

  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    throw new Error(`La variable ${nombre} debe ser un numero. Valor recibido: ${valor}`);
  }

  return numero;
}

const entorno = leer('ENTORNO', false) || porDefecto.ENTORNO;

const rutas = {
  raiz,
  plantillas: path.join(__dirname, 'plantillas'),
  web: path.join(raiz, 'web'),
  estilos: path.join(raiz, 'web', 'estilos'),
  scripts: path.join(raiz, 'web', 'scripts'),
  imagenes: path.join(raiz, 'web', 'imagenes'),
  subidas: path.join(raiz, 'web', 'subidas'),
  base: path.join(raiz, 'base-de-datos'),
  pdf: path.join(raiz, 'pdf-generados'),
};

const rutaCertificado = leer('HTTPS_PFX', false);

module.exports = {
  entorno,
  esProduccion: entorno === 'produccion',
  puerto: leerNumero('PUERTO'),

  baseDeDatos: {
    host: leer('BD_HOST'),
    puerto: leerNumero('BD_PUERTO'),
    usuario: leer('BD_USUARIO'),
    contrasena: leer('BD_CONTRASENA'),
    nombre: leer('BD_NOMBRE'),
    conexiones: leerNumero('BD_CONEXIONES'),
  },

  sesion: {
    secreto: leer('SESION_SECRETO'),
    minutos: leerNumero('SESION_MINUTOS'),
  },

  correo: {
    usuario: leer('GMAIL_USUARIO', false) || '',
    contrasena: leer('GMAIL_CONTRASENA', false) || '',
    desde: leer('GMAIL_DESDE', false) || '',
  },

  pdf: {
    edge: leer('EDGE', false) || porDefecto.EDGE,
  },

  https: {
    pfx: rutaCertificado ? path.join(rutas.raiz, rutaCertificado) : '',
    clave: leer('HTTPS_CLAVE', false) || '',
  },

  articulosPagina: leerNumero('ARTICULOS_PAGINA'),

  rutas,
};