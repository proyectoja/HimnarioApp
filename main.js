const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  ipcMain,
  screen,
  shell
} = require("electron");
const { autoUpdater } = require('electron-updater');
const si = require('systeminformation');
const path = require("path");
const { setLogWindow, flushBuffer, log } = require("./logHelper");
const { verificarCarpetasYReiniciarSiFaltan } = require("./verificarWrapper");
let tray = null; // Bandeja del sistema
let win = null; // Ventana principal
const express = require("express");
const baseDir = path.join(app.getPath("userData"), "resources");

app.commandLine.appendSwitch("disable-features", "CrossOriginOpenerPolicy");
app.commandLine.appendSwitch("disable-features", "CrossOriginEmbedderPolicy");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const server = express();
server.use(express.static(path.join(__dirname, "src")));
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
    icon: path.join(__dirname, "src/iconos/iconoWindows.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
      webSecurity: false,
      devTools: false, // Desactiva devTools
      additionalArguments: [`--baseDir=${baseDir}`],
    },
  });
  // Maximizar la ventana al iniciar
  win.maximize();
  win.loadURL("http://localhost:3000/index.html"); // Archivo HTML del himnario

  // Cambiar el título una vez que el contenido esté completamente cargado
  win.webContents.on("did-finish-load", () => {
    win.setTitle(
      `PROYECTO JA | Himnario Adventista Pro - v${app.getVersion()}`
    );
  });

  // Manejar el evento de cerrar la ventana, sin cerrar la app
  win.on("closed", () => {
    win = null;
  });
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

  // ⚡ Interceptar cualquier intento de abrir nueva ventana
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Abrir enlace en el navegador predeterminado
    shell.openExternal(url);
    return { action: 'deny' }; // evita que Electron abra una ventana
  });

  // También opcionalmente interceptar links que se abren con target="_blank"
  win.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
}

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

function crearVentanaLogs() {
  logWindow = new BrowserWindow({
    width: 800,
    height: 300,
    icon: path.join(__dirname, "src/iconos/iconoWindows.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
      additionalArguments: [`--baseDir=${baseDir}`],
    },
  });

  logWindow.loadFile(path.join(__dirname, "log.html"));
  logWindow.webContents.on("did-finish-load", () => {
    setLogWindow(logWindow);
    flushBuffer();
    log("[MAIN] log window ready and buffer flushed");
  });
}

async function ejecutarVerificacion() {
  try {
    // Abrir ventana de logs siempre
    crearVentanaLogs();

    // Esperar a que la ventana de logs cargue
    await new Promise((resolve) => {
      logWindow.webContents.on("did-finish-load", () => resolve());
    });

    const reinicio = await verificarCarpetasYReiniciarSiFaltan(app);

    if (reinicio) {
      log("[MAIN] Archivos faltantes. Mostrando logs, esperando cierre...");

      // Esperar a que el usuario cierre la ventana de logs
      await new Promise((resolve) => {
        logWindow.on("closed", () => resolve());
      });

      // Reinicio después de que el usuario cierre logs
      app.relaunch();
      app.exit(0);
    } else {
      // Caso: no requiere reinicio → ventana principal + cerrar logs automáticamente
      log("[MAIN] Todo correcto, no se requieren descargas.");
      createWindow();

      if (logWindow && !logWindow.isDestroyed()) {
        logWindow.close(); // cierra la ventana de logs
      }
    }
  } catch (err) {
    log("[MAIN] Error verificarCarpetas: " + err.message);
    createWindow(); // fallback: siempre mostrar ventana principal
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
      devTools: false, // Desactiva devTools
      additionalArguments: [`--baseDir=${baseDir}`],
    },
  });

  playerWindow.loadFile("src/ventanaSecundaria.html");
  playerWindow.setFullScreen(true);

  // 🔄 Detectar cuando el usuario cierre manualmente la ventana
  playerWindow.on("close", () => {
    if (playerWindow && !playerWindow.isDestroyed()) {
      // Avisar al renderer principal que la ventana fue cerrada
      const win = BrowserWindow.getAllWindows().find(w => w.title !== "Ventana Secundaria");
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
    principal: d.main
  }));
}

// IPC
ipcMain.handle("obtener-monitores", async () => {
  return await mostrarMonitores();
});

ipcMain.on("abrir-ventana", (event, monitorIndex) => {
  abrirVentanaSecundaria(monitorIndex);
});




//ACTUALIZACIONES DE LA APP
// Opcional: mostrar mensajes de actualización
autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización disponible del Himnario Adventista PRO',
    message: 'Hay una nueva versión. Se descargará automáticamente.'
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización lista del Himnario Adventista PRO',
    message: 'Se instalará la actualización al cerrar la app.'
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});











app.whenReady().then(() => {
  // Revisar actualizaciones
  autoUpdater.checkForUpdatesAndNotify();
  ejecutarVerificacion(); // ✅ ahora con lógica de reinicio/cierre de logs
  console.log("Monitores disponibles:");
  mostrarMonitores();
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



app.on("window-all-closed", () => {
  app.quit();
});

//npm run release -> comando importante para actualizaciones.