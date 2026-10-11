'use strict';

const config = require('../configuracion');

function noEncontrado(req, res) {
  res.status(404).render('errores/404', {
    titulo: 'Pagina no encontrada',
    ruta: req.originalUrl,
  });
}

function prohibido(mensaje = 'No tienes permiso para hacer eso.') {
  const error = new Error(mensaje);
  error.status = 403;
  return error;
}

function noEncontradoError(mensaje = 'El recurso solicitado no existe.') {
  const error = new Error(mensaje);
  error.status = 404;
  return error;
}

function requerido(valor, mensaje) {
  if (valor === undefined || valor === null) {
    throw noEncontradoError(mensaje);
  }
  return valor;
}

function permitido(condicion, mensaje) {
  if (!condicion) {
    throw prohibido(mensaje);
  }
}

function manejador(err, req, res, next) {
  let estado = err.status || err.statusCode || 500;
  let mensaje = err.message || 'Error inesperado del servidor.';

  switch (err.code) {
    case 'ER_DUP_ENTRY':
      estado = 409;
      mensaje = 'Ya existe un registro con ese valor. Proba con otro.';
      break;
    case 'ER_ROW_IS_REFERENCED_2':
      estado = 409;
      mensaje =
        'No se puede eliminar: hay otros registros que dependen de este. ' +
        'Desactiva o elimina primero los dependientes.';
      break;
    case 'ECONNREFUSED':
      estado = 503;
      mensaje = 'No hay conexion con la base de datos. Revisa que MySQL este encendido.';
      break;
    case 'ER_ACCESS_DENIED_ERROR':
      estado = 500;
      mensaje = 'Usuario o contraseña de la base de datos incorrectos.';
      break;
    default:
      break;
  }

  if (config.esProduccion) {
    console.error(`[${req.method}] ${req.originalUrl} -> ${estado}: ${err.message}`);
  } else {
    console.error(`[${req.method}] ${req.originalUrl} -> ${estado}: ${err.stack || err.message}`);
  }

  res.status(estado);

  const vista =
    estado === 500 ? 'errores/500' : estado === 404 ? 'errores/404' : 'errores/403';

  res.render(vista, {
    titulo: 'Error ' + estado,
    mensaje,
    ruta: req.originalUrl,
    detalle: config.esProduccion ? null : err.message,
  });
}

module.exports = {
  noEncontrado,
  prohibido,
  noEncontradoError,
  requerido,
  permitido,
  manejador,
};