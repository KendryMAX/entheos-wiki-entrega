'use strict';

const express = require('express');

const db = require('../datos/base');
const config = require('../configuracion');
const { markdownAHtml, articuloAHtml, separarFicha } = require('../servicios/contenido');
const { requiereSesion } = require('../capas/autenticacion');
const errores = require('../capas/errores');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const porPagina = config.articulosPagina;
    const desde = (pagina - 1) * porPagina;

    const condiciones = [];
    const valores = [];

    if (!res.locals.puede(res.locals.NIVELES.Editor)) {
      condiciones.push("a.estado = 'publicado'");
    }

    if (req.query.categoria) {
      condiciones.push('a.categoria_id = ?');
      valores.push(Number(req.query.categoria));
    }

    if (req.query.etiqueta) {
      condiciones.push(
        `EXISTS (SELECT 1 FROM articulo_etiqueta ae
                   JOIN etiqueta e ON e.id = ae.etiqueta_id
                  WHERE ae.articulo_id = a.id AND e.nombre = ?)`
      );
      valores.push(String(req.query.etiqueta));
    }

    const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const total = await db.consultarUno(
      `SELECT COUNT(*) AS total FROM articulo a ${donde}`,
      valores
    );

    const articulos = await db.consultar(
      `SELECT a.id, a.titulo, a.slug, a.resumen, a.estado, a.vistas, a.actualizado_en,
              c.nombre AS categoria, u.nombre_usuario AS autor, i.ruta AS imagen_ruta,
              (SELECT COUNT(*) FROM comentario co
                WHERE co.articulo_id = a.id AND co.estado = 'aprobado') AS comentarios
         FROM articulo a
         LEFT JOIN categoria c ON c.id = a.categoria_id
         LEFT JOIN usuario u ON u.id = a.autor_id
         LEFT JOIN imagen i ON i.id = a.imagen_id
         ${donde}
        ORDER BY a.actualizado_en DESC
        LIMIT ? OFFSET ?`,
      [...valores, porPagina, desde]
    );

    const categorias = await db.consultar(
      `SELECT c.id, c.nombre,
              (SELECT COUNT(*) FROM articulo a2
                WHERE a2.categoria_id = c.id AND a2.estado = 'publicado') AS articulos
         FROM categoria c
        ORDER BY c.nombre`
    );

    res.render('articulos', {
      titulo: 'Articulos',
      articulos,
      categorias,
      categoriaActual: req.query.categoria ? Number(req.query.categoria) : null,
      pagina,
      paginas: Math.max(1, Math.ceil(total.total / porPagina)),
      total: total.total,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug);

    const articulo = await db.consultarUno(
      `SELECT a.*, c.nombre AS categoria, u.nombre_usuario AS autor,
              u.nombre_completo AS autor_nombre, r.nombre AS autor_rol,
              rev.nombre_usuario AS revisor, i.ruta AS imagen_ruta
         FROM articulo a
         LEFT JOIN categoria c ON c.id = a.categoria_id
         LEFT JOIN usuario u ON u.id = a.autor_id
         LEFT JOIN rol r ON r.id = u.rol_id
         LEFT JOIN usuario rev ON rev.id = a.revisor_id
         LEFT JOIN imagen i ON i.id = a.imagen_id
        WHERE a.slug = ?
        LIMIT 1`,
      [slug]
    );

    errores.requerido(articulo, 'Ese artículo no existe.');

    if (articulo.estado !== 'publicado') {
      errores.permitido(
        res.locals.puede(res.locals.NIVELES.Editor),
        'Ese artículo todavía no está publicado.'
      );
    }

    const partes = separarFicha(articulo.contenido_md);
    const convertido = articuloAHtml(partes.cuerpo);
    articulo.contenido_html = convertido.html;
    articulo.indice = convertido.indice;
    articulo.ficha_html = partes.ficha.trim() ? markdownAHtml(partes.ficha) : '';

    const etiquetas = await db.consultar(
      `SELECT e.nombre FROM etiqueta e
         JOIN articulo_etiqueta ae ON ae.etiqueta_id = e.id
        WHERE ae.articulo_id = ?
        ORDER BY e.nombre`,
      [articulo.id]
    );

    const relacionadas = await db.consultar(
      `SELECT a2.id, a2.titulo, a2.slug, ar.tipo_relacion
         FROM articulo_relacion ar
         JOIN articulo a2 ON a2.id = ar.articulo_relacionado_id
        WHERE ar.articulo_id = ?
        ORDER BY a2.titulo
        LIMIT 10`,
      [articulo.id]
    );

    const comentarios = await db.consultar(
      `SELECT co.id, co.contenido, co.creado_en, u.nombre_usuario, u.avatar_url
         FROM comentario co
         JOIN usuario u ON u.id = co.usuario_id
        WHERE co.articulo_id = ? AND co.estado = 'aprobado'
        ORDER BY co.creado_en`,
      [articulo.id]
    );

    if (!res.locals.usuario || res.locals.usuario.id !== articulo.autor_id) {
      await db.ejecutar('UPDATE articulo SET vistas = vistas + 1 WHERE id = ?', [articulo.id]);
    }

    res.render('articulo', { titulo: articulo.titulo, articulo, etiquetas, relacionadas, comentarios });
  } catch (error) {
    next(error);
  }
});

router.post('/:slug/comentarios', requiereSesion, async (req, res, next) => {
  try {
    const contenido = String(req.body.contenido || '').trim();

    if (contenido.length < 3) {
      throw errores.prohibido('El comentario es muy corto.');
    }

    const articulo = await db.consultarUno(
      "SELECT id, slug FROM articulo WHERE slug = ? AND estado = 'publicado' LIMIT 1",
      [String(req.params.slug)]
    );

    errores.requerido(articulo, 'Ese artículo no existe.');

    await db.ejecutar(
      'INSERT INTO comentario (articulo_id, usuario_id, contenido, estado) VALUES (?, ?, ?, ?)',
      [articulo.id, res.locals.usuario.id, contenido.slice(0, 2000), 'pendiente']
    );

    res.redirect(`/articulos/${articulo.slug}#comentarios`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;