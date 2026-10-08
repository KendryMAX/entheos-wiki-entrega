# Entheos Wiki

Wiki de consulta sobre el mundo de Entheos. Proyecto final de Programacion Web.

Repositorio privado: <https://github.com/KendryMAX/entheos-wiki>

## Requisitos

- Node.js 20 o superior
- MySQL 8 (o MariaDB compatible)
- Microsoft Edge (para generar los PDF con `puppeteer-core`)

## Instalacion

```bash
git clone https://github.com/KendryMAX/entheos-wiki.git
cd entheos-wiki
npm install
copy .env.example .env
```

Editar `.env` con tus valores reales (contrasena de MySQL, secreto de sesion,
credenciales de Gmail). El archivo `.env` **nunca se sube al repositorio**: esta
en el `.gitignore`. Cada quien tiene el suyo en su maquina.

Luego crear la base de datos y el usuario admin:

```bash
npm run bd:reiniciar
npm run admin
```

## Ejecutar

```bash
npm run dev      # desarrollo, con recarga automatica (nodemon)
npm run iniciar  # produccion
```

El servidor queda en `http://localhost:3000`.

## Pruebas y formato

```bash
npm run prueba     # pruebas con node --test
npm run formato    # formatear con prettier
```

## Estructura

| Carpeta            | Contenido                                        |
| ------------------ | ------------------------------------------------ |
| `servidor/`        | Express: rutas, servicios, plantillas EJS, tools |
| `web/`             | Estilos, scripts y imagenes del cliente          |
| `base-de-datos/`   | Esquema SQL y consultas de reportes              |
| `Documentación…/`  | Documento del equipo (fuente estatica)           |

## Como trabajar en equipo

1. Siempre partir de `main` actualizada:

   ```bash
   git pull origin main
   ```

2. Crear una rama por tarea o por persona:

   ```bash
   git checkout -b feat/nombre-de-la-tarea
   ```

3. Commitear con mensajes claros y subir la rama:

   ```bash
   git add .
   git commit -m "Descripcion breve de lo que cambia"
   git push -u origin feat/nombre-de-la-tarea
   ```

4. Abrir un Pull Request en GitHub y que otro revise antes de fusionar a `main`.
   No hacer `git push` directo a `main`.

## Seguridad

- `.env` (contrasenas) y `certificados/` (llave privada HTTPS) estan ignorados.
  **Nunca** hacer `git add -f` sobre ellos.
- Si algun dia se sube una contrasena por error, cambiarla de inmediato: borrar
  el archivo del historial no es suficiente.
