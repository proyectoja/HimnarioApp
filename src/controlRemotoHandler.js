// ===============================
// MANEJADOR DE CONTROL REMOTO
// ===============================

// Variable global para guardar la URL del control remoto
let controlRemotoURL = null;
let controlRemotoURLSinSSL = null;

//Escuchar cuando el control remoto se inicia
if (window.electronAPI && window.electronAPI.onControlRemotoIniciado) {
  console.log("✅ Listener de control remoto registrado");

  window.electronAPI.onControlRemotoIniciado(async (data) => {
    controlRemotoURL = data.url;
    controlRemotoURLSinSSL = data.urlSinSSL || null;
    const pin = data.pin || "------";

    console.log(`📱 Control Remoto iniciado en: ${data.url}`);
    if (controlRemotoURLSinSSL) {
      console.log(`📱 Control Remoto sin certificado en: ${controlRemotoURLSinSSL}`);
    }
    console.log(`🔐 PIN: ${pin}`);

    // 📌 Actualizar información en el menú de configuración
    if (typeof actualizarInformacionUsuarioMenu === "function") {
      actualizarInformacionUsuarioMenu({
        url: data.url,
        urlSinSSL: controlRemotoURLSinSSL,
        pin: pin,
      });
    }

    // 🔐 Verificar si el usuario es premium antes de mostrar la notificación
    const esPremium = await window.electronAPI.getPremiumStatus();
    console.log("🔐 Estado premium al recibir evento:", esPremium);

    if (esPremium) {
      // Verificar nuevamente después del delay para asegurar que sigue siendo premium
      setTimeout(async () => {
        const esPremiumAhora = await window.electronAPI.getPremiumStatus();
        console.log(
          "🔐 Estado premium al mostrar notificación:",
          esPremiumAhora,
        );

        if (esPremiumAhora) {
          mostrarNotificacionControlRemoto(data.url, pin, controlRemotoURLSinSSL);
        } else {
          console.log("⚠️ Usuario ya no es premium, notificación cancelada");
        }
      }, 3000);
    } else {
      console.log("⚠️ Control remoto disponible solo para usuarios premium");
    }
  });
} else {
  console.error("⚠️ window.electronAPI.onControlRemotoIniciado no disponible");
}

// Solicitar estado actual del control remoto cuando se carga este script
if (window.electronAPI && window.electronAPI.obtenerEstadoControlRemoto) {
  console.log("🔍 Solicitando estado actual del control remoto...");

  window.electronAPI
    .obtenerEstadoControlRemoto()
    .then(async (estado) => {
      if (estado && estado.activo) {
        console.log("✅ Control remoto ya está activo:", estado);

        // 📌 Actualizar información en el menú de configuración
        if (typeof actualizarInformacionUsuarioMenu === "function") {
          actualizarInformacionUsuarioMenu({
            url: estado.url,
            urlSinSSL: estado.urlSinSSL || null,
            pin: estado.pin,
          });
        }

        // 🔐 Verificar si el usuario es premium antes de mostrar la notificación
        const esPremium = await window.electronAPI.getPremiumStatus();
        console.log("🔐 Estado premium inicial:", esPremium);

        if (esPremium) {
          // Verificar nuevamente después del delay para asegurar que sigue siendo premium
          setTimeout(async () => {
            const esPremiumAhora = await window.electronAPI.getPremiumStatus();
            console.log(
              "🔐 Estado premium al mostrar notificación:",
              esPremiumAhora,
            );

            if (esPremiumAhora) {
              mostrarNotificacionControlRemoto(estado.url, estado.pin, estado.urlSinSSL || null);
            } else {
              console.log(
                "⚠️ Usuario ya no es premium, notificación cancelada",
              );
            }
          }, 3000);
        } else {
          console.log(
            "⚠️ Control remoto disponible solo para usuarios premium",
          );
        }
      } else {
        console.log(
          "⏳ Control remoto aún no está activo, esperando evento...",
        );
      }
    })
    .catch((error) => {
      console.error("❌ Error al obtener estado:", error);
    });
} else {
  console.warn("⚠️ obtenerEstadoControlRemoto no disponible");
}

// Función para mostrar la notificación del control remoto
function mostrarNotificacionControlRemoto(url, pin, urlSinSSL = null) {
  // Crear elemento de notificación si no existe
  let notif = document.getElementById("control-remoto-notificacion");

  if (notif) {
    notif.remove();
    notif = null;
  }

  if (!notif) {
    notif = document.createElement("div");
    notif.id = "control-remoto-notificacion";
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: brown;
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      width: min(360px, calc(100vw - 24px));
      max-height: calc(100vh - 30px);
      overflow-y: auto;
      overflow-x: hidden;
      font-family: 'Segoe UI', sans-serif;
      animation: slideIn 0.5s ease;
    `;

    notif.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">📱</span>
        <strong style="flex: 1;">Control Remoto Activo</strong>
        <button id="cerrar-notif-control" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px;">×</button>
      </div>
      <p style="margin: 5px 0 10px; font-size: 14px;">Conéctate desde tu celular:</p>
      
      <!-- SSL Section -->
      <div style="padding: 0; border-radius: 12px; margin: 10px 0 14px; text-align: center;">
         <div style="display:inline-block; background:#b51d1d; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; margin-bottom:8px;">SSL</div>
        <div style="background:#fff; border-radius:12px; padding:8px 8px 6px; box-shadow:0 2px 8px rgba(0,0,0,0.12); margin:0 auto 10px; width:fit-content; max-width:100%;">
          <img id="img-qr-notif-ssl" style="width: 124px; height: 124px; display: block; margin: 0 auto;" />
        </div>
        <div style="font-size:12px; line-height:1.45; word-break:break-all; overflow-wrap:anywhere; text-align:left; font-family:Consolas, 'Courier New', monospace; color:#ffffff; padding:0 2px; width:100%;">${url}</div>
        <button id="copiar-url-ssl" style="margin-top:8px; width:100%; padding:8px 10px; font-size:12px; border-radius:8px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.35); cursor:pointer; color:#fff; font-weight:700;">📋 Copiar SSL</button>
      </div>

      ${urlSinSSL ? `
      <!-- No-SSL Section -->
      <div style="padding: 0; border-radius: 12px; margin: 10px 0; text-align: center;">
         <div style="display:inline-block; background:#8d3a3a; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; margin-bottom:8px;">Sin certificado</div>
        <div style="background:#fff; border-radius:12px; padding:8px 8px 6px; box-shadow:0 2px 8px rgba(0,0,0,0.12); margin:0 auto 10px; width:fit-content; max-width:100%;">
          <img id="img-qr-notif-nosssl" style="width: 124px; height: 124px; display: block; margin: 0 auto;" />
        </div>
        <div style="font-size:12px; line-height:1.45; word-break:break-all; overflow-wrap:anywhere; text-align:left; font-family:Consolas, 'Courier New', monospace; color:#ffffff; padding:0 2px; width:100%;">${urlSinSSL}</div>
        <button id="copiar-url-nosssl" style="margin-top:8px; width:100%; padding:8px 10px; font-size:12px; border-radius:8px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.35); cursor:pointer; color:#fff; font-weight:700;">📋 Copiar sin certificado</button>
      </div>
      ` : ""}

      <p style="margin: 5px 0; font-size: 12px; opacity: 0.9;">🔐 PIN: <strong style="font-size: 20px; letter-spacing: 2px;">${pin}</strong></p>
    `;

    document.body.appendChild(notif);

    // Generar QRs independientes y asignar botones de copia
    if (window.electronAPI && window.electronAPI.generateQRCodeDataURL) {
      // SSL QR
      try {
        const baseSsl = url;
        const sepSsl = baseSsl && baseSsl.includes("?") ? "&" : "?";
        const urlSslConPin = pin ? `${baseSsl}${sepSsl}pin=${encodeURIComponent(pin)}` : baseSsl;
        window.electronAPI
          .generateQRCodeDataURL(urlSslConPin)
          .then((qrUrl) => {
            const imgSsl = document.getElementById("img-qr-notif-ssl");
            if (imgSsl) imgSsl.src = qrUrl;
          })
          .catch((err) => console.error("Error generando QR SSL:", err));
      } catch (e) {
        console.error("Error preparando QR SSL:", e);
      }

      // No-SSL QR (si existe)
      if (urlSinSSL) {
        try {
          const baseNo = urlSinSSL;
          const sepNo = baseNo && baseNo.includes("?") ? "&" : "?";
          const urlNoConPin = pin ? `${baseNo}${sepNo}pin=${encodeURIComponent(pin)}` : baseNo;
          window.electronAPI
            .generateQRCodeDataURL(urlNoConPin)
            .then((qrUrl) => {
              const imgNo = document.getElementById("img-qr-notif-nosssl");
              if (imgNo) imgNo.src = qrUrl;
            })
            .catch((err) => console.error("Error generando QR no-SSL:", err));
        } catch (e) {
          console.error("Error preparando QR no-SSL:", e);
        }
      }
    }

    // Botón para cerrar
    const btnCerrar = document.getElementById("cerrar-notif-control");
    if (btnCerrar) {
      btnCerrar.addEventListener("click", () => {
        notif.style.animation = "slideOut 0.5s ease";
        setTimeout(() => notif.remove(), 500);
      });
    }

    // Botones de copia por separado
    const copiarSsl = document.getElementById("copiar-url-ssl");
    if (copiarSsl) {
      copiarSsl.addEventListener("click", () => {
        navigator.clipboard.writeText(url).then(() => {
          const textoOriginal = copiarSsl.textContent;
          copiarSsl.textContent = "✅ Copiado";
          copiarSsl.style.background = "#2e7d32";
          copiarSsl.style.color = "#ffffff";
          setTimeout(() => {
            copiarSsl.textContent = textoOriginal;
            copiarSsl.style.background = "#eee";
            copiarSsl.style.color = "#3c1f1f";
          }, 2000);
        });
      });
    }

    const copiarNo = document.getElementById("copiar-url-nosssl");
    if (copiarNo) {
      copiarNo.addEventListener("click", () => {
        navigator.clipboard.writeText(urlSinSSL).then(() => {
          const textoOriginal = copiarNo.textContent;
          copiarNo.textContent = "✅ Copiado";
          copiarNo.style.background = "#2e7d32";
          copiarNo.style.color = "#ffffff";
          setTimeout(() => {
            copiarNo.textContent = textoOriginal;
            copiarNo.style.background = "#eee";
            copiarNo.style.color = "#3c1f1f";
          }, 2000);
        });
      });
    }

    // Auto-cerrar después de 60 segundos
    setTimeout(() => {
      if (notif && notif.parentNode) {
        notif.style.animation = "slideOut 0.5s ease";
        setTimeout(() => notif.remove(), 500);
      }
    }, 60000);
  }

  // Agregar animaciones CSS
  if (!document.getElementById("control-remoto-styles")) {
    const style = document.createElement("style");
    style.id = "control-remoto-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Escuchar comandos remotos
if (window.electronAPI && window.electronAPI.onRemoteCommand) {
  window.electronAPI.onRemoteCommand((data) => {
    const { command, data: commandData } = data;
    console.log(`📱 Comando remoto recibido: ${command}`, commandData);

    // Procesar el comando
    procesarComandoRemoto(command, commandData);
  });
}

// Escuchar solicitud de estado inicial
if (window.electronAPI && window.electronAPI.onRemoteGetEstado) {
  window.electronAPI.onRemoteGetEstado(() => {
    console.log("📱 Solicitud de estado completa recibida desde remoto");

    // 1. Enviar estado de PowerPoint
    if (typeof syncSecondaryWindow === "function") {
      console.log("🔄 Sincronizando estado PPT...");
      syncSecondaryWindow();
    }

    // 2. Enviar estado de Reproducción Multimedia
    if (window.electronAPI.updatePlaybackStatus) {
      // Determinar si hay algo reproduciéndose
      let isPlaying = false;
      let title = "";
      let number = null;
      let type = "unknown";

      // Chequear reproductor de video/youtube
      if (
        (typeof player !== "undefined" && player && !player.paused) ||
        (typeof playerYouTube !== "undefined" &&
          playerYouTube &&
          playerYouTube.getPlayerState &&
          playerYouTube.getPlayerState() === 1)
      ) {
        isPlaying = true;
        type = "video";
        // Intentar obtener título de alguna variable global si existe
        if (typeof currentHimnoPlaying !== "undefined" && currentHimnoPlaying) {
          title = currentHimnoPlaying.titulo;
          number = currentHimnoPlaying.numero;
        } else {
          title = "Video en reproducción";
        }
      }

      // Chequear visor de imagen remota
      const viewer = document.getElementById("remote-image-viewer");
      if (viewer && viewer.style.display !== "none") {
        isPlaying = true;
        type = "imagen";
        title = "Imagen proyectada";
        // Intentar sacar el nombre del archivo si es posible, aunque sea un hack
        const img = viewer.querySelector("img");
        if (img && img.src) {
          const parts = img.src.split("/");
          const filename = parts[parts.length - 1];
          // Decodificar remotos names
          if (filename.startsWith("remoto_")) {
            // Intento de limpiar el nombre
            title = "Imagen Remota";
          }
        }
      }

      console.log("🔄 Enviando estado de reproducción:", { isPlaying, title });

      window.electronAPI.updatePlaybackStatus({
        playing: isPlaying,
        tipo: type,
        titulo: title,
        numero: number,
      });
    }
  });
}

// Función para procesar comandos remotos
function procesarComandoRemoto(comando, datos) {
  switch (comando) {
    case "buscar-himnos":
      // Buscar en el array global todosLosHimnosLista
      if (datos && datos.query) {
        const query = datos.query.toLowerCase().trim();
        console.log(`🔍 Buscando: "${query}"`);

        // Buscar en el array global (si está cargado)
        if (
          typeof todosLosHimnosLista !== "undefined" &&
          todosLosHimnosLista &&
          todosLosHimnosLista.length > 0
        ) {
          const resultados = todosLosHimnosLista.filter((himno) => {
            const numeroMatch =
              himno.numero && himno.numero.toString().includes(query);
            const tituloMatch =
              himno.titulo && himno.titulo.toLowerCase().includes(query);
            return numeroMatch || tituloMatch;
          });

          console.log(`✅ Encontrados ${resultados.length} resultados`);

          // Guardar resultados en una variable global para que la interfaz pueda acceder
          window.resultadosBusqueda = resultados.slice(0, 20); // Máximo 20 resultados
        } else {
          console.warn(
            "⚠️ El array todosLosHimnosLista no está disponible aún",
          );
          window.resultadosBusqueda = [];
        }
      }
      break;

    case "cambiar-categoria":
      if (datos && datos.categoria) {
        if (typeof mostrarCategoria === "function") {
          mostrarCategoria(datos.categoria);
          console.log(`Categoría cambiada a: ${datos.categoria}`);
        }
      }
      break;

    case "reproducir-himno-numero":
      if (datos && datos.numero) {
        console.log(`🎵 Buscando himno #${datos.numero}...`);

        // Primero asegurarse de estar en la categoría correcta
        if (typeof mostrarCategoria === "function") {
          let categoria = datos.categoria || "todos";

          // Mapear categorías del control remoto a las internas
          const mapaCategorias = {
            Himnos: "todos",
            Orquestado: "orquestado",
            Coritos: "coritos",
            JA: "himnosJA",
            Nacionales: "himnosNacionales",
            Infantiles: "himnosInfantiles",
            "Antiguos 1962": "himnosAntiguos",
            "Piano Pista": "himnosPianoPista",
          };

          if (mapaCategorias[categoria]) {
            categoria = mapaCategorias[categoria];
          }

          console.log(`📂 Cambiando a categoría "${categoria}"...`);
          mostrarCategoria(categoria);
        }

        // Esperar un momento para que se cargue la categoría
        setTimeout(() => {
          const numero = String(datos.numero).padStart(3, "0");
          // Buscar el elemento del himno en el DOM
          const himnoElements = document.querySelectorAll(".video-container");
          let himnoEncontrado = false;

          console.log(`🔍 Buscando entre ${himnoElements.length} elementos...`);

          for (let element of himnoElements) {
            const h3 = element.querySelector("h3");
            if (h3) {
              const texto = h3.textContent;
              // Buscar el número exacto al inicio del título
              if (
                texto.startsWith(numero) ||
                texto.includes(`${numero}.`) ||
                texto.includes(`${numero} `)
              ) {
                console.log(`✅ ¡Himno encontrado! Título: ${texto}`);

                // Extraer el título completo para la notificación
                const tituloCompleto = texto.trim();

                // Actualizar variable global para que scripts.js la use
                if (typeof currentHimnoPlaying !== "undefined") {
                  currentHimnoPlaying = {
                    titulo: tituloCompleto,
                    numero: datos.numero,
                  };
                }

                // IMPORTANTE: Hacer click en la IMAGEN, no en el contenedor
                const img = element.querySelector("img");
                if (img) {
                  console.log("🖱️ Haciendo click en la imagen...");
                  img.click();
                  himnoEncontrado = true;

                  // Esperar a que se cargue el reproductor y darle play automáticamente
                  console.log("⏳ Esperando a que se cargue el reproductor...");
                  setTimeout(() => {
                    // Intentar darle play al reproductor
                    if (typeof player !== "undefined" && player) {
                      console.log("▶️ Dando play al reproductor Clappr...");
                      player.play();
                    } else if (
                      typeof playerYouTube !== "undefined" &&
                      playerYouTube
                    ) {
                      console.log("▶️ Dando play al reproductor YouTube...");
                      playerYouTube.playVideo();
                    } else {
                      console.log("🔍 Buscando reproductor en el DOM...");
                      // Intentar encontrar y hacer click en el botón de play del reproductor
                      const playButton =
                        document.querySelector(".player-poster") ||
                        document.querySelector("[data-poster]") ||
                        document.querySelector(".media-control-button.play");
                      if (playButton) {
                        console.log("🎬 Haciendo click en el póster/play...");
                        playButton.click();
                      }
                    }

                    // Notificar después de que el reproductor esté listo
                    setTimeout(() => {
                      if (
                        window.electronAPI &&
                        window.electronAPI.updatePlaybackStatus
                      ) {
                        console.log(
                          "[REMOTE-PLAYBACK] 📡 Notificando:",
                          tituloCompleto,
                        );
                        window.electronAPI.updatePlaybackStatus({
                          playing: true,
                          tipo: "video",
                          titulo: tituloCompleto,
                          numero: datos.numero,
                        });
                      }
                    }, 500);
                  }, 2000); // Esperar 2 segundos para que se cargue el reproductor

                  break;
                } else {
                  console.warn(
                    "⚠️ No se encontró la imagen dentro del contenedor",
                  );
                }
              }
            }
          }

          if (!himnoEncontrado) {
            console.warn(
              `⚠️ No se encontró el himno #${datos.numero}, intentando búsqueda sin padding...`,
            );
            // Intentar buscar sin padding
            for (let element of himnoElements) {
              const h3 = element.querySelector("h3");
              if (h3 && h3.textContent.includes(String(datos.numero))) {
                console.log(
                  `✅ ¡Himno encontrado (sin padding)! Título: ${h3.textContent}`,
                );
                const img = element.querySelector("img");
                if (img) {
                  img.click();
                  himnoEncontrado = true;

                  // También darle play aquí
                  setTimeout(() => {
                    if (typeof player !== "undefined" && player) {
                      player.play();
                    } else if (
                      typeof playerYouTube !== "undefined" &&
                      playerYouTube
                    ) {
                      playerYouTube.playVideo();
                    }
                  }, 2000);

                  break;
                }
              }
            }
          }

          if (!himnoEncontrado) {
            console.error(
              `❌ No se pudo encontrar el himno #${datos.numero} en el DOM`,
            );
          } else {
            console.log(
              `🎉 Himno #${datos.numero} cargado, reproducción iniciando...`,
            );

            // Notificar estado de reproducción al control remoto
            setTimeout(() => {
              if (
                window.electronAPI &&
                window.electronAPI.updatePlaybackStatus
              ) {
                console.log(
                  "[REMOTE-PLAYBACK] 📡 Notificando reproducción al control remoto",
                );
                window.electronAPI.updatePlaybackStatus({
                  playing: true,
                  tipo: "video",
                  titulo: `Himno #${datos.numero}`,
                  numero: datos.numero,
                });
              }
            }, 2500); // Esperar a que empiece la reproducción
          }
        }, 1000); // Aumentado a 1 segundo para dar más tiempo a que se cargue
      }
      break;

    case "play-reproduccion":
      // Play del reproductor actual
      if (typeof player !== "undefined" && player) {
        player.play();
      } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
        playerYouTube.playVideo();
      }
      break;

    case "stop-reproduccion":
      // 1. Cerrar Visor de Imagen Local (si existe)
      if (typeof cerrarVisorImagen === "function") {
        cerrarVisorImagen();
      }

      // 2. Si estamos en Modo PRO (Monitor Activo), Resetear Pantalla Secundaria
      if (typeof esMonitorActivo === "function" && esMonitorActivo()) {
        console.log(
          "🖥️ Reseteando pantalla secundaria a fondo predeterminado...",
        );
        if (typeof enviarDatos === "function") {
          enviarDatos({
            videoPath: "", // Limpiar Video
            imagePath: "", // Limpiar Imagen
            fondoBody: "", // Limpiar Fondo custom
            resetToDefault: true, // Bandera explícita para resetear
            comando: "limpiar-todo",
          });
        }
      }

      // 3. Detener Reproductores de Video (Local)
      if (typeof ocultarReproductor === "function") {
        ocultarReproductor();
      } else {
        const closeBtn = document.getElementById("closePlayer");
        if (closeBtn) {
          closeBtn.click();
        } else if (typeof player !== "undefined" && player) {
          try {
            player.pause();
            player.currentTime = 0; // Opcional: reiniciar
          } catch (e) {
            console.error(e);
          }
        } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
          try {
            playerYouTube.stopVideo();
          } catch (e) {
            console.error(e);
          }
        }

        // Sincronizar con ventana secundaria si ocultarReproductor no lo hizo
        // (Esto es redundante si ya enviamos el reset arriba, pero válido por seguridad)
        if (typeof enviarDatos === "function") {
          enviarDatos({ stop: true });
        }
      }

      // 4. Notificar al control remoto
      if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
        console.log(
          "[REMOTE-PLAYBACK] ⏹️ Notificando detención de reproducción",
        );
        window.electronAPI.updatePlaybackStatus({ playing: false });
      }
      break;

    case "cambiar-volumen":
      if (datos && typeof datos.volumen !== "undefined") {
        console.log(`🔊 Cambiando volumen del sistema a: ${datos.volumen}%`);

        // Usar IPC para cambiar volumen del sistema
        if (window.electronAPI && window.electronAPI.cambiarVolumen) {
          window.electronAPI
            .cambiarVolumen(datos.volumen)
            .then(() => {
              console.log("✅ Volumen del sistema cambiado exitosamente");
            })
            .catch((err) => {
              console.error("❌ Error al cambiar volumen del sistema:", err);
            });
        }
      }
      break;

    case "siguiente-himno":
      // Buscar el botón de siguiente himno
      const btnSiguiente =
        document.querySelector('[onclick*="siguiente"]') ||
        document.querySelector(".btn-siguiente") ||
        document.querySelector("#siguiente");
      if (btnSiguiente) btnSiguiente.click();
      else console.warn("No se encontró el botón siguiente");
      break;

    case "anterior-himno":
      // Buscar el botón de anterior himno
      const btnAnterior =
        document.querySelector('[onclick*="anterior"]') ||
        document.querySelector(".btn-anterior") ||
        document.querySelector("#anterior");
      if (btnAnterior) btnAnterior.click();
      else console.warn("No se encontró el botón anterior");
      break;

    case "play-pause":
      // Intentar play/pause del reproductor
      if (typeof player !== "undefined" && player) {
        if (player.paused) {
          player.play();
        } else {
          player.pause();
        }
      } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
        const state = playerYouTube.getPlayerState();
        if (state === 1) {
          // Reproduciendo
          playerYouTube.pauseVideo();
        } else {
          playerYouTube.playVideo();
        }
      }
      break;

    case "stop-reproduccion":
    case "detener":
      // Detener reproducción
      if (typeof ocultarReproductor === "function") {
        ocultarReproductor();
      } else {
        if (typeof player !== "undefined" && player) {
          player.pause();
          player.currentTime = 0;
        } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
          playerYouTube.stopVideo();
        }

        // Sincronizar con ventana secundaria
        if (typeof enviarDatos === "function") {
          enviarDatos({ stop: true });
        }
      }

      // Cerrar también el visor de imagen
      cerrarVisorImagen();
      break;

    case "ir-a-himno":
      if (datos && datos.numero) {
        // Buscar función para ir a un himno específico
        if (typeof mostrarHimno === "function") {
          mostrarHimno(datos.numero);
        } else if (typeof cargarHimno === "function") {
          cargarHimno(datos.numero);
        }
        console.log(`Ir al himno ${datos.numero}`);
      }
      break;

    case "ir-inicio":
      // Ir a la página de inicio
      if (typeof mostrarCategoria === "function") {
        mostrarCategoria("todos");
      }
      break;

    case "abrir-biblia":
      // Abrir sección de biblia
      const btnBiblia =
        document.querySelector('[onclick*="biblia"]') ||
        document.querySelector("#biblia") ||
        document.querySelector(".btn-biblia");
      if (btnBiblia) btnBiblia.click();
      break;

    case "abrir-coros":
      // Abrir sección de coros
      if (typeof mostrarCategoria === "function") {
        mostrarCategoria("coritos");
      }
      break;

    case "abrir-videos":
      // Abrir sección de videos
      if (typeof mostrarCategoria === "function") {
        mostrarCategoria("videos");
      }
      break;

    case "volumen-mas":
      // Aumentar volumen
      if (typeof player !== "undefined" && player) {
        player.volume = Math.min(player.volume + 0.1, 1);
      } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
        const volActual = playerYouTube.getVolume();
        playerYouTube.setVolume(Math.min(volActual + 10, 100));
      }
      break;

    case "volumen-menos":
      // Disminuir volumen
      if (typeof player !== "undefined" && player) {
        player.volume = Math.max(player.volume - 0.1, 0);
      } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
        const volActual = playerYouTube.getVolume();
        playerYouTube.setVolume(Math.max(volActual - 10, 0));
      }
      break;

    case "volumen-medio":
      // Volumen al 50%
      if (typeof player !== "undefined" && player) {
        player.volume = 0.5;
      } else if (typeof playerYouTube !== "undefined" && playerYouTube) {
        playerYouTube.setVolume(50);
      }
      break;

    case "buscar":
      if (datos && datos.texto) {
        // Buscar himno
        const inputBusqueda =
          document.querySelector("#buscador") ||
          document.querySelector('input[type="search"]') ||
          document.querySelector(".busqueda");
        if (inputBusqueda) {
          inputBusqueda.value = datos.texto;
          // Disparar evento de búsqueda
          const evento = new Event("input", { bubbles: true });
          inputBusqueda.dispatchEvent(evento);
        }
      }
      break;

    case "abrir-proyeccion":
      // Abrir ventana de proyección
      const btnProyeccion =
        document.querySelector('[onclick*="proyeccion"]') ||
        document.querySelector("#proyeccion") ||
        document.querySelector(".btn-proyeccion");
      if (btnProyeccion) btnProyeccion.click();
      break;

    case "cerrar-proyeccion":
      // Cerrar ventana de proyección
      if (window.electronAPI && window.electronAPI.abrirVentanaSecundaria) {
        window.electronAPI.abrirVentanaSecundaria(-1);
      }
      break;

    case "ppt-prev":
      // Verificar si el contenedor de PowerPoint está activo, si no, activarlo
      const ventanaPowerPoint = document.getElementById(
        "contenedor-power-point",
      );
      if (
        ventanaPowerPoint &&
        getComputedStyle(ventanaPowerPoint).display !== "flex"
      ) {
        // Activar el contenedor de PowerPoint automáticamente
        const ventanaBiblia = document.getElementById("contenedor-biblia");
        const ventanaHimnosPro = document.getElementById(
          "contenedor-himnos-personalizados",
        );
        const ventanaYouTube = document.getElementById("contenedor-youtube");
        const himnarioContainer = document.getElementById("himnario");

        ventanaHimnosPro.style.display = "none";
        ventanaBiblia.style.display = "none";
        ventanaYouTube.style.display = "none";
        himnarioContainer.style.display = "none";
        ventanaPowerPoint.style.display = "flex";
        document.getElementById("contenedor-contador").style.display = "none";
        console.log(
          "[CONTROL REMOTO] Contenedor de PowerPoint activado automáticamente para navegación",
        );
      }

      if (typeof pptPrev === "function") {
        pptPrev();
      } else {
        const btnPrev = document.getElementById("ppt-prev-btn");
        if (btnPrev) btnPrev.click();
      }
      break;

    case "ppt-next":
      // Verificar si el contenedor de PowerPoint está activo, si no, activarlo
      const ventanaPowerPoint2 = document.getElementById(
        "contenedor-power-point",
      );
      if (
        ventanaPowerPoint2 &&
        getComputedStyle(ventanaPowerPoint2).display !== "flex"
      ) {
        // Activar el contenedor de PowerPoint automáticamente
        const ventanaBiblia = document.getElementById("contenedor-biblia");
        const ventanaHimnosPro = document.getElementById(
          "contenedor-himnos-personalizados",
        );
        const ventanaYouTube = document.getElementById("contenedor-youtube");
        const himnarioContainer = document.getElementById("himnario");

        ventanaHimnosPro.style.display = "none";
        ventanaBiblia.style.display = "none";
        ventanaYouTube.style.display = "none";
        himnarioContainer.style.display = "none";
        ventanaPowerPoint2.style.display = "flex";
        document.getElementById("contenedor-contador").style.display = "none";
        console.log(
          "[CONTROL REMOTO] Contenedor de PowerPoint activado automáticamente para navegación",
        );
      }

      if (typeof pptNext === "function") {
        pptNext();
      } else {
        const btnNext = document.getElementById("ppt-next-btn");
        if (btnNext) btnNext.click();
      }
      break;

    case "cargar-ppt-remoto":
      if (datos && datos.filePath) {
        console.log(`📂 Cargando PowerPoint desde remoto: ${datos.fileName}`);

        // 1. Activar automáticamente el contenedor de PowerPoint
        const ventanaPowerPoint = document.getElementById(
          "contenedor-power-point",
        );
        const ventanaBiblia = document.getElementById("contenedor-biblia");
        const ventanaHimnosPro = document.getElementById(
          "contenedor-himnos-personalizados",
        );
        const ventanaYouTube = document.getElementById("contenedor-youtube");
        const himnarioContainer = document.getElementById("himnario");

        if (ventanaPowerPoint) {
          ventanaHimnosPro.style.display = "none";
          ventanaBiblia.style.display = "none";
          ventanaYouTube.style.display = "none";
          himnarioContainer.style.display = "none";
          ventanaPowerPoint.style.display = "flex";
          document.getElementById("contenedor-contador").style.display = "none";
          console.log(
            "[CONTROL REMOTO] Contenedor de PowerPoint activado automáticamente",
          );
        }

        // 2. Iniciar la conversión directamente con el archivo recibido
        if (window.electronAPI && window.electronAPI.convertRemotePPT) {
          // Intentar mostrar progreso en el UI si existen los elementos
          const progressBox = document.getElementById("ppt-progress");
          const pptProgressText = document.getElementById("ppt-progress-text");
          if (progressBox) progressBox.style.display = "block";
          if (pptProgressText)
            pptProgressText.textContent = "Cargando PPT remoto...";

          // Iniciar conversión directamente
          window.electronAPI
            .convertRemotePPT(datos.filePath)
            .then((slides) => {
              console.log("✅ PPT remoto convertido:", slides);
              if (slides && slides.length > 0) {
                if (typeof loadPowerPoint === "function") {
                  loadPowerPoint(slides);
                } else {
                  console.error("Función loadPowerPoint no encontrada");
                }
              }
            })
            .catch((err) => {
              console.error("Error al convertir PPT remoto:", err);
            });
        }
      }
      break;

    case "cargar-imagen-remoto":
    case "cargar-video-remoto":
      if (datos && datos.filePath) {
        // Mejorar detección: es imagen si el comando lo dice O si la extensión es de imagen
        const esExtensionImagen = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
          datos.fileName || datos.filePath,
        );
        const isImage = comando === "cargar-imagen-remoto" || esExtensionImagen;
        const tipoArchivo = isImage ? "Imagen" : "Video";

        console.log(
          `🎥 Cargando ${tipoArchivo} desde remoto: ${datos.fileName}`,
        );

        const normalizedPath = datos.filePath.replace(/\\/g, "/");
        const fileUrl = `file://${encodeURI(normalizedPath).replace(/#/g, "%23").replace(/\?/g, "%3F")}`;

        if (
          typeof videosLocalesPro === "function" &&
          typeof videosLocalesEstandar === "function"
        ) {
          let usarPro = false;

          if (typeof esMonitorActivo === "function" && esMonitorActivo()) {
            usarPro = true;
          }
          if (typeof botonPRO !== "undefined" && botonPRO) {
            usarPro = true;
          }

          const ventanaYouTube = document.getElementById("contenedor-youtube");
          if (ventanaYouTube) ventanaYouTube.style.display = "none";

          if (usarPro) {
            console.log(
              `📺 Proyectando ${tipoArchivo} Remoto en Segunda Pantalla (Modo PRO)`,
            );

            if (isImage) {
              if (typeof enviarDatos === "function") {
                enviarDatos({
                  videoPath: null,
                  imagePath: null,
                  versiculo: null,
                  libroAux: null,
                  estilosAux: null,
                  lista: null,
                  fondoBody: fileUrl,
                  imagen: null,
                  waterMark: null,
                });
              }
            } else {
              videosLocalesPro(fileUrl, "");
            }

            if (typeof mostrarAlertaFloat === "function")
              mostrarAlertaFloat(
                `Visualizando ${tipoArchivo}: ` + datos.fileName,
              );
          } else {
            console.log(
              `💻 Mostrando ${tipoArchivo} Remoto Localmente (Modo Estándar)`,
            );

            if (isImage) {
              // 🤫 Pausa silenciosa de reproductores de video para evitar eventos 'ended'
              if (typeof player !== "undefined" && player) {
                // Intentar remover listeners o simplemente pausar
                // Si pausamos, no salta ended.
                player.pause();
                // Forzar display none al contenedor de video para que no se vea debajo
                if (typeof videoPlayerContainer !== "undefined")
                  videoPlayerContainer.style.display = "none";
              }
              if (typeof playerYouTube !== "undefined" && playerYouTube) {
                if (typeof playerYouTube.pauseVideo === "function")
                  playerYouTube.pauseVideo();
                // Ocultar contenedor youtube
                const ytContainer =
                  document.getElementById("contenedor-youtube");
                if (ytContainer) ytContainer.style.display = "none";
              }
              if (typeof audioHimno !== "undefined") {
                audioHimno.pause();
              }

              const viewerId = "remote-image-viewer";
              let viewer = document.getElementById(viewerId);

              if (!viewer) {
                viewer = document.createElement("div");
                viewer.id = viewerId;
                viewer.style.cssText = `
                       position: fixed;
                       top: 0;
                       left: 0;
                       width: 100vw;
                       height: 100vh;
                       background-color: black;
                       z-index: 9999;
                       display: flex;
                       justify-content: center;
                       align-items: center;
                   `;

                // Imagen
                const img = document.createElement("img");
                img.id = "remote-image-content";
                img.style.cssText =
                  "max-width: 100%; max-height: 100%; object-fit: contain;";
                viewer.appendChild(img);

                // Botón cerrar
                const closeBtn = document.createElement("button");
                closeBtn.innerHTML = "×";
                closeBtn.style.cssText = `
                       position: absolute;
                       top: 20px;
                       right: 20px;
                       background: rgba(0,0,0,0.5);
                       color: white;
                       border: 2px solid white;
                       border-radius: 50%;
                       width: 40px;
                       height: 40px;
                       font-size: 24px;
                       cursor: pointer;
                       display: flex;
                       justify-content: center;
                       align-items: center;
                   `;
                closeBtn.onclick = cerrarVisorImagen;
                viewer.appendChild(closeBtn);

                document.body.appendChild(viewer);
              }

              const imgElement = viewer.querySelector("img");
              if (imgElement) imgElement.src = fileUrl;
              viewer.style.display = "flex";
            } else {
              // Asegurar que el visor de imagen esté cerrado si vamos a ver video
              cerrarVisorImagen();
              videosLocalesEstandar(fileUrl, "");
            }
          }

          // Actualizar estado de reproducción para el control remoto
          setTimeout(() => {
            if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
              window.electronAPI.updatePlaybackStatus({
                playing: true,
                tipo: isImage ? "imagen" : "video",
                titulo: datos.fileName,
                numero: null,
              });
            }
          }, 1000);
        } else {
          console.error("❌ Funciones de reproducción no encontradas");
        }
      }
      break;

    default:
      console.warn(`Comando no reconocido: ${comando}`);
  }
}

function cerrarVisorImagen() {
  const viewer = document.getElementById("remote-image-viewer");
  if (viewer) {
    viewer.style.display = "none";
    // Notificar que se cerró
    if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
      window.electronAPI.updatePlaybackStatus({ playing: false });
    }
  }
}

console.log("📱 Manejador de control remoto cargado");
