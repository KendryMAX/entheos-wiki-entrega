'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../datos/base');
const { nivelDesdeNombre } = require('../capas/autenticacion');

const router = express.Router();

const hashFalso = '$2b$10$NyjmXrTLHhJxD9Uu5bYt7.9KLP7pNaE5rLd0yq7Q8kXqA0eS8JbYx';

function volverConError(res, correo, mensaje, estado) {
  return res.status(estado).render('acceso', {
    titulo: 'Iniciar sesion',
    error: mensaje,
    aviso: null,
    correo,
  });
}

router.get('/acceso', (req, res) => {
  if (req.session.usuario) return res.redirect('/');

  const creado = req.query.creado === '1';

  res.render('acceso', {
    titulo: 'Iniciar sesion',
    error: null,
    aviso: creado ? 'Tu cuenta fue creada. Ya podes iniciar sesion.' : null,
    correo: '',
  });
});

router.post('/acceso', async (req, res, next) => {
  try {
    const correo = String(req.body.correo || '').trim();
    const contrasena = String(req.body.contrasena || '');

    if (!correo || !contrasena) {
      return volverConError(res, correo, 'Completa el correo y la contrasena.', 400);
    }

    const usuario = await db.consultarUno(
      `SELECT u.id, u.nombre_usuario, u.email, u.password_hash, u.nombre_completo,
              u.avatar_url, u.activo, r.nombre AS rol
         FROM usuario u
         JOIN rol r ON r.id = u.rol_id
        WHERE u.email = ? OR u.nombre_usuario = ?
        LIMIT 1`,
      [correo, correo]
    );

    if (!usuario) {
      await bcrypt.compare(contrasena, hashFalso);
      return volverConError(res, correo, 'Correo o contrasena incorrectos.', 401);
    }

    const coincide = await bcrypt.compare(contrasena, usuario.password_hash);

    if (!coincide) {
      return volverConError(res, correo, 'Correo o contrasena incorrectos.', 401);
    }

    if (!usuario.activo) {
      return volverConError(res, correo, 'Tu cuenta esta dada de baja. Contacta al Administrador.', 403);
    }

    const destino = req.session.retorno || '/';

    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.usuario = {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        avatar_url: usuario.avatar_url,
        rol: usuario.rol,
        nivel: nivelDesdeNombre(usuario.rol),
        activo: Boolean(usuario.activo),
      };

      req.session.retorno = undefined;
      return res.redirect(destino);
    });
  } catch (error) {
    next(error);
  }
});

router.get('/registro', (req, res) => {
  if (req.session.usuario) return res.redirect('/');

  res.render('registro', { titulo: 'Crear cuenta', error: null, datos: {} });
});

router.post('/registro', async (req, res, next) => {
  try {
    const datos = {
      nombre_usuario: String(req.body.nombre_usuario || '').trim(),
      nombre_completo: String(req.body.nombre_completo || '').trim(),
      email: String(req.body.email || '').trim().toLowerCase(),
      contrasena: String(req.body.contrasena || ''),
      repetir: String(req.body.repetir || ''),
    };

    const visibles = {
      nombre_usuario: datos.nombre_usuario,
      nombre_completo: datos.nombre_completo,
      email: datos.email,
    };

    const problemas = [];

    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(datos.nombre_usuario)) {
      problemas.push('El nombre de usuario debe tener entre 3 y 50 caracteres, sin espacios.');
    }

    if (datos.nombre_completo.length < 3 || datos.nombre_completo.length > 120) {
      problemas.push('Escribi tu nombre completo (entre 3 y 120 caracteres).');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.email)) {
      problemas.push('El correo no tiene un formato valido.');
    }

    if (datos.contrasena.length < 8) {
      problemas.push('La contrasena debe tener al menos 8 caracteres.');
    }

    if (datos.contrasena !== datos.repetir) {
      problemas.push('Las contrasenas no coinciden.');
    }

    if (problemas.length > 0) {
      return res.status(400).render('registro', {
        titulo: 'Crear cuenta',
        error: problemas.join(' '),
        datos: visibles,
      });
    }

    const existente = await db.consultarUno(
      'SELECT id FROM usuario WHERE email = ? OR nombre_usuario = ? LIMIT 1',
      [datos.email, datos.nombre_usuario]
    );

    if (existente) {
      return res.status(409).render('registro', {
        titulo: 'Crear cuenta',
        error: 'Ese correo o nombre de usuario ya estan registrados.',
        datos: visibles,
      });
    }

    const hash = await bcrypt.hash(datos.contrasena, 10);

    await db.ejecutar(
      `INSERT INTO usuario (nombre_usuario, email, password_hash, nombre_completo, rol_id)
       VALUES (?, ?, ?, ?, (SELECT id FROM rol WHERE nombre = 'Lector'))`,
      [datos.nombre_usuario, datos.email, hash, datos.nombre_completo]
    );

    return res.redirect('/acceso?creado=1');
  } catch (error) {
    next(error);
  }
});

function cerrarSesion(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie('entheos.sid');
    res.redirect('/');
  });
}

router.post('/salir', cerrarSesion);
router.get('/salir', cerrarSesion);

module.exports = router;