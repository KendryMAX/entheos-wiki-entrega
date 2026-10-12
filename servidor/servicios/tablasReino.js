'use strict';

const db = require('../datos/base');

const SIN_DATOS = '_Sin datos cargados todavía._';

function celda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function tablaLocalidades(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Localidad | Tipo |',
    '| --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    ['|', celda(f.localidad), '|', celda(f.tipo), '|'].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function ejemplos() {
  return {
    localidades: [
      '| Localidad | Tipo |',
      '| --- | --- |',
      '| Ciudad de ejemplo | Ciudad |',
      '| Aldea de ejemplo | Aldea |',
    ].join('\n'),
  };
}

async function buscarReino(titulo) {
  return db.consultarUno(
    'SELECT id, nombre FROM reino_estado WHERE nombre = ? LIMIT 1',
    [String(titulo || '').trim()]
  );
}

async function tablasDeReino(reino) {
  const localidades = await db.consultar(
    `SELECT l.nombre AS localidad, ta.nombre AS tipo
       FROM localidad l
       LEFT JOIN tipo_asentamiento ta ON ta.id = l.tipo_asentamiento_id
      WHERE l.reino_estado_id = ?
      ORDER BY l.nombre`,
    [reino.id]
  );

  return {
    localidades: tablaLocalidades(localidades),
  };
}

module.exports = {
  buscarReino,
  tablasDeReino,
  ejemplos,
  tablaLocalidades,
};
