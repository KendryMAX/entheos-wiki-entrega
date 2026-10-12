'use strict';

const db = require('../datos/base');

const SIN_DATOS = '_Sin datos cargados todavía._';

function celda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function porcentaje(valor) {
  if (valor === null || valor === undefined) return '—';
  return Number(valor) + '%';
}

function tablaRazas(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Raza | % de la población | Notas |',
    '| --- | --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    [
      '|',
      celda(f.raza),
      '|',
      porcentaje(f.porcentaje_poblacion),
      '|',
      celda(f.notas),
      '|',
    ].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function tablaDistritos(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Distrito o Zona | Categoría | Población |',
    '| --- | --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    ['|', celda(f.distrito), '|', celda(f.categoria), '|', celda(f.poblacion), '|'].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function ejemplos() {
  return {
    razas: [
      '| Raza | % de la población | Notas |',
      '| --- | --- | --- |',
      '| Raza de ejemplo | 60% | Mayoría local |',
    ].join('\n'),
    distritos: [
      '| Distrito o Zona | Categoría | Población |',
      '| --- | --- | --- |',
      '| Distrito de ejemplo | Comercial | — |',
    ].join('\n'),
  };
}

async function buscarLocalidad(titulo) {
  return db.consultarUno(
    'SELECT id, nombre FROM localidad WHERE nombre = ? LIMIT 1',
    [String(titulo || '').trim()]
  );
}

async function tablasDeLocalidad(localidad) {
  const razas = await db.consultar(
    `SELECT r.nombre AS raza, rl.porcentaje_poblacion, rl.notas
       FROM raza_localidad rl
       JOIN raza r ON r.id = rl.raza_id
      WHERE rl.localidad_id = ?
      ORDER BY rl.porcentaje_poblacion DESC, r.nombre`,
    [localidad.id]
  );

  // Los distritos y zonas de una localidad aún no están modelados en la base.
  const distritos = [];

  return {
    razas: tablaRazas(razas),
    distritos: tablaDistritos(distritos),
  };
}

module.exports = {
  buscarLocalidad,
  tablasDeLocalidad,
  ejemplos,
  tablaRazas,
  tablaDistritos,
};
