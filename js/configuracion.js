// configuracion.js — Módulo de Configuración
// Requisitos: 9.1-9.7, 10.1-10.6, 11.1-11.7

/**
 * Módulo de Configuración.
 *
 * Contiene tres secciones:
 *   - Productos (CRUD con borrado lógico)
 *   - Categorías de Gasto (CRUD con borrado lógico)
 *   - Reinicio de Día (iniciar / cerrar día activo)
 */
var ConfiguracionModule = (function () {

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
   * Escapa caracteres especiales HTML para evitar XSS.
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

  /**
   * Muestra un toast de confirmación o error.
   * @param {string} mensaje
   * @param {'exito'|'error'} tipo
   */
  function _mostrarToast(mensaje, tipo) {
    var previo = document.getElementById('config-toast')
    if (previo) previo.remove()

    var toast = document.createElement('div')
    toast.id = 'config-toast'
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

  // ────────────────────────────────────────────────────────────────────────────
  // Función pública: render()
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Renderiza la interfaz completa del Módulo de Configuración.
   * Incluye las tres secciones: Productos, Categorías de Gasto, Reinicio de Día.
   * @returns {Promise<void>}
   */
  async function render() {
    var contenedor = _contenedor()
    if (!contenedor) return

    contenedor.innerHTML =
      '<div class="configuracion-modulo" style="padding-bottom:16px;">' +
        '<header style="padding:16px 16px 0;">' +
          '<h1 style="font-size:1.25rem;font-weight:700;">Configuración</h1>' +
        '</header>' +
        '<div id="config-productos"></div>' +
        '<div id="config-categorias"></div>' +
        '<div id="config-reinicio"></div>' +
      '</div>'

    // Renderizar cada sección
    await renderProductos()
    await renderCategorias()
    await renderReinicioDia()
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sección: Productos (Requisitos 9.1–9.7)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Renderiza la sección de gestión de productos.
   * Lista todos los productos (activos e inactivos) con nombre, precio y estado.
   * Incluye botones para agregar, editar y eliminar (borrado lógico).
   * @returns {Promise<void>}
   */
  async function renderProductos() {
    var seccion = document.getElementById('config-productos')
    if (!seccion) return

    var productos
    try {
      productos = await DB.productos.obtenerTodos()
    } catch (err) {
      console.error('ConfiguracionModule.renderProductos — error:', err)
      seccion.innerHTML =
        '<div class="config-seccion">' +
          '<h2 class="config-seccion__titulo">Productos</h2>' +
          '<p style="color:#C62828;font-size:0.9rem;">Error al cargar productos.</p>' +
        '</div>'
      return
    }

    // Construir lista de productos
    var listaHtml = ''
    if (productos && productos.length > 0) {
      listaHtml = '<ul class="config-lista" role="list">'
      for (var i = 0; i < productos.length; i++) {
        var p = productos[i]
        var badgeClass = p.activo ? 'config-item__badge--activo' : 'config-item__badge--inactivo'
        var badgeText = p.activo ? 'Activo' : 'Inactivo'

        listaHtml +=
          '<li class="config-item" data-id="' + p.id + '">' +
            '<div class="config-item__datos">' +
              '<span class="config-item__nombre">' + _escapar(p.nombre) + '</span>' +
              '<span class="config-item__detalle">$' + Number(p.precio).toFixed(2) + '</span>' +
            '</div>' +
            '<span class="config-item__badge ' + badgeClass + '">' + badgeText + '</span>' +
            '<div class="config-item__acciones">' +
              '<button class="btn-primario btn-editar-prod" data-id="' + p.id + '" aria-label="Editar ' + _escapar(p.nombre) + '">Editar</button>' +
              (p.activo
                ? '<button class="btn-peligro btn-eliminar-prod" data-id="' + p.id + '" aria-label="Eliminar ' + _escapar(p.nombre) + '">Eliminar</button>'
                : '') +
            '</div>' +
          '</li>'
      }
      listaHtml += '</ul>'
    } else {
      listaHtml = '<p style="color:#757575;font-size:0.9rem;margin-bottom:12px;">No hay productos registrados.</p>'
    }

    seccion.innerHTML =
      '<div class="config-seccion">' +
        '<h2 class="config-seccion__titulo">Productos</h2>' +
        listaHtml +
        '<div id="config-prod-form-container"></div>' +
        '<button class="btn-primario" id="btn-agregar-prod" style="width:100%;">Agregar producto</button>' +
      '</div>'

    // ── Event listeners ──────────────────────────────────────────────────────

    // Botón "Agregar producto"
    var btnAgregar = document.getElementById('btn-agregar-prod')
    if (btnAgregar) {
      btnAgregar.addEventListener('click', function () {
        _mostrarFormularioProducto(null)
      })
    }

    // Botones "Editar"
    var btnsEditar = seccion.querySelectorAll('.btn-editar-prod')
    for (var j = 0; j < btnsEditar.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-id'))
          var producto = null
          for (var k = 0; k < productos.length; k++) {
            if (productos[k].id === id) {
              producto = productos[k]
              break
            }
          }
          if (producto) {
            _mostrarFormularioProducto(producto)
          }
        })
      })(btnsEditar[j])
    }

    // Botones "Eliminar" (borrado lógico)
    var btnsEliminar = seccion.querySelectorAll('.btn-eliminar-prod')
    for (var m = 0; m < btnsEliminar.length; m++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-id'))
          _eliminarProducto(id, productos)
        })
      })(btnsEliminar[m])
    }
  }

  /**
   * Muestra el formulario inline para agregar o editar un producto.
   * @param {Object|null} producto — null para agregar, objeto para editar
   */
  function _mostrarFormularioProducto(producto) {
    var container = document.getElementById('config-prod-form-container')
    if (!container) return

    var nombreValue = producto ? _escapar(producto.nombre) : ''
    var precioValue = producto ? producto.precio : ''
    var tituloForm = producto ? 'Editar producto' : 'Nuevo producto'
    var btnTexto = producto ? 'Actualizar' : 'Guardar'

    container.innerHTML =
      '<form id="form-producto" novalidate style="margin-bottom:12px;" aria-label="' + tituloForm + '">' +
        '<div class="form-group">' +
          '<label class="form-label" for="prod-nombre">Nombre <span aria-hidden="true">*</span></label>' +
          '<input' +
            ' id="prod-nombre"' +
            ' name="nombre"' +
            ' class="form-campo"' +
            ' type="text"' +
            ' placeholder="Ej. Elote con mayonesa"' +
            ' value="' + nombreValue + '"' +
            ' autocomplete="off"' +
            ' aria-required="true"' +
            ' aria-describedby="prod-nombre-error"' +
          '>' +
          '<p id="prod-nombre-error" class="form-error" role="alert" hidden></p>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="prod-precio">Precio ($) <span aria-hidden="true">*</span></label>' +
          '<input' +
            ' id="prod-precio"' +
            ' name="precio"' +
            ' class="form-campo"' +
            ' type="number"' +
            ' inputmode="decimal"' +
            ' min="0.01"' +
            ' step="0.01"' +
            ' placeholder="0.00"' +
            ' value="' + precioValue + '"' +
            ' autocomplete="off"' +
            ' aria-required="true"' +
            ' aria-describedby="prod-precio-error"' +
          '>' +
          '<p id="prod-precio-error" class="form-error" role="alert" hidden></p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button type="submit" class="form-submit" style="flex:1;">' + btnTexto + '</button>' +
          '<button type="button" class="btn-peligro" id="btn-cancelar-prod" style="flex:0 0 auto;">Cancelar</button>' +
        '</div>' +
      '</form>'

    // Focus en el campo de nombre
    var inputNombre = document.getElementById('prod-nombre')
    if (inputNombre) inputNombre.focus()

    // Manejador de submit
    var form = document.getElementById('form-producto')
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault()
        _guardarProducto(producto)
      })
    }

    // Botón cancelar
    var btnCancelar = document.getElementById('btn-cancelar-prod')
    if (btnCancelar) {
      btnCancelar.addEventListener('click', function () {
        container.innerHTML = ''
      })
    }
  }

  /**
   * Valida y guarda (agrega o actualiza) un producto.
   * Validaciones: nombre no vacío, precio > 0.
   * @param {Object|null} productoExistente — null si es nuevo
   * @returns {Promise<void>}
   */
  async function _guardarProducto(productoExistente) {
    var inputNombre = document.getElementById('prod-nombre')
    var inputPrecio = document.getElementById('prod-precio')
    var errorNombre = document.getElementById('prod-nombre-error')
    var errorPrecio = document.getElementById('prod-precio-error')

    if (!inputNombre || !inputPrecio) return

    var nombre = inputNombre.value.trim()
    var precioStr = inputPrecio.value.trim()
    var precio = parseFloat(precioStr)
    var valido = true

    // Validación: nombre no vacío
    if (nombre === '') {
      if (inputNombre && errorNombre) {
        inputNombre.classList.add('error')
        errorNombre.textContent = 'El nombre no puede estar vacío.'
        errorNombre.hidden = false
      }
      valido = false
    } else {
      if (inputNombre && errorNombre) {
        inputNombre.classList.remove('error')
        errorNombre.textContent = ''
        errorNombre.hidden = true
      }
    }

    // Validación: precio > 0
    if (precioStr === '' || isNaN(precio) || precio <= 0) {
      if (inputPrecio && errorPrecio) {
        inputPrecio.classList.add('error')
        errorPrecio.textContent = 'Ingresa un precio válido mayor a cero.'
        errorPrecio.hidden = false
      }
      valido = false
    } else {
      if (inputPrecio && errorPrecio) {
        inputPrecio.classList.remove('error')
        errorPrecio.textContent = ''
        errorPrecio.hidden = true
      }
    }

    if (!valido) return

    try {
      if (productoExistente) {
        // Editar existente
        productoExistente.nombre = nombre
        productoExistente.precio = precio
        await DB.productos.actualizar(productoExistente)
        _mostrarToast('Producto actualizado ✓', 'exito')
      } else {
        // Agregar nuevo con activo: true
        await DB.productos.agregar({ nombre: nombre, precio: precio, activo: true })
        _mostrarToast('Producto agregado ✓', 'exito')
      }
    } catch (err) {
      console.error('ConfiguracionModule._guardarProducto — error:', err)
      _mostrarToast('No se pudo guardar el producto.', 'error')
      return
    }

    // Re-renderizar la sección de productos
    await renderProductos()
  }

  /**
   * Borrado lógico: establece activo = false y actualiza en IndexedDB.
   * No elimina el registro físicamente (Requisito 9.6).
   * @param {number} id — id del producto
   * @param {Array} productos — lista actual de productos
   * @returns {Promise<void>}
   */
  async function _eliminarProducto(id, productos) {
    var producto = null
    for (var i = 0; i < productos.length; i++) {
      if (productos[i].id === id) {
        producto = productos[i]
        break
      }
    }

    if (!producto) return

    producto.activo = false

    try {
      await DB.productos.actualizar(producto)
      _mostrarToast('Producto desactivado ✓', 'exito')
    } catch (err) {
      console.error('ConfiguracionModule._eliminarProducto — error:', err)
      _mostrarToast('No se pudo eliminar el producto.', 'error')
      return
    }

    // Re-renderizar
    await renderProductos()
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sección: Categorías de Gasto
  // Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Renderiza la sección de gestión de categorías de gasto.
   * Lista todas las categorías con nombre, estado y acciones (Editar / Eliminar).
   * Incluye un botón para agregar categorías nuevas.
   * @returns {Promise<void>}
   */
  async function renderCategorias() {
    var seccion = document.getElementById('config-categorias')
    if (!seccion) return

    var categorias
    try {
      categorias = await DB.categorias.obtenerTodas()
    } catch (err) {
      console.error('ConfiguracionModule.renderCategorias — error:', err)
      seccion.innerHTML =
        '<div class="config-seccion">' +
          '<h2 class="config-seccion__titulo">Categorías de Gasto</h2>' +
          '<p style="color:#C62828;font-size:0.9rem;">Error al cargar categorías.</p>' +
        '</div>'
      return
    }

    // Construir lista de categorías
    var listaHtml = ''
    if (categorias && categorias.length > 0) {
      listaHtml = '<ul class="config-lista" role="list">'
      for (var i = 0; i < categorias.length; i++) {
        var cat = categorias[i]
        var badgeClass = cat.activo ? 'config-item__badge--activo' : 'config-item__badge--inactivo'
        var badgeText = cat.activo ? 'Activo' : 'Inactivo'

        listaHtml +=
          '<li class="config-item" data-id="' + cat.id + '">' +
            '<div class="config-item__datos">' +
              '<span class="config-item__nombre">' + _escapar(cat.nombre) + '</span>' +
              '<span class="config-item__badge ' + badgeClass + '">' + badgeText + '</span>' +
            '</div>' +
            '<div class="config-item__acciones">' +
              '<button class="btn-primario btn-editar-cat" data-id="' + cat.id + '" aria-label="Editar ' + _escapar(cat.nombre) + '">Editar</button>' +
              (cat.activo
                ? '<button class="btn-peligro btn-eliminar-cat" data-id="' + cat.id + '" aria-label="Eliminar ' + _escapar(cat.nombre) + '">Eliminar</button>'
                : '') +
            '</div>' +
          '</li>'
      }
      listaHtml += '</ul>'
    } else {
      listaHtml = '<p style="color:#757575;font-size:0.9rem;margin-bottom:12px;">No hay categorías registradas.</p>'
    }

    seccion.innerHTML =
      '<div class="config-seccion">' +
        '<h2 class="config-seccion__titulo">Categorías de Gasto</h2>' +
        listaHtml +
        '<div id="config-cat-form-container"></div>' +
        '<button class="btn-primario" id="btn-agregar-cat" style="width:100%;">Agregar categoría</button>' +
      '</div>'

    // ── Event listeners ──────────────────────────────────────────────────────

    // Botón "Agregar categoría"
    var btnAgregar = document.getElementById('btn-agregar-cat')
    if (btnAgregar) {
      btnAgregar.addEventListener('click', function () {
        _mostrarFormularioCategoria(null)
      })
    }

    // Botones "Editar"
    var btnsEditar = seccion.querySelectorAll('.btn-editar-cat')
    for (var j = 0; j < btnsEditar.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-id'))
          var categoria = null
          for (var k = 0; k < categorias.length; k++) {
            if (categorias[k].id === id) {
              categoria = categorias[k]
              break
            }
          }
          if (categoria) {
            _mostrarFormularioCategoria(categoria)
          }
        })
      })(btnsEditar[j])
    }

    // Botones "Eliminar" (borrado lógico)
    var btnsEliminar = seccion.querySelectorAll('.btn-eliminar-cat')
    for (var m = 0; m < btnsEliminar.length; m++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-id'))
          _eliminarCategoria(id, categorias)
        })
      })(btnsEliminar[m])
    }
  }

  /**
   * Muestra el formulario inline para agregar o editar una categoría.
   * @param {Object|null} categoria — null para agregar, objeto para editar
   */
  function _mostrarFormularioCategoria(categoria) {
    var container = document.getElementById('config-cat-form-container')
    if (!container) return

    var nombreValue = categoria ? _escapar(categoria.nombre) : ''
    var tituloForm = categoria ? 'Editar categoría' : 'Nueva categoría'
    var btnTexto = categoria ? 'Actualizar' : 'Guardar'

    container.innerHTML =
      '<form id="form-categoria" novalidate style="margin-bottom:12px;" aria-label="' + tituloForm + '">' +
        '<div class="form-group">' +
          '<label class="form-label" for="cat-nombre">Nombre <span aria-hidden="true">*</span></label>' +
          '<input' +
            ' id="cat-nombre"' +
            ' name="nombre"' +
            ' class="form-campo"' +
            ' type="text"' +
            ' placeholder="Ej. Ingredientes"' +
            ' value="' + nombreValue + '"' +
            ' autocomplete="off"' +
            ' aria-required="true"' +
            ' aria-describedby="cat-nombre-error"' +
          '>' +
          '<p id="cat-nombre-error" class="form-error" role="alert" hidden></p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button type="submit" class="form-submit" style="flex:1;">' + btnTexto + '</button>' +
          '<button type="button" class="btn-peligro" id="btn-cancelar-cat" style="flex:0 0 auto;">Cancelar</button>' +
        '</div>' +
      '</form>'

    // Focus en el campo de nombre
    var inputNombre = document.getElementById('cat-nombre')
    if (inputNombre) inputNombre.focus()

    // Manejador de submit
    var form = document.getElementById('form-categoria')
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault()
        _guardarCategoria(categoria)
      })
    }

    // Botón cancelar
    var btnCancelar = document.getElementById('btn-cancelar-cat')
    if (btnCancelar) {
      btnCancelar.addEventListener('click', function () {
        container.innerHTML = ''
      })
    }
  }

  /**
   * Valida y guarda (agrega o actualiza) una categoría.
   * @param {Object|null} categoriaExistente — null si es nueva
   * @returns {Promise<void>}
   */
  async function _guardarCategoria(categoriaExistente) {
    var inputNombre = document.getElementById('cat-nombre')
    var errorEl = document.getElementById('cat-nombre-error')

    if (!inputNombre) return

    var nombre = inputNombre.value.trim()

    // Validación: nombre no vacío
    if (nombre === '') {
      if (inputNombre && errorEl) {
        inputNombre.classList.add('error')
        errorEl.textContent = 'El nombre no puede estar vacío.'
        errorEl.hidden = false
      }
      return
    }

    // Limpiar error
    if (inputNombre && errorEl) {
      inputNombre.classList.remove('error')
      errorEl.textContent = ''
      errorEl.hidden = true
    }

    try {
      if (categoriaExistente) {
        // Editar existente
        categoriaExistente.nombre = nombre
        await DB.categorias.actualizar(categoriaExistente)
        _mostrarToast('Categoría actualizada ✓', 'exito')
      } else {
        // Agregar nueva
        await DB.categorias.agregar({ nombre: nombre, activo: true })
        _mostrarToast('Categoría agregada ✓', 'exito')
      }
    } catch (err) {
      console.error('ConfiguracionModule._guardarCategoria — error:', err)
      _mostrarToast('No se pudo guardar la categoría.', 'error')
      return
    }

    // Re-renderizar la sección de categorías
    await renderCategorias()
  }

  /**
   * Borrado lógico: establece activo = false y actualiza en IndexedDB.
   * @param {number} id — id de la categoría
   * @param {Array} categorias — lista actual de categorías
   * @returns {Promise<void>}
   */
  async function _eliminarCategoria(id, categorias) {
    var categoria = null
    for (var i = 0; i < categorias.length; i++) {
      if (categorias[i].id === id) {
        categoria = categorias[i]
        break
      }
    }

    if (!categoria) return

    categoria.activo = false

    try {
      await DB.categorias.actualizar(categoria)
      _mostrarToast('Categoría desactivada ✓', 'exito')
    } catch (err) {
      console.error('ConfiguracionModule._eliminarCategoria — error:', err)
      _mostrarToast('No se pudo eliminar la categoría.', 'error')
      return
    }

    // Re-renderizar
    await renderCategorias()
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sección: Reinicio de Día
  // Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Renderiza la sección de inicio/cierre de día.
   *
   * - Si no hay día activo: muestra botón "Iniciar día"; al tocarlo llama
   *   DB.dias.iniciar() y re-renderiza.
   * - Si hay día activo: muestra timestamp de inicio y botón "Cerrar día / Reiniciar";
   *   al tocarlo muestra diálogo de confirmación, y si se confirma llama
   *   DB.dias.cerrar(id) y re-renderiza.
   *
   * @returns {Promise<void>}
   */
  async function renderReinicioDia() {
    var seccion = document.getElementById('config-reinicio')
    if (!seccion) return

    var diaActivo
    try {
      diaActivo = await DB.dias.obtenerVigente()
    } catch (err) {
      console.error('ConfiguracionModule.renderReinicioDia — error:', err)
      seccion.innerHTML =
        '<div class="config-seccion">' +
          '<h2 class="config-seccion__titulo">Día Activo</h2>' +
          '<p style="color:#C62828;font-size:0.9rem;">Error al cargar el estado del día.</p>' +
        '</div>'
      return
    }

    if (diaActivo === null || diaActivo === undefined) {
      // No hay día activo — mostrar formulario para iniciar con presupuesto
      seccion.innerHTML =
        '<div class="config-seccion">' +
          '<h2 class="config-seccion__titulo">Día Activo</h2>' +
          '<p style="color:#757575;font-size:0.9rem;margin-bottom:12px;">No hay un día activo actualmente.</p>' +
          '<div class="form-group">' +
            '<label class="form-label" for="dia-presupuesto">Presupuesto inicial ($)</label>' +
            '<input' +
              ' id="dia-presupuesto"' +
              ' type="number"' +
              ' inputmode="decimal"' +
              ' min="0"' +
              ' step="0.01"' +
              ' placeholder="0.00"' +
              ' class="form-campo"' +
              ' autocomplete="off"' +
            '>' +
          '</div>' +
          '<button id="btn-iniciar-dia" class="btn-primario" type="button" style="width:100%;">' +
            'Iniciar día' +
          '</button>' +
        '</div>'

      var btnIniciar = document.getElementById('btn-iniciar-dia')
      if (btnIniciar) {
        btnIniciar.addEventListener('click', async function () {
          btnIniciar.disabled = true
          var inputPres = document.getElementById('dia-presupuesto')
          var presupuesto = inputPres ? parseFloat(inputPres.value) : 0
          if (isNaN(presupuesto) || presupuesto < 0) presupuesto = 0
          try {
            await DB.dias.iniciar(presupuesto)
            await ConfiguracionModule.render()
          } catch (err) {
            console.error('ConfiguracionModule — error al iniciar día:', err)
            btnIniciar.disabled = false
          }
        })
      }
    } else {
      // Hay día activo — mostrar info y botón para cerrar
      var fechaInicio = new Date(diaActivo.inicio).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })

      var presupuestoInfo = ''
      if (diaActivo.presupuesto !== undefined && diaActivo.presupuesto !== null && diaActivo.presupuesto > 0) {
        presupuestoInfo = '<p style="margin-bottom:8px;font-size:0.9rem;">Presupuesto: <strong>$' + Number(diaActivo.presupuesto).toFixed(2) + '</strong></p>'
      }

      seccion.innerHTML =
        '<div class="config-seccion">' +
          '<h2 class="config-seccion__titulo">Día Activo</h2>' +
          '<p style="margin-bottom:8px;font-size:0.9rem;">' +
            'Día iniciado: <strong>' + fechaInicio + '</strong>' +
          '</p>' +
          presupuestoInfo +
          '<button id="btn-cerrar-dia" class="btn-peligro" type="button" style="width:100%;">' +
            'Cerrar día / Reiniciar' +
          '</button>' +
        '</div>'

      var btnCerrar = document.getElementById('btn-cerrar-dia')
      if (btnCerrar) {
        btnCerrar.addEventListener('click', async function () {
          var confirmado = window.confirm(
            '¿Cerrar el día actual?\n\nEl día actual se cerrará y podrás iniciar uno nuevo.'
          )
          if (!confirmado) return

          btnCerrar.disabled = true
          try {
            await DB.dias.cerrar(diaActivo.id)
            await ConfiguracionModule.render()
          } catch (err) {
            console.error('ConfiguracionModule — error al cerrar día:', err)
            btnCerrar.disabled = false
          }
        })
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // API pública
  // ────────────────────────────────────────────────────────────────────────────

  return {
    render:           render,
    renderProductos:  renderProductos,
    renderCategorias: renderCategorias,
    renderReinicioDia: renderReinicioDia
  }

})()
