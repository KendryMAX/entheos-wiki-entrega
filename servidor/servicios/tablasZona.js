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

function fecha(valor) {
  if (!valor) return '—';
  const f = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(f.getTime())) return celda(valor);
  const mes = String(f.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(f.getUTCDate()).padStart(2, '0');
  return `${dia}/${mes}/${f.getUTCFullYear()}`;
}

function tablaLocalidades(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Localidad | Tipo | Reino | Fundación |',
    '| --- | --- | --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    [
      '|',
      celda(f.localidad),
      '|',
      celda(f.tipo),
      '|',
      celda(f.reino),
      '|',
      fecha(f.fundacion),
      '|',
    ].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function tablaPoblacion(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Raza | Localidad | % de la población | Notas |',
    '| --- | --- | --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    [
      '|',
      celda(f.raza),
      '|',
      celda(f.localidad),
      '|',
      porcentaje(f.porcentaje_poblacion),
      '|',
      celda(f.notas),
      '|',
    ].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function ejemplos() {
  return {
    localidades: [
      '| Localidad | Tipo | Reino | Fundación |',
      '| --- | --- | --- | --- |',
      '| Ciudad de ejemplo | Ciudad | Reino de ejemplo | 01/01/1000 |',
      '| Aldea de ejemplo | Aldea | — | — |',
    ].join('\n'),
    poblacion: [
      '| Raza | Localidad | % de la población | Notas |',
      '| --- | --- | --- | --- |',
      '| Raza de ejemplo | Ciudad de ejemplo | 60% | Mayoría local |',
      '| Raza de ejemplo | Aldea de ejemplo | 20% | Minoría |',
    ].join('\n'),
  };
}

async function buscarZona(titulo) {
  return db.consultarUno(
    'SELECT id, nombre FROM zona_geografica WHERE nombre = ? LIMIT 1',
    [String(titulo || '').trim()]
  );
}

async function tablasDeZona(zona) {
  const localidades = await db.consultar(
    `SELECT l.nombre AS localidad,
            ta.nombre AS tipo,
            re.nombre AS reino,
            l.fundacion
       FROM localidad l
       LEFT JOIN tipo_asentamiento ta ON ta.id = l.tipo_asentamiento_id
       LEFT JOIN reino_estado re ON re.id = l.reino_estado_id
      WHERE l.zona_geografica_id = ?
      ORDER BY l.nombre`,
    [zona.id]
  );

  const poblacion = await db.consultar(
    `SELECT r.nombre AS raza,
            l.nombre AS localidad,
            rl.porcentaje_poblacion,
            rl.notas
       FROM raza_localidad rl
       JOIN localidad l ON l.id = rl.localidad_id
       JOIN raza r ON r.id = rl.raza_id
      WHERE l.zona_geografica_id = ?
      ORDER BY rl.porcentaje_poblacion DESC, r.nombre, l.nombre`,
    [zona.id]
  );

  return {
    localidades: tablaLocalidades(localidades),
    poblacion: tablaPoblacion(poblacion),
  };
}

module.exports = {
  buscarZona,
  tablasDeZona,
  ejemplos,
  tablaLocalidades,
  tablaPoblacion,
};
