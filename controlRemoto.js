// ===============================
// CONTROL REMOTO DESDE CELULAR
// ===============================
const express = require("express");
const bodyParser = require("body-parser");
const os = require("os");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let app = null;
let remoteServer = null;

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  let ips = [];

  // Recopilar todas las IPs IPv4 no internas
  for (let ifaceName of Object.keys(ifaces)) {
    for (let config of ifaces[ifaceName]) {
      if (config.family === "IPv4" && !config.internal) {
        ips.push({
          name: ifaceName.toLowerCase(),
          address: config.address,
        });
      }
    }
  }

  // Filtrar IPs de interfaces virtuales (VirtualBox, VMware, etc.)
  const realIPs = ips.filter((ip) => {
    // Excluir interfaces conocidas de virtualización
    const isVirtual =
      ip.name.includes("virtual") ||
      ip.name.includes("vmware") ||
      ip.name.includes("vbox") ||
      ip.name.includes("virtualbox") ||
      ip.address.startsWith("192.168.56.") || // VirtualBox
      ip.address.startsWith("192.168.99."); // Docker Machine
    return !isVirtual;
  });

  // Priorizar WiFi o Ethernet
  const preferredIP = realIPs.find(
    (ip) =>
      ip.name.includes("wi-fi") ||
      ip.name.includes("wifi") ||
      ip.name.includes("wlan") ||
      ip.name.includes("ethernet") ||
      ip.name.includes("eth")
  );

  if (preferredIP) {
    console.log(
      `🌐 IP de red detectada: ${preferredIP.address} (${preferredIP.name})`
    );
    return preferredIP.address;
  }

  // Si no hay preferida, usar la primera IP real
  if (realIPs.length > 0) {
    console.log(
      `🌐 IP de red detectada: ${realIPs[0].address} (${realIPs[0].name})`
    );
    return realIPs[0].address;
  }

  // Fallback a localhost
  console.warn("⚠️ No se detectó IP de red, usando localhost");
  return "localhost";
}

function iniciarControlRemoto(win) {
  if (remoteServer) {
    console.log("📱 Control remoto ya está activo");
    return;
  }

  mainWindow = win;
  app = express();
  const PORT = 3555;

  // Generar PIN aleatorio de 6 dígitos
  const PIN = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔐 PIN generado: ${PIN}`);

  // Guardar estado del control remoto globalmente
  global.controlRemotoEstado = {
    activo: false,
    url: null,
    pin: PIN,
    puerto: PORT,
  };

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Página del panel de control
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "control-remoto.html"));
  });

  // Endpoint para validar PIN
  app.post("/validar-pin", (req, res) => {
    const { pin } = req.body;
    if (pin === PIN) {
      res.json({ ok: true });
    } else {
      res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }
  });

  // Endpoint para comandos
  app.post("/cmd", (req, res) => {
    const { pin, command, data } = req.body;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    // Enviar el comando al renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("remote-command", { command, data });
      res.json({ ok: true });
    } else {
      res
        .status(500)
        .json({ ok: false, error: "Ventana principal no disponible" });
    }
  });

  // Endpoint para subir PowerPoint desde el celular
  app.post("/upload-ppt", (req, res) => {
    const { pin, name } = req.query;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    if (!name) {
      return res
        .status(400)
        .json({ ok: false, error: "Nombre de archivo no proporcionado" });
    }

    const tempDir = path.join(os.tmpdir(), "ppt_temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const safeName = `remoto_${Date.now()}_${name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )}`;
    const filePath = path.join(tempDir, safeName);

    console.log(
      `📥 Recibiendo PowerPoint desde remoto: ${name} -> ${filePath}`
    );

    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on("finish", () => {
      console.log(`✅ PowerPoint guardado: ${filePath}`);

      // Notificar al renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("remote-command", {
          command: "cargar-ppt-remoto",
          data: { filePath: filePath, fileName: name },
        });
        res.json({ ok: true });
      } else {
        res
          .status(500)
          .json({ ok: false, error: "Ventana principal no disponible" });
      }
    });

    writeStream.on("error", (err) => {
      console.error("❌ Error al guardar PowerPoint remoto:", err);
      res.status(500).json({ ok: false, error: "Error al guardar el archivo" });
    });
  });

  // Endpoint para búsqueda de himnos
  app.post("/buscar", (req, res) => {
    const { pin, query } = req.body;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    if (!query || query.trim() === "") {
      return res.json({ ok: true, resultados: [] });
    }

    // Solicitar búsqueda al renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Ejecutar código en el renderer para buscar en TODOS los arrays
      mainWindow.webContents
        .executeJavaScript(
          `
        (function() {
          const query = ${JSON.stringify(query.toLowerCase().trim())};
          let resultados = [];
          
          // 1. Buscar en himnos principales (1-614)
          if (typeof titulos !== 'undefined') {
            for (let i = 0; i < titulos.length; i++) {
              const numero = (i + 1).toString().padStart(3, '0');
              const titulo = titulos[i];
              
              if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                resultados.push({
                  numero: numero,
                  titulo: numero + '. ' + titulo,
                  categoria: 'Himnos'
                });
              }
            }
          }
          
          // 2. Buscar en antiguos orquestados
          if (typeof titulos2 !== 'undefined') {
            for (let i = 0; i < titulos2.length; i++) {
              const match = titulos2[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = titulos2[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'Orquestado'
                  });
                }
              }
            }
          }
          
          // 3. Buscar en coritos
          if (typeof titulos3 !== 'undefined') {
            for (let i = 0; i < titulos3.length; i++) {
              const match = titulos3[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = titulos3[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'Coritos'
                  });
                }
              }
            }
          }
          
          // 4. Buscar en himnos JA
          if (typeof titulos4 !== 'undefined') {
            for (let i = 0; i < titulos4.length; i++) {
              const match = titulos4[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = titulos4[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'JA'
                  });
                }
              }
            }
          }
          
          // 5. Buscar en himnos nacionales
          if (typeof titulos5 !== 'undefined') {
            for (let i = 0; i < titulos5.length; i++) {
              const match = titulos5[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = titulos5[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'Nacionales'
                  });
                }
              }
            }
          }
          
          // 6. Buscar en himnos infantiles
          if (typeof tituloHimnosInfantiles !== 'undefined') {
            for (let i = 0; i < tituloHimnosInfantiles.length; i++) {
              const match = tituloHimnosInfantiles[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = tituloHimnosInfantiles[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'Infantiles'
                  });
                }
              }
            }
          }
          
          // 7. Buscar en himnos antiguos 1962
          if (typeof tituloHimnosAntiguos !== 'undefined') {
            for (let i = 0; i < tituloHimnosAntiguos.length; i++) {
              const match = tituloHimnosAntiguos[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = tituloHimnosAntiguos[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'Antiguos 1962'
                  });
                }
              }
            }
          }
          
          // 8. Buscar en piano pista
          if (typeof tituloHimnosPianoPista !== 'undefined') {
            for (let i = 0; i < tituloHimnosPianoPista.length; i++) {
              const match = tituloHimnosPianoPista[i].match(/\\d{3}/);
              if (match) {
                const numero = match[0];
                const titulo = tituloHimnosPianoPista[i];
                
                if (numero.includes(query) || titulo.toLowerCase().includes(query)) {
                  resultados.push({
                    numero: numero,
                    titulo: titulo,
                    categoria: 'Piano Pista'
                  });
                }
              }
            }
          }
          
          return resultados.slice(0, 20);
        })();
      `
        )
        .then((resultados) => {
          res.json({ ok: true, resultados });
        })
        .catch((err) => {
          console.error("Error en búsqueda:", err);
          res.json({ ok: true, resultados: [], error: err.message });
        });
    } else {
      res
        .status(500)
        .json({ ok: false, error: "Ventana principal no disponible" });
    }
  });

  // ========== SERVER-SENT EVENTS (SSE) ==========
  // Para enviar actualizaciones en tiempo real al control remoto
  app.get("/events", (req, res) => {
    // Configurar cabeceras para SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Enviar mensaje inicial
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // Añadir respuesta a la lista de clientes
    const clientId = Date.now();
    const newClient = {
      id: clientId,
      res,
    };

    // Si no existe la lista global de clientes, crearla
    if (!global.sseClients) {
      global.sseClients = [];
    }

    global.sseClients.push(newClient);

    // Cuando el cliente se desconecta, eliminarlo de la lista
    req.on("close", () => {
      global.sseClients = global.sseClients.filter(
        (client) => client.id !== clientId
      );
    });
  });

  // Función para enviar eventos a todos los clientes conectados
  // (La exportaremos al final)
  global.enviarEventoControlRemoto = (tipo, datos) => {
    if (!global.sseClients) return;

    global.sseClients.forEach((client) => {
      client.res.write(
        `data: ${JSON.stringify({ type: tipo, data: datos })}\n\n`
      );
    });
  };

  // Endpoint para obtener el estado actual de la aplicación
  app.get("/estado", (req, res) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("remote-get-estado");

      // Esperar respuesta del renderer
      // (esto es simplificado, idealmente usarías un sistema de eventos)
      setTimeout(() => {
        res.json({ ok: true, message: "Solicitud de estado enviada" });
      }, 100);
    } else {
      res
        .status(500)
        .json({ ok: false, error: "Ventana principal no disponible" });
    }
  });

  remoteServer = app.listen(PORT, "0.0.0.0", () => {
    const localIP = getLocalIP();
    console.log(`📱 Control remoto activo en: http://${localIP}:${PORT}`);
    console.log(`🔐 PIN de acceso: ${PIN}`);
    console.log(`🌐 Accesible desde la red local`);

    // Actualizar estado global
    global.controlRemotoEstado = {
      activo: true,
      url: `http://${localIP}:${PORT}`,
      pin: PIN,
      puerto: PORT,
      ip: localIP,
    };

    // Enviar la IP y PIN al renderer para mostrarla en la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("control-remoto-iniciado", {
        ip: localIP,
        puerto: PORT,
        url: `http://${localIP}:${PORT}`,
        pin: PIN,
      });
    }
  });
}

function detenerControlRemoto() {
  if (remoteServer) {
    remoteServer.close(() => {
      console.log("📱 Control remoto detenido");
      remoteServer = null;

      // Actualizar estado global
      global.controlRemotoEstado = {
        activo: false,
        url: null,
        pin: null,
        puerto: null,
      };
    });
  }
}

module.exports = { iniciarControlRemoto, detenerControlRemoto };
