// app.js — Bootstrap y navegación SPA
// Requisitos: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.7, 12.7

/**
 * Definición de los 6 tabs de la Tab Bar.
 * Cada entrada referencia el módulo que se activará al navegar.
 * Requisito 2.2.
 */
const TABS = [
  { id: 'ventas',        label: 'Ventas',        icono: '🌽', modulo: function () { return typeof VentasModule !== 'undefined' ? VentasModule : null } },
  { id: 'gastos',        label: 'Gastos',         icono: '💸', modulo: function () { return typeof GastosModule !== 'undefined' ? GastosModule : null } },
  { id: 'dashboard',     label: 'Resumen',        icono: '📊', modulo: function () { return typeof DashboardModule !== 'undefined' ? DashboardModule : null } },
  { id: 'analisis',      label: 'Análisis',       icono: '📈', modulo: function () { return typeof AnalisisModule !== 'undefined' ? AnalisisModule : null } },
  { id: 'historial',     label: 'Historial',      icono: '📋', modulo: function () { return typeof HistorialModule !== 'undefined' ? HistorialModule : null } },
  { id: 'configuracion', label: 'Configuración',  icono: '⚙️', modulo: function () { return typeof ConfiguracionModule !== 'undefined' ? ConfiguracionModule : null } }
]

/** Tab actualmente activo (se actualiza en cada llamada a navegarA). */
var _tabActivo = null

/**
 * Navega al módulo indicado por tabId.
 *
 * 1. Limpia el contenido de #app-content.
 * 2. Actualiza las clases "activo" / "inactivo" y aria-selected de cada botón.
 * 3. Llama a modulo.render() si el módulo está disponible.
 *
 * Expuesta como global para que los módulos puedan llamarla.
 * Requisitos: 2.3, 2.4, 2.5.
 *
 * @param {string} tabId - Identificador del tab destino.
 */
function navegarA(tabId) {
  _tabActivo = tabId

  // Limpiar contenido actual (SPA — sin recarga de página)
  var appContent = document.getElementById('app-content')
  if (appContent) {
    appContent.innerHTML = ''
  }

  // Aplicar acento de sección activa (Requisito 1.5)
  document.documentElement.style.setProperty(
    '--acento-seccion-activa',
    getComputedStyle(document.documentElement).getPropertyValue('--acento-' + tabId)
  );

  // Actualizar estado visual de los botones de tab
  TABS.forEach(function (tab) {
    var btn = document.getElementById('tab-btn-' + tab.id)
    if (!btn) return

    var esActivo = tab.id === tabId
    btn.className = esActivo ? 'activo' : 'inactivo'
    btn.setAttribute('aria-selected', esActivo ? 'true' : 'false')
  })

  // Llamar al render del módulo correspondiente
  var tabDef = TABS.find(function (t) { return t.id === tabId })
  if (tabDef) {
    var modulo = tabDef.modulo()
    if (modulo && typeof modulo.render === 'function') {
      modulo.render()
    }
  }

  // Animar transición de sección (Requisitos 4.1, 4.2)
  if (appContent && typeof AnimationsModule !== 'undefined') {
    AnimationsModule.animarTransicionSeccion(appContent);
  }
}

/**
 * Construye dinámicamente los 6 botones de la Tab Bar dentro de #tab-bar.
 * Cada botón incluye:
 *   - Ícono emoji en un <span>
 *   - Etiqueta de texto en un <span>
 *   - aria-label con el nombre del tab (Requisito 12.7)
 *   - área táctil mínima 44×44 px (garantizada por CSS, Requisito 2.6)
 * Requisitos: 2.1, 2.2, 2.6, 12.7.
 */
function construirTabBar() {
  var tabBar = document.getElementById('tab-bar')
  if (!tabBar) return

  // Limpiar contenido previo por si se llama más de una vez
  tabBar.innerHTML = ''

  TABS.forEach(function (tab) {
    var btn = document.createElement('button')
    btn.id = 'tab-btn-' + tab.id
    btn.type = 'button'
    btn.className = 'inactivo'
    btn.setAttribute('aria-label', tab.label)
    btn.setAttribute('aria-selected', 'false')
    btn.setAttribute('role', 'tab')

    // Ícono
    var spanIcono = document.createElement('span')
    spanIcono.setAttribute('aria-hidden', 'true')
    spanIcono.textContent = tab.icono

    // Etiqueta de texto
    var spanLabel = document.createElement('span')
    spanLabel.textContent = tab.label

    btn.appendChild(spanIcono)
    btn.appendChild(spanLabel)

    // Manejador de click — navega al tab correspondiente
    btn.addEventListener('click', function () {
      navegarA(tab.id)
    })

    tabBar.appendChild(btn)
  })
}

/**
 * Muestra un banner de error persistente en el DOM.
 * El banner no se puede cerrar — bloquea el uso de la app cuando
 * IndexedDB no está disponible (Requisito 3.7).
 * @param {string} mensaje
 */
function mostrarErrorPersistente(mensaje) {
  // Evitar duplicados si se llama más de una vez
  if (document.getElementById('error-banner')) return

  var banner = document.createElement('div')
  banner.id = 'error-banner'
  banner.setAttribute('role', 'alert')
  banner.setAttribute('aria-live', 'assertive')
  banner.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100%',
    'background: #C62828',
    'color: #FFFFFF',
    'font-size: 16px',
    'font-weight: bold',
    'text-align: center',
    'padding: 16px 12px',
    'z-index: 9999',
    'box-sizing: border-box'
  ].join(';')
  banner.textContent = mensaje

  document.body.prepend(banner)
}

/**
 * Registra el Service Worker desde /sw.js.
 * Los errores de registro se silencian — no son bloqueantes
 * (el Service Worker es una mejora progresiva).
 * Requisito 1.2.
 */
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.warn('Service Worker: fallo al registrar —', err)
    })
  }
}

/**
 * Función de inicialización principal.
 * 1. Inicializa IndexedDB; muestra banner de error persistente si falla.
 * 2. Construye la Tab Bar dinámicamente.
 * 3. Registra el Service Worker.
 * 4. Navega al tab inicial 'ventas'.
 * Requisitos: 1.2, 2.1–2.6, 3.7, 12.7.
 */
async function init() {
  try {
    await DB.init()
  } catch (error) {
    console.error('Error al inicializar IndexedDB:', error)
    mostrarErrorPersistente('El almacenamiento local no está disponible')
    return
  }

  // Construir la Tab Bar con los 6 botones dinámicos
  construirTabBar()

  // Registrar event listener delegado para ripple en elementos interactivos (Requisitos 4.1, 4.2)
  var appContent = document.getElementById('app-content')
  if (appContent && typeof AnimationsModule !== 'undefined') {
    appContent.addEventListener('pointerdown', function (e) {
      var target = e.target.closest('button, .glass-card, .producto-card')
      if (!target) return
      var rect = target.getBoundingClientRect()
      var x = e.clientX - rect.left
      var y = e.clientY - rect.top
      AnimationsModule.crearRipple(target, x, y)
    })
  }

  registrarServiceWorker()

  // Navegar al tab inicial
  navegarA('ventas')
}

document.addEventListener('DOMContentLoaded', init)
