'use strict';

const lateral = document.getElementById('lateral');
const boton = document.getElementById('alternar');
const filtro = document.getElementById('filtro');
const resultados = document.getElementById('resultados');
const subir = document.getElementById('subir');
const enlaces = Array.from(document.querySelectorAll('.secciones-lista a'));
const grupos = Array.from(document.querySelectorAll('.grupo'));
const secciones = Array.from(document.querySelectorAll('.seccion, .documento'));

if (boton && lateral) {
  boton.addEventListener('click', () => {
    const abierto = lateral.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', String(abierto));
  });

  lateral.addEventListener('click', (evento) => {
    if (evento.target.closest('a') && window.matchMedia('(max-width: 900px)').matches) {
      lateral.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (evento) => {
    if (!lateral.classList.contains('abierto')) return;
    if (lateral.contains(evento.target) || boton.contains(evento.target)) return;
    lateral.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
  });
}

if (filtro) {
  filtro.addEventListener('input', () => {
    const termino = filtro.value.trim().toLowerCase();
    let visibles = 0;

    for (const grupo of grupos) {
      let dentro = 0;
      for (const enlace of grupo.querySelectorAll('.secciones-lista a')) {
        const coincide = !termino || enlace.dataset.buscar.includes(termino);
        enlace.parentElement.classList.toggle('oculto', !coincide);
        if (coincide) dentro++;
      }
      grupo.classList.toggle('oculto', dentro === 0);
      grupo.open = termino ? dentro > 0 : grupo.open;
      visibles += dentro;
    }

    resultados.textContent = termino
      ? (visibles === 0 ? 'Sin resultados' : visibles + (visibles === 1 ? ' coincidencia' : ' coincidencias'))
      : '';
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== '/' || evento.ctrlKey || evento.metaKey) return;
    const activo = document.activeElement;
    const escribiendo = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA');
    if (escribiendo) return;
    evento.preventDefault();
    filtro.focus();
    filtro.select();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || document.activeElement !== filtro) return;
    filtro.value = '';
    filtro.dispatchEvent(new Event('input'));
    filtro.blur();
  });
}

if (subir) {
  subir.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

let activo = null;
const marcarActivo = (enlace) => {
  if (activo === enlace) return;
  if (activo) activo.classList.remove('activo');
  activo = enlace;
  if (activo) {
    activo.classList.add('activo');
    const grupo = activo.closest('.grupo');
    if (grupo && !grupo.open) grupo.open = true;
  }
};

if ('IntersectionObserver' in window && enlaces.length) {
  const porId = new Map(enlaces.map((e) => [e.getAttribute('href').slice(1), e]));
  const visibles = new Set();

  const observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      const id = entrada.target.id;
      if (entrada.isIntersecting) visibles.add(id);
      else visibles.delete(id);
    }

    const primero = secciones
      .filter((s) => visibles.has(s.id))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];

    if (!primero) return;

    const enlace = porId.get(primero.id);
    if (!enlace) return;

    marcarActivo(enlace);

    if (!lateral) return;
    const caja = lateral.getBoundingClientRect();
    const mine = enlace.getBoundingClientRect();
    if (mine.top < caja.top + 12 || mine.bottom > caja.bottom - 12) {
      lateral.scrollTop += mine.top - caja.top - caja.height / 2;
    }
  }, { rootMargin: '-84px 0px -62% 0px', threshold: 0 });

  secciones.forEach((s) => observador.observe(s));
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    if (subir) subir.classList.toggle('visible', window.scrollY > 500);
    ticking = false;
  });
}, { passive: true });