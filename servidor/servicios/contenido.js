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

module.exports = { markdownAHtml, articuloAHtml, separarFicha };