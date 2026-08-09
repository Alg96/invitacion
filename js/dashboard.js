// dashboard.js — Módulo de Dashboard
// Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

const DashboardModule = {
  /**
   * Renderiza el módulo de Dashboard en #app-content.
   *
   * Flujo:
   *  1. Obtiene el Día Activo vigente.
   *  2. Si no hay ninguno, muestra estado vacío.
   *  3. Carga ventas y gastos del día activo.
   *  4. Calcula totalVentas, totalGastos y gananciaNeta.
   *  5. Renderiza conteos, totales y aplica clase según signo de gananciaNeta.
   *
   * Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  async render() {
    const contenedor = document.getElementById('app-content')

    // Estado de carga inicial
    contenedor.innerHTML = '<p class="cargando">Cargando…</p>'

    try {
      // ── 1. Día Activo vigente ─────────────────────────────────────────────
      const diaActivo = await DB.dias.obtenerVigente()

      // ── 2. Estado vacío si no hay día activo (Requisito 6.5) ─────────────
      if (diaActivo === null) {
        contenedor.innerHTML = `
          <section class="empty-state" aria-label="Sin día activo">
            <span class="empty-state__icono" aria-hidden="true">📊</span>
            <h2 class="empty-state__titulo">El día no ha sido iniciado</h2>
            <p class="empty-state__descripcion">
              Ve a Configuración para iniciar el día y comenzar a registrar ventas y gastos.
            </p>
          </section>
        `
        return
      }

      // ── 3. Cargar ventas y gastos del día activo (Requisito 6.2) ─────────
      const [ventas, gastos] = await Promise.all([
        DB.ventas.obtenerPorDia(diaActivo.id),
        DB.gastos.obtenerPorDia(diaActivo.id)
      ])

      // ── 4. Calcular totales (Requisito 6.1, 6.3) ─────────────────────────
      const totalVentas = ventas.reduce((acc, v) => acc + v.precio, 0)
      const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0)
      const gananciaNeta = totalVentas - totalGastos
      const presupuesto = diaActivo.presupuesto || 0
      const balanceTotal = presupuesto + totalVentas - totalGastos

      // ── 5. Clase de color para ganancia neta (Requisito 6.6) ─────────────
      const claseGanancia = gananciaNeta > 0 ? 'ganancia-positiva' : 'ganancia-negativa'
      const claseBalance = balanceTotal >= 0 ? 'ganancia-positiva' : 'ganancia-negativa'

      // Formatear inicio del día
      const fechaInicio = new Date(diaActivo.inicio).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })

      // Tarjeta de presupuesto (solo si se definió uno)
      var presupuestoCard = ''
      if (presupuesto > 0) {
        presupuestoCard = `
          <!-- Tarjeta Presupuesto -->
          <article class="dashboard-card" aria-label="Presupuesto inicial">
            <h2 class="dashboard-card__etiqueta">Presupuesto inicial</h2>
            <p class="dashboard-card__monto">$${presupuesto.toFixed(2)}</p>
          </article>
        `
      }

      // ── 6. Renderizar (Requisitos 6.3, 6.4) ──────────────────────────────
      contenedor.innerHTML = `
        <section class="dashboard-contenedor" aria-label="Resumen del día activo">
          <h1 class="dashboard-titulo">Resumen del día</h1>
          <p class="dashboard-fecha">Iniciado: ${fechaInicio}</p>

          ${presupuestoCard}

          <!-- Tarjeta Ventas -->
          <article class="dashboard-card" aria-label="Total de ventas">
            <h2 class="dashboard-card__etiqueta">Ventas</h2>
            <p class="dashboard-card__monto">$${totalVentas.toFixed(2)}</p>
            <p class="dashboard-card__conteo">${ventas.length} ${ventas.length === 1 ? 'registro' : 'registros'}</p>
          </article>

          <!-- Tarjeta Gastos -->
          <article class="dashboard-card" aria-label="Total de gastos">
            <h2 class="dashboard-card__etiqueta">Gastos</h2>
            <p class="dashboard-card__monto">$${totalGastos.toFixed(2)}</p>
            <p class="dashboard-card__conteo">${gastos.length} ${gastos.length === 1 ? 'registro' : 'registros'}</p>
          </article>

          <!-- Tarjeta Ganancia Neta -->
          <article class="dashboard-card" aria-label="Ganancia neta">
            <h2 class="dashboard-card__etiqueta">Ganancia neta</h2>
            <p class="dashboard-card__monto ${claseGanancia}">$${gananciaNeta.toFixed(2)}</p>
            <p class="dashboard-card__conteo">Ventas − Gastos</p>
          </article>

          <!-- Tarjeta Balance Total -->
          <article class="dashboard-card" aria-label="Balance total" style="border: 2px solid ${balanceTotal >= 0 ? '#2E7D32' : '#C62828'}; border-radius:12px;">
            <h2 class="dashboard-card__etiqueta">💰 Balance total</h2>
            <p class="dashboard-card__monto ${claseBalance}">$${balanceTotal.toFixed(2)}</p>
            <p class="dashboard-card__conteo">Presupuesto + Ventas − Gastos</p>
          </article>
        </section>
      `
    } catch (error) {
      contenedor.innerHTML = `
        <div class="aviso aviso--error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>No se pudo cargar el resumen. Intenta de nuevo.</span>
        </div>
      `
      console.error('DashboardModule.render():', error)
    }
  }
}
