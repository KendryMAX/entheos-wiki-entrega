'use strict';

// Fichas del panel: definen, por categoría, los campos fijos que se ven bajo la
// imagen del artículo (el panel "Info") y las secciones fijas del cuerpo. El
// formulario del panel se arma con esto, de modo que quien escribe elige la
// categoría y rellena títulos ya escritos, sin tocar Markdown a mano.
//
// Cada campo es:
//   { etiqueta, tipo: 'texto' | 'lista', catalogo?, valor? }
// Cada sección es:
//   { titulo, auto }
// Las secciones `auto` no las escribe nadie: el servidor las vuelve a generar
// al mostrar el artículo (por ejemplo, la tabla de localidades de una región).

const { separarFicha } = require('./contenido');

function normalizar(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function texto(etiqueta, extra) {
  return Object.assign({ etiqueta, tipo: 'texto', valor: '' }, extra);
}

function lista(etiqueta, catalogo) {
  return { etiqueta, tipo: 'lista', catalogo, valor: '' };
}

function seccion(titulo) {
  return { titulo, auto: false };
}

function automatica(titulo) {
  return { titulo, auto: true };
}

const FICHAS = {
  Continentes: {
    campos: [
      texto('Pronunciación'),
      texto('Tipo', { valor: 'Continente' }),
      texto('Plano', { valor: 'Terrenal' }),
    ],
    secciones: [
      automatica('Reinos y Estados Independientes'),
      automatica('Zonas Geográficas'),
      seccion('Historia'),
      seccion('Geografía General'),
      seccion('Fauna y Flora Continental'),
      seccion('Sociedad y Cultura Común'),
      seccion('Economía y Comercio Intercontinental'),
      seccion('Poder Militar y Defensas'),
      seccion('Ciencia, Magia y Tecnología'),
    ],
  },

  Regiones: {
    campos: [
      texto('Pronunciación'),
      texto('Alias'),
      texto('Tipo', { valor: 'Zona geográfica' }),
      lista('Continente', 'continentes'),
      texto('Plano', { valor: 'Terrenal' }),
    ],
    secciones: [
      automatica('Localidades'),
      automatica('Población'),
      seccion('Historia Local'),
      seccion('Geografía Detallada'),
      seccion('Fauna y Flora'),
      seccion('Sociedad y Cultura Asociada'),
      seccion('Economía y Comercio'),
      seccion('Ciencia, Magia y Tecnología'),
    ],
    anclajes: { Continente: 'continente' },
  },

  'Reinos y Estados': {
    campos: [
      texto('Pronunciación'),
      texto('Tipo', { valor: 'Reino independiente' }),
      lista('Continente', 'continentes'),
      lista('Capital', 'localidades'),
    ],
    secciones: [
      automatica('Localidades'),
      seccion('Historia'),
      seccion('Geografía'),
      seccion('Fauna y Flora'),
      seccion('Sociedad y Cultura'),
      seccion('Economía y Comercio'),
      seccion('Poder Militar y Defensas'),
      seccion('Ciencia, Magia y Tecnología'),
    ],
    anclajes: { Continente: 'continente', Capital: 'capital' },
  },

  Localidades: {
    campos: [
      texto('Pronunciación'),
      texto('Alias'),
      lista('Tipo', 'tipos'),
      texto('Población'),
      lista('Reino-Estado', 'reinos'),
      texto('Plano', { valor: 'Terrenal' }),
      lista('Zona Geográfica', 'zonas'),
      lista('Continente', 'continentes'),
      texto('Tipo de Gobierno'),
    ],
    secciones: [
      automatica('Presencia de Razas'),
      automatica('Distritos o Zonas'),
      seccion('Historia Breve'),
      seccion('Geografía'),
      seccion('Fauna y Flora Local'),
      seccion('Sociedad y Cultura'),
      seccion('Economía y Comercio'),
      seccion('Poder Militar y Defensas'),
      seccion('Ciencia, Magia y Tecnología'),
    ],
    anclajes: {
      Tipo: 'tipo',
      'Reino-Estado': 'reino',
      'Zona Geográfica': 'zona',
    },
  },

  'Distritos o Zonas': {
    campos: [
      texto('Tipo', { valor: 'Distrito o Zona' }),
      lista('Localidad Perteneciente', 'localidades'),
      texto('Categoría'),
      lista('Continente', 'continentes'),
    ],
    secciones: [
      seccion('Historia Breve'),
      seccion('Función Principal'),
      seccion('Sociedad y Cultura'),
      seccion('Economía y Comercio'),
    ],
  },

  Razas: {
    campos: [
      texto('Pronunciación'),
      texto('Alias'),
      texto('Tipo', { valor: 'Raza' }),
      texto('Subrazas'),
      lista('Zona de origen', 'zonas'),
      lista('Continente de origen', 'continentes'),
      texto('Longevidad'),
      texto('Idioma principal'),
      texto('Religión principal'),
      texto('Localidades asociadas'),
      texto('Presencia'),
    ],
    secciones: [
      seccion('Biología y Fisiología'),
      seccion('Psicología y Cognición'),
      seccion('Lengua y Comunicación'),
      seccion('Referencias de Diseño'),
      automatica('Población Actual'),
      automatica('Religiones'),
      seccion('Descripción General'),
      seccion('Sociedad y Cultura'),
      seccion('Historia y Cronología'),
      seccion('Relaciones'),
    ],
  },

  Personajes: {
    campos: [
      texto('Pronunciación'),
      texto('Alias'),
      lista('Raza', 'razas'),
      texto('Sexo'),
      texto('Edad'),
      texto('Altura'),
      texto('Peso'),
      texto('Orientación (sex.)'),
      texto('Condición'),
      texto('Alineamiento'),
      texto('Ocupación'),
      texto('Cobro'),
      texto('Dinero'),
      lista('Localidad', 'localidades'),
      texto('Religiones'),
      texto('Facciones/Grupos'),
      texto('Fecha de nacimiento'),
      texto('Fecha de fallecimiento'),
      lista('estado vital', 'estadosVitales'),
    ],
    secciones: [
      seccion('Personalidad'),
      seccion('Social'),
      seccion('Mental'),
      seccion('Gustos'),
      seccion('Familia y Amigos'),
      seccion('Enemistades'),
      seccion('Personales'),
      seccion('Profesionales'),
      seccion('Roles'),
      seccion('Dinero Actual'),
      seccion('Equipamiento'),
      seccion('Descripción General'),
      seccion('Historia Breve'),
      seccion('Rol en la Sociedad'),
      seccion('Rasgos y Capacidades'),
      seccion('Riesgos, Debilidades y Defectos'),
      seccion('DM e Impacto Narrativo'),
    ],
  },

  Objetos: {
    campos: [
      texto('alias'),
      lista('tipo item', 'tiposItem'),
      lista('rareza', 'rarezas'),
      texto('origen'),
      texto('atributos'),
      texto('estado'),
      texto('valor'),
    ],
    secciones: [
      seccion('Descripción General'),
      seccion('Propiedades y Rasgos'),
      seccion('Historia y Origen'),
    ],
  },

  'Facciones': {
    campos: [
      texto('Tipo', { valor: 'Facción' }),
      lista('Sede', 'localidades'),
      texto('Fundación'),
      texto('Líder'),
      texto('Ámbito'),
    ],
    secciones: [
      seccion('Descripción General'),
      seccion('Historia'),
      seccion('Objetivos'),
      seccion('Miembros Destacados'),
      seccion('Recursos y Poder'),
      seccion('Relaciones'),
    ],
  },

  Lenguas: {
    campos: [
      texto('Tipo', { valor: 'Lengua' }),
      texto('Familia'),
      texto('Hablantes'),
      texto('Escritura'),
    ],
    secciones: [
      seccion('Descripción General'),
      seccion('Origen e Historia'),
      seccion('Gramática y Fonética'),
      seccion('Escritura'),
      seccion('Variantes y Dialectos'),
      seccion('Relaciones'),
    ],
  },
};

const CATALOGOS = {
  continentes: 'continentes',
  zonas: 'zonas',
  reinos: 'reinos',
  tipos: 'tipos',
  localidades: 'localidades',
  razas: 'razas',
  tiposItem: 'tiposItem',
  rarezas: 'rarezas',
  estadosVitales: 'estadosVitales',
};

function fichaDe(categoriaNombre) {
  return FICHAS[categoriaNombre] || { campos: [], secciones: [] };
}

function limpiarValor(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function limpiarCuerpo(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim();
}

function esFilaSeparadora(celdas) {
  return /^[-\s]+$/.test(celdas[1]) || /^[-\s]+$/.test(celdas[2]);
}

// Divide el cuerpo en bloques por los títulos de nivel 3 (###). Los títulos de
// otro nivel quedan dentro del bloque al que pertenecen.
function separarSecciones(markdown) {
  const lineas = String(markdown || '').split('\n');
  const bloques = [];
  let actual = { titulo: null, lineas: [] };

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (/^###\s+/.test(limpia)) {
      bloques.push(actual);
      actual = { titulo: limpia.replace(/^###\s+/, '').trim(), lineas: [] };
    } else {
      actual.lineas.push(linea);
    }
  }
  bloques.push(actual);

  return bloques.map((bloque) => ({
    titulo: bloque.titulo,
    contenido: bloque.lineas.join('\n').trim(),
  }));
}

function leerFilasFicha(ficha) {
  const filas = [];
  if (!ficha) return filas;

  for (const linea of ficha.split('\n')) {
    if (linea.trim().charAt(0) !== '|') continue;
    const celdas = linea.split('|').map((celda) => celda.trim());
    if (celdas.length < 4) continue;
    if (normalizar(celdas[1]) === 'campo' || esFilaSeparadora(celdas)) continue;
    if (!celdas[1]) continue;
    filas.push({ etiqueta: celdas[1], valor: celdas[2] });
  }

  return filas;
}

// Markdown de un artículo -> valores por campo, por sección, cuerpo libre y
// filas de ficha que no pertenecen a ningún campo de la categoría.
function parsearContenido(markdown, categoriaNombre) {
  const config = fichaDe(categoriaNombre);
  const { ficha, cuerpo } = separarFicha(markdown || '');
  const filas = leerFilasFicha(ficha);
  const mapa = new Map(filas.map((fila) => [normalizar(fila.etiqueta), fila.valor]));

  const valores = {};
  const usadas = new Set();
  for (const campo of config.campos) {
    const clave = normalizar(campo.etiqueta);
    if (mapa.has(clave)) {
      valores[campo.etiqueta] = mapa.get(clave);
      usadas.add(clave);
    } else {
      valores[campo.etiqueta] = campo.valor || '';
    }
  }
  const extras = filas.filter((fila) => !usadas.has(normalizar(fila.etiqueta)));

  const titulos = new Map(config.secciones.map((s) => [normalizar(s.titulo), s]));
  const secciones = {};
  const preambulo = [];

  for (const bloque of separarSecciones(cuerpo)) {
    if (bloque.titulo === null) {
      if (bloque.contenido) preambulo.push(bloque.contenido);
      continue;
    }
    const definida = titulos.get(normalizar(bloque.titulo));
    if (!definida) {
      preambulo.push(`### ${bloque.titulo}\n\n${bloque.contenido}`.trim());
    } else if (!definida.auto) {
      secciones[definida.titulo] = bloque.contenido;
    }
    // Las secciones automáticas se descartan: se regeneran al mostrar.
  }

  for (const definida of config.secciones) {
    if (secciones[definida.titulo] === undefined) secciones[definida.titulo] = '';
  }

  return { valores, extras, secciones, cuerpo: preambulo.join('\n\n').trim() };
}

// Compone el Markdown final: la ficha, el cuerpo libre, las secciones escritas y,
// al final de cada grupo, los títulos de las secciones automáticas vacíos para
// que el servidor los rellene al mostrar el artículo.
function componerContenido(categoriaNombre, valores, secciones, cuerpo, extras) {
  const config = fichaDe(categoriaNombre);
  const filas = [];

  for (const campo of config.campos) {
    const valor = limpiarValor(valores ? valores[campo.etiqueta] : '');
    if (valor) filas.push({ etiqueta: campo.etiqueta, valor });
  }

  for (const extra of extras || []) {
    const etiqueta = limpiarValor(extra && extra.etiqueta);
    const valor = limpiarValor(extra && extra.valor);
    if (etiqueta && valor) filas.push({ etiqueta, valor });
  }

  const partes = [];
  if (filas.length) {
    partes.push(
      '## Ficha\n\n| Campo | Valor |\n| --- | --- |\n' +
        filas.map((fila) => `| ${fila.etiqueta} | ${fila.valor} |`).join('\n')
    );
  }

  const contenidoCuerpo = limpiarCuerpo(cuerpo);
  if (contenidoCuerpo) partes.push(contenidoCuerpo);

  for (const definida of config.secciones) {
    const valor = limpiarCuerpo(secciones ? secciones[definida.titulo] : '');
    if (definida.auto) {
      partes.push(`### ${definida.titulo}`);
    } else {
      // Emitimos siempre la sección humana (aunque esté vacía) para preservar
      // la estructura del artículo original.
      partes.push(valor ? `### ${definida.titulo}\n\n${valor}` : `### ${definida.titulo}`);
    }
  }

  return `${partes.join('\n\n').trim()}\n`;
}

module.exports = {
  FICHAS,
  CATALOGOS,
  fichaDe,
  normalizar,
  parsearContenido,
  componerContenido,
};
