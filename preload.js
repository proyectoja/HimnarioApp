const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");

window.addEventListener('error', (evt) => {
  try { ipcRenderer.send('renderer-error', { message: evt.message, stack: evt.error ? evt.error.stack : null }); } catch(e) {}
});

window.addEventListener('unhandledrejection', (evt) => {
  try { ipcRenderer.send('renderer-error', { message: evt.reason && evt.reason.message ? evt.reason.message : String(evt.reason), stack: evt.reason && evt.reason.stack ? evt.reason.stack : null }); } catch(e) {}
});

contextBridge.exposeInMainWorld("electronAPI", {
  abrirDialogoMultimedia: () => ipcRenderer.invoke("abrir-dialogo-multimedia"),

  leerArchivo: (ruta) =>
    new Promise((resolve, reject) => {
      fs.readFile(ruta, (err, data) => {
        if (err) reject(err);
        else resolve(data.toString("base64"));
      });
    }),

  onLog: (callback) => {
    ipcRenderer.on("log-message", (evt, msg) => callback(msg));
  },

  enviarDatos: (data) => ipcRenderer.send("enviar-a-ventana", data),
  onActualizarDatos: (callback) => ipcRenderer.on("actualizar-datos", callback),

  obtenerMonitores: () => ipcRenderer.invoke("obtener-monitores"),
  abrirVentanaSecundaria: (monitorIndex) => ipcRenderer.send("abrir-ventana", monitorIndex),
  onVentanaCerrada: (callback) => ipcRenderer.on("ventana-cerrada", callback),
  onMonitoresActualizados: (callback) => ipcRenderer.on("monitores-actualizados", callback),

  onArchivoDescargado: (callback) => {
    ipcRenderer.on("archivo-descargado", (_, data) => {
      try {
        // si el callback aún no está listo, ignoramos
        if (typeof callback === "function") {
          callback(data);
        }
      } catch (err) {
        console.error("Error en onArchivoDescargado:", err);
      }
    });
  },
  
  rendererReady: () => ipcRenderer.send('renderer-ready'),
  appReady: () => ipcRenderer.send('app-ready'), // ← Nueva función
  onShowLogs: (callback) => ipcRenderer.on("show-logs-container", callback),
  onHideLogs: (callback) => ipcRenderer.on("hide-logs-container", callback),

  // Sistema de actualizaciones
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdateNow: () => ipcRenderer.send('download-update-now'),
  installUpdateNow: () => ipcRenderer.send('install-update-now'),
  onUpdateDownloadingStarted: (callback) => ipcRenderer.on('update-downloading-started', callback),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_, message) => callback(message)),
  
  // Control remoto
  onControlRemotoIniciado: (callback) => ipcRenderer.on('control-remoto-iniciado', (_, data) => callback(data)),
  obtenerEstadoControlRemoto: () => ipcRenderer.invoke('obtener-estado-control-remoto'),
  onRemoteCommand: (callback) => ipcRenderer.on('remote-command', (_, data) => callback(data)),
  onRemoteGetEstado: (callback) => ipcRenderer.on('remote-get-estado', callback),
  
  // Control de volumen del sistema
  obtenerVolumen: () => ipcRenderer.invoke('obtener-volumen'),
  cambiarVolumen: (volumen) => ipcRenderer.invoke('cambiar-volumen', volumen),
});

// Obtener paths síncronamente
const paths = ipcRenderer.sendSync('get-paths-sync');
contextBridge.exposeInMainWorld("paths", paths);
