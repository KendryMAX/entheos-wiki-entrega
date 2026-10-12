'use strict';

// Crea el archivo .env a partir de .env.example (si todavia no existe) y le
// pone un SESION_SECRETO aleatorio. Lo usa el instalador INSTALAR.bat para que
// el colaborador no tenga que editar nada a mano.
//
// Uso:
//   node servidor/herramientas/preparar-env.js
//        -> escribe .env en la raiz del proyecto.
//   node servidor/herramientas/preparar-env.js --clave=MI_CLAVE_DE_MYSQL
//        -> igual que arriba, pero deja BD_USUARIO=root y BD_CONTRASENA=MI_CLAVE.
//   node servidor/herramientas/preparar-env.js CARPETA [--clave=...]
//        -> escribe CARPETA/.env (util para pruebas).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..', '..');
const ejemplo = path.join(raiz, '.env.example');

let destino = path.join(raiz, '.env');
let clave = '';

for (const argumento of process.argv.slice(2)) {
  if (argumento.startsWith('--clave=')) {
    clave = argumento.slice('--clave='.length);
  } else {
    destino = path.join(path.resolve(argumento), '.env');
  }
}

function main() {
  if (fs.existsSync(destino)) {
    console.log('El archivo .env ya existe. No se toca: ' + destino);
    return;
  }

  if (!fs.existsSync(ejemplo)) {
    console.error('No se encontro .env.example en ' + raiz);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(destino), { recursive: true });

  let contenido = fs.readFileSync(ejemplo, 'utf8');
  const secreto = crypto.randomBytes(32).toString('hex');

  if (/^SESION_SECRETO=/m.test(contenido)) {
    contenido = contenido.replace(/^SESION_SECRETO=.*$/m, 'SESION_SECRETO=' + secreto);
  } else {
    contenido = contenido.trimEnd() + '\nSESION_SECRETO=' + secreto + '\n';
  }

  if (clave) {
    contenido = contenido.replace(/^BD_USUARIO=.*$/m, 'BD_USUARIO=root');
    contenido = contenido.replace(/^BD_CONTRASENA=.*$/m, 'BD_CONTRASENA=' + clave);
  }

  fs.writeFileSync(destino, contenido, 'utf8');
  console.log('Se creo ' + destino + ' con un SESION_SECRETO aleatorio.');
  if (clave) {
    console.log('Credenciales de MySQL configuradas: usuario root.');
  }
}

main();