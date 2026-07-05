/**
 * PROCESO PRINCIPAL DE ELECTRON — main.js
 * ========================================
 * Controla el ciclo de vida de la aplicación, crea la ventana principal
 * y expone de forma segura las rutas de almacenamiento local al renderer.
 *
 * Seguridad aplicada:
 *  - nodeIntegration: false  → el renderer no tiene acceso directo a Node.js
 *  - contextIsolation: true  → el preload corre en un contexto aislado
 *  - sandbox: false          → necesario para que preload pueda usar fs/path
 *  - Sin webSecurity desactivado, sin acceso remoto innecesario
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

// ─────────────────────────────────────────────
// Rutas de datos persistentes en el sistema
// ─────────────────────────────────────────────

/** Directorio donde se guardarán los archivos JSON de datos */
const DATA_DIR = path.join(app.getPath('userData'), 'bakery-data');

/** Archivo JSON del catálogo maestro de productos */
const CATALOG_FILE    = path.join(DATA_DIR, 'catalog.json');

/** Archivo JSON de registros de producción diaria */
const PRODUCTION_FILE = path.join(DATA_DIR, 'production.json');

/** Archivo JSON de registros de mermas y vencimientos */
const WASTE_FILE      = path.join(DATA_DIR, 'waste.json');

/**
 * Asegura que el directorio de datos exista al iniciar.
 * Si no existe, lo crea de forma recursiva.
 */
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[main] Directorio de datos creado en: ${DATA_DIR}`);
  }
}

/**
 * Crea la ventana principal de la aplicación con la configuración
 * de seguridad recomendada por Electron para apps locales de producción.
 */
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Bakery ERP — Control de Producción',
    backgroundColor: '#1a1a2e',   // Evita flash blanco al cargar
    show: false,                   // Se muestra solo cuando está lista la UI
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,   // Seguridad: el renderer NO accede a Node
      contextIsolation: true,    // Seguridad: aísla el contexto del preload
      sandbox:          false,   // Necesario para usar fs en preload
      devTools:         true     // Habilitar para desarrollo; desactivar en producción
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[main] Error cargando ventana:', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[main] Renderer finalizado inesperadamente:', details);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  // Carga el archivo HTML principal del renderer
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Muestra la ventana solo cuando el contenido está completamente cargado
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// ─────────────────────────────────────────────
// Manejadores IPC — Puente de datos seguro
// (El renderer llama a estos handlers mediante el contextBridge del preload)
// ─────────────────────────────────────────────

/**
 * Lee un archivo JSON del directorio de datos.
 * Si no existe, retorna un array vacío (valor por defecto seguro).
 * @param {string} filePath - Ruta completa del archivo JSON
 * @returns {Array} Array de registros o array vacío
 */
function leerArchivoJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const contenido = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(contenido);
  } catch (error) {
    console.error(`[main] Error leyendo ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Escribe un array de datos en un archivo JSON.
 * Usa escritura atómica: primero escribe en un archivo temporal
 * y luego renombra para evitar corrupción si la app se cierra.
 * @param {string} filePath - Ruta del archivo destino
 * @param {Array}  datos    - Array de objetos a persistir
 */
function escribirArchivoJSON(filePath, datos) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(datos, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// Handler: Leer catálogo de productos
ipcMain.handle('datos:leerCatalogo', () => leerArchivoJSON(CATALOG_FILE));

// Handler: Guardar catálogo de productos
ipcMain.handle('datos:guardarCatalogo', (event, catalogo) => {
  escribirArchivoJSON(CATALOG_FILE, catalogo);
  return { ok: true };
});

// Handler: Leer registros de producción
ipcMain.handle('datos:leerProduccion', () => leerArchivoJSON(PRODUCTION_FILE));

// Handler: Guardar registros de producción
ipcMain.handle('datos:guardarProduccion', (event, registros) => {
  escribirArchivoJSON(PRODUCTION_FILE, registros);
  return { ok: true };
});

// Handler: Leer registros de mermas
ipcMain.handle('datos:leerMermas', () => leerArchivoJSON(WASTE_FILE));

// Handler: Guardar registros de mermas
ipcMain.handle('datos:guardarMermas', (event, registros) => {
  escribirArchivoJSON(WASTE_FILE, registros);
  return { ok: true };
});

// Handler: Obtener modelos cargados en LM Studio
ipcMain.handle('ai:obtenerModelosLMStudio', async (event, url) => {
  try {
    const endpoint = `${url.replace(/\/$/, '')}/models`;
    console.log(`[main] Obteniendo modelos de IA local en: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    console.error('[main] Error al obtener modelos de LM Studio:', error);
    return { ok: false, error: error.message };
  }
});

// Handler: Consultar servidor local LM Studio (API de OpenAI compatible)
ipcMain.handle('ai:consultarLMStudio', async (event, { url, messages, model }) => {
  try {
    const endpoint = `${url.replace(/\/$/, '')}/chat/completions`;
    console.log(`[main] Consultando IA local en: ${endpoint} usando modelo: ${model}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'local-model',
        messages: messages,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const textError = await response.text();
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}: ${textError || response.statusText}`,
        detail: textError || response.statusText
      };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    console.error('[main] Error en llamada a LM Studio:', error);
    return { ok: false, error: error.message, detail: error.message };
  }
});

// ─────────────────────────────────────────────
// Ciclo de vida de la aplicación
// ─────────────────────────────────────────────

app.whenReady().then(() => {
  ensureDataDirectory();
  createMainWindow();

  // En macOS, recrear la ventana si se hace clic en el ícono del dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Cierra la app cuando se cierran todas las ventanas (excepto macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
