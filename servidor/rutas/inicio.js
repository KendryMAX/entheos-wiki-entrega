'use strict';

const express = require('express');
const db = require('../datos/base');

const router = express.Router();

async function contar(tablas) {
  const columnas = tablas
    .map((tabla) => `(SELECT COUNT(*) FROM \`${tabla}\`) AS \`${tabla}\``)
    .join(', ');

  const filas = await db.consultar(`SELECT ${columnas}`);
  return filas[0];
}

router.get('/', async (req, res, next) => {
  try {
    const totales = await contar([
      'articulo',
      'personaje',
      'localidad',
      'reino_estado',
      'evento',
      'item',
    ]);

    const publicados = await db.consultarUno(
      "SELECT COUNT(*) AS total FROM articulo WHERE estado = 'publicado'"
    );

    const recientes = await db.consultar(
      `SELECT a.id, a.titulo, a.slug, a.resumen, a.actualizado_en, u.nombre_completo
         FROM articulo a
         JOIN usuario u ON u.id = a.autor_id
        WHERE a.estado = 'publicado'
        ORDER BY a.publicado_en DESC
        LIMIT 6`
    );

    const etiquetas = await db.consultar(
      `SELECT e.nombre, COUNT(ae.articulo_id) AS articulos
         FROM etiqueta e
         LEFT JOIN articulo_etiqueta ae ON ae.etiqueta_id = e.id
        GROUP BY e.id
        ORDER BY articulos DESC, e.nombre
        LIMIT 10`
    );

    res.render('inicio', {
      titulo: 'Entheos Wiki',
      totales,
      publicados: publicados.total,
      recientes,
      etiquetas,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/personajes', async (req, res, next) => {
  try {
    const personajes = await db.consultar(
      `SELECT p.id, p.nombre, p.titulo, p.estado_vital, r.nombre AS raza
         FROM personaje p
         LEFT JOIN raza r ON r.id = p.raza_id
        ORDER BY p.nombre
        LIMIT 100`
    );

    res.render('personajes', { titulo: 'Personajes', personajes });
  } catch (error) {
    next(error);
  }
});

router.get('/lugares', async (req, res, next) => {
  try {
    const lugares = await db.consultar(
      `SELECT l.id, l.nombre, l.descripcion, ta.nombre AS tipo,
              re.nombre AS reino, z.nombre AS zona, z.tipo AS tipo_zona
         FROM localidad l
         LEFT JOIN tipo_asentamiento ta ON ta.id = l.tipo_asentamiento_id
         LEFT JOIN reino_estado re ON re.id = l.reino_estado_id
         LEFT JOIN zona_geografica z ON z.id = l.zona_geografica_id
        ORDER BY l.nombre
        LIMIT 100`
    );

    res.render('lugares', { titulo: 'Lugares', lugares });
  } catch (error) {
    next(error);
  }
});

router.get('/cronologia', async (req, res, next) => {
  try {
    const eras = await db.consultar(
      `SELECT e.id, e.nombre, e.descripcion, e.anio_inicio, e.anio_fin,
              (SELECT COUNT(*) FROM evento ev WHERE ev.era_id = e.id) AS eventos
         FROM era e
        ORDER BY e.anio_inicio IS NULL, e.anio_inicio`
    );

    const eraPedida = req.query.era ? Number(req.query.era) : null;

    const eventos = await db.consultar(
      `SELECT ev.id, ev.nombre, ev.descripcion, ev.fecha, ev.anio_aproximado,
              ev.es_canonico, e.nombre AS era, pi.nombre AS lugar
         FROM evento ev
         LEFT JOIN era e ON e.id = ev.era_id
         LEFT JOIN punto_interes pi ON pi.id = ev.lugar_id
        WHERE (? IS NULL OR ev.era_id = ?)
        ORDER BY ev.fecha IS NULL, ev.fecha, ev.anio_aproximado`,
      [eraPedida, eraPedida]
    );

    res.render('cronologia', { titulo: 'Cronologia', eras, eventos, eraPedida });
  } catch (error) {
    next(error);
  }
});

router.get('/buscar', async (req, res, next) => {
  try {
    const termino = String(req.query.q || '').trim();
    const quiereJson =
      req.query.formato === 'json' || req.get('Accept') === 'application/json';

    if (termino.length < 2) {
      if (quiereJson) return res.json([]);
      return res.render('buscar', { titulo: 'Buscar', termino, articulos: [] });
    }

    const articulos = await db.consultar(
      `SELECT a.id, a.titulo, a.slug, a.resumen, a.actualizado_en, c.nombre AS categoria
         FROM articulo a
         LEFT JOIN categoria c ON c.id = a.categoria_id
        WHERE a.estado = 'publicado'
          AND (a.titulo LIKE ? OR a.resumen LIKE ? OR a.contenido_md LIKE ?)
        ORDER BY a.titulo
        LIMIT 50`,
      [`%${termino}%`, `%${termino}%`, `%${termino}%`]
    );

    if (quiereJson) {
      return res.json(
        articulos.map((articulo) => ({
          titulo: articulo.titulo,
          enlace: `/articulos/${articulo.slug}`,
          tipo: articulo.categoria || 'Articulo',
        }))
      );
    }

    res.render('buscar', { titulo: 'Buscar', termino, articulos });
  } catch (error) {
    next(error);
  }
});

module.exports = router;