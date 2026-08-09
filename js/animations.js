/**
 * AnimationsModule — Micro-animaciones y feedback visual.
 * Respeta prefers-reduced-motion.
 * Solo anima transform y opacity (GPU-accelerated).
 */
var AnimationsModule = (function () {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Crea un ripple en el punto de contacto.
   * @param {HTMLElement} el - Elemento interactivo
   * @param {number} x - Coordenada X del toque relativa al elemento
   * @param {number} y - Coordenada Y del toque relativa al elemento
   */
  function crearRipple(el, x, y) {
    if (reducedMotion) return;
    var ripple = document.createElement('span');
    ripple.className = 'ripple-efecto';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    el.appendChild(ripple);
    el.style.willChange = 'transform';
    setTimeout(function () {
      ripple.remove();
      el.style.willChange = '';
    }, 400);
  }

  /**
   * Anima la entrada de una card.
   * @param {HTMLElement} card
   */
  function animarEntradaCard(card) {
    if (reducedMotion) return;
    card.style.willChange = 'transform, opacity';
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    requestAnimationFrame(function () {
      card.style.transition = 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 300ms cubic-bezier(0.25,0.46,0.45,0.94)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      setTimeout(function () {
        card.style.willChange = '';
      }, 300);
    });
  }

  /**
   * Anima la transición de contenido al cambiar de sección.
   * @param {HTMLElement} contenedor
   */
  function animarTransicionSeccion(contenedor) {
    if (reducedMotion) return;
    contenedor.style.willChange = 'transform, opacity';
    contenedor.style.opacity = '0';
    contenedor.style.transform = 'translateY(10px)';
    requestAnimationFrame(function () {
      contenedor.style.transition = 'transform 280ms ease-out, opacity 280ms ease-out';
      contenedor.style.opacity = '1';
      contenedor.style.transform = 'translateY(0)';
      setTimeout(function () {
        contenedor.style.willChange = '';
      }, 280);
    });
  }

  return {
    crearRipple: crearRipple,
    animarEntradaCard: animarEntradaCard,
    animarTransicionSeccion: animarTransicionSeccion,
    reducedMotion: reducedMotion
  };
})();
