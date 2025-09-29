// logHelper.js
let logWindow = null;
let buffer = [];

/**
 * Registrar la ventana (main.js llama esto cuando la ventana de logs carga)
 */
function setLogWindow(win) {
  logWindow = win;
}

/**
 * Log público para usar desde cualquier módulo (downloader, main, etc.)
 * Siempre escribe en la consola y además intenta enviar al renderer.
 * Si la ventana no está lista, guarda en buffer.
 */
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} ${String(msg)}`;
  // console del proceso principal (si corres electron verás esto en la terminal)
  console.log(line);

  try {
    if (logWindow &&
        logWindow.webContents &&
        !logWindow.isDestroyed() &&
        !logWindow.webContents.isLoadingMainFrame()) {
      logWindow.webContents.send("log-message", line);
    } else {
      buffer.push(line);
    }
  } catch (err) {
    // si algo va mal al enviar, guardamos igualmente
    buffer.push(line);
  }
}

/**
 * Enviar todos los mensajes pendientes cuando la ventana esté lista
 */
function flushBuffer() {
  if (!logWindow) return;
  try {
    buffer.forEach(m => {
      if (!logWindow.isDestroyed()) logWindow.webContents.send("log-message", m);
    });
  } catch (err) {
    // ignore
  }
  buffer = [];
}

module.exports = { log, setLogWindow, flushBuffer };
