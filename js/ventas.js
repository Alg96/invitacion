// ventas.js — Módulo de Ventas
// Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8

/**
 * VentasModule — gestiona la pantalla de registro rápido de ventas.
 *
 * render()        — muestra las tarjetas de productos activos
 * registrarVenta  — persiste una venta y muestra confirmación visual
 */
const VentasModule = {

  /** Último id de venta registrada (para deshacer) */
  _ultimaVentaId: null,

  /** Conteos por productoId para el día activo */
  _conteos: {},

  /** Id del día activo actual */
  _diaActivoId: null,

  /**
   * Renderiza el módulo de Ventas en #app-content.
   */
  async render() {
    const contenedor = document.getElementById('app-content')
    if (!contenedor) return

    contenedor.innerHTML = ''

    // ── 1. Verificar día activo ────────────────────────────────────────────────
    let diaActivo
    try {
      diaActivo = await DB.dias.obtenerVigente()
    } catch (err) {
      console.error('VentasModule.render — error al obtener día activo:', err)
      contenedor.appendChild(_crearAviso(
        '⚠️',
        'No se pudo leer el estado del día. Intenta recargar la aplicación.'
      ))
      return
    }

    if (!diaActivo) {
      contenedor.appendChild(_crearAviso(
        '🌽',
        'Inicia el día desde Configuración para registrar ventas.'
      ))
      return
    }

    VentasModule._diaActivoId = diaActivo.id

    // ── 2. Cargar productos activos ────────────────────────────────────────────
    let productos
    try {
      productos = await DB.productos.obtenerActivos()
    } catch (err) {
      console.error('VentasModule.render — error al obtener productos:', err)
      contenedor.appendChild(_crearAviso(
        '⚠️',
        'No se pudo cargar el catálogo de productos. Intenta recargar la aplicación.'
      ))
      return
    }

    if (!productos || productos.length === 0) {
      contenedor.appendChild(_crearAviso(
        '🛒',
        'Agrega productos en Configuración para comenzar a vender.'
      ))
      return
    }

    // ── 3. Calcular conteos de ventas del día ──────────────────────────────────
    try {
      const ventasDelDia = await DB.ventas.obtenerPorDia(diaActivo.id)
      VentasModule._conteos = {}
      for (var i = 0; i < ventasDelDia.length; i++) {
        var v = ventasDelDia[i]
        if (!VentasModule._conteos[v.productoId]) {
          VentasModule._conteos[v.productoId] = 0
        }
        VentasModule._conteos[v.productoId]++
      }
    } catch (err) {
      console.error('VentasModule.render — error al contar ventas:', err)
      VentasModule._conteos = {}
    }

    // ── 4. Resumen del día ─────────────────────────────────────────────────────
    var totalVentas = 0
    for (var key in VentasModule._conteos) {
      totalVentas += VentasModule._conteos[key]
    }

    var resumen = document.createElement('div')
    resumen.className = 'ventas-resumen'
    resumen.id = 'ventas-resumen'

    var resumenTexto = document.createElement('span')
    resumenTexto.className = 'ventas-resumen__texto'
    resumenTexto.textContent = 'Ventas hoy: ' + totalVentas

    resumen.appendChild(resumenTexto)

    // Botón deshacer (oculto inicialmente)
    var btnDeshacer = document.createElement('button')
    btnDeshacer.type = 'button'
    btnDeshacer.className = 'ventas-deshacer'
    btnDeshacer.id = 'btn-deshacer-venta'
    btnDeshacer.textContent = '↩ Deshacer última'
    btnDeshacer.setAttribute('aria-label', 'Deshacer última venta registrada')
    btnDeshacer.style.display = VentasModule._ultimaVentaId ? 'inline-flex' : 'none'
    btnDeshacer.addEventListener('click', function () {
      _deshacerUltimaVenta()
    })

    resumen.appendChild(btnDeshacer)
    contenedor.appendChild(resumen)

    // ── 5. Renderizar grid de tarjetas ─────────────────────────────────────────
    const grid = document.createElement('div')
    grid.className = 'productos-grid'
    grid.id = 'productos-grid'

    productos.forEach(function (producto) {
      const card = _crearTarjetaProducto(producto, diaActivo.id)
      grid.appendChild(card)
    })

    contenedor.appendChild(grid)
  }
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Crea un elemento de aviso (estado vacío / advertencia).
 */
function _crearAviso(icono, mensaje) {
  const div = document.createElement('div')
  div.className = 'empty-state'

  const spanIcono = document.createElement('span')
  spanIcono.className = 'empty-state__icono'
  spanIcono.setAttribute('aria-hidden', 'true')
  spanIcono.textContent = icono

  const p = document.createElement('p')
  p.className = 'empty-state__descripcion'
  p.textContent = mensaje

  div.appendChild(spanIcono)
  div.appendChild(p)

  return div
}

/**
 * Crea la tarjeta táctil para un producto con badge de conteo.
 */
function _crearTarjetaProducto(producto, diaActivoId) {
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'producto-card'
  card.id = 'producto-card-' + producto.id

  card.style.minHeight = '44px'
  card.style.minWidth = '44px'

  card.setAttribute('aria-label', producto.nombre + ' — $' + producto.precio)

  // Nombre del producto
  const nombre = document.createElement('span')
  nombre.className = 'producto-card__nombre'
  nombre.textContent = producto.nombre

  // Precio del producto
  const precio = document.createElement('span')
  precio.className = 'producto-card__precio'
  precio.textContent = '$' + Number(producto.precio).toFixed(2)

  // Badge de conteo
  var conteo = VentasModule._conteos[producto.id] || 0
  const badge = document.createElement('span')
  badge.className = 'producto-card__conteo'
  badge.id = 'conteo-' + producto.id
  badge.textContent = conteo > 0 ? conteo : ''
  badge.setAttribute('aria-label', conteo + ' vendidos hoy')
  if (conteo > 0) {
    badge.classList.add('producto-card__conteo--visible')
  }

  card.appendChild(badge)
  card.appendChild(nombre)
  card.appendChild(precio)

  // Manejador de tap
  card.addEventListener('click', function () {
    registrarVenta(producto, diaActivoId, card)
  })

  return card
}

/**
 * Registra una venta en IndexedDB, actualiza el conteo y muestra confirmación.
 */
async function registrarVenta(producto, diaActivoId, cardEl) {
  const venta = {
    productoId:     producto.id,
    productoNombre: producto.nombre,
    precio:         producto.precio,
    timestamp:      Date.now(),
    diaActivoId:    diaActivoId
  }

  var ventaId
  try {
    ventaId = await DB.ventas.agregar(venta)
  } catch (err) {
    console.error('registrarVenta — error al guardar en IndexedDB:', err)
    _mostrarToast('No se pudo registrar la venta. Inténtalo de nuevo.', 'error')
    return
  }

  // Guardar referencia para deshacer
  VentasModule._ultimaVentaId = ventaId
  VentasModule._ultimaVentaProductoId = producto.id

  // Mostrar botón deshacer
  var btnDeshacer = document.getElementById('btn-deshacer-venta')
  if (btnDeshacer) {
    btnDeshacer.style.display = 'inline-flex'
  }

  // Actualizar conteo en memoria y en la tarjeta
  if (!VentasModule._conteos[producto.id]) {
    VentasModule._conteos[producto.id] = 0
  }
  VentasModule._conteos[producto.id]++

  _actualizarConteo(producto.id)
  _actualizarResumen()

  // Confirmación visual en la tarjeta ≥ 300 ms
  if (cardEl) {
    cardEl.disabled = true
    cardEl.classList.add('confirmado')

    await new Promise(function (resolve) {
      setTimeout(resolve, 300)
    })

    cardEl.classList.remove('confirmado')
    cardEl.disabled = false
  }
}

/**
 * Deshace la última venta registrada.
 */
async function _deshacerUltimaVenta() {
  var ventaId = VentasModule._ultimaVentaId
  var productoId = VentasModule._ultimaVentaProductoId

  if (!ventaId) return

  try {
    await DB.ventas.eliminar(ventaId)
  } catch (err) {
    console.error('_deshacerUltimaVenta — error:', err)
    _mostrarToast('No se pudo deshacer la venta.', 'error')
    return
  }

  // Limpiar referencia
  VentasModule._ultimaVentaId = null
  VentasModule._ultimaVentaProductoId = null

  // Ocultar botón deshacer
  var btnDeshacer = document.getElementById('btn-deshacer-venta')
  if (btnDeshacer) {
    btnDeshacer.style.display = 'none'
  }

  // Actualizar conteo
  if (productoId && VentasModule._conteos[productoId]) {
    VentasModule._conteos[productoId]--
    if (VentasModule._conteos[productoId] < 0) {
      VentasModule._conteos[productoId] = 0
    }
    _actualizarConteo(productoId)
  }

  _actualizarResumen()
  _mostrarToast('Venta deshecha ✓', 'exito')
}

/**
 * Actualiza el badge de conteo de un producto en el DOM.
 */
function _actualizarConteo(productoId) {
  var badge = document.getElementById('conteo-' + productoId)
  if (!badge) return

  var conteo = VentasModule._conteos[productoId] || 0
  badge.textContent = conteo > 0 ? conteo : ''
  badge.setAttribute('aria-label', conteo + ' vendidos hoy')

  if (conteo > 0) {
    badge.classList.add('producto-card__conteo--visible')
  } else {
    badge.classList.remove('producto-card__conteo--visible')
  }
}

/**
 * Actualiza el texto del resumen total.
 */
function _actualizarResumen() {
  var resumenTexto = document.querySelector('.ventas-resumen__texto')
  if (!resumenTexto) return

  var total = 0
  for (var key in VentasModule._conteos) {
    total += VentasModule._conteos[key]
  }
  resumenTexto.textContent = 'Ventas hoy: ' + total
}

/**
 * Muestra un toast de confirmación o error.
 */
function _mostrarToast(mensaje, tipo) {
  let toast = document.getElementById('ventas-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'ventas-toast'
    toast.className = 'toast'
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')
    document.body.appendChild(toast)
  }

  toast.className = 'toast toast--' + (tipo === 'error' ? 'error' : 'exito')
  toast.textContent = mensaje

  // eslint-disable-next-line no-unused-expressions
  toast.offsetWidth

  toast.classList.add('visible')

  setTimeout(function () {
    toast.classList.remove('visible')
  }, 2000)
}
