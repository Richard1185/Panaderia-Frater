/**
 * VENTAS Y LOGICA FINANCIERA — renderer/ventas.js
 * ================================================
 * Realiza cálculos de ventas estimadas, ingresos y pérdidas
 * financieras a partir de la producción y mermas registradas.
 */

const VentasManager = (() => {

  /**
   * Calcula el balance de producción, ventas, ingresos y pérdidas
   * para un conjunto de registros de producción y mermas.
   * 
   * @param {Array} produccion - Lista de registros de producción
   * @param {Array} mermas - Lista de registros de mermas
   * @param {Array} catalogo - Catálogo maestro de productos
   * @returns {Object} Contiene totales acumulados y desglose por producto
   */
  function calcularBalance(produccion, mermas, catalogo) {
    let totalProducido = 0;
    let totalMermas = 0;
    let totalVentas = 0;
    let totalIngresos = 0;
    let totalPerdidas = 0;

    // Mapa para consolidar la información por producto
    const balancePorProducto = {};

    // Inicializar mapa con el catálogo completo
    catalogo.forEach(prod => {
      balancePorProducto[prod.id] = {
        producto: prod.nombre,
        categoria: prod.categoria,
        produccion: 0,
        mermas: 0,
        ventas: 0,
        ingreso_est: 0,
        perdida_merma: 0,
        costo_unitario: prod.costo_unitario,
        precio_venta: prod.precio_venta
      };
    });

    // Sumar producción
    produccion.forEach(p => {
      if (balancePorProducto[p.producto_id]) {
        balancePorProducto[p.producto_id].produccion += p.cantidad_producida;
      }
    });

    // Sumar mermas
    mermas.forEach(m => {
      if (balancePorProducto[m.producto_id]) {
        balancePorProducto[m.producto_id].mermas += m.cantidad_vencida;
      }
    });

    // Calcular ventas, ingresos y pérdidas por producto
    Object.keys(balancePorProducto).forEach(id => {
      const pData = balancePorProducto[id];
      
      // Ventas estimadas = Producción - Mermas (no puede ser negativo)
      pData.ventas = Math.max(0, pData.produccion - pData.mermas);
      
      // Ingresos estimados = Unidades Vendidas * Precio Venta
      pData.ingreso_est = pData.ventas * pData.precio_venta;
      
      // Pérdidas por merma = Unidades Mermadas * Costo Unitario
      pData.perdida_merma = pData.mermas * pData.costo_unitario;

      // Acumular a los totales
      totalProducido += pData.produccion;
      totalMermas += pData.mermas;
      totalVentas += pData.ventas;
      totalIngresos += pData.ingreso_est;
      totalPerdidas += pData.perdida_merma;
    });

    // Filtrar solo los productos que tuvieron algún movimiento para el desglose detallado
    const detalleMovimientos = Object.values(balancePorProducto).filter(p => p.produccion > 0 || p.mermas > 0);

    return {
      totales: {
        producido: totalProducido,
        mermas: totalMermas,
        ventas: totalVentas,
        ingresos: totalIngresos,
        perdidas: totalPerdidas
      },
      detalle: detalleMovimientos
    };
  }

  return {
    calcularBalance
  };

})();
