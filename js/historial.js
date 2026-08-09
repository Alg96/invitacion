// historial.js — Módulo de Historial
// Requisitos: 8.1, 8.2, 8.9

/**
 * HistorialModule — gestiona la pantalla de historial de ventas y gastos.
 *
 * render(filtro)       — muestra filtros y lista de registros ordenados (Tarea 12.1)
 * editarRegistro       — stub para edición (se implementa en Tarea 12.2)
 * eliminarRegistro     — stub para eliminación (se implementa en Tarea 12.3)
 */
const HistorialModule = {
  /** Filtro activo actual */
  _filtroActivo: 'todos',

  /**
   * Renderiza el módulo de Historial en #app-content.
   *
   * Flujo:
   *   1. Carga ventas y/o gastos según el filtro activo (Req. 8.1).
   *   2. Combina registros añadiendo campo `type` y ordena por timestamp DESC (Req. 8.9).
   *   3. Renderiza botones de filtro (Todos / Ventas / Gastos) (Req. 8.2).
   *   4. Renderiza lista de registros con tipo, monto/precio, nombre, descripción,
   *      fecha/hora y botones Editar / Eliminar (Req. 8.2).
   *
   * @param {string} [filtro='todos'] — 'todos' | 'ventas' | 'gastos'
   */
  async render(filtro) {
    if (!filtro) filtro = 'todos'
    HistorialModule._filtroActivo = filtro

    const contenedor = document.getElementById('app-content')
    if (!contenedor) return

    contenedor.innerHTML = '<p class="cargando">Cargando historial…</p>'

    try {
      // ── 1. Cargar registros según filtro (Req. 8.1) ─────────────────────
      let ventas = []
      let gastos = []

      if (filtro === 'ventas' || filtro === 'todos') {
        ventas = await DB.ventas.obtenerTodas()
      }
      if (filtro === 'gastos' || filtro === 'todos') {
        gastos = await DB.gastos.obtenerTodas()
      }

      // ── 2. Combinar y ordenar por timestamp DESC (Req. 8.9) ─────────────
      const registros = []

      ventas.forEach(function (v) {
        registros.push({
          id: v.id,
          type: 'venta',
          nombre: v.productoNombre,
          monto: v.precio,
          descripcion: '',
          timestamp: v.timestamp,
          // Guardar referencia completa para editar/eliminar
          _original: v
        })
      })

      gastos.forEach(function (g) {
        registros.push({
          id: g.id,
          type: 'gasto',
          nombre: g.categoriaNombre,
          monto: g.monto,
          descripcion: g.descripcion || '',
          timestamp: g.timestamp,
          _original: g
        })
      })

      registros.sort(function (a, b) {
        return b.timestamp - a.timestamp
      })

      // ── 3. Renderizar UI ────────────────────────────────────────────────
      contenedor.innerHTML = ''

      // Botones de filtro
      contenedor.appendChild(_crearFiltros(filtro))

      // Lista de registros
      if (registros.length === 0) {
        contenedor.appendChild(_crearEstadoVacio())
      } else {
        contenedor.appendChild(_crearListaRegistros(registros))
      }

    } catch (error) {
      contenedor.innerHTML = ''
      const aviso = document.createElement('div')
      aviso.className = 'aviso aviso--error'
      aviso.setAttribute('role', 'alert')
      aviso.innerHTML = '<span aria-hidden="true">⚠️</span><span>No se pudo cargar el historial. Intenta de nuevo.</span>'
      contenedor.appendChild(aviso)
      console.error('HistorialModule.render():', error)
    }
  }
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Crea los botones de filtro (Todos / Ventas / Gastos).
 *
 * @param {string} filtroActivo — filtro seleccionado actualmente
 * @returns {HTMLElement}
 */
function _crearFiltros(filtroActivo) {
  const filtros = [
    { id: 'todos', label: 'Todos' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'gastos', label: 'Gastos' }
  ]

  const contenedor = document.createElement('div')
  contenedor.className = 'historial-filtros'
  contenedor.setAttribute('role', 'group')
  contenedor.setAttribute('aria-label', 'Filtros de historial')

  filtros.forEach(function (f) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'historial-filtros__btn' + (f.id === filtroActivo ? ' activo' : '')
    btn.textContent = f.label
    btn.setAttribute('aria-pressed', f.id === filtroActivo ? 'true' : 'false')

    btn.addEventListener('click', function () {
      HistorialModule.render(f.id)
    })

    contenedor.appendChild(btn)
  })

  return contenedor
}

/**
 * Crea el estado vacío cuando no hay registros.
 *
 * @returns {HTMLElement}
 */
function _crearEstadoVacio() {
  const div = document.createElement('div')
  div.className = 'empty-state'

  const icono = document.createElement('span')
  icono.className = 'empty-state__icono'
  icono.setAttribute('aria-hidden', 'true')
  icono.textContent = '📋'

  const desc = document.createElement('p')
  desc.className = 'empty-state__descripcion'
  desc.textContent = 'No hay registros en el historial.'

  div.appendChild(icono)
  div.appendChild(desc)
  return div
}

/**
 * Crea la lista de registros del historial.
 *
 * @param {Array} registros — registros combinados y ordenados
 * @returns {HTMLElement}
 */
function _crearListaRegistros(registros) {
  const lista = document.createElement('div')
  lista.className = 'historial-lista'
  lista.setAttribute('role', 'list')
  lista.setAttribute('aria-label', 'Registros del historial')

  registros.forEach(function (reg) {
    lista.appendChild(_crearItemRegistro(reg))
  })

  return lista
}

/**
 * Crea un elemento individual del historial.
 *
 * Muestra: tipo (venta/gasto), monto o precio, nombre de producto o categoría,
 * descripción (si aplica) y fecha/hora. Incluye botones Editar y Eliminar.
 *
 * @param {Object} reg — registro normalizado
 * @returns {HTMLElement}
 */
function _crearItemRegistro(reg) {
  const item = document.createElement('article')
  item.className = 'historial-item'
  item.setAttribute('role', 'listitem')

  // ── Columna de información ──────────────────────────────────────────────
  const info = document.createElement('div')
  info.className = 'historial-item__info'

  // Nombre (producto o categoría)
  const nombre = document.createElement('span')
  nombre.className = 'historial-item__nombre'
  nombre.textContent = reg.nombre

  // Meta: tipo + descripción (si aplica) + fecha/hora
  const meta = document.createElement('span')
  meta.className = 'historial-item__meta'

  const tipoLabel = reg.type === 'venta' ? 'Venta' : 'Gasto'
  const fecha = _formatearFecha(reg.timestamp)
  let metaTexto = tipoLabel

  if (reg.descripcion) {
    metaTexto += ' · ' + reg.descripcion
  }
  metaTexto += ' · ' + fecha

  meta.textContent = metaTexto

  info.appendChild(nombre)
  info.appendChild(meta)

  // ── Monto ───────────────────────────────────────────────────────────────
  const monto = document.createElement('span')
  monto.className = 'historial-item__monto'

  if (reg.type === 'venta') {
    monto.classList.add('historial-item__monto--venta')
    monto.textContent = '+$' + Number(reg.monto).toFixed(2)
  } else {
    monto.classList.add('historial-item__monto--gasto')
    monto.textContent = '-$' + Number(reg.monto).toFixed(2)
  }

  // ── Botones de acción ───────────────────────────────────────────────────
  const acciones = document.createElement('div')
  acciones.className = 'historial-item__acciones'

  const btnEditar = document.createElement('button')
  btnEditar.type = 'button'
  btnEditar.className = 'btn-secundario'
  btnEditar.textContent = 'Editar'
  btnEditar.setAttribute('aria-label', 'Editar ' + reg.nombre)
  btnEditar.addEventListener('click', function () {
    editarRegistro(reg)
  })

  const btnEliminar = document.createElement('button')
  btnEliminar.type = 'button'
  btnEliminar.className = 'btn-peligro'
  btnEliminar.textContent = 'Eliminar'
  btnEliminar.setAttribute('aria-label', 'Eliminar ' + reg.nombre)
  btnEliminar.addEventListener('click', function () {
    eliminarRegistro(reg)
  })

  acciones.appendChild(btnEditar)
  acciones.appendChild(btnEliminar)

  // ── Ensamblar item ──────────────────────────────────────────────────────
  item.appendChild(info)
  item.appendChild(monto)
  item.appendChild(acciones)

  return item
}

/**
 * Formatea un timestamp a una cadena legible en español (México).
 *
 * @param {number} timestamp — milisegundos desde epoch
 * @returns {string}
 */
function _formatearFecha(timestamp) {
  return new Date(timestamp).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ── Funciones de acción ───────────────────────────────────────────────────────

/**
 * Muestra un toast de confirmación o error encima de la Tab Bar.
 * El toast desaparece tras 2500 ms.
 *
 * @param {string} mensaje — texto a mostrar
 * @param {'exito'|'error'} tipo — variante visual
 */
function _mostrarToastHistorial(mensaje, tipo) {
  var previo = document.getElementById('historial-toast')
  if (previo) previo.remove()

  var toast = document.createElement('div')
  toast.id = 'historial-toast'
  toast.className = 'toast toast--' + tipo
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  toast.textContent = mensaje
  document.body.appendChild(toast)

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('visible')
    })
  })

  setTimeout(function () {
    toast.classList.remove('visible')
    setTimeout(function () { toast.remove() }, 250)
  }, 2500)
}

/**
 * Edita un registro del historial.
 * Muestra un formulario inline precargado con los datos actuales del registro.
 *
 * - Para ventas: permite editar productoNombre y precio.
 * - Para gastos: permite editar categoriaNombre, monto y descripcion.
 *
 * Al confirmar, actualiza IndexedDB y re-renderiza la lista.
 * Si falla, muestra un toast de error y conserva el registro sin cambios.
 *
 * Requisitos: 8.3, 8.4, 8.5, 8.8
 *
 * @param {Object} registro — registro normalizado con _original
 */
function editarRegistro(registro) {
  // Buscar el item en la lista para reemplazarlo con el formulario inline
  var lista = document.querySelector('.historial-lista')
  if (!lista) return

  // Encontrar el artículo correspondiente por su posición (buscamos por contenido)
  var items = lista.querySelectorAll('.historial-item')
  var itemTarget = null

  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    var nombreEl = item.querySelector('.historial-item__nombre')
    var metaEl = item.querySelector('.historial-item__meta')
    if (nombreEl && nombreEl.textContent === registro.nombre) {
      // Verificar además que la fecha coincida
      var fechaFormateada = _formatearFecha(registro.timestamp)
      if (metaEl && metaEl.textContent.indexOf(fechaFormateada) !== -1) {
        itemTarget = item
        break
      }
    }
  }

  // Fallback: si no se encontró por contenido, usar el primer item que coincida por nombre
  if (!itemTarget) {
    for (var j = 0; j < items.length; j++) {
      var nombreEl2 = items[j].querySelector('.historial-item__nombre')
      if (nombreEl2 && nombreEl2.textContent === registro.nombre) {
        itemTarget = items[j]
        break
      }
    }
  }

  if (!itemTarget) return

  // Crear formulario inline
  var formContainer = document.createElement('div')
  formContainer.className = 'historial-item'
  formContainer.style.flexDirection = 'column'
  formContainer.style.alignItems = 'stretch'

  var form = document.createElement('form')
  form.className = 'historial-editar-form'
  form.setAttribute('aria-label', 'Editar registro')

  if (registro.type === 'venta') {
    // ── Campos para Venta: productoNombre y precio ──────────────────────
    var grupoNombre = document.createElement('div')
    grupoNombre.className = 'form-group'

    var labelNombre = document.createElement('label')
    labelNombre.className = 'form-label'
    labelNombre.textContent = 'Producto'
    labelNombre.setAttribute('for', 'editar-nombre-' + registro.id)

    var inputNombre = document.createElement('input')
    inputNombre.type = 'text'
    inputNombre.id = 'editar-nombre-' + registro.id
    inputNombre.className = 'form-campo'
    inputNombre.value = registro._original.productoNombre || ''
    inputNombre.required = true

    grupoNombre.appendChild(labelNombre)
    grupoNombre.appendChild(inputNombre)
    form.appendChild(grupoNombre)

    var grupoPrecio = document.createElement('div')
    grupoPrecio.className = 'form-group'

    var labelPrecio = document.createElement('label')
    labelPrecio.className = 'form-label'
    labelPrecio.textContent = 'Precio'
    labelPrecio.setAttribute('for', 'editar-precio-' + registro.id)

    var inputPrecio = document.createElement('input')
    inputPrecio.type = 'number'
    inputPrecio.id = 'editar-precio-' + registro.id
    inputPrecio.className = 'form-campo'
    inputPrecio.value = registro._original.precio
    inputPrecio.min = '0.01'
    inputPrecio.step = '0.01'
    inputPrecio.required = true

    grupoPrecio.appendChild(labelPrecio)
    grupoPrecio.appendChild(inputPrecio)
    form.appendChild(grupoPrecio)

  } else {
    // ── Campos para Gasto: categoriaNombre, monto y descripcion ─────────
    var grupoCategoria = document.createElement('div')
    grupoCategoria.className = 'form-group'

    var labelCategoria = document.createElement('label')
    labelCategoria.className = 'form-label'
    labelCategoria.textContent = 'Categoría'
    labelCategoria.setAttribute('for', 'editar-categoria-' + registro.id)

    var inputCategoria = document.createElement('input')
    inputCategoria.type = 'text'
    inputCategoria.id = 'editar-categoria-' + registro.id
    inputCategoria.className = 'form-campo'
    inputCategoria.value = registro._original.categoriaNombre || ''
    inputCategoria.required = true

    grupoCategoria.appendChild(labelCategoria)
    grupoCategoria.appendChild(inputCategoria)
    form.appendChild(grupoCategoria)

    var grupoMonto = document.createElement('div')
    grupoMonto.className = 'form-group'

    var labelMonto = document.createElement('label')
    labelMonto.className = 'form-label'
    labelMonto.textContent = 'Monto'
    labelMonto.setAttribute('for', 'editar-monto-' + registro.id)

    var inputMonto = document.createElement('input')
    inputMonto.type = 'number'
    inputMonto.id = 'editar-monto-' + registro.id
    inputMonto.className = 'form-campo'
    inputMonto.value = registro._original.monto
    inputMonto.min = '0.01'
    inputMonto.step = '0.01'
    inputMonto.required = true

    grupoMonto.appendChild(labelMonto)
    grupoMonto.appendChild(inputMonto)
    form.appendChild(grupoMonto)

    var grupoDesc = document.createElement('div')
    grupoDesc.className = 'form-group'

    var labelDesc = document.createElement('label')
    labelDesc.className = 'form-label'
    labelDesc.textContent = 'Descripción'
    labelDesc.setAttribute('for', 'editar-desc-' + registro.id)

    var inputDesc = document.createElement('input')
    inputDesc.type = 'text'
    inputDesc.id = 'editar-desc-' + registro.id
    inputDesc.className = 'form-campo'
    inputDesc.value = registro._original.descripcion || ''

    grupoDesc.appendChild(labelDesc)
    grupoDesc.appendChild(inputDesc)
    form.appendChild(grupoDesc)
  }

  // ── Error container ─────────────────────────────────────────────────────
  var errorContainer = document.createElement('p')
  errorContainer.className = 'form-error'
  errorContainer.setAttribute('role', 'alert')
  errorContainer.setAttribute('aria-live', 'assertive')
  errorContainer.textContent = ''
  form.appendChild(errorContainer)

  // ── Botones de acción ───────────────────────────────────────────────────
  var botonesContainer = document.createElement('div')
  botonesContainer.style.display = 'flex'
  botonesContainer.style.gap = '8px'
  botonesContainer.style.marginTop = '8px'

  var btnGuardar = document.createElement('button')
  btnGuardar.type = 'submit'
  btnGuardar.className = 'form-submit'
  btnGuardar.textContent = 'Guardar'
  btnGuardar.style.flex = '1'

  var btnCancelar = document.createElement('button')
  btnCancelar.type = 'button'
  btnCancelar.className = 'btn-peligro'
  btnCancelar.textContent = 'Cancelar'
  btnCancelar.style.flex = '1'

  botonesContainer.appendChild(btnGuardar)
  botonesContainer.appendChild(btnCancelar)
  form.appendChild(botonesContainer)

  formContainer.appendChild(form)

  // ── Reemplazar el item con el formulario ────────────────────────────────
  itemTarget.replaceWith(formContainer)

  // ── Evento Cancelar — restaurar la lista ────────────────────────────────
  btnCancelar.addEventListener('click', function () {
    HistorialModule.render(HistorialModule._filtroActivo)
  })

  // ── Evento Submit — validar, actualizar DB, re-render ───────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault()
    errorContainer.textContent = ''

    var registroActualizado = Object.assign({}, registro._original)

    if (registro.type === 'venta') {
      var nuevoNombre = inputNombre.value.trim()
      var nuevoPrecio = parseFloat(inputPrecio.value)

      if (!nuevoNombre) {
        errorContainer.textContent = 'El nombre del producto no puede estar vacío.'
        inputNombre.classList.add('error')
        return
      }
      if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
        errorContainer.textContent = 'Ingresa un precio válido mayor a cero.'
        inputPrecio.classList.add('error')
        return
      }

      registroActualizado.productoNombre = nuevoNombre
      registroActualizado.precio = nuevoPrecio

    } else {
      var nuevaCategoria = inputCategoria.value.trim()
      var nuevoMonto = parseFloat(inputMonto.value)
      var nuevaDesc = inputDesc.value.trim()

      if (!nuevaCategoria) {
        errorContainer.textContent = 'La categoría no puede estar vacía.'
        inputCategoria.classList.add('error')
        return
      }
      if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
        errorContainer.textContent = 'Ingresa un monto válido mayor a cero.'
        inputMonto.classList.add('error')
        return
      }

      registroActualizado.categoriaNombre = nuevaCategoria
      registroActualizado.monto = nuevoMonto
      registroActualizado.descripcion = nuevaDesc
    }

    // ── Guardar en IndexedDB ──────────────────────────────────────────────
    try {
      if (registro.type === 'venta') {
        await DB.ventas.actualizar(registroActualizado)
      } else {
        await DB.gastos.actualizar(registroActualizado)
      }

      // Re-renderizar la lista completa
      HistorialModule.render(HistorialModule._filtroActivo)
      _mostrarToastHistorial('Registro actualizado ✓', 'exito')

    } catch (err) {
      console.error('editarRegistro — error al actualizar:', err)
      errorContainer.textContent = 'No se pudo actualizar el registro.'
      _mostrarToastHistorial('No se pudo actualizar el registro', 'error')
    }
  })
}

/**
 * Elimina un registro del historial.
 * Muestra un diálogo de confirmación antes de eliminar permanentemente.
 *
 * @param {Object} registro — registro normalizado con _original
 */
async function eliminarRegistro(registro) {
  var tipoLabel = registro.type === 'venta' ? 'venta' : 'gasto'
  var confirmado = window.confirm(
    '¿Eliminar esta ' + tipoLabel + '?\n\n' +
    registro.nombre + ' — $' + Number(registro.monto).toFixed(2) + '\n\n' +
    'Esta acción no se puede deshacer.'
  )

  if (!confirmado) return

  try {
    if (registro.type === 'venta') {
      await DB.ventas.eliminar(registro.id)
    } else {
      await DB.gastos.eliminar(registro.id)
    }

    _mostrarToastHistorial('Registro eliminado ✓', 'exito')
    HistorialModule.render(HistorialModule._filtroActivo)

  } catch (err) {
    console.error('eliminarRegistro — error:', err)
    _mostrarToastHistorial('No se pudo eliminar el registro.', 'error')
  }
}
