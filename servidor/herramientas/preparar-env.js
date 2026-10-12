'use strict';

// Crea el archivo .env a partir de .env.example (si todavia no existe) y le
// pone un SESION_SECRETO aleatorio. Lo usa el instalador INSTALAR.bat para que
// el colaborador no tenga que editar nada a mano.
//
// Uso:  node servidor/herramientas/preparar-env.js [carpeta_destino]
//
// Sin argumentos escribe en la raiz del proyecto (.env). Con un argumento,
// escribe <carpeta_destino>/.env (util para pruebas).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..', '..');
const ejemplo = path.join(raiz, '.env.example');
const destino = process.argv[2]
  ? path.join(path.resolve(process.argv[2]), '.env')
  : path.join(raiz, '.env');

function main() {
  if (fs.existsSync(destino)) {
    console.log('El archivo .env ya existe. No se toca: ' + destino);
    return;
  }

  if (!fs.existsSync(ejemplo)) {
    console.error('No se encontro .env.example en ' + raiz);
    process.exit(1);
  }

  let contenido = fs.readFileSync(ejemplo, 'utf8');
  const secreto = crypto.randomBytes(32).toString('hex');

  fs.mkdirSync(path.dirname(destino), { recursive: true });

  if (/^SESION_SECRETO=/m.test(contenido)) {
    contenido = contenido.replace(/^SESION_SECRETO=.*$/m, 'SESION_SECRETO=' + secreto);
  } else {
    contenido = contenido.trimEnd() + '\nSESION_SECRETO=' + secreto + '\n';
  }

  fs.writeFileSync(destino, contenido, 'utf8');
  console.log('Se creo ' + destino + ' con un SESION_SECRETO aleatorio.');
}

main();
