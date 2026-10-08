'use strict';

const NIVELES = {
  Lector: 1,
  Editor: 2,
  Administrador: 3,
};

const NOMBRES = {
  1: 'Lector',
  2: 'Editor',
  3: 'Administrador',
};

function nivelDesdeNombre(nombreRol) {
  return NIVELES[nombreRol] || NIVELES.Lector;
}

function puede(usuario, nivelMinimo) {
  return Boolean(usuario && usuario.activo && usuario.nivel >= nivelMinimo);
}

function requiereSesion(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }

  if (req.method === 'GET') {
    req.session.retorno = req.originalUrl;
  }

  return res.redirect('/403');
}

function requiereNivel(nivelMinimo) {
  return function (req, res, next) {
    const usuario = req.session && req.session.usuario;

    if (!usuario) return res.redirect('/403');
    if (!usuario.activo) return res.redirect('/salir');
    if (usuario.nivel < nivelMinimo) return res.redirect('/403');

    return next();
  };
}

function exponerSesion(req, res, next) {
  const usuario = (req.session && req.session.usuario) || null;

  res.locals.usuario = usuario;
  res.locals.rol = usuario ? NOMBRES[usuario.nivel] : null;
  res.locals.nivel = usuario ? usuario.nivel : 0;
  res.locals.puede = (nivel) => puede(usuario, nivel);
  res.locals.esEditor = puede(usuario, NIVELES.Editor);
  res.locals.esAdministrador = puede(usuario, NIVELES.Administrador);
  res.locals.NIVELES = NIVELES;
  res.locals.rutaActual = req.path;

  next();
}

module.exports = {
  NIVELES,
  NOMBRES,
  nivelDesdeNombre,
  puede,
  requiereSesion,
  requiereNivel,
  requiereEditor: () => requiereNivel(NIVELES.Editor),
  requiereAdministrador: () => requiereNivel(NIVELES.Administrador),
  exponerSesion,
};