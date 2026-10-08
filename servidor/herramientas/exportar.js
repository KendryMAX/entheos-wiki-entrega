'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../datos/base');
const config = require('../configuracion');
const pdf = require('../servicios/pdf');
const { markdownAHtml } = require('../servicios/contenido');

const CARPETA_ARTICULOS = path.join(config.rutas.pdf, 'articulos');
const CARPETA_REPORTES = path.join(config.rutas.pdf, 'reportes');

function nombreArchivo(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function relative(ruta) {
  return path.relative(config.rutas.raiz, ruta);
}

async function exportarArticulos(destino, slug) {
  const condiciones = ["a.estado = 'publicado'"];
  const valores = [];

  if (slug) {
    condiciones.push('a.slug = ?');
    valores.push(slug);
  }

  const articulos = await db.consultar(
    `SELECT a.titulo, a.slug, a.contenido_md, a.estado, a.actualizado_en,
            u.nombre_usuario AS autor, c.nombre AS categoria,
            GROUP_CONCAT(e.nombre ORDER BY e.nombre SEPARATOR ', ') AS etiquetas
       FROM articulo a
       JOIN usuario u ON u.id = a.autor_id
       LEFT JOIN categoria c ON c.id = a.categoria_id
       LEFT JOIN articulo_etiqueta ae ON ae.articulo_id = a.id
       LEFT JOIN etiqueta e ON e.id = ae.etiqueta_id
      WHERE ${condiciones.join(' AND ')}
      GROUP BY a.id
      ORDER BY a.titulo`,
    valores
  );

  if (articulos.length === 0) {
    console.log(slug ? 'No hay ningun articulo con el slug ' + slug + '.' : 'No hay articulos publicados.');
    return;
  }

  fs.mkdirSync(destino, { recursive: true });

  for (const articulo of articulos) {
    const archivo = path.join(destino, nombreArchivo(articulo.titulo || articulo.slug) + '.pdf');
    await pdf.articuloAPdf(
      { ...articulo, contenido_html: markdownAHtml(articulo.contenido_md) },
      archivo
    );
    console.log('PDF creado: ' + relative(archivo));
  }

  console.log(articulos.length + ' PDF en ' + relative(destino));
}

const REPORTE_LOCALIDADES = {
  titulo: 'Localidades por tipo de asentamiento',
  columnas: ['tipo', 'localidades', 'zonas', 'fundacion_mas_antigua'],
  tituloColumnas: ['Tipo de asentamiento', 'Localidades', 'Zonas', 'Fundacion mas antigua'],
  archivo: '01-localidades-por-tipo.pdf',
  sql: `SELECT ta.nombre AS tipo,
               COUNT(*) AS localidades,
               GROUP_CONCAT(DISTINCT z.nombre ORDER BY z.nombre SEPARATOR ', ') AS zonas,
               MIN(l.fundacion) AS fundacion_mas_antigua
          FROM localidad l
          JOIN tipo_asentamiento ta ON ta.id = l.tipo_asentamiento_id
          LEFT JOIN zona_geografica z ON z.id = l.zona_geografica_id
         GROUP BY ta.id
         ORDER BY localidades DESC, ta.nombre`,
};

async function exportarReportes(destino) {
  fs.mkdirSync(destino, { recursive: true });

  const reporte = REPORTE_LOCALIDADES;
  const filas = await db.consultar(reporte.sql);
  const archivo = path.join(destino, reporte.archivo);

  await pdf.reporteAPdf(reporte.titulo, reporte.columnas, filas, reporte.tituloColumnas, archivo);

  console.log('Reporte creado: ' + relative(archivo));
  console.log('El SQL de cada reporte esta en base-de-datos/Reportes para poder revisarlo.');
}

function leerArgumentos() {
  const flags = new Set();
  const valores = {};

  for (const argumento of process.argv.slice(2)) {
    if (argumento.startsWith('--slug=')) {
      valores.slug = argumento.slice(7);
    } else if (argumento.startsWith('--')) {
      flags.add(argumento.slice(2));
    } else if (!valores.destino) {
      valores.destino = path.resolve(argumento);
    }
  }

  return { flags, valores };
}

async function main() {
  const { flags, valores } = leerArgumentos();
  const destinoArticulos = valores.destino || CARPETA_ARTICULOS;
  const destinoReportes = valores.destino || CARPETA_REPORTES;

  const soloReportes = flags.has('reportes');

  if (!soloReportes) {
    await exportarArticulos(destinoArticulos, valores.slug);
  }

  if (!flags.has('articulos')) {
    await exportarReportes(destinoReportes);
  }
}

main()
  .then(() => db.grupo.end())
  .catch(async (error) => {
    console.error('No se pudo exportar: ' + error.message);
    await db.grupo.end().catch(() => {});
    process.exit(1);
  });