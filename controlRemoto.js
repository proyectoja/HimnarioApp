// ===============================
// CONTROL REMOTO DESDE CELULAR
// ===============================
const express = require("express");
const bodyParser = require("body-parser");
const os = require("os");
const path = require("path");
const fs = require("fs");
const si = require("systeminformation"); // Para obtener info de monitores
const https = require("https");
const selfsigned = require("selfsigned");
const { app } = require("electron");

let mainWindow = null;
// let app = null; // Conflict with electron app variable name, so we rename express app variable locally or use a different name for the import
let expressApp = null;
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
      ip.name.includes("eth"),
  );

  if (preferredIP) {
    console.log(
      `🌐 IP de red detectada: ${preferredIP.address} (${preferredIP.name})`,
    );
    return preferredIP.address;
  }

  // Si no hay preferida, usar la primera IP real
  if (realIPs.length > 0) {
    console.log(
      `🌐 IP de red detectada: ${realIPs[0].address} (${realIPs[0].name})`,
    );
    return realIPs[0].address;
  }

  // Fallback a localhost
  console.warn("⚠️ No se detectó IP de red, usando localhost");
  return "localhost";
}

async function iniciarControlRemoto(win) {
  if (remoteServer) {
    console.log("📱 Control remoto ya está activo");
    return;
  }

  mainWindow = win;
  expressApp = express();
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

  // Limpiar archivos temporales antiguos al iniciar
  const tempFolders = ["ppt_temp", "video_temp"];
  tempFolders.forEach((folder) => {
    const dirPath = path.join(os.tmpdir(), folder);
    if (fs.existsSync(dirPath)) {
      console.log(`🧹 Limpiando temporales en: ${dirPath}`);
      fs.readdir(dirPath, (err, files) => {
        if (!err) {
          files.forEach((file) => {
            // Eliminar archivos con más de 1 hora de antigüedad o limpiar todos al inicio
            const curPath = path.join(dirPath, file);
            try {
              fs.unlinkSync(curPath);
            } catch (e) {
              /* ignorar errores de archivos en uso */
            }
          });
        }
      });
    }
  });

  expressApp.use(bodyParser.json());
  expressApp.use(bodyParser.urlencoded({ extended: true }));

  // Habilitar CORS para evitar problemas de conexión en algunos navegadores móviles
  expressApp.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Servir iconos para la interfaz remota
  expressApp.use("/iconos", express.static(path.join(__dirname, "src/iconos")));

  // Página del panel de control
  expressApp.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "control-remoto.html"));
  });

  // Endpoint para validar PIN
  expressApp.post("/validar-pin", (req, res) => {
    const { pin } = req.body;
    if (pin === PIN) {
      res.json({ ok: true });
    } else {
      res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }
  });

  // Endpoint para comandos
  expressApp.post("/cmd", (req, res) => {
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
  expressApp.post("/upload-ppt", (req, res) => {
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
      "_",
    )}`;
    const filePath = path.join(tempDir, safeName);

    console.log(
      `📥 Recibiendo PowerPoint desde remoto: ${name} -> ${filePath}`,
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

  // Endpoint para subir Video MP4 desde el celular
  expressApp.post("/upload-video", (req, res) => {
    const { pin, name } = req.query;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    if (!name) {
      return res
        .status(400)
        .json({ ok: false, error: "Nombre de archivo no proporcionado" });
    }

    const tempDir = path.join(os.tmpdir(), "video_temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const safeName = `remoto_video_${Date.now()}_${name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    )}`;
    const filePath = path.join(tempDir, safeName);

    console.log(`📥 Recibiendo Video desde remoto: ${name} -> ${filePath}`);

    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on("finish", () => {
      console.log(`✅ Video guardado: ${filePath}`);

      // Notificar al renderer de forma segura
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("remote-command", {
            command: "cargar-video-remoto",
            data: { filePath: filePath, fileName: name },
          });

          if (!res.headersSent) {
            res.json({ ok: true });
          }
        } else {
          console.error(
            "⚠️ Ventana principal no disponible para reproducir video",
          );
          if (!res.headersSent) {
            res
              .status(500)
              .json({ ok: false, error: "Ventana principal no disponible" });
          }
        }
      } catch (err) {
        console.error("❌ Error en callback de subida de video:", err);
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: err.message });
        }
      }
    });

    writeStream.on("error", (err) => {
      console.error("❌ Error al guardar Video remoto:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ ok: false, error: "Error de escritura en disco" });
      }
    });

    req.on("error", (err) => {
      console.error("❌ Error en la transmisión del video:", err);
      writeStream.end();
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: "Error de transmisión" });
      }
    });

    // Timeout de seguridad de 60 minutos para películas o archivos grandes
    req.setTimeout(3600000, () => {
      console.error("❌ Timeout en subida de video (60 min excedidos)");
      req.destroy();
      writeStream.end();
      if (!res.headersSent) {
        res.status(408).json({ ok: false, error: "Tiempo de espera agotado" });
      }
    });
  });

  // Endpoint para búsqueda de himnos
  expressApp.post("/buscar", (req, res) => {
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
      `,
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

  // Endpoint para obtener monitores disponibles
  expressApp.get("/monitores", async (req, res) => {
    try {
      if (req.query.pin !== PIN) {
        return res.status(403).json({ ok: false, error: "PIN incorrecto" });
      }

      const graphics = await si.graphics();
      const monitores = graphics.displays
        .map((d, i) => ({
          id: i,
          nombre: d.model.replace(/[^\x20-\x7E]/g, ""),
          principal: d.main,
        }))
        .filter((d) => !d.principal); // Filtrar monitor principal

      res.json({ ok: true, monitores });
    } catch (err) {
      console.error("Error obteniendo monitores:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Endpoint para enviar mensajes de chat
  expressApp.post("/chat", (req, res) => {
    const { pin, user, message } = req.body;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    if (!user || !message) {
      return res.status(400).json({ ok: false, error: "Datos incompletos" });
    }

    const chatData = {
      id: Date.now(),
      user: user.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // Retransmitir a todos los conectados
    if (global.enviarEventoControlRemoto) {
      global.enviarEventoControlRemoto("chat-message", chatData);
    }

    res.json({ ok: true });
  });

  // Endpoint para cambiar monitor
  expressApp.post("/cambiar-monitor", (req, res) => {
    const { pin, id } = req.body;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("remote-command", {
        command: "cambiar-monitor",
        data: { id: parseInt(id) },
      });
      res.json({ ok: true });
    } else {
      res
        .status(500)
        .json({ ok: false, error: "Ventana principal no disponible" });
    }
  });

  // ========== SERVER-SENT EVENTS (SSE) ==========
  // Para enviar actualizaciones en tiempo real al control remoto
  // ========== SERVER-SENT EVENTS (SSE) ==========
  // Para enviar actualizaciones en tiempo real al control remoto
  expressApp.get("/events", (req, res) => {
    // Configurar cabeceras para SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Enviar mensaje inicial
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // Obtener nombre de usuario del query param (si existe)
    let userName = req.query.user || "Anónimo";
    // Preferir ID del cliente si lo envía (para reconexiones), si no generar uno
    const clientId =
      req.query.id ||
      Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Verificar si ya existe para evitar duplicados en conexiones zombies
    // Si existe, actualizamos la respuesta (res) para que la vieja muera
    if (!global.sseClients) global.sseClients = [];

    const existingIndex = global.sseClients.findIndex((c) => c.id === clientId);
    if (existingIndex !== -1) {
      global.sseClients[existingIndex].res = res;
      global.sseClients[existingIndex].user = userName; // Actualizar nombre si cambió
    } else {
      const newClient = {
        id: clientId,
        user: userName,
        res,
      };
      global.sseClients.push(newClient);
    }

    // Enviar confirmación de ID al cliente
    res.write(
      `data: ${JSON.stringify({ type: "connection-ack", data: { id: clientId } })}\n\n`,
    );

    // Notificar a todos la nueva lista de usuarios
    broadcastUserList();

    // Si hay llamada activa, notificar estado actual
    if (global.callParticipants && global.callParticipants.length > 0) {
      res.write(
        `data: ${JSON.stringify({
          type: "call-status",
          data: {
            active: true,
            participants: global.callParticipants,
          },
        })}\n\n`,
      );
    }

    // Cuando el cliente se desconecta
    req.on("close", () => {
      // Check si estaba en llamada
      if (global.callParticipants) {
        const wasInCall = global.callParticipants.find(
          (p) => p.id === clientId,
        );
        if (wasInCall) {
          handleLeaveCall(clientId);
        }
      }

      // Filtramos solo si la conexión que se cierra es la actual (por si hubo reconexión rápida)
      // Pero por simplicidad en este entorno local, filtramos por ID
      global.sseClients = global.sseClients.filter((c) => c.id !== clientId);
      broadcastUserList();
    });
  });

  // ========== AUDIO CALL SIGNALING ==========
  global.callParticipants = []; // { id, name }

  expressApp.post("/call/join", (req, res) => {
    const { pin, user, id } = req.body;
    if (pin !== PIN) return res.status(403).json({ error: "PIN incorrecto" });

    if (!global.callParticipants) global.callParticipants = [];

    // Verificar si ya está
    const exists = global.callParticipants.find((p) => p.id === id);
    if (!exists) {
      global.callParticipants.push({ id, name: user });
    }

    // Notificar a todos
    broadcastCallUpdate();

    // Devolver lista de OTROS participantes
    const others = global.callParticipants.filter((p) => p.id !== id);
    res.json({ ok: true, peers: others });
  });

  expressApp.post("/call/leave", (req, res) => {
    const { pin, id } = req.body;
    if (pin !== PIN) return res.status(403).json({ error: "PIN incorrecto" });

    handleLeaveCall(id);
    res.json({ ok: true });
  });

  function handleLeaveCall(id) {
    if (!global.callParticipants) return;

    const initialLength = global.callParticipants.length;
    global.callParticipants = global.callParticipants.filter(
      (p) => p.id !== id,
    );

    if (global.callParticipants.length !== initialLength) {
      if (global.callParticipants.length === 0) {
        console.log("📞 Llamada finalizada (último usuario salió)");
        broadcastCallEnded();
      } else {
        broadcastCallUpdate();
      }
    }
  }

  expressApp.post("/signal", (req, res) => {
    const { pin, targetId, type, data, senderId } = req.body;
    if (pin !== PIN) return res.status(403).json({ error: "PIN incorrecto" });

    // Buscar cliente destino
    const targetClient = global.sseClients.find((c) => c.id === targetId);
    if (targetClient) {
      targetClient.res.write(
        `data: ${JSON.stringify({
          type: "signal",
          data: { senderId, type, data },
        })}\n\n`,
      );
      res.json({ ok: true });
    } else {
      // Si no está, puede que se haya desconectado
      res.status(404).json({ error: "Target not found" });
    }
  });

  function broadcastCallUpdate() {
    if (global.enviarEventoControlRemoto) {
      global.enviarEventoControlRemoto("call-status", {
        active: true,
        participants: global.callParticipants,
      });
    }
  }

  function broadcastCallEnded() {
    if (global.enviarEventoControlRemoto) {
      global.enviarEventoControlRemoto("call-status", {
        active: false,
        participants: [],
      });
    }
  }

  // Endpoint para notificar "Escribiendo..."
  expressApp.post("/typing", (req, res) => {
    const { pin, user, isTyping } = req.body;

    if (pin !== PIN) {
      return res.status(403).json({ ok: false, error: "PIN incorrecto" });
    }

    // Retransmitir evento typing
    if (global.enviarEventoControlRemoto) {
      // Enviamos a todos (el cliente filtrará su propio nombre)
      global.enviarEventoControlRemoto("typing-status", { user, isTyping });
    }

    res.json({ ok: true });
  });

  function broadcastUserList() {
    if (!global.sseClients) return;

    // Obtener lista única de nombres (o objetos con id)
    // Filtramos "Anónimo" si queremos, o los mostramos también
    const users = global.sseClients.map((c) => ({ name: c.user, id: c.id }));

    global.enviarEventoControlRemoto("users-update", {
      count: users.length,
      users,
    });
  }

  // Función para enviar eventos a todos los clientes conectados
  // (La exportaremos al final)
  global.enviarEventoControlRemoto = (tipo, datos) => {
    if (!global.sseClients) return;

    global.sseClients.forEach((client) => {
      client.res.write(
        `data: ${JSON.stringify({ type: tipo, data: datos })}\n\n`,
      );
    });
  };

  // Endpoint para obtener el estado actual de la aplicación
  expressApp.get("/estado", (req, res) => {
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

  // Generar o cargar certificados SSL
  const certPath = path.join(app.getPath("userData"), "certs");
  if (!fs.existsSync(certPath)) {
    fs.mkdirSync(certPath, { recursive: true });
  }

  const certFile = path.join(certPath, "cert.pem");
  const keyFile = path.join(certPath, "key.pem");
  let certOptions = {};

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log("🔐 Cargando certificados SSL existentes...");
    certOptions = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    };
  } else {
    console.log(
      "⚙️ Generando nuevos certificados SSL (esto puede tardar un momento)...",
    );
    const attrs = [{ name: "commonName", value: "HimnarioAdventistaPro" }];
    try {
      // Usar await para esperar la generación
      const pems = await selfsigned.generate(attrs, { days: 365 });

      fs.writeFileSync(certFile, pems.cert);
      fs.writeFileSync(keyFile, pems.private);

      certOptions = {
        key: pems.private,
        cert: pems.cert,
      };
      console.log("✅ Certificados SSL generados correctamente");
    } catch (err) {
      console.error("❌ Error generando certificados SSL:", err);
      // Fallback a HTTP si falla SSL
      remoteServer = expressApp.listen(PORT, "0.0.0.0", () => {
        const localIP = getLocalIP();
        console.warn(
          `⚠️ Iniciando en modo HTTP por fallo en SSL: http://${localIP}:${PORT}`,
        );
      });
      return;
    }
  }

  // Verificar nuevamente si se activó mientras esperábamos (condición de carrera)
  if (remoteServer) {
    console.log(
      "⚠️ El servidor ya fue iniciado por otro proceso, cancelando duplicado.",
    );
    return;
  }

  try {
    const serverInstance = https.createServer(certOptions, expressApp);

    serverInstance.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.log("⚠️ Puerto 3555 ocupado, el servidor ya está corriendo.");
        // Opcional: intentar recuperarlo o notificar que ya existe
      } else {
        console.error("❌ Error del servidor remoto:", e);
      }
    });

    remoteServer = serverInstance.listen(PORT, "0.0.0.0", () => {
      const localIP = getLocalIP();
      console.log(
        `📱 Control remoto seguro activo en: https://${localIP}:${PORT}`,
      );
      console.log(`🔐 PIN de acceso: ${PIN}`);
      console.log(`🌐 Accesible desde la red local`);

      // Actualizar estado global
      global.controlRemotoEstado = {
        activo: true,
        url: `https://${localIP}:${PORT}`,
        pin: PIN,
        puerto: PORT,
        ip: localIP,
      };

      // Enviar la IP y PIN al renderer para mostrarla en la UI
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("control-remoto-iniciado", {
          ip: localIP,
          puerto: PORT,
          url: `https://${localIP}:${PORT}`,
          pin: PIN,
        });
      }
    });
  } catch (err) {
    console.error("❌ Error fatal iniciando servidor https:", err);
  }
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

module.exports = {
  iniciarControlRemoto,
  detenerControlRemoto,
  startRemoteServer: iniciarControlRemoto, // Exponer alias para main.js
  getRemoteStatus: () => global.controlRemotoEstado, // Exponer estado
  getServerInstance: () => remoteServer, // Exponer instancia del servidor para cerrarlo desde fuera
};
