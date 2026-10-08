'use strict';

const mysql = require('mysql2/promise');
const config = require('../configuracion');

const grupo = mysql.createPool({
  host: config.baseDeDatos.host,
  port: config.baseDeDatos.puerto,
  user: config.baseDeDatos.usuario,
  password: config.baseDeDatos.contrasena,
  database: config.baseDeDatos.nombre,
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: config.baseDeDatos.conexiones,
  queueLimit: 0,
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
});

async function consultar(sql, parametros = []) {
  const [filas] = await grupo.execute(sql, parametros);
  return filas;
}

async function consultarUno(sql, parametros = []) {
  const filas = await consultar(sql, parametros);
  return filas[0];
}

async function ejecutar(sql, parametros = []) {
  const [resultado] = await grupo.execute(sql, parametros);
  return resultado;
}

async function comprobarConexion() {
  const fila = await consultarUno('SELECT VERSION() AS version, DATABASE() AS base');
  return Boolean(fila);
}

module.exports = { grupo, consultar, consultarUno, ejecutar, comprobarConexion };