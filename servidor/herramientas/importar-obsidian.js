'use strict';

const fs = require('fs');
const path = require('path');

const config = require('../configuracion');
const db = require('../datos/base');

const URL_SUBIDAS = '/subidas/';

const CLAVES_FICHA = new Set([
  'nombre',
  'tipo',
  'imagen_principal',
  'pronunciación',
  'pronunciacion',
  'render-enabled',
  'timelines',
]);

const PLACEHOLDER = [
  'describir en un párrafo',
  'describe en un párrafo',
  'describe un párrafo',
  'resume la cronología',
  'resume los hitos',
  'explica cómo luce',
  'relata cómo se descubrió',
  'explíca cómo se obtiene',
  'enumera los principales usos',
  'explica su valor',
  'señala cómo influye',
  'explica problemas asociados',
  'rellenar con descripciones',
  'por llenar',
  'porllenar',
  'expón en un párrafo',
  'expón las industrias',
  'indica cómo se percibe',
  'escribe una línea cronológica condensada',
  'indicar rasgos topográficos',
  'resumir las especies',
  'resumir costumbres',
  'describe la estructura de las fuerzas',
  'resume las instituciones',
  'este apartado reúne',
  'se recomienda detallar',
  'un párrafo que explique',
  'lista detallada de efectos',
  'relato con lo esencial',
  'ganchos con condiciones o momentos específicos',
  'los detalles secretos a los users',
  'todo lo que necesite plasmar',
  'origen, infancia, formación',
  'posición social, influencia',
  'rasgos físicos, vestimenta',
  'resume los hitos más relevantes de su historia',
  'explica las alianzas, rivalidades',
  'la información debe estar vinculada directamente',
  'sirve para combatir',
  'sirve para trabajar',
  'se usa una vez',
  'describe relieve',
  'describe industrias locales',
  'describe las regiones particulares',
  'describe cómo se obtiene',
  'señala las costumbres',
  'explica la estructura de alianzas',
  'explica las especies endémicas',
  'resume instituciones de conocimiento',
  'explica cómo se relacionan con otras razas',
  'explica cómo difiere su temperamento',
  'señala si tienen dialectos',
  'indica si posee culturas o estéticas',
  'explica cómo se organizan internamente',
  'expón conflictos',
];

function leerArgumentos() {
  const argumentos = process.argv.slice(2);
  const aplicar = argumentos.includes('--aplicar');
  let vault = process.env.OBSIDIAN_VAULT || '';
  for (const argumento of argumentos) {
    if (argumento.startsWith('--vault=')) vault = argumento.slice(8);
  }
  return { aplicar, vault };
}

function normalizar(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slugificar(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function limpiarValor(valor) {
  let v = String(valor === null || valor === undefined ? '' : valor).trim();
  v = v.replace(/^["']|["']$/g, '').trim();
  if (!v) return '';
  v = v.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  v = v.replace(/\[\[([^\]]+)\]\]/g, '$1');
  v = v.replace(/^!?\[\[(.*)\]\]$/, '$1');
  return v.replace(/\|.*$/, '').trim();
}

function quitarWikilink(objetivo) {
  return String(objetivo).split('|')[0].trim();
}

function valorDe(datos, ...claves) {
  for (const clave of claves) {
    const valor = datos[clave];
    if (Array.isArray(valor)) {
      const limpio = valor.map((v) => limpiarValor(v)).filter(Boolean);
      if (limpio.length) return limpio[0];
    } else if (valor) {
      const limpio = limpiarValor(valor);
      if (limpio) return limpio;
    }
  }
  return '';
}

function numeroDe(datos, ...claves) {
  const valor = valorDe(datos, ...claves);
  const numero = Number(String(valor).replace(/[^\d-]/g, ''));
  if (String(valor).trim() !== '' && Number.isFinite(numero)) return numero;
  return null;
}

function leerFrontmatter(texto) {
  const lineas = texto.split('\n');
  if ((lineas[0] || '').trim() !== '---') {
    return { datos: {}, cuerpo: texto };
  }

  let fin = lineas.length;
  for (let i = 1; i < lineas.length; i++) {
    if (lineas[i].trim() === '---') {
      fin = i;
      break;
    }
  }

  const datos = {};
  let clave = null;

  for (let i = 1; i < fin; i++) {
    const linea = lineas[i];
    const lista = linea.match(/^\s*-\s+(.+)$/);
    if (lista && clave) {
      if (!Array.isArray(datos[clave])) datos[clave] = [];
      datos[clave].push(limpiarValor(lista[1]));
      continue;
    }

    const par = linea.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ_0-9]+)\s*:\s*(.*)$/);
    if (!par) continue;

    clave = par[1];
    const valor = par[2].trim();

    if (!valor) {
      datos[clave] = null;
      continue;
    }

    if (valor.startsWith('[') && valor.endsWith(']')) {
      datos[clave] = valor
        .slice(1, -1)
        .split(',')
        .map((v) => limpiarValor(v))
        .filter(Boolean);
      continue;
    }

    datos[clave] = limpiarValor(valor);
  }

  return { datos, cuerpo: lineas.slice(fin + 1).join('\n') };
}

function esPlaceholder(texto) {
  const bajo = texto.toLowerCase();
  return PLACEHOLDER.some((frase) => bajo.includes(frase));
}

function enlaceArticulo(objetivo, alias) {
  const limpio = limpiarValor(quitarWikilink(objetivo));
  if (!limpio) return '';
  return `[${alias || limpio}](/articulos/${slugificar(limpio)})`;
}

function imagenEnLinea(enlacesActivos, archivo) {
  const nombre = path.basename(limpiarValor(quitarWikilink(archivo)));
  if (!nombre || !enlacesActivos.imagenes.has(nombre.toLowerCase())) return '';
  return `![${nombre}](${URL_SUBIDAS}${encodeURIComponent(nombre)})`;
}

function convertirLinea(texto, enlacesActivos) {
  let t = texto;
  t = t.replace(/!\[\[([^\]|]+\.(?:png|jpe?g|gif|webp|svg))(?:\|[^\]]*)?\]\]/gi, (_, f) => imagenEnLinea(enlacesActivos, f));
  t = t.replace(/!\[\[([^\]|]+)\]\]/g, (_, f) => imagenEnLinea(enlacesActivos, f));
  t = t.replace(/\[\[([^\]|!]+)\|([^\]]+)\]\]/g, (_, objetivo, alias) => enlaceArticulo(objetivo, alias));
  t = t.replace(/\[\[([^\]|!]+)\]\]/g, (_, objetivo) => enlaceArticulo(objetivo, objetivo));
  t = t.replace(/`?=this\.[A-Za-z_áéíóúÁÉÍÓÚñÑ0-9]+`?/g, '');
  t = t.replace(/\*\*`?=this\.[^`]+`?\*\*/g, '');
  return t.trim() === '' ? '' : t;
}

function normalizarClave(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizarNombre(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .trim()
    .replace(/^!?\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .trim();
}

const SINONIMOS = {
  type: ['tipo', 'categoria', 'categoría', 'clase'],
  aliases: ['alias', 'aliases', 'apodos'],
  occupation: ['ocupacion', 'ocupación', 'profesion', 'profesión', 'oficio'],
  title: ['titulo', 'título'],
  associatedgroup: ['facciones_grupos', 'faccion', 'grupos', 'organizaciones'],
  poblacion: ['poblacion', 'población'],
};

function obtenerCampo(vista, campo) {
  const c = String(campo || '').trim();
  if (!c) return { hallado: false, valor: undefined };
  const cls = c.toLowerCase();
  if (cls === 'file.name' || cls === 'file.link') return { hallado: true, valor: { tipo: 'nombre' } };
  if (cls === 'file.folder' || cls === 'file.path') return { hallado: true, valor: { tipo: 'carpeta' } };
  if (cls === 'file.fecha' || cls === 'file.date') {
    const v = vista.datos.fecha_inicio !== undefined ? vista.datos.fecha_inicio : vista.datos.fecha;
    if (v !== undefined) return { hallado: true, valor: v };
    return { hallado: false, valor: undefined };
  }

  const claveBruta = c.replace(/^file\./, '');
  if (Object.prototype.hasOwnProperty.call(vista.datos, claveBruta)) {
    return { hallado: true, valor: vista.datos[claveBruta] };
  }

  const canon = normalizarClave(claveBruta);
  for (const [k, v] of Object.entries(vista.datos)) {
    if (normalizarClave(k) === canon) return { hallado: true, valor: v };
  }

  for (const aliada of SINONIMOS[claveBruta] || []) {
    if (Object.prototype.hasOwnProperty.call(vista.datos, aliada)) return { hallado: true, valor: vista.datos[aliada] };
    const canonAliada = normalizarClave(aliada);
    for (const [k, v] of Object.entries(vista.datos)) {
      if (normalizarClave(k) === canonAliada) return { hallado: true, valor: v };
    }
  }

  return { hallado: false, valor: undefined };
}

function valorComoLista(obtenido) {
  if (!obtenido || !obtenido.hallado) return [];
  const v = obtenido.valor;
  if (v && typeof v === 'object' && v.tipo) return [];
  if (Array.isArray(v)) return v.map((x) => limpiarValor(x)).filter(Boolean);
  const limpio = limpiarValor(v);
  return limpio ? [limpio] : [];
}

function nombresRelacionadosConLugar(vista) {
  const todos = [];
  for (const [k, v] of Object.entries(vista.datos)) {
    if (/(zona|loca|ubi)/.test(normalizarClave(k))) {
      todos.push(...valorComoLista({ hallado: true, valor: v }));
    }
  }
  return todos;
}

function separarGrupos(clausula) {
  const palabras = ['or', 'and'];
  const partes = [];
  let actual = '';
  let profundidad = 0;
  let cita = null;
  let i = 0;
  while (i < clausula.length) {
    const ch = clausula[i];
    if (cita) {
      actual += ch;
      if (ch === cita) cita = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      cita = ch;
      actual += ch;
      i++;
      continue;
    }
    if (ch === '(') {
      profundidad++;
      actual += ch;
      i++;
      continue;
    }
    if (ch === ')') {
      profundidad = Math.max(0, profundidad - 1);
      actual += ch;
      i++;
      continue;
    }
    if (profundidad === 0 && /^[a-zA-Z]/.test(ch)) {
      const palabra = (clausula.slice(i).match(/^[a-zA-Z]+/) || [''])[0].toLowerCase();
      if (palabras.includes(palabra)) {
        if (actual.trim()) partes.push(actual);
        actual = '';
        i += palabra.length;
        continue;
      }
    }
    actual += ch;
    i++;
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

function condicionesDe(clausula) {
  const grupos = [[]];
  for (const parte of separarGrupos(clausula)) {
    if (/^or$/i.test(parte)) {
      grupos.push([]);
    } else if (!/^and$/i.test(parte)) {
      grupos[grupos.length - 1].push(parte);
    }
  }
  return grupos.filter((g) => g.length);
}

function parsearPrimitiva(cond) {
  const t = cond.trim().replace(/^\(+\)+$/g, '').trim();
  let m = t.match(/^(!?e?contains)\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
  if (m) return { tipo: m[1].toLowerCase(), campo: m[2].trim(), valor: m[3].trim() };
  m = t.match(/^(.+?)\s*(==|!=|=)\s*(.+?)$/);
  if (m) return { tipo: m[2], campo: m[1].trim(), valor: m[3].trim() };
  return { tipo: 'nada', campo: '', valor: '' };
}

function operandoNormalizado(valor, ficheroNombre) {
  if (String(valor).trim() === '«ACTUAL»') return normalizarClave(normalizarNombre(ficheroNombre));
  let t = String(valor).trim().replace(/^["']|["']$/g, '');
  return normalizarClave(normalizarNombre(t));
}

function esTemplateIngles(campo) {
  return ['noteicon', 'icon', 'cover'].includes(normalizarClave(campo));
}

function evaluarPrimitiva(pr, vista, ficheroNombre) {
  const tipo = pr.tipo;
  if (tipo === 'nada') return true;
  const objetivo = operandoNormalizado(pr.valor, ficheroNombre);
  const campo = pr.campo;
  const cls = String(campo).toLowerCase();

  if (cls === 'file.folder' || cls === 'file.path') {
    const carpeta = String(vista.carpeta || '');
    if (tipo === 'contains' || tipo === 'econtains') return carpeta.toLowerCase().includes(objetivo);
    return normalizarClave(carpeta) === objetivo;
  }
  if (cls === 'file.name' || cls === 'file.link') {
    const nombre = normalizarClave(normalizarNombre(vista.nombre));
    if (tipo === 'contains' || tipo === 'econtains') return false;
    return nombre === objetivo;
  }

  if (normalizarClave(campo) === 'location') {
    const candidatos = nombresRelacionadosConLugar(vista).map((v) => normalizarClave(normalizarNombre(v)));
    if (tipo === 'contains' || tipo === 'econtains') {
      return candidatos.some((v) => v === objetivo || v.includes(objetivo));
    }
    if (tipo === '!=') return !candidatos.some((v) => v === objetivo);
    return candidatos.some((v) => v === objetivo);
  }

  const obtenido = obtenerCampo(vista, campo);
  if (!obtenido.hallado) {
    if (tipo === 'contains' || tipo === 'econtains') {
      return esTemplateIngles(campo);
    }
    if (tipo === '!=') return true;
    return false;
  }

  const valores = valorComoLista(obtenido)
    .map((v) => normalizarClave(normalizarNombre(v)))
    .filter(Boolean);

  if (tipo === 'contains' || tipo === 'econtains') {
    if (valores.length === 1) return valores[0].includes(objetivo) || objetivo.includes(valores[0]);
    return valores.some((v) => v === objetivo || v.includes(objetivo));
  }
  if (tipo === '=' || tipo === '==') return valores.length ? valores.some((v) => v === objetivo) : false;
  return valores.length ? !valores.some((v) => v === objetivo) : true;
}

function cumpleCondiciones(grupos, vista, ficheroNombre) {
  if (!grupos.length) return true;
  return grupos.some((grupo) => grupo.every((cond) => evaluarPrimitiva(parsearPrimitiva(cond), vista, ficheroNombre)));
}

function tablaMarkdown(encabezados, filas) {
  if (!encabezados.length) return '';
  const cab = '| ' + encabezados.join(' | ') + ' |';
  const sep = '| ' + encabezados.map(() => '---').join(' | ') + ' |';
  const cuerpo = filas.map((f) => '| ' + f.join(' | ') + ' |');
  return [cab, sep, ...cuerpo].join('\n');
}

function evaluarCelda(expr, vista, enlacesActivos) {
  let e = expr.trim();
  if (!e) return '';
  let campo = e;
  let etiqueta = '';
  const conEtiqueta = e.match(/^(.*?)\s+AS\s+(.+)$/i);
  if (conEtiqueta) {
    campo = conEtiqueta[1].trim();
    etiqueta = conEtiqueta[2].trim().replace(/^"|"$/g, '');
  }

  const func = campo.match(/^join\(\s*(.+?)\s*,\s*"([^"]*)"\s*\)$/i);
  const enlace = campo.match(/^link\(\s*(.+?)\s*\)$/i);
  const simple = campo.replace(/^file\./, '');

  let valor = '';
  if (func) {
    const listado = valorComoLista(obtenerCampo(vista, func[1].trim()));
    valor = listado.join(func[2] || ', ');
  } else if (enlace) {
    const listado = valorComoLista(obtenerCampo(vista, enlace[1].trim()));
    valor = listado.map((v) => enlaceArticulo(limpiarValor(v))).filter(Boolean).join(', ');
  } else if (simple === 'name' || simple === 'link') {
    const nombre = vista.nombre;
    valor = nombre ? enlaceArticulo(nombre) : '';
  } else if (simple === 'folder' || simple === 'path') {
    valor = vista.carpeta || '';
  } else {
    const listado = valorComoLista(obtenerCampo(vista, campo));
    valor = listado.join(', ');
  }

  return { valor: convertirLinea(valor, enlacesActivos), etiqueta: etiqueta || (func ? func[1].trim() : campo) };
}

function parsearColumnas(lineaTabla, vista) {
  const cuerpo = String(lineaTabla).replace(/^table\b\s*/i, '');
  if (!cuerpo.trim() || /^where/i.test(cuerpo.trim()) || /^from/i.test(cuerpo.trim()) || /^sort/i.test(cuerpo.trim()) || /^group/i.test(cuerpo.trim())) {
    return [{ valor: enlaceArticulo(vista.nombre), etiqueta: 'Nombre' }];
  }
  const partes = [];
  let actual = '';
  let cita = null;
  let profundidad = 0;
  for (const ch of cuerpo) {
    if (cita) {
      actual += ch;
      if (ch === cita) cita = null;
      continue;
    }
    if (ch === '"') {
      cita = ch;
      actual += ch;
      continue;
    }
    if (ch === '(') {
      profundidad++;
      actual += ch;
      continue;
    }
    if (ch === ')') {
      profundidad = Math.max(0, profundidad - 1);
      actual += ch;
      continue;
    }
    if (ch === ',' && profundidad === 0) {
      partes.push(actual);
      actual = '';
      continue;
    }
    actual += ch;
  }
  if (actual.trim()) partes.push(actual);
  return partes.filter((p) => p.trim()).map((parte) => evaluarCelda(parte, vista, {}));
}

function parsearOrden(linea) {
  const cuerpo = String(linea).replace(/^sort\s+/i, '');
  return cuerpo
    .split(',')
    .map((s) => {
      const campo = s.trim().replace(/\s+(ASC|DESC)\s*$/i, '');
      const direccion = / ASC\s*$/i.test(s.trim()) ? 1 : -1;
      return { campo: campo.trim(), direccion: /DESC/i.test(s.trim()) ? -1 : direccion };
    })
    .filter((o) => o.campo);
}

function compararParaOrdenar(a, b, orden) {
  for (const o of orden) {
    let va = valorComoLista(obtenerCampo(a, o.campo))[0] || '';
    let vb = valorComoLista(obtenerCampo(b, o.campo))[0] || '';
    va = String(va);
    vb = String(vb);
    if (o.campo.toLowerCase() === 'file.name' || o.campo.toLowerCase() === 'nombre') {
      va = a.nombre || '';
      vb = b.nombre || '';
    }
    const na = Number(va);
    const nb = Number(vb);
    let r;
    if (va !== '' && vb !== '' && Number.isFinite(na) && Number.isFinite(nb)) r = na - nb;
    else r = normalizarClave(normalizarNombre(va)).localeCompare(normalizarClave(normalizarNombre(vb)));
    if (r !== 0) return o.direccion * r;
  }
  return 0;
}

function dataviewALineas(consulta, ficheroNombre, vistas) {
  const lineasRaw = consulta.split('\n').filter((l) => l.trim());
  if (!/^(table|list)\b/i.test(lineasRaw[0] || '')) return '';
  if (/^list\b/i.test(lineasRaw[0])) return '';

  let proyeccion = lineasRaw[0];
  let donde = '';
  let desde = '';
  let orden = [];

  for (const linea of lineasRaw.slice(1)) {
    const lean = linea.trim();
    if (/^from\b/i.test(lean)) desde = lean.replace(/^from\s+/i, '').replace(/^"|"$/g, '').trim();
    else if (/^where\b/i.test(lean)) donde = lean.replace(/^where\s+/i, '');
    else if (/^sort\b/i.test(lean)) orden = parsearOrden(lean);
  }

  const grupos = condicionesDe(donde);

  const candidatos = vistas.filter((vista) => {
    if (desde) {
      const carpeta = String(vista.carpeta || '');
      if (carpeta !== desde && !carpeta.startsWith(desde + '/')) return false;
    }
    return cumpleCondiciones(grupos, vista, ficheroNombre);
  });

  candidatos.sort((x, y) => compararParaOrdenar(x, y, orden));

  const filasVista = candidatos.map((c) => parsearColumnas(proyeccion, c));
  const encabezados = (filasVista[0] || []).map((c) => c.etiqueta);
  const filas = filasVista.map((cols) => cols.map((c) => c.valor || '—'));

  return tablaMarkdown(encabezados.length ? encabezados : [], filas);
}

function dataviewjsARecursos(bloque, ficheroNombre, vistas, enlacesActivos) {
  if (!/dv\.table\(/i.test(bloque) || !/zonas_asociadas/i.test(bloque)) return '';
  const mCarpeta = bloque.match(/dv\.pages\(\s*["`]([^"`]+)["`]\s*\)/i);
  const mTabla = bloque.match(/dv\.table\(\s*\[\s*([\s\S]*?)\]\s*,\s*presentes\s*\)/i);
  if (!mCarpeta || !mTabla) return '';
  const desde = mCarpeta[1].trim();
  const encabezados = [...mTabla[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);

  const filas = [];
  for (const vista of vistas) {
    const carpeta = String(vista.carpeta || '');
    if (carpeta !== desde && !carpeta.startsWith(desde + '/')) continue;
    const zonas = obtenerCampo(vista, 'zonas_asociadas');
    const listaZonas = valorComoLista(zonas);
    const indice = listaZonas.findIndex((z) => normalizarClave(normalizarNombre(z)) === normalizarClave(normalizarNombre(ficheroNombre)));
    if (indice === -1) continue;
    const presencias = valorComoLista(obtenerCampo(vista, 'presencia_zonas'));
    const presencia = presencias[indice] || 'N/A';
    const unicos = valorComoLista(obtenerCampo(vista, 'recurso_unico'));
    const unico = unicos.some((u) => normalizarClave(normalizarNombre(u)) === normalizarClave(normalizarNombre(ficheroNombre))) ? 'Sí' : 'No';
    const nombre = valorDe(vista.datos, 'nombre') || vista.nombre;
    filas.push([enlaceArticulo(nombre), presencia, unico]);
  }
  filas.sort((x, y) => normalizarClave(x[0]).localeCompare(normalizarClave(y[0])));
  return tablaMarkdown(encabezados.length ? encabezados : ['Recurso', 'Presencia', 'Recurso Único'], filas);
}

function evaluarBloqueDataview(lang, bloque, ficheroNombre, vistas, enlacesActivos) {
  if (lang === 'dataviewjs') return dataviewjsARecursos(bloque, ficheroNombre, vistas, enlacesActivos);
  const tabla = dataviewALineas(bloque, ficheroNombre, vistas);
  return tabla;
}

function convertirCuerpo(cuerpo, enlacesActivos, ficheroNombre, vistas) {
  const salida = [];
  let dentroDeCodigo = false;
  let callout = '';
  const lineasCuerpo = String(cuerpo).split('\n');

  for (let i = 0; i < lineasCuerpo.length; i++) {
    const linea = (lineasCuerpo[i] || '').replace(/\r$/, '');

    const base = linea.startsWith('>') ? linea.replace(/^>\s?/, '').replace(/^>\s?/, '') : linea;

    if (base.trimStart().startsWith('```')) {
      const lang = base.trimStart().replace(/```/, '').trim().toLowerCase();
      if (lang === 'dataview' || lang === 'dataviewjs') {
        const bloques = [];
        i++;
        while (i < lineasCuerpo.length) {
          const r = (lineasCuerpo[i] || '').replace(/\r$/, '');
          const inter = r.startsWith('>') ? r.replace(/^>\s?/, '').replace(/^>\s?/, '') : r;
          if (inter.trimStart().startsWith('```')) {
            i++;
            break;
          }
          bloques.push(inter.replace(/\bthis\.file\.(name|link)\b/g, '«ACTUAL»'));
          i++;
        }
        if (callout !== 'eliminar') {
          const tabla = evaluarBloqueDataview(lang, bloques.join('\n'), ficheroNombre, vistas, enlacesActivos);
          if (tabla) salida.push('', tabla, '');
        }
        continue;
      }
      dentroDeCodigo = !dentroDeCodigo;
      continue;
    }
    if (dentroDeCodigo) continue;

    if (linea.startsWith('>')) {
      let interior = linea.replace(/^>\s?/, '');
      while (interior.startsWith('>')) {
        interior = interior.replace(/^>\s?/, '').replace(/^>$/, '');
      }

      const marcado = interior.match(/^\[!([a-z]+)[^\]]*\][\s-]*([^\n]*)/i);
      if (marcado) {
        const tipo = marcado[1].toLowerCase();
        const titulo = marcado[2].trim();
        if (tipo === 'infobox' || tipo === 'nota' || (tipo === 'metadata' && /^mapa$/i.test(titulo))) {
          callout = 'eliminar';
        } else if (tipo === 'metadata' && titulo) {
          callout = 'texto';
          salida.push('', '### ' + titulo, '');
        } else {
          callout = 'texto';
        }
        continue;
      }

      if (callout === 'eliminar') continue;
      if (esPlaceholder(interior)) continue;
      const convertida = convertirLinea(interior, enlacesActivos);
      if (convertida) salida.push(convertida);
      continue;
    }

    callout = '';
    if (/^#+\s+.*`?=this/.test(linea)) continue;
    if (esPlaceholder(linea)) continue;
    const convertida = convertirLinea(linea, enlacesActivos);
    if (convertida) salida.push(convertida);
  }

  return salida.join('\n');
}

function construirFicha(datos, enlacesActivos) {
  const filas = [];
  for (const [clave, valor] of Object.entries(datos)) {
    if (CLAVES_FICHA.has(clave)) continue;
    let valorLimpio;
    if (Array.isArray(valor)) {
      valorLimpio = valor.map((v) => convertirLinea(v, enlacesActivos)).filter(Boolean).join(', ');
    } else if (valor) {
      valorLimpio = convertirLinea(String(valor), enlacesActivos);
    }
    if (!valorLimpio) continue;
    filas.push('| ' + clave.replace(/_/g, ' ') + ' | ' + valorLimpio + ' |');
  }
  if (filas.length === 0) return '';
  return ['## Ficha', '', '| Campo | Valor |', '| --- | --- |', ...filas, ''].join('\n');
}

function resolverCuerpo(ficha, enlacesActivos, ficheroNombre, vistas) {
  const fichaMarkdown = construirFicha(ficha.datos, enlacesActivos);
  const contenido = convertirCuerpo(ficha.cuerpo, enlacesActivos, ficheroNombre, vistas);

  const lineasContenido = contenido
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('|'));

  const resumen = lineasContenido[0] ? lineasContenido[0].slice(0, 500) : '';
  const tieneProsa = lineasContenido.length >= 2 && lineasContenido[0].length > 100;

  const bloques = [];
  if (fichaMarkdown) bloques.push(fichaMarkdown);
  if (contenido.trim()) bloques.push(contenido);

  return {
    markdown: bloques.join('\n\n'),
    resumen: resumen || '',
    tieneProsa,
  };
}

function esBoleta(rutaRelativa) {
  const segmentos = rutaRelativa.split('/');
  if (segmentos.some((s) => s.startsWith('.'))) return true;

  const base = segmentos[segmentos.length - 1] || '';
  if (/sync-conflict/i.test(base)) return true;
  if (/^Ejemplo/.test(base)) return true;
  if (/Index\.md$/.test(base) || base === 'Index.md') return true;
  if (base === 'Timeline.md' || base === 'Artistas Referencias.md') return true;
  if (segmentos.includes('INBOX') && /^Evento \d/.test(base)) return true;

  if (['Templates', 'Configuración', 'Sistemas', 'Temporadas', 'Recursos y Representación'].some((c) => segmentos.includes(c))) {
    return true;
  }
  if (segmentos.includes('Recursos y Referencias') && (segmentos.includes('Audio') || /^Ejemplo/.test(base))) {
    return true;
  }

  const carpeta = segmentos[0] || '';
  if (['Templates', 'Configuración', 'Sistemas e Infraestructura', 'Temporadas'].includes(carpeta)) return true;
  return false;
}

function caminar(directorio, relativa) {
  const resultados = [];
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    if (entrada.name.startsWith('.')) continue;
    const rut = path.join(directorio, entrada.name);
    const rel = relativa ? relativa + '/' + entrada.name : entrada.name;
    if (entrada.isDirectory()) resultados.push(...caminar(rut, rel));
    else resultados.push(rel);
  }
  return resultados;
}

function recolectarNotas(vault) {
  if (!vault || !fs.existsSync(vault)) {
    throw new Error('No se encontro el vault de Obsidian: ' + (vault || '(falta --vault=)'));
  }

  const notas = [];
  for (const rel of caminar(vault)) {
    if (!rel.endsWith('.md')) continue;
    if (esBoleta(rel)) continue;
    const rutaCompleta = path.join(vault, rel);
    if (fs.statSync(rutaCompleta).size === 0) continue;
    notas.push({
      relativa: rel,
      texto: fs.readFileSync(rutaCompleta, 'utf8'),
    });
  }
  return notas;
}

function indiceImagenes(vault) {
  const indice = new Map();
  for (const rel of caminar(vault)) {
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(rel)) continue;
    const nombre = path.basename(rel);
    if (!indice.has(nombre.toLowerCase())) indice.set(nombre.toLowerCase(), path.join(vault, rel));
  }
  return indice;
}

function detectarEntidad(rutaRelativa, tipo) {
  const ruta = rutaRelativa.replace(/[\\/]/g, '/');
  const t = normalizar(tipo);

  if (t === 'npc' || t === 'personaje') return 'personaje';
  if (t === 'localidad' || t === 'asentamiento') return 'localidad';
  if (t === 'zona_geografica' || t === 'zona geográfica' || t === 'zona geografica' || t === 'zona' || t === 'región' || t === 'region' || t === 'accidente_geografico') {
    return 'zona_geografica';
  }
  if (t === 'continente') return 'continente';
  if (t === 'raza') return 'raza';
  if (t === 'subraza' || t === 'sub raza') return 'subraza';
  if (t === 'item' || t === 'objeto' || t === 'equipo') return 'item';
  if (t === 'recurso' || t === 'recurso material' || t === 'mineral' || t === 'material') return 'recurso';
  if (t === 'distritozona' || t === 'distrito' || t === 'distrito_zona' || t === 'zona urbana') return 'distrito';
  if (t === 'faccion' || t === 'facción' || t === 'organización' || t === 'organizacion' || t === 'gremio' || t === 'sociedad' || t === 'secta') return 'faccion';
  if (t === 'evento' || t === 'hecho histórico' || t === 'hecho historico' || t === 'acontecimiento') return 'evento';
  if (t === 'reino' || t === 'reino-estado' || t === 'reino estado' || t === 'reino_estado' || t === 'estado' || t === 'republica' || t === 'imperio') return 'reino_estado';
  if (t === 'punto de interés' || t === 'punto de interes' || t === 'punto_de_interes' || t === 'edificio' || t === 'lugar individual') return 'punto_interes';
  if (t === 'religión' || t === 'religion' || t === 'culto' || t === 'deidad' || t === 'orden religiosa') return 'religion';
  if (t === 'lengua' || t === 'lenguaje' || t === 'lenguajes' || t === 'idioma' || t === 'alfabeto' || t === 'sistema de escritura') return 'lengua';
  if (t === 'era' || t === 'periodo' || t === 'época' || t === 'epoca') return 'era';
  if (t.startsWith('concepto') || t.startsWith('termino') || t.startsWith('regla') || t.startsWith('mecánica') || t.startsWith('sesión') || t.startsWith('lore') || t === 'mito' || t === 'leyenda') return null;

  if (ruta.includes('Continentes')) return 'continente';
  if (ruta.includes('Zonas Geográficas') || ruta.includes('Zonas Geograficas')) return 'zona_geografica';
  if (ruta.includes('Localidades')) return 'localidad';
  if (ruta.includes('Distritos')) return 'distrito';
  if (ruta.includes('Reinos')) return 'reino_estado';
  if (ruta.includes('Subrazas')) return 'subraza';
  if (ruta.includes('Razas')) return 'raza';
  if (ruta.includes("NPC")) return 'personaje';
  if (ruta.includes('Recursos Materiales')) return 'recurso';
  if (ruta.includes('Items y Tesoros')) return 'item';
  if (ruta.includes('Sociedades y Facciones')) return 'faccion';
  if (/(Eventos|Historia y Cronología|Historia y Cronologia)/.test(ruta)) return 'evento';
  if (ruta.includes('Eras')) return 'era';
  if (ruta.includes('Religiones')) return 'religion';
  if (ruta.includes('Lenguajes') || ruta.includes('Lenguas') || ruta.includes('Alfabetos')) return 'lengua';
  if (ruta.includes('Puntos de Interés') || ruta.includes('Puntos de Interes') || ruta.includes('Lugares Individuales')) return 'punto_interes';
  return null;
}

function categoriaDe(entidad, tipoItem) {
  const mapa = {
    continente: 'Geografia',
    zona_geografica: 'Regiones',
    localidad: 'Ciudades',
    distrito: 'Ciudades',
    reino_estado: 'Geografia',
    raza: 'Razas',
    subraza: 'Razas',
    personaje: 'Personajes',
    item: tipoItem === 'Arma' ? 'Armas' : 'Objetos',
    recurso: 'Objetos',
    faccion: 'Facciones',
    evento: 'Cronologia',
    era: 'Cronologia',
    punto_interes: 'Geografia',
    religion: 'Conceptos',
    lengua: 'Lenguas',
  };
  return mapa[entidad] || 'Conceptos';
}

function tipoAsentamientoDe(rutaRelativa, valor) {
  const ruta = rutaRelativa.replace(/[\\/]/g, '/');
  const normal = normalizar(valor);
  if (normal.includes('aldea') || normal === 'aldea') return 'Aldea';
  if (normal.includes('pueblo') || ruta.includes('Pueblos')) return 'Pueblo';
  return 'Ciudad';
}

function tipoItemDe(rutaRelativa, datos) {
  const ruta = rutaRelativa.replace(/[\\/]/g, '/');
  const declarado = normalizar([datos.tipo_item, datos.categoria_item, datos.tipo_categoria].filter(Boolean).join(' '));

  if (/arma/.test(declarado) && !/armadura/.test(declarado)) return 'Arma';
  if (/armadura|escudo|coraza/.test(declarado)) return 'Armadura';
  if (/pocion|consumible|alimento|brebaje/.test(declarado)) return 'Consumible';
  if (/herramienta|pico|martillo|hoz|varita|baston/.test(declarado)) return 'Herramienta';
  if (/documento|pergamino|texto|libro|registro|tratado/.test(declarado)) return 'Documento';
  if (/accesorio/.test(declarado)) return 'Accesorio';
  if (/tesoro|joya|amulet|anillo|reliquia/.test(declarado)) return 'Tesoro';

  if (ruta.includes('Armas')) return 'Arma';
  if (ruta.includes('Armaduras')) return 'Armadura';
  if (ruta.includes('Pociones') || ruta.includes('Consumibles')) return 'Consumible';
  if (ruta.includes('Pergaminos') || ruta.includes('Documentos')) return 'Documento';
  if (ruta.includes('Herramientas') || ruta.includes('Varas') || ruta.includes('Bastones')) return 'Herramienta';
  if (ruta.includes('Amuletos') || ruta.includes('Anillos') || ruta.includes('Joyería') || ruta.includes('Joeria') || ruta.includes('Maravillosos') || ruta.includes('Reliquias')) return 'Tesoro';
  return 'Tesoro';
}

function generoDe(datos) {
  const valor = normalizar(valorDe(datos, 'genero', 'sexo'));
  if (/mujer|fem/.test(valor)) return 'femenino';
  if (/hombre|masculino|varon/.test(valor)) return 'masculino';
  if (/otro|plural|androg/.test(valor)) return 'otro';
  return 'desconocido';
}

function estadoVitalDe(datos) {
  const valor = normalizar(valorDe(datos, 'estado_vital', 'estado'));
  if (/vivo/.test(valor)) return 'vivo';
  if (/muert/.test(valor)) return 'muerto';
  if (/no.?conf/.test(valor)) return 'no_confirmado';
  return 'desconocido';
}

const PRIORIDAD = {
  continente: 0,
  zona_geografica: 1,
  reino_estado: 2,
  localidad: 3,
  distrito: 4,
  raza: 5,
  subraza: 6,
  lengua: 6,
  personaje: 7,
  item: 7,
  recurso: 7,
  faccion: 7,
  religion: 7,
  evento: 8,
  era: 8,
  punto_interes: 8,
};

function prioridadDe(entidad) {
  return entidad ? PRIORIDAD[entidad] : 99;
}

function mimeDe(nombre) {
  const ext = path.extname(nombre).toLowerCase();
  const mapa = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  return mapa[ext] || 'application/octet-stream';
}

async function importar(aplicar, vault) {
  const notas = recolectarNotas(vault);
  const imagenes = indiceImagenes(vault);
  const usarBase = aplicar;

  const estadisticas = {
    notas: notas.length,
    articulosNuevos: 0,
    articulosActualizados: 0,
    imagenesCopiadas: 0,
    imagenesExistentes: 0,
    vacias: 0,
    porEntidad: {},
    errores: [],
  };

  async function idPorNombre(tabla, nombre) {
    if (!nombre || !usarBase) return null;
    const fila = await db.consultarUno('SELECT id FROM `' + tabla + '` WHERE `nombre` = ? LIMIT 1', [nombre]);
    return fila ? fila.id : null;
  }

  let adminId = 1;
  if (usarBase) {
    const admin = await db.consultarUno('SELECT id FROM `usuario` WHERE `nombre_usuario` = ? LIMIT 1', ['Kendry']);
    if (admin) adminId = admin.id;
  }

  async function buscarCatalogo(catalogo, nombre) {
    if (!usarBase || !nombre) return null;
    const fila = await db.consultarUno('SELECT id FROM `' + catalogo + '` WHERE LOWER(`nombre`) = ? LIMIT 1', [normalizar(nombre)]);
    return fila ? fila.id : null;
  }

  async function asegurar(tabla, nombre, columnas) {
    const claves = Object.keys(columnas || {});
    const valores = claves.map((c) => (columnas[c] === null || columnas[c] === undefined ? null : columnas[c]));
    estadisticas.porEntidad[tabla] = (estadisticas.porEntidad[tabla] || 0) + 1;

    if (!usarBase) return 'nuevo';

    const existente = await idPorNombre(tabla, nombre);
    if (existente) {
      if (columnas.descripcion) {
        await db.ejecutar('UPDATE `' + tabla + '` SET `descripcion` = ? WHERE id = ?', [columnas.descripcion || '', existente]);
      }
      return 'existente';
    }

    try {
      const lista = claves.map((c) => '`' + c + '`').join(', ');
      const marcadores = claves.map(() => '?').join(', ');
      await db.ejecutar('INSERT INTO `' + tabla + '` (' + lista + ') VALUES (' + marcadores + ')', valores);
      return 'nuevo';
    } catch (error) {
      estadisticas.errores.push(tabla + ' / ' + nombre + ': ' + (error ? error.message : ''));
      return 'error';
    }
  }

  async function copiarImagen(nombre, enlacesActivos) {
    const origen = imagenes.get(nombre.toLowerCase());
    if (!origen) return null;

    const destino = path.join(config.rutas.subidas, nombre);
    const rutaPublica = URL_SUBIDAS + encodeURIComponent(nombre);

    if (usarBase) {
      const filaImagen = await db.consultarUno('SELECT id FROM `imagen` WHERE `ruta` = ? LIMIT 1', [rutaPublica]);
      if (filaImagen) return filaImagen.id;
    }

    const yaExisteArchivo = fs.existsSync(destino);
    if (!yaExisteArchivo) {
      if (aplicar) {
        fs.mkdirSync(config.rutas.subidas, { recursive: true });
        fs.copyFileSync(origen, destino);
        estadisticas.imagenesCopiadas += 1;
      }
    } else if (aplicar) {
      estadisticas.imagenesExistentes += 1;
    }

    if (!usarBase) return 'nuevo';

    try {
      const tamano = fs.statSync(destino).size;
      const resultado = await db.ejecutar(
        'INSERT INTO `imagen` (nombre_archivo, ruta, mime_type, tamano_bytes, alt_texto, subido_por) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre, rutaPublica, mimeDe(nombre), tamano, nombre, adminId]
      );
      return resultado.insertId;
    } catch (error) {
      const filaImagen = await db.consultarUno('SELECT id FROM `imagen` WHERE `ruta` = ? LIMIT 1', [rutaPublica]);
      if (filaImagen) return filaImagen.id;
      estadisticas.errores.push('imagen / ' + nombre + ': ' + (error ? error.message : ''));
      return null;
    }
  }

  const pendientes = notas
    .map((nota) => {
      const ficha = leerFrontmatter(nota.texto);
      const entidad = detectarEntidad(nota.relativa, valorDe(ficha.datos, 'tipo'));
      const nombre = valorDe(ficha.datos, 'nombre') || path.basename(nota.relativa, '.md');
      return { nota, ficha, entidad, nombre };
    })
    .sort((a, b) => prioridadDe(a.entidad) - prioridadDe(b.entidad));

  const enlacesActivos = { imagenes: new Set() };

  const vistas = notas.map((nota) => {
    const pars = leerFrontmatter(nota.texto);
    const nombre = path.basename(nota.relativa.replace(/[\\/]/g, '/'), '.md');
    const carpeta = path.posix.dirname(nota.relativa.replace(/[\\/]/g, '/')) === '.'
      ? ''
      : path.posix.dirname(nota.relativa.replace(/[\\/]/g, '/'));
    const datos = pars.datos;
    const nombres = new Set([normalizarClave(normalizarNombre(nombre))]);
    const titular = valorDe(datos, 'nombre');
    if (titular) nombres.add(normalizarClave(normalizarNombre(titular)));
    for (const clave of ['alias', 'aliases', 'apodos']) {
      for (const a of valorComoLista(obtenerCampo({ datos, nombre, carpeta }, clave))) {
        nombres.add(normalizarClave(normalizarNombre(a)));
      }
    }
    return { nombre, carpeta, datos, nombres };
  });

  for (const p of pendientes) {
    const principal = valorDe(p.ficha.datos, 'imagen_principal');
    if (principal && imagenes.has(path.basename(principal).toLowerCase())) {
      enlacesActivos.imagenes.add(path.basename(principal).toLowerCase());
    }
    const embebidas = String(p.ficha.cuerpo).match(/!\[\[[^\]|]+\.(?:png|jpe?g|gif|webp|svg)/gi) || [];
    for (const embebida of embebidas) {
      const nombre = path.basename(embebida.replace(/^!\[\[/, ''));
      if (imagenes.has(nombre.toLowerCase())) enlacesActivos.imagenes.add(nombre.toLowerCase());
    }
  }

  console.log('Vault: ' + vault);
  console.log('Notas a importar: ' + notas.length + ' | Imagenes citadas: ' + enlacesActivos.imagenes.size);
  console.log('Modo: ' + (aplicar ? 'APLICAR (escribe en la base y copia archivos)' : 'PLAN (no escribe nada)'));
  console.log('');

  for (const p of pendientes) {
    const ficheroNombre = path.basename(p.nota.relativa.replace(/[\\/]/g, '/'), '.md');
    const cuerpo = resolverCuerpo(p.ficha, enlacesActivos, ficheroNombre, vistas);

    if (!cuerpo.markdown.trim()) {
      estadisticas.vacias += 1;
      console.log('  [vacia]  ' + p.nombre + (p.entidad ? '  (' + p.entidad + ')' : ''));
      continue;
    }

    const principal = valorDe(p.ficha.datos, 'imagen_principal');
    const imagenNombre = principal && imagenes.has(path.basename(principal).toLowerCase()) ? path.basename(principal) : '';
    const imagenId = imagenNombre ? await copiarImagen(imagenNombre, enlacesActivos) : (usarBase ? null : 'nuevo');
    const tipoItem = p.entidad === 'item' ? tipoItemDe(p.nota.relativa, p.ficha.datos) : '';

    if (p.entidad) {
      await asegurarEntidad(p, cuerpo, imagenId);
    }

    const resumen = cuerpo.resumen || 'Nota de mundo importada desde Obsidian.';
    const categoria = categoriaDe(p.entidad, tipoItem);

    if (usarBase) {
      const categoriaId = await buscarCatalogo('categoria', categoria) || 1;
      const etiqueta = cuerpo.tieneProsa ? 'canonico' : 'en_desarrollo';
      const etiquetaId = await buscarCatalogo('etiqueta', etiqueta);
      const slug = slugificar(p.nombre);

      const existente = await db.consultarUno('SELECT id FROM `articulo` WHERE `slug` = ? LIMIT 1', [slug]);
      if (existente) {
        await db.ejecutar(
          'UPDATE `articulo` SET titulo = ?, resumen = ?, contenido_md = ?, estado = ?, categoria_id = ?, imagen_id = ? WHERE id = ?',
          [p.nombre, resumen, cuerpo.markdown, 'publicado', categoriaId, imagenId, existente.id]
        );
        estadisticas.articulosActualizados += 1;
      } else {
        try {
          const resultado = await db.ejecutar(
            'INSERT INTO `articulo` (titulo, slug, resumen, contenido_md, estado, categoria_id, imagen_id, autor_id, publicado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [p.nombre, slug, resumen, cuerpo.markdown, 'publicado', categoriaId, imagenId, adminId]
          );
          estadisticas.articulosNuevos += 1;
          if (etiquetaId) {
            await db.ejecutar('INSERT INTO `articulo_etiqueta` (articulo_id, etiqueta_id) VALUES (?, ?)', [resultado.insertId, etiquetaId]);
          }
        } catch (error) {
          estadisticas.errores.push('articulo / ' + p.nombre + ': ' + (error ? error.message : ''));
        }
      }

      console.log('  [ok] ' + p.nombre + (p.entidad ? '  (' + p.entidad + ')' : ''));
    } else {
      console.log('  [plan] ' + p.nombre + (p.entidad ? '  (' + p.entidad + ')' : ''));
    }
  }

  async function asegurarEntidad(p, cuerpo, imagenId) {
    const nombre = p.nombre;
    const descripcion = cuerpo.resumen || null;

    if (p.entidad === 'continente') {
      return asegurar('continente', nombre, { nombre, descripcion });
    }

    if (p.entidad === 'zona_geografica') {
      const tipo = normalizar(valorDe(p.ficha.datos, 'tipo_zona', 'clima', 'tipo_geografico'));
      const sinAcentos = { montana: 'montana', costa: 'costa', desierto: 'desierto', selva: 'selva', bosque: 'bosque', pradera: 'pradera', isla: 'isla', valle: 'valle', rio: 'rio', otro: 'otro' };
      return asegurar('zona_geografica', nombre, { nombre, descripcion, tipo: sinAcentos[tipo] || 'otro' });
    }

    if (p.entidad === 'localidad') {
      const tipoAsentamiento = tipoAsentamientoDe(p.nota.relativa, valorDe(p.ficha.datos, 'tipo_localidad'));
      const tipoId = (await buscarCatalogo('tipo_asentamiento', tipoAsentamiento)) || 1;
      return asegurar('localidad', nombre, { nombre, descripcion, tipo_asentamiento_id: tipoId });
    }

    if (p.entidad === 'distrito') {
      const localidad = limpiarValor(valorDe(p.ficha.datos, 'localidad')) || path.basename(path.dirname(p.nota.relativa.replace(/[\\/]/g, '/')));
      const localidadId = await idPorNombre('localidad', localidad);
      if (!localidadId) {
        if (usarBase) estadisticas.errores.push('distrito / ' + nombre + ': falta localidad valida (' + localidad + ')');
        return 'error';
      }
      return asegurar('distrito', nombre, { nombre, descripcion, localidad_id: localidadId });
    }

    if (p.entidad === 'reino_estado') {
      const continente = limpiarValor(valorDe(p.ficha.datos, 'continente')) || 'Entheos';
      const continenteId = (await buscarCatalogo('continente', continente)) || 1;
      return asegurar('reino_estado', nombre, { nombre, descripcion, continente_id: continenteId });
    }

    if (p.entidad === 'raza') {
      return asegurar('raza', nombre, {
        nombre,
        descripcion,
        longitud_caracteristica: valorDe(p.ficha.datos, 'longitud_caracteristica', 'esperanza_vida', 'lifespan') || null,
      });
    }

    if (p.entidad === 'subraza') {
      const segmentos = p.nota.relativa.split('/');
      const padre = limpiarValor(valorDe(p.ficha.datos, 'raza')) || (segmentos[segmentos.indexOf('Subrazas') + 1] ?? '');
      const razaId = padre ? await idPorNombre('raza', padre) : null;
      if (!razaId) {
        if (usarBase) estadisticas.errores.push('subraza / ' + nombre + ': falta raza valida (' + padre + ')');
        return 'error';
      }
      return asegurar('subraza', nombre, { nombre, descripcion, raza_id: razaId });
    }

    if (p.entidad === 'personaje') {
      const raza = limpiarValor(valorDe(p.ficha.datos, 'raza', 'subraza'));
      const localidad = limpiarValor(valorDe(p.ficha.datos, 'localidad', 'localidad_origen'));
      return asegurar('personaje', nombre, {
        nombre,
        titulo: valorDe(p.ficha.datos, 'titulo') || null,
        descripcion,
        raza_id: raza ? await idPorNombre('raza', raza) : null,
        localidad_origen_id: localidad ? await idPorNombre('localidad', localidad) : null,
        genero: generoDe(p.ficha.datos),
        estado_vital: estadoVitalDe(p.ficha.datos),
        ocupacion: valorDe(p.ficha.datos, 'ocupacion', 'ocupación', 'profesion') || null,
      });
    }

    if (p.entidad === 'item') {
      const tipo = tipoItemDe(p.nota.relativa, p.ficha.datos);
      const tipoId = (await buscarCatalogo('tipo_item', tipo)) || 7;
      const rareza = limpiarValor(valorDe(p.ficha.datos, 'rareza')) || 'Comun';
      const rarezaId = (await buscarCatalogo('rareza', rareza)) || 1;
      return asegurar('item', nombre, {
        nombre,
        descripcion,
        tipo_item_id: tipoId,
        rareza_id: rarezaId,
        imagen_id: imagenId,
        valor: numeroDe(p.ficha.datos, 'valor', 'precio'),
      });
    }

    if (p.entidad === 'recurso') {
      return asegurar('recurso', nombre, {
        nombre,
        descripcion,
        unidad_medida: normalizar(valorDe(p.ficha.datos, 'unidad_medida')) || 'unidad',
      });
    }

    if (p.entidad === 'faccion') {
      return asegurar('faccion', nombre, { nombre, descripcion });
    }

    if (p.entidad === 'religion') {
      return asegurar('religion', nombre, { nombre, descripcion });
    }

    if (p.entidad === 'lengua') {
      return asegurar('lengua', nombre, { nombre, descripcion, hablantes: numeroDe(p.ficha.datos, 'hablantes') });
    }

    if (p.entidad === 'evento') {
      const era = limpiarValor(valorDe(p.ficha.datos, 'era', 'era_relacionada'));
      const canonicoTexto = normalizar(valorDe(p.ficha.datos, 'es_canonico', 'canonicidad'));
      return asegurar('evento', nombre, {
        nombre,
        descripcion,
        anio_aproximado: numeroDe(p.ficha.datos, 'anio', 'año', 'ano', 'anio_aproximado'),
        era_id: era ? await buscarCatalogo('era', era) : null,
        es_canonico: canonicoTexto ? (canonicoTexto === 'false' ? 0 : 1) : 1,
      });
    }

    if (p.entidad === 'era') {
      return asegurar('era', nombre, {
        nombre,
        descripcion,
        anio_inicio: numeroDe(p.ficha.datos, 'anio_inicio', 'año_inicio', 'ano_inicio'),
        anio_fin: numeroDe(p.ficha.datos, 'anio_fin', 'año_fin', 'ano_fin'),
      });
    }

    if (p.entidad === 'punto_interes') {
      const localidad = limpiarValor(valorDe(p.ficha.datos, 'localidad'));
      if (!localidad) {
        if (usarBase) estadisticas.errores.push('punto_interes / ' + nombre + ': falta campo localidad');
        return 'error';
      }
      const localidadId = await idPorNombre('localidad', localidad);
      if (!localidadId) {
        if (usarBase) estadisticas.errores.push('punto_interes / ' + nombre + ': falta localidad valida (' + localidad + ')');
        return 'error';
      }
      const tipos = ['templo', 'fortaleza', 'mercado', 'academia', 'biblioteca', 'taberna', 'puerto', 'mina', 'monumento', 'criadero', 'otro'];
      const tipo = normalizar(valorDe(p.ficha.datos, 'tipo_punto', 'tipo_lugar'));
      return asegurar('punto_interes', nombre, {
        nombre,
        descripcion,
        tipo: tipos.includes(tipo) ? tipo : 'otro',
        localidad_id: localidadId,
      });
    }

    return null;
  }

  console.log('');
  console.log(aplicar ? 'Importacion aplicada.' : 'Plan generado. Ejecuta con --aplicar para escribir en la base.');
  console.log('  Notas: ' + notas.length + ' | vacias (sin contenido): ' + estadisticas.vacias);
  console.log('  Articulos nuevos: ' + estadisticas.articulosNuevos + ' | actualizados: ' + estadisticas.articulosActualizados);
  if (aplicar) {
    const tablas = Object.keys(estadisticas.porEntidad).sort();
    for (const tabla of tablas) console.log('  ' + tabla + ': ' + estadisticas.porEntidad[tabla]);
    console.log('  Imagenes copiadas: ' + estadisticas.imagenesCopiadas + ' | ya existentes: ' + estadisticas.imagenesExistentes);
  }
  if (estadisticas.errores.length) {
    console.log('  Errores: ' + estadisticas.errores.length);
    for (const error of estadisticas.errores.slice(0, 15)) console.log('    - ' + error);
  }
}

function main() {
  const { aplicar, vault } = leerArgumentos();
  importar(aplicar, vault)
    .then(() => db.grupo.end())
    .catch((error) => {
      console.error('No se pudo importar: ' + (error ? error.stack || error.message : error));
      db.grupo.end().catch(() => {});
      process.exit(1);
    });
}

if (require.main === module) main();

module.exports = { importar };