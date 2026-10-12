'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../datos/base');
const { NIVELES, requiereSesion, requiereEditor, requiereAdministrador } = require('../capas/autenticacion');
const errores = require('../capas/errores');
const fichas = require('../servicios/fichas');
const etiquetas = require('../servicios/etiquetas');

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

// Catálogos que alimentan las listas de elección de las fichas.
async function catalogosPanel() {
  const [continentes, zonas, reinos, tipos, localidades, razas, tiposItem, rarezas] =
    await Promise.all([
      db.consultar('SELECT id, nombre FROM continente ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM zona_geografica ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM reino_estado WHERE disuelto = 0 ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM tipo_asentamiento ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM localidad ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM raza ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM tipo_item ORDER BY nombre'),
      db.consultar('SELECT id, nombre FROM rareza ORDER BY orden'),
    ]);

  return {
    continentes,
    zonas,
    reinos,
    tipos,
    localidades,
    razas,
    tiposItem,
    rarezas,
    estadosVitales: Object.values(etiquetas.ESTADOS_VITALES).map((nombre) => ({ nombre })),
  };
}

function opcionesDe(catalogo, catalogos) {
  const lista = catalogo && catalogos[catalogo] ? catalogos[catalogo] : [];
  return lista.map((fila) => fila.nombre);
}

// Arma los grupos de campos y secciones que ve el formulario. Se generan todos
// los grupos (uno por categoría); el navegador muestra sólo el elegido.
function construirCategorias(categorias, catalogos, contenido) {
  return categorias.map((categoria) => {
    const config = fichas.fichaDe(categoria.nombre);
    const parseado = fichas.parsearContenido(contenido, categoria.nombre);

    const secciones = [];
    config.secciones.forEach((seccion, indice) => {
      if (seccion.auto) return;
      secciones.push({
        indice,
        titulo: seccion.titulo,
        valor: parseado.secciones[seccion.titulo] || '',
      });
    });

    return {
      id: categoria.id,
      nombre: categoria.nombre,
      campos: config.campos.map((campo) => ({
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        valor: parseado.valores[campo.etiqueta] !== undefined ? parseado.valores[campo.etiqueta] : campo.valor || '',
        opciones: campo.tipo === 'lista' ? opcionesDe(campo.catalogo, catalogos) : [],
      })),
      secciones,
      extras: parseado.extras,
      cuerpo: parseado.cuerpo,
    };
  });
}

// Traduce los nombres elegidos en la ficha a los identificadores que anclan la
// nota en las tablas del mundo.
function ubicacionDesdeValores(categoriaNombre, valores, catalogos) {
  const config = fichas.fichaDe(categoriaNombre);
  const anclajes = config.anclajes || {};

  const idDe = (lista, nombre) => {
    const objetivo = fichas.normalizar(nombre);
    if (!objetivo) return null;
    const fila = (lista || []).find((candidato) => fichas.normalizar(candidato.nombre) === objetivo);
    return fila ? fila.id : null;
  };

  const ubicacion = {
    continente_id: null,
    zona_geografica_id: null,
    reino_estado_id: null,
    tipo_asentamiento_id: null,
    capital_id: null,
  };

  for (const [etiqueta, destino] of Object.entries(anclajes)) {
    const valor = valores ? valores[etiqueta] : '';
    if (destino === 'continente') ubicacion.continente_id = idDe(catalogos.continentes, valor);
    else if (destino === 'zona') ubicacion.zona_geografica_id = idDe(catalogos.zonas, valor);
    else if (destino === 'reino') ubicacion.reino_estado_id = idDe(catalogos.reinos, valor);
    else if (destino === 'tipo') ubicacion.tipo_asentamiento_id = idDe(catalogos.tipos, valor);
    else if (destino === 'capital') ubicacion.capital_id = idDe(catalogos.localidades, valor);
  }

  return ubicacion;
}

function leerCampos(body, categoriaId, categoriaNombre) {
  const config = fichas.fichaDe(categoriaNombre);
  const prefijo = `f_${categoriaId}_`;
  const valores = {};

  config.campos.forEach((campo, indice) => {
    const valor = body[`${prefijo}${indice}`];
    valores[campo.etiqueta] = String(valor === undefined || valor === null ? '' : valor).trim();
  });

  return valores;
}

function leerSecciones(body, categoriaId, categoriaNombre) {
  const config = fichas.fichaDe(categoriaNombre);
  const prefijo = `s_${categoriaId}_`;
  const secciones = {};

  config.secciones.forEach((seccion, indice) => {
    if (seccion.auto) return;
    const valor = body[`${prefijo}${indice}`];
    secciones[seccion.titulo] = String(valor === undefined || valor === null ? '' : valor).trim();
  });

  return secciones;
}

function leerCuerpo(body, categoriaId) {
  const valor = body[`cuerpo_${categoriaId}`];
  return String(valor === undefined || valor === null ? '' : valor);
}

function leerExtras(body, categoriaId) {
  const etiquetasEnviadas = body[`extra_etiqueta_${categoriaId}`];
  const valoresEnviados = body[`extra_valor_${categoriaId}`];
  const etiquetas = etiquetasEnviadas ? [].concat(etiquetasEnviadas) : [];
  const valores = valoresEnviados ? [].concat(valoresEnviados) : [];

  return etiquetas.map((etiqueta, indice) => ({ etiqueta, valor: valores[indice] || '' }));
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
    const autorId = res.locals.usuario.id;

    const articulos = await db.consultar(
      `SELECT a.id, a.titulo, a.slug, a.estado, a.actualizado_en,
              u.nombre_usuario AS autor
         FROM articulo a
         JOIN usuario u ON u.id = a.autor_id
        WHERE a.autor_id = ?
        ORDER BY a.actualizado_en DESC
        LIMIT 200`,
      [autorId]
    );

    const borradores = articulos.filter((articulo) => articulo.estado === 'borrador');
    const todos = res.locals.esAdministrador
      ? await db.consultar(
          `SELECT a.id, a.titulo, a.slug, a.estado, a.actualizado_en,
                  u.nombre_usuario AS autor
             FROM articulo a
             JOIN usuario u ON u.id = a.autor_id
            ORDER BY a.actualizado_en DESC
            LIMIT 200`
        )
      : null;

    res.render('panel/articulos', {
      titulo: 'Mis artículos',
      articulos,
      borradores,
      todos,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/panel/articulos/nuevo', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const categorias = await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre');
    const catalogos = await catalogosPanel();

    res.render('panel/articuloForm', {
      titulo: 'Nuevo artículo',
      articulo: null,
      categorias,
      categoriasForm: construirCategorias(categorias, catalogos, ''),
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
    const catalogos = await catalogosPanel();

    res.render('panel/articuloForm', {
      titulo: 'Editar artículo',
      articulo,
      categorias,
      categoriasForm: construirCategorias(categorias, catalogos, articulo.contenido_md),
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/panel/articulos', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const id = req.body.id ? Number(req.body.id) : null;
    const titulo = String(req.body.titulo || '').trim();
    const resumen = String(req.body.resumen || '').slice(0, 500);
    const categoriaId = req.body.categoria_id ? Number(req.body.categoria_id) : null;

    const categorias = await db.consultar('SELECT id, nombre FROM categoria ORDER BY nombre');
    const categoria = categorias.find((c) => c.id === categoriaId);
    const categoriaNombre = categoria ? categoria.nombre : null;

    const valores = categoriaNombre ? leerCampos(req.body, categoriaId, categoriaNombre) : {};
    const secciones = categoriaNombre ? leerSecciones(req.body, categoriaId, categoriaNombre) : {};
    const cuerpo = leerCuerpo(req.body, categoriaId);
    const extras = categoriaNombre ? leerExtras(req.body, categoriaId) : [];

    const contenido = categoriaNombre
      ? fichas.componerContenido(categoriaNombre, valores, secciones, cuerpo, extras)
      : String(cuerpo || '').trim();

    const catalogos = await catalogosPanel();
    const ubicacion = categoriaNombre
      ? ubicacionDesdeValores(categoriaNombre, valores, catalogos)
      : {};

    const problemas = [];

    if (!categoriaNombre) problemas.push('Elegí una categoría.');
    if (titulo.length < 3) problemas.push('El título debe tener al menos 3 caracteres.');

    const escrito =
      Object.values(valores).join(' ').length +
      Object.values(secciones).join(' ').length +
      cuerpo.length;
    if (escrito < 10) problemas.push('Rellená algún campo de la ficha o escribí algo en el cuerpo.');

    if (categoriaNombre === 'Localidades' && !ubicacion.tipo_asentamiento_id) {
      problemas.push('Elegí el tipo de asentamiento de la localidad.');
    }
    if (categoriaNombre === 'Reinos y Estados' && !ubicacion.continente_id) {
      problemas.push('Elegí el continente del reino o estado.');
    }

    if (problemas.length > 0) {
      return res.status(400).render('panel/articuloForm', {
        titulo: id ? 'Editar artículo' : 'Nuevo artículo',
        articulo: {
          id,
          titulo,
          resumen,
          categoria_id: categoriaId,
          contenido_md: contenido,
        },
        categorias,
        categoriasForm: construirCategorias(categorias, catalogos, contenido),
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

    // Los dos botones guardan como borrador o mandan a revisión. El estado deja
    // de elegirse a mano.
    const estado = req.body.accion === 'correccion' ? 'en_revision' : 'borrador';

    if (id) {
      await db.ejecutar(
        `UPDATE articulo
            SET titulo = ?, slug = ?, resumen = ?, contenido_md = ?, estado = ?, categoria_id = ?
          WHERE id = ?`,
        [titulo, slug, resumen, contenido, estado, categoriaId, id]
      );
    } else {
      await db.ejecutar(
        `INSERT INTO articulo (titulo, slug, resumen, contenido_md, estado, autor_id, categoria_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [titulo, slug, resumen, contenido, estado, res.locals.usuario.id, categoriaId]
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

router.post('/panel/articulos/:id/eliminar', requiereSesion, requiereAdministrador(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await db.ejecutar('DELETE FROM articulo WHERE id = ?', [id]);
    res.redirect('/panel/articulos');
  } catch (error) {
    next(error);
  }
});

router.get('/panel/revision', requiereSesion, requiereEditor(), async (req, res, next) => {
  try {
    const pendientes = await db.consultar(
      `SELECT a.id, a.titulo, a.slug, a.estado, a.actualizado_en, u.nombre_usuario AS autor
         FROM articulo a
         JOIN usuario u ON u.id = a.autor_id
        WHERE a.estado = 'en_revision'
        ORDER BY a.actualizado_en DESC`
    );

    res.render('panel/revision', { titulo: 'Revisión', pendientes });
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