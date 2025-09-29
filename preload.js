const { contextBridge } = require("electron");
const path = require("path");
const fs = require("fs");
const { app } = require("electron").remote || require("@electron/remote"); 

// Carpeta persistente
const BASE_DIR = path.join(app.getPath("userData"), "resources");

// Asegura que exista
fs.mkdirSync(BASE_DIR, { recursive: true });

function getResourcePath(relativePath) {
  const userPath = path.join(BASE_DIR, relativePath);
  const appPath = path.join(process.resourcesPath, "src", relativePath);

  if (fs.existsSync(userPath)) return userPath;
  return appPath;
}
// Exponer a renderer
contextBridge.exposeInMainWorld("resources", {
  getPath: (relativePath) => getResourcePath(relativePath),
  baseDir: BASE_DIR
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
    // callback recibe el mensaje (string)
    ipcRenderer.on("log-message", (evt, msg) => callback(msg));
  },
  enviarDatos: (data) => ipcRenderer.send("enviar-a-ventana", data),
  onActualizarDatos: (callback) => ipcRenderer.on("actualizar-datos", callback),

  obtenerMonitores: () => ipcRenderer.invoke("obtener-monitores"),
  abrirVentanaSecundaria: (monitorIndex) => ipcRenderer.send("abrir-ventana", monitorIndex),
  onVentanaCerrada: (callback) => ipcRenderer.on("ventana-cerrada", callback),
  onMonitoresActualizados: (callback) => ipcRenderer.on("monitores-actualizados", callback)
});
