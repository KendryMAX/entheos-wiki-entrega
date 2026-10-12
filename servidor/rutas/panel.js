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

// Categorías que anclan su artículo a una fila de las tablas de mundo. Así, al
// crear o editar una nota, el editor la "coloca" en su continente, zona,
// reino o localidad y aparece sola en las tablas que se generan al mostrarla.
const CATEGORIAS_CON_UBICACION = ['Continentes', 'Regiones', 'Reinos y Estados', 'Localidades'];

async function catalogosUbicacion() {
  const [continentes, zonas, reinos, tipos, localidades] = await Promise.all([
    db.consultar('SELECT id, nombre FROM continente ORDER BY nombre'),
    db.consultar('SELECT id, nombre FROM zona_geografica ORDER BY nombre'),
    db.consultar('SELECT id, nombre FROM reino_estado WHERE disuelto = 0 ORDER BY nombre'),
    db.consultar('SELECT id, nombre FROM tipo_asentamiento ORDER BY nombre'),
    db.consultar('SELECT id, nombre FROM localidad ORDER BY nombre'),
  ]);

  return { continentes, zonas, reinos, tipos, localidades };
}

function ubicacionVacia() {
  return {
    continente_id: null,
    zona_geografica_id: null,
    reino_estado_id: null,
    tipo_asentamiento_id: null,
    capital_id: null,
  };
}

function numerosUbicacion(fuente) {
  const numero = (valor) => (valor ? Number(valor) : null);
  return {
    continente_id: numero(fuente && fuente.continente_id),
    zona_geografica_id: numero(fuente && fuente.zona_geografica_id),
    reino_estado_id: numero(fuente && fuente.reino_estado_id),
    tipo_asentamiento_id: numero(fuente && fuente.tipo_asentamiento_id),
    capital_id: numero(fuente && fuente.capital_id),
  };
}

async function ubicacionDeArticulo(articulo, categorias) {
  if (!articulo || !articulo.categoria_id) return ubicacionVacia();

  const categoria = categorias.find((c) => c.id === articulo.categoria_id);
  const nombre = categoria ? categoria.nombre : null;

  if (nombre === 'Localidades') {
    const fila = await db.consultarUno(
      'SELECT zona_geografica_id, reino_estado_id, tipo_asentamiento_id FROM localidad WHERE nombre = ? LIMIT 1',
      [articulo.titulo]
    );
    return fila ? numerosUbicacion(fila) : ubicacionVacia();
  }

  if (nombre === 'Regiones') {
    const fila = await db.consultarUno(
      'SELECT continente_id, reino_estado_id FROM zona_geografica WHERE nombre = ? LIMIT 1',
      [articulo.titulo]
    );
    return fila ? numerosUbicacion(fila) : ubicacionVacia();
  }

  if (nombre === 'Reinos y Estados') {
    const fila = await db.consultarUno(
      'SELECT continente_id, capital_id FROM reino_estado WHERE nombre = ? LIMIT 1',
      [articulo.titulo]
    );
    return fila ? numerosUbicacion(fila) : ubicacionVacia();
  }

  return ubicacionVacia();
}

async function guardarUbicacion(categoriaNombre, titulo, resumen, ubicacion) {
  if (!CATEGORIAS_CON_UBICACION.includes(categoriaNombre)) return;

  const descripcion = resumen ? String(resumen).slice(0, 500) : null;

  if (categoriaNombre === 'Continentes') {
    await db.ejecutar(
      `INSERT INTO continente (nombre, descripcion) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)`,
      [titulo, descripcion]
    );
  } else if (categoriaNombre === 'Regiones') {
    await db.ejecutar(
      `INSERT INTO zona_geografica (nombre, descripcion, continente_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), continente_id = VALUES(continente_id)`,
      [titulo, descripcion, ubicacion.continente_id]
    );
  } else if (categoriaNombre === 'Reinos y Estados') {
    await db.ejecutar(
      `INSERT INTO reino_estado (nombre, descripcion, continente_id, capital_id) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), continente_id = VALUES(continente_id), capital_id = VALUES(capital_id)`,
      [titulo, descripcion, ubicacion.continente_id, ubicacion.capital_id]
    );
  } else if (categoriaNombre === 'Localidades') {
    await db.ejecutar(
      `INSERT INTO localidad (nombre, descripcion, zona_geografica_id, reino_estado_id, tipo_asentamiento_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), zona_geografica_id = VALUES(zona_geografica_id),
                               reino_estado_id = VALUES(reino_estado_id), tipo_asentamiento_id = VALUES(tipo_asentamiento_id)`,
      [titulo, descripcion, ubicacion.zona_geografica_id, ubicacion.reino_estado_id, ubicacion.tipo_asentamiento_id]
    );
  }
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
    const categorias = await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre');
    const catalogos = await catalogosUbicacion();

    res.render('panel/articuloForm', {
      titulo: 'Nuevo artículo',
      articulo: null,
      categorias,
      catalogos,
      ubicacion: ubicacionVacia(),
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

    const categorias = await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre');
    const catalogos = await catalogosUbicacion();
    const ubicacion = await ubicacionDeArticulo(articulo, categorias);

    res.render('panel/articuloForm', {
      titulo: 'Editar artículo',
      articulo,
      categorias,
      catalogos,
      ubicacion,
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

    const resumen = String(req.body.resumen || '').slice(0, 500);
    const categorias = await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre');
    const categoriaId = req.body.categoria_id ? Number(req.body.categoria_id) : null;
    const categoria = categorias.find((c) => c.id === categoriaId);
    const categoriaNombre = categoria ? categoria.nombre : null;
    const ubicacion = numerosUbicacion(req.body);

    if (categoriaNombre === 'Localidades' && !ubicacion.tipo_asentamiento_id) {
      problemas.push('Elegí un tipo de asentamiento para la localidad.');
    }
    if (categoriaNombre === 'Reinos y Estados' && !ubicacion.continente_id) {
      problemas.push('Elegí el continente del reino o estado.');
    }

    if (problemas.length > 0) {
      const catalogos = await catalogosUbicacion();
      return res.status(400).render('panel/articuloForm', {
        titulo: id ? 'Editar artículo' : 'Nuevo artículo',
        articulo: {
          id,
          titulo,
          resumen,
          contenido_md: contenido,
          estado: req.body.estado,
          categoria_id: categoriaId,
        },
        categorias,
        catalogos,
        ubicacion,
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

    if (id) {
      await db.ejecutar(
        `UPDATE articulo
            SET titulo = ?, slug = ?, resumen = ?, contenido_md = ?, estado = ?, categoria_id = ?
          WHERE id = ?`,
        [titulo, slug, resumen, contenido, estado, categoriaId, id]
      );
    } else {
      await db.ejecutar(
        `INSERT INTO articulo (titulo, slug, resumen, contenido_md, estado, autor_id, categoria_id, publicado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, IF(? = 'publicado', NOW(), NULL))`,
        [titulo, slug, resumen, contenido, estado, res.locals.usuario.id, categoriaId, estado]
      );
    }

    // Ancla la nota a su continente, zona, reino o localidad: así aparece sola
    // en las tablas de las fichas que la relacionan.
    await guardarUbicacion(categoriaNombre, titulo, resumen, ubicacion);

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