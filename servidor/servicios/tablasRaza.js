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

function tablaPoblacion(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Localidad | Zona | Reino | % de la población | Notas |',
    '| --- | --- | --- | --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    [
      '|',
      celda(f.localidad),
      '|',
      celda(f.zona),
      '|',
      celda(f.reino),
      '|',
      porcentaje(f.porcentaje_poblacion),
      '|',
      celda(f.notas),
      '|',
    ].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function tablaReligiones(filas) {
  if (!filas.length) return SIN_DATOS;

  const encabezado = [
    '| Religión | Vínculo | % de practicantes | Notas |',
    '| --- | --- | --- | --- |',
  ];

  const cuerpo = filas.map((f) =>
    [
      '|',
      celda(f.religion),
      '|',
      celda(f.grado),
      '|',
      porcentaje(f.porcentaje_practicantes),
      '|',
      celda(f.notas),
      '|',
    ].join(' ')
  );

  return encabezado.concat(cuerpo).join('\n');
}

function ejemplos() {
  return {
    poblacion: [
      '| Localidad | Zona | Reino | % de la población | Notas |',
      '| --- | --- | --- | --- | --- |',
      '| Ciudad de ejemplo | Zona de ejemplo | Reino de ejemplo | 45% | Mayor asentamiento |',
      '| Aldea de ejemplo | Zona de ejemplo | — | 10% | — |',
    ].join('\n'),
    religiones: [
      '| Religión | Vínculo | % de practicantes | Notas |',
      '| --- | --- | --- | --- |',
      '| Religión de ejemplo | Mayoritaria | 70% | Culto principal de la raza |',
      '| Culto de ejemplo | Minoritaria | 15% | — |',
    ].join('\n'),
  };
}

async function buscarRaza(titulo) {
  return db.consultarUno('SELECT id, nombre FROM raza WHERE nombre = ? LIMIT 1', [
    String(titulo || '').trim(),
  ]);
}

async function tablasDeRaza(raza) {
  const poblacion = await db.consultar(
    `SELECT l.nombre AS localidad,
            z.nombre AS zona,
            re.nombre AS reino,
            rl.porcentaje_poblacion,
            rl.notas
       FROM raza_localidad rl
       JOIN localidad l ON l.id = rl.localidad_id
       LEFT JOIN zona_geografica z ON z.id = l.zona_geografica_id
       LEFT JOIN reino_estado re ON re.id = l.reino_estado_id
      WHERE rl.raza_id = ?
      ORDER BY rl.porcentaje_poblacion DESC, l.nombre`,
    [raza.id]
  );

  const religiones = await db.consultar(
    `SELECT r.nombre AS religion,
            rr.grado,
            rr.porcentaje_practicantes,
            rr.notas
       FROM raza_religion rr
       JOIN religion r ON r.id = rr.religion_id
      WHERE rr.raza_id = ?
      ORDER BY rr.porcentaje_practicantes DESC, r.nombre`,
    [raza.id]
  );

  return {
    poblacion: tablaPoblacion(poblacion),
    religiones: tablaReligiones(religiones),
  };
}

module.exports = { buscarRaza, tablasDeRaza, ejemplos, tablaPoblacion, tablaReligiones };
