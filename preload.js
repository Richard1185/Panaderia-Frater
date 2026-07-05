/**
 * PRELOAD.JS — Puente seguro entre Renderer y Main Process
 * =========================================================
 * Expone al renderer ÚNICAMENTE las funciones necesarias mediante
 * contextBridge, sin exponer objetos de Node.js directamente.
 *
 * El renderer accede a estas funciones como: window.bakeryAPI.nombreFuncion()
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bakeryAPI', {

  // ── Catálogo Maestro ──────────────────────────────────────
  /** Obtiene todos los productos del catálogo maestro */
  leerCatalogo: () => ipcRenderer.invoke('datos:leerCatalogo'),

  /** Persiste el catálogo completo de productos */
  guardarCatalogo: (catalogo) => ipcRenderer.invoke('datos:guardarCatalogo', catalogo),

  // ── Producción Diaria ─────────────────────────────────────
  /** Obtiene todos los registros de producción */
  leerProduccion: () => ipcRenderer.invoke('datos:leerProduccion'),

  /** Persiste todos los registros de producción */
  guardarProduccion: (registros) => ipcRenderer.invoke('datos:guardarProduccion', registros),

  // ── Mermas y Vencimientos ─────────────────────────────────
  /** Obtiene todos los registros de mermas */
  leerMermas: () => ipcRenderer.invoke('datos:leerMermas'),

  /** Persiste todos los registros de mermas */
  guardarMermas: (registros) => ipcRenderer.invoke('datos:guardarMermas', registros),

  // ── IA Local / LM Studio ──────────────────────────────────
  /** Consulta el servidor local de LM Studio */
  consultarLMStudio: (datos) => ipcRenderer.invoke('ai:consultarLMStudio', datos),

  /** Obtiene la lista de modelos de LM Studio */
  obtenerModelosLMStudio: (url) => ipcRenderer.invoke('ai:obtenerModelosLMStudio', url),

});
