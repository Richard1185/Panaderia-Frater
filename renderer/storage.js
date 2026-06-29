/**
 * STORAGE MANAGER — renderer/storage.js
 * =======================================
 * Capa de abstracción de datos para el renderer.
 * Centraliza todas las operaciones de lectura/escritura,
 * manteniendo el estado en memoria para respuestas instantáneas
 * y sincronizando con disco solo cuando es necesario.
 *
 * Patrón: Caché en memoria + persistencia asíncrona en disco
 */

const StorageManager = (() => {

  // ─────────────────────────────────────────────
  // Estado interno en memoria (caché local)
  // ─────────────────────────────────────────────
  let _catalogo   = [];   // Array de productos maestros
  let _produccion = [];   // Array de registros de producción
  let _mermas     = [];   // Array de registros de mermas

  /** Indica si los datos han sido cargados desde disco al menos una vez */
  let _inicializado = false;

  // ─────────────────────────────────────────────
  // Datos semilla: 40 productos de ejemplo
  // ─────────────────────────────────────────────

  /**
   * Lista de 40 productos de panadería predefinidos.
   * Se carga automáticamente si el catálogo está vacío.
   * El usuario puede editar/agregar productos desde la UI.
   */
  const PRODUCTOS_SEMILLA = [
    // PANES SALADOS
    { id: 'PAN-001', nombre: 'Pan Canilla',           categoria: 'Salado',     costo_unitario: 0.30, precio_venta: 0.75 },
    { id: 'PAN-002', nombre: 'Pan Campesino',         categoria: 'Salado',     costo_unitario: 0.35, precio_venta: 0.80 },
    { id: 'PAN-003', nombre: 'Pan de Hamburguesa',    categoria: 'Salado',     costo_unitario: 0.40, precio_venta: 0.90 },
    { id: 'PAN-004', nombre: 'Pan de Perro Caliente', categoria: 'Salado',     costo_unitario: 0.35, precio_venta: 0.85 },
    { id: 'PAN-005', nombre: 'Pan Ciabatta',          categoria: 'Salado',     costo_unitario: 0.50, precio_venta: 1.20 },
    { id: 'PAN-006', nombre: 'Pan de Ajo',            categoria: 'Salado',     costo_unitario: 0.45, precio_venta: 1.10 },
    { id: 'PAN-007', nombre: 'Pan Integral',          categoria: 'Salado',     costo_unitario: 0.55, precio_venta: 1.30 },
    { id: 'PAN-008', nombre: 'Pan de Queso',          categoria: 'Salado',     costo_unitario: 0.60, precio_venta: 1.50 },
    { id: 'PAN-009', nombre: 'Pan de Jamón',          categoria: 'Salado',     costo_unitario: 0.80, precio_venta: 2.00 },
    { id: 'PAN-010', nombre: 'Pan de Maíz',           categoria: 'Salado',     costo_unitario: 0.40, precio_venta: 0.90 },
    { id: 'PAN-011', nombre: 'Arepa de Maíz',         categoria: 'Salado',     costo_unitario: 0.30, precio_venta: 0.70 },
    { id: 'PAN-012', nombre: 'Pan Baguette',          categoria: 'Salado',     costo_unitario: 0.60, precio_venta: 1.40 },
    { id: 'PAN-013', nombre: 'Pan de Centeno',        categoria: 'Salado',     costo_unitario: 0.65, precio_venta: 1.60 },
    { id: 'PAN-014', nombre: 'Pan de Avena',          categoria: 'Salado',     costo_unitario: 0.55, precio_venta: 1.30 },
    // PANES DULCES
    { id: 'PAN-015', nombre: 'Pan Dulce Azucarado',   categoria: 'Dulce',      costo_unitario: 0.40, precio_venta: 1.00 },
    { id: 'PAN-016', nombre: 'Pan de Canela',         categoria: 'Dulce',      costo_unitario: 0.45, precio_venta: 1.10 },
    { id: 'PAN-017', nombre: 'Croissant',             categoria: 'Dulce',      costo_unitario: 0.70, precio_venta: 1.80 },
    { id: 'PAN-018', nombre: 'Croissant de Mantequilla', categoria: 'Dulce',   costo_unitario: 0.80, precio_venta: 2.00 },
    { id: 'PAN-019', nombre: 'Pan de Chocolate',      categoria: 'Dulce',      costo_unitario: 0.60, precio_venta: 1.50 },
    { id: 'PAN-020', nombre: 'Rosca de Guayaba',      categoria: 'Dulce',      costo_unitario: 0.50, precio_venta: 1.20 },
    { id: 'PAN-021', nombre: 'Bizcocho de Vainilla',  categoria: 'Dulce',      costo_unitario: 0.55, precio_venta: 1.40 },
    { id: 'PAN-022', nombre: 'Pan de Naranja',        categoria: 'Dulce',      costo_unitario: 0.50, precio_venta: 1.20 },
    { id: 'PAN-023', nombre: 'Bollito de Anís',       categoria: 'Dulce',      costo_unitario: 0.35, precio_venta: 0.90 },
    { id: 'PAN-024', nombre: 'Donut Glaseado',        categoria: 'Dulce',      costo_unitario: 0.60, precio_venta: 1.50 },
    { id: 'PAN-025', nombre: 'Donut de Chocolate',    categoria: 'Dulce',      costo_unitario: 0.65, precio_venta: 1.60 },
    // PASTELERÍA
    { id: 'PAN-026', nombre: 'Empanada de Queso',     categoria: 'Pastelería', costo_unitario: 0.70, precio_venta: 1.80 },
    { id: 'PAN-027', fontname: 'Empanada de Carne',   nombre: 'Empanada de Carne', categoria: 'Pastelería', costo_unitario: 0.80, precio_venta: 2.00 },
    { id: 'PAN-028', nombre: 'Empanada de Pollo',     categoria: 'Pastelería', costo_unitario: 0.75, precio_venta: 1.90 },
    { id: 'PAN-029', nombre: 'Pastelito de Guayaba',  categoria: 'Pastelería', costo_unitario: 0.60, precio_venta: 1.50 },
    { id: 'PAN-030', nombre: 'Pastelito de Queso',    categoria: 'Pastelería', costo_unitario: 0.60, precio_venta: 1.50 },
    { id: 'PAN-031', nombre: 'Milhojas de Crema',     categoria: 'Pastelería', costo_unitario: 0.90, precio_venta: 2.20 },
    { id: 'PAN-032', nombre: 'Éclair de Chocolate',   categoria: 'Pastelería', costo_unitario: 0.85, precio_venta: 2.10 },
    { id: 'PAN-033', nombre: 'Cuñito de Fresa',       categoria: 'Pastelería', costo_unitario: 0.80, precio_venta: 2.00 },
    { id: 'PAN-034', nombre: 'Brazo de Reina',        categoria: 'Pastelería', costo_unitario: 1.00, precio_venta: 2.50 },
    { id: 'PAN-035', nombre: 'Galleta de Avena',      categoria: 'Pastelería', costo_unitario: 0.30, precio_venta: 0.70 },
    { id: 'PAN-036', nombre: 'Galleta de Chispas',    categoria: 'Pastelería', costo_unitario: 0.35, precio_venta: 0.80 },
    // ESPECIALES
    { id: 'PAN-037', nombre: 'Pan de Pascua',         categoria: 'Especial',   costo_unitario: 1.20, precio_venta: 3.00 },
    { id: 'PAN-038', nombre: 'Ponqué Individual',     categoria: 'Especial',   costo_unitario: 1.50, precio_venta: 3.50 },
    { id: 'PAN-039', nombre: 'Tarta de Frutas',       categoria: 'Especial',   costo_unitario: 2.00, precio_venta: 5.00 },
    { id: 'PAN-040', nombre: 'Pan Artesanal Sourdough', categoria: 'Especial', costo_unitario: 1.80, precio_venta: 4.50 },
  ];

  // ─────────────────────────────────────────────
  // API Pública del StorageManager
  // ─────────────────────────────────────────────

  return {

    /**
     * Inicializa el StorageManager cargando todos los datos desde disco.
     * Si el catálogo está vacío, inyecta los productos semilla.
     * Debe llamarse UNA VEZ al arrancar la aplicación.
     */
    async inicializar() {
      _catalogo   = await window.bakeryAPI.leerCatalogo();
      _produccion = await window.bakeryAPI.leerProduccion();
      _mermas     = await window.bakeryAPI.leerMermas();

      // Si no hay productos, carga el catálogo semilla
      if (_catalogo.length === 0) {
        console.log('[Storage] Catálogo vacío. Cargando productos semilla...');
        _catalogo = PRODUCTOS_SEMILLA;
        await window.bakeryAPI.guardarCatalogo(_catalogo);
      }

      _inicializado = true;
      console.log(`[Storage] Inicializado: ${_catalogo.length} productos, ` +
                  `${_produccion.length} registros de producción, ` +
                  `${_mermas.length} registros de mermas.`);
    },

    // ── CATÁLOGO ───────────────────────────────

    /** Retorna copia del catálogo completo en memoria */
    obtenerCatalogo() {
      return [..._catalogo];
    },

    /** Retorna un producto por su ID */
    obtenerProductoPorId(id) {
      return _catalogo.find(p => p.id === id) || null;
    },

    // ── PRODUCCIÓN ─────────────────────────────

    /**
     * Guarda o reemplaza los registros de producción de una fecha específica.
     * Si ya existen registros para esa fecha, los elimina y añade los nuevos.
     * @param {string} fecha    - Fecha en formato YYYY-MM-DD
     * @param {Array}  items    - Array de { producto_id, cantidad_producida }
     */
    async guardarProduccionDelDia(fecha, items) {
      // Filtra y elimina registros anteriores de esa misma fecha
      _produccion = _produccion.filter(r => r.fecha !== fecha);

      // Agrega los nuevos registros solo si la cantidad es mayor a 0
      const nuevosRegistros = items
        .filter(item => item.cantidad_producida > 0)
        .map(item => ({
          id_registro:        `PROD-${fecha}-${item.producto_id}`,
          fecha:              fecha,
          producto_id:        item.producto_id,
          cantidad_producida: Math.floor(item.cantidad_producida) // Solo enteros
        }));

      _produccion.push(...nuevosRegistros);

      // Persiste inmediatamente en disco (escritura atómica)
      await window.bakeryAPI.guardarProduccion(_produccion);
      console.log(`[Storage] Producción guardada: ${nuevosRegistros.length} items para ${fecha}`);
    },

    /**
     * Retorna los registros de producción para una fecha dada.
     * @param {string} fecha - Formato YYYY-MM-DD
     * @returns {Array}
     */
    obtenerProduccionPorFecha(fecha) {
      return _produccion.filter(r => r.fecha === fecha);
    },

    /**
     * Retorna todos los registros de producción en un rango de fechas.
     * @param {string} fechaInicio - Formato YYYY-MM-DD
     * @param {string} fechaFin    - Formato YYYY-MM-DD
     * @returns {Array}
     */
    obtenerProduccionPorRango(fechaInicio, fechaFin) {
      return _produccion.filter(r => r.fecha >= fechaInicio && r.fecha <= fechaFin);
    },

    // ── MERMAS ─────────────────────────────────

    /**
     * Guarda o reemplaza los registros de mermas de una fecha específica.
     * Valida que la cantidad vencida no supere la cantidad producida.
     * @param {string} fecha - Fecha en formato YYYY-MM-DD
     * @param {Array}  items - Array de { producto_id, cantidad_vencida, motivo }
     * @returns {{ ok: boolean, errores: Array }}
     */
    async guardarMermasDelDia(fecha, items) {
      const errores = [];

      // Validación: la merma debe ser un entero no negativo
      for (const item of items) {
        if (item.cantidad_vencida <= 0) continue;

        if (!Number.isFinite(item.cantidad_vencida) || item.cantidad_vencida < 0) {
          const producto = _catalogo.find(p => p.id === item.producto_id);
          errores.push(
            `"${producto?.nombre || item.producto_id}": ` +
            `merma invalida (${item.cantidad_vencida})`
          );
        }
      }

      // Si hay errores de validación, NO guarda y retorna los errores
      if (errores.length > 0) {
        return { ok: false, errores };
      }

      // Elimina registros anteriores de esa fecha
      _mermas = _mermas.filter(r => r.fecha !== fecha);

      // Agrega nuevos registros solo con cantidades positivas
      const nuevosRegistros = items
        .filter(item => item.cantidad_vencida > 0)
        .map(item => ({
          id_merma:        `MERMA-${fecha}-${item.producto_id}`,
          fecha:           fecha,
          producto_id:     item.producto_id,
          cantidad_vencida: Math.floor(item.cantidad_vencida),
          motivo:          item.motivo || 'vencido'
        }));

      _mermas.push(...nuevosRegistros);
      await window.bakeryAPI.guardarMermas(_mermas);
      console.log(`[Storage] Mermas guardadas: ${nuevosRegistros.length} items para ${fecha}`);
      return { ok: true, errores: [] };
    },

    /** Retorna los registros de mermas para una fecha dada */
    obtenerMermasPorFecha(fecha) {
      return _mermas.filter(r => r.fecha === fecha);
    },

    /** Retorna los registros de mermas en un rango de fechas */
    obtenerMermasPorRango(fechaInicio, fechaFin) {
      return _mermas.filter(r => r.fecha >= fechaInicio && r.fecha <= fechaFin);
    },

    /**
     * Calcula los 3 productos con mayor TASA de merma en los últimos 7 días.
     * Tasa = (total_vencido / total_producido) * 100
     * Útil para las alertas del Dashboard.
     * @returns {Array} Top 3 productos con mayor tasa de merma
     */
    obtenerTopMermasSemana() {
      const hoy        = new Date();
      const hace7dias  = new Date(hoy);
      hace7dias.setDate(hoy.getDate() - 7);

      const fechaInicio = hace7dias.toISOString().split('T')[0];
      const fechaFin    = hoy.toISOString().split('T')[0];

      const produccionRango = this.obtenerProduccionPorRango(fechaInicio, fechaFin);
      const mermasRango     = this.obtenerMermasPorRango(fechaInicio, fechaFin);

      // Agrega totales por producto_id
      const totalesPorProducto = {};

      for (const r of produccionRango) {
        if (!totalesPorProducto[r.producto_id]) {
          totalesPorProducto[r.producto_id] = { producido: 0, vencido: 0 };
        }
        totalesPorProducto[r.producto_id].producido += r.cantidad_producida;
      }

      for (const r of mermasRango) {
        if (!totalesPorProducto[r.producto_id]) {
          totalesPorProducto[r.producto_id] = { producido: 0, vencido: 0 };
        }
        totalesPorProducto[r.producto_id].vencido += r.cantidad_vencida;
      }

      // Calcula tasa y enriquece con nombre del producto
      return Object.entries(totalesPorProducto)
        .filter(([, v]) => v.producido > 0)
        .map(([productoId, v]) => {
          const producto = this.obtenerProductoPorId(productoId);
          return {
            producto_id: productoId,
            nombre:      producto?.nombre || productoId,
            producido:   v.producido,
            vencido:     v.vencido,
            tasa_merma:  ((v.vencido / v.producido) * 100).toFixed(1)
          };
        })
        .sort((a, b) => b.tasa_merma - a.tasa_merma)
        .slice(0, 3);
    },

  }; // fin return

})(); // IIFE: el módulo se construye una sola vez
