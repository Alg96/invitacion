// gastos.js — Módulo de Gastos
// Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8

/**
 * Módulo de Gastos.
 *
 * Estado interno:
 *   _diaActivo — guarda el DiaActivo vigente una vez cargado en render()
 *                para que guardarGasto() pueda acceder a él sin una segunda
 *                consulta a IndexedDB.
 */
var GastosModule = (function () {

  /** @type {Object|null} DiaActivo vigente cargado por render(). */
  var _diaActivo = null

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers de UI
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Devuelve el contenedor principal del módulo (#app-content).
   * @returns {HTMLElement|null}
   */
  function _contenedor() {
    return document.getElementById('app-content')
  }

  /**
   * Renderiza un estado vacío / aviso en el contenedor principal.
   * @param {string} icono   — emoji representativo
   * @param {string} titulo  — texto principal del aviso
   * @param {string} detalle — texto secundario opcional
   */
  function _renderAviso(icono, titulo, detalle) {
    var contenedor = _contenedor()
    if (!contenedor) return

    contenedor.innerHTML =
      '<div class="empty-state" role="status" aria-live="polite">' +
        '<div class="empty-state__icono" aria-hidden="true">' + icono + '</div>' +
        '<p class="empty-state__titulo">' + titulo + '</p>' +
        (detalle
          ? '<p class="empty-state__descripcion">' + detalle + '</p>'
          : '') +
      '</div>'
  }

  /**
   * Muestra un toast de confirmación o error encima de la Tab Bar.
   * El toast desaparece tras 2 500 ms.
   * @param {string}  mensaje
   * @param {'exito'|'error'} tipo
   */
  function _mostrarToast(mensaje, tipo) {
    // Eliminar cualquier toast previo
    var previo = document.getElementById('gastos-toast')
    if (previo) previo.remove()

    var toast = document.createElement('div')
    toast.id = 'gastos-toast'
    toast.className = 'toast toast--' + tipo
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')
    toast.textContent = mensaje
    document.body.appendChild(toast)

    // Trigger de animación en el siguiente frame
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
   * Muestra u oculta el mensaje de error de un campo del formulario.
   * @param {HTMLElement} campo   — input o select afectado
   * @param {HTMLElement} errorEl — elemento <p class="form-error">
   * @param {string|null} mensaje — null para limpiar el error
   */
  function _setError(campo, errorEl, mensaje) {
    if (mensaje) {
      campo.classList.add('error')
      errorEl.textContent = mensaje
      errorEl.hidden = false
    } else {
      campo.classList.remove('error')
      errorEl.textContent = ''
      errorEl.hidden = true
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Función pública: render()
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Renderiza la interfaz del Módulo de Gastos dentro de #app-content.
   *
   * Flujo:
   *   1. Verifica día activo vigente — muestra aviso si no existe (Requisito 5.6).
   *   2. Carga categorías activas — muestra aviso si no hay ninguna (Requisito 5.7).
   *   3. Renderiza el formulario de registro de gasto:
   *      - input[type=number, min=0.01] para monto        (Requisitos 5.1, 5.8)
   *      - select con categorías activas                  (Requisito 5.2)
   *      - input[type=text] para descripción (opcional)   (Requisito 5.1)
   *      - button "Guardar"                               (Requisito 5.1)
   *
   * @returns {Promise<void>}
   */
  async function render() {
    var contenedor = _contenedor()
    if (!contenedor) return

    // ── 1. Verificar día activo ──────────────────────────────────────────────
    var diaActivo
    try {
      diaActivo = await DB.dias.obtenerVigente()
    } catch (err) {
      console.error('GastosModule.render — error al obtener día activo:', err)
      _renderAviso('⚠️', 'Error al cargar datos', 'Intenta recargar la aplicación.')
      return
    }

    if (diaActivo === null || diaActivo === undefined) {
      // Requisito 5.6
      _renderAviso(
        '⚙️',
        'Día no iniciado',
        'Inicia el día desde Configuración para registrar gastos.'
      )
      return
    }

    // Guardar referencia para que guardarGasto() la use sin nueva consulta
    _diaActivo = diaActivo

    // ── 2. Cargar categorías activas ─────────────────────────────────────────
    var categorias
    try {
      categorias = await DB.categorias.obtenerActivas()
    } catch (err) {
      console.error('GastosModule.render — error al obtener categorías:', err)
      _renderAviso('⚠️', 'Error al cargar datos', 'Intenta recargar la aplicación.')
      return
    }

    if (!categorias || categorias.length === 0) {
      // Requisito 5.7
      _renderAviso(
        '🏷️',
        'Sin categorías',
        'Agrega categorías en Configuración para registrar gastos.'
      )
      return
    }

    // ── 3. Renderizar formulario ─────────────────────────────────────────────
    // Construir opciones del select
    var opcionesHtml = '<option value="">Selecciona una categoría</option>'
    for (var i = 0; i < categorias.length; i++) {
      var cat = categorias[i]
      opcionesHtml +=
        '<option value="' + cat.id + '" data-nombre="' + _escapar(cat.nombre) + '">' +
          _escapar(cat.nombre) +
        '</option>'
    }

    contenedor.innerHTML =
      '<div class="gastos-modulo">' +
        '<header class="gastos-header" style="padding:16px 16px 0;">' +
          '<h1 style="font-size:1.25rem;font-weight:700;">Registrar Gasto</h1>' +
        '</header>' +

        '<form id="form-gasto" novalidate style="padding:16px;" aria-label="Formulario de gasto">' +

          '<!-- Monto -->' +
          '<div class="form-group">' +
            '<label class="form-label" for="gasto-monto">Monto ($) <span aria-hidden="true">*</span></label>' +
            '<input' +
              ' id="gasto-monto"' +
              ' name="monto"' +
              ' class="form-campo"' +
              ' type="number"' +
              ' inputmode="decimal"' +
              ' min="0.01"' +
              ' step="0.01"' +
              ' placeholder="0.00"' +
              ' autocomplete="off"' +
              ' aria-required="true"' +
              ' aria-describedby="gasto-monto-error"' +
            '>' +
            '<p id="gasto-monto-error" class="form-error" role="alert" hidden></p>' +
          '</div>' +

          '<!-- Categoría -->' +
          '<div class="form-group">' +
            '<label class="form-label" for="gasto-categoria">Categoría <span aria-hidden="true">*</span></label>' +
            '<select' +
              ' id="gasto-categoria"' +
              ' name="categoriaId"' +
              ' class="form-campo"' +
              ' aria-required="true"' +
              ' aria-describedby="gasto-categoria-error"' +
            '>' +
              opcionesHtml +
            '</select>' +
            '<p id="gasto-categoria-error" class="form-error" role="alert" hidden></p>' +
          '</div>' +

          '<!-- Descripción (opcional) -->' +
          '<div class="form-group">' +
            '<label class="form-label" for="gasto-descripcion">Descripción <span style="font-weight:400;color:#757575;">(opcional)</span></label>' +
            '<input' +
              ' id="gasto-descripcion"' +
              ' name="descripcion"' +
              ' class="form-campo"' +
              ' type="text"' +
              ' placeholder="Ej. Compra de ingredientes"' +
              ' autocomplete="off"' +
              ' aria-describedby="gasto-descripcion-hint"' +
            '>' +
            '<p id="gasto-descripcion-hint" class="form-error" style="color:#757575;" hidden></p>' +
          '</div>' +

          '<!-- Botón Guardar -->' +
          '<button id="btn-guardar-gasto" type="submit" class="form-submit">' +
            'Guardar' +
          '</button>' +

        '</form>' +
      '</div>'

    // ── 4. Adjuntar manejador de submit ──────────────────────────────────────
    var form = document.getElementById('form-gasto')
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault()
        _onSubmit(categorias)
      })
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Manejador interno de submit
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Recopila los datos del formulario y llama a guardarGasto().
   * @param {Array} categorias — lista de categorías activas cargadas en render()
   */
  function _onSubmit(categorias) {
    var montoInput       = document.getElementById('gasto-monto')
    var categoriaSelect  = document.getElementById('gasto-categoria')
    var descripcionInput = document.getElementById('gasto-descripcion')

    var montoError    = document.getElementById('gasto-monto-error')
    var categoriaError = document.getElementById('gasto-categoria-error')

    if (!montoInput || !categoriaSelect || !descripcionInput) return

    // Obtener el nombre de la categoría seleccionada desde el option
    var selectedOption = categoriaSelect.options[categoriaSelect.selectedIndex]
    var categoriaNombre = selectedOption ? (selectedOption.getAttribute('data-nombre') || selectedOption.textContent.trim()) : ''

    var formData = {
      monto:           montoInput.value,
      categoriaId:     categoriaSelect.value,
      categoriaNombre: categoriaNombre,
      descripcion:     descripcionInput.value.trim()
    }

    guardarGasto(formData, _diaActivo ? _diaActivo.id : null)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Función pública: guardarGasto()
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Valida y persiste un gasto en IndexedDB.
   *
   * Validaciones:
   *   - monto no vacío y número positivo > 0  (Requisitos 5.5, 5.8)
   *   - categoriaId no vacío                  (implícito en Requisito 5.2)
   *
   * Si todo es válido:
   *   - Crea el objeto Gasto con todos los campos requeridos
   *   - Llama DB.gastos.agregar()
   *   - Limpia el formulario
   *   - Muestra toast de éxito
   *
   * Si alguna validación falla:
   *   - Muestra mensaje de error junto al campo correspondiente
   *   - No persiste nada en IndexedDB
   *
   * @param {Object} formData
   * @param {string|number|null} diaActivoId
   * @returns {Promise<void>}
   */
  async function guardarGasto(formData, diaActivoId) {
    var montoInput      = document.getElementById('gasto-monto')
    var categoriaSelect = document.getElementById('gasto-categoria')
    var montoError      = document.getElementById('gasto-monto-error')
    var categoriaError  = document.getElementById('gasto-categoria-error')

    var valido = true

    // ── Validar monto ────────────────────────────────────────────────────────
    var montoStr = (formData.monto !== undefined && formData.monto !== null)
      ? String(formData.monto).trim()
      : ''
    var monto = parseFloat(montoStr)

    if (montoStr === '' || isNaN(monto) || monto <= 0) {
      if (montoInput && montoError) {
        _setError(montoInput, montoError, 'Ingresa un monto válido mayor a cero.')
      }
      valido = false
    } else {
      if (montoInput && montoError) {
        _setError(montoInput, montoError, null)
      }
    }

    // ── Validar categoría ────────────────────────────────────────────────────
    if (!formData.categoriaId || String(formData.categoriaId).trim() === '') {
      if (categoriaSelect && categoriaError) {
        _setError(categoriaSelect, categoriaError, 'Selecciona una categoría.')
      }
      valido = false
    } else {
      if (categoriaSelect && categoriaError) {
        _setError(categoriaSelect, categoriaError, null)
      }
    }

    if (!valido) return

    // ── Construir y persistir el gasto ───────────────────────────────────────
    var gasto = {
      monto:           monto,
      categoriaId:     Number(formData.categoriaId),
      categoriaNombre: formData.categoriaNombre || '',
      descripcion:     formData.descripcion || '',
      timestamp:       Date.now(),
      diaActivoId:     diaActivoId
    }

    try {
      await DB.gastos.agregar(gasto)
    } catch (err) {
      console.error('GastosModule.guardarGasto — error al guardar:', err)
      _mostrarToast('No se pudo guardar el gasto. Intenta de nuevo.', 'error')
      return
    }

    // ── Limpiar formulario ───────────────────────────────────────────────────
    var montoInputEl      = document.getElementById('gasto-monto')
    var categoriaSelectEl = document.getElementById('gasto-categoria')
    var descripcionInputEl = document.getElementById('gasto-descripcion')

    if (montoInputEl)      montoInputEl.value = ''
    if (categoriaSelectEl) categoriaSelectEl.selectedIndex = 0
    if (descripcionInputEl) descripcionInputEl.value = ''

    // ── Confirmación visual ──────────────────────────────────────────────────
    _mostrarToast('Gasto guardado correctamente ✓', 'exito')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Utilidades
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Escapa caracteres especiales HTML para evitar XSS al inyectar texto
   * de usuario en innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function _escapar(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // API pública
  // ────────────────────────────────────────────────────────────────────────────

  return {
    render:       render,
    guardarGasto: guardarGasto
  }

})()
