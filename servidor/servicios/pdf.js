'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const config = require('../configuracion');

const estilos = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1a1a1d;
    line-height: 1.6;
    margin: 0;
  }
  h1 { color: #8f7018; font-size: 22pt; margin: 0 0 6pt; border-bottom: 2px solid #c9a227; padding-bottom: 6pt; }
  h2 { color: #8f7018; font-size: 14pt; margin: 16pt 0 4pt; }
  h3 { font-size: 12pt; margin: 12pt 0 3pt; }
  .meta { font-size: 9pt; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 10pt; margin-bottom: 14pt; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 9.5pt; }
  th { background: #f0e6c8; color: #4a3a08; text-align: left; padding: 6pt; border: 1px solid #c9a227; }
  td { padding: 5pt 6pt; border: 1px solid #ddd; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .pie { position: fixed; bottom: -10mm; left: 0; right: 0; font-size: 8pt; color: #888; text-align: center; }
  .vacio { color: #888; font-style: italic; }
`;

function envoltorio(titulo, cuerpo, pie) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<style>${estilos}</style>
</head>
<body>
<h1>${titulo}</h1>
${cuerpo}
<div class="pie">Entheos Wiki &middot; ${pie}</div>
</body>
</html>`;
}

function escapar(valor) {
  return String(valor === null || valor === undefined ? '' : valor).replace(
    /[&<>"']/g,
    (caracter) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]
  );
}

function tablaHtml(columnas, filas, tituloColumnas) {
  if (filas.length === 0) {
    return '<p class="vacio">No hay datos para los filtros seleccionados.</p>';
  }

  const encabezado = tituloColumnas
    .map((columna) => `<th>${escapar(columna)}</th>`)
    .join('');

  const cuerpo = filas
    .map((fila) => {
      const celdas = columnas
        .map((columna) => `<td>${escapar(fila[columna])}</td>`)
        .join('');
      return `<tr>${celdas}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table>`;
}

async function htmlAPdf(html, archivoSalida) {
  if (!fs.existsSync(config.pdf.edge)) {
    throw new Error(
      'No se encontro Edge en ' + config.pdf.edge + '. Revisa la variable EDGE del .env.'
    );
  }

  fs.mkdirSync(path.dirname(archivoSalida), { recursive: true });

  const navegador = await puppeteer.launch({
    executablePath: config.pdf.edge,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    const pagina = await navegador.newPage();
    await pagina.setContent(html, { waitUntil: 'networkidle0' });
    await pagina.pdf({
      path: archivoSalida,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
    });
  } finally {
    await navegador.close();
  }

  return archivoSalida;
}

async function articuloAPdf(articulo, archivoSalida) {
  const etiquetas = articulo.etiquetas
    ? '<p style="font-size:9pt;color:#666">Etiquetas: ' +
      escapar(articulo.etiquetas) +
      '</p>'
    : '';

  const cuerpo = `
    <div class="meta">
      Autor: ${escapar(articulo.autor)} &middot;
      Categoria: ${escapar(articulo.categoria || 'sin categoria')} &middot;
      Estado: ${escapar(articulo.estado)} &middot;
      Actualizado: ${escapar(articulo.actualizado_en)}
    </div>
    ${etiquetas}
    ${articulo.contenido_html || '<p class="vacio">Sin contenido.</p>'}
  `;

  return htmlAPdf(
    envoltorio(articulo.titulo, cuerpo, 'Articulo'),
    archivoSalida
  );
}

async function reporteAPdf(titulo, columnas, filas, tituloColumnas, archivoSalida) {
  const cuerpo = `
    <p class="meta">Generado el ${escapar(new Date().toLocaleString('es-AR'))}</p>
    <p class="vacio">${filas.length} fila(s) en el reporte.</p>
    ${tablaHtml(columnas, filas, tituloColumnas)}
  `;

  return htmlAPdf(envoltorio(titulo, cuerpo, 'Reporte'), archivoSalida);
}

module.exports = { htmlAPdf, articuloAPdf, reporteAPdf, tablaHtml, envoltorio, escapar };