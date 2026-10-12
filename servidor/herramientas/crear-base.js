'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../configuracion');

const archivoSql = path.join(__dirname, '..', '..', 'base-de-datos', 'base-de-datos.sql');

const argumentos = new Set(process.argv.slice(2));
const reiniciar = argumentos.has('--reiniciar');
const soloSemilla = argumentos.has('--semilla');

function leerArchivo() {
  if (!fs.existsSync(archivoSql)) {
    throw new Error('No se encontro ' + archivoSql);
  }
  return fs.readFileSync(archivoSql, 'utf8');
}

function sinComentarios(sql) {
  return sql
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n');
}

function separarSentencias(sql) {
  const sentencias = [];
  let actual = '';
  let enComilla = false;

  for (const caracter of sql) {
    if (caracter === "'") {
      enComilla = !enComilla;
      actual += caracter;
      continue;
    }

    if (caracter === ';' && !enComilla) {
      sentencias.push(actual.trim());
      actual = '';
      continue;
    }

    actual += caracter;
  }

  if (actual.trim()) sentencias.push(actual.trim());

  return sentencias.filter(
    (parte) => parte.length > 0 && !/^(\/\*!|SET |DROP DATABASE|USE |CREATE DATABASE)/i.test(parte)
  );
}

async function crearBase(conexion) {
  const nombre = config.baseDeDatos.nombre;

  if (reiniciar) {
    await conexion.query('DROP DATABASE IF EXISTS `' + nombre + '`');
    console.log('Base ' + nombre + ' eliminada.');
  }

  await conexion.query(
    'CREATE DATABASE IF NOT EXISTS `' +
      nombre +
      '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  console.log('Base ' + nombre + ' lista.');
}

async function aplicarEsquema(conexion) {
  const sentencias = separarSentencias(sinComentarios(leerArchivo()));

  await conexion.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    for (const sentencia of sentencias) {
      try {
        await conexion.query(sentencia);
      } catch (error) {
        console.error('Fallo una sentencia del archivo SQL:');
        console.error(sentencia.slice(0, 160));
        throw error;
      }
    }
  } finally {
    await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('Se aplicaron ' + sentencias.length + ' sentencias.');
}

async function contar(conexion, tablas) {
  const resultados = {};

  for (const tabla of tablas) {
    const [filas] = await conexion.query('SELECT COUNT(*) AS total FROM `' + tabla + '`');
    resultados[tabla] = filas[0].total;
  }

  return resultados;
}

async function main() {
  const conexion = await mysql.createConnection({
    host: config.baseDeDatos.host,
    port: config.baseDeDatos.puerto,
    user: config.baseDeDatos.usuario,
    password: config.baseDeDatos.contrasena,
    multipleStatements: false,
    charset: 'utf8mb4_unicode_ci',
  });

  try {
    if (!soloSemilla) {
      await crearBase(conexion);
      await conexion.query('USE `' + config.baseDeDatos.nombre + '`');
      await aplicarEsquema(conexion);
    } else {
      console.log('Solo se aplica el archivo de datos, sin tocar el esquema.');
      await conexion.query('USE `' + config.baseDeDatos.nombre + '`');
    }

    const totales = await contar(conexion, [
      'usuario',
      'rol',
      'categoria',
      'articulo',
      'etiqueta',
    ]);

    console.log('Resumen de la base:');
    Object.keys(totales).forEach((tabla) => {
      console.log('  ' + tabla + ': ' + totales[tabla]);
    });

    console.log('Listo. Para arrancar la app: npm run dev');
  } finally {
    await conexion.end();
  }
}

main().catch((error) => {
  console.error('No se pudo preparar la base: ' + error.message);
  process.exit(1);
});