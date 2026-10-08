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

function markdownAHtml(markdown) {
  const limpio = sanitizeHtml(markdown || '', {
    allowedTags: etiquetasPermitidas,
    allowedAttributes: atributosPermitidos,
    allowedSchemes: ['http', 'https', 'mailto'],
  });

  return marked.parse(limpio, { mangle: false });
}

module.exports = { markdownAHtml };