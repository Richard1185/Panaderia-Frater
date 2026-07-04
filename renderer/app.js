/**
 * CONTROLADOR PRINCIPAL — renderer/app.js
 * ========================================
 * Orquesta la interfaz de usuario, eventos, navegación, carga de tablas,
 * lógica de negocio y visualización de gráficos interactivos con Chart.js.
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ─────────────────────────────────────────────
  // Elementos del DOM comunes
  // ─────────────────────────────────────────────
  const btnTema            = document.getElementById('btnTema');
  const iconoTema          = document.getElementById('iconoTema');
  const fechaActualText    = document.getElementById('fechaActual');
  const tituloPagina       = document.getElementById('tituloPagina');
  const estadoTexto        = document.querySelector('.estado-texto');
  const toast              = document.getElementById('toast');

  // Menú lateral
  const navItems = document.querySelectorAll('.nav-item');
  const vistas   = document.querySelectorAll('.vista');

  // Dashboard
  const cardTotalProducido = document.getElementById('card-total-producido');
  const cardTotalMermas    = document.getElementById('card-total-mermas');
  const cardTotalVentas    = document.getElementById('card-total-ventas');
  const cardTotalIngresos  = document.getElementById('card-total-ingresos');
  const alertasMermasGrid  = document.getElementById('alertas-mermas');

  // Producción
  const fechaProduccionInput = document.getElementById('fechaProduccion');
  const tbodyProduccion      = document.getElementById('tbodyProduccion');
  const btnGuardarProduccion = document.getElementById('btnGuardarProduccion');

  // Mermas
  const fechaMermasInput = document.getElementById('fechaMermas');
  const tbodyMermas      = document.getElementById('tbodyMermas');
  const btnGuardarMermas = document.getElementById('btnGuardarMermas');

  // Catálogo
  const tbodyCatalogo      = document.getElementById('tbodyCatalogo');
  const btnGuardarCatalogo = document.getElementById('btnGuardarCatalogo');
  const inputClaveCatalogo = document.getElementById('inputClaveCatalogo');

  // Reportes
  const filtroRango        = document.getElementById('filtroRango');
  const reporteFechaInicio = document.getElementById('reporteFechaInicio');
  const reporteFechaFin    = document.getElementById('reporteFechaFin');
  const btnGenerarReporte  = document.getElementById('btnGenerarReporte');
  const reporteResumen     = document.getElementById('reporteResumen');
  const rTotalProducido    = document.getElementById('rTotalProducido');
  const rTotalMermas       = document.getElementById('rTotalMermas');
  const rTotalVentas       = document.getElementById('rTotalVentas');
  const rTotalIngresos     = document.getElementById('rTotalIngresos');
  const rTotalPerdidas     = document.getElementById('rTotalPerdidas');
  const tbodyReporte       = document.getElementById('tbodyReporte');

  // Gráficos
  let chartBarras = null;
  let chartLineas = null;

  // ─────────────────────────────────────────────
  // Estado local de la UI
  // ─────────────────────────────────────────────
  let fechaSeleccionada = obtenerFechaHoy();
  const CLAVE_EDICION_CATALOGO = '57915';

  // Inicializar inputs de fecha con el día de hoy
  fechaProduccionInput.value = fechaSeleccionada;
  fechaMermasInput.value     = fechaSeleccionada;
  fechaActualText.textContent = formatearFecha(fechaSeleccionada);

  // Inicializar almacenamiento
  try {
    await StorageManager.inicializar();
    marcarSincronizado(true);
    mostrarToast('Sistema listo y sincronizado localmente', 'exito');
    
    // Cargar dashboard inicial
    actualizarDashboard();
  } catch (error) {
    console.error('Error al inicializar StorageManager:', error);
    mostrarToast('Error al conectar con la base de datos local', 'error');
  }

  // ─────────────────────────────────────────────
  // Navegación
  // ─────────────────────────────────────────────
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const vistaDestino = item.getAttribute('data-vista');

      // Actualizar menú activo
      navItems.forEach(i => i.classList.remove('activo'));
      item.classList.add('activo');

      // Cambiar de vista
      vistas.forEach(v => {
        if (v.id === `vista-${vistaDestino}`) {
          v.classList.remove('oculto');
        } else {
          v.classList.add('oculto');
        }
      });

      // Actualizar título de barra superior
      tituloPagina.textContent = item.querySelector('.nav-texto').textContent;

      // Eventos específicos por vista
      if (vistaDestino === 'dashboard') {
        actualizarDashboard();
      } else if (vistaDestino === 'produccion') {
        cargarTablaProduccion(fechaProduccionInput.value);
      } else if (vistaDestino === 'mermas') {
        cargarTablaMermas(fechaMermasInput.value);
      } else if (vistaDestino === 'reportes') {
        // Ejecutar reporte automático
        generarReporteRapido();
      } else if (vistaDestino === 'catalogo') {
        cargarTablaCatalogo();
      }
    });
  });

  // ─────────────────────────────────────────────
  // Eventos de Producción
  // ─────────────────────────────────────────────
  fechaProduccionInput.addEventListener('change', (e) => {
    cargarTablaProduccion(e.target.value);
  });

  btnGuardarProduccion.addEventListener('click', async () => {
    const inputs = tbodyProduccion.querySelectorAll('.input-cantidad');
    const items = [];

    inputs.forEach(input => {
      const prodId = input.getAttribute('data-id');
      const val = parseInt(input.value) || 0;
      items.push({ producto_id: prodId, cantidad_producida: val });
    });

    marcarSincronizado(false);
    await StorageManager.guardarProduccionDelDia(fechaProduccionInput.value, items);
    marcarSincronizado(true);
    mostrarToast('Producción guardada correctamente', 'exito');
  });

  // ─────────────────────────────────────────────
  // Eventos de Mermas
  // ─────────────────────────────────────────────
  fechaMermasInput.addEventListener('change', (e) => {
    cargarTablaMermas(e.target.value);
  });

  tbodyMermas.addEventListener('input', (event) => {
    const input = event.target.closest('.input-cantidad');
    if (!input) return;

    input.value = input.value.replace(/[^\d]/g, '');
    input.classList.remove('input-error');
  });

  btnGuardarMermas.addEventListener('click', async () => {
    const filas = tbodyMermas.querySelectorAll('tr');
    const items = [];
    let hayErrores = false;

    filas.forEach(fila => {
      const input = fila.querySelector('.input-cantidad');
      if (!input) return;

      const prodId = input.getAttribute('data-id');
      const vencido = parseInt(input.value) || 0;
      const motivoSelect = fila.querySelector('.select-motivo');
      const motivo = normalizarMotivoMerma(motivoSelect ? motivoSelect.value : 'vencido');

      if (vencido < 0) {
        input.classList.add('input-error');
        hayErrores = true;
      } else {
        input.classList.remove('input-error');
      }

      items.push({ producto_id: prodId, cantidad_vencida: vencido, motivo });
    });

    if (hayErrores) {
      mostrarToast('Error: Las unidades vencidas deben ser un numero valido', 'error');
      return;
    }

    marcarSincronizado(false);
    const resultado = await StorageManager.guardarMermasDelDia(fechaMermasInput.value, items);
    marcarSincronizado(true);

    if (resultado.ok) {
      mostrarToast('Mermas registradas correctamente', 'exito');
      // Recargar tabla para actualizar colores o inputs
      cargarTablaMermas(fechaMermasInput.value);
    } else {
      mostrarToast(resultado.errores.join(', '), 'error');
    }
  });

  // ─────────────────────────────────────────────
  // Eventos de Catálogo
  // ─────────────────────────────────────────────
  btnGuardarCatalogo.addEventListener('click', async () => {
    const inputs = tbodyCatalogo.querySelectorAll('.input-nombre-producto');
    const productosEditados = [];
    let hayErrores = false;

    inputs.forEach(input => {
      const nombre = input.value.trim().replace(/\s+/g, ' ');
      input.value = nombre;
      input.classList.remove('input-error');

      if (!nombre) {
        input.classList.add('input-error');
        hayErrores = true;
      }

      productosEditados.push({
        id: input.getAttribute('data-id'),
        nombre
      });
    });

    if (hayErrores) {
      mostrarToast('Todos los productos deben tener un nombre válido', 'error');
      return;
    }

    const clave = inputClaveCatalogo.value.trim();

    if (!clave) {
      mostrarToast('Ingrese la clave para guardar cambios', 'advertencia');
      return;
    }

    if (clave !== CLAVE_EDICION_CATALOGO) {
      mostrarToast('Clave incorrecta. No se guardaron los cambios', 'error');
      inputClaveCatalogo.focus();
      inputClaveCatalogo.select();
      return;
    }

    try {
      marcarSincronizado(false);
      await StorageManager.actualizarNombresCatalogo(productosEditados);
      marcarSincronizado(true);

      inputClaveCatalogo.value = '';
      cargarTablaCatalogo();
      cargarTablaProduccion(fechaProduccionInput.value);
      cargarTablaMermas(fechaMermasInput.value);
      actualizarDashboard();
      generarReporteRapido();

      mostrarToast('Catálogo actualizado correctamente', 'exito');
    } catch (error) {
      console.error('Error guardando catálogo:', error);
      marcarSincronizado(true);
      mostrarToast(`No se pudo guardar el catálogo: ${error.message || error}`, 'error');
    }
  });

  // ─────────────────────────────────────────────
  // Eventos de Reportes
  // ─────────────────────────────────────────────
  filtroRango.addEventListener('change', (e) => {
    const rango = e.target.value;
    if (rango === 'personalizado') {
      reporteFechaInicio.classList.remove('oculto');
      reporteFechaFin.classList.remove('oculto');
    } else {
      reporteFechaInicio.classList.add('oculto');
      reporteFechaFin.classList.add('oculto');
    }
  });

  btnGenerarReporte.addEventListener('click', () => {
    generarReporteRapido();
  });

  // ─────────────────────────────────────────────
  // Cambio de Tema
  // ─────────────────────────────────────────────
  btnTema.addEventListener('click', () => {
    const body = document.body;
    if (body.classList.contains('tema-oscuro')) {
      body.classList.replace('tema-oscuro', 'tema-claro');
      btnTema.innerHTML = '🌙 Modo Oscuro';
      localStorage.setItem('bakery-tema', 'claro');
    } else {
      body.classList.replace('tema-claro', 'tema-oscuro');
      btnTema.innerHTML = '☀️ Modo Claro';
      localStorage.setItem('bakery-tema', 'oscuro');
    }
    // Re-renderizar gráficos para que coincidan con los nuevos colores de contraste del tema
    actualizarGraficos();
  });

  // Aplicar tema guardado en localStorage
  const temaGuardado = localStorage.getItem('bakery-tema');
  if (temaGuardado === 'claro') {
    document.body.classList.replace('tema-oscuro', 'tema-claro');
    btnTema.innerHTML = '🌙 Modo Oscuro';
  }

  // ─────────────────────────────────────────────
  // Funciones de Lógica de UI
  // ─────────────────────────────────────────────

  function obtenerFechaHoy() {
    return new Date().toISOString().split('T')[0];
  }

  function formatearFecha(fechaStr) {
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${partes[2]} de ${meses[parseInt(partes[1]) - 1]} del ${partes[0]}`;
  }

  function marcarSincronizado(sincronizado) {
    if (sincronizado) {
      estadoTexto.textContent = 'Datos sincronizados';
      document.querySelector('.estado-dot').style.backgroundColor = 'var(--acento-verde)';
    } else {
      estadoTexto.textContent = 'Guardando cambios...';
      document.querySelector('.estado-dot').style.backgroundColor = 'var(--acento-dorado)';
    }
  }

  function mostrarToast(mensaje, tipo = 'exito') {
    toast.className = `toast mostrar ${tipo}`;
    toast.textContent = mensaje;
    setTimeout(() => {
      toast.classList.remove('mostrar');
    }, 3000);
  }

  function normalizarMotivoMerma(motivo) {
    const motivoNormalizado = (motivo || 'vencido').toString().trim().toLowerCase();
    const motivosValidos = ['vencido', 'moho', 'duro', 'otros'];

    return motivosValidos.includes(motivoNormalizado) ? motivoNormalizado : 'otros';
  }

  function construirOpcionesMotivoMerma(motivoSeleccionado) {
    const motivoActual = normalizarMotivoMerma(motivoSeleccionado);

    return [
      { value: 'vencido', label: 'vencido' },
      { value: 'moho', label: 'moho' },
      { value: 'duro', label: 'duro' },
      { value: 'otros', label: 'otros' }
    ]
      .map(({ value, label }) => `<option value="${value}" ${motivoActual === value ? 'selected' : ''}>${label}</option>`)
      .join('');
  }

  function cargarTablaCatalogo() {
    const catalogo = StorageManager.obtenerCatalogo();

    tbodyCatalogo.innerHTML = '';

    catalogo.forEach((prod, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><span class="codigo-producto">${prod.id}</span></td>
        <td>
          <input type="text"
                 class="input-nombre-producto"
                 data-id="${prod.id}"
                 value="${prod.nombre}"
                 maxlength="80" />
        </td>
        <td><span class="badge-categoria badge-${prod.categoria.toLowerCase()}">${prod.categoria}</span></td>
        <td class="col-numero">$${Number(prod.costo_unitario).toFixed(2)}</td>
        <td class="col-numero">$${Number(prod.precio_venta).toFixed(2)}</td>
      `;
      tbodyCatalogo.appendChild(tr);
    });
  }

  // ── Tablas de carga ───────────────────────────

  function cargarTablaProduccion(fecha) {
    const catalogo = StorageManager.obtenerCatalogo();
    const produccionDia = StorageManager.obtenerProduccionPorFecha(fecha);

    tbodyProduccion.innerHTML = '';

    catalogo.forEach((prod, index) => {
      const prodDia = produccionDia.find(r => r.producto_id === prod.id);
      const cantidad = prodDia ? prodDia.cantidad_producida : 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${prod.nombre}</strong></td>
        <td><span class="badge-categoria badge-${prod.categoria.toLowerCase()}">${prod.categoria}</span></td>
        <td class="col-numero">
          <input type="number" 
                 class="input-cantidad" 
                 min="0" 
                 data-id="${prod.id}" 
                 value="${cantidad}" 
                 onfocus="this.select()" />
        </td>
      `;
      tbodyProduccion.appendChild(tr);
    });
  }

  function cargarTablaMermas(fecha) {
    const catalogo = StorageManager.obtenerCatalogo();
    const produccionDia = StorageManager.obtenerProduccionPorFecha(fecha);
    const mermasDia = StorageManager.obtenerMermasPorFecha(fecha);

    tbodyMermas.innerHTML = '';

    catalogo.forEach((prod, index) => {
      const prodDia = produccionDia.find(r => r.producto_id === prod.id);
      const producido = prodDia ? prodDia.cantidad_producida : 0;

      const mermaDia = mermasDia.find(r => r.producto_id === prod.id);
      const mermado = mermaDia ? mermaDia.cantidad_vencida : 0;
      const motivo = normalizarMotivoMerma(mermaDia ? mermaDia.motivo : 'vencido');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${prod.nombre}</strong></td>
        <td><span class="badge-categoria badge-${prod.categoria.toLowerCase()}">${prod.categoria}</span></td>
        <td class="col-numero col-producido">${producido}</td>
        <td class="col-numero">
          <input type="number" 
                 class="input-cantidad" 
                 min="0" 
                 step="1"
                 inputmode="numeric"
                 data-id="${prod.id}" 
                 value="${mermado}" 
                 onfocus="this.select()" />
        </td>
        <td>
          <select class="select-motivo">
            ${construirOpcionesMotivoMerma(motivo)}
          </select>
        </td>
      `;
      tbodyMermas.appendChild(tr);
    });
  }

  // ── Dashboard e Indicadores ────────────────────

  function actualizarDashboard() {
    const hoy = obtenerFechaHoy();
    const produccionHoy = StorageManager.obtenerProduccionPorFecha(hoy);
    const mermasHoy = StorageManager.obtenerMermasPorFecha(hoy);
    const catalogo = StorageManager.obtenerCatalogo();

    // Calcular métricas mediante VentasManager
    const balance = VentasManager.calcularBalance(produccionHoy, mermasHoy, catalogo);

    cardTotalProducido.textContent = balance.totales.producido;
    cardTotalMermas.textContent    = balance.totales.mermas;
    cardTotalVentas.textContent    = balance.totales.ventas;
    cardTotalIngresos.textContent  = `$${balance.totales.ingresos.toFixed(2)}`;

    // Alertas de merma
    const topMermas = StorageManager.obtenerTopMermasSemana();
    alertasMermasGrid.innerHTML = '';

    if (topMermas.length === 0) {
      alertasMermasGrid.innerHTML = '<p class="sin-datos">Sin mermas registradas en los últimos 7 días.</p>';
    } else {
      topMermas.forEach(item => {
        const div = document.createElement('div');
        div.className = 'alerta-card';
        div.innerHTML = `
          <div class="alerta-nombre">${item.nombre}</div>
          <div class="alerta-tasa">${item.tasa_merma}%</div>
          <div class="alerta-detalle">Vencido: ${item.vencido} und. / Producido: ${item.producido} und.</div>
        `;
        alertasMermasGrid.appendChild(div);
      });
    }

    // Inicializar o refrescar gráficos interactivos
    actualizarGraficos();
  }

  // ── Generación de Reportes ──────────────────────

  function generarReporteRapido() {
    const rango = filtroRango.value;
    let fechaInicio, fechaFin;

    const hoy = new Date();
    
    if (rango === 'dia') {
      const hoyStr = hoy.toISOString().split('T')[0];
      fechaInicio = hoyStr;
      fechaFin = hoyStr;
    } else if (rango === 'semana') {
      const hace7dias = new Date(hoy);
      hace7dias.setDate(hoy.getDate() - 7);
      fechaInicio = hace7dias.toISOString().split('T')[0];
      fechaFin = hoy.toISOString().split('T')[0];
    } else if (rango === 'mes') {
      const haceMes = new Date(hoy);
      haceMes.setMonth(hoy.getMonth() - 1);
      fechaInicio = haceMes.toISOString().split('T')[0];
      fechaFin = hoy.toISOString().split('T')[0];
    } else {
      fechaInicio = reporteFechaInicio.value;
      fechaFin = reporteFechaFin.value;
    }

    if (!fechaInicio || !fechaFin) {
      mostrarToast('Por favor, seleccione un rango de fechas válido', 'advertencia');
      return;
    }

    const produccionRango = StorageManager.obtenerProduccionPorRango(fechaInicio, fechaFin);
    const mermasRango = StorageManager.obtenerMermasPorRango(fechaInicio, fechaFin);
    const catalogo = StorageManager.obtenerCatalogo();

    const balance = VentasManager.calcularBalance(produccionRango, mermasRango, catalogo);

    // Actualizar resumen visual del reporte
    rTotalProducido.textContent = balance.totales.producido;
    rTotalMermas.textContent    = balance.totales.mermas;
    rTotalVentas.textContent    = balance.totales.ventas;
    rTotalIngresos.textContent  = `$${balance.totales.ingresos.toFixed(2)}`;
    rTotalPerdidas.textContent  = `$${balance.totales.perdidas.toFixed(2)}`;

    reporteResumen.style.display = 'grid';

    // Rellenar tabla
    tbodyReporte.innerHTML = '';

    if (balance.detalle.length === 0) {
      tbodyReporte.innerHTML = '<tr><td colspan="7" class="sin-datos">No se encontraron movimientos en este período.</td></tr>';
    } else {
      balance.detalle.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${prod.producto}</strong></td>
          <td><span class="badge-categoria badge-${prod.categoria.toLowerCase()}">${prod.categoria}</span></td>
          <td class="col-numero">${prod.produccion}</td>
          <td class="col-numero rojo">${prod.mermas}</td>
          <td class="col-numero verde">${prod.ventas}</td>
          <td class="col-numero verde">$${prod.ingreso_est.toFixed(2)}</td>
          <td class="col-numero rojo">$${prod.perdida_merma.toFixed(2)}</td>
        `;
        tbodyReporte.appendChild(tr);
      });
    }
  }

  // ── Gráficos Interactivos (Chart.js) ─────────────

  function actualizarGraficos() {
    const hoy = new Date();
    const fechas = [];
    const prodData = [];
    const mermaData = [];
    const ingresosData = [];
    const perdidasData = [];

    // Calcular datos de los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const fStr = d.toISOString().split('T')[0];
      fechas.push(fStr);

      const pDia = StorageManager.obtenerProduccionPorFecha(fStr);
      const mDia = StorageManager.obtenerMermasPorFecha(fStr);
      const cat  = StorageManager.obtenerCatalogo();
      const bal  = VentasManager.calcularBalance(pDia, mDia, cat);

      prodData.push(bal.totales.producido);
      mermaData.push(bal.totales.mermas);
      ingresosData.push(bal.totales.ingresos);
      perdidasData.push(bal.totales.perdidas);
    }

    const esModoClaro = document.body.classList.contains('tema-claro');
    const colorTexto = esModoClaro ? '#1f2937' : '#f0f2f8';
    const colorGrid  = esModoClaro ? '#e5e7eb' : '#2e2e54';
    const etiquetas = fechas.map(f => f.slice(5));

    // 1. Gráfico de Barras: Producción vs Mermas (unidades)
    const ctxBarras = document.getElementById('chartBarras').getContext('2d');
    if (!chartBarras) {
      chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
          labels: etiquetas,
          datasets: [
            {
              label: 'Producción (und)',
              data: prodData,
              backgroundColor: '#3b82f6',
              borderRadius: 6,
            },
            {
              label: 'Mermas (und)',
              data: mermaData,
              backgroundColor: '#ef4444',
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { labels: { color: colorTexto } }
          },
          scales: {
            x: { grid: { color: colorGrid }, ticks: { color: colorTexto } },
            y: { grid: { color: colorGrid }, ticks: { color: colorTexto } }
          }
        }
      });
    } else {
      chartBarras.data.labels = etiquetas;
      chartBarras.data.datasets[0].data = prodData;
      chartBarras.data.datasets[1].data = mermaData;
      chartBarras.options.plugins.legend.labels.color = colorTexto;
      chartBarras.options.scales.x.grid.color = colorGrid;
      chartBarras.options.scales.x.ticks.color = colorTexto;
      chartBarras.options.scales.y.grid.color = colorGrid;
      chartBarras.options.scales.y.ticks.color = colorTexto;
      chartBarras.update('none');
    }

    // 2. Gráfico de Líneas: Ingresos vs Pérdidas ($)
    const ctxLineas = document.getElementById('chartLineas').getContext('2d');
    if (!chartLineas) {
      chartLineas = new Chart(ctxLineas, {
        type: 'line',
        data: {
          labels: etiquetas,
          datasets: [
            {
              label: 'Ingresos Est. ($)',
              data: ingresosData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 3,
              tension: 0.3,
              fill: true
            },
            {
              label: 'Pérdidas Merma ($)',
              data: perdidasData,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 3,
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { labels: { color: colorTexto } }
          },
          scales: {
            x: { grid: { color: colorGrid }, ticks: { color: colorTexto } },
            y: { grid: { color: colorGrid }, ticks: { color: colorTexto } }
          }
        }
      });
    } else {
      chartLineas.data.labels = etiquetas;
      chartLineas.data.datasets[0].data = ingresosData;
      chartLineas.data.datasets[1].data = perdidasData;
      chartLineas.options.plugins.legend.labels.color = colorTexto;
      chartLineas.options.scales.x.grid.color = colorGrid;
      chartLineas.options.scales.x.ticks.color = colorTexto;
      chartLineas.options.scales.y.grid.color = colorGrid;
      chartLineas.options.scales.y.ticks.color = colorTexto;
      chartLineas.update('none');
    }
  }

});
