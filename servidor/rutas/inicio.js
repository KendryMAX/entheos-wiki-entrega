'use strict';

const express = require('express');
const db = require('../datos/base');

const router = express.Router();

const DESCRIPCIONES = {
  Continentes: 'Grandes masas de tierra del mundo conocido.',
  Personajes: 'Héroes, villanos y figuras que mueven la historia.',
  Objetos: 'Reliquias, armas y artefactos de poder.',
  Facciones: 'Órdenes, gremios y poderes en pugna.',
  Lenguas: 'Idiomas y formas de comunicación de Entheos.',
  Localidades: 'Ciudades, pueblos y aldeas de Entheos.',
  Regiones: 'Tierras y comarcas de cada continente.',
  Razas: 'Pueblos y linajes que habitan Entheos.',
  Armas: 'Acero, magia y herramientas de guerra.',
};

const IMAGENES_POR_CATEGORIA = {
  Continentes: '/subidas/Xi%C3%A1nor.jpeg',
  Facciones: '/subidas/Elaris%20-%20The%20Mills.png',
  Lenguas: '/subidas/Qasiyara.jpg',
};

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
      'item',
    ]);

    const publicados = await db.consultarUno(
      "SELECT COUNT(*) AS total FROM articulo WHERE estado = 'publicado' AND titulo NOT LIKE 'Plantilla%'"
    );

    const etiquetas = await db.consultar(
      `SELECT e.nombre, COUNT(ae.articulo_id) AS articulos
         FROM etiqueta e
         LEFT JOIN articulo_etiqueta ae ON ae.etiqueta_id = e.id
        GROUP BY e.id
        ORDER BY articulos DESC, e.nombre
        LIMIT 10`
    );

    let categorias = await db.consultar(
      `SELECT c.id, c.nombre,
              (SELECT COUNT(*) FROM articulo a
                WHERE a.categoria_id = c.id AND a.estado = 'publicado'
                  AND a.titulo NOT LIKE 'Plantilla%') AS articulos,
              (SELECT i.ruta FROM articulo a
                 JOIN imagen i ON i.id = a.imagen_id
                WHERE a.categoria_id = c.id AND a.imagen_id IS NOT NULL
                  AND a.titulo NOT LIKE 'Plantilla%'
                ORDER BY a.publicado_en DESC, a.id DESC
                LIMIT 1) AS imagen_ruta
         FROM categoria c
        WHERE EXISTS (SELECT 1 FROM articulo a
                       WHERE a.categoria_id = c.id AND a.estado = 'publicado'
                         AND a.titulo NOT LIKE 'Plantilla%')
        ORDER BY c.nombre`
    );

    categorias.sort((a, b) => a.nombre.localeCompare(b.nombre));

    categorias.forEach((categoria) => {
      categoria.descripcion =
        DESCRIPCIONES[categoria.nombre] || `Explora los artículos de ${categoria.nombre}.`;
      categoria.imagen_ruta =
        IMAGENES_POR_CATEGORIA[categoria.nombre] || categoria.imagen_ruta || null;
    });

    res.render('inicio', {
      titulo: 'Entheos Wiki',
      totales,
      publicados: publicados.total,
      etiquetas,
      categorias,
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
          AND a.titulo LIKE ?
          AND a.titulo NOT LIKE 'Plantilla%'
        ORDER BY a.titulo
        LIMIT 50`,
      [`%${termino}%`]
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