'use strict';

const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const etiquetasPermitidas = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const atributosPermitidos = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  code: ['class'],
};

function limpiar(markdown) {
  return sanitizeHtml(markdown || '', {
    allowedTags: etiquetasPermitidas,
    allowedAttributes: atributosPermitidos,
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

function markdownAHtml(markdown) {
  return marked.parse(limpiar(markdown), { mangle: false });
}

function slugificar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function separarFicha(markdown) {
  const lineas = String(markdown || '').split('\n');
  const inicio = lineas.findIndex((linea) => linea.trim() === '## Ficha');
  if (inicio === -1) {
    return { ficha: '', cuerpo: markdown };
  }

  let fin = inicio;
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    const linea = lineas[i];
    if (linea.trim() === '') continue;
    if (linea.startsWith('|')) {
      fin = i;
      continue;
    }
    break;
  }

  return {
    ficha: lineas.slice(inicio + 1, fin + 1).join('\n').trim(),
    cuerpo: lineas.slice(fin + 1).join('\n').trim(),
  };
}

function articuloAHtml(markdown) {
  const html = markdownAHtml(markdown);
  const indice = [];
  const usados = new Set();

  const conIds = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (coincidencia, nivel, contenido) => {
    const plano = contenido.replace(/<[^>]+>/g, '').trim();
    const base = slugificar(plano) || `seccion-${indice.length}`;
    let id = base;
    let n = 2;
    while (usados.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    usados.add(id);
    indice.push({ nivel: Number(nivel), texto: plano, id });
    return `<h${nivel} id="${id}">${contenido}</h${nivel}>`;
  });

  return { html: conIds, indice };
}

function campoFicha(markdown, etiqueta) {
  const { ficha } = separarFicha(markdown);
  if (!ficha) return '';
  const objetivo = String(etiqueta).toLowerCase();
  for (const linea of ficha.split('\n')) {
    const celdas = linea.split('|').map((c) => c.trim());
    if (celdas.length < 4) continue;
    if (celdas[1].toLowerCase() === objetivo) return celdas[2];
  }
  return '';
}

function esSubraza(markdown) {
  return campoFicha(markdown, 'Tipo').toLowerCase() === 'subraza'
    || campoFicha(markdown, 'Raza principal') !== '';
}

// --- Enlaces automáticos dentro de la ficha ---------------------------------

function normalizarTexto(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escaparRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Permite que un título acentuado coincida también con su forma sin tilde
// (por ejemplo «Ardhorlogck» con «Ärdhorløgck»).
function patronTitulo(titulo) {
  return String(titulo)
    .split('')
    .map((caracter) => {
      const base = caracter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (base && base !== caracter) {
        return `[${escaparRegex(caracter)}${escaparRegex(base)}]`;
      }
      return escaparRegex(caracter);
    })
    .join('');
}

/**
 * Convierte en enlaces los valores de la ficha que coinciden con el título de
 * otro artículo. Recibe el Markdown de la ficha y la lista de artículos
 * ({ titulo, slug }); devuelve la misma ficha con enlaces Markdown.
 */
function enlazarFicha(ficha, articulos) {
  if (!ficha) return ficha;

  const lista = (articulos || []).filter((a) => a && a.titulo && a.slug);
  if (!lista.length) return ficha;

  const porLongitud = [...lista].sort((a, b) => b.titulo.length - a.titulo.length);
  const mapa = new Map();
  for (const a of lista) mapa.set(normalizarTexto(a.titulo), a.slug);

  const alternativas = porLongitud.map((a) => patronTitulo(a.titulo));
  let patron;
  try {
    patron = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${alternativas.join('|')})(?![\\p{L}\\p{N}])`,
      'giu'
    );
  } catch {
    return ficha;
  }

  return String(ficha)
    .split('\n')
    .map((linea) => {
      if (linea.trim().charAt(0) !== '|') return linea;
      const celdas = linea.split('|');
      if (celdas.length < 4) return linea;
      for (let i = 2; i < celdas.length - 1; i += 1) {
        celdas[i] = celdas[i].replace(patron, (coincidencia) => {
          const slug = mapa.get(normalizarTexto(coincidencia));
          return slug ? `[${coincidencia}](/articulos/${slug})` : coincidencia;
        });
      }
      return celdas.join('|');
    })
    .join('\n');
}

module.exports = {
  markdownAHtml,
  articuloAHtml,
  separarFicha,
  campoFicha,
  esSubraza,
  enlazarFicha,
};