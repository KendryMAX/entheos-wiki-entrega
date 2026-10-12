'use strict';

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const methodOverride = require('method-override');
const rateLimit = require('express-rate-limit');

const config = require('./configuracion');
const { exponerSesion } = require('./capas/autenticacion');
const errores = require('./capas/errores');
const db = require('./datos/base');

const app = express();

app.set('view engine', 'ejs');
app.set('views', config.rutas.plantillas);
app.set('trust proxy', 1);

app.use(express.static(config.rutas.web, { maxAge: config.esProduccion ? '7d' : 0 }));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(methodOverride('_method'));

app.use(
  session({
    name: 'entheos.sid',
    secret: config.sesion.secreto,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.esProduccion,
      maxAge: config.sesion.minutos * 60 * 1000,
    },
  })
);

app.locals.limiteAcceso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.',
});

app.use('/acceso', app.locals.limiteAcceso);
app.use('/registro', app.locals.limiteAcceso);

app.use(exponerSesion);

app.use(async function cargarConteos(req, res, next) {
  try {
    const filas = await db.consultar(
      `SELECT
         (SELECT COUNT(*) FROM articulo)      AS articulo,
         (SELECT COUNT(*) FROM personaje)     AS personaje,
         (SELECT COUNT(*) FROM localidad)     AS localidad,
         (SELECT COUNT(*) FROM reino_estado)  AS reino_estado,
         (SELECT COUNT(*) FROM item)          AS item`
    );
    res.locals.conteos = filas[0];
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/', require('./rutas/inicio'));
app.use('/', require('./rutas/cuenta'));
app.use('/articulos', require('./rutas/articulos'));
app.use('/', require('./rutas/comunidad'));
app.use('/', require('./rutas/panel'));
app.use('/', require('./rutas/reportes'));

app.use(errores.noEncontrado);
app.use(errores.manejador);

module.exports = app;