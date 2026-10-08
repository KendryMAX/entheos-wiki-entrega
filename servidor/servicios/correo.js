'use strict';

const nodemailer = require('nodemailer');
const config = require('../configuracion');

let transporte = null;

function hayCredenciales() {
  return Boolean(config.correo.usuario && config.correo.contrasena);
}

function obtenerTransporte() {
  if (transporte) return transporte;

  transporte = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: config.correo.usuario,
      pass: config.correo.contrasena,
    },
  });

  return transporte;
}

async function enviar(destinatarios, asunto, html, texto = null) {
  if (!hayCredenciales()) {
    throw new Error(
      'Faltan GMAIL_USUARIO y GMAIL_CONTRASENA en el archivo .env. ' +
        'Revisa la seccion 9 del documento "Instalar en otra computadora".'
    );
  }

  const lista = Array.isArray(destinatarios) ? destinatarios : [destinatarios];

  return obtenerTransporte().sendMail({
    from: config.correo.desde || `Entheos Wiki <${config.correo.usuario}>`,
    to: lista.join(', '),
    subject: asunto,
    html,
    text: texto,
  });
}

async function avisarNuevoComentario(comentario, articulo) {
  const cuerpo = `
    <div style="font-family:Georgia,serif;background:#0a0a0b;color:#b8b8bf;padding:24px;border:1px solid #8f7018">
      <h1 style="color:#c9a227;font-size:20px;margin:0 0 16px">Nuevo comentario en Entheos Wiki</h1>
      <p style="margin:0 0 8px"><strong style="color:#f2f2f0">${comentario.nombre_usuario}</strong> comento en:</p>
      <p style="margin:0 0 16px"><a href="${comentario.enlace}" style="color:#c9a227">${articulo.titulo}</a></p>
      <blockquote style="margin:0;padding:12px;border-left:3px solid #8f7018;background:#121214">${comentario.contenido}</blockquote>
      <p style="margin:20px 0 0;font-size:13px;color:#8a8a93">
        Entheos Wiki &middot; Panel de moderacion
      </p>
    </div>
  `;

  return enviar(
    config.correo.usuario,
    `Comentario pendiente: ${articulo.titulo}`,
    cuerpo,
    `${comentario.nombre_usuario} comento en ${articulo.titulo}: ${comentario.contenido}`
  );
}

async function avisarRevision(articulo, editor) {
  const cuerpo = `
    <div style="font-family:Georgia,serif;background:#0a0a0b;color:#b8b8bf;padding:24px;border:1px solid #8f7018">
      <h1 style="color:#c9a227;font-size:20px;margin:0 0 16px">Articulo enviado a revision</h1>
      <p style="margin:0 0 8px"><strong style="color:#f2f2f0">${articulo.titulo}</strong></p>
      <p style="margin:0 0 16px">Autor: ${articulo.autor}</p>
      <p style="margin:0">Revisalo en el panel: /panel/revision</p>
    </div>
  `;

  return enviar(
    config.correo.usuario,
    `Revision pendiente: ${articulo.titulo}`,
    cuerpo,
    `${articulo.autor} envio "${articulo.titulo}" a revision. Revisalo en /panel/revision`
  );
}

module.exports = { enviar, hayCredenciales, avisarNuevoComentario, avisarRevision };