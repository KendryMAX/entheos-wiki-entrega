'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../datos/base');
const config = require('../configuracion');
const pdf = require('../servicios/pdf');

const router = express.Router();

const REPORTES = [
  {
    clave: 'localidades-por-tipo',
    titulo: 'Localidades por tipo de asentamiento',
    descripcion:
      'Cuántas localidades hay por tipo de asentamiento, las zonas donde se concentran y la antigüedad de su fundación.',
    archivo: 'reporte-localidades-por-tipo.pdf',
    columnas: ['tipo', 'localidades', 'zonas', 'fundacion_mas_antigua', 'fundacion_mas_reciente'],
    tituloColumnas: ['Tipo de asentamiento', 'Localidades', 'Zonas', 'Fundación más antigua', 'Fundación más reciente'],
    sql: `
      SELECT ta.nombre AS tipo,
             COUNT(*) AS localidades,
             GROUP_CONCAT(DISTINCT z.nombre ORDER BY z.nombre SEPARATOR ', ') AS zonas,
             MIN(l.fundacion) AS fundacion_mas_antigua,
             MAX(l.fundacion) AS fundacion_mas_reciente
        FROM localidad l
        JOIN tipo_asentamiento ta ON ta.id = l.tipo_asentamiento_id
        LEFT JOIN zona_geografica z ON z.id = l.zona_geografica_id
       GROUP BY ta.id
       ORDER BY localidades DESC, ta.nombre`,
  },
  {
    clave: 'razas-por-localidad',
    titulo: 'Razas y su presencia por localidad',
    descripcion: 'Qué razas habitan cada localidad, con el promedio de población y sus subrazas.',
    archivo: 'reporte-razas-por-localidad.pdf',
    columnas: ['raza', 'localidades', 'porcentaje_promedio', 'donde', 'subrazas'],
    tituloColumnas: ['Raza', 'Localidades', 'Porcentaje promedio', 'Dónde', 'Subrazas'],
    sql: `
      SELECT r.nombre AS raza,
             COUNT(DISTINCT rl.localidad_id) AS localidades,
             ROUND(AVG(rl.porcentaje_poblacion), 2) AS porcentaje_promedio,
             GROUP_CONCAT(DISTINCT l.nombre ORDER BY l.nombre SEPARATOR ', ') AS donde,
             GROUP_CONCAT(DISTINCT sr.nombre ORDER BY sr.nombre SEPARATOR ', ') AS subrazas
        FROM raza_localidad rl
        JOIN raza r ON r.id = rl.raza_id
        JOIN localidad l ON l.id = rl.localidad_id
        LEFT JOIN subraza sr ON sr.raza_id = r.id
       GROUP BY r.id
       ORDER BY localidades DESC, r.nombre`,
  },
  {
    clave: 'recursos-e-items',
    titulo: 'Recursos y los ítems que los requieren',
    descripcion: 'Cada recurso del mundo y qué ítems lo consumen, con la cantidad total requerida.',
    archivo: 'reporte-recursos-e-items.pdf',
    columnas: ['recurso', 'unidad_medida', 'items', 'items_que_lo_usan', 'cantidad_total'],
    tituloColumnas: ['Recurso', 'Unidad de medida', 'Ítems', 'Ítems que lo usan', 'Cantidad total'],
    sql: `
      SELECT r.nombre AS recurso,
             r.unidad_medida,
             COUNT(DISTINCT ir.item_id) AS items,
             GROUP_CONCAT(DISTINCT i.nombre ORDER BY i.nombre SEPARATOR ', ') AS items_que_lo_usan,
             SUM(ir.cantidad_requerida) AS cantidad_total
        FROM recurso r
        LEFT JOIN item_recurso ir ON ir.recurso_id = r.id
        LEFT JOIN item i ON i.id = ir.item_id
       GROUP BY r.id
       ORDER BY items DESC, r.nombre`,
  },
  {
    clave: 'inventario-por-faccion',
    titulo: 'Inventario por facción y personaje',
    descripcion: 'Los objetos que posee cada personaje dentro de las facciones.',
    archivo: 'reporte-inventario-por-faccion.pdf',
    columnas: ['faccion', 'miembros', 'personaje', 'objetos', 'inventario'],
    tituloColumnas: ['Facción', 'Miembros', 'Personaje', 'Objetos', 'Inventario'],
    sql: `
      SELECT f.nombre AS faccion,
             COUNT(DISTINCT pf.personaje_id) AS miembros,
             p.nombre AS personaje,
             COUNT(DISTINCT pi.item_id) AS objetos,
             GROUP_CONCAT(DISTINCT i.nombre ORDER BY i.nombre SEPARATOR ', ') inventario
        FROM faccion f
        JOIN personaje_faccion pf ON pf.faccion_id = f.id
        JOIN personaje p ON p.id = pf.personaje_id
        LEFT JOIN personaje_item pi ON pi.personaje_id = p.id
        LEFT JOIN item i ON i.id = pi.item_id
       GROUP BY f.id, p.id
       ORDER BY f.nombre, objetos DESC, p.nombre`,
  },
  {
    clave: 'cronologia-por-faccion',
    titulo: 'Cronología por era y facción',
    descripcion: 'Los eventos ordenados por era, con las facciones y personajes participantes.',
    archivo: 'reporte-cronologia-por-faccion.pdf',
    columnas: ['era', 'evento', 'fecha', 'faccion', 'personaje', 'papel'],
    tituloColumnas: ['Era', 'Evento', 'Fecha', 'Facción', 'Personaje', 'Papel'],
    sql: `
      SELECT e.nombre AS era,
             ev.nombre AS evento,
             ev.fecha,
             f.nombre AS faccion,
             p.nombre AS personaje,
             ep.papel
        FROM evento ev
        JOIN era e ON e.id = ev.era_id
        LEFT JOIN evento_participante ep ON ep.evento_id = ev.id
        LEFT JOIN personaje p ON p.id = ep.personaje_id
        LEFT JOIN personaje_faccion pf ON pf.personaje_id = p.id
        LEFT JOIN faccion f ON f.id = pf.faccion_id
       ORDER BY ev.fecha IS NULL, ev.fecha, f.nombre, p.nombre`,
  },
  {
    clave: 'articulos-mas-comentados',
    titulo: 'Artículos más comentados',
    descripcion: 'Los artículos con más comentarios, aprobados y pendientes, y su relación por cada mil vistas.',
    archivo: 'reporte-articulos-mas-comentados.pdf',
    columnas: ['titulo', 'autor', 'categoria', 'comentarios', 'aprobados', 'pendientes', 'vistas', 'comentarios_por_mil_visitas'],
    tituloColumnas: ['Título', 'Autor', 'Categoría', 'Comentarios', 'Aprobados', 'Pendientes', 'Vistas', 'Coment. x mil vistas'],
    sql: `
      SELECT a.titulo,
             u.nombre_usuario AS autor,
             c.nombre AS categoria,
             COUNT(co.id) AS comentarios,
             SUM(co.estado = 'aprobado') AS aprobados,
             SUM(co.estado = 'pendiente') AS pendientes,
             a.vistas,
             ROUND(COUNT(co.id) / (a.vistas / 1000), 2) AS comentarios_por_mil_visitas
        FROM articulo a
        JOIN usuario u ON u.id = a.autor_id
        LEFT JOIN categoria c ON c.id = a.categoria_id
        LEFT JOIN comentario co ON co.articulo_id = a.id
       GROUP BY a.id
       ORDER BY comentarios DESC, a.vistas DESC`,
  },
];

router.get('/reportes', (req, res) => {
  res.render('reportes', { titulo: 'Reportes', reportes: REPORTES, aviso: null });
});

router.get('/reportes/:clave', async (req, res) => {
  try {
    const reporte = REPORTES.find((r) => r.clave === req.params.clave);

    if (!reporte) {
      res.status(404).render('reportes', {
        titulo: 'Reportes',
        reportes: REPORTES,
        aviso: 'Ese reporte no existe.',
      });
      return;
    }

    const filas = await db.consultar(reporte.sql);
    const carpeta = path.join(config.rutas.pdf, 'reportes');
    fs.mkdirSync(carpeta, { recursive: true });
    const archivo = path.join(carpeta, reporte.archivo);

    await pdf.reporteAPdf(reporte.titulo, reporte.columnas, filas, reporte.tituloColumnas, archivo);
    res.download(archivo, reporte.archivo);
  } catch (error) {
    res.status(500).render('reportes', {
      titulo: 'Reportes',
      reportes: REPORTES,
      aviso: 'No se pudo generar el reporte: ' + error.message,
    });
  }
});

module.exports = router;