'use strict';

function normalizarTitulo(texto) {
  return texto
    .replace(/^#{2,3}\s*/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buscarSeccion(lineas, titulo) {
  const objetivo = normalizarTitulo(titulo);
  const inicio = lineas.findIndex(
    (linea) =>
      /^#{2,3}\s/.test(linea.trim()) && normalizarTitulo(linea) === objetivo
  );
  if (inicio === -1) return null;

  let fin = lineas.length;
  for (let i = inicio + 1; i < lineas.length; i++) {
    if (/^#{2,3}\s/.test(lineas[i].trim())) {
      fin = i;
      break;
    }
  }
  return { inicio, fin };
}

// Reemplaza el cuerpo de la sección por el markdown indicado.
function reemplazarCuerpo(markdown, titulo, cuerpo) {
  const lineas = markdown.split('\n');
  const seccion = buscarSeccion(lineas, titulo);
  if (!seccion) return markdown;

  const bloque = ['', ...cuerpo.split('\n'), ''];
  return lineas
    .slice(0, seccion.inicio + 1)
    .concat(bloque, lineas.slice(seccion.fin))
    .join('\n');
}

// Elimina la sección completa, encabezado incluido.
function eliminarSeccion(markdown, titulo) {
  const lineas = markdown.split('\n');
  const seccion = buscarSeccion(lineas, titulo);
  if (!seccion) return markdown;

  return lineas.slice(0, seccion.inicio).concat(lineas.slice(seccion.fin)).join('\n');
}

module.exports = { reemplazarCuerpo, eliminarSeccion };
