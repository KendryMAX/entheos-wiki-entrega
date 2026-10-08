'use strict';

const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../datos/base');

const RODAS = 10;

function preguntar(texto) {
  const interfaz = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolver) => {
    interfaz.question(texto, (respuesta) => {
      interfaz.close();
      resolver(respuesta.trim());
    });
  });
}

async function main() {
  console.log('Gestion de cuentas de Entheos Wiki');
  console.log('-----------------------------------\n');

  const accion = await preguntar(
    'Elegi una opcion:\n' +
      '  1) Crear una cuenta nueva\n' +
      '  2) Cambiar la contrasena de una cuenta\n' +
      '  3) Cambiar el rol de una cuenta\n' +
      '  4) Listar cuentas\n' +
      'Opcion: '
  );

  if (accion === '4') {
    const cuentas = await db.consultar(
      `SELECT u.id, u.nombre_usuario, u.email, u.nombre_completo, r.nombre AS rol, u.activo
         FROM usuario u
         JOIN rol r ON r.id = u.rol_id
        ORDER BY u.id`
    );

    console.table(cuentas);
    await db.grupo.end();
    return;
  }

  if (accion === '1') {
    const nombreUsuario = await preguntar('Nombre de usuario: ');
    const nombreCompleto = await preguntar('Nombre y apellido: ');
    const email = await preguntar('Correo: ');
    const contrasena = await preguntar('Contrasena: ');
    const rol = await preguntar('Rol (Lector, Editor o Administrador) [Lector]: ');

    const encontrado = await db.consultarUno('SELECT id FROM rol WHERE nombre = ?', [
      rol || 'Lector',
    ]);

    if (!encontrado) {
      console.error('Ese rol no existe. Revisa la tabla rol.');
    } else {
      const hash = await bcrypt.hash(contrasena, RODAS);

      await db.ejecutar(
        `INSERT INTO usuario (nombre_usuario, nombre_completo, email, password_hash, rol_id)
         VALUES (?, ?, ?, ?, ?)`,
        [nombreUsuario, nombreCompleto, email, hash, encontrado.id]
      );

      console.log('Cuenta creada: ' + nombreUsuario);
    }
  } else if (accion === '2') {
    const nombreUsuario = await preguntar('Nombre de usuario: ');
    const contrasena = await preguntar('Contrasena nueva: ');

    const hash = await bcrypt.hash(contrasena, RODAS);
    const resultado = await db.ejecutar(
      'UPDATE usuario SET password_hash = ? WHERE nombre_usuario = ?',
      [hash, nombreUsuario]
    );

    console.log(
      resultado.affectedRows > 0
        ? 'Contrasena actualizada.'
        : 'No existe una cuenta con ese nombre.'
    );
  } else if (accion === '3') {
    const nombreUsuario = await preguntar('Nombre de usuario: ');
    const rol = await preguntar('Rol nuevo (Lector, Editor o Administrador): ');

    const encontrado = await db.consultarUno('SELECT id FROM rol WHERE nombre = ?', [rol]);

    if (!encontrado) {
      console.error('Ese rol no existe.');
    } else {
      await db.ejecutar('UPDATE usuario SET rol_id = ? WHERE nombre_usuario = ?', [
        encontrado.id,
        nombreUsuario,
      ]);
      console.log('Rol actualizado a ' + rol + '.');
    }
  } else {
    console.log('Opcion no valida.');
  }

  await db.grupo.end();
}

main().catch(async (error) => {
  console.error('Error: ' + error.message);
  await db.grupo.end().catch(() => {});
  process.exit(1);
});