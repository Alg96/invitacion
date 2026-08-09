// db.js — Capa de acceso a IndexedDB

const DB = {
  _db: null,

  /**
   * Inicializa la base de datos IndexedDB.
   * Si ya está inicializada, devuelve la instancia existente.
   * @returns {Promise<IDBDatabase>}
   */
  init() {
    if (DB._db) {
      return Promise.resolve(DB._db)
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('elotesApp', 2)

      request.onupgradeneeded = function (event) {
        const db = event.target.result
        const tx = event.target.transaction

        // Object store: ventas
        if (!db.objectStoreNames.contains('ventas')) {
          const ventasStore = db.createObjectStore('ventas', { keyPath: 'id', autoIncrement: true })
          ventasStore.createIndex('diaActivoId', 'diaActivoId', { unique: false })
          ventasStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Object store: gastos
        if (!db.objectStoreNames.contains('gastos')) {
          const gastosStore = db.createObjectStore('gastos', { keyPath: 'id', autoIncrement: true })
          gastosStore.createIndex('diaActivoId', 'diaActivoId', { unique: false })
          gastosStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Object store: productos
        if (!db.objectStoreNames.contains('productos')) {
          const productosStore = db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true })
          productosStore.createIndex('activo', 'activo', { unique: false })
        } else {
          // Asegurar que el índice 'activo' existe en productos
          const productosStore = tx.objectStore('productos')
          if (!productosStore.indexNames.contains('activo')) {
            productosStore.createIndex('activo', 'activo', { unique: false })
          }
        }

        // Object store: categoriasGasto
        if (!db.objectStoreNames.contains('categoriasGasto')) {
          const categoriasStore = db.createObjectStore('categoriasGasto', { keyPath: 'id', autoIncrement: true })
          categoriasStore.createIndex('activo', 'activo', { unique: false })
        } else {
          // Asegurar que el índice 'activo' existe en categoriasGasto
          const categoriasStore = tx.objectStore('categoriasGasto')
          if (!categoriasStore.indexNames.contains('activo')) {
            categoriasStore.createIndex('activo', 'activo', { unique: false })
          }
        }

        // Object store: diasActivos
        if (!db.objectStoreNames.contains('diasActivos')) {
          const diasStore = db.createObjectStore('diasActivos', { keyPath: 'id', autoIncrement: true })
          diasStore.createIndex('fin', 'fin', { unique: false })
        }
      }

      request.onsuccess = function (event) {
        DB._db = event.target.result
        resolve(DB._db)
      }

      request.onerror = function (event) {
        reject(event.target.error)
      }
    })
  },

  // ─── Ventas ──────────────────────────────────────────────────────────────────

  ventas: {
    /**
     * Agrega una venta a IndexedDB.
     * @param {Object} venta
     * @returns {Promise<number>} id generado
     */
    agregar(venta) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['ventas'], 'readwrite')
          const store = tx.objectStore('ventas')
          const req = store.add(venta)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Obtiene todas las ventas de un Día Activo específico.
     * @param {number} diaId
     * @returns {Promise<Array>}
     */
    obtenerPorDia(diaId) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['ventas'], 'readonly')
          const store = tx.objectStore('ventas')
          const index = store.index('diaActivoId')
          const req = index.getAll(IDBKeyRange.only(diaId))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Obtiene todas las ventas almacenadas.
     * @returns {Promise<Array>}
     */
    obtenerTodas() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['ventas'], 'readonly')
          const store = tx.objectStore('ventas')
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Actualiza una venta existente.
     * @param {Object} venta
     * @returns {Promise<void>}
     */
    actualizar(venta) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['ventas'], 'readwrite')
          const store = tx.objectStore('ventas')
          const req = store.put(venta)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Elimina una venta por su id.
     * @param {number} id
     * @returns {Promise<void>}
     */
    eliminar(id) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['ventas'], 'readwrite')
          const store = tx.objectStore('ventas')
          const req = store.delete(id)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      })
    }
  },

  // ─── Gastos ───────────────────────────────────────────────────────────────────

  gastos: {
    /**
     * Agrega un gasto a IndexedDB.
     * @param {Object} gasto
     * @returns {Promise<number>} id generado
     */
    agregar(gasto) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['gastos'], 'readwrite')
          const store = tx.objectStore('gastos')
          const req = store.add(gasto)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Obtiene todos los gastos de un Día Activo específico.
     * @param {number} diaId
     * @returns {Promise<Array>}
     */
    obtenerPorDia(diaId) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['gastos'], 'readonly')
          const store = tx.objectStore('gastos')
          const index = store.index('diaActivoId')
          const req = index.getAll(IDBKeyRange.only(diaId))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Obtiene todos los gastos almacenados.
     * @returns {Promise<Array>}
     */
    obtenerTodas() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['gastos'], 'readonly')
          const store = tx.objectStore('gastos')
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Actualiza un gasto existente.
     * @param {Object} gasto
     * @returns {Promise<void>}
     */
    actualizar(gasto) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['gastos'], 'readwrite')
          const store = tx.objectStore('gastos')
          const req = store.put(gasto)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Elimina un gasto por su id.
     * @param {number} id
     * @returns {Promise<void>}
     */
    eliminar(id) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['gastos'], 'readwrite')
          const store = tx.objectStore('gastos')
          const req = store.delete(id)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      })
    }
  },

  // ─── Productos ────────────────────────────────────────────────────────────────

  productos: {
    /**
     * Agrega un producto a IndexedDB.
     * @param {Object} producto
     * @returns {Promise<number>} id generado
     */
    agregar(producto) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['productos'], 'readwrite')
          const store = tx.objectStore('productos')
          const req = store.add(producto)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Obtiene todos los productos con activo: true.
     * Usa el índice 'activo' si existe; si no, hace fallback a getAll + filtro manual.
     * @returns {Promise<Array>}
     */
    obtenerActivos() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['productos'], 'readonly')
          const store = tx.objectStore('productos')
          try {
            const index = store.index('activo')
            const req = index.getAll(IDBKeyRange.only(true))
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
          } catch (e) {
            // Fallback: el índice no existe (DB creada con versión anterior)
            const req = store.getAll()
            req.onsuccess = () => {
              const activos = req.result.filter(p => p.activo === true)
              resolve(activos)
            }
            req.onerror = () => reject(req.error)
          }
        })
      })
    },

    /**
     * Obtiene todos los productos (activos e inactivos).
     * @returns {Promise<Array>}
     */
    obtenerTodos() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['productos'], 'readonly')
          const store = tx.objectStore('productos')
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Actualiza un producto existente.
     * @param {Object} producto
     * @returns {Promise<void>}
     */
    actualizar(producto) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['productos'], 'readwrite')
          const store = tx.objectStore('productos')
          const req = store.put(producto)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      })
    }
  },

  // ─── Categorías de Gasto ─────────────────────────────────────────────────────

  categorias: {
    /**
     * Agrega una categoría de gasto a IndexedDB.
     * @param {Object} categoria
     * @returns {Promise<number>} id generado
     */
    agregar(categoria) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['categoriasGasto'], 'readwrite')
          const store = tx.objectStore('categoriasGasto')
          const req = store.add(categoria)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Obtiene todas las categorías con activo: true.
     * Usa el índice 'activo' si existe; si no, hace fallback a getAll + filtro manual.
     * @returns {Promise<Array>}
     */
    obtenerActivas() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['categoriasGasto'], 'readonly')
          const store = tx.objectStore('categoriasGasto')
          try {
            const index = store.index('activo')
            const req = index.getAll(IDBKeyRange.only(true))
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
          } catch (e) {
            // Fallback: el índice no existe (DB creada con versión anterior)
            const req = store.getAll()
            req.onsuccess = () => {
              const activas = req.result.filter(c => c.activo === true)
              resolve(activas)
            }
            req.onerror = () => reject(req.error)
          }
        })
      })
    },

    /**
     * Obtiene todas las categorías (activas e inactivas).
     * @returns {Promise<Array>}
     */
    obtenerTodas() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['categoriasGasto'], 'readonly')
          const store = tx.objectStore('categoriasGasto')
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Actualiza una categoría existente.
     * @param {Object} categoria
     * @returns {Promise<void>}
     */
    actualizar(categoria) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['categoriasGasto'], 'readwrite')
          const store = tx.objectStore('categoriasGasto')
          const req = store.put(categoria)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      })
    }
  },

  // ─── Días Activos ─────────────────────────────────────────────────────────────

  dias: {
    /**
     * Crea un nuevo Día Activo con inicio = Date.now(), fin = null y presupuesto.
     * @param {number} [presupuesto=0] — presupuesto inicial del día
     * @returns {Promise<number>} id generado
     */
    iniciar(presupuesto) {
      var pres = (typeof presupuesto === 'number' && presupuesto >= 0) ? presupuesto : 0
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['diasActivos'], 'readwrite')
          const store = tx.objectStore('diasActivos')
          const req = store.add({ inicio: Date.now(), fin: null, presupuesto: pres })
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Establece fin = Date.now() en el Día Activo con el id dado.
     * @param {number} id
     * @returns {Promise<void>}
     */
    cerrar(id) {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['diasActivos'], 'readwrite')
          const store = tx.objectStore('diasActivos')
          const getReq = store.get(id)
          getReq.onsuccess = () => {
            const dia = getReq.result
            if (!dia) {
              reject(new Error(`Día activo con id ${id} no encontrado`))
              return
            }
            dia.fin = Date.now()
            const putReq = store.put(dia)
            putReq.onsuccess = () => resolve()
            putReq.onerror = () => reject(putReq.error)
          }
          getReq.onerror = () => reject(getReq.error)
        })
      })
    },

    /**
     * Devuelve el Día Activo vigente (fin === null).
     * Si hay más de uno con fin nulo, sanea dejando solo el de mayor id.
     * @returns {Promise<Object|null>}
     */
    obtenerVigente() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['diasActivos'], 'readwrite')
          const store = tx.objectStore('diasActivos')
          const req = store.getAll()
          req.onsuccess = () => {
            const todos = req.result
            const activos = todos.filter(d => d.fin === null || d.fin === undefined)
            if (activos.length === 0) { resolve(null); return }
            if (activos.length === 1) { resolve(activos[0]); return }
            // Sanear: ordenar por id desc, cerrar todos excepto el de mayor id
            activos.sort((a, b) => b.id - a.id)
            const vigente = activos[0]
            const ahora = Date.now()
            for (const dia of activos.slice(1)) {
              dia.fin = ahora
              store.put(dia)
            }
            resolve(vigente)
          }
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Devuelve todos los días activos completados (fin !== null).
     * @returns {Promise<Array>}
     */
    obtenerCompletados() {
      return DB.init().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['diasActivos'], 'readonly')
          const store = tx.objectStore('diasActivos')
          const req = store.getAll()
          req.onsuccess = () => {
            const completados = req.result.filter(d => d.fin !== null && d.fin !== undefined)
            resolve(completados)
          }
          req.onerror = () => reject(req.error)
        })
      })
    },

    /**
     * Sanea múltiples registros con fin: null dejando solo el de mayor id.
     * @returns {Promise<void>}
     */
    sanear() {
      return DB.dias.obtenerVigente().then(() => undefined)
    }
  }
}
