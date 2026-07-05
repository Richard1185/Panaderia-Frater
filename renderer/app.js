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
  const btnAgregarProductoCatalogo = document.getElementById('btnAgregarProductoCatalogo');
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
  let ultimoBalanceReporte = null;

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
    const filas = tbodyCatalogo.querySelectorAll('tr');
    const productosEditados = [];
    let hayErrores = false;
    let siguienteSecuenciaCatalogo = obtenerSiguienteSecuenciaCatalogo();

    filas.forEach(fila => {
      const inputNombre = fila.querySelector('.input-nombre-producto');
      const inputCategoria = fila.querySelector('.input-categoria-producto');
      const inputCosto = fila.querySelector('.input-costo-producto');
      const inputPrecio = fila.querySelector('.input-precio-producto');
      const inputVisible = fila.querySelector('.input-visible-produccion');
      const inputPeso = fila.querySelector('.input-peso-producto');

      if (!inputNombre || !inputCategoria || !inputCosto || !inputPrecio || !inputVisible || !inputPeso) {
        return;
      }

      const nombre = inputNombre.value.trim().replace(/\s+/g, ' ');
      const categoria = inputCategoria.value.trim().replace(/\s+/g, ' ');
      const costo = Number(inputCosto.value);
      const precio = Number(inputPrecio.value);
      const peso = Number(inputPeso.value);
      const visibleEnProduccion = inputVisible.checked;

      inputNombre.value = nombre;
      inputCategoria.value = categoria;
      inputNombre.classList.remove('input-error');
      inputCategoria.classList.remove('input-error');
      inputCosto.classList.remove('input-error');
      inputPrecio.classList.remove('input-error');
      inputPeso.classList.remove('input-error');

      if (!nombre) {
        inputNombre.classList.add('input-error');
        hayErrores = true;
      }

      if (!categoria) {
        inputCategoria.classList.add('input-error');
        hayErrores = true;
      }

      if (!Number.isFinite(costo) || costo < 0) {
        inputCosto.classList.add('input-error');
        hayErrores = true;
      }

      if (!Number.isFinite(precio) || precio < 0) {
        inputPrecio.classList.add('input-error');
        hayErrores = true;
      }

      if (!Number.isFinite(peso) || peso < 0) {
        inputPeso.classList.add('input-error');
        hayErrores = true;
      }

      const esNuevo = inputNombre.getAttribute('data-es-nuevo') === 'true';
      const idProducto = esNuevo
        ? asignarNuevoIdCatalogo(fila, siguienteSecuenciaCatalogo++)
        : inputNombre.getAttribute('data-id');

      productosEditados.push({
        id: idProducto,
        nombre,
        categoria,
        costo_unitario: costo,
        precio_venta: precio,
        visible_en_produccion: visibleEnProduccion,
        peso_unitario: peso
      });
    });

    if (hayErrores) {
      mostrarToast('Revise nombre, categoría, costo, precio y peso. No se permiten valores vacíos o negativos', 'error');
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
      await StorageManager.actualizarCatalogo(productosEditados);
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

  btnAgregarProductoCatalogo.addEventListener('click', () => {
    const filaNueva = construirFilaCatalogo({
      id: '',
      nombre: '',
      categoria: '',
      costo_unitario: 0,
      precio_venta: 0,
      visible_en_produccion: true,
      peso_unitario: 0
    }, tbodyCatalogo.children.length, true);

    tbodyCatalogo.appendChild(filaNueva);
    const inputNombre = filaNueva.querySelector('.input-nombre-producto');
    if (inputNombre) {
      inputNombre.focus();
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

  function obtenerCatalogoVisibleEnProduccion() {
    return StorageManager
      .obtenerCatalogo()
      .filter(prod => prod.visible_en_produccion !== false);
  }

  function normalizarCategoriaParaClase(categoria) {
    const categoriaNormalizada = (categoria || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

    const categoriasConEstilo = new Set(['salado', 'dulce', 'pasteleria', 'especial']);
    return categoriasConEstilo.has(categoriaNormalizada) ? categoriaNormalizada : 'generica';
  }

  function renderBadgeCategoria(categoria) {
    return `<span class="badge-categoria badge-${normalizarCategoriaParaClase(categoria)}">${categoria}</span>`;
  }

  function construirIdProductoCatalogo(secuencia) {
    return `PAN-${String(secuencia).padStart(3, '0')}`;
  }

  function obtenerSiguienteSecuenciaCatalogo() {
    return StorageManager.obtenerCatalogo().reduce((maximo, producto) => {
      const coincidencia = /^PAN-(\d+)$/.exec(producto.id || '');
      const numero = coincidencia ? Number(coincidencia[1]) : 0;
      return Math.max(maximo, numero);
    }, 0) + 1;
  }

  function asignarNuevoIdCatalogo(fila, secuencia) {
    const nuevoId = construirIdProductoCatalogo(secuencia);
    const elementosConId = fila.querySelectorAll('[data-id]');
    elementosConId.forEach(elemento => {
      elemento.setAttribute('data-id', nuevoId);
    });

    const inputNombre = fila.querySelector('.input-nombre-producto');
    if (inputNombre) {
      inputNombre.setAttribute('data-es-nuevo', 'false');
    }

    const codigoProducto = fila.querySelector('.codigo-producto');
    if (codigoProducto) {
      codigoProducto.textContent = nuevoId;
    }

    return nuevoId;
  }

  function construirFilaCatalogo(prod, index, esNuevo = false) {
    const tr = document.createElement('tr');
    const visibleEnProduccion = prod.visible_en_produccion !== false;
    const etiquetaId = prod.id || 'Nuevo';

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><span class="codigo-producto">${etiquetaId}</span></td>
      <td>
        <input type="text"
               class="input-nombre-producto"
               data-id="${prod.id || ''}"
               data-es-nuevo="${esNuevo}"
               value="${prod.nombre || ''}"
               maxlength="80" />
      </td>
      <td>
        <input type="text"
               class="input-categoria-producto"
               data-id="${prod.id || ''}"
               value="${prod.categoria || ''}"
               maxlength="40" />
      </td>
      <td class="col-numero">
        <input type="number"
               class="input-costo-producto"
               data-id="${prod.id || ''}"
               value="${Number(prod.costo_unitario || 0).toFixed(2)}"
               min="0"
               step="0.01"
               inputmode="decimal" />
      </td>
      <td class="col-numero">
        <input type="number"
               class="input-precio-producto"
               data-id="${prod.id || ''}"
               value="${Number(prod.precio_venta || 0).toFixed(2)}"
               min="0"
               step="0.01"
               inputmode="decimal" />
      </td>
      <td class="col-centro">
        <label class="checkbox-catalogo">
          <input type="checkbox"
                 class="input-visible-produccion"
                 data-id="${prod.id || ''}"
                 ${visibleEnProduccion ? 'checked' : ''} />
          <span>Mostrar</span>
        </label>
      </td>
      <td class="col-numero">
        <input type="number"
               class="input-peso-producto"
               data-id="${prod.id || ''}"
               value="${Number(prod.peso_unitario || 0).toFixed(2)}"
               min="0"
               step="0.01"
               inputmode="decimal" />
      </td>
    `;

    return tr;
  }

  function cargarTablaCatalogo() {
    const catalogo = StorageManager.obtenerCatalogo();

    tbodyCatalogo.innerHTML = '';

    catalogo.forEach((prod, index) => {
      tbodyCatalogo.appendChild(construirFilaCatalogo(prod, index));
    });
  }

  // ── Tablas de carga ───────────────────────────

  function cargarTablaProduccion(fecha) {
    const catalogo = obtenerCatalogoVisibleEnProduccion();
    const produccionDia = StorageManager.obtenerProduccionPorFecha(fecha);

    tbodyProduccion.innerHTML = '';

    catalogo.forEach((prod, index) => {
      const prodDia = produccionDia.find(r => r.producto_id === prod.id);
      const cantidad = prodDia ? prodDia.cantidad_producida : 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${prod.nombre}</strong></td>
        <td>${renderBadgeCategoria(prod.categoria)}</td>
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
    const catalogo = obtenerCatalogoVisibleEnProduccion();
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
        <td>${renderBadgeCategoria(prod.categoria)}</td>
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
          <td>${renderBadgeCategoria(prod.categoria)}</td>
          <td class="col-numero">${prod.produccion}</td>
          <td class="col-numero rojo">${prod.mermas}</td>
          <td class="col-numero verde">${prod.ventas}</td>
          <td class="col-numero verde">$${prod.ingreso_est.toFixed(2)}</td>
          <td class="col-numero rojo">$${prod.perdida_merma.toFixed(2)}</td>
        `;
      });
    }

    ultimoBalanceReporte = {
      balance,
      fechaInicio,
      fechaFin
    };
    if (typeof actualizarInfoContextoChat === 'function') {
      actualizarInfoContextoChat();
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
    }
  }

  // ─────────────────────────────────────────────
  // LÓGICA DEL CHAT DE IA LOCAL (LM STUDIO)
  // ─────────────────────────────────────────────

  // Referencias a elementos del DOM del Chat
  const panelChatIA        = document.getElementById('panelChatIA');
  const chatHeader         = document.getElementById('chatHeader');
  const chatEstadoLM       = document.getElementById('chatEstadoLM');
  const btnMinimizarChat   = document.getElementById('btnMinimizarChat');
  const btnConfigChat      = document.getElementById('btnConfigChat');
  const btnLimpiarChat     = document.getElementById('btnLimpiarChat');
  const chatConfigSeccion  = document.getElementById('chatConfigSeccion');
  const chatUrlLM          = document.getElementById('chatUrlLM');
  const chatModelLM        = document.getElementById('chatModelLM');
  const btnProbarConexion  = document.getElementById('btnProbarConexion');
  const chatCuerpo         = document.getElementById('chatCuerpo');
  const chkIncluirDatos    = document.getElementById('chkIncluirDatos');
  const chatContextoInfo   = document.getElementById('chatContextoInfo');
  const chatInputTexto     = document.getElementById('chatInputTexto');
  const btnEnviarChat      = document.getElementById('btnEnviarChat');
  const chatResizer        = document.getElementById('chatResizer');

  // Estado del chat
  let chatHistorial = [];
  let estaPensando = false;

  // Cargar configuración inicial de localStorage
  const guardadoUrl = localStorage.getItem('bakery-chat-url');
  if (guardadoUrl) chatUrlLM.value = guardadoUrl;

  const chatGuardadoAltura = localStorage.getItem('bakery-chat-altura') || '280';
  const chatGuardadoEstado = localStorage.getItem('bakery-chat-estado') || 'colapsado';

  // Aplicar altura e inicialización del estado del chat
  if (chatGuardadoEstado === 'expandido') {
    panelChatIA.classList.remove('colapsado');
    panelChatIA.style.height = `${chatGuardadoAltura}px`;
    btnMinimizarChat.textContent = '▲';
    btnMinimizarChat.title = 'Minimizar chat';
  } else {
    panelChatIA.classList.add('colapsado');
    panelChatIA.style.height = '';
    btnMinimizarChat.textContent = '▼';
    btnMinimizarChat.title = 'Expandir chat';
  }

  // Generar reporte inicial (última semana por defecto) para tener contexto activo
  setTimeout(() => {
    generarReporteRapido();
  }, 100);

  // Función para actualizar el badge de información del contexto (declaración clásica para hoisting)
  function actualizarInfoContextoChat() {
    if (!ultimoBalanceReporte) {
      chatContextoInfo.textContent = 'Sin datos cargados';
      chatContextoInfo.classList.add('inactivo');
      return;
    }

    if (chkIncluirDatos.checked) {
      const rangoTexto = ultimoBalanceReporte.fechaInicio === ultimoBalanceReporte.fechaFin
        ? `${ultimoBalanceReporte.fechaInicio}`
        : `${ultimoBalanceReporte.fechaInicio} al ${ultimoBalanceReporte.fechaFin}`;
      chatContextoInfo.textContent = `📎 Contexto activo: Reporte del ${rangoTexto}`;
      chatContextoInfo.classList.remove('inactivo');
    } else {
      chatContextoInfo.textContent = 'Contexto inactivo';
      chatContextoInfo.classList.add('inactivo');
    }
  }

  chkIncluirDatos.addEventListener('change', actualizarInfoContextoChat);

  // Redimensionamiento Vertical (Mouse drag)
  let m_pos;
  function resizeChat(e) {
    const dy = e.clientY - m_pos;
    m_pos = e.clientY;
    
    // Calcular nueva altura
    const nuevaAltura = parseInt(getComputedStyle(panelChatIA, '').height) + dy;
    
    // Límites de altura
    if (nuevaAltura >= 120 && nuevaAltura <= 600) {
      panelChatIA.style.height = `${nuevaAltura}px`;
      localStorage.setItem('bakery-chat-altura', nuevaAltura);
    }
  }

  chatResizer.addEventListener('mousedown', function(e) {
    if (panelChatIA.classList.contains('colapsado')) return; // No redimensionar si está colapsado
    m_pos = e.clientY;
    chatResizer.classList.add('arrastrando');
    // Para que el movimiento sea fluido en Electron, desactivamos la transición CSS temporalmente
    panelChatIA.style.transition = 'none';
    
    document.addEventListener('mousemove', resizeChat);
    
    // Evitar selección de texto molesta durante el arrastre
    e.preventDefault();
  });

  document.addEventListener('mouseup', function() {
    chatResizer.classList.remove('arrastrando');
    panelChatIA.style.transition = ''; // Restaurar la transición CSS normal
    document.removeEventListener('mousemove', resizeChat);
  });

  // Colapsar y Expandir el Chat
  function toggleColapsarChat() {
    const estaColapsado = panelChatIA.classList.contains('colapsado');
    if (estaColapsado) {
      // Expandir
      panelChatIA.classList.remove('colapsado');
      const altura = localStorage.getItem('bakery-chat-altura') || '280';
      panelChatIA.style.height = `${altura}px`;
      btnMinimizarChat.textContent = '▲';
      btnMinimizarChat.title = 'Minimizar chat';
      localStorage.setItem('bakery-chat-estado', 'expandido');
      // Hacer scroll automático al final cuando se expande
      setTimeout(() => {
        chatCuerpo.scrollTop = chatCuerpo.scrollHeight;
      }, 200);
    } else {
      // Colapsar
      panelChatIA.classList.add('colapsado');
      panelChatIA.style.height = '';
      btnMinimizarChat.textContent = '▼';
      btnMinimizarChat.title = 'Expandir chat';
      localStorage.setItem('bakery-chat-estado', 'colapsado');
    }
  }

  // Hacer click en la cabecera (excepto si hace click en los botones de acción) hace toggle
  chatHeader.addEventListener('click', (e) => {
    if (e.target.closest('.chat-header-acciones')) return;
    toggleColapsarChat();
  });

  btnMinimizarChat.addEventListener('click', toggleColapsarChat);

  // Mostrar/Ocultar Configuración
  btnConfigChat.addEventListener('click', () => {
    chatConfigSeccion.classList.toggle('oculto');
  });

  // Limpiar Conversación
  btnLimpiarChat.addEventListener('click', () => {
    chatHistorial = [];
    chatCuerpo.innerHTML = `
      <div class="chat-mensaje sistema">
        <div class="mensaje-avatar">🤖</div>
        <div class="mensaje-contenido">
          <strong>Asistente AI Frater:</strong> Conversación restablecida. ¿En qué más puedo ayudarte hoy con respecto a los reportes?
        </div>
      </div>
    `;
    mostrarToast('Historial del chat borrado', 'exito');
  });

  // Probar Conexión y Cargar Modelos de LM Studio
  async function verificarConexionLMStudio(silencioso = false) {
    const url = chatUrlLM.value.trim();
    chatEstadoLM.textContent = 'Conectando...';
    chatEstadoLM.className = 'chat-badge-estado conectando';

    // Estado temporal en el selector
    chatModelLM.innerHTML = '<option value="">Buscando modelos...</option>';
    chatModelLM.disabled = true;

    // Consultar modelos a través del proceso principal (IPC) para evitar restricciones de CSP
    const result = await window.bakeryAPI.obtenerModelosLMStudio(url);

    if (result.ok && result.data && result.data.data) {
      chatEstadoLM.textContent = 'Conectado';
      chatEstadoLM.className = 'chat-badge-estado conectado';

      const modelos = result.data.data;
      chatModelLM.innerHTML = '';

      if (modelos.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Sin modelos cargados';
        chatModelLM.appendChild(opt);
        chatModelLM.disabled = true;
      } else {
        modelos.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.id;
          chatModelLM.appendChild(opt);
        });
        chatModelLM.disabled = false;

        // Seleccionar el modelo guardado si existe en la lista
        const guardadoModelo = localStorage.getItem('bakery-chat-modelo');
        if (guardadoModelo && modelos.some(m => m.id === guardadoModelo)) {
          chatModelLM.value = guardadoModelo;
        } else {
          // Por defecto selecciona el primero
          chatModelLM.selectedIndex = 0;
          localStorage.setItem('bakery-chat-modelo', chatModelLM.value);
        }
      }

      if (!silencioso) mostrarToast('Conexión con LM Studio exitosa', 'exito');
      return true;
    } else {
      chatEstadoLM.textContent = 'Desconectado';
      chatEstadoLM.className = 'chat-badge-estado desconectado';
      chatModelLM.innerHTML = '<option value="">Servidor desconectado</option>';
      chatModelLM.disabled = true;

      const errorMsg = result.error || 'Servidor no responde';
      if (!silencioso) {
        mostrarToast('No se pudo conectar con LM Studio. Verifique el servidor.', 'error');
        console.error('Error de conexión:', errorMsg);
      }
      return false;
    }
  }

  btnProbarConexion.addEventListener('click', () => verificarConexionLMStudio(false));

  // Verificar conexión inicial de forma silenciosa al arrancar
  verificarConexionLMStudio(true);

  // Guardar configuración al cambiar inputs
  chatUrlLM.addEventListener('change', () => {
    localStorage.setItem('bakery-chat-url', chatUrlLM.value.trim());
    verificarConexionLMStudio(true);
  });

  chatModelLM.addEventListener('change', () => {
    if (chatModelLM.value) {
      localStorage.setItem('bakery-chat-modelo', chatModelLM.value);
      console.log(`[Chat] Modelo seleccionado: ${chatModelLM.value}`);
    }
  });

  // Agregar Mensajes a la Interfaz Visual
  function agregarMensajeVisual(rol, contenido, esPensando = false) {
    const div = document.createElement('div');
    div.className = `chat-mensaje ${rol === 'user' ? 'usuario' : 'sistema'}`;
    if (esPensando) div.classList.add('pensando');

    const avatar = document.createElement('div');
    avatar.className = 'mensaje-avatar';
    avatar.textContent = rol === 'user' ? '👤' : '🤖';

    const cuerpoMsg = document.createElement('div');
    cuerpoMsg.className = 'mensaje-contenido';
    
    if (esPensando) {
      cuerpoMsg.innerHTML = '<div class="dot-flashing"></div>';
    } else {
      cuerpoMsg.innerHTML = rol === 'user' 
        ? `<strong>Tú:</strong> ${contenido}` 
        : `<strong>Asistente AI:</strong> ${contenido}`;
    }

    div.appendChild(avatar);
    div.appendChild(cuerpoMsg);
    chatCuerpo.appendChild(div);
    chatCuerpo.scrollTop = chatCuerpo.scrollHeight;

    return div;
  }

  function escaparHTML(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function esErrorDeCargaDeModelo(result) {
    const detalle = `${result?.error || ''}\n${result?.detail || ''}`.toLowerCase();
    return (result?.status === 400 || detalle.includes('invalid_request_error')) &&
      (detalle.includes('failed to load model') ||
       detalle.includes('insufficient system resources') ||
       detalle.includes('requires approximately'));
  }

  function construirMensajeErrorLMStudio(result, url) {
    const detalleSeguro = escaparHTML(result?.error || 'No se recibió una respuesta válida del servidor local de LM Studio.');

    if (esErrorDeCargaDeModelo(result)) {
      return `
        <div class="mensaje-avatar" style="border-color: var(--acento-rojo)">❌</div>
        <div class="mensaje-contenido" style="border-color: var(--acento-rojo); color: var(--acento-rojo)">
          <strong>Modelo no disponible:</strong> LM Studio respondió, pero no pudo cargar el modelo seleccionado por falta de memoria.<br>
          <small>Detalle: ${detalleSeguro}</small><br><br>
          <span style="font-size: 11px; color: var(--texto-secundario)">El servidor sí está accesible en <code>${escaparHTML(url)}</code>. Usa un modelo más liviano o reduce los guardrails de carga en LM Studio si sabes que tu equipo lo soporta.</span>
        </div>
      `;
    }

    return `
      <div class="mensaje-avatar" style="border-color: var(--acento-rojo)">❌</div>
      <div class="mensaje-contenido" style="border-color: var(--acento-rojo); color: var(--acento-rojo)">
        <strong>Error de Conexión:</strong> No se pudo obtener respuesta del servidor de LM Studio.<br>
        <small>Detalle: ${detalleSeguro}</small><br><br>
        <span style="font-size: 11px; color: var(--texto-secundario)">Asegúrate de que LM Studio está ejecutándose en <code>${escaparHTML(url)}</code> y que has iniciado el servidor local.</span>
      </div>
    `;
  }

  // Enviar mensaje
  async function enviarMensajeAI() {
    const texto = chatInputTexto.value.trim();
    if (!texto || estaPensando) return;

    // Verificar si el chat está colapsado y abrirlo si el usuario escribe y envía
    if (panelChatIA.classList.contains('colapsado')) {
      toggleColapsarChat();
    }

    estaPensando = true;
    chatInputTexto.value = '';
    chatInputTexto.disabled = true;
    btnEnviarChat.disabled = true;

    // Agregar mensaje de usuario
    agregarMensajeVisual('user', texto);
    chatHistorial.push({ role: 'user', content: texto });

    // Agregar indicador de cargando (pensando)
    const loaderElement = agregarMensajeVisual('assistant', '', true);

    const url = chatUrlLM.value.trim();
    const model = chatModelLM.value.trim();

    // Construir System Prompt con el contexto del reporte de la Panadería Frater
    let systemPrompt = `Eres un asistente AI experto en análisis de reportes de datos de negocio para la 'Panadería Frater' (también llamada 'Frater Panaderia').
Tu objetivo es ayudar al administrador a interpretar y analizar la información sobre la producción, mermas de productos, unidades vencidas, ventas estimadas y balance financiero (ingresos estimados y pérdidas por merma).
Responde siempre y exclusivamente en español, aunque el usuario escriba en otro idioma o mezcle idiomas.
No devuelvas frases, cierres ni encabezados en inglés.
Si necesitas mencionar un término técnico, explícalo en español.
Mantén un tono muy claro, analítico, profesional y conciso (evita introducciones o explicaciones innecesariamente largas).
Usa un formato estructurado o viñetas cuando sea relevante para facilitar la lectura de datos financieros.`;

    if (chkIncluirDatos.checked && ultimoBalanceReporte) {
      systemPrompt += `\n\nCONTEXTO DE NEGOCIO ACTIVO (Reporte en pantalla):
Período de análisis: del ${formatearFecha(ultimoBalanceReporte.fechaInicio)} al ${formatearFecha(ultimoBalanceReporte.fechaFin)}.

TOTALES GENERALES EN EL PERÍODO:
- Producción total: ${ultimoBalanceReporte.balance.totales.producido} unidades
- Mermas totales: ${ultimoBalanceReporte.balance.totales.mermas} unidades
- Ventas estimadas: ${ultimoBalanceReporte.balance.totales.ventas} unidades
- Ingresos estimados: $${ultimoBalanceReporte.balance.totales.ingresos.toFixed(2)} USD
- Pérdidas financieras por mermas: $${ultimoBalanceReporte.balance.totales.perdidas.toFixed(2)} USD

DETALLE DE MOVIMIENTOS POR PRODUCTO (Productos activos):
${ultimoBalanceReporte.balance.detalle.map(p => `- ${p.producto} (Categoría: ${p.categoria}): Producción=${p.produccion} und, Mermas=${p.mermas} und, Ventas Estimadas=${p.ventas} und, Ingreso Est.=$${p.ingreso_est.toFixed(2)}, Pérdida por Merma=$${p.perdida_merma.toFixed(2)}`).join('\n')}

Por favor, responde a las preguntas del usuario basándote en los datos anteriores. Si el usuario te hace preguntas no relacionadas con estos datos, intenta responder de forma útil pero recuérdale que tu especialidad es analizar los reportes de la Panadería Frater.`;
    } else {
      systemPrompt += `\n\nNota: Actualmente el usuario no ha adjuntado los datos del reporte activo o el reporte está vacío, así que responde basándote en conocimientos generales del negocio, pero avísale sutilmente que puede activar el checkbox para incluir los reportes reales.`;
    }

    // Preparar el cuerpo de mensajes para la API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistorial
    ];

    // Llamar al backend de Electron a través de la API segura
    const result = await window.bakeryAPI.consultarLMStudio({
      url,
      messages,
      model
    });

    // Remover indicador de cargando
    loaderElement.remove();

    if (result.ok && result.data && result.data.choices && result.data.choices[0]) {
      const respuestaTexto = result.data.choices[0].message.content;
      agregarMensajeVisual('assistant', respuestaTexto);
      chatHistorial.push({ role: 'assistant', content: respuestaTexto });
      
      // Actualizar el estado de conexión
      chatEstadoLM.textContent = 'Conectado';
      chatEstadoLM.className = 'chat-badge-estado conectado';
    } else {
      const msgError = result.error || 'No se recibió una respuesta válida del servidor local de LM Studio.';
      console.error('Error de IA:', msgError);
      
      const divErr = document.createElement('div');
      divErr.className = 'chat-mensaje sistema';
      divErr.innerHTML = construirMensajeErrorLMStudio(result, url);
      chatCuerpo.appendChild(divErr);
      chatCuerpo.scrollTop = chatCuerpo.scrollHeight;

      if (esErrorDeCargaDeModelo(result)) {
        chatEstadoLM.textContent = 'Conectado';
        chatEstadoLM.className = 'chat-badge-estado conectado';
      } else {
        chatEstadoLM.textContent = 'Desconectado';
        chatEstadoLM.className = 'chat-badge-estado desconectado';
      }
    }

    estaPensando = false;
    chatInputTexto.disabled = false;
    btnEnviarChat.disabled = false;
    chatInputTexto.focus();
  }

  btnEnviarChat.addEventListener('click', enviarMensajeAI);
  chatInputTexto.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      enviarMensajeAI();
    }
  });

});
