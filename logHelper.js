const { BrowserWindow } = require("electron");

let mainWindow = null;
let buffer = [];
let isLogVisible = false; // Estado de visibilidad

/**
 * Registrar la ventana principal (main.js llamará esto cuando se cree la ventana)
 */
function setMainWindow(win) {
  mainWindow = win;
}

/**
 * Log público para usar desde cualquier módulo (downloader, main, etc.)
 * Siempre escribe en la consola y además intenta enviar al renderer.
 * Si la ventana no está lista, guarda en buffer.
 */
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${String(msg)}`;
  console.log(line);

  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("log-message", line);
    } else {
      buffer.push(line);
    }
  } catch (err) {
    buffer.push(line);
  }
}

function enviarArchivoDescargado(payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("archivo-descargado", payload);
    }
  } catch (err) {
    // Silently ignore if window is being destroyed
  }
}

function enviarProgresoDescarga(payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("download-progress", payload);
    }
  } catch (err) {
    // Silently ignore
  }
}

function sendShowLogs() {
  isLogVisible = true;
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("show-logs-container");
    }
  } catch (err) {}
}

function sendHideLogs() {
  isLogVisible = false;
  try {
    if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("hide-logs-container");
    }
  } catch (err) {
    console.error("Error enviando hide-logs-container:", err);
  }
}

/**
 * Enviar todos los mensajes pendientes cuando la ventana esté lista
 * Y sincronizar el estado de visibilidad
 */
function flushBuffer() {
  if (!mainWindow) return;
  try {
    // Sincronizar visibilidad
    if (isLogVisible) {
      mainWindow.webContents.send("show-logs-container");
    } else {
      mainWindow.webContents.send("hide-logs-container");
    }

    // Enviar logs
    buffer.forEach((m) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send("log-message", m);
      }
    });
  } catch (err) {
    // ignorar
  }
  buffer = [];
}

module.exports = {
  log,
  setMainWindow,
  flushBuffer,
  enviarArchivoDescargado,
  sendShowLogs,
  sendHideLogs,
  enviarProgresoDescarga,
};
