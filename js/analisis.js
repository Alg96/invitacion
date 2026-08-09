// analisis.js — Módulo de Análisis
// Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

const AnalisisModule = {
  /**
   * Renderiza el módulo de Análisis en #app-content.
   *
   * Flujo:
   *  1. Carga los días completados (fin !== null).
   *  2. Si no hay ninguno, muestra estado vacío.
   *  3. Toma los últimos 7 días completados (ordenados por id DESC).
   *  4. Para cada día, carga ventas y gastos; calcula totalVentas, totalGastos, ganancia.
   *  5. Calcula producto más vendido (por conteo) y categoría con mayor gasto (por suma).
   *  6. Renderiza tabla de métricas por día y los dos indicadores top.
   *
   * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  async render() {
    const contenedor = document.getElementById('app-content')

    // Estado de carga inicial
    contenedor.innerHTML = '<p class="cargando">Cargando…</p>'

    try {
      // ── 1. Cargar días completados (Requisito 7.1) ────────────────────────
      const diasCompletados = await DB.dias.obtenerCompletados()

      // ── 2. Estado vacío si no hay días completados (Requisito 7.5) ────────
      if (diasCompletados.length === 0) {
        contenedor.innerHTML = `
          <section class="empty-state" aria-label="Sin datos históricos">
            <span class="empty-state__icono" aria-hidden="true">📈</span>
            <h2 class="empty-state__titulo">Aún no hay datos históricos</h2>
            <p class="empty-state__descripcion">
              Cierra al menos un día desde Configuración para ver estadísticas aquí.
            </p>
          </section>
        `
        return
      }

      // ── 3. Últimos 7 días completados (Requisito 7.2) ────────────────────
      const ultimos7 = diasCompletados
        .sort((a, b) => b.id - a.id)
        .slice(0, 7)

      // ── 4. Calcular métricas por día (Requisito 7.2) ─────────────────────
      const metricas = []
      let todasVentas = []
      let todosGastos = []

      for (const dia of ultimos7) {
        const [ventas, gastos] = await Promise.all([
          DB.ventas.obtenerPorDia(dia.id),
          DB.gastos.obtenerPorDia(dia.id)
        ])

        const totalVentas = ventas.reduce((acc, v) => acc + v.precio, 0)
        const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0)
        const ganancia = totalVentas - totalGastos

        metricas.push({
          diaId: dia.id,
          inicio: dia.inicio,
          totalVentas,
          totalGastos,
          ganancia
        })

        todasVentas = todasVentas.concat(ventas)
        todosGastos = todosGastos.concat(gastos)
      }

      // ── 5a. Producto más vendido por conteo (Requisito 7.3) ───────────────
      const productoCounts = {}
      for (const venta of todasVentas) {
        const nombre = venta.productoNombre
        productoCounts[nombre] = (productoCounts[nombre] || 0) + 1
      }

      let topProducto = null
      let topProductoCount = 0
      for (const [nombre, count] of Object.entries(productoCounts)) {
        if (count > topProductoCount) {
          topProducto = nombre
          topProductoCount = count
        }
      }

      // ── 5b. Categoría con mayor gasto por suma (Requisito 7.4) ────────────
      const categoriaSums = {}
      for (const gasto of todosGastos) {
        const nombre = gasto.categoriaNombre
        categoriaSums[nombre] = (categoriaSums[nombre] || 0) + gasto.monto
      }

      let topCategoria = null
      let topCategoriaSum = 0
      for (const [nombre, suma] of Object.entries(categoriaSums)) {
        if (suma > topCategoriaSum) {
          topCategoria = nombre
          topCategoriaSum = suma
        }
      }

      // ── 6. Renderizar (Requisitos 7.2, 7.3, 7.4) ─────────────────────────
      const filasHTML = metricas.map(m => {
        const fecha = new Date(m.inicio).toLocaleString('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
        const claseGanancia = m.ganancia > 0 ? 'ganancia-positiva' : 'ganancia-negativa'

        return `
          <tr>
            <td>${fecha}</td>
            <td>$${m.totalVentas.toFixed(2)}</td>
            <td>$${m.totalGastos.toFixed(2)}</td>
            <td class="${claseGanancia}">$${m.ganancia.toFixed(2)}</td>
          </tr>
        `
      }).join('')

      const topProductoHTML = topProducto
        ? `<p class="analisis-indicador__valor">🌽 ${topProducto} <span class="analisis-indicador__detalle">(${topProductoCount} ventas)</span></p>`
        : `<p class="analisis-indicador__valor">Sin ventas registradas</p>`

      const topCategoriaHTML = topCategoria
        ? `<p class="analisis-indicador__valor">💸 ${topCategoria} <span class="analisis-indicador__detalle">($${topCategoriaSum.toFixed(2)})</span></p>`
        : `<p class="analisis-indicador__valor">Sin gastos registrados</p>`

      contenedor.innerHTML = `
        <section class="analisis-contenedor" aria-label="Análisis de días anteriores">
          <h1 class="analisis-titulo">Análisis</h1>
          <p class="analisis-subtitulo">Últimos ${ultimos7.length} día${ultimos7.length === 1 ? '' : 's'} completado${ultimos7.length === 1 ? '' : 's'}</p>

          <!-- Indicadores Top -->
          <div class="analisis-indicadores">
            <article class="analisis-indicador" aria-label="Producto más vendido">
              <h2 class="analisis-indicador__etiqueta">Producto más vendido</h2>
              ${topProductoHTML}
            </article>
            <article class="analisis-indicador" aria-label="Mayor categoría de gasto">
              <h2 class="analisis-indicador__etiqueta">Mayor gasto por categoría</h2>
              ${topCategoriaHTML}
            </article>
          </div>

          <!-- Tabla de métricas por día -->
          <div class="analisis-tabla-wrapper">
            <table class="analisis-tabla" aria-label="Métricas por día">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Ventas</th>
                  <th>Gastos</th>
                  <th>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                ${filasHTML}
              </tbody>
            </table>
          </div>
        </section>
      `
    } catch (error) {
      contenedor.innerHTML = `
        <div class="aviso aviso--error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>No se pudo cargar el análisis. Intenta de nuevo.</span>
        </div>
      `
      console.error('AnalisisModule.render():', error)
    }
  }
}
