'use strict';

// Convierte los valores internos de la base de datos (borrador, en_revision,
// no_confirmado, etc.) en texto corriente para mostrarle a las personas. Asi en
// la web nunca aparece un valor tecnico con guiones bajos.

const ESTADOS = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  publicado: 'Publicado',
  archivado: 'Archivado',
  rechazado: 'Rechazado',
};

const ESTADOS_VITALES = {
  vivo: 'Vivo',
  muerto: 'Muerto',
  no_confirmado: 'No confirmado',
  desconocido: 'Desconocido',
};

const TIPOS_ZONA = {
  montana: 'Montaña',
  costa: 'Costa',
  desierto: 'Desierto',
  selva: 'Selva',
  bosque: 'Bosque',
  pradera: 'Pradera',
  isla: 'Isla',
  valle: 'Valle',
  rio: 'Río',
  otro: 'Zona natural',
};

function texto(mapa, valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.hasOwnProperty.call(mapa, valor)) return mapa[valor];
  // Respaldo por si llega un valor nuevo: se muestra sin guiones bajos.
  return String(valor).replace(/_/g, ' ');
}

module.exports = {
  ESTADOS,
  ESTADOS_VITALES,
  TIPOS_ZONA,
  estado: (valor) => texto(ESTADOS, valor),
  estadoVital: (valor) => texto(ESTADOS_VITALES, valor),
  tipoZona: (valor) => texto(TIPOS_ZONA, valor),
};
