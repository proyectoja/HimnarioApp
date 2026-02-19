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
const fs = require("fs");
const os = require("os");
// --------------------------------------------------------------------------------

const {
  setMainWindow,
  flushBuffer,
  log,
  enviarArchivoDescargado,
} = require("./logHelper");
const { verificarCarpetasYReiniciarSiFaltan } = require("./verificarWrapper");
const {
  iniciarControlRemoto,
  detenerControlRemoto,
} = require("./controlRemoto");
let tray = null; // Bandeja del sistema
let win = null; // Ventana principal
const express = require("express");
global.mainWindow = win;

app.commandLine.appendSwitch("disable-features", "CrossOriginOpenerPolicy");
app.commandLine.appendSwitch("disable-features", "CrossOriginEmbedderPolicy");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const server = express();
server.use(express.static(path.join(__dirname, "src")));
server.use(express.static(path.join(app.getPath("userData"), "src")));

// Servir archivos temporales de PowerPoint
console.log("[EXPRESS] Sirviendo archivos temporales desde:", os.tmpdir());
server.use("/ppt-temp", express.static(os.tmpdir()));

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

  //win.webContents.openDevTools({ mode: "undocked" });

  setMainWindow(win);
  global.mainWindow = win; // para compatibilidad con módulos que usen global
  flushBuffer();
  // Maximizar la ventana al iniciar
  win.maximize();
  win.loadURL("http://localhost:3000/index.html"); // Archivo HTML del himnario

  // Cambiar el título una vez que el contenido esté completamente cargado
  win.webContents.on("did-finish-load", () => {
    win.setTitle(
      `PROYECTO JA | Himnario Adventista Pro - v${app.getVersion()}`,
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
  ipcMain.on("renderer-ready", () => {
    log("[MAIN] Renderer ready, flushing buffer...");
    flushBuffer();
  });

  // ✅ Mostrar ventana solo cuando la app esté COMPLETAMENTE lista
  ipcMain.on("app-ready", () => {
    log("[MAIN] App completamente cargada, mostrando ventana...");
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();

      // 🚀 AHORA SÍ: Revisar actualizaciones una vez que todo cargó
      // Esperamos un pequeño momento para asegurar que la UI ya se pintó
      setTimeout(() => {
        log("[MAIN] Iniciando búsqueda de actualizaciones...");
        autoUpdater.checkForUpdates();
      }, 2000);
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
ipcMain.on("get-paths-sync", (event) => {
  event.returnValue = {
    userData: app.getPath("userData"),
    src: path.join(app.getPath("userData"), "src"),
  };
});

// 🔐 Variable para almacenar el estado premium del usuario
let esPremiumGlobal = false;

// 🔐 IPC para recibir el estado premium desde el renderer
ipcMain.on("set-premium-status", (event, esPremium) => {
  console.log(`[PREMIUM] Estado premium actualizado: ${esPremium}`);
  esPremiumGlobal = esPremium;

  // Control remoto solo para usuarios premium
  if (esPremium && win && !win.isDestroyed()) {
    // Si es premium y el control remoto no está activo, iniciarlo
    if (!global.controlRemotoEstado || !global.controlRemotoEstado.activo) {
      console.log("[CONTROL REMOTO] Iniciando para usuario premium...");
      iniciarControlRemoto(win);
    }
  } else {
    // Si no es premium y el control remoto está activo, detenerlo
    if (global.controlRemotoEstado && global.controlRemotoEstado.activo) {
      console.log("[CONTROL REMOTO] Deteniendo - usuario no premium");
      detenerControlRemoto();
    }
  }
});

// 🔐 IPC para verificar estado premium desde el renderer
ipcMain.handle("get-premium-status", () => {
  return esPremiumGlobal;
});

// 📊 IPC para verificar qué aplicaciones están disponibles
// 📊 IPC para verificar qué aplicaciones están disponibles
ipcMain.handle("check-ppt-apps-available", async () => {
  try {
    const apps = checkAvailableApps();
    console.log("[PPT] Aplicaciones disponibles:", apps);
    return apps;
  } catch (err) {
    console.log("[PPT] Error verificando aplicaciones:", err.message);
    return {
      powerpoint: { available: false, error: err.message },
      libreoffice: { available: false, error: err.message },
    };
  }
});

// 🖥️ IPC para obtener ID único de Hardware (Machine ID)
ipcMain.handle("get-machine-id", async () => {
  try {
    const uuid = await si.uuid();
    // Usamos el serial del sistema o el UUID del OS como identificador único
    // Preferimos 'os' si está disponible, sino 'hardware'
    const id = uuid.os || uuid.hardware || "unknown-machine-id";
    console.log("[MACHINE-ID] Identificador de hardware:", id);
    return id; // Retornamos el ID puro (el frontend lo puede codificar si lo desea)
  } catch (err) {
    console.error("[MACHINE-ID] Error obteniendo ID:", err);
    return "error-generating-id";
  }
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
    // Esperar a que la app esté lista antes de crear ventana
    app.whenReady().then(() => createWindow());
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
    await new Promise((r) => setTimeout(r, 2000));

    const reinicio = await verificarCarpetasYReiniciarSiFaltan(app);

    if (reinicio) {
      log(
        "[MAIN] Archivos faltantes. Mostrando logs, reiniciando categorías...",
      );

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
        (w) => w.title !== "Ventana Secundaria",
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

// ✅ Canal para enviar resultados de YouTube al control remoto
ipcMain.on("youtube-results-to-remote", (event, data) => {
  if (global.enviarEventoControlRemoto) {
    global.enviarEventoControlRemoto("youtube-results", data);
  }
});

// ✅ Mostrar monitores
async function mostrarMonitores() {
  const displays = await si.graphics();
  return displays.displays
    .map((d, i) => ({
      id: i,
      nombre: d.model.replace(/[^\x20-\x7E]/g, ""),
      principal: d.main,
    }))
    .filter((d) => !d.principal);
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
    console.log(
      "📡 Solicitando estado del control remoto:",
      global.controlRemotoEstado,
    );
    return global.controlRemotoEstado;
  }
  console.log("⚠️ Control remoto no está activo aún");
  return null;
});

// Control de volumen del sistema
ipcMain.handle("obtener-volumen", async () => {
  try {
    const loudness = require("loudness");
    const volumen = await loudness.getVolume();
    return volumen;
  } catch (error) {
    console.error("Error al obtener volumen:", error);
    return 100;
  }
});

ipcMain.handle("cambiar-volumen", async (event, volumen) => {
  try {
    const loudness = require("loudness");

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
    console.error("Error al cambiar volumen:", error);
    return false;
  }
});

// ✅ Canal para actualizar el estado del control remoto (desde renderer)
ipcMain.on("ppt:update-remote", (event, data) => {
  if (global.enviarEventoControlRemoto) {
    global.enviarEventoControlRemoto("ppt-status", data);
  }
});

//ACTUALIZACIONES DE LA APP - SISTEMA MEJORADO
const updateStatusPath = path.join(
  app.getPath("userData"),
  "update-status.json",
);

// Estado de la actualización
let updateDownloaded = false;
let updateAvailable = false;

// Función para guardar estado de actualización pospuesta
function saveUpdateStatus(status) {
  try {
    fs.writeFileSync(updateStatusPath, JSON.stringify(status));
  } catch (err) {
    log("[UPDATE] Error al guardar estado: " + err.message);
  }
}

// Función para leer estado de actualización
function readUpdateStatus() {
  try {
    if (fs.existsSync(updateStatusPath)) {
      return JSON.parse(fs.readFileSync(updateStatusPath, "utf8"));
    }
  } catch (err) {
    log("[UPDATE] Error al leer estado: " + err.message);
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
  dialog
    .showMessageBox(win, {
      type: "info",
      title: "Actualización Disponible",
      message: `Himnario Adventista PRO v${info.version} está disponible`,
      detail: `Versión actual: v${app.getVersion()}\nNueva versión: v${
        info.version
      }\n\n¿Desea descargar la actualización ahora?\n\nLa descarga se realizará en segundo plano y no interrumpirá su trabajo.`,
      buttons: ["Descargar Ahora", "Más Tarde"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((response) => {
      if (response.response === 0) {
        // Usuario eligió descargar ahora
        log("[UPDATE] Usuario eligió descargar ahora");
        autoUpdater.downloadUpdate();

        // Notificar al usuario que la descarga comenzó
        if (win && !win.isDestroyed()) {
          win.webContents.send("update-downloading-started");
        }
      } else {
        // Usuario pospuso la actualización
        log("[UPDATE] Usuario pospuso la actualización");
        saveUpdateStatus({
          postponed: true,
          version: info.version,
          date: Date.now(),
        });
      }
    });
});

// Cuando no hay actualizaciones disponibles
autoUpdater.on("update-not-available", () => {
  log("[UPDATE] No hay actualizaciones disponibles");
  updateAvailable = false;
  // Limpiar el estado de actualización pospuesta si existe
  if (fs.existsSync(updateStatusPath)) {
    fs.unlinkSync(updateStatusPath);
  }
});

// Progreso de descarga
autoUpdater.on("download-progress", (progressObj) => {
  const logMessage = `Descarga en progreso: ${Math.round(
    progressObj.percent,
  )}% - ${(progressObj.transferred / 1048576).toFixed(2)}MB de ${(
    progressObj.total / 1048576
  ).toFixed(2)}MB`;
  log(`[UPDATE] ${logMessage}`);

  // Enviar progreso al renderer
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-download-progress", {
      percent: Math.round(progressObj.percent),
      transferred: (progressObj.transferred / 1048576).toFixed(2),
      total: (progressObj.total / 1048576).toFixed(2),
      speed: (progressObj.bytesPerSecond / 1048576).toFixed(2),
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
    win.webContents.send("update-downloaded");
  }

  // Preguntar al usuario si quiere reiniciar ahora
  dialog
    .showMessageBox(win, {
      type: "info",
      title: "Actualización Lista para Instalar",
      message: `Himnario Adventista PRO v${info.version} está listo para instalarse`,
      detail:
        "La actualización se ha descargado correctamente.\n\n¿Desea reiniciar la aplicación ahora para completar la instalación?\n\nSi elige 'Más Tarde', la actualización se instalará la próxima vez que cierre la aplicación.",
      buttons: ["Reiniciar Ahora", "Más Tarde"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((response) => {
      if (response.response === 0) {
        // Usuario quiere reiniciar ahora
        log("[UPDATE] Usuario eligió reiniciar ahora");
        autoUpdater.quitAndInstall(false, true);
      } else {
        // Usuario pospuso el reinicio pero la actualización se instalará al cerrar
        log("[UPDATE] Usuario pospuso el reinicio - se instalará al cerrar");
      }
    });
});

// Manejo de errores
autoUpdater.on("error", (err) => {
  log("[UPDATE] Error en autoUpdater: " + err.message);
  updateAvailable = false;
  updateDownloaded = false;

  // Notificar al renderer para ocultar el widget
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-error", err.message);

    dialog.showMessageBox(win, {
      type: "error",
      title: "Error de Actualización",
      message: "Ocurrió un error al intentar actualizar la aplicación",
      detail: err.message,
      buttons: ["OK"],
    });
  }
});

// Función para verificar actualizaciones manualmente (puede ser llamada desde el renderer)
ipcMain.on("check-for-updates", () => {
  log("[UPDATE] Verificación manual de actualizaciones solicitada");
  autoUpdater.checkForUpdates();
});

// Función para descargar actualización cuando el usuario lo decida después
ipcMain.on("download-update-now", () => {
  if (updateAvailable && !updateDownloaded) {
    log("[UPDATE] Descarga manual iniciada por el usuario");
    autoUpdater.downloadUpdate();
  }
});

// Función para instalar actualización cuando esté descargada
ipcMain.on("install-update-now", () => {
  if (updateDownloaded) {
    log("[UPDATE] Instalación manual iniciada por el usuario");
    autoUpdater.quitAndInstall(false, true);
  }
});

app.whenReady().then(() => {
  // Revisar actualizaciones con el sistema mejorado
  // SE MOVIÓ A "app-ready" para evitar errores al inicio
  // autoUpdater.checkForUpdates();

  ejecutarVerificacion(); // ✅ ahora con lógica de reinicio/cierre de logs
  console.log("Monitores disponibles:");
  mostrarMonitores();

  // 📱 Nota: El control remoto se iniciará solo cuando el renderer confirme que el usuario es premium
  // Ver el IPC handler 'set-premium-status' más abajo

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

ipcMain.on("renderer-error", (evt, err) => {
  console.error("Renderer error capturado:", err);
});

app.on("window-all-closed", () => {
  detenerControlRemoto(); // Detener el servidor de control remoto
  app.quit();
});

//Abrir archivo real de power point
const { execFile } = require("child_process");
const pdf = require("pdf-poppler");

/* -------------------------------------------------
   DETECTAR SI POWERPOINT ESTÁ INSTALADO
------------------------------------------------- */
function getPowerPointPath() {
  console.log("[PPT] Buscando Microsoft PowerPoint...");

  // Lista de posibles rutas donde podría estar PowerPoint
  const possiblePaths = [];

  // 1. Office 365 / Office 2019/2021 (64-bit)
  possiblePaths.push(
    path.join(
      "C:",
      "Program Files",
      "Microsoft Office",
      "root",
      "Office16",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files",
      "Microsoft Office",
      "Office16",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files",
      "Microsoft Office 15",
      "root",
      "office15",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files",
      "Microsoft Office",
      "Office15",
      "POWERPNT.EXE",
    ),
  );

  // 2. Office 2013/2016 (32-bit)
  possiblePaths.push(
    path.join(
      "C:",
      "Program Files (x86)",
      "Microsoft Office",
      "root",
      "Office16",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files (x86)",
      "Microsoft Office",
      "Office16",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files (x86)",
      "Microsoft Office",
      "root",
      "Office15",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files (x86)",
      "Microsoft Office",
      "Office15",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files (x86)",
      "Microsoft Office",
      "Office14",
      "POWERPNT.EXE",
    ),
    path.join(
      "C:",
      "Program Files (x86)",
      "Microsoft Office",
      "Office12",
      "POWERPNT.EXE",
    ),
  );

  // 3. Buscar en PATH del sistema
  const systemPath = process.env.PATH || "";
  const pathDirs = systemPath.split(path.delimiter);
  for (const dir of pathDirs) {
    if (dir.toLowerCase().includes("office")) {
      possiblePaths.push(path.join(dir, "POWERPNT.EXE"));
    }
  }

  // 4. Buscar en AppData (instalaciones Click-to-Run)
  const localAppData = process.env.LOCALAPPDATA || "";
  if (localAppData) {
    possiblePaths.push(
      path.join(localAppData, "Microsoft", "Office", "POWERPNT.EXE"),
    );
  }

  console.log(
    "[PPT] Buscando PowerPoint en",
    possiblePaths.length,
    "posibles rutas...",
  );

  for (const possiblePath of possiblePaths) {
    try {
      if (fs.existsSync(possiblePath)) {
        console.log("[PPT] PowerPoint encontrado en:", possiblePath);
        const stats = fs.statSync(possiblePath);
        if (stats.isFile() && stats.size > 1000000) {
          // Al menos 1MB
          console.log("[PPT] PowerPoint encontrado y parece válido");
          return possiblePath;
        }
      }
    } catch (err) {
      // Ignorar errores de acceso
    }
  }

  console.log("[PPT] PowerPoint no encontrado");
  return null;
}

/* -------------------------------------------------
   DETECTAR SI LIBREOFFICE ESTÁ INSTALADO
------------------------------------------------- */
function getSofficePath() {
  console.log("[PPT] Buscando LibreOffice...");

  // Lista de posibles rutas donde podría estar LibreOffice
  const possiblePaths = [];

  // 1. Rutas comunes de instalación
  possiblePaths.push(
    path.join("C:", "Program Files", "LibreOffice", "program", "soffice.exe"),
    path.join(
      "C:",
      "Program Files (x86)",
      "LibreOffice",
      "program",
      "soffice.exe",
    ),
    path.join(
      process.env.PROGRAMFILES || "C:\\Program Files",
      "LibreOffice",
      "program",
      "soffice.exe",
    ),
    path.join(
      process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
      "LibreOffice",
      "program",
      "soffice.exe",
    ),
  );

  // 2. Buscar en PATH del sistema
  const systemPath = process.env.PATH || "";
  const pathDirs = systemPath.split(path.delimiter);
  for (const dir of pathDirs) {
    if (dir.toLowerCase().includes("libreoffice")) {
      possiblePaths.push(path.join(dir, "soffice.exe"));
    }
  }

  // 3. Buscar en AppData/Local (instalaciones portables)
  const localAppData = process.env.LOCALAPPDATA || "";
  if (localAppData) {
    possiblePaths.push(
      path.join(
        localAppData,
        "Programs",
        "LibreOffice",
        "program",
        "soffice.exe",
      ),
    );
  }

  // 4. Buscar en todas las unidades
  for (let drive = 67; drive <= 90; drive++) {
    // C: a Z:
    const driveLetter = String.fromCharCode(drive);
    possiblePaths.push(
      path.join(driveLetter + ":", "LibreOffice", "program", "soffice.exe"),
    );
  }

  // 5. Desarrollo y embebido (última opción)
  possiblePaths.push(
    path.join(__dirname, "assets", "libreoffice", "program", "soffice.exe"),
    path.join(process.resourcesPath, "libreoffice", "program", "soffice.exe"),
  );

  console.log("[PPT] Buscando en", possiblePaths.length, "posibles rutas...");

  for (const possiblePath of possiblePaths) {
    try {
      if (fs.existsSync(possiblePath)) {
        console.log("[PPT] LibreOffice encontrado en:", possiblePath);

        // Verificar que realmente sea ejecutable
        const stats = fs.statSync(possiblePath);
        if (stats.isFile() && stats.size > 100000) {
          // Al menos 100KB
          console.log("[PPT] LibreOffice encontrado y parece válido");
          return possiblePath;
        } else {
          console.log(
            "[PPT] Archivo encontrado pero no parece válido (tamaño:",
            stats.size,
            "bytes)",
          );
        }
      }
    } catch (err) {
      // Ignorar errores de acceso
    }
  }

  console.log("[PPT] LibreOffice no encontrado");
  return null;
}

/* -------------------------------------------------
   VERIFICAR DISPONIBILIDAD DE APLICACIONES
------------------------------------------------- */
function checkAvailableApps() {
  const powerpointPath = getPowerPointPath();
  const libreofficePath = getSofficePath();

  return {
    powerpoint: powerpointPath
      ? { available: true, path: powerpointPath }
      : { available: false, error: "PowerPoint no encontrado" },
    libreoffice: libreofficePath
      ? { available: true, path: libreofficePath }
      : { available: false, error: "LibreOffice no encontrado" },
  };
}

/* -------------------------------------------------
   CONVERTIR PPT A IMÁGENES USANDO MICROSOFT POWERPOINT
   Método: PowerPoint → Exportar cada diapositiva como PNG
------------------------------------------------- */
async function convertPPTWithPowerPoint(pptPath, imagesDir) {
  return new Promise((resolve, reject) => {
    const powerpointPath = getPowerPointPath();
    if (!powerpointPath) {
      return reject(new Error("PowerPoint no está disponible"));
    }

    console.log("[PPT] Usando Microsoft PowerPoint en:", powerpointPath);
    console.log("[PPT] Archivo PPT:", pptPath);
    console.log("[PPT] Directorio salida imágenes:", imagesDir);

    // Asegurar que el directorio de salida existe
    fs.mkdirSync(imagesDir, { recursive: true });

    // Crear un script VBS para automatizar PowerPoint
    // Usar un nombre de archivo temporal sin caracteres especiales
    const tempPptDir = path.join(os.tmpdir(), "ppt_temp");
    fs.mkdirSync(tempPptDir, { recursive: true });

    // Crear una copia del archivo con nombre seguro (sin caracteres especiales)
    const safeFileName = `ppt_${Date.now()}${path.extname(pptPath)}`;
    const safePptPath = path.join(tempPptDir, safeFileName);
    fs.copyFileSync(pptPath, safePptPath);

    console.log("[PPT] Archivo original:", pptPath);
    console.log("[PPT] Archivo seguro (copia):", safePptPath);

    const vbsScript = `
Option Explicit

Dim objPPT, objPresentation, objSlides, objSlide
Dim i, exportPath, baseName, fso

' Crear objeto FileSystemObject para manejo de archivos
Set fso = CreateObject("Scripting.FileSystemObject")

' Iniciar PowerPoint
Set objPPT = CreateObject("PowerPoint.Application")
objPPT.Visible = True  ' Debe ser visible, no se puede ocultar
objPPT.DisplayAlerts = False  ' Desactivar alertas

On Error Resume Next

' Abrir la presentación
Dim pptFullPath
pptFullPath = "${safePptPath.replace(/\\/g, "\\\\")}"

Set objPresentation = objPPT.Presentations.Open(pptFullPath, True, False, False)

If Err.Number <> 0 Then
    WScript.Echo "ERROR_OPEN:" & Err.Description
    objPPT.Quit
    Set objPPT = Nothing
    Set fso = Nothing
    WScript.Quit 1
End If

On Error GoTo 0

' Obtener información básica
WScript.Echo "TOTAL_SLIDES:" & objPresentation.Slides.Count

' Exportar cada diapositiva como PNG
exportPath = "${imagesDir.replace(/\\/g, "\\\\")}"

For i = 1 To objPresentation.Slides.Count
    Set objSlide = objPresentation.Slides(i)
    
    ' Nombre del archivo: slide_XX.png (sin el nombre original para evitar problemas)
    Dim fileName
    fileName = exportPath & "\\slide_" & Right("00" & i, 3) & ".png"
    
    ' Exportar la diapositiva como PNG
    objSlide.Export fileName, "PNG", 1920, 1080  ' Resolución Full HD
    
    WScript.Echo "SLIDE_EXPORTED:" & i & ":" & fileName
Next

' Cerrar todo
objPresentation.Saved = True  ' Marcar como guardado para evitar preguntas
objPresentation.Close
objPPT.Quit

' Limpiar archivo temporal
On Error Resume Next
If fso.FileExists(pptFullPath) Then
    fso.DeleteFile pptFullPath, True
End If
If fso.FolderExists("${tempPptDir.replace(/\\/g, "\\\\")}") Then
    fso.DeleteFolder "${tempPptDir.replace(/\\/g, "\\\\")}", True
End If
On Error GoTo 0

Set objPresentation = Nothing
Set objPPT = Nothing
Set fso = Nothing

WScript.Echo "SUCCESS"
`;

    // Guardar el script VBS temporal
    const vbsPath = path.join(os.tmpdir(), `ppt_export_${Date.now()}.vbs`);
    fs.writeFileSync(vbsPath, vbsScript, "utf8");

    console.log("[PPT] Script VBS creado en:", vbsPath);
    console.log("[PPT] Ejecutando PowerPoint en modo automático...");

    // Ejecutar el script VBS
    execFile(
      "cscript.exe",
      ["//Nologo", vbsPath],
      { timeout: 120000 }, // 2 minutos de timeout
      (error, stdout, stderr) => {
        // Limpiar el script temporal
        try {
          fs.unlinkSync(vbsPath);
        } catch (e) {
          // Ignorar errores de limpieza
        }

        console.log("[PPT] PowerPoint terminó");
        console.log("[PPT] Salida:", stdout);
        console.log("[PPT] Error:", stderr);

        if (error) {
          console.error("[PPT] Error ejecutando PowerPoint:", error.message);
          return reject(
            new Error(`Error ejecutando PowerPoint: ${error.message}`),
          );
        }

        // Procesar la salida
        const lines = stdout.split("\n");
        let totalSlides = 0;
        const exportedSlides = [];

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith("TOTAL_SLIDES:")) {
            totalSlides = parseInt(line.split(":")[1]);
          } else if (line.startsWith("SLIDE_EXPORTED:")) {
            const parts = line.split(":");
            const slideNum = parseInt(parts[1]);
            const filePath = parts.slice(2).join(":");
            exportedSlides.push({ slide: slideNum, path: filePath });
          } else if (line.includes("ERROR_OPEN:")) {
            const errorMsg = line.split("ERROR_OPEN:")[1];
            return reject(
              new Error(`PowerPoint no pudo abrir el archivo: ${errorMsg}`),
            );
          }
        }

        if (exportedSlides.length === 0) {
          return reject(new Error("PowerPoint no exportó ninguna diapositiva"));
        }

        console.log(
          `[PPT] PowerPoint exportó ${exportedSlides.length} de ${totalSlides} diapositivas`,
        );

        // Ordenar las diapositivas por número
        exportedSlides.sort((a, b) => a.slide - b.slide);

        // Obtener solo los nombres de archivo
        const pngFiles = exportedSlides.map((slide) => {
          return path.basename(slide.path);
        });

        console.log("[PPT] Archivos PNG generados por PowerPoint:", pngFiles);
        resolve(pngFiles);
      },
    );
  });
}

/* -------------------------------------------------
   CONVERTIR PPTX → PDF (Función mejorada)
------------------------------------------------- */
function pptToPdf(pptPath, outDir) {
  return new Promise((resolve, reject) => {
    const soffice = getSofficePath();
    console.log("[PPT] Usando LibreOffice en:", soffice);
    console.log("[PPT] Archivo PPT:", pptPath);
    console.log("[PPT] Directorio salida:", outDir);

    // Verificar que el archivo PPT existe
    if (!fs.existsSync(pptPath)) {
      return reject(new Error(`El archivo PPT no existe: ${pptPath}`));
    }

    // Asegurar que el directorio de salida existe
    fs.mkdirSync(outDir, { recursive: true });

    const cwd = path.dirname(soffice);

    // Configurar variables de entorno
    const env = {
      ...process.env,
      PATH: cwd + path.delimiter + process.env.PATH,
    };

    // Usar el mejor conjunto de argumentos para conversión a PDF
    const args = [
      "--headless",
      "--nologo",
      "--convert-to",
      "pdf:impress_pdf_Export",
      pptPath,
      "--outdir",
      outDir,
    ];

    console.log("[PPT] Ejecutando LibreOffice con argumentos:", args);

    execFile(
      soffice,
      args,
      { cwd: cwd, env: env, timeout: 60000 },
      (error, stdout, stderr) => {
        console.log("[PPT] Conversión terminada");
        console.log("[PPT] Error:", error ? error.message : "null");

        // Esperar un momento y verificar si se generó el PDF
        setTimeout(() => {
          try {
            const files = fs.readdirSync(outDir);
            console.log("[PPT] Archivos en directorio:", files);

            // Buscar cualquier archivo PDF
            const pdfFiles = files.filter((f) =>
              f.toLowerCase().endsWith(".pdf"),
            );

            if (pdfFiles.length > 0) {
              console.log("[PPT] ¡Éxito! PDF generado:", pdfFiles[0]);
              resolve(pdfFiles[0]); // Devolver el nombre del archivo PDF
            } else {
              reject(
                new Error(
                  "No se generó el archivo PDF. LibreOffice no produjo ningún archivo.",
                ),
              );
            }
          } catch (err) {
            reject(
              new Error(`Error al verificar archivos PDF: ${err.message}`),
            );
          }
        }, 2000);
      },
    );
  });
}

/* -------------------------------------------------
   CONVERTIR PDF → IMÁGENES (una por página)
   Usando pdf-poppler para extraer cada página como imagen separada
------------------------------------------------- */
async function pdfToImages(pdfPath, outDir) {
  console.log("[PPT] Usando pdf-poppler para PDF→PNG");
  console.log("[PPT] Archivo PDF:", pdfPath);
  console.log("[PPT] Directorio salida imágenes:", outDir);

  // Verificar que el archivo PDF existe
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`El archivo PDF no existe: ${pdfPath}`);
  }

  // Asegurar que el directorio de salida existe
  fs.mkdirSync(outDir, { recursive: true });

  try {
    // Configurar opciones para pdf-poppler
    const options = {
      format: "png", // Formato de salida
      out_dir: outDir, // Directorio de salida
      out_prefix: path.basename(pdfPath, ".pdf"), // Prefijo para nombres de archivo
      page: null, // Convertir todas las páginas (null = todas)
      scale: 1600, // Resolución más alta para mejor calidad
    };

    console.log("[PPT] Convirtiendo PDF a imágenes con pdf-poppler...");

    // Convertir PDF a imágenes
    await pdf.convert(pdfPath, options);

    // Listar archivos generados
    const files = fs.readdirSync(outDir);
    const pngFiles = files
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .sort((a, b) => {
        // Extraer número de página del nombre del archivo
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
      });

    console.log("[PPT] Archivos PNG generados:", pngFiles);

    if (pngFiles.length === 0) {
      throw new Error("No se generaron imágenes PNG del PDF.");
    }

    return pngFiles;
  } catch (err) {
    console.error("[PPT] Error al convertir PDF a imágenes:", err);

    // Fallback: intentar con LibreOffice si pdf-poppler falla
    console.log("[PPT] Intentando fallback con LibreOffice...");
    return await pdfToImagesLibreOfficeFallback(pdfPath, outDir);
  }
}

/* -------------------------------------------------
   FALLBACK: CONVERTIR PDF → IMÁGENES CON LIBREOFFICE
------------------------------------------------- */
async function pdfToImagesLibreOfficeFallback(pdfPath, outDir) {
  return new Promise((resolve, reject) => {
    const soffice = getSofficePath();
    console.log("[PPT] Fallback: Usando LibreOffice para PDF→PNG");

    const cwd = path.dirname(soffice);
    const env = {
      ...process.env,
      PATH: cwd + path.delimiter + process.env.PATH,
    };

    // Intentar con argumentos específicos para extraer páginas
    const args = [
      "--headless",
      "--nologo",
      "--convert-to",
      "png",
      pdfPath,
      "--outdir",
      outDir,
    ];

    console.log("[PPT] Ejecutando LibreOffice con argumentos:", args);

    execFile(
      soffice,
      args,
      { cwd: cwd, env: env, timeout: 60000 },
      (error, stdout, stderr) => {
        console.log("[PPT] Conversión PDF→PNG terminada");
        console.log("[PPT] Error:", error ? error.message : "null");

        // Esperar un momento para que se generen todas las imágenes
        setTimeout(() => {
          try {
            const files = fs.readdirSync(outDir);
            const pngFiles = files
              .filter((f) => f.toLowerCase().endsWith(".png"))
              .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || 0);
                const numB = parseInt(b.match(/\d+/)?.[0] || 0);
                return numA - numB;
              });

            console.log("[PPT] Archivos PNG generados (fallback):", pngFiles);

            if (pngFiles.length === 0) {
              return reject(new Error("No se generaron imágenes PNG del PDF."));
            }

            resolve(pngFiles);
          } catch (err) {
            reject(new Error(`Error al procesar imágenes: ${err.message}`));
          }
        }, 3000);
      },
    );
  });
}

/* -------------------------------------------------
   CONVERTIR PPTX → IMÁGENES CON VISUALIZACIÓN PROGRESIVA
   Jerarquía: 1. PowerPoint → 2. LibreOffice → 3. pdf-poppler fallback
------------------------------------------------- */
async function convertPPTToImages(pptPath) {
  // Limpiar caché anterior de PowerPoint
  const pptCacheRoot = path.join(os.tmpdir(), "ppt-cache");
  if (fs.existsSync(pptCacheRoot)) {
    try {
      fs.rmSync(pptCacheRoot, { recursive: true, force: true });
      console.log("[PPT] Caché anterior eliminada");
    } catch (err) {
      console.error("[PPT] Error al eliminar caché anterior:", err.message);
    }
  }

  const id = Date.now().toString();
  const tempDir = path.join(os.tmpdir(), "ppt-cache", id);
  const imagesDir = path.join(tempDir, "images");

  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });

  sendProgress("Iniciando conversión de PowerPoint a imágenes…");

  console.log("[PPT] Archivo PPT:", pptPath);
  console.log("[PPT] Directorio temporal:", tempDir);

  // Verificar que el archivo PPT existe
  if (!fs.existsSync(pptPath)) {
    throw new Error(`El archivo PPT no existe: ${pptPath}`);
  }

  // Iniciar monitoreo de archivos
  const foundSlides = [];
  let monitorInterval;

  const startMonitoring = () => {
    monitorInterval = setInterval(() => {
      try {
        if (!fs.existsSync(imagesDir)) return;

        const files = fs.readdirSync(imagesDir);
        const pngFiles = files
          .filter((f) => f.toLowerCase().endsWith(".png"))
          .sort((a, b) => {
            // Ordenar por número de diapositiva (slide_001.png, slide_002.png, etc.)
            const numA = parseInt(
              a.match(/slide_(\d+)/)?.[1] || a.match(/(\d+)/)?.[1] || 0,
            );
            const numB = parseInt(
              b.match(/slide_(\d+)/)?.[1] || b.match(/(\d+)/)?.[1] || 0,
            );
            return numA - numB;
          });

        // Enviar nuevas slides
        pngFiles.forEach((file, index) => {
          if (!foundSlides.includes(file)) {
            foundSlides.push(file);
            const slidePath = path.join(imagesDir, file);
            const normalizedPath = slidePath.replace(/\\\\/g, "/");
            const fileUrl = `file:///${normalizedPath}`;

            // Enviar slide al renderer
            const win = BrowserWindow.getAllWindows()[0];
            if (win && !win.isDestroyed()) {
              win.webContents.send("ppt:slide-ready", {
                url: fileUrl,
                index: index,
                total: pngFiles.length,
              });
            }

            console.log(`[PPT] Nueva diapositiva encontrada: ${fileUrl}`);
            sendProgress("Generando diapositivas…", index + 1, pngFiles.length);
          }
        });
      } catch (err) {
        console.error("[PPT] Error en monitoreo:", err);
      }
    }, 1000); // Verificar cada segundo
  };

  try {
    // INTENTO 1: Usar Microsoft PowerPoint (si está disponible)
    const powerpointAvailable = getPowerPointPath();
    if (powerpointAvailable) {
      console.log("[PPT] Intentando con Microsoft PowerPoint...");
      sendProgress("Usando Microsoft PowerPoint para conversión…");

      // Iniciar monitoreo
      startMonitoring();

      try {
        const pngFiles = await convertPPTWithPowerPoint(pptPath, imagesDir);

        // Detener monitoreo
        if (monitorInterval) {
          clearInterval(monitorInterval);
        }

        console.log("[PPT] PowerPoint generó archivos:", pngFiles);

        if (pngFiles.length === 0) {
          throw new Error("PowerPoint no generó imágenes");
        }

        // Ordenar los archivos por número (slide_001.png, slide_002.png, etc.)
        const sortedPngFiles = pngFiles.sort((a, b) => {
          const numA = parseInt(
            a.match(/slide_(\d+)/)?.[1] || a.match(/(\d+)/)?.[1] || 0,
          );
          const numB = parseInt(
            b.match(/slide_(\d+)/)?.[1] || b.match(/(\d+)/)?.[1] || 0,
          );
          return numA - numB;
        });

        // Convertir a URLs file://
        const slides = sortedPngFiles.map((file, index) => {
          const slidePath = path.join(imagesDir, file);
          const normalizedPath = slidePath.replace(/\\\\/g, "/");
          return `file:///${normalizedPath}`;
        });

        sendProgress(
          "Conversión completada con PowerPoint",
          pngFiles.length,
          pngFiles.length,
          true,
        );
        console.log("[PPT] URLs finales (PowerPoint):", slides);
        return slides;
      } catch (powerpointError) {
        console.log("[PPT] PowerPoint falló:", powerpointError.message);
        // Limpiar directorio de imágenes para intentar con LibreOffice
        const files = fs.readdirSync(imagesDir);
        files.forEach((file) => {
          try {
            fs.unlinkSync(path.join(imagesDir, file));
          } catch (e) {
            // Ignorar errores de limpieza
          }
        });

        // Detener monitoreo anterior
        if (monitorInterval) {
          clearInterval(monitorInterval);
          monitorInterval = null;
        }

        // Continuar con LibreOffice
        console.log("[PPT] Continuando con LibreOffice...");
      }
    }

    // INTENTO 2: Usar LibreOffice
    const libreofficePath = getSofficePath();
    if (!libreofficePath) {
      throw new Error("Ni PowerPoint ni LibreOffice están disponibles");
    }

    console.log("[PPT] Intentando con LibreOffice...");
    sendProgress("Usando LibreOffice para conversión…");

    // Crear directorio para PDF intermedio
    const pdfDir = path.join(tempDir, "pdf");
    fs.mkdirSync(pdfDir, { recursive: true });

    // Paso 1: Convertir PPT a PDF
    sendProgress("Convirtiendo PowerPoint a PDF…");
    console.log("[PPT] Paso 1: Convirtiendo PPT a PDF con LibreOffice…");

    const pdfFileName = await pptToPdf(pptPath, pdfDir);
    const pdfPath = path.join(pdfDir, pdfFileName);
    console.log("[PPT] PDF generado exitosamente:", pdfPath);

    // Paso 2: Convertir PDF a imágenes (una por página)
    sendProgress("Extrayendo diapositivas del PDF…");
    console.log("[PPT] Paso 2: Convirtiendo PDF a imágenes…");

    // Iniciar monitoreo (si no se inició antes)
    if (!monitorInterval) {
      startMonitoring();
    }

    // Ejecutar conversión PDF a imágenes
    const pngFiles = await pdfToImages(pdfPath, imagesDir);

    // Detener monitoreo
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }

    console.log("[PPT] Archivos PNG finales (LibreOffice):", pngFiles);

    if (pngFiles.length === 0) {
      throw new Error("No se generaron imágenes PNG del PDF.");
    }

    // Ordenar los archivos por número
    const sortedPngFiles = pngFiles.sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)?.[1] || 0);
      const numB = parseInt(b.match(/(\d+)/)?.[1] || 0);
      return numA - numB;
    });

    // Convertir a URLs file://
    const slides = sortedPngFiles.map((file, index) => {
      const slidePath = path.join(imagesDir, file);
      const normalizedPath = slidePath.replace(/\\\\/g, "/");
      return `file:///${normalizedPath}`;
    });

    sendProgress(
      "Conversión completada con LibreOffice",
      pngFiles.length,
      pngFiles.length,
      true,
    );
    console.log("[PPT] URLs finales:", slides);
    return slides;
  } catch (err) {
    // Detener monitoreo en caso de error
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }

    console.error("[PPT] Error en la conversión:", err);
    throw err;
  }
}

/* -------------------------------------------------
   IPC PRINCIPAL - CONVERSIÓN CON JERARQUÍA
------------------------------------------------- */
ipcMain.handle("ppt:open", async () => {
  const result = await dialog.showOpenDialog({
    title: "Seleccionar PowerPoint",
    filters: [{ name: "PowerPoint", extensions: ["pptx", "ppt"] }],
    properties: ["openFile"],
  });

  if (result.canceled) return [];

  const pptPath = result.filePaths[0];

  try {
    // Convertir usando la jerarquía: PowerPoint → LibreOffice
    const slides = await convertPPTToImages(pptPath);
    return slides;
  } catch (err) {
    console.error("Error convirtiendo PPT:", err);

    // Mostrar mensaje de error con opciones de instalación
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      let detailMessage = "";
      let showInstallButtons = false;

      if (
        err.message.includes("Ni PowerPoint ni LibreOffice están disponibles")
      ) {
        detailMessage = `No se encontró Microsoft PowerPoint ni LibreOffice en su sistema.

Para usar presentaciones PowerPoint, necesita instalar:
1. Microsoft PowerPoint (recomendado, mejor calidad)
2. O LibreOffice (gratis, alternativa)
`;
        showInstallButtons = true;
      } else if (err.message.includes("PowerPoint no encontrado")) {
        detailMessage = `Microsoft PowerPoint no está instalado en su sistema.

Para la mejor calidad, se recomienda instalar PowerPoint.
Como alternativa, puede instalar LibreOffice (gratis).
`;
        showInstallButtons = true;
      } else if (err.message.includes("LibreOffice no encontrado")) {
        detailMessage = `LibreOffice no está instalado en su sistema.

Para usar presentaciones PowerPoint, necesita instalar LibreOffice (gratis).
`;
        showInstallButtons = true;
      } else {
        detailMessage = `Error: ${err.message}

Posibles causas:
• El archivo PowerPoint está corrupto
• La aplicación de conversión no está instalada correctamente
• Faltan componentes necesarios
`;
      }

      const buttons = showInstallButtons
        ? ["Instalar PowerPoint", "Instalar LibreOffice", "Cancelar"]
        : ["OK"];

      const response = await dialog.showMessageBox(win, {
        type: "error",
        title: "Error al convertir PowerPoint",
        message: "No se pudo convertir el archivo PowerPoint",
        detail: detailMessage,
        buttons: buttons,
        defaultId: 0,
        cancelId: showInstallButtons ? 2 : 0,
      });

      // Si el usuario hace clic en "Instalar PowerPoint"
      if (showInstallButtons && response.response === 0) {
        shell.openExternal(
          "https://www.microsoft.com/microsoft-365/powerpoint",
        );
        console.log("[PPT] Abriendo enlace de Microsoft Office...");
      }
      // Si el usuario hace clic en "Instalar LibreOffice"
      else if (showInstallButtons && response.response === 1) {
        shell.openExternal("https://www.libreoffice.org/download/download/");
        console.log("[PPT] Abriendo enlace de descarga de LibreOffice...");
      }
    }
  }
});

// Reiniciar servidor remoto
ipcMain.handle("reset-remote-connection", async () => {
  try {
    console.log("[CONTROL REMOTO] 🔄 Reiniciando conexión remota...");

    // Obtener módulo actual y cerrar servidor si existe
    // Nota: remoteServer no es una variable global en main.js, debemos usar la función del módulo o depender
    // de que al eliminar del caché y requerir de nuevo se maneje correctamente, pero lo ideal es cerrarlo explícitamente.
    try {
      const currentModule = require("./controlRemoto");
      const server = currentModule.getServerInstance
        ? currentModule.getServerInstance()
        : null;
      if (server) {
        server.close();
        console.log("[CONTROL REMOTO] Servidor antiguo cerrado");
      }
    } catch (e) {
      console.warn(
        "[CONTROL REMOTO] No se pudo cerrar servidor anterior (quizás no estaba activo):",
        e.message,
      );
    }

    // IMPORTANTE: Eliminar la caché del módulo para forzar un nuevo PIN
    const modulePath = require.resolve("./controlRemoto");
    delete require.cache[modulePath];

    // Recargar módulo
    const {
      startRemoteServer: start,
      getRemoteStatus,
    } = require("./controlRemoto");

    // Reiniciar
    start(mainWindow, app);

    // Obtener el nuevo estado para enviarlo de vuelta
    return new Promise((resolve) => {
      setTimeout(() => {
        const estado = getRemoteStatus();
        if (estado && estado.activo) {
          console.log(
            "[CONTROL REMOTO] ✅ Reiniciado correctamente. Nuevo PIN:",
            estado.pin,
          );
          resolve({ success: true, pin: estado.pin, url: estado.url });
        } else {
          resolve({
            success: false,
            error: "No se pudo obtener el nuevo estado",
          });
        }
      }, 500);
    });
  } catch (error) {
    console.error("[CONTROL REMOTO] ❌ Error reiniciando:", error);
    return { success: false, error: error.message };
  }
});

// Manejador para convertir un PowerPoint específico (usado por control remoto)
ipcMain.handle("ppt:convert-remote", async (event, pptPath) => {
  try {
    const slides = await convertPPTToImages(pptPath);
    return slides;
  } catch (err) {
    console.error("Error convirtiendo PPT remoto:", err);
    return [];
  }
});

/* -------------------------------------------------
   IPC PARA OBTENER ESTADO DE CONVERSIÓN
------------------------------------------------- */
ipcMain.handle("ppt:get-conversion-status", async () => {
  return {
    inProgress: global.pptConversionInProgress || false,
    current: global.pptConversionCurrent || 0,
    total: global.pptConversionTotal || 0,
    slides: global.pptConversionSlides || [],
  };
});

/* -------------------------------------------------
   IPC PARA OBTENER SLIDE ESPECÍFICO
------------------------------------------------- */
ipcMain.handle("ppt:get-slide", async (event, slideIndex) => {
  if (!global.pptConversionSlides || !global.pptConversionSlides[slideIndex]) {
    return null;
  }

  const tempDir = path.join(
    os.tmpdir(),
    "ppt-cache",
    Object.keys(global.pptConversionSlides)[0] || "",
  );
  const slideFile = global.pptConversionSlides[slideIndex];
  const slidePath = path.join(tempDir, slideFile);

  if (fs.existsSync(slidePath)) {
    const normalizedPath = slidePath.replace(/\\\\/g, "/");
    return `file:///${normalizedPath}`;
  }

  return null;
});

// Notificar estado de reproducción al control remoto
ipcMain.on("update-playback-status", (event, status) => {
  console.log("[PLAYBACK-IPC] 📡 Recibido:", status);
  if (global.enviarEventoControlRemoto) {
    console.log("[PLAYBACK-IPC] ✅ Enviando a control remoto via SSE");
    global.enviarEventoControlRemoto("playback-status", status);
  } else {
    console.warn("[PLAYBACK-IPC] ⚠️ enviarEventoControlRemoto no disponible");
  }
});

// ✅ MONITOREO EN TIEMPO REAL DE PANTALLAS (Display Hot-Plug)
const updateMonitorsRemote = async () => {
  if (global.enviarEventoControlRemoto) {
    try {
      console.log(
        "[MONITORES] Cambios detectados en pantallas, actualizando remotos...",
      );
      const monitores = await mostrarMonitores();
      global.enviarEventoControlRemoto("monitors-update", { monitores });
    } catch (err) {
      console.error("Error updating monitors via SSE:", err);
    }
  }
};

app.whenReady().then(() => {
  screen.on("display-added", updateMonitorsRemote);
  screen.on("display-removed", updateMonitorsRemote);
  screen.on("display-metrics-changed", updateMonitorsRemote);
});

/* -------------------------------------------------
   ENVIAR PROGRESO
------------------------------------------------- */
function sendProgress(message, current = null, total = null, done = false) {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  win.webContents.send("ppt:progress", {
    message,
    current,
    total,
    done,
  });
}

//npm run release -> comando importante para actualizaciones.

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// FUNCIONALIDAD DE ASISTENTE DE VOZ ELIMINADA POR SOLICITUD DEL USUARIO
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

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
