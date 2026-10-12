'use strict';

const db = require('../datos/base');

const SIN_DATOS = '_Sin datos cargados todavía._';

function celda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function tablaZonas(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Zona | Localidades |',
    '| --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    ['|', celda(f.zona), '|', celda(f.localidades), '|'].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function tablaReinos(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Reino o Estado | Capital |',
    '| --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    ['|', celda(f.reino), '|', celda(f.capital), '|'].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function ejemplos() {
  return {
    zonas: [
      '| Zona | Localidades |',
      '| --- | --- |',
      '| Zona de ejemplo | Ciudad de ejemplo, Aldea de ejemplo |',
    ].join('\n'),
    reinos: [
      '| Reino o Estado | Capital |',
      '| --- | --- |',
      '| Reino de ejemplo | Ciudad de ejemplo |',
    ].join('\n'),
  };
}

async function buscarContinente(titulo) {
  return db.consultarUno(
    'SELECT id, nombre FROM continente WHERE nombre = ? LIMIT 1',
    [String(titulo || '').trim()]
  );
}

async function tablasDeContinente(continente) {
  const zonas = await db.consultar(
    `SELECT z.nombre AS zona,
            GROUP_CONCAT(l.nombre ORDER BY l.nombre SEPARATOR ', ') AS localidades
       FROM zona_geografica z
       LEFT JOIN localidad l ON l.zona_geografica_id = z.id
      WHERE z.continente_id = ?
      GROUP BY z.id
      ORDER BY z.nombre`,
    [continente.id]
  );

  const reinos = await db.consultar(
    `SELECT r.nombre AS reino, l.nombre AS capital
       FROM reino_estado r
       LEFT JOIN localidad l ON l.id = r.capital_id
      WHERE r.continente_id = ? AND r.disuelto = 0
      ORDER BY r.nombre`,
    [continente.id]
  );

  return {
    zonas: tablaZonas(zonas),
    reinos: tablaReinos(reinos),
  };
}

module.exports = {
  buscarContinente,
  tablasDeContinente,
  ejemplos,
  tablaZonas,
  tablaReinos,
};
