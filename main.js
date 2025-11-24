const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  ipcMain,
  screen,
  shell,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const si = require("systeminformation");
const path = require("path");
const { setMainWindow, flushBuffer, log, enviarArchivoDescargado } = require("./logHelper");
const { verificarCarpetasYReiniciarSiFaltan } = require("./verificarWrapper");
const { iniciarControlRemoto, detenerControlRemoto } = require("./controlRemoto");
let tray = null; // Bandeja del sistema
let win = null; // Ventana principal
const express = require("express");
global.mainWindow = win;

app.commandLine.appendSwitch("disable-features", "CrossOriginOpenerPolicy");
app.commandLine.appendSwitch("disable-features", "CrossOriginEmbedderPolicy");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const server = express();
server.use(express.static(path.join(__dirname, "src")));
server.use(express.static(path.join(app.getPath('userData'), 'src')));
server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});

function createWindow() {
  if (win) {
    // Si la ventana ya existe, solo la muestra
    win.maximize();
    win.show();
    return;
  }
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // ← Ocultar mientras carga
    title: `PROYECTO JA | Himnario Adventista Pro - v${app.getVersion()}`, // ← Título desde el inicio
    icon: path.join(__dirname, "src/iconos/iconoWindows.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
      webSecurity: false,
      devTools: false, // Desactiva devTools
    },
  });
  
  //win.webContents.openDevTools({ mode: 'undocked' });

  setMainWindow(win);
global.mainWindow = win; // para compatibilidad con módulos que usen global
flushBuffer();
  // Maximizar la ventana al iniciar
  win.maximize();
  win.loadURL("http://localhost:3000/index.html"); // Archivo HTML del himnario

  // Cambiar el título una vez que el contenido esté completamente cargado
  win.webContents.on("did-finish-load", () => {
    win.setTitle(
      `PROYECTO JA | Himnario Adventista Pro - v${app.getVersion()}`
    );
    win.webContents.executeJavaScript(`
      window.__APP_VERSION__ = "${app.getVersion()}";
  `);
    log("[DEBUG] Enviando logs acumulados...");
    flushBuffer(); // Enviar logs acumulados
  });

  // Manejar el evento de cerrar la ventana, sin cerrar la app
  win.on("closed", () => {
    win = null;
  });
  // Escuchar evento para abrir diálogo desde renderer
  //Prueba para subir videos localmente
  // Escuchar evento para abrir diálogo desde renderer
  //Prueba para subir videos localmente
  ipcMain.handle("abrir-dialogo-multimedia", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Multimedia",
          extensions: [
            "mp4",
            "mkv",
            "avi",
            "mov",
            "webm",
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
          ],
        },
      ],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Escuchar cuando el renderer esté listo para recibir logs
  ipcMain.on('renderer-ready', () => {
    log("[MAIN] Renderer ready, flushing buffer...");
    flushBuffer();
  });

  // ✅ Mostrar ventana solo cuando la app esté COMPLETAMENTE lista
  ipcMain.on('app-ready', () => {
    log("[MAIN] App completamente cargada, mostrando ventana...");
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });

  // ⚡ Interceptar cualquier intento de abrir nueva ventana
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("about:")) {
      // ✅ Permitir abrir ventanas about
      return { action: "allow" };
    }

    // 🔗 Abrir todo lo demás en el navegador predeterminado
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Compatibilidad con versiones antiguas (target="_blank")
  win.webContents.on("new-window", (event, url) => {
    if (url.startsWith("about:")) {
      return; // ✅ Permitir
    }

    event.preventDefault();
    shell.openExternal(url);
  });

  win.webContents.once("dom-ready", () => {
    // win.webContents.send("set-paths", {
    //   userData: app.getPath("userData"),
    //   src: path.join(app.getPath("userData"), "src"),
    // });
  });

}

// ✅ IPC Síncrono para obtener paths inmediatamente en preload
ipcMain.on('get-paths-sync', (event) => {
  event.returnValue = {
    userData: app.getPath("userData"),
    src: path.join(app.getPath("userData"), "src"),
  };
});

// Ocultar la barra de menú
Menu.setApplicationMenu(null);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//VENTANA DE LOGS
let logWindow;
/*
function crearVentanaLogs() {
  logWindow = new BrowserWindow({
    width: 800,
    height: 300,
    icon: path.join(__dirname, "src/iconos/iconoWindows.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  logWindow.loadFile(path.join(__dirname, "log.html"));
  logWindow.webContents.on("did-finish-load", () => {
    setLogWindow(logWindow);
    flushBuffer();
    log("[MAIN] log window ready and buffer flushed");
  });
}
*/

async function ejecutarVerificacion() {
  createWindow();
  try {
    // Abrir ventana de logs siempre
    //crearVentanaLogs();

    // Esperar a que la ventana de logs cargue
    //await new Promise((resolve) => {
    //logWindow.webContents.on("did-finish-load", () => resolve());
    //});

    // createWindow() ya se llamó al inicio de ejecutarVerificacion
    
    // Esperar un momento para asegurar que el renderer esté listo (opcional, pero ayuda)
    await new Promise(r => setTimeout(r, 2000));

    const reinicio = await verificarCarpetasYReiniciarSiFaltan(app);

    if (reinicio) {
      log("[MAIN] Archivos faltantes. Mostrando logs, reiniciando categorías...");

      // Esperar 3 segundos para que el usuario vea el mensaje final, luego ocultar logs
      setTimeout(() => {
        const { sendHideLogs } = require("./logHelper");
        sendHideLogs();
        log("[MAIN] Descargas completadas, ocultando logs automáticamente...");
      }, 5000);

      // Esperar a que el usuario cierre la ventana de logs
      //await new Promise((resolve) => {
      //logWindow.on("closed", () => resolve());
      //});

      // Reinicio después de que el usuario cierre logs
      //app.relaunch();
      //app.exit(0);
    } else {
      // Caso: no requiere reinicio → ventana principal + cerrar logs automáticamente
      log("[MAIN] Todo correcto, no se requieren descargas.");
      //createWindow();

      //if (logWindow && !logWindow.isDestroyed()) {
      //logWindow.close(); // cierra la ventana de logs
      //}
    }
  } catch (err) {
    log("[MAIN] Error verificarCarpetas: " + err.message);
    //createWindow(); // fallback: siempre mostrar ventana principal
  }
}

//PRUEBAS DE VENTANA DE PROYECCIÓN CON ELECTRON
let playerWindow;

// ✅ Crear ventana secundaria en un monitor
function abrirVentanaSecundaria(monitorIndex) {
  // 👇 Si es -1, cerrar ventana
  if (monitorIndex === -1) {
    if (playerWindow) {
      playerWindow.close();
      playerWindow = null;
    }
    return;
  }

  const displays = screen.getAllDisplays();
  const display = displays[monitorIndex] || displays[0];

  // Si ya existe, no crear otra, solo moverla a ese monitor
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.setBounds(display.bounds);
    playerWindow.focus();
    return playerWindow;
  }

  // Crear nueva ventana
  playerWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    icon: path.join(__dirname, "src/iconos/iconoWindows.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
      webSecurity: false,
      devTools: true, // Desactiva devTools
    },
  });

  playerWindow.loadURL("http://localhost:3000/ventanaSecundaria.html");
  playerWindow.setFullScreen(true);
  //playerWindow.webContents.openDevTools({ mode: 'undocked' });

  // 🔄 Detectar cuando el usuario cierre manualmente la ventana
  playerWindow.on("close", () => {
    if (playerWindow && !playerWindow.isDestroyed()) {
      // Avisar al renderer principal que la ventana fue cerrada
      const win = BrowserWindow.getAllWindows().find(
        (w) => w.title !== "Ventana Secundaria"
      );
      if (win) win.webContents.send("ventana-cerrada");
    }
  });

  playerWindow.on("closed", () => {
    playerWindow = null;
  });

  return playerWindow;
}

// ✅ Canal desde ventana principal → main
ipcMain.on("enviar-a-ventana", (event, data) => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.webContents.send("actualizar-datos", data);
  }
});

// ✅ Mostrar monitores
async function mostrarMonitores() {
  const displays = await si.graphics();
  return displays.displays.map((d, i) => ({
    id: i,
    nombre: d.model.replace(/[^\x20-\x7E]/g, ""),
    principal: d.main,
  }));
}

// IPC
ipcMain.handle("obtener-monitores", async () => {
  return await mostrarMonitores();
});

ipcMain.on("abrir-ventana", (event, monitorIndex) => {
  abrirVentanaSecundaria(monitorIndex);
});

// Control remoto - obtener estado actual
ipcMain.handle("obtener-estado-control-remoto", async () => {
  if (global.controlRemotoEstado && global.controlRemotoEstado.activo) {
    console.log('📡 Solicitando estado del control remoto:', global.controlRemotoEstado);
    return global.controlRemotoEstado;
  }
  console.log('⚠️ Control remoto no está activo aún');
  return null;
});

// Control de volumen del sistema
ipcMain.handle("obtener-volumen", async () => {
  try {
    const loudness = require('loudness');
    const volumen = await loudness.getVolume();
    return volumen;
  } catch (error) {
    console.error('Error al obtener volumen:', error);
    return 100;
  }
});

ipcMain.handle("cambiar-volumen", async (event, volumen) => {
  try {
    const loudness = require('loudness');
    
    if (volumen === 0) {
      // Silenciar el sistema
      await loudness.setMuted(true);
      console.log(`🔇 Sistema silenciado`);
    } else {
      // Dessilenciar si estaba muted
      const isMuted = await loudness.getMuted();
      if (isMuted) {
        await loudness.setMuted(false);
      }
      // Cambiar volumen
      await loudness.setVolume(volumen);
      console.log(`🔊 Volumen del sistema cambiado a: ${volumen}%`);
    }
    
    return true;
  } catch (error) {
    console.error('Error al cambiar volumen:', error);
    return false;
  }
});

//ACTUALIZACIONES DE LA APP - SISTEMA MEJORADO
const fs = require('fs');
const updateStatusPath = path.join(app.getPath('userData'), 'update-status.json');

// Estado de la actualización
let updateDownloaded = false;
let updateAvailable = false;

// Función para guardar estado de actualización pospuesta
function saveUpdateStatus(status) {
  try {
    fs.writeFileSync(updateStatusPath, JSON.stringify(status));
  } catch (err) {
    log('[UPDATE] Error al guardar estado: ' + err.message);
  }
}

// Función para leer estado de actualización
function readUpdateStatus() {
  try {
    if (fs.existsSync(updateStatusPath)) {
      return JSON.parse(fs.readFileSync(updateStatusPath, 'utf8'));
    }
  } catch (err) {
    log('[UPDATE] Error al leer estado: ' + err.message);
  }
  return null;
}

// Configurar autoUpdater para descargar automáticamente
autoUpdater.autoDownload = false; // Lo haremos manual para dar control al usuario
autoUpdater.autoInstallOnAppQuit = true; // Instalar al cerrar si ya se descargó

// Cuando se detecta una actualización disponible
autoUpdater.on("update-available", (info) => {
  updateAvailable = true;
  log(`[UPDATE] Actualización disponible: v${info.version}`);
  
  // Preguntar al usuario qué quiere hacer
  dialog.showMessageBox(win, {
    type: "info",
    title: "Actualización Disponible",
    message: `Himnario Adventista PRO v${info.version} está disponible`,
    detail: `Versión actual: v${app.getVersion()}\nNueva versión: v${info.version}\n\n¿Desea descargar la actualización ahora?\n\nLa descarga se realizará en segundo plano y no interrumpirá su trabajo.`,
    buttons: ["Descargar Ahora", "Más Tarde"],
    defaultId: 0,
    cancelId: 1
  }).then((response) => {
    if (response.response === 0) {
      // Usuario eligió descargar ahora
      log('[UPDATE] Usuario eligió descargar ahora');
      autoUpdater.downloadUpdate();
      
      // Notificar al usuario que la descarga comenzó
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-downloading-started');
      }
    } else {
      // Usuario pospuso la actualización
      log('[UPDATE] Usuario pospuso la actualización');
      saveUpdateStatus({
        postponed: true,
        version: info.version,
        date: Date.now()
      });
    }
  });
});

// Cuando no hay actualizaciones disponibles
autoUpdater.on("update-not-available", () => {
  log('[UPDATE] No hay actualizaciones disponibles');
  updateAvailable = false;
  // Limpiar el estado de actualización pospuesta si existe
  if (fs.existsSync(updateStatusPath)) {
    fs.unlinkSync(updateStatusPath);
  }
});

// Progreso de descarga
autoUpdater.on("download-progress", (progressObj) => {
  const logMessage = `Descarga en progreso: ${Math.round(progressObj.percent)}% - ${(progressObj.transferred / 1048576).toFixed(2)}MB de ${(progressObj.total / 1048576).toFixed(2)}MB`;
  log(`[UPDATE] ${logMessage}`);
  
  // Enviar progreso al renderer
  if (win && !win.isDestroyed()) {
    win.webContents.send('update-download-progress', {
      percent: Math.round(progressObj.percent),
      transferred: (progressObj.transferred / 1048576).toFixed(2),
      total: (progressObj.total / 1048576).toFixed(2),
      speed: (progressObj.bytesPerSecond / 1048576).toFixed(2)
    });
  }
});

// Cuando la descarga se completa
autoUpdater.on("update-downloaded", (info) => {
  updateDownloaded = true;
  log(`[UPDATE] Actualización v${info.version} descargada completamente`);
  
  // Limpiar estado de pospuesta ya que ahora está descargada
  if (fs.existsSync(updateStatusPath)) {
    fs.unlinkSync(updateStatusPath);
  }
  
  // Notificar al renderer que la descarga terminó
  if (win && !win.isDestroyed()) {
    win.webContents.send('update-downloaded');
  }
  
  // Preguntar al usuario si quiere reiniciar ahora
  dialog.showMessageBox(win, {
    type: "info",
    title: "Actualización Lista para Instalar",
    message: `Himnario Adventista PRO v${info.version} está listo para instalarse`,
    detail: "La actualización se ha descargado correctamente.\n\n¿Desea reiniciar la aplicación ahora para completar la instalación?\n\nSi elige 'Más Tarde', la actualización se instalará la próxima vez que cierre la aplicación.",
    buttons: ["Reiniciar Ahora", "Más Tarde"],
    defaultId: 0,
    cancelId: 1
  }).then((response) => {
    if (response.response === 0) {
      // Usuario quiere reiniciar ahora
      log('[UPDATE] Usuario eligió reiniciar ahora');
      autoUpdater.quitAndInstall(false, true);
    } else {
      // Usuario pospuso el reinicio pero la actualización se instalará al cerrar
      log('[UPDATE] Usuario pospuso el reinicio - se instalará al cerrar');
    }
  });
});

// Manejo de errores
autoUpdater.on("error", (err) => {
  log('[UPDATE] Error en autoUpdater: ' + err.message);
  updateAvailable = false;
  updateDownloaded = false;
  
  // Notificar al renderer para ocultar el widget
  if (win && !win.isDestroyed()) {
    win.webContents.send('update-error', err.message);
    
    dialog.showMessageBox(win, {
      type: "error",
      title: "Error de Actualización",
      message: "Ocurrió un error al intentar actualizar la aplicación",
      detail: err.message,
      buttons: ["OK"]
    });
  }
});

// Función para verificar actualizaciones manualmente (puede ser llamada desde el renderer)
ipcMain.on('check-for-updates', () => {
  log('[UPDATE] Verificación manual de actualizaciones solicitada');
  autoUpdater.checkForUpdates();
});

// Función para descargar actualización cuando el usuario lo decida después
ipcMain.on('download-update-now', () => {
  if (updateAvailable && !updateDownloaded) {
    log('[UPDATE] Descarga manual iniciada por el usuario');
    autoUpdater.downloadUpdate();
  }
});

// Función para instalar actualización cuando esté descargada
ipcMain.on('install-update-now', () => {
  if (updateDownloaded) {
    log('[UPDATE] Instalación manual iniciada por el usuario');
    autoUpdater.quitAndInstall(false, true);
  }
});

app.whenReady().then(() => {
  // Revisar actualizaciones con el sistema mejorado
  autoUpdater.checkForUpdates();
  ejecutarVerificacion(); // ✅ ahora con lógica de reinicio/cierre de logs
  console.log("Monitores disponibles:");
  mostrarMonitores();
  
  // 📱 Iniciar control remoto después de crear la ventana
  setTimeout(() => {
    if (win && !win.isDestroyed()) {
      iniciarControlRemoto(win);
    }
  }, 2000);
  
  // 📡 Detectar cuando se agrega un monitor
  screen.on("display-added", (event, newDisplay) => {
    console.log("🟢 Monitor agregado:", newDisplay.model);
    // Avisar al renderer para que actualice la lista
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("monitores-actualizados");
    });
  });

  // 📡 Detectar cuando se quita un monitor
  screen.on("display-removed", (event, oldDisplay) => {
    console.log("🔴 Monitor eliminado:", oldDisplay.model);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("monitores-actualizados");
    });
  });
});

ipcMain.on('renderer-error', (evt, err) => {
  console.error('Renderer error capturado:', err);
});

app.on("window-all-closed", () => {
  detenerControlRemoto(); // Detener el servidor de control remoto
  app.quit();
});

//npm run release -> comando importante para actualizaciones.

/**
 * Comprobar dependencias desactualizadas
 * npm outdated
# Comando completo para actualizar todo
npm install electron@latest electron-builder@latest electron-updater@latest --save-dev
npm install express@latest axios@latest fs-extra@latest adm-zip@latest electron-log@latest systeminformation@latest node-fetch@latest --save
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Verificar que todo esté correcto
npm list --depth=0

# Probar que la aplicación funcione
npm start

!IMPORTANTE: electron-updater si está en devDependencies moverlo a Dependencies siempre que se actualiza para que no de errores en el empaquetado.

 */
