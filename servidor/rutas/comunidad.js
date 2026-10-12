'use strict';

const express = require('express');

const db = require('../datos/base');
const { requiereSesion } = require('../capas/autenticacion');
const errores = require('../capas/errores');

const router = express.Router();

router.get('/comunidad', async (req, res, next) => {
  try {
    const mensajes = await db.consultar(
      `SELECT m.id, m.contenido, m.creado_en,
              u.id AS usuario_id, u.nombre_usuario, u.nombre_completo, u.avatar_url,
              r.nombre AS rol
         FROM mensaje_comunidad m
         JOIN usuario u ON u.id = m.usuario_id
         LEFT JOIN rol r ON r.id = u.rol_id
        ORDER BY m.creado_en ASC, m.id ASC
        LIMIT 200`
    );

    const miembros = await db.consultar(
      `SELECT u.id, u.nombre_usuario, u.nombre_completo, u.avatar_url, r.nombre AS rol,
              (SELECT COUNT(*) FROM mensaje_comunidad m WHERE m.usuario_id = u.id) AS mensajes
         FROM usuario u
         LEFT JOIN rol r ON r.id = u.rol_id
        WHERE u.activo = 1
        ORDER BY r.id DESC, u.nombre_usuario`
    );

    res.render('comunidad', { titulo: 'Comunidad', mensajes, miembros });
  } catch (error) {
    next(error);
  }
});

router.post('/comunidad', requiereSesion, async (req, res, next) => {
  try {
    const contenido = String(req.body.contenido || '').trim();

    if (contenido.length < 2) {
      throw errores.prohibido('El mensaje es muy corto.');
    }

    await db.ejecutar(
      'INSERT INTO mensaje_comunidad (usuario_id, contenido) VALUES (?, ?)',
      [res.locals.usuario.id, contenido.slice(0, 1000)]
    );

    res.redirect('/comunidad#chat-final');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
