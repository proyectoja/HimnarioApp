// Servidor para el Juego en Vivo - Conexión Bíblica
// Puerto diferente al control remoto (3555) - Usaremos 4000

const https = require("https");
const http = require("http");
const express = require("express");
const selfsigned = require("selfsigned");
const os = require("os");
const path = require("path");

let juegoServer = null;
let io = null; // Socket.IO instance
let salas = new Map(); // PIN -> { formulario, participantes, estado, hostWindow }
let participanteSockets = new Map(); // participanteId -> { socketId, pin }
let socketParticipante = new Map(); // socketId -> participanteId
let mainWindowRef = null;

// Límites de participantes según plan
const LIMITES_PARTICIPANTES = {
  gratis: 5,
  basico: 25,
  premium: Infinity
};

const PUERTO_JUEGO = 4000;

    // Estructura de una sala:
    // {
    //   pin: string,
    //   formularioId: string,
    //   formulario: object,
    //   participantes: Map<participanteId, {id, nombre, puntos, respuestas, socketId}>,
//   hostSocketId: string
// }

function obtenerIPLocal() {
  const ifaces = os.networkInterfaces();
  let ips = [];

  for (const ifaceName of Object.keys(ifaces)) {
    for (const config of ifaces[ifaceName]) {
      if (config.family === "IPv4" && !config.internal) {
        ips.push({
          name: ifaceName.toLowerCase(),
          address: config.address,
        });
      }
    }
  }

  const realIPs = ips.filter((ip) => {
    const isVirtual =
      ip.name.includes("virtual") ||
      ip.name.includes("vmware") ||
      ip.name.includes("vbox") ||
      ip.name.includes("virtualbox") ||
      ip.address.startsWith("192.168.56.") ||
      ip.address.startsWith("192.168.99.");
    return !isVirtual;
  });

  const preferredIP = realIPs.find(
    (ip) =>
      ip.name.includes("wi-fi") ||
      ip.name.includes("wifi") ||
      ip.name.includes("wlan") ||
      ip.name.includes("ethernet") ||
      ip.name.includes("eth"),
  );

  if (preferredIP) return preferredIP.address;
  if (realIPs.length > 0) return realIPs[0].address;
  return "localhost";
}

function generarPIN() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

function obtenerRankingSala(sala) {
  return Array.from(sala.participantes.values())
    .sort((a, b) => b.puntos - a.puntos)
    .map((p, idx) => ({
      posicion: idx + 1,
      id: p.id,
      nombre: p.nombre,
      puntos: p.puntos,
      avatarBase64: p.avatarBase64 || null,
      avatarUrl: p.avatarUrl || null,
    }));
}

function emitirRanking(pin) {
  const sala = salas.get(pin);
  if (!sala || !io) return;
  const ranking = obtenerRankingSala(sala);
  const respondidas = sala.respuestasRecibidas ? sala.respuestasRecibidas.size : 0;
  const totalParticipantes = sala.participantes.size;

  io.to(pin).emit("ranking-actualizado", {
    ranking,
    preguntaActual: sala.preguntaActual,
    totalPreguntas: sala.formulario.preguntas.length,
    estado: sala.estado,
    respondidas,
    totalParticipantes,
  });

  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("ranking-actualizado", {
      ranking,
      preguntaActual: sala.preguntaActual,
      totalPreguntas: sala.formulario.preguntas.length,
      estado: sala.estado,
      respondidas,
      totalParticipantes,
    });
  }
}

function limpiarTimersSala(sala) {
  if (!sala) return;
  if (sala.timerPregunta) {
    clearTimeout(sala.timerPregunta);
    sala.timerPregunta = null;
  }
  if (sala.timerPreparacion) {
    clearTimeout(sala.timerPreparacion);
    sala.timerPreparacion = null;
  }
}

function iniciarPreparacion(pin, proximaPreguntaNumero) {
  const sala = salas.get(pin);
  if (!sala || sala.estado === "terminado") return;

  sala.estado = "preparacion";
  sala.preguntaCerrada = false;
  const segundos = 10;

  io.to(pin).emit("preparacion-siguiente", {
    segundos,
    proximaPregunta: proximaPreguntaNumero,
    totalPreguntas: sala.formulario.preguntas.length,
  });

  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("preparacion-siguiente", {
      segundos,
      proximaPregunta: proximaPreguntaNumero,
      totalPreguntas: sala.formulario.preguntas.length,
    });
    // Notificar al host que oculte el QR
    io.to(sala.hostSocketId).emit("estado-juego-cambio", { estado: "preparacion" });
  }

  sala.timerPreparacion = setTimeout(() => {
    enviarPreguntaActual(pin);
  }, segundos * 1000);
}

function cerrarPreguntaActual(pin, motivo = "tiempo") {
  const sala = salas.get(pin);
  if (!sala || sala.estado === "terminado") return;
  if (sala.preguntaCerrada) return;
  const SEGUNDOS_VISTA_RANKING = 20;

  sala.preguntaCerrada = true;
  if (sala.timerPregunta) {
    clearTimeout(sala.timerPregunta);
    sala.timerPregunta = null;
  }

  const ranking = obtenerRankingSala(sala);
  io.to(pin).emit("mostrar-ranking-pregunta", {
    ranking,
    preguntaActual: sala.preguntaActual + 1,
    totalPreguntas: sala.formulario.preguntas.length,
    motivo,
    respondidas: sala.respuestasRecibidas ? sala.respuestasRecibidas.size : 0,
    totalParticipantes: sala.participantes.size,
    segundosEspera: SEGUNDOS_VISTA_RANKING,
  });

  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("mostrar-ranking-pregunta", {
      ranking,
      preguntaActual: sala.preguntaActual + 1,
      totalPreguntas: sala.formulario.preguntas.length,
      motivo,
      respondidas: sala.respuestasRecibidas ? sala.respuestasRecibidas.size : 0,
      totalParticipantes: sala.participantes.size,
      segundosEspera: SEGUNDOS_VISTA_RANKING,
    });
  }

  const esUltima = sala.preguntaActual >= sala.formulario.preguntas.length - 1;
  if (esUltima) {
    sala.estado = "terminado";
    io.to(pin).emit("juego-terminado", { ranking });
    if (sala.hostSocketId) {
      io.to(sala.hostSocketId).emit("juego-terminado", { ranking });
      io.to(sala.hostSocketId).emit("estado-juego-cambio", { estado: "terminado" });
    }
    return;
  }

  sala.estado = "mostrando-resultados";
  sala.preguntaActual += 1;
  sala.segundosRankingRestantes = SEGUNDOS_VISTA_RANKING;
  sala.contadorPausado = false;

  // Notificar al host que muestre el QR
  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("estado-juego-cambio", { estado: "mostrando-resultados" });
  }

  // Notificar al host que muestre el QR
  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("estado-juego-cambio", { estado: "mostrando-resultados" });
  }

  if (sala.timerPreparacion) {
    clearInterval(sala.timerPreparacion);
    sala.timerPreparacion = null;
  }

  sala.timerPreparacion = setInterval(() => {
    const salaActual = salas.get(pin);
    if (!salaActual) {
      clearInterval(sala.timerPreparacion);
      sala.timerPreparacion = null;
      return;
    }

    if (salaActual.contadorPausado) return;

    salaActual.segundosRankingRestantes -= 1;

    if (salaActual.segundosRankingRestantes <= 0) {
      clearInterval(salaActual.timerPreparacion);
      salaActual.timerPreparacion = null;
      salaActual.segundosRankingRestantes = 0;
      enviarPreguntaActual(pin);
    }
  }, 1000);
}

function enviarPreguntaActual(pin) {
  const sala = salas.get(pin);
  if (!sala || sala.estado === "terminado") return;
  if (sala.preguntaActual < 0 || sala.preguntaActual >= sala.formulario.preguntas.length) {
    return;
  }

  const pregunta = sala.formulario.preguntas[sala.preguntaActual];
  const tiempoLimite = sala.formulario.tiempoLimitePorPregunta || 30;

  sala.estado = "jugando";
  sala.inicioTemporizado = Date.now();
  sala.respuestasRecibidas = new Set();
  sala.preguntaCerrada = false;
    sala.contadorPausado = false;
    sala.segundosRankingRestantes = 0;

  // Notificar al host que oculte el QR
  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("estado-juego-cambio", { estado: "jugando" });
  }

  io.to(pin).emit("iniciar-pregunta", {
    pregunta: {
      texto: pregunta.texto,
      imagenBase64: pregunta.imagenBase64,
      opciones: pregunta.opciones.map((op) => ({ texto: op.texto })),
    },
    numeroPregunta: sala.preguntaActual + 1,
    totalPreguntas: sala.formulario.preguntas.length,
    tiempoLimite,
    respondidas: 0,
    totalParticipantes: sala.participantes.size,
  });

  if (sala.hostSocketId) {
    io.to(sala.hostSocketId).emit("pregunta-iniciada", {
      pregunta: {
        texto: pregunta.texto,
        imagenBase64: pregunta.imagenBase64,
        opciones: pregunta.opciones.map((op, idx) => ({ 
          texto: op.texto,
          correcta: op.correcta === true,
          indice: idx
        })),
      },
      numeroPregunta: sala.preguntaActual + 1,
      totalPreguntas: sala.formulario.preguntas.length,
      tiempoLimite,
      respondidas: 0,
      totalParticipantes: sala.participantes.size,
    });
  }

  sala.timerPregunta = setTimeout(() => {
    cerrarPreguntaActual(pin, "tiempo");
  }, tiempoLimite * 1000 + 500);
}

function iniciarServidorJuego(mainWindow) {
  if (juegoServer) {
    console.log("[JUEGO] El servidor ya está activo.");
    const localIP = obtenerIPLocal();
    return {
      url: `http://${localIP}:${PUERTO_JUEGO}`,
      puerto: PUERTO_JUEGO,
      ip: localIP,
    };
  }

  const app = express();
  app.use(express.json());
  app.use(express.static(__dirname + "/src"));
  app.use("/avatars", express.static(path.join(__dirname, "src", "avatars")));
  app.use("/avantars", express.static(path.join(__dirname, "src", "avantars")));

  // Página de participante
  app.get("/juego", (req, res) => {
    const pinSala = String(req.query.pin || "").trim();
    if (!pinSala) {
      res.status(400).send("Falta el parámetro pin");
      return;
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Conexión Bíblica - Participante</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            height: 100%;
            overflow: hidden;
          }
          body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background: radial-gradient(circle at top, #213d75 0%, #0d1f47 55%, #08152f 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
          }
          .container {
            width: 100%;
            max-width: 720px;
            height: min(96vh, 900px);
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 22px;
            padding: 18px;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(6px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          #login-screen,
          #waiting-screen,
          #pregunta-screen,
          #preparacion-screen,
          #ranking-screen,
          #resultado-screen {
            flex: 1;
            min-height: 0;
            overflow: auto;
          }

          h1 {
            text-align: center;
            margin-bottom: 14px;
            font-size: clamp(28px, 3.2vh, 30px);
            letter-spacing: 0.4px;
            flex-shrink: 0;
          }
          .pin-display {
            background: rgba(255, 255, 255, 0.15);
            padding: 15px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 25px;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 4px;
          }

          .profile-editor {
            display: flex;
            gap: 16px;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 14px;
            background: rgba(2, 10, 30, 0.45);
          }

          .profile-preview {
            width: 76px;
            height: 76px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3868d8 0%, #2ec7f0 100%);
            border: 2px solid rgba(255, 255, 255, 0.25);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .profile-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: none;
          }

          .profile-initial {
            font-size: 30px;
            font-weight: 800;
            color: #fff;
          }

          .profile-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .profile-actions-row {
            display: flex;
            gap: 8px;
          }

          .btn-secondary {
            width: 100%;
            padding: 10px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }

          .profile-hint {
            font-size: 12px;
            opacity: 0.78;
          }

          input {
            width: 100%;
            padding: 15px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            font-size: 16px;
            margin-bottom: 15px;
            background: rgba(255, 255, 255, 0.9);
          }
          button {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, #27b55f 0%, #39d98a 100%);
            color: white;
            transition: transform 0.2s, filter 0.2s;
          }
          button:hover {
            transform: scale(1.02);
            filter: brightness(1.05);
          }
          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .pregunta-container {
            display: none;
            text-align: center;
          }
          .pregunta-texto {
            font-size: 22px;
            margin-bottom: 20px;
            font-weight: 700;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .respuestas-status {
            text-align: center;
            font-size: 14px;
            margin: 0 0 12px;
            opacity: 0.9;
            padding: 7px 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.12);
          }
          .pregunta-imagen {
            max-width: 100%;
            max-height: min(32vh, 250px);
            border-radius: 12px;
            margin: 0 auto 14px auto;
            display: block;
          }
          .opciones {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-bottom: 8px;
          }
          .opcion-btn {
            padding: 18px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            color: white;
            cursor: pointer;
            transition: all 0.3s;
            text-align: left;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
            line-height: 1.35;
            max-width: 100%;
          }
          .opcion-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
          .opcion-btn.correcta {
            background: linear-gradient(135deg, #27b55f 0%, #39d98a 100%);
            border-color: #39d98a;
          }
          .opcion-btn.incorrecta {
            background: linear-gradient(135deg, #e04949 0%, #f06565 100%);
            border-color: #f06565;
          }
          .timer {
            font-size: 48px;
            font-weight: 800;
            text-align: center;
            margin-bottom: 20px;
            color: #ffd700;
          }
          .esperando {
            text-align: center;
            font-size: 18px;
            opacity: 0.9;
            animation: pulse 2s infinite;
          }
          .puntos-display {
            text-align: center;
            font-size: 24px;
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 12px;
          }

          .preparacion-screen,
          .ranking-screen,
          .final-screen {
            display: none;
          }

          .prep-titulo {
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            opacity: 0.95;
            margin-bottom: 14px;
          }

          .prep-timer {
            font-size: 72px;
            font-weight: 900;
            text-align: center;
            color: #ffd54f;
            text-shadow: 0 0 16px rgba(255, 213, 79, 0.35);
            margin: 6px 0 14px;
          }

          .ranking-title {
            text-align: center;
            margin-bottom: 12px;
            font-size: 22px;
            font-weight: 800;
          }

          .ranking-sub {
            text-align: center;
            opacity: 0.8;
            margin-bottom: 12px;
          }

          .ranking-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow: auto;
            min-height: 0;
          }

          .ranking-item {
            display: grid;
            grid-template-columns: 34px 42px 1fr auto;
            align-items: center;
            gap: 8px;
            padding: 9px 10px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: transform 0.25s ease, background 0.25s ease;
          }

          .ranking-item.pos-1 { background: linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.12)); }
          .ranking-item.pos-2 { background: linear-gradient(135deg, rgba(192,192,192,0.25), rgba(192,192,192,0.12)); }
          .ranking-item.pos-3 { background: linear-gradient(135deg, rgba(205,127,50,0.25), rgba(205,127,50,0.12)); }
          .ranking-item.up { transform: translateY(-2px) scale(1.01); }

          .ranking-pos {
            font-size: 18px;
            font-weight: 900;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }

          .ranking-medal {
            font-size: 16px;
            line-height: 1;
          }

          .ranking-crown {
            width: 14px;
            height: 14px;
            object-fit: contain;
            vertical-align: middle;
          }

          .ranking-avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.25);
            background: rgba(255,255,255,0.1);
          }

          .ranking-avatar-fallback {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            background: linear-gradient(135deg, #3a66d8, #2dc6ef);
          }

          .ranking-name {
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .ranking-points {
            font-weight: 800;
            color: #ffd700;
          }

          #avatar-file {
            display: none;
          }

          @media (max-width: 600px) {
            body {
              padding: 8px;
            }

            .container {
              height: 100vh;
              max-width: 100vw;
              border-radius: 14px;
              padding: 12px;
            }

            h1 {
              font-size: 24px;
              margin-bottom: 10px;
            }

            .pin-display {
              font-size: 16px;
              letter-spacing: 2px;
              padding: 10px;
              margin-bottom: 14px;
            }

            .profile-editor {
              gap: 10px;
              padding: 10px;
            }

            .profile-actions-row {
              flex-direction: column;
            }

            .pregunta-texto {
              font-size: 19px;
              margin-bottom: 12px;
            }

            .opciones {
              gap: 8px;
            }

            .opcion-btn {
              padding: 12px;
              font-size: 15px;
            }

            .timer {
              font-size: 40px;
              margin-bottom: 12px;
            }

            .ranking-item {
              grid-template-columns: 28px 36px 1fr auto;
              gap: 6px;
              padding: 8px;
            }

            .ranking-name {
              min-width: 0;
            }
          }

          @keyframes pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }

          .cbq-confetti-overlay {
            position: fixed;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
            z-index: 9999;
          }

          .cbq-confetti-piece {
            position: absolute;
            top: -24px;
            width: 10px;
            height: 16px;
            border-radius: 3px;
            opacity: 0.95;
            animation: cbq-confetti-fall linear forwards;
            will-change: transform, opacity;
          }

          @keyframes cbq-confetti-fall {
            0% {
              transform: translateY(-10vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(115vh) rotate(720deg);
              opacity: 0.15;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Conexión Bíblica</h1>
          
          <div id="login-screen">
            <div class="profile-editor">
              <div class="profile-preview" id="profile-preview">
                <img id="profile-image" alt="Avatar" />
                <span id="profile-initial" class="profile-initial">U</span>
              </div>

              <div class="profile-actions">
                <div class="profile-actions-row">
                  <button type="button" class="btn-secondary" id="btn-upload-avatar">Subir foto</button>
                  <button type="button" class="btn-secondary" id="btn-default-avatar">Usar avatar</button>
                </div>
                <span class="profile-hint">Himnario Adventista Pro</span>
              </div>
            </div>

            <input type="file" id="avatar-file" accept="image/*" />
            <input type="text" id="nombre-input" placeholder="Escribe tu nombre" maxlength="30" />
            <button onclick="unirse()">Unirse al Juego</button>
          </div>
          
          <div id="waiting-screen" style="display: none;">
            <div class="esperando">Esperando que el host inicie el juego...</div>
            <div class="puntos-display">Puntos: <span id="puntos">0</span></div>
          </div>
          
          <div id="pregunta-screen" class="pregunta-container">
            <div class="timer" id="timer"></div>
            <div class="pregunta-texto" id="pregunta-texto"></div>
            <div class="respuestas-status" id="respuestas-status">Respondieron: 0/0</div>
            <img id="pregunta-imagen" class="pregunta-imagen" style="display: none;" />
            <div class="opciones" id="opciones-container"></div>
          </div>

          <div id="preparacion-screen" class="preparacion-screen">
            <div class="prep-titulo" id="prep-text">Preparando siguiente pregunta...</div>
            <div class="prep-timer" id="prep-timer">10</div>
          </div>

          <div id="ranking-screen" class="ranking-screen">
            <div class="ranking-title">Tabla en vivo</div>
            <div class="ranking-sub" id="ranking-sub">Posiciones en tiempo real</div>
            <div id="ranking-list" class="ranking-list"></div>
          </div>

          <div id="resultado-screen" class="final-screen">
            <h2 style="text-align:center; margin-bottom:10px;">Resultado Final</h2>
            <div id="final-ranking-list" class="ranking-list"></div>
          </div>
        </div>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const pin = "${pinSala}";
          let socket = null;
          let miId = null;
          let puntos = 0;
          let respuestaEnviada = false;
          let timerInterval = null;
          let prepInterval = null;
          let rankingCountdownInterval = null;
          let avatarBase64 = localStorage.getItem("cbq_avatar_base64") || "";
          let avatarUrl = localStorage.getItem("cbq_avatar_url") || "";
          let lastRankingPos = new Map();
          let confetiInterval = null;

          const avatarCandidates = [
            "/avatars/avatar1.png",
            "/avatars/avatar2.png",
            "/avatars/avatar3.png",
            "/avatars/avatar4.png",
            "/avatars/avatar5.png",
            "/avatars/avatar6.png",
            "/avantars/avatar1.png",
            "/avantars/avatar2.png",
            "/avantars/avatar3.png",
            "/avantars/avatar4.png",
            "/avantars/avatar5.png",
            "/avantars/avatar6.png"
          ];

          function inicialNombre() {
            const nombre = (document.getElementById("nombre-input").value || "U").trim();
            return (nombre.charAt(0) || "U").toUpperCase();
          }

          function renderAvatarPreview() {
            const img = document.getElementById("profile-image");
            const initial = document.getElementById("profile-initial");
            initial.textContent = inicialNombre();

            const source = avatarBase64 || avatarUrl;
            if (source) {
              img.src = source;
              img.style.display = "block";
              initial.style.display = "none";
              img.onerror = () => {
                img.style.display = "none";
                initial.style.display = "flex";
              };
            } else {
              img.style.display = "none";
              initial.style.display = "flex";
            }
          }

          function imageExists(url) {
            return new Promise((resolve) => {
              const test = new Image();
              test.onload = () => resolve(true);
              test.onerror = () => resolve(false);
              test.src = url;
            });
          }

          async function resolverAvatarPorDefecto() {
            const guardado = Number(localStorage.getItem("cbq_avatar_idx") || 0);
            for (let i = 0; i < avatarCandidates.length; i++) {
              const idx = (guardado + i) % avatarCandidates.length;
              const candidate = avatarCandidates[idx];
              if (await imageExists(candidate)) {
                avatarBase64 = "";
                avatarUrl = candidate;
                localStorage.setItem("cbq_avatar_url", avatarUrl);
                localStorage.removeItem("cbq_avatar_base64");
                localStorage.setItem("cbq_avatar_idx", String((idx + 1) % avatarCandidates.length));
                renderAvatarPreview();
                return;
              }
            }

            avatarBase64 = "";
            avatarUrl = "";
            localStorage.removeItem("cbq_avatar_base64");
            localStorage.removeItem("cbq_avatar_url");
            renderAvatarPreview();
          }

          function bindAvatarUI() {
            const btnUpload = document.getElementById("btn-upload-avatar");
            const btnDefault = document.getElementById("btn-default-avatar");
            const inputFile = document.getElementById("avatar-file");
            const nombreInput = document.getElementById("nombre-input");

            btnUpload.addEventListener("click", () => inputFile.click());
            btnDefault.addEventListener("click", resolverAvatarPorDefecto);

            inputFile.addEventListener("change", () => {
              const file = inputFile.files && inputFile.files[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (event) => {
                avatarBase64 = String(event.target.result || "");
                avatarUrl = "";
                localStorage.setItem("cbq_avatar_base64", avatarBase64);
                localStorage.removeItem("cbq_avatar_url");
                renderAvatarPreview();
              };
              reader.readAsDataURL(file);
            });

            nombreInput.addEventListener("input", renderAvatarPreview);
          }

          function obtenerSessionIdPestana() {
            const key = "cbq_session_tab_id";
            let sid = sessionStorage.getItem(key);
            if (!sid) {
              if (window.crypto && typeof window.crypto.randomUUID === "function") {
                sid = window.crypto.randomUUID();
              } else {
                sid = "sid-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
              }
              sessionStorage.setItem(key, sid);
            }
            return sid;
          }

          function lanzarConfetiCelebracion(segundos = 10) {
            if (confetiInterval) {
              clearInterval(confetiInterval);
              confetiInterval = null;
            }

            const previo = document.getElementById("cbq-confetti-overlay");
            if (previo) previo.remove();

            const overlay = document.createElement("div");
            overlay.id = "cbq-confetti-overlay";
            overlay.className = "cbq-confetti-overlay";
            document.body.appendChild(overlay);

            const colores = ["#f5c97b", "#f59e0b", "#f97316", "#8a503b", "#d7a48f", "#fde68a"];
            const crearPieza = () => {
              const pieza = document.createElement("span");
              pieza.className = "cbq-confetti-piece";
              pieza.style.left = Math.random() * 100 + "%";
              pieza.style.background = colores[Math.floor(Math.random() * colores.length)];
              pieza.style.animationDuration = (2.8 + Math.random() * 2.2) + "s";
              overlay.appendChild(pieza);
              setTimeout(() => pieza.remove(), 5500);
            };

            for (let i = 0; i < 120; i++) crearPieza();

            confetiInterval = setInterval(() => {
              for (let i = 0; i < 18; i++) crearPieza();
            }, 320);

            setTimeout(() => {
              if (confetiInterval) {
                clearInterval(confetiInterval);
                confetiInterval = null;
              }
              setTimeout(() => overlay.remove(), 1800);
            }, Math.max(1, Number(segundos)) * 1000);
          }
          
          function unirse() {
            const nombre = document.getElementById("nombre-input").value.trim();
            if (!nombre) {
              alert("Por favor ingresa tu nombre");
              return;
            }
            
            socket = io({
              forceNew: true,
              reconnection: false,
              query: { pin, tipo: "participante", tabId: obtenerSessionIdPestana() }
            });
            
            socket.on("connect", () => {
              console.log("Conectado al servidor");
              socket.emit("participante-unirse", {
                nombre,
                avatarBase64: avatarBase64 || null,
                avatarUrl: avatarUrl || null,
              });
            });
            
            socket.on("union-exitosa", (data) => {
              miId = data.participanteId;
              document.getElementById("login-screen").style.display = "none";
              document.getElementById("waiting-screen").style.display = "block";
            });
            
            socket.on("iniciar-pregunta", (data) => {
              respuestaEnviada = false;
              mostrarPregunta(data);
            });

            socket.on("preparacion-siguiente", (data) => {
              mostrarPreparacion(data);
            });

            socket.on("ranking-actualizado", (data) => {
              actualizarEstadoRespuestas(data);
              mostrarRankingVivo(data.ranking || [], false, data);
            });

            socket.on("mostrar-ranking-pregunta", (data) => {
              actualizarEstadoRespuestas(data);
              mostrarRankingVivo(data.ranking || [], true, data);
            });
            
            socket.on("mostrar-resultado", (data) => {
              mostrarResultado(data);
            });
            
            socket.on("juego-terminado", (data) => {
              detenerTimer();
              detenerPreparacion();
              detenerCountdownRanking();
              mostrarPantalla("resultado-screen");
              renderRankingLista("final-ranking-list", data.ranking || [], true);
              lanzarConfetiCelebracion(10);
            });
            
            socket.on("error", (msg) => {
              alert(msg);
            });
          }

          function mostrarPantalla(screenId) {
            [
              "login-screen",
              "waiting-screen",
              "pregunta-screen",
              "preparacion-screen",
              "ranking-screen",
              "resultado-screen",
            ].forEach((id) => {
              const el = document.getElementById(id);
              if (el) el.style.display = id === screenId ? "block" : "none";
            });
          }
          
          function mostrarPregunta(data) {
            detenerTimer();
            detenerPreparacion();
            detenerCountdownRanking();
            mostrarPantalla("pregunta-screen");
            actualizarEstadoRespuestas(data);
            
            document.getElementById("pregunta-texto").textContent = data.pregunta.texto;
            
            const img = document.getElementById("pregunta-imagen");
            if (data.pregunta.imagenBase64) {
              img.src = data.pregunta.imagenBase64;
              img.style.display = "block";
            } else {
              img.style.display = "none";
            }
            
            const container = document.getElementById("opciones-container");
            container.innerHTML = "";
            const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            
            data.pregunta.opciones.forEach((opcion, idx) => {
              const btn = document.createElement("button");
              btn.className = "opcion-btn";
              const prefijo = letras[idx] ? letras[idx] + ") " : (idx + 1) + ") ";
              btn.textContent = prefijo + opcion.texto;
              btn.onclick = () => enviarRespuesta(idx);
              container.appendChild(btn);
            });
            
            iniciarTimer(data.tiempoLimite);
          }

          function actualizarEstadoRespuestas(data) {
            const el = document.getElementById("respuestas-status");
            if (!el) return;

            const total = Number(data && data.totalParticipantes);
            const respondidas = Number(data && data.respondidas);
            const totalSeguro = Number.isFinite(total) && total >= 0 ? total : 0;
            const respondidasSeguro = Number.isFinite(respondidas) && respondidas >= 0 ? respondidas : 0;
            el.textContent = "Respondieron: " + respondidasSeguro + "/" + totalSeguro;
          }
          
          function enviarRespuesta(opcionIdx) {
            if (respuestaEnviada) return;
            respuestaEnviada = true;
            
            socket.emit("responder", { participanteId: miId, opcionIdx });
            
            // Deshabilitar botones
            document.querySelectorAll(".opcion-btn").forEach(btn => {
              btn.disabled = true;
              btn.style.opacity = "0.6";
            });
          }
          
          function mostrarResultado(data) {
            detenerTimer();
            
            const opciones = document.querySelectorAll(".opcion-btn");
            opciones.forEach((btn, idx) => {
              if (idx === data.correcta) {
                btn.classList.add("correcta");
              } else if (idx === data.seleccionada && idx !== data.correcta) {
                btn.classList.add("incorrecta");
              }
            });
            
            if (data.puntosGanados > 0) {
              puntos += data.puntosGanados;
              document.getElementById("puntos").textContent = puntos;
            }

            mostrarPantalla("ranking-screen");
          }

          function mostrarPreparacion(data) {
            detenerTimer();
            detenerPreparacion();
            detenerCountdownRanking();
            const texto = document.getElementById("prep-text");
            const timerEl = document.getElementById("prep-timer");
            let restante = Number(data.segundos || 10);

            texto.textContent = data.proximaPregunta
              ? "Próxima pregunta: " + data.proximaPregunta + " / " + (data.totalPreguntas || "")
              : "Preparando siguiente pregunta...";
            timerEl.textContent = restante;
            mostrarPantalla("preparacion-screen");

            prepInterval = setInterval(() => {
              restante -= 1;
              timerEl.textContent = Math.max(0, restante);
              if (restante <= 0) {
                detenerPreparacion();
              }
            }, 1000);
          }

          function detenerPreparacion() {
            if (prepInterval) {
              clearInterval(prepInterval);
              prepInterval = null;
            }
          }

          function renderAvatarRanking(item) {
            if (item.avatarBase64 || item.avatarUrl) {
              const src = item.avatarBase64 || item.avatarUrl;
              return '<img class="ranking-avatar" src="' + src + '" alt="avatar" onerror="this.style.display=&quot;none&quot;; this.nextElementSibling.style.display=&quot;flex&quot;;"/><span class="ranking-avatar-fallback" style="display:none;">' + (item.nombre || "?").charAt(0).toUpperCase() + '</span>';
            }
            return '<span class="ranking-avatar-fallback">' + (item.nombre || "?").charAt(0).toUpperCase() + '</span>';
          }

          function renderRankingLista(containerId, ranking, esFinal = false) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = ranking
              .map((item) => {
                const prevPos = lastRankingPos.get(item.id);
                const claseMovimiento = prevPos && item.posicion < prevPos ? "up" : "";
                lastRankingPos.set(item.id, item.posicion);
                const topClass = item.posicion <= 3 ? ' pos-' + item.posicion : '';
                const medal = item.posicion === 1
                  ? '<span class="ranking-medal">🥇</span><img class="ranking-crown" src="/iconos/corona.png" alt="corona" onerror="this.style.display=&quot;none&quot;" />'
                  : item.posicion === 2
                    ? '<span class="ranking-medal">🥈</span>'
                    : item.posicion === 3
                      ? '<span class="ranking-medal">🥉</span>'
                      : '';

                return '<div class="ranking-item' + topClass + ' ' + claseMovimiento + '"><div class="ranking-pos">' + medal + '#'+ item.posicion + '</div><div>' + renderAvatarRanking(item) + '</div><div class="ranking-name">' + item.nombre + '</div><div class="ranking-points">' + item.puntos + ' pts</div></div>';
              })
              .join("");

            if (!ranking.length) {
              container.innerHTML = '<div class="ranking-sub">Aún sin participantes</div>';
            }

            if (esFinal) {
              const sub = document.getElementById("ranking-sub");
              if (sub) sub.textContent = "";
            }
          }

          function mostrarRankingVivo(ranking, consolidado, data = {}) {
            renderRankingLista("ranking-list", ranking, false);
            const sub = document.getElementById("ranking-sub");
            if (sub) {
              if (consolidado) {
                iniciarCountdownRanking(Number(data.segundosEspera || 10));
              } else {
                detenerCountdownRanking();
                const total = Number(data.totalParticipantes || 0);
                const respondidas = Number(data.respondidas || 0);
                sub.textContent = "Respondieron " + respondidas + " de " + total + ". Esperando al resto...";
              }
            }
            if (
              consolidado &&
              document.getElementById("resultado-screen").style.display !== "block"
            ) {
              mostrarPantalla("ranking-screen");
            }
          }

          function iniciarCountdownRanking(segundos) {
            const sub = document.getElementById("ranking-sub");
            if (!sub) return;
            detenerCountdownRanking();

            let restante = Number.isFinite(segundos) && segundos > 0 ? Math.floor(segundos) : 10;
            sub.textContent = "Todos respondieron. Siguiente pregunta en " + restante + "s";

            rankingCountdownInterval = setInterval(() => {
              restante -= 1;
              if (restante <= 0) {
                detenerCountdownRanking();
                sub.textContent = "Iniciando siguiente pregunta...";
                return;
              }
              sub.textContent = "Todos respondieron. Siguiente pregunta en " + restante + "s";
            }, 1000);
          }

          function detenerCountdownRanking() {
            if (rankingCountdownInterval) {
              clearInterval(rankingCountdownInterval);
              rankingCountdownInterval = null;
            }
          }
          
          function iniciarTimer(segundos) {
            let restante = segundos;
            document.getElementById("timer").textContent = restante;
            
            timerInterval = setInterval(() => {
              restante--;
              document.getElementById("timer").textContent = restante;
              
              if (restante <= 0) {
                detenerTimer();
                if (!respuestaEnviada) {
                  enviarRespuesta(-1); // Sin respuesta
                }
              }
            }, 1000);
          }
          
          function detenerTimer() {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          }

          bindAvatarUI();
          renderAvatarPreview();
          if (!avatarBase64 && !avatarUrl) {
            resolverAvatarPorDefecto();
          }
        </script>
      </body>
      </html>
    `);
  });

  app.get("/juego/:pin", (req, res) => {
    const pin = encodeURIComponent(String(req.params.pin || "").trim());
    res.redirect(`/juego?pin=${pin}`);
  });

  // Usar HTTP para evitar problemas con certificados SSL
  const serverInstance = http.createServer(app);
  console.log("[JUEGO] Servidor HTTP creado");

  // Inicializar Socket.IO
  io = require("socket.io")(serverInstance, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Manejar conexiones Socket.IO
  io.on("connection", (socket) => {
    const { pin, nombre, tipo } = socket.handshake.query;

    console.log(`[JUEGO] Nueva conexión: ${tipo} - PIN: ${pin} - Nombre: ${nombre || "Host"}`);

    if (tipo === "host") {
      // Conexión del host
      const sala = salas.get(pin);
      if (sala) {
        sala.hostSocketId = socket.id;
        socket.join(pin);
        socket.emit("sala-actualizada", {
          participantes: Array.from(sala.participantes.values()),
          estado: sala.estado,
        });
        // Enviar estado inicial para controlar el QR
        socket.emit("estado-juego-cambio", { estado: sala.estado });
      }
    } else if (tipo === "participante") {
      socket.on("participante-unirse", (payload = {}) => {
        const sala = salas.get(pin);
        if (!sala) {
          socket.emit("error", "Sala no encontrada");
          return;
        }

        if (socketParticipante.has(socket.id)) {
          socket.emit("error", "Esta sesión ya está unida a la sala");
          return;
        }

        // Permitir unirse solo si está esperando o mostrando resultados (entre rondas)
        if (sala.estado !== "esperando" && sala.estado !== "mostrando-resultados") {
          socket.emit("error", "El juego está en curso. Espera a que termine la ronda actual.");
          return;
        }

        // Validar límite de participantes según plan
        const cantidadActual = sala.participantes.size;
        const limite = sala.maxParticipantes;
        if (cantidadActual >= limite) {
          const mensaje = limite === LIMITES_PARTICIPANTES.gratis 
            ? `Límite alcanzado. El plan GRATIS permite máximo ${limite} participantes. Actualiza a BÁSICO (25) o PREMIUM (ilimitado).`
            : limite === LIMITES_PARTICIPANTES.basico
            ? `Límite alcanzado. El plan BÁSICO permite máximo ${limite} participantes. Actualiza a PREMIUM para participantes ilimitados.`
            : `Límite alcanzado (${limite} participantes).`;
          socket.emit("error", mensaje);
          return;
        }

        const participanteId = `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const nombreFinal = String(payload.nombre || "").trim() || `Jugador ${sala.participantes.size + 1}`;
        const avatarBase64 = typeof payload.avatarBase64 === "string" ? payload.avatarBase64 : null;
        const avatarUrl = typeof payload.avatarUrl === "string" ? payload.avatarUrl : null;

        const participante = {
          id: participanteId,
          nombre: nombreFinal,
          puntos: 0,
          respuestas: [],
          socketId: socket.id,
          avatarBase64,
          avatarUrl,
        };

        sala.participantes.set(participanteId, participante);
        participanteSockets.set(participanteId, { socketId: socket.id, pin });
  socketParticipante.set(socket.id, participanteId);
        socket.join(pin);
        socket.emit("union-exitosa", { participanteId });

        if (sala.hostSocketId) {
          io.to(sala.hostSocketId).emit("participante-unido", {
            participante,
            total: sala.participantes.size,
          });
        }
      });
    }

    // Evento: Responder pregunta
    socket.on("responder", (data) => {
      const participanteId = socketParticipante.get(socket.id);
      if (!participanteId) {
        socket.emit("error", "Sesión de participante no válida");
        return;
      }

      const socketInfo = participanteSockets.get(participanteId);
      
      if (!socketInfo || socketInfo.socketId !== socket.id) {
        socket.emit("error", "ID de participante inválido");
        return;
      }

      const sala = salas.get(socketInfo.pin);
      if (!sala) return;
      if (sala.estado !== "jugando") return;

      const participante = sala.participantes.get(participanteId);
      if (!participante) return;
      if (sala.respuestasRecibidas && sala.respuestasRecibidas.has(participanteId)) return;

      const preguntaActual = sala.formulario.preguntas[sala.preguntaActual];
      const opcionIdx = data.opcionIdx;
      const esCorrecta = opcionIdx >= 0 && preguntaActual.opciones[opcionIdx]?.correcta;

      // Calcular puntos basado en velocidad
      const tiempoTranscurrido = Date.now() - sala.inicioTemporizado;
      const tiempoLimite = (sala.formulario.tiempoLimitePorPregunta || 30) * 1000;
      let puntosGanados = 0;

      if (esCorrecta) {
        const porcentajeTiempo = 1 - tiempoTranscurrido / tiempoLimite;
        puntosGanados = Math.max(100, Math.round(1000 * porcentajeTiempo));
        participante.puntos += puntosGanados;
      }

      participante.respuestas.push({
        preguntaIdx: sala.preguntaActual,
        opcionIdx,
        esCorrecta,
        puntosGanados,
        tiempoRespuesta: tiempoTranscurrido,
      });

      if (!sala.respuestasRecibidas) sala.respuestasRecibidas = new Set();
      sala.respuestasRecibidas.add(participanteId);

      // Enviar resultado al participante
      const correctaIdx = preguntaActual.opciones.findIndex((op) => op.correcta);
      socket.emit("mostrar-resultado", {
        correcta: correctaIdx,
        seleccionada: opcionIdx,
        puntosGanados,
      });

      emitirRanking(sala.pin);

      // Notificar al host
      if (sala.hostSocketId) {
        io.to(sala.hostSocketId).emit("respuesta-recibida", {
          participanteId: participante.id,
          nombre: participante.nombre,
          esCorrecta,
          puntosGanados,
          respondidas: sala.respuestasRecibidas.size,
          totalParticipantes: sala.participantes.size,
        });
      }

      if (sala.respuestasRecibidas.size >= sala.participantes.size) {
        // Notificar al host que todos respondieron
        if (sala.hostSocketId) {
          const correctaIdx = preguntaActual.opciones.findIndex((op) => op.correcta);
          io.to(sala.hostSocketId).emit("todos-respondieron", {
            respuestaCorrecta: correctaIdx,
          });
        }
        cerrarPreguntaActual(sala.pin, "todos");
      }
    });

    // Evento: Pausar/Reanudar contador de 10s (solo host)
    socket.on("pausar-contador", (data = {}) => {
      const pinSala = String(data.pin || "").trim();
      const sala = salas.get(pinSala);
      if (!sala) return;
      if (sala.hostSocketId !== socket.id) return;
      if (sala.estado !== "mostrando-resultados") return;

      sala.contadorPausado = Boolean(data.pausado);

      if (sala.hostSocketId) {
        io.to(sala.hostSocketId).emit("estado-contador-host", {
          pausado: sala.contadorPausado,
          segundosRestantes: sala.segundosRankingRestantes,
        });
      }
    });

    // Desconexión
    socket.on("disconnect", () => {
      console.log(`[JUEGO] Desconexión: ${socket.id}`);

      for (const [pinSala, sala] of salas.entries()) {
        if (sala.hostSocketId === socket.id) {
          sala.hostSocketId = null;
        }
      }

      // Buscar participante por socket.id
      Array.from(participanteSockets.entries()).forEach(([pid, info]) => {
        if (info.socketId === socket.id) {
          const sala = salas.get(info.pin);
          if (sala && sala.participantes.has(pid)) {
            const participante = sala.participantes.get(pid);
            sala.participantes.delete(pid);
            participanteSockets.delete(pid);
            socketParticipante.delete(socket.id);

            if (sala.hostSocketId) {
              io.to(sala.hostSocketId).emit("participante-desconectado", {
                participanteId: participante.id,
                nombre: participante.nombre,
              });
            }

            if (sala.respuestasRecibidas && sala.respuestasRecibidas.has(pid)) {
              sala.respuestasRecibidas.delete(pid);
            }

            if (sala.estado === "jugando" && sala.participantes.size > 0 && sala.respuestasRecibidas && sala.respuestasRecibidas.size >= sala.participantes.size) {
              cerrarPreguntaActual(info.pin, "todos");
            }
          }
        }
      });

      socketParticipante.delete(socket.id);
    });
  });

  // Iniciar servidor
  juegoServer = serverInstance.listen(PUERTO_JUEGO, "0.0.0.0", () => {
    const localIP = obtenerIPLocal();
    console.log(`[JUEGO] Servidor activo en http://${localIP}:${PUERTO_JUEGO}`);
    
    if (mainWindow) {
      mainWindow.webContents.send("juego-servidor-listo", {
        url: `http://${localIP}:${PUERTO_JUEGO}`,
        puerto: PUERTO_JUEGO,
        ip: localIP,
      });
    }
  });

  const localIPFinal = obtenerIPLocal();
  return {
    url: `http://${localIPFinal}:${PUERTO_JUEGO}`,
    puerto: PUERTO_JUEGO,
    ip: localIPFinal,
  };
}

function crearSala(formulario) {
  const pin = generarPIN();
  const planTipo = formulario.planTipo || "gratis";
  
  salas.set(pin, {
    pin,
    formularioId: formulario.id,
    formulario,
    planTipo,
    maxParticipantes: LIMITES_PARTICIPANTES[planTipo] || LIMITES_PARTICIPANTES.gratis,
    participantes: new Map(),
    estado: "esperando",
    preguntaActual: -1,
    inicioTemporizado: null,
    hostSocketId: null,
    respuestasRecibidas: new Set(),
    preguntaCerrada: false,
    timerPregunta: null,
    timerPreparacion: null,
  });

  return pin;
}

function iniciarJuego(pin) {
  const sala = salas.get(pin);
  if (!sala) return { ok: false, error: "Sala no encontrada" };

  if (sala.participantes.size === 0) {
    return { ok: false, error: "No hay participantes" };
  }

  if (sala.estado !== "esperando" && sala.estado !== "terminado") {
    return { ok: false, error: "El juego ya está en curso" };
  }

  limpiarTimersSala(sala);

  sala.participantes.forEach((p) => {
    p.puntos = 0;
    p.respuestas = [];
  });

  sala.estado = "preparacion";
  sala.preguntaActual = 0;
  sala.respuestasRecibidas = new Set();
  sala.preguntaCerrada = false;

  emitirRanking(pin);
  iniciarPreparacion(pin, 1);

  return { ok: true };
}

function siguientePregunta(pin) {
  enviarPreguntaActual(pin);
}

function detenerJuego(pin) {
  const sala = salas.get(pin);
  if (!sala) return { ok: false, error: "Sala no encontrada" };

  limpiarTimersSala(sala);
  sala.estado = "terminado";
  io.to(pin).emit("juego-detenido");
  
  return { ok: true };
}

function obtenerSala(pin) {
  return salas.get(pin);
}

function detenerServidorJuego() {
  if (juegoServer) {
    juegoServer.close(() => {
      console.log("[JUEGO] Servidor cerrado");
    });
    juegoServer = null;
    io = null;
    salas.clear();
    participanteSockets.clear();
    socketParticipante.clear();
  }
}

module.exports = {
  iniciarServidorJuego,
  detenerServidorJuego,
  crearSala,
  iniciarJuego,
  detenerJuego,
  siguientePregunta,
  obtenerSala,
  PUERTO_JUEGO,
};
