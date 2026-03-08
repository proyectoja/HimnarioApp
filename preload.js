const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const QRCode = require("qrcode");

window.addEventListener("error", (evt) => {
  try {
    ipcRenderer.send("renderer-error", {
      message: evt.message,
      stack: evt.error ? evt.error.stack : null,
    });
  } catch (e) {}
});

window.addEventListener("unhandledrejection", (evt) => {
  try {
    ipcRenderer.send("renderer-error", {
      message:
        evt.reason && evt.reason.message
          ? evt.reason.message
          : String(evt.reason),
      stack: evt.reason && evt.reason.stack ? evt.reason.stack : null,
    });
  } catch (e) {}
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
  sendToSecondary: (data) => ipcRenderer.send("enviar-a-ventana", data),
  onActualizarDatos: (callback) => ipcRenderer.on("actualizar-datos", callback),

  obtenerMonitores: () => ipcRenderer.invoke("obtener-monitores"),
  abrirVentanaSecundaria: (monitorIndex) =>
    ipcRenderer.send("abrir-ventana", monitorIndex),
  sendYoutubeResults: (data) =>
    ipcRenderer.send("youtube-results-to-remote", data),
  onVentanaCerrada: (callback) => ipcRenderer.on("ventana-cerrada", callback),
  onMonitoresActualizados: (callback) =>
    ipcRenderer.on("monitores-actualizados", callback),

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
  onDownloadProgress: (callback) => {
    ipcRenderer.on("download-progress", (_, data) => {
      if (typeof callback === "function") callback(data);
    });
  },

  rendererReady: () => ipcRenderer.send("renderer-ready"),
  appReady: () => ipcRenderer.send("app-ready"), // ← Nueva función
  onShowLogs: (callback) => ipcRenderer.on("show-logs-container", callback),
  onHideLogs: (callback) => ipcRenderer.on("hide-logs-container", callback),

  // Sistema de actualizaciones
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  downloadUpdateNow: () => ipcRenderer.send("download-update-now"),
  installUpdateNow: () => ipcRenderer.send("install-update-now"),
  onUpdateDownloadingStarted: (callback) =>
    ipcRenderer.on("update-downloading-started", callback),
  onUpdateDownloadProgress: (callback) =>
    ipcRenderer.on("update-download-progress", (_, data) => callback(data)),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on("update-downloaded", callback),
  onUpdateError: (callback) =>
    ipcRenderer.on("update-error", (_, message) => callback(message)),

  // Control remoto
  onControlRemotoIniciado: (callback) =>
    ipcRenderer.on("control-remoto-iniciado", (_, data) => callback(data)),
  obtenerEstadoControlRemoto: () =>
    ipcRenderer.invoke("obtener-estado-control-remoto"),
  onRemoteCommand: (callback) =>
    ipcRenderer.on("remote-command", (_, data) => callback(data)),
  onRemoteGetEstado: (callback) =>
    ipcRenderer.on("remote-get-estado", callback),
  resetRemoteConnection: () => ipcRenderer.invoke("reset-remote-connection"),

  // Control de volumen del sistema
  obtenerVolumen: () => ipcRenderer.invoke("obtener-volumen"),
  cambiarVolumen: (volumen) => ipcRenderer.invoke("cambiar-volumen", volumen),

  // 🔐 Sistema premium (para control remoto)
  setPremiumStatus: (data) =>
    ipcRenderer.send("set-premium-status", data),
  updateRemote: (data) => ipcRenderer.send("ppt:update-remote", data),
  getPremiumStatus: () => ipcRenderer.invoke("get-premium-status"),

  // Sistema para cargar power point
  openPowerPoint: () => ipcRenderer.invoke("ppt:open"),
  onPptProgress: (callback) =>
    ipcRenderer.on("ppt:progress", (_, data) => callback(data)),

  // Conversión progresiva de PowerPoint
  getPPTConversionStatus: () => ipcRenderer.invoke("ppt:get-conversion-status"),
  getPPTSlide: (slideIndex) => ipcRenderer.invoke("ppt:get-slide", slideIndex),
  onPPTSlideReady: (callback) =>
    ipcRenderer.on("ppt:slide-ready", (_, data) => callback(data)),
  convertRemotePPT: (filePath) =>
    ipcRenderer.invoke("ppt:convert-remote", filePath),

  // Identificador de Hardware
  getMachineId: () => ipcRenderer.invoke("get-machine-id"),

  // Generar QR
  generateQRCodeDataURL: (text) => QRCode.toDataURL(text),

  // Notificación de estado de reproducción
  updatePlaybackStatus: (status) =>
    ipcRenderer.send("update-playback-status", status),

  // 🎮 Juego en Vivo - Conexión Bíblica
  juegoIniciarServidor: () => ipcRenderer.invoke("juego-iniciar-servidor"),
  juegoDetenerServidor: () => ipcRenderer.invoke("juego-detener-servidor"),
  juegoCrearSala: (formulario) => ipcRenderer.invoke("juego-crear-sala", formulario),
  juegoIniciar: (pin) => ipcRenderer.invoke("juego-iniciar", pin),
  juegoDetener: (pin) => ipcRenderer.invoke("juego-detener", pin),
  juegoObtenerSala: (pin) => ipcRenderer.invoke("juego-obtener-sala", pin),
  onJuegoServidorListo: (callback) =>
    ipcRenderer.on("juego-servidor-listo", (_, data) => callback(data)),

  // 🖥️ Ventana de proyección del host
  abrirVentanaHostProyeccion: (monitorIndex) => 
    ipcRenderer.invoke("abrir-ventana-host-proyeccion", monitorIndex),
  cerrarVentanaHostProyeccion: () => 
    ipcRenderer.invoke("cerrar-ventana-host-proyeccion"),
  onVentanaHostProyeccionCerrada: (callback) =>
    ipcRenderer.on("ventana-host-proyeccion-cerrada", callback),
  enviarActualizacionHost: (data) => 
    ipcRenderer.send("actualizar-host-proyeccion", data),
  onActualizacionHost: (callback) =>
    ipcRenderer.on("actualizar-host-proyeccion", (_, data) => callback(data)),
});

// Obtener paths síncronamente
const paths = ipcRenderer.sendSync("get-paths-sync");
contextBridge.exposeInMainWorld("paths", paths);
