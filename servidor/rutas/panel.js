'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../datos/base');
const { NIVELES, requiereSesion, requiereEditor, requiereAdministrador } = require('../capas/autenticacion');
const errores = require('../capas/errores');

const router = express.Router();

function aSlug(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

router.get('/panel/articulos', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const articulos = await db.consultar(
      `SELECT a.id, a.titulo, a.slug, a.estado, a.actualizado_en,
              u.nombre_usuario AS autor
         FROM articulo a
         JOIN usuario u ON u.id = a.autor_id
        ORDER BY a.actualizado_en DESC
        LIMIT 200`
    );

    res.render('panel/articulos', { titulo: 'Artículos', articulos });
  } catch (error) {
    next(error);
  }
});

router.get('/panel/articulos/nuevo', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    res.render('panel/articuloForm', {
      titulo: 'Nuevo artículo',
      articulo: null,
      categorias: await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre'),
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/panel/articulos/:id/editar', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const articulo = await db.consultarUno('SELECT * FROM articulo WHERE id = ? LIMIT 1', [
      Number(req.params.id),
    ]);

    errores.requerido(articulo, 'Ese artículo no existe.');

    res.render('panel/articuloForm', {
      titulo: 'Editar artículo',
      articulo,
      categorias: await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre'),
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/panel/articulos', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const titulo = String(req.body.titulo || '').trim();
    const contenido = String(req.body.contenido || '').trim();
    const id = req.body.id ? Number(req.body.id) : null;

    const problemas = [];

    if (titulo.length < 3) problemas.push('El titulo debe tener al menos 3 caracteres.');
    if (contenido.length < 10) problemas.push('El contenido debe tener al menos 10 caracteres.');

    if (problemas.length > 0) {
      const categorias = await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre');
      return res.status(400).render('panel/articuloForm', {
        titulo: id ? 'Editar artículo' : 'Nuevo artículo',
        articulo: {
          id,
          titulo,
          resumen: String(req.body.resumen || '').slice(0, 500),
          contenido_md: contenido,
          estado: req.body.estado,
          categoria_id: req.body.categoria_id ? Number(req.body.categoria_id) : null,
        },
        categorias,
        error: problemas.join(' '),
      });
    }

    const slugBase = aSlug(titulo);
    let slug = slugBase;
    let intento = 1;

    while (true) {
      const existente = await db.consultarUno(
        'SELECT id FROM articulo WHERE slug = ? AND (? IS NULL OR id <> ?) LIMIT 1',
        [slug, id, id]
      );
      if (!existente) break;
      slug = `${slugBase}-${++intento}`;
    }

    const estado = ['borrador', 'en_revision', 'publicado', 'archivado'].includes(req.body.estado)
      ? req.body.estado
      : 'borrador';

    const categoriaId = req.body.categoria_id ? Number(req.body.categoria_id) : null;

    if (id) {
      await db.ejecutar(
        `UPDATE articulo
            SET titulo = ?, slug = ?, resumen = ?, contenido_md = ?, estado = ?, categoria_id = ?
          WHERE id = ?`,
        [titulo, slug, String(req.body.resumen || '').slice(0, 500), contenido, estado, categoriaId, id]
      );
    } else {
      await db.ejecutar(
        `INSERT INTO articulo (titulo, slug, resumen, contenido_md, estado, autor_id, categoria_id, publicado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, IF(? = 'publicado', NOW(), NULL))`,
        [titulo, slug, String(req.body.resumen || '').slice(0, 500), contenido, estado, res.locals.usuario.id, categoriaId, estado]
      );
    }

    res.redirect('/panel/articulos');
  } catch (error) {
    next(error);
  }
});

router.post('/panel/articulos/:id/borrar', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await db.ejecutar('UPDATE articulo SET estado = ? WHERE id = ?', ['archivado', id]);
    res.redirect('/panel/articulos');
  } catch (error) {
    next(error);
  }
});

router.get('/panel/revision', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const pendientes = await db.consultar(
      `SELECT a.id, a.titulo, a.estado, a.actualizado_en, u.nombre_usuario AS autor
         FROM articulo a
         JOIN usuario u ON u.id = a.autor_id
        WHERE a.estado IN ('en_revision', 'borrador')
        ORDER BY a.actualizado_en DESC`
    );

    res.render('panel/revision', { titulo: 'Revision', pendientes });
  } catch (error) {
    next(error);
  }
});

router.post('/panel/revision/:id', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const decision = req.body.decision;

    if (decision === 'aprobar') {
      await db.ejecutar(
        `UPDATE articulo SET estado = 'publicado', publicado_en = NOW(), revisor_id = ?, motivo_rechazo = NULL
          WHERE id = ?`,
        [res.locals.usuario.id, id]
      );
    } else if (decision === 'rechazar') {
      await db.ejecutar(
        "UPDATE articulo SET estado = 'rechazado', motivo_rechazo = ? WHERE id = ?",
        [String(req.body.motivo || '').slice(0, 500), id]
      );
    } else if (decision === 'devolver') {
      await db.ejecutar("UPDATE articulo SET estado = 'borrador' WHERE id = ?", [id]);
    }

    res.redirect('/panel/revision');
  } catch (error) {
    next(error);
  }
});

router.get('/panel/comentarios', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const comentarios = await db.consultar(
      `SELECT co.id, co.contenido, co.estado, co.creado_en,
              u.nombre_usuario, a.titulo, a.slug
         FROM comentario co
         JOIN usuario u ON u.id = co.usuario_id
         JOIN articulo a ON a.id = co.articulo_id
        ORDER BY co.creado_en DESC
        LIMIT 200`
    );

    res.render('panel/comentarios', { titulo: 'Comentarios', comentarios });
  } catch (error) {
    next(error);
  }
});

router.post('/panel/comentarios/:id', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const decision = req.body.decision;

    const destino = ['aprobar', 'rechazar'].includes(decision) ? decision : 'pendiente';
    await db.ejecutar('UPDATE comentario SET estado = ? WHERE id = ?', [destino, id]);

    res.redirect('/panel/comentarios');
  } catch (error) {
    next(error);
  }
});

router.get('/panel/usuarios', requiereSesion, requiereAdministrador(), async (req, res, next) => {
  try {
    const usuarios = await db.consultar(
      `SELECT u.id, u.nombre_usuario, u.email, u.nombre_completo, u.activo,
              u.creado_en, r.nombre AS rol,
              (SELECT COUNT(*) FROM articulo a WHERE a.autor_id = u.id) AS articulos
         FROM usuario u
         JOIN rol r ON r.id = u.rol_id
        ORDER BY u.nombre_usuario`
    );

    res.render('panel/usuarios', {
      titulo: 'Usuarios',
      usuarios,
      usuarioActual: res.locals.usuario,
      roles: Object.keys(NIVELES),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/panel/usuarios/:id/rol', requiereSesion, requiereAdministrador(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rol = String(req.body.rol || '');

    if (!Object.prototype.hasOwnProperty.call(NIVELES, rol)) {
      throw errores.prohibido('Ese rol no existe.');
    }

    if (id === res.locals.usuario.id) {
      throw errores.prohibido('No puedes cambiar tu propio rol.');
    }

    await db.ejecutar(
      'UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE nombre = ?) WHERE id = ?',
      [rol, id]
    );

    res.redirect('/panel/usuarios');
  } catch (error) {
    next(error);
  }
});

router.post('/panel/usuarios/:id/activo', requiereSesion, requiereAdministrador(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (id === res.locals.usuario.id) {
      throw errores.prohibido('No puedes desactivar tu propia cuenta.');
    }

    await db.ejecutar('UPDATE usuario SET activo = 1 - activo WHERE id = ?', [id]);
    res.redirect('/panel/usuarios');
  } catch (error) {
    next(error);
  }
});

router.post('/panel/usuarios/:id/contrasena', requiereSesion, requiereAdministrador(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const nueva = String(req.body.contrasena || '');

    if (nueva.length < 8) {
      throw errores.prohibido('La contraseña debe tener al menos 8 caracteres.');
    }

    const hash = await bcrypt.hash(nueva, 10);
    await db.ejecutar('UPDATE usuario SET password_hash = ? WHERE id = ?', [hash, id]);

    res.redirect('/panel/usuarios');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.aSlug = aSlug;