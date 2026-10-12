'use strict';

const SELECTOR_VALIDO = /^[A-Za-z_][\w-]*$/;
const ESPERA_SUGERENCIAS = 220;
const ESPERA_FETCH = 5000;

function erroresDe(campo) {
  if (!campo || !campo.id || !SELECTOR_VALIDO.test(campo.id)) return null;
  return document.querySelector(`[data-error-de="${campo.id}"]`);
}

const reglasDe = {
  requerido: (valor) => valor.trim().length > 0,
  email: (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim()),
};

function validarCampo(campo) {
  const igualA = campo.dataset.igualA;
  const tipo = campo.type;
  const valor = campo.value;
  let correcto = true;

  if (campo.hasAttribute('required')) correcto = reglasDe.requerido(valor);
  if (correcto && tipo === 'email' && valor) correcto = reglasDe.email(valor);
  if (correcto && igualA) {
    const otro = document.getElementById(igualA);
    correcto = !!otro && valor === otro.value;
  }
  if (correcto && typeof campo.checkValidity === 'function') {
    correcto = campo.checkValidity();
  }

  campo.classList.toggle('invalido', !correcto);

  const destino = erroresDe(campo);
  if (destino) destino.textContent = correcto ? '' : campo.dataset.error || 'Revisar este campo.';

  return correcto;
}

function activarValidacion(formulario) {
  const campos = formulario.querySelectorAll('input, textarea, select');

  campos.forEach((campo) => {
    campo.addEventListener('blur', () => validarCampo(campo));
    campo.addEventListener('input', () => {
      if (campo.classList.contains('invalido')) validarCampo(campo);
    });
  });

  formulario.addEventListener('submit', (evento) => {
    const invalidos = [...campos].filter((campo) => !validarCampo(campo));

    if (invalidos.length === 0) return;

    evento.preventDefault();
    invalidos[0].focus();
  });
}

function activarMenu() {
  const navegacion = document.getElementById('navegacion-principal');
  if (!navegacion) return;

  const sincronizar = (abierta) => {
    navegacion.classList.toggle('abierta', abierta);
    document.body.classList.toggle('menu-abierto', abierta);
  };

  document.querySelectorAll('.boton-menu, .accesos-boton').forEach((boton) => {
    boton.addEventListener('click', () => {
      const abierta = !navegacion.classList.contains('abierta');
      sincronizar(abierta);
      boton.setAttribute('aria-expanded', String(abierta));
    });
  });

  const accesos = document.querySelector('.accesos-rapidos');
  if (accesos) {
    accesos.addEventListener('mouseenter', () => {
      document.body.classList.add('menu-abierto');
    });
    accesos.addEventListener('mouseleave', () => {
      if (!navegacion.classList.contains('abierta')) {
        document.body.classList.remove('menu-abierto');
      }
    });
  }
}

function itemDeSugerencia(elemento) {
  const item = document.createElement('li');
  const titulo = document.createElement('span');
  item.setAttribute('role', 'option');
  titulo.textContent = elemento.titulo;
  item.append(titulo);

  if (elemento.tipo) {
    const tipo = document.createElement('span');
    tipo.className = 'sugerencia-tipo';
    tipo.textContent = elemento.tipo;
    item.append(tipo);
  }

  item.addEventListener('mousedown', (evento) => {
    evento.preventDefault();
    window.location.assign(elemento.enlace);
  });

  return item;
}

function pintarSugerencias(lista, elementos) {
  const fragmento = document.createDocumentFragment();

  if (elementos.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'vacio-sugerencia';
    vacio.textContent = 'Sin resultados';
    fragmento.append(vacio);
  } else {
    elementos.forEach((elemento, indice) => {
      const item = itemDeSugerencia(elemento);
      item.setAttribute('aria-selected', indice === 0 ? 'true' : 'false');
      fragmento.append(item);
    });
  }

  lista.replaceChildren(fragmento);
}

async function pedirSugerencias(termino, señal) {
  const url = `/buscar?formato=json&q=${encodeURIComponent(termino)}`;
  const respuesta = await fetch(url, {
    signal: señal,
    headers: { Accept: 'application/json' },
  });

  if (!respuesta.ok) throw new Error(`La búsqueda falló con el código ${respuesta.status}`);

  return respuesta.json();
}

function activarAutocompletado(campo) {
  const contenedor = campo.closest('form') || campo.parentElement;
  const lista = contenedor ? contenedor.querySelector('[data-sugerencias]') : null;

  if (!lista) return;

  let temporizador = null;
  let peticion = null;

  const ocultar = () => {
    lista.hidden = true;
  };

  const buscar = async (termino, señal) => {
    try {
      pintarSugerencias(lista, await pedirSugerencias(termino, señal));
      lista.hidden = false;
    } catch (error) {
      if (error.name !== 'AbortError') ocultar();
    }
  };

  campo.addEventListener('input', () => {
    const termino = campo.value.trim();

    clearTimeout(temporizador);
    if (peticion) peticion.abort();

    if (termino.length < 2) {
      ocultar();
      return;
    }

    temporizador = setTimeout(() => {
      peticion = new AbortController();
      const limite = setTimeout(() => peticion.abort(), ESPERA_FETCH);
      buscar(termino, peticion.signal).finally(() => clearTimeout(limite));
    }, ESPERA_SUGERENCIAS);
  });

  campo.addEventListener('blur', () => setTimeout(ocultar, 120));

  campo.addEventListener('keydown', (evento) => {
    const items = [...lista.querySelectorAll('li:not(.vacio-sugerencia)')];

    if (lista.hidden || items.length === 0) return;

    const teclas = ['ArrowDown', 'ArrowUp', 'Enter'];
    if (!teclas.includes(evento.key)) return;

    const elegido = items.findIndex((item) => item.getAttribute('aria-selected') === 'true');

    if (evento.key === 'Enter') {
      if (elegido < 0) return;
      evento.preventDefault();
      items[elegido].dispatchEvent(new MouseEvent('mousedown'));
      return;
    }

    evento.preventDefault();
    const salto = evento.key === 'ArrowDown' ? 1 : -1;
    const indice = (elegido + salto + items.length) % items.length;

    items.forEach((item, i) => item.setAttribute('aria-selected', String(i === indice)));
    items[indice].scrollIntoView({ block: 'nearest' });
  });
}

function activarContadores() {
  document.querySelectorAll('[data-contador-de]').forEach((contador) => {
    const campo = document.getElementById(contador.dataset.contadorDe);

    if (!campo) return;

    const actualizar = () => {
      const largo = campo.value.length;
      const tope = campo.maxLength > 0 ? ` de ${campo.maxLength}` : '';
      contador.textContent = largo + (largo === 1 ? ' carácter' : ' caracteres') + tope;

      if (largo < 10) return;

      const estado = erroresDe(campo);
      if (estado && campo.classList.contains('invalido')) {
        estado.textContent = '';
        campo.classList.remove('invalido');
      }
    };

    campo.addEventListener('input', actualizar);
    actualizar();
  });
}

// Muestra solo los campos de ubicación que corresponden a la categoría elegida.
// Los campos ocultos igual llegan al servidor, pero este solo usa los de su
// categoría para anclar la nota en las tablas del mundo.
function activarUbicacion(formulario) {
  const categoria = formulario.querySelector('#categoria');
  const seccion = formulario.querySelector('#ubicacion');

  if (!categoria || !seccion) return;

  const campos = [...seccion.querySelectorAll('.ubicacion-campo')];
  const tipo = formulario.querySelector('#tipo_asentamiento_id');
  const continente = formulario.querySelector('#continente_id');

  const actualizar = () => {
    const opcion = categoria.options[categoria.selectedIndex];
    const nombre = opcion ? opcion.textContent.trim() : '';
    let visible = false;

    campos.forEach((campo) => {
      const corresponde = (campo.dataset.categorias || '').split(',').includes(nombre);
      campo.style.display = corresponde ? '' : 'none';
      if (corresponde) visible = true;
    });

    seccion.style.display = visible ? '' : 'none';
    if (tipo) tipo.required = nombre === 'Localidades';
    if (continente) continente.required = nombre === 'Reinos y Estados';
  };

  categoria.addEventListener('change', actualizar);
  actualizar();
}

// Rellena el contenido con la plantilla elegida. Las plantillas viven en
// etiquetas <template> de la página (inertes, no las bloquea la CSP).
function activarPlantillas(formulario) {
  const selector = formulario.querySelector('#template');
  const campo = formulario.querySelector('#contenido');

  if (!selector || !campo) return;

  selector.addEventListener('change', () => {
    const elegido = selector.value;
    const plantilla = elegido
      ? formulario.querySelector(`template[data-plantilla="${elegido}"]`)
      : null;

    if (plantilla) {
      campo.value = plantilla.content.textContent;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }

    localStorage.setItem('lastTemplate', elegido);
  });
}

function iniciar() {
  document.querySelectorAll('form[data-validar]').forEach((formulario) => {
    activarValidacion(formulario);
    activarUbicacion(formulario);
    activarPlantillas(formulario);
  });
  document.querySelectorAll('[data-autocompletado]').forEach(activarAutocompletado);
  activarMenu();
  activarContadores();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}