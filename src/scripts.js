//Variables Globales
let player = null;
let playerYouTube = null;
let playerWindow = null;
let botonPRO = false;
let botonLista = false;
let botonFondo = false;
let esPremium = false;
let waterMark = "";
let modo = "live"; // o "sandbox"
let modoAux = "test";
//modo = "sandbox";

function esMonitorActivo() {
  const selectMonitores = document.getElementById("selectMonitores");
  return (
    selectMonitores &&
    selectMonitores.value !== "" &&
    selectMonitores.value !== "-1"
  );
}

//VISTA PREVIA EN CONTENEDOR DE LOGS PARA LOS ARCHIVOS QUE SE ESTÁN DESCARGANDO
if (window.electronAPI && window.electronAPI.onLog) {
  window.electronAPI.onLog((msg) => {
    const pre = document.getElementById("logs");
    if (pre) {
      // agregar nueva línea
      pre.textContent += msg + "\n";

      // dividir en líneas
      let lineas = pre.textContent.split("\n");

      // si hay más de 100 líneas, eliminar las primeras
      if (lineas.length > 50) {
        lineas = lineas.slice(lineas.length - 100);
        pre.textContent = lineas.join("\n");
      }

      // autoscroll
      const container = document.getElementById("contenedor-logs");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  });
  // Mensaje de prueba inicial
  const pre = document.getElementById("logs");
  if (pre) pre.textContent = "--- Sistema de logs listo ---\n";

  // Notificar al main que estamos listos para recibir logs
  if (window.electronAPI.rendererReady) {
    window.electronAPI.rendererReady();
  }

  if (window.electronAPI.onShowLogs) {
    window.electronAPI.onShowLogs(() => {
      const container = document.getElementById("contenedor-logs");
      if (container) {
        container.style.display = "flex";
        document.body.classList.add("logs-visible");
      }
    });
  }

  if (window.electronAPI.onHideLogs) {
    window.electronAPI.onHideLogs(() => {
      const container = document.getElementById("contenedor-logs");
      if (container) {
        container.style.display = "none";
        document.body.classList.remove("logs-visible");

        // Restaurar imágenes originales
        const images = document.querySelectorAll(".video-container img");
        images.forEach((img) => {
          if (img.dataset.originalSrc) {
            img.src = img.dataset.originalSrc;
          }
        });
      }

      // Ejecutar mostrarCategoria('todos') cuando todas las descargas hayan terminado
      console.log(
        "Todas las descargas completadas - Actualizando categoría todos",
      );
      if (typeof mostrarCategoria === "function") {
        mostrarCategoria("todos");
      }
    });
  }

  // MANEJO DE PROGRESO DE DESCARGA TOTAL
  if (window.electronAPI.onDownloadProgress) {
    window.electronAPI.onDownloadProgress((data) => {
      const contenedorBarra = document.getElementById("contenedor-barra-logs");
      if (contenedorBarra) {
        // Inicializar estructura de la barra si está vacío
        if (contenedorBarra.innerHTML.trim() === "") {
          contenedorBarra.innerHTML = `
            <div id="barra-progreso-descarga" style="width: 0%; height: 100%; background: linear-gradient(90deg, #0066ff, #00ccff); transition: width 0.3s ease; box-shadow: 0 0 10px rgba(0,102,255,0.4);"></div>
            <div id="texto-progreso-descarga" style="position: absolute; width: 100%; top: 0; text-align: center; font-size: 13px; color: white; font-weight: bold; line-height: 25px; text-shadow: 1px 1px 2px rgba(0,0,0,0.9); pointer-events: none;">0%</div>
          `;
        }

        // Asegurarse de que el contenedor de la barra sea visible
        if (contenedorBarra.style.display !== "block") {
          contenedorBarra.style.display = "block";
        }

        const barra = document.getElementById("barra-progreso-descarga");
        const texto = document.getElementById("texto-progreso-descarga");
        if (barra && texto) {
          // Asegurar un mínimo de 2% para que se vea la barra si hay progreso
          const width =
            data.porcentaje > 0 && data.porcentaje < 2 ? 2 : data.porcentaje;
          barra.style.width = `${width}%`;

          let infoArchivos = `${data.completados}/${data.total} archivos`;
          let infoCarpetas = `${data.carpetasCompletadas}/${data.totalCarpetas} carpetas`;
          texto.textContent = `${data.porcentaje}% (${infoArchivos} — ${infoCarpetas})`;
        }
      }
    });
  }
} else {
  console.error("[ERROR] preload.js no inyectado");
}

// ========================================
// 🚀 SISTEMA DE INICIALIZACIÓN OPTIMIZADO
// ========================================
let appInicializada = false;

// Helper para evitar que las peticiones se queden colgadas (timeout por defecto: 5s)
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function inicializarAplicacion() {
  if (appInicializada) return;

  console.log("[INIT] 🔄 Iniciando carga de la aplicación...");

  try {
    // Ejecutar tareas independientes en paralelo para mejorar velocidad de carga
    // Hacemos que la validación premium NO bloquee la carga de la interfaz
    const validacionPromise = (async () => {
      console.log("[INIT] ✓ Validando premium...");
      await validarPremium();
      // 📌 Actualizar marca de agua de PowerPoint según estado premium
      actualizarMarcaAguaPowerPoint();
    })();

    const himnosPromise = (async () => {
      if (typeof cargarHimnos === "function") {
        console.log("[INIT] ✓ Cargando himnos...");
        await cargarHimnos();
      }
    })();

    const contadorPromise = (async () => {
      if (typeof contadorDeVistas === "function") {
        console.log("[INIT] ✓ Inicializando contador...");
        await contadorDeVistas();
      }
    })();

    // Esperamos a que todo termine, pero sin bloquear por error
    await Promise.allSettled([
      validacionPromise,
      himnosPromise,
      contadorPromise,
    ]);

    // 4️⃣ Pequeña espera para asegurar renderizado final
    await new Promise((resolve) => setTimeout(resolve, 300)); // Reducido a 300ms

    // 5️⃣ Ocultar loader
    console.log("[INIT] ✓ Ocultando loader...");
    const loader = document.getElementById("contenedorLoader");
    if (loader) {
      loader.style.display = "none";
    }

    // 6️⃣ Mostrar introducción (comentado original)
    //console.log('[INIT] ✓ Mostrando introducción...');
    //mostrarIntro();

    // 7️⃣ Notificar que la app está lista para mostrarse
    console.log("[INIT] ✅ Aplicación completamente cargada");
    if (window.electronAPI && window.electronAPI.appReady) {
      window.electronAPI.appReady();
    }

    appInicializada = true;
  } catch (error) {
    console.error("[INIT] ❌ Error durante la inicialización:", error);
    // Aún así mostrar la ventana en caso de error
    const loader = document.getElementById("contenedorLoader");
    if (loader) loader.style.display = "none";
    if (window.electronAPI && window.electronAPI.appReady) {
      window.electronAPI.appReady();
    }
  }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarAplicacion);
} else {
  // DOM ya está listo
  inicializarAplicacion();
}
// ========================================

// ========================================
// 📥 SISTEMA DE ACTUALIZACIONES VISUALES
// ========================================

// Crear el contenedor de notificación de actualización (oculto inicialmente)
const updateNotificationContainer = document.createElement("div");
updateNotificationContainer.id = "update-notification";
updateNotificationContainer.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  display: none;
  flex-direction: column;
  gap: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: slideInRight 0.4s ease-out;
`;

const updateTitle = document.createElement("div");
updateTitle.style.cssText = `
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
`;

const updateMessage = document.createElement("div");
updateMessage.style.cssText = `
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.4;
`;

const progressBarContainer = document.createElement("div");
progressBarContainer.style.cssText = `
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  display: none;
`;

const progressBar = document.createElement("div");
progressBar.style.cssText = `
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 4px;
  width: 0%;
  transition: width 0.3s ease;
`;
progressBarContainer.appendChild(progressBar);

const progressText = document.createElement("div");
progressText.style.cssText = `
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  text-align: center;
  display: none;
`;

updateNotificationContainer.appendChild(updateTitle);
updateNotificationContainer.appendChild(updateMessage);
updateNotificationContainer.appendChild(progressBarContainer);
updateNotificationContainer.appendChild(progressText);
document.body.appendChild(updateNotificationContainer);

// Agregar animación CSS
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(450px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(450px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Función para mostrar notificación
function mostrarNotificacionUpdate(titulo, mensaje, mostrarProgreso = false) {
  updateTitle.textContent = titulo;
  updateMessage.textContent = mensaje;
  updateNotificationContainer.style.display = "flex";

  if (mostrarProgreso) {
    progressBarContainer.style.display = "block";
    progressText.style.display = "block";
  } else {
    progressBarContainer.style.display = "none";
    progressText.style.display = "none";
  }
}

// Función para ocultar notificación
function ocultarNotificacionUpdate() {
  updateNotificationContainer.style.animation = "slideOutRight 0.4s ease-out";
  setTimeout(() => {
    updateNotificationContainer.style.display = "none";
    updateNotificationContainer.style.animation = "slideInRight 0.4s ease-out";
  }, 400);
}

// Escuchar eventos de actualización desde el proceso principal
if (window.electronAPI) {
  // Cuando empieza la descarga
  window.electronAPI.onUpdateDownloadingStarted(() => {
    console.log("[UPDATE] Descarga de actualización iniciada");
    mostrarNotificacionUpdate(
      "📥 Descargando Actualización",
      "La descarga se está realizando en segundo plano...",
      true,
    );
    progressBar.style.width = "0%";
    pptProgressText.textContent = "0% - Preparando descarga...";
  });

  // Progreso de descarga
  window.electronAPI.onUpdateDownloadProgress((data) => {
    console.log(`[UPDATE] Progreso: ${data.percent}%`);
    progressBar.style.width = `${data.percent}%`;
    pptProgressText.textContent = `${data.percent}% - ${data.transferred}MB de ${data.total}MB (${data.speed}MB/s)`;
  });

  // Cuando la descarga se completa
  window.electronAPI.onUpdateDownloaded(() => {
    console.log("[UPDATE] Descarga completada");
    progressBar.style.width = "100%";
    pptProgressText.textContent = "100% - ¡Descarga completada!";

    setTimeout(() => {
      mostrarNotificacionUpdate(
        "✅ Actualización Lista",
        "La actualización se instalará cuando cierres la aplicación.",
        false,
      );

      // Ocultar después de 8 segundos
      setTimeout(ocultarNotificacionUpdate, 8000);
    }, 1500);
  });

  // Cuando ocurre un error
  window.electronAPI.onUpdateError((errorMessage) => {
    console.error("[UPDATE] Error:", errorMessage);

    // Ocultar inmediatamente el widget
    ocultarNotificacionUpdate();

    // Log del error para debugging
    console.log("[UPDATE] Widget ocultado debido a error");
  });
}

// ========================================

const contenedorMonitor = document.getElementById("contenedor-monitores");

//Parap pruebas
if (modo === "sandbox") {
  //localStorage.removeItem("paypalSubscriptionId");
}

const URL_JSON = "https://proyectoja.github.io/codigosHimnario.json";

async function validarCodigo(codigoAux) {
  try {
    const response = await fetch(URL_JSON, { cache: "no-store" });
    if (!response.ok) throw new Error("Error al cargar el código");

    const data = await response.json();
    return data.codigo.includes(codigoAux);
  } catch (error) {
    console.error("Error al validar código:", error);
    return false;
  }
}

//Validación premium
// Función auxiliar para obtener ID único de máquina (Hardware)
async function getMachineId() {
  if (window.electronAPI && window.electronAPI.getMachineId) {
    try {
      const id = await window.electronAPI.getMachineId();
      // Codificar en Base64 para mantener consistencia con lo anterior
      return btoa(id);
    } catch (e) {
      console.error("Error obteniendo Machine ID:", e);
    }
  }

  // Fallback a localStorage si falla electronAPI (no debería pasar en la app de escritorio)
  let id = localStorage.getItem("machineId");
  if (!id) {
    id = crypto.randomUUID();
    id = btoa(id);
    localStorage.setItem("machineId", id);
  }
  return id;
}

//Validación premium
async function validarPremium() {
  const promoCode = localStorage.getItem("promoCode");
  const paypalId = localStorage.getItem("paypalSubscriptionId");
  const stripeId = localStorage.getItem("stripeSubscriptionId");
  const machineId = await getMachineId();

  console.log("Validando Premium...", {
    promoCode,
    paypalId,
    stripeId,
    machineId,
  });

  if (!promoCode && !paypalId && !stripeId) {
    localStorage.setItem("premium", "false");
    aplicarEstadoPremium(false);
    return;
  }

  const API_URL = "https://verificador-paypal.vercel.app/api/verificaPremium";

  // 1. Validar PROMO
  if (promoCode) {
    try {
      const res = await fetchWithTimeout(
        `${API_URL}?promoCode=${promoCode}&machineId=${machineId}`,
        { timeout: 4000 },
      );
      const data = await res.json();

      if (data.premium === true) {
        localStorage.setItem("premium", "true");
        localStorage.setItem("lastValidationDate", Date.now().toString());
        aplicarEstadoPremium(true);
        return;
      }
    } catch (err) {
      console.error("❌ Error al verificar Promo:", err);
    }
  }

  // 2. Validar PayPal
  if (paypalId) {
    // Intentar validar PayPal primero si existe
    try {
      const res = await fetchWithTimeout(
        `${API_URL}?subscriptionId=${paypalId}&modo=${modo}&proveedor=paypal&machineId=${machineId}`,
        { timeout: 4000 },
      );
      const data = await res.json();

      if (data.premium === true) {
        localStorage.setItem("premium", "true");
        localStorage.setItem("lastValidationDate", Date.now().toString());
        aplicarEstadoPremium(true);
        return; // Salir si ya validó
      }
    } catch (err) {
      console.error("❌ Error al verificar PayPal:", err);
    }
  }

  // Intentar validar Stripe si existe (y PayPal falló o no existe)

  // 3. Validar Stripe
  if (stripeId) {
    try {
      const res = await fetchWithTimeout(
        `${API_URL}?subscriptionId=${stripeId}&modo=${modoAux}&proveedor=stripe&machineId=${machineId}`,
        { timeout: 4000 },
      );
      const data = await res.json();

      if (data.premium === true) {
        localStorage.setItem("premium", "true");
        localStorage.setItem("lastValidationDate", Date.now().toString());
        aplicarEstadoPremium(true);
        return;
      }
    } catch (err) {
      console.error("❌ Error al verificar Stripe:", err);
    }
  }

  // Si llegamos aquí, ninguna validación funcionó
  // Verificar periodo de gracia (7 días)
  const lastValidation = localStorage.getItem("lastValidationDate");
  if (lastValidation && (promoCode || paypalId || stripeId)) {
    const daysDiff =
      (Date.now() - parseInt(lastValidation)) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
      alert(
        `[PREMIUM] Modo offline (Sin conexión a internet): Periodo de gracia activo (${
          7 - Math.floor(daysDiff)
        } días restantes.)`,
      );
      aplicarEstadoPremium(true);
      return;
    }
  }

  localStorage.setItem("premium", "false");
  aplicarEstadoPremium(false);
}
function aplicarEstadoPremium(esPremiumAux) {
  console.log("[PREMIUM] Aplicando estado premium:", esPremiumAux);

  // 🔐 Actualizar variable global
  esPremium = esPremiumAux;

  // 🔐 Notificar al proceso principal el estado premium (para control remoto)
  if (window.electronAPI && window.electronAPI.setPremiumStatus) {
    window.electronAPI.setPremiumStatus(esPremiumAux);
    console.log("[PREMIUM] Estado premium notificado al proceso principal");
  }

  if (esPremiumAux) {
    waterMark = "";
    if (botonPremium) botonPremium.style.display = "none";
    if (contenedorPremium) contenedorPremium.style.display = "none";
    document.querySelectorAll(".contenedorPremiumActivado").forEach((el) => {
      el.style.display = "flex";
    });
    if (contenedorMonitor) contenedorMonitor.style.display = "flex";

    // 📌 OCULTAR MARCA DE AGUA DE POWERPOINT (usuario premium)
    actualizarMarcaAguaPowerPoint();
  } else {
    waterMark = "imagenes/logo-proyectoja.png";
    if (botonPremium) botonPremium.style.display = "flex";
    document.querySelectorAll(".contenedorPremiumActivado").forEach((el) => {
      el.style.display = "none";
    });
    if (contenedorMonitor) contenedorMonitor.style.display = "flex";

    // 📌 MOSTRAR MARCA DE AGUA DE POWERPOINT (usuario gratis)
    actualizarMarcaAguaPowerPoint();
  }

  // 📌 Actualizar información en el menú de usuario
  actualizarInformacionUsuarioMenu();
}

/**
 * Actualiza los campos de información de usuario en el menú de configuración
 * @param {Object} datosExtra Opcional: { url, pin } del control remoto
 */
function actualizarInformacionUsuarioMenu(datosExtra = {}) {
  const infoEstado = document.getElementById("info-estado-licencia");
  const infoUrl = document.getElementById("info-url-remoto");
  const infoPin = document.getElementById("info-pin-remoto");
  const infoCodigo = document.getElementById("info-codigo-premium");

  if (!infoEstado) return;

  const esPremiumGlobal = localStorage.getItem("premium") === "true";
  const promoCode = localStorage.getItem("promoCode");
  const paypalId = localStorage.getItem("paypalSubscriptionId");
  const stripeId = localStorage.getItem("stripeSubscriptionId");

  // Actualizar estado
  infoEstado.innerHTML = `Estado: <span style="color: ${
    esPremiumGlobal ? "#4CAF50" : "#ffeb3b"
  }">${esPremiumGlobal ? "Licencia Premium" : "Licencia Gratis"}</span>`;

  // Actualizar código premium
  if (esPremiumGlobal) {
    infoCodigo.textContent = `${promoCode || paypalId || stripeId || "Activo"}`;
  } else {
    infoCodigo.textContent = "Sin código";
  }

  // Actualizar URL y PIN del control remoto
  if (datosExtra.url) {
    infoUrl.textContent = `Control remoto corriendo en: ${datosExtra.url}`;

    // Generar QR y mostrarlo
    const imgQr = document.getElementById("img-qr-remoto");
    const containerQr = document.getElementById("contenedor-qr-remoto");

    if (
      imgQr &&
      containerQr &&
      window.electronAPI &&
      window.electronAPI.generateQRCodeDataURL
    ) {
      // Agregar PIN a la URL para autoconexión
      const urlConPin = datosExtra.pin
        ? `${datosExtra.url}?pin=${datosExtra.pin}`
        : datosExtra.url;

      window.electronAPI
        .generateQRCodeDataURL(urlConPin)
        .then((url) => {
          imgQr.src = url;
          containerQr.style.display = "block";
        })
        .catch((err) => {
          console.error("Error generando QR:", err);
          containerQr.style.display = "none";
        });
    }
  } else if (!esPremiumGlobal) {
    infoUrl.innerHTML =
      "🔒 <span style='opacity:0.7'>Control remoto: Solo Premium</span>";

    // Ocultar QR si no es premium
    const containerQr = document.getElementById("contenedor-qr-remoto");
    if (containerQr) containerQr.style.display = "none";
  }

  if (datosExtra.pin) {
    infoPin.textContent = `Pin del control remoto: ${datosExtra.pin}`;

    // Mostrar botón de reinicio si hay PIN
    const btnReset = document.getElementById("boton-resetear-conexion");
    if (btnReset) {
      btnReset.style.display = "block";
      // Estilos elegantes
      btnReset.style.background = "linear-gradient(45deg, #d32f2f, #b71c1c)";
      btnReset.style.color = "white";
      btnReset.style.border = "none";
      btnReset.style.padding = "10px 15px";
      btnReset.style.borderRadius = "20px";
      btnReset.style.cursor = "pointer";
      btnReset.style.fontSize = "13px";
      btnReset.style.width = "100%";
      btnReset.style.marginTop = "15px";
      btnReset.style.fontWeight = "bold";
      btnReset.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
      btnReset.style.transition = "all 0.3s ease";

      // Efecto hover
      btnReset.onmouseover = () => {
        btnReset.style.transform = "translateY(-2px)";
        btnReset.style.boxShadow = "0 6px 10px rgba(0,0,0,0.3)";
      };
      btnReset.onmouseout = () => {
        btnReset.style.transform = "translateY(0)";
        btnReset.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
      };

      btnReset.onclick = async () => {
        if (
          confirm(
            "⚠️ ¿Resetear conexión remota?\n\nEsto desconectará todos los dispositivos actuales y generará un nuevo PIN de seguridad.",
          )
        ) {
          // Guardar estado original
          const textoOriginal = "Resetear conexión";
          btnReset.disabled = true;
          btnReset.innerHTML = "⌛ Reseteando...";
          const bgOriginal = btnReset.style.background; // Guardamos el gradiente
          btnReset.style.background = "#666"; // Color gris mientras carga

          try {
            const result = await window.electronAPI.resetRemoteConnection();
            if (result.success) {
              // Actualizar UI con nuevos datos
              actualizarInformacionUsuarioMenu({
                url: result.url,
                pin: result.pin,
              });
              alert(
                "✅ Conexión reseteada exitosamente.\n\nNuevo PIN generado.",
              );
            } else {
              alert("Error al resetear: " + (result.error || "Desconocido"));
            }
          } catch (e) {
            console.error(e);
            alert("Error de comunicación al resetear");
          } finally {
            // Restaurar estado SIEMPRE
            btnReset.textContent = textoOriginal;
            btnReset.disabled = false;
            btnReset.style.background =
              "linear-gradient(45deg, #d32f2f, #b71c1c)";
          }
        }
      };
    }
  } else if (!esPremiumGlobal) {
    infoPin.innerHTML =
      "🔒 <span style='opacity:0.7'>Pin: Actualiza para desbloquear</span>";

    // Ocultar botón de reinicio si no es premium
    const btnReset = document.getElementById("boton-resetear-conexion");
    if (btnReset) btnReset.style.display = "none";
  }
}

//Variables para pruebas unitarias
//localStorage.setItem("promoCode", "");
//localStorage.setItem("paypalSubscriptionId", "");
//localStorage.setItem("stripeSubscriptionId", "");

const botonPremium = document.getElementById("botonPremium");
const contenedorPremium = document.getElementById("paypal-button-container");
async function validarCodigos() {
  const codigoIngresado = document.getElementById("codigoUnico").value.trim();
  const promoStored = localStorage.getItem("promoCode");
  const paypalIdAlmacenado = localStorage.getItem("paypalSubscriptionId");
  const stripeIdAlmacenado = localStorage.getItem("stripeSubscriptionId");

  const machineId = await getMachineId();
  const API_URL = "https://verificador-paypal.vercel.app/api/verificaPremium";

  let codigoAValidar = codigoIngresado;

  // Si no ingresó nada, intentar usar lo almacenado
  if (!codigoIngresado) {
    if (promoStored) codigoAValidar = promoStored;
    else if (paypalIdAlmacenado) codigoAValidar = paypalIdAlmacenado;
    else if (stripeIdAlmacenado) codigoAValidar = stripeIdAlmacenado;
  }

  if (!codigoAValidar) {
    alert("⚠️ Ingresa un código primero.");
    return;
  }

  // Función auxiliar genérica
  const validarConApi = async (url) => {
    const res = await fetchWithTimeout(url, { timeout: 5000 });
    if (!res.ok) throw new Error("Error servidor");
    return await res.json();
  };

  try {
    // 1. Intentar como PROMO CODE
    console.log("Intentando validar como Promo Code...");
    try {
      const dataPromo = await validarConApi(
        `${API_URL}?promoCode=${codigoAValidar}&machineId=${machineId}`,
      );
      if (dataPromo.premium === true) {
        alert("✅ Código Promocional válido, acceso premium activado");
        if (codigoIngresado) {
          localStorage.setItem("promoCode", codigoIngresado);
          localStorage.removeItem("paypalSubscriptionId");
          localStorage.removeItem("stripeSubscriptionId");
        }
        localStorage.setItem("premium", "true");
        localStorage.setItem("lastValidationDate", Date.now().toString());
        aplicarEstadoPremium(true);
        return;
      }
    } catch (e) {
      console.log("Fallo Promo:", e);
    }

    // 2. Intentar validar como PayPal
    console.log("Intentando validar como PayPal...");
    try {
      const dataPaypal = await validarConApi(
        `${API_URL}?subscriptionId=${codigoAValidar}&proveedor=paypal&modo=${modo}&machineId=${machineId}`,
      );
      if (dataPaypal.premium === true) {
        alert("✅ Código PayPal válido, acceso premium activado");
        if (codigoIngresado) {
          localStorage.setItem("paypalSubscriptionId", codigoIngresado);
          localStorage.removeItem("stripeSubscriptionId");
          localStorage.removeItem("promoCode");
        }
        localStorage.setItem("premium", "true");
        localStorage.setItem("lastValidationDate", Date.now().toString());
        aplicarEstadoPremium(true);
        return;
      }
    } catch (e) {
      console.log("Fallo validación PayPal, intentando Stripe...");
    }

    // 3. Intentar validar como Stripe
    console.log("Intentando validar como Stripe...");
    const dataStripe = await validarConApi(
      `${API_URL}?subscriptionId=${codigoAValidar}&proveedor=stripe&modo=${modoAux}&machineId=${machineId}`,
    );
    if (dataStripe.premium === true) {
      alert("✅ Código Stripe válido, acceso premium activado");
      if (codigoIngresado) {
        localStorage.setItem("stripeSubscriptionId", codigoIngresado);
        localStorage.removeItem("paypalSubscriptionId");
        localStorage.removeItem("promoCode");
      }
      localStorage.setItem("premium", "true");
      localStorage.setItem("lastValidationDate", Date.now().toString());
      aplicarEstadoPremium(true);
      return;
    }

    // Si llegamos aquí, fallaron todos
    alert("❌ Código inválido, expirado o ya usado en otra máquina.");
    localStorage.setItem("premium", "false");
    aplicarEstadoPremium(false);
  } catch (err) {
    console.error("❌ Error general al verificar:", err);
    alert("❌ Error al conectar con el servidor. Intenta nuevamente.");
  }
}

botonPremium.addEventListener("click", function () {
  const displayContenedorPremium = getComputedStyle(contenedorPremium).display;

  if (displayContenedorPremium === "none") {
    contenedorPremium.textContent = "";
    validarPremium();
    const subscriptionIdDos = localStorage.getItem("paypalSubscriptionId");

    // Aplicar estilos mejorados al contenedor principal
    // Aplicar estilos mejorados al contenedor principal
    // Aplicar estilos mejorados al contenedor principal (Glassmorphism + Modern)
    contenedorPremium.style.display = "flex";
    contenedorPremium.style.flexDirection = "column";
    contenedorPremium.style.padding = "25px";
    contenedorPremium.style.overflowY = "auto";
    contenedorPremium.style.overflowX = "hidden";
    contenedorPremium.style.maxHeight = "80vh";
    contenedorPremium.style.width = "auto";
    contenedorPremium.style.minWidth = "450px";
    contenedorPremium.style.maxWidth = "95vw";

    // Modern Gradient Background (Blue/Teal theme from web design request)
    contenedorPremium.style.background =
      "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)";
    contenedorPremium.style.borderRadius = "20px";
    contenedorPremium.style.boxShadow = "0 8px 32px 0 rgba(31, 38, 135, 0.37)";
    contenedorPremium.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    contenedorPremium.style.backdropFilter = "blur(10px)";
    contenedorPremium.style.color = "#FFF8DC";
    contenedorPremium.style.fontFamily =
      "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"; // Modern font stack

    // Contenedor interno para mejor control
    const contenedorInterno = document.createElement("div");
    contenedorInterno.style.width = "100%";
    contenedorInterno.style.display = "flex";
    contenedorInterno.style.flexDirection = "column";
    contenedorInterno.style.gap = "15px";

    // Título principal con más impacto
    const tituloPrincipal = document.createElement("h2");
    tituloPrincipal.innerHTML = "¡Lleva tu adoración al<br>siguiente nivel! 🚀";
    tituloPrincipal.style.color = "#FFF8DC";
    tituloPrincipal.style.textAlign = "center";
    tituloPrincipal.style.margin = "0 0 5px 0";
    tituloPrincipal.style.fontFamily = "Arial, sans-serif";
    tituloPrincipal.style.fontSize = "26px";
    tituloPrincipal.style.fontWeight = "bold";
    tituloPrincipal.style.textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
    contenedorInterno.appendChild(tituloPrincipal);

    const subTitulo = document.createElement("p");
    subTitulo.textContent =
      "Desbloquea herramientas profesionales para tu iglesia";
    subTitulo.style.color = "#bdc3c7";
    subTitulo.style.textAlign = "center";
    subTitulo.style.margin = "0 0 15px 0";
    subTitulo.style.fontSize = "14px";
    contenedorInterno.appendChild(subTitulo);

    // Contenedor de comparación
    const contenedorComparacion = document.createElement("div");
    contenedorComparacion.style.display = "flex";
    contenedorComparacion.style.flexDirection = "row";
    contenedorComparacion.style.gap = "15px";
    contenedorComparacion.style.flexWrap = "wrap";
    contenedorComparacion.style.justifyContent = "center";

    // Columna Versión Gratis
    const columnaGratis = document.createElement("div");
    columnaGratis.style.flex = "1";
    columnaGratis.style.minWidth = "180px";
    columnaGratis.style.background = "rgba(255, 255, 255, 0.05)";
    columnaGratis.style.padding = "20px";
    columnaGratis.style.borderRadius = "16px";
    columnaGratis.style.textAlign = "center";
    columnaGratis.style.border = "1px solid rgba(255,255,255,0.1)";
    columnaGratis.style.transform = "scale(0.95)";
    columnaGratis.style.opacity = "0.8";

    const tituloGratis = document.createElement("h3");
    tituloGratis.textContent = "Básico";
    tituloGratis.style.color = "rgba(255,255,255,0.7)";
    tituloGratis.style.margin = "0 0 15px 0";
    tituloGratis.style.fontSize = "18px";
    tituloGratis.style.fontWeight = "bold";
    tituloGratis.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
    tituloGratis.style.paddingBottom = "10px";

    const listaGratis = document.createElement("ul");
    listaGratis.style.textAlign = "left";
    listaGratis.style.color = "rgba(255,255,255,0.7)";
    listaGratis.style.listStyle = "none";
    listaGratis.style.padding = "0";
    listaGratis.style.margin = "0";
    listaGratis.style.fontSize = "13px";
    listaGratis.innerHTML = `
      <li style="margin-bottom: 8px;">✅ Todos los himnos</li>
      <li style="margin-bottom: 8px;">✅ Búsqueda básica</li>
      <li style="margin-bottom: 8px;">❌ Marca de agua</li>
      <li style="margin-bottom: 8px;">❌ Sin control remoto</li>
      <li style="margin-bottom: 8px;">❌ Sin Biblia proyectable</li>
    `;

    columnaGratis.appendChild(tituloGratis);
    columnaGratis.appendChild(listaGratis);
    contenedorComparacion.appendChild(columnaGratis);

    // Columna Versión Premium (DESTACADA)
    const columnaPremium = document.createElement("div");
    columnaPremium.style.flex = "1.2"; // Más grande
    columnaPremium.style.minWidth = "220px";
    columnaPremium.style.background =
      "linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)";
    columnaPremium.style.padding = "25px";
    columnaPremium.style.borderRadius = "20px";
    columnaPremium.style.textAlign = "center";
    columnaPremium.style.boxShadow =
      "0 10px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,215,0,0.3)"; // Borde dorado sutil
    columnaPremium.style.position = "relative";
    columnaPremium.style.border = "1px solid rgba(255,255,255,0.2)";
    columnaPremium.style.zIndex = "10";

    // Badge de Recomendado
    const badge = document.createElement("div");
    badge.textContent = "🔥 RECOMENDADO";
    badge.style.position = "absolute";
    badge.style.top = "-12px";
    badge.style.left = "50%";
    badge.style.transform = "translateX(-50%)";
    badge.style.background = "#FFD700";
    badge.style.color = "#000";
    badge.style.padding = "5px 15px";
    badge.style.borderRadius = "20px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "bold";
    badge.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    columnaPremium.appendChild(badge);

    const tituloPremium = document.createElement("h3");
    tituloPremium.innerHTML = "⭐ PREMIUM PRO";
    tituloPremium.style.color = "#FFD700";
    tituloPremium.style.margin = "10px 0 15px 0";
    tituloPremium.style.fontSize = "24px";
    tituloPremium.style.fontWeight = "bold";
    tituloPremium.style.textShadow = "0 0 15px rgba(255,215,0,0.3)";
    tituloPremium.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
    tituloPremium.style.paddingBottom = "15px";

    const listaPremium = document.createElement("ul");
    listaPremium.style.textAlign = "left";
    listaPremium.style.color = "#FFF";
    listaPremium.style.listStyle = "none";
    listaPremium.style.padding = "0";
    listaPremium.style.margin = "0";
    listaPremium.style.fontSize = "14px";

    // Lista de beneficios con iconos más atractivos
    listaPremium.innerHTML = `
      <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">📱</span> <strong>Control Remoto desde Celular</strong>
      </li>
      <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">✨</span> <strong>Sin Marca de Agua (Limpio)</strong>
      </li>
      <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">📖</span> Biblia con múltiples versiones
      </li>
      <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">🎹</span> Himnos Personalizables & Pistas
      </li>
      <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">🎞️</span> Fondos Dinámicos & YouTube Full
      </li>
      <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">🚀</span> Soporte Prioritario VIP
      </li>
    `;

    columnaPremium.appendChild(tituloPremium);
    columnaPremium.appendChild(listaPremium);
    contenedorComparacion.appendChild(columnaPremium);

    contenedorInterno.appendChild(contenedorComparacion);

    // Mensaje Social Proof
    const mensajeSocial = document.createElement("p");
    mensajeSocial.innerHTML =
      '<em>"Una herramienta esencial para el ministerio de hoy."</em><br>⭐⭐⭐⭐⭐ - Líderes de Alabanza';
    mensajeSocial.style.textAlign = "center";
    mensajeSocial.style.color = "#ecf0f1";
    mensajeSocial.style.fontSize = "13px";
    mensajeSocial.style.marginTop = "20px";
    mensajeSocial.style.opacity = "0.8";
    contenedorInterno.appendChild(mensajeSocial);

    // Separador Plan Mensual
    const separador = document.createElement("div");
    separador.style.margin = "20px 0 10px 0";
    separador.style.textAlign = "center";
    separador.innerHTML =
      "<span style='background: rgba(44, 62, 80, 0.8); padding: 5px 15px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.2); font-weight: bold;'>💎 Opción Flexible</span>";
    contenedorInterno.appendChild(separador);

    // Texto de precio mensual
    const precioMensual = document.createElement("h3");
    precioMensual.innerHTML =
      "$8,99 <span style='font-size: 14px; font-weight: normal; opacity: 0.7;'>/ mes</span>";
    precioMensual.style.textAlign = "center";
    precioMensual.style.margin = "5px 0 10px 0";
    precioMensual.style.fontSize = "28px";
    precioMensual.style.color = "#FFF";
    contenedorInterno.appendChild(precioMensual);

    // Contenedor de PayPal (MENSUAL)
    const paypalContainer = document.createElement("div");
    paypalContainer.id = "paypal-button-container-inner";
    paypalContainer.style.width = "100%";
    paypalContainer.style.maxWidth = "280px";
    paypalContainer.style.alignSelf = "center";
    paypalContainer.style.minHeight = "45px";
    paypalContainer.style.marginBottom = "10px";
    // Placeholder
    paypalContainer.innerHTML =
      "<div style='text-align:center;font-size:12px;opacity:0.7'>Cargando botón seguro...</div>";
    contenedorInterno.appendChild(paypalContainer);

    // Separador Plan Anual (El más atractivo)
    const contenedorAnual = document.createElement("div");
    contenedorAnual.style.background = "rgba(46, 204, 113, 0.1)"; // Fondo verdoso suave
    contenedorAnual.style.border = "1px solid rgba(46, 204, 113, 0.4)";
    contenedorAnual.style.borderRadius = "15px";
    contenedorAnual.style.padding = "15px";
    contenedorAnual.style.margin = "10px 0";
    contenedorAnual.style.textAlign = "center";

    const tituloAnual = document.createElement("h4");
    tituloAnual.innerHTML = "🏆 MEJOR VALOR: Plan Anual";
    tituloAnual.style.color = "#2ecc71"; // Verde vibrante
    tituloAnual.style.margin = "0 0 5px 0";
    tituloAnual.style.fontSize = "16px";
    tituloAnual.style.fontWeight = "bold";
    contenedorAnual.appendChild(tituloAnual);

    const precioAnual = document.createElement("div");
    precioAnual.innerHTML =
      "<span style='text-decoration: line-through; opacity: 0.6; font-size: 14px;'>$149.00</span> <span style='font-size: 22px; font-weight: bold;'>$107,88</span> <span style='font-size: 12px;'>/ año</span>";
    precioAnual.style.marginBottom = "10px";
    contenedorAnual.appendChild(precioAnual);

    const textoAhorro = document.createElement("div");
    textoAhorro.textContent = "¡Un solo pago, 12 meses de tranquilidad!";
    textoAhorro.style.fontSize = "12px";
    textoAhorro.style.color = "#bdc3c7";
    textoAhorro.style.marginBottom = "10px";
    contenedorAnual.appendChild(textoAhorro);

    // Contenedor de PayPal (ANUAL)
    const paypalContainerAnual = document.createElement("div");
    paypalContainerAnual.id = "paypal-button-container-anual";
    paypalContainerAnual.style.width = "100%";
    paypalContainerAnual.style.maxWidth = "280px";
    paypalContainerAnual.style.margin = "0 auto";
    paypalContainerAnual.style.minHeight = "45px";
    contenedorAnual.appendChild(paypalContainerAnual);

    contenedorInterno.appendChild(contenedorAnual);

    // NUEVO: Enlace alternativo si falla - BOTÓN VISIBLE
    const alternativoLinkContainer = document.createElement("div");
    alternativoLinkContainer.style.textAlign = "center";
    alternativoLinkContainer.style.margin = "20px 0 10px 0";

    const alternativoLink = document.createElement("button");
    alternativoLink.innerHTML = "🔗 ¿Problemas con PayPal? Clic Aquí";

    // Estilos modernos para el botón de ayuda
    alternativoLink.style.background = "rgba(255, 255, 255, 0.1)";
    alternativoLink.style.color = "#bdc3c7";
    alternativoLink.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    alternativoLink.style.padding = "8px 20px";
    alternativoLink.style.borderRadius = "50px";
    alternativoLink.style.fontSize = "12px";
    alternativoLink.style.cursor = "pointer";
    alternativoLink.style.transition = "all 0.3s ease";

    alternativoLink.onmouseenter = () => {
      alternativoLink.style.background = "rgba(255, 255, 255, 0.2)";
      alternativoLink.style.color = "white";
    };
    alternativoLink.onmouseleave = () => {
      alternativoLink.style.background = "rgba(255, 255, 255, 0.1)";
      alternativoLink.style.color = "#bdc3c7";
    };

    alternativoLink.onclick = (e) => {
      e.preventDefault();
      window.open(
        "https://proyectoja.github.io/suscribirHimnario.html",
        "_blank",
      );
    };

    alternativoLinkContainer.appendChild(alternativoLink);
    contenedorInterno.appendChild(alternativoLinkContainer);

    // --- SECCIÓN STRIPE ---
    const separadorStripe = document.createElement("div");
    separadorStripe.style.width = "100%";
    separadorStripe.style.textAlign = "center";
    separadorStripe.style.margin = "20px 0 10px 0";
    separadorStripe.innerHTML =
      "<span style='color: #FFF8DC; font-weight: bold; font-family: Verdana; font-size: 14px;'>💳 O paga con Tarjeta (Stripe)</span>";
    //contenedorInterno.appendChild(separadorStripe);

    const contenedorStripe = document.createElement("div");
    contenedorStripe.style.display = "flex";
    contenedorStripe.style.flexDirection = "column";
    contenedorStripe.style.gap = "10px";
    contenedorStripe.style.alignItems = "center";
    contenedorStripe.style.width = "100%";

    // Botón Stripe Mensual
    const btnStripeMensual = document.createElement("button");
    btnStripeMensual.innerHTML =
      "💳 Suscripción Mensual <strong>($8,99)</strong>";
    btnStripeMensual.style.display = "block";
    btnStripeMensual.style.width = "100%";
    btnStripeMensual.style.maxWidth = "300px";
    btnStripeMensual.style.padding = "12px";
    btnStripeMensual.style.textAlign = "center";
    // Gradient Stripe-like
    btnStripeMensual.style.background =
      "linear-gradient(90deg, #6772e5 0%, #5469d4 100%)";
    btnStripeMensual.style.color = "white";
    btnStripeMensual.style.border = "none";
    btnStripeMensual.style.borderRadius = "8px";
    btnStripeMensual.style.cursor = "pointer";
    btnStripeMensual.style.fontWeight = "bold";
    btnStripeMensual.style.fontSize = "14px";
    btnStripeMensual.style.boxShadow =
      "0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)";
    btnStripeMensual.style.transition = "transform 0.2s";

    btnStripeMensual.onmouseenter = () => {
      btnStripeMensual.style.transform = "translateY(-2px)";
    };
    btnStripeMensual.onmouseleave = () => {
      btnStripeMensual.style.transform = "translateY(0)";
    };

    btnStripeMensual.onclick = async () => {
      const res = await fetch(
        `https://verificador-paypal.vercel.app/api/verificaPremium?proveedor=stripe&crear=checkout&plan=mensual&modo=${modoAux}`,
      );
      const data = await res.json();

      if (window.electronAPI) {
        window.electronAPI.openExternal(data.checkoutUrl);
      } else {
        window.open(data.checkoutUrl, "_blank");
      }
    };

    contenedorStripe.appendChild(btnStripeMensual);

    // Botón Stripe Anual
    const btnStripeAnual = document.createElement("button");
    btnStripeAnual.innerHTML =
      "🏆 Suscripción Anual <strong>($107,88)</strong>";
    btnStripeAnual.style.display = "block";
    btnStripeAnual.style.width = "100%";
    btnStripeAnual.style.maxWidth = "300px";
    btnStripeAnual.style.padding = "12px";
    btnStripeAnual.style.textAlign = "center";
    btnStripeAnual.style.background =
      "linear-gradient(90deg, #00b09b 0%, #96c93d 100%)"; // Green gradient for annual
    btnStripeAnual.style.color = "white";
    btnStripeAnual.style.border = "none";
    btnStripeAnual.style.borderRadius = "8px";
    btnStripeAnual.style.cursor = "pointer";
    btnStripeAnual.style.fontWeight = "bold";
    btnStripeAnual.style.fontSize = "15px";
    btnStripeAnual.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
    btnStripeAnual.style.transition = "transform 0.2s";

    btnStripeAnual.onmouseenter = () => {
      btnStripeAnual.style.transform = "translateY(-2px)";
    };
    btnStripeAnual.onmouseleave = () => {
      btnStripeAnual.style.transform = "translateY(0)";
    };

    btnStripeAnual.onclick = async () => {
      const res = await fetch(
        `https://verificador-paypal.vercel.app/api/verificaPremium?proveedor=stripe&crear=checkout&plan=anual&modo=${modoAux}`,
      );
      const data = await res.json();

      if (window.electronAPI) {
        window.electronAPI.openExternal(data.checkoutUrl);
      } else {
        window.open(data.checkoutUrl, "_blank");
      }
    };

    contenedorStripe.appendChild(btnStripeAnual);

    // Nota Stripe
    const notaStripe = document.createElement("p");
    notaStripe.textContent =
      "🔒 Pagos 100% seguros procesados por PayPal y Stripe. Recibirás el código inmediatamente.";
    notaStripe.style.color = "#bdc3c7";
    notaStripe.style.fontSize = "11px";
    notaStripe.style.fontStyle = "italic";
    notaStripe.style.marginTop = "5px";
    contenedorStripe.appendChild(notaStripe);

    //contenedorInterno.appendChild(contenedorStripe);

    // Agregar contenedor interno al principal
    contenedorPremium.appendChild(contenedorInterno);

    // Sección de código de suscripción (Modern Input)
    const seccionCodigo = document.createElement("div");
    seccionCodigo.style.width = "100%";
    seccionCodigo.style.background = "rgba(255, 255, 255, 0.1)";
    seccionCodigo.style.padding = "20px";
    seccionCodigo.style.borderRadius = "15px";
    seccionCodigo.style.marginBottom = "0";
    seccionCodigo.style.textAlign = "center";
    seccionCodigo.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    seccionCodigo.style.backdropFilter = "blur(5px)";

    const tituloCodigo = document.createElement("h4");
    tituloCodigo.textContent = "🔑 ¿Ya tienes un código?";
    tituloCodigo.style.color = "#FFF";
    tituloCodigo.style.margin = "0 0 15px 0";
    tituloCodigo.style.fontSize = "17px";
    tituloCodigo.style.fontWeight = "bold";

    const contenedorInput = document.createElement("div");
    contenedorInput.style.display = "flex";
    contenedorInput.style.flexDirection = "column";
    contenedorInput.style.gap = "12px";
    contenedorInput.style.alignItems = "center";

    const codigoUnico = document.createElement("input");
    codigoUnico.id = "codigoUnico";
    codigoUnico.type = "text";
    codigoUnico.placeholder = subscriptionIdDos
      ? subscriptionIdDos
      : "Ingresa tu código premium...";
    codigoUnico.style.width = "100%";
    codigoUnico.style.maxWidth = "300px";
    codigoUnico.style.padding = "12px 15px";
    codigoUnico.style.border = "1px solid rgba(255,255,255,0.3)";
    codigoUnico.style.borderRadius = "8px";
    codigoUnico.style.fontSize = "15px";
    codigoUnico.style.outline = "none";
    codigoUnico.style.background = "rgba(0,0,0,0.2)";
    codigoUnico.style.color = "#FFF";
    codigoUnico.style.textAlign = "center";
    codigoUnico.style.transition = "all 0.3s ease";

    codigoUnico.addEventListener("focus", function () {
      this.style.borderColor = "#4ca1af";
      this.style.boxShadow = "0 0 10px rgba(76, 161, 175, 0.5)";
      this.style.background = "rgba(0,0,0,0.4)";
    });

    codigoUnico.addEventListener("blur", function () {
      this.style.borderColor = "rgba(255,255,255,0.3)";
      this.style.boxShadow = "none";
      this.style.background = "rgba(0,0,0,0.2)";
    });

    const botonValidar = document.createElement("button");
    botonValidar.textContent = "🔓 Activar Premium";
    botonValidar.style.padding = "12px 30px";
    botonValidar.style.background =
      "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)";
    botonValidar.style.color = "#FFF";
    botonValidar.style.border = "none";
    botonValidar.style.borderRadius = "50px";
    botonValidar.style.fontSize = "15px";
    botonValidar.style.fontWeight = "bold";
    botonValidar.style.cursor = "pointer";
    botonValidar.style.transition = "all 0.3s ease";
    botonValidar.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    botonValidar.style.minWidth = "180px";
    botonValidar.style.letterSpacing = "0.5px";

    botonValidar.addEventListener("mouseover", function () {
      this.style.transform = "translateY(-1px)";
      this.style.boxShadow = "0 5px 15px rgba(139, 69, 19, 0.4)";
    });

    botonValidar.addEventListener("mouseout", function () {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "0 3px 10px rgba(139, 69, 19, 0.3)";
    });

    botonValidar.onclick = () => validarCodigos();

    contenedorInput.appendChild(codigoUnico);
    contenedorInput.appendChild(botonValidar);

    seccionCodigo.appendChild(tituloCodigo);
    seccionCodigo.appendChild(contenedorInput);
    contenedorInterno.appendChild(seccionCodigo);

    // NUEVO: Mensaje sobre cambios en el monto
    const mensajeMonto = document.createElement("div");
    mensajeMonto.style.textAlign = "center";
    mensajeMonto.style.marginTop = "5px";
    mensajeMonto.style.padding = "8px";
    mensajeMonto.style.background = "rgba(139, 69, 19, 0.3)";
    mensajeMonto.style.borderRadius = "6px";
    mensajeMonto.style.border = "1px solid rgba(210, 105, 30, 0.4)";

    const textoMonto = document.createElement("p");
    textoMonto.innerHTML =
      "💡 <strong>Nota:</strong> El monto puede variar según actualizaciones futuras del servicio. Los suscriptores actuales mantienen su tarifa.";
    textoMonto.style.color = "#FFF8DC";
    textoMonto.style.margin = "0";
    textoMonto.style.fontSize = "10px";
    textoMonto.style.lineHeight = "1.2";
    textoMonto.style.textShadow = "1px 1px 1px rgba(0,0,0,0.3)";
    textoMonto.style.fontStyle = "italic";

    mensajeMonto.appendChild(textoMonto);
    contenedorInterno.appendChild(mensajeMonto);

    // Agregar contenedor interno al principal
    // contenedorPremium.appendChild(contenedorInterno); // Eliminado por duplicado

    // Inicializar PayPal después de un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      console.log("Intentando renderizar botón de PayPal...");
      const containerInner = document.getElementById(
        "paypal-button-container-inner",
      );
      if (!containerInner) {
        console.error(
          "Error: No se encontró el contenedor interno para el botón de PayPal",
        );
        return;
      }
      console.log("Contenedor interno encontrado. Limpiando y renderizando...");
      paypalContainer.innerHTML = ""; // Limpiar texto temporal

      if (!window.paypal || typeof window.paypal.Buttons !== "function") {
        console.error(
          "Error: El SDK de PayPal no se cargó correctamente o la función 'Buttons' no está disponible.",
        );
        paypalContainer.innerHTML =
          "<p style='color:red; text-align:center;'>Error: PayPal SDK no pudo inicializarse.<br>Verifique su conexión a internet y recargue la aplicación.</p>";
        return;
      }

      try {
        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "subscribe",
              height: 40,
              tagline: false,
            },
            createSubscription: function (data, actions) {
              return actions.subscription.create({
                plan_id: "P-0KY630971U339254XNFO7TMQ",
              });
            },
            onApprove: function (data, actions) {
              const subscriptionId = data.subscriptionID;
              alert(
                "🎉 ¡Suscripción exitosa! Ahora disfrutas de todas las ventajas premium.",
              );

              localStorage.setItem("paypalSubscriptionId", subscriptionId);
              localStorage.setItem("premium", "true");
              localStorage.setItem("lastValidationDate", Date.now().toString());

              location.reload();
            },
            onCancel: function () {
              alert("Suscripción cancelada.");
            },
            onError: function (err) {
              console.error("Error interno de PayPal:", err);
              alert("Error en el proceso de pago: " + err);
            },
          })
          .render("#paypal-button-container-inner");

        // RENDERIZAR BOTÓN ANUAL
        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "blue", // Diferenciar color para el anual
              shape: "rect",
              label: "subscribe",
              height: 40,
              tagline: false,
            },
            createSubscription: function (data, actions) {
              return actions.subscription.create({
                plan_id: "P-2YM91167P37929048NFO7UQI",
              });
            },
            onApprove: function (data, actions) {
              const subscriptionId = data.subscriptionID;
              alert(
                "🎉 ¡Suscripción Anual exitosa! Ahora disfrutas de todas las ventajas premium.",
              );

              localStorage.setItem("paypalSubscriptionId", subscriptionId);
              localStorage.setItem("premium", "true");
              localStorage.setItem("lastValidationDate", Date.now().toString());

              location.reload();
            },
            onCancel: function () {
              alert("Suscripción cancelada.");
            },
            onError: function (err) {
              console.error("Error interno de PayPal (Anual):", err);
              alert("Error en el proceso de pago: " + err);
            },
          })
          .render("#paypal-button-container-anual");

        console.log("✅ Botones de PayPal renderizados correctamente");
      } catch (error) {
        console.error("Error al renderizar botones de PayPal:", error);
        // Mostrar el error específico en pantalla
        paypalContainer.innerHTML = `<p style='color:red; text-align:center;'>Error al iniciar PayPal</p>`;
      }
    }, 500);
  } else {
    contenedorPremium.style.display = "none";
  }
});

const totalHimnos = 614;
// Referencia al contenedor principal del himnario
const himnarioContainer = document.getElementById("himnario");
const videoPlayerContainer = document.getElementById("videoPlayerContainer");
const closePlayerButton = document.getElementById("closePlayer");

// Array para almacenar todos los himnos
// Array para almacenar todos los himnos
let todosLosHimnos = [];
let todosLosHimnosLista = [];
let todosLosCantadosLista = [];
let todosLosPistasLista = [];
let todosLosAntiguosLista = [];
let todosLosCoritosLista = [];
let todosLosMusicaParaOrarDeFondoLista = [];
let todosHimnosPianoPista = [];
let todosLosHimnosInfantiles = [];
let todosLosHimnosAntiguos = [];
let todosLosFavoritosLista = [];
let todosLosFavoritosYouTubeLista = [];
// Listas adicionales para el módulo de programación
let todosLosHimnosJA = [];
let todosLosHimnosNacionales = [];
let todosLosStreamLista = [];

// Función para normalizar rutas de video para Clappr (Solución Cross-platform Mac/Win)
function formalizarRuta(ruta) {
  if (!ruta) return ruta;
  if (ruta.startsWith("http") || ruta.startsWith("https")) return ruta;

  // Normalizar separadores a '/'
  let rutaNormalizada = ruta.replace(/\\/g, "/");

  // Agregar protocolo file:// si no existe y parece ser una ruta de archivo
  if (!rutaNormalizada.startsWith("file://")) {
    // Windows drive letter (C:/...)
    if (rutaNormalizada.match(/^[a-zA-Z]:\//)) {
      rutaNormalizada = "file:///" + rutaNormalizada;
    }
    // Unix/Mac absolute path (/Users/...)
    else if (rutaNormalizada.startsWith("/")) {
      rutaNormalizada = "file://" + rutaNormalizada;
    }
  }
  return rutaNormalizada;
}

// Función auxiliar para iniciar reproducción (Extraída de crearHimno)
async function iniciarReproduccionHimno(titulo, videoPath, imagePath, lista) {
  const monitorActivo = esMonitorActivo();
  let isYouTube = false;
  let youtubeId = videoPath;

  // Detectar YouTube
  if (videoPath) {
    let regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    let match = videoPath.match(regex);
    if (match) {
      youtubeId = match[1];
      isYouTube = true;
    } else if (
      videoPath.length === 11 &&
      !videoPath.includes(".") &&
      !videoPath.includes("/")
    ) {
      isYouTube = true;
    }
  }

  if (isYouTube) {
    if (botonPRO == false && !monitorActivo) {
      if (typeof youtubeClapprEstandar === "function")
        youtubeClapprEstandar(youtubeId, imagePath, lista);
    } else {
      if (typeof youtubeClappr === "function")
        youtubeClappr(youtubeId, imagePath, lista);
    }
    return;
  }

  // Detectar si es Imagen (Local o remota)
  const esImagen = videoPath && videoPath.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  // Reproducción Local / Estandar
  if (botonPRO == false && !monitorActivo) {
    if (typeof audioHimno !== "undefined") audioHimno.pause();
    if (videoPlayerContainer) {
      videoPlayerContainer.innerHTML = "";
      videoPlayerContainer.appendChild(closePlayerButton);
      closePlayerButton.style.display = "flex";
    }

    if (esImagen) {
      // 🖼 Mostrar Imagen en modo Estandar
      try {
        let finalImageUrl = videoPath;
        if (
          videoPath.startsWith("file://") &&
          window.electronAPI &&
          window.electronAPI.leerArchivo
        ) {
          const purePath = videoPath.replace("file://", "");
          const base64 = await window.electronAPI.leerArchivo(purePath);
          const extension = purePath.split(".").pop();
          finalImageUrl = `data:image/${extension};base64,${base64}`;
        }

        const img = document.createElement("img");
        img.src = finalImageUrl;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.margin = "auto";
        videoPlayerContainer.appendChild(img);
        videoPlayerContainer.style.display = "flex";
      } catch (e) {
        console.error("[PLAYER] Error al cargar imagen local:", e);
      }
    } else if (botonLista == false) {
      // 🎥 Reproducir Video en modo Estandar
      let posterBase64 = null;
      if (imagePath) {
        try {
          if (window.electronAPI && window.electronAPI.leerArchivo) {
            const base64 = await window.electronAPI.leerArchivo(imagePath);
            const extension = imagePath.split(".").pop();
            posterBase64 = `data:image/${extension};base64,${base64}`;
          }
        } catch (e) {
          console.error("[PLAYER] Error poster:", e);
        }
      }

      player = new Clappr.Player({
        source: formalizarRuta(videoPath),
        parentId: "#videoPlayerContainer",
        width: "100%",
        height: "100vh",
        preload: "auto",
        autoPlay: true,
        volume: 100,
        poster: posterBase64,
        playbackNotSupportedMessage: "No se puede reproducir el contenido",
        watermark: waterMark,
        position: "bottom-right",
      });
      if (videoPlayerContainer) videoPlayerContainer.style.display = "flex";

      player.on(Clappr.Events.PLAYER_PLAY, function () {
        if (videoPlayerContainer.requestFullscreen)
          videoPlayerContainer.requestFullscreen();
        else if (videoPlayerContainer.webkitRequestFullscreen)
          videoPlayerContainer.webkitRequestFullscreen();
      });

      player.on(Clappr.Events.PLAYER_ENDED, function () {
        if (typeof ocultarReproductor === "function") ocultarReproductor();
      });
    } else {
      if (typeof cargarReproductorAleatorio === "function")
        cargarReproductorAleatorio(lista);
    }
  } else {
    // 🚀 Modo PRO / Monitor
    if (typeof audioHimno !== "undefined") audioHimno.pause();

    let datosAEnviar = {
      videoPath: esImagen ? null : videoPath,
      imagePath: imagePath,
      versiculo: "",
      libroAux: "",
      estilosAux: {},
      lista: lista,
      fondoBody: null,
      imagen: null, // Caso video
      waterMark: waterMark,
    };

    if (esImagen) {
      try {
        let finalImageUrl = videoPath;
        if (
          videoPath.startsWith("file://") &&
          window.electronAPI &&
          window.electronAPI.leerArchivo
        ) {
          const purePath = videoPath.replace("file://", "");
          const base64 = await window.electronAPI.leerArchivo(purePath);
          const extension = purePath.split(".").pop();
          finalImageUrl = `data:image/${extension};base64,${base64}`;
        }
        datosAEnviar.imagen = finalImageUrl;
      } catch (e) {
        console.error("[PLAYER-PRO] Error al procesar imagen:", e);
      }
    }

    enviarDatos(datosAEnviar);
  }
}

// Función para crear los contenedores de himnos
function crearHimno(titulo, videoPath, imagePath, lista, duracion) {
  const container = document.createElement("div");
  container.classList.add("video-container");

  const triangulo = document.createElement("div");
  triangulo.className = "triangulo";
  container.appendChild(triangulo);

  // Imagen de portada
  const img = document.createElement("img");
  img.dataset.originalSrc = imagePath;
  img.src = imagePath;

  //img.alt = titulo;
  img.loading = "lazy";

  // Manejador de errores para cargar imagen de fallback si la portada no existe o da error
  img.onerror = function () {
    // Usar imagen de fallback desde la carpeta imagenes
    this.src = "imagenes/portada-fallback.png";
    this.onerror = null; // Evitar bucle infinito si la imagen de fallback también falla
  };

  // título
  const h3 = document.createElement("h3");
  h3.textContent = titulo;

  // evento de clic en la imagen
  img.onclick = async function () {
    const monitorActivo = esMonitorActivo();

    // Validar si es un link de YouTube
    let isYouTube = false;
    let youtubeId = videoPath;
    if (videoPath) {
      let regex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
      let match = videoPath.match(regex);
      if (match) {
        youtubeId = match[1];
        isYouTube = true;
      } else if (videoPath.length === 11) {
        // Asumimos que si tiene longitud 11 es un ID de YouTube (como en youtubeInicio)
        isYouTube = true;
      }
    }

    if (isYouTube) {
      if (botonPRO == false && !monitorActivo) {
        youtubeClapprEstandar(youtubeId, imagePath, lista);
      } else {
        youtubeClappr(youtubeId, imagePath, lista);
      }
      return;
    }

    // Si NO es modo PRO y NO hay monitor activo, usar reproductor local
    if (botonPRO == false && !monitorActivo) {
      audioHimno.pause();
      // Limpiar el contenedor de video antes de cargar uno nuevo
      videoPlayerContainer.innerHTML = "";
      videoPlayerContainer.appendChild(closePlayerButton);
      closePlayerButton.style.display = "flex";

      if (botonLista == false) {
        // Convertir la imagen del poster a base64
        let posterBase64 = null;
        try {
          const base64 = await window.electronAPI.leerArchivo(imagePath);
          const extension = imagePath.split(".").pop();
          posterBase64 = `data:image/${extension};base64,${base64}`;
        } catch (err) {
          console.error("Error cargando poster:", err);
        }

        // Crear el reproductor Clappr
        player = new Clappr.Player({
          source: formalizarRuta(videoPath),
          parentId: "#videoPlayerContainer",
          width: "100%",
          height: "100vh",
          preload: "auto",
          autoPlay: false,
          volume: 100,
          poster: posterBase64,
          //hideMediaControl: true,
          disableVideoTagContextMenu: true,

          playbackNotSupportedMessage: "No se puede reproducir el contenido",
          watermark: waterMark,
          position: "bottom-right",
        });
        // Mostrar el contenedor del reproductor
        videoPlayerContainer.style.display = "flex";

        //Evento del reproductor para poner en pantalla completa el presionar el botón de reproducir
        player.on(Clappr.Events.PLAYER_PLAY, function () {
          // Poner el contenedor del reproductor en pantalla completa
          if (videoPlayerContainer.requestFullscreen) {
            videoPlayerContainer.requestFullscreen();
          } else if (videoPlayerContainer.webkitRequestFullscreen) {
            // Compatibilidad con Safari
            videoPlayerContainer.webkitRequestFullscreen();
          } else if (videoPlayerContainer.msRequestFullscreen) {
            // Compatibilidad con IE/Edge
            videoPlayerContainer.msRequestFullscreen();
          } else if (videoPlayerContainer.mozRequestFullScreen) {
            // Compatibilidad con Firefox
            videoPlayerContainer.mozRequestFullScreen();
          }
        });

        // Escuchar cuando el video termine
        player.on(Clappr.Events.PLAYER_ENDED, function () {
          ocultarReproductor();
        });
      } else {
        cargarReproductorAleatorio(lista);
      }
    } else {
      audioHimno.pause();
      if (botonLista == false) {
        let versiculoAux = "";
        let libroAux = "";
        let estilosAux = {};
        if (botonFondo == false) {
          /*
          ventanaSecundaria(
            videoPath,
            imagePath,
            versiculoAux,
            libroAux,
            estilosAux,
            null,
            null,
            null,
            waterMark
          );*/

          enviarDatos({
            videoPath: videoPath,
            imagePath: imagePath,
            versiculo: versiculoAux,
            libroAux: libroAux,
            estilosAux: estilosAux,
            lista: null,
            fondoBody: null,
            imagen: null,
            waterMark: waterMark,
          });
        } else {
          let fondoBody = imagePath;

          enviarDatos({
            videoPath: null,
            imagePath: null,
            versiculo: null,
            libroAux: null,
            estilosAux: null,
            lista: null,
            fondoBody: fondoBody,
            imagen: null,
            waterMark: waterMark,
          });
        }
      } else {
        let versiculoAux = "";
        let libroAux = "";
        let estilosAux = {};
        if (botonFondo == false) {
          enviarDatos({
            videoPath: videoPath,
            imagePath: imagePath,
            versiculo: versiculoAux,
            libroAux: libroAux,
            estilosAux: estilosAux,
            lista: lista,
            fondoBody: null,
            imagen: null,
            waterMark: waterMark,
          });
        } else {
          let fondoBody = imagePath;

          enviarDatos({
            videoPath: null,
            imagePath: null,
            versiculo: null,
            libroAux: null,
            estilosAux: null,
            lista: null,
            fondoBody: fondoBody,
            imagen: null,
            waterMark: waterMark,
          });
        }
      }
    }
  };

  // Añadir todo al contenedor
  container.appendChild(img);
  container.appendChild(h3);

  // Añadir nota pista si aplica
  if (titulo.includes("Pista:")) {
    const contenedorNotaPista = document.createElement("div");
    contenedorNotaPista.classList.add("contenedor-nota-pista");
    contenedorNotaPista.textContent = "";

    container.appendChild(contenedorNotaPista);

    const contenedorNotaDuracion = document.createElement("div");
    contenedorNotaDuracion.classList.add("contenedor-video-duracion");
    contenedorNotaDuracion.textContent = duracion;
    container.appendChild(contenedorNotaDuracion);
  } else if (titulo.includes("Himno:")) {
    const contenedorNotaCantado = document.createElement("div");
    contenedorNotaCantado.classList.add("contenedor-nota-cantado");
    contenedorNotaCantado.textContent = "";
    container.appendChild(contenedorNotaCantado);

    const contenedorNotaDuracion = document.createElement("div");
    contenedorNotaDuracion.classList.add("contenedor-video-duracion");
    contenedorNotaDuracion.textContent = duracion;
    container.appendChild(contenedorNotaDuracion);
  }

  // Botón de favoritos - Para TODOS los himnos (excepto listas de reproducción)
  // Solo mostrar si NO es una lista (cuando videoPath existe y lista es null)
  if (videoPath && !lista) {
    const contenedorFavorito = document.createElement("div");
    contenedorFavorito.classList.add("contenedor-favorito");
    contenedorFavorito.textContent = "";

    // Cargar favoritos desde localStorage
    let favoritosGuardados = [];
    try {
      const favoritosString = localStorage.getItem("himnosFavoritos");
      if (favoritosString) {
        favoritosGuardados = JSON.parse(favoritosString);
      }
    } catch (error) {
      console.error("Error al cargar favoritos:", error);
    }

    // Crear clave única para este himno (usando videoPath como identificador único)
    const claveHimno = videoPath;

    // Verificar si este himno ya está en favoritos
    const esFavorito = favoritosGuardados.some(
      (fav) => fav.videoPath === claveHimno,
    );
    if (esFavorito) {
      contenedorFavorito.classList.add("active");
    }

    // Agregar evento click para toggle favorito
    contenedorFavorito.onclick = function (event) {
      event.stopPropagation(); // Prevenir que se active el click de la imagen

      // Cargar favoritos actuales
      let favoritos = [];
      try {
        const favoritosString = localStorage.getItem("himnosFavoritos");
        if (favoritosString) {
          favoritos = JSON.parse(favoritosString);
        }
      } catch (error) {
        console.error("Error al cargar favoritos:", error);
      }

      // Verificar si ya existe en favoritos
      const indice = favoritos.findIndex((fav) => fav.videoPath === claveHimno);

      if (indice > -1) {
        // Si ya existe, quitarlo
        favoritos.splice(indice, 1);
        contenedorFavorito.classList.remove("active");
      } else {
        // Si no existe, agregarlo
        favoritos.push({
          numero: titulo.match(/\d{3}/)?.[0] || "",
          titulo: titulo,
          videoPath: videoPath,
          imagePath: imagePath,
        });
        contenedorFavorito.classList.add("active");
      }

      // Guardar en localStorage
      try {
        localStorage.setItem("himnosFavoritos", JSON.stringify(favoritos));
      } catch (error) {
        console.error("Error al guardar favoritos:", error);
      }
    };
    container.appendChild(contenedorFavorito);
  }
  //localStorage.removeItem("himnosFavoritos");
  const contenedorPremiumActivado = document.createElement("div");
  contenedorPremiumActivado.classList.add("contenedorPremiumActivado");
  contenedorPremiumActivado.id = "contenedorPremiumActivado";
  contenedorPremiumActivado.textContent = "";
  contenedorPremiumActivado.style.display = "none";
  container.appendChild(contenedorPremiumActivado);

  // Añadir el contenedor al contenedor principal del himnario
  himnarioContainer.appendChild(container);
}
let duracionesHimnos = []; // Arreglo para almacenar las duraciones

function obtenerDuracion() {
  const rutaDuraciones = "videoDuracion/duracionHimnosCantadoPista.json";

  fetch(rutaDuraciones)
    .then((response) => response.json()) // Convierte la respuesta en formato JSON
    .then((duraciones) => {
      // Extraemos las duraciones del archivo JSON y las almacenamos en el arreglo
      duraciones.forEach((item) => {
        duracionesHimnos.push(item.duracion); // Almacenamos la duración en el arreglo
      });
      console.log(duracionesHimnos); // Ver el arreglo de duraciones en la consola

      // Llamamos a la función para asociar las duraciones a los himnos
    })
    .catch((error) => {
      console.error("Error al cargar el JSON de duraciones:", error);
    });
}

// Llamada inicial para cargar las duraciones y asociarlas
obtenerDuracion();

// Función para cargar y reproducir un video aleatorio de la lista
function cargarReproductorAleatorio(lista) {
  // Seleccionar un video aleatorio de la lista
  const himnoAleatorio = lista[Math.floor(Math.random() * lista.length)];
  let videoPath = himnoAleatorio.videoPath;
  let imagePath = himnoAleatorio.imagePath;

  // Validar si es YouTube ID
  let isYouTube = false;
  let youtubeId = videoPath;
  if (videoPath) {
    let regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    let match = videoPath.match(regex);
    if (match) {
      youtubeId = match[1];
      isYouTube = true;
    } else if (videoPath.length === 11) {
      isYouTube = true;
    }
  }

  if (isYouTube) {
    youtubeClapprEstandar(youtubeId, imagePath, lista);
    return;
  }

  // Limpiar el contenedor de video antes de cargar uno nuevo
  videoPlayerContainer.innerHTML = "";
  videoPlayerContainer.appendChild(closePlayerButton);
  closePlayerButton.style.display = "flex";

  // Crear el reproductor Clappr
  player = new Clappr.Player({
    source: videoPath,
    parentId: "#videoPlayerContainer",
    width: "100%",
    height: "100vh",
    preload: "auto",
    autoPlay: true,
    volume: 100,
    disableVideoTagContextMenu: true,
    poster: imagePath,
    playbackNotSupportedMessage: "No se puede reproducir el contenido",
    watermark: waterMark,
    position: "bottom-right",
  });

  // Mostrar el contenedor del reproductor
  videoPlayerContainer.style.display = "flex";

  // Evento del reproductor para poner en pantalla completa al presionar el botón de reproducir
  player.on(Clappr.Events.PLAYER_PLAY, function () {
    // Poner el contenedor del reproductor en pantalla completa
    if (videoPlayerContainer.requestFullscreen) {
      videoPlayerContainer.requestFullscreen();
    } else if (videoPlayerContainer.webkitRequestFullscreen) {
      // Compatibilidad con Safari
      videoPlayerContainer.webkitRequestFullscreen();
    } else if (videoPlayerContainer.msRequestFullscreen) {
      // Compatibilidad con IE/Edge
      videoPlayerContainer.msRequestFullscreen();
    } else if (videoPlayerContainer.mozRequestFullScreen) {
      // Compatibilidad con Firefox
      videoPlayerContainer.mozRequestFullScreen();
    }
  });

  // Escuchar cuando el video termine
  player.on(Clappr.Events.PLAYER_ENDED, function () {
    cargarReproductorAleatorio(lista); // Cargar y reproducir un nuevo video aleatorio
  });
}

// Función optimizada para cargar himnos en lotes
async function cargarHimnosEnLotes(inicio, fin, tamanoLote = 50) {
  // Verificar que srcAux esté definido
  if (!srcAux) {
    console.error("[ERROR] cargarHimnosEnLotes: srcAux no está definido");
    return;
  }

  for (let i = inicio; i <= fin; i += tamanoLote) {
    const finLote = Math.min(i + tamanoLote - 1, fin);

    // Procesar lote actual
    for (let j = i; j <= finLote; j++) {
      const numero = j.toString().padStart(3, "0");
      const titulo = titulos[j - 1] || `Himno ${numero}`;
      const videoPath = srcAux + `videos/${numero}.mp4`;
      const imagePath = srcAux + `portadas/${numero}.jpg`;
      const duracionesHimnosAux = duracionesHimnos[j - 1];

      crearHimno(titulo, videoPath, imagePath, null, duracionesHimnosAux);
      todosLosHimnos.push({
        numero,
        titulo,
        videoPath,
        imagePath,
        duracionesHimnosAux,
      });
    }

    // Dar tiempo al navegador para renderizar
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

let fading = false;

function fadeVolume(to, callback) {
  const duracion = 3000;
  const pasos = 30;
  const intervalo = duracion / pasos;
  let paso = 0;
  const desde = player.getVolume();
  const diferencia = to - desde;

  const interval = setInterval(() => {
    paso++;
    const nuevoVol = desde + (diferencia * paso) / pasos;
    player.setVolume(Math.max(0, Math.min(100, nuevoVol)));
    if (paso >= pasos) {
      clearInterval(interval);
      if (callback) callback();
      fading = false;
    }
  }, intervalo);
}

// Función global para enviar versículo (accesible desde biblia.js)
function enviarVersiculo() {
  // Obtener valores de los campos
  //const fontSize = document.getElementById('fontSize');
  //const textColor = document.getElementById('textColor');

  // Crear un objeto con los estilos del versículo
  let fontSizeAux = window.fontSize;
  let fontFamilyAux = window.fontFamily;
  let colorAux = window.color;
  let textAlignAux = window.textAlign;
  let lineHeightAux = window.lineHeight;
  let letterSpacingAux = window.letterSpacing;
  let fondoAux = window.fondo1;
  let backgroundImageAux = window.backgroundImage;

  const estilosAux = {
    fontSize: fontSizeAux,
    fontFamily: fontFamilyAux,
    color: colorAux,
    textAlign: textAlignAux,
    lineHeight: lineHeightAux,
    letterSpacing: letterSpacingAux,
    opacity: fondoAux,
    backgroundImage: backgroundImageAux,
  };

  // Llamar a la función ventanaSecundaria
  let versiculoAux = window.versiculo;
  let libroAux = window.libro;

  enviarDatos({
    videoPath: null,
    imagePath: null,
    versiculo: versiculoAux,
    libroAux: libroAux,
    estilosAux: estilosAux,
    lista: null,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
}

// Asignar el evento click al botón enviar (si existe)
const btnEnviarOriginal = document.getElementById("enviar");
if (btnEnviarOriginal) {
  btnEnviarOriginal.addEventListener("click", enviarVersiculo);
}

// Exponer globalmente por si acaso
window.enviarVersiculo = enviarVersiculo;

//const toggleContainer = document.querySelector(".toggle-container");
const botonBiblia = document.getElementById("botonBiblia");
const ventanaBiblia = document.getElementById("contenedor-biblia");
const botonYoutube = document.getElementById("botonYoutube");
const ventanaYouTube = document.getElementById("contenedor-youtube");
const botonHimnosPro = document.getElementById("botonHimnosPro");
const ventanaHimnosPro = document.getElementById(
  "contenedor-himnos-personalizados",
);
const botonPowerPoint = document.getElementById("botonPowerPoint");
const ventanaPowerPoint = document.getElementById("contenedor-power-point");
const botonProgramacion = document.getElementById("botonProgramacion");
const ventanaProgramacion = document.getElementById("contenedor-programacion");
const botonManual = document.getElementById("botonManualUsuario");
const ventanaManual = document.getElementById("contenedor-manual-usuario");
const botonPelis = document.getElementById("botonPelis");
const ventanaPelis = document.getElementById("contenedor-peliculas");

/*toggleContainer.addEventListener("click", () => {
  toggleContainer.classList.toggle("active");
  if (toggleContainer.classList.contains("active")) {
    audioHimno.pause();
    botonPRO = true;
    botonBiblia.style.display = "flex";
    botonHimnosPro.style.display = "flex";
    
    enviarDatos({
      videoPath: null,
      imagePath: null,
      versiculo: null,
      libroAux: null,
      estilosAux: null,
      lista: null,
      fondoBody: null,
      imagen: null,
      waterMark: waterMark
    });
    
  } else {
    audioHimno.pause();
    botonPRO = false;
    cerrarVentanaReproductor();
    botonBiblia.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    botonHimnosPro.style.display = "none";
    ventanaHimnosPro.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});
*/

botonProgramacion.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaProgramacion).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    ventanaProgramacion.style.display = "flex";
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

botonPowerPoint.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaPowerPoint).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    ventanaPowerPoint.style.display = "flex";
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

botonBiblia.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaBiblia).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "flex";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

botonHimnosPro.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaHimnosPro).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "flex";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

botonYoutube.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaYouTube).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "none";
    ventanaYouTube.style.display = "flex";
    ventanaBiblia.style.display = "none";
    himnarioContainer.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

botonPelis.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaPelis).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaBiblia.style.display = "none";
    himnarioContainer.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "flex";
    document.getElementById("contenedor-contador").style.display = "none";

    // Mostramos el pop-up al entrar
    abrirModalPelis();
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

function abrirModalPelis() {
  const modal = document.getElementById("modal-mensaje-peliculas");
  if (modal) {
    modal.style.display = "flex";
  }
}

function cerrarModalPelis() {
  const modal = document.getElementById("modal-mensaje-peliculas");
  if (modal) {
    modal.style.display = "none";
  }
}

//Función para cerrar ventana secundaria
function cerrarVentanaReproductor() {
  //if (playerWindow && !playerWindow.closed) {
  //playerWindow.close();
  //}
  botonPRO = false;
  //toggleContainer.classList.remove("active");

  botonHimnosPro.style.display = "none";
  ventanaHimnosPro.style.display = "none";
  botonBiblia.style.display = "none";
  ventanaBiblia.style.display = "none";
  ventanaYouTube.style.display = "none";
  ventanaPowerPoint.style.display = "none";
  ventanaProgramacion.style.display = "none";
  ventanaPelis.style.display = "none";
  himnarioContainer.style.display = "grid";
}

// Escuchar el mensaje de cierre de la ventana secundaria
//window.addEventListener("message", (event) => {
//if (event.data === "closed") {
//audioHimno.pause();
//cerrarVentanaReproductor();
//}
//});

// Función para ocultar el reproductor
function ocultarReproductor() {
  exitFullscreen();
  closePlayerButton.style.display = "none";
  videoPlayerContainer.style.display = "none";
  if (player) {
    player.destroy(); // Destruir el reproductor Clappr
    player = null; // Resetear el reproductor
  }
  if (playerYouTube) {
    playerYouTube.destroy();
    playerYouTube = null;
  }

  // Sincronizar con ventana secundaria
  if (typeof enviarDatos === "function") {
    enviarDatos({ stop: true });
  }

  // Notificar al control remoto
  if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
    window.electronAPI.updatePlaybackStatus({ playing: false });
  }
}

// Evento de clic para el botón de cerrar
closePlayerButton.addEventListener("click", function () {
  exitFullscreen();
  ocultarReproductor();
});

function exitFullscreen() {
  if (document.fullscreenElement) {
    document
      .exitFullscreen()
      .catch((err) =>
        console.error("Error al salir de pantalla completa:", err),
      );
  } else {
    console.log("No hay elementos en pantalla completa.");
  }
}

// Exponer buscarVideos globalmente para el asistente
window.buscarVideos = buscarVideos;

//FUNCIÓN BOTON DEL CHAT
const botonChat = document.getElementById("botonChat");
const contenedorChat = document.getElementById("contenedor-chat");
if (botonChat && contenedorChat) {
  botonChat.addEventListener("click", () => {
    contenedorChat.classList.toggle("activo");
  });
}

// Variable global para almacenar la categoría actual
let categoriaActual = ""; // Inicialmente vacío

// Función para mostrar los himnos por categoría
async function mostrarCategoria(categoria) {
  // Verificar que srcAux esté definido antes de continuar
  if (!srcAux) {
    console.error(
      "[ERROR] srcAux no está definido. No se pueden cargar himnos.",
    );
    himnarioContainer.innerHTML =
      "<div style='color: white; text-align: center; padding: 20px;'>⚠️ Error: No se pueden cargar los himnos.</div>";
    return;
  }

  categoriaActual = categoria; // Almacenar la categoría actual
  todosLosHimnos = []; // Limpiar el array anterior
  himnarioContainer.innerHTML = ""; // Limpiar himnos anteriores
  himnarioContainer.scrollTop = 0;
  botonLista = false;

  let inicio, fin;

  if (categoria === "todos") {
    inicio = 1;
    fin = totalHimnos;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    // Cargar en lotes para mejor rendimiento
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "1-150") {
    inicio = 1;
    fin = 150;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "151-300") {
    inicio = 151;
    fin = 300;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "301-450") {
    inicio = 301;
    fin = 450;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "451-614") {
    inicio = 451;
    fin = 614;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "401-500") {
    inicio = 401;
    fin = 500;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "501-614") {
    inicio = 501;
    fin = 614;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "orquestado") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos2.length; i++) {
      // Extraer el número del himno del título (los primeros 3 dígitos)
      const numero = titulos2[i].match(/\d{3}/)[0]; // Encuentra los primeros 3 dígitos en el título
      const videoPath = srcAux + `videosAntiguo/${numero}.mp4`; // Ruta del video con el número
      const titulo = titulos2[i]; // El título completo del himno
      const imagePath = srcAux + `portadasAntiguo/${numero}.jpg`; // Ruta de la imagen con el número

      // Almacenar en el array
      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      // Crear el himno con la función respectiva
      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "coritos") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos3.length; i++) {
      const numero = titulos3[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosCoritos/${numero}.mp4`;
      const titulo = titulos3[i];
      const imagePath = srcAux + `portadasCoritos/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondoJA.jpg")';
  } else if (categoria === "himnosJA") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos4.length; i++) {
      const numero = titulos4[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosJA/${numero}.mp4`;
      const titulo = titulos4[i];
      const imagePath = srcAux + `portadasHimnosJA/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondoJA.jpg")';
  } else if (categoria === "himnosNacionales") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos5.length; i++) {
      const numero = titulos5[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosNacionales/${numero}.mp4`;
      const titulo = titulos5[i];
      const imagePath = srcAux + `portadasHimnosNacionales/${numero}.png`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "orar") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloMusicaParaOrarDeFondo.length; i++) {
      const numero = tituloMusicaParaOrarDeFondo[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `musicaParaOrarDeFondo/${numero}.mp4`;
      const titulo = tituloMusicaParaOrarDeFondo[i];
      const imagePath = `portadasParaOrarDeFondo/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "himnosPianoPista") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloHimnosPianoPista.length; i++) {
      const numero = tituloHimnosPianoPista[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosPianoPista/${numero}.mp4`;
      const titulo = tituloHimnosPianoPista[i];
      const imagePath = `portadasHimnosPianoPista/001.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "himnosInfantiles") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloHimnosInfantiles.length; i++) {
      const numero = tituloHimnosInfantiles[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosInfantiles/${numero}.mp4`;
      const titulo = tituloHimnosInfantiles[i];
      const imagePath = srcAux + `portadasHimnosInfantiles/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "himnosAntiguos") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloHimnosAntiguos.length; i++) {
      const numero = tituloHimnosAntiguos[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosAntiguos/${numero}.mp4`;
      const titulo = tituloHimnosAntiguos[i];
      const imagePath = srcAux + `portadasHimnosAntiguos/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "listas") {
    botonLista = true;

    //Lista de los favoritos del usuario: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    // Cargar favoritos desde localStorage
    let favoritosGuardados = [];
    try {
      const favoritosString = localStorage.getItem("himnosFavoritos");
      console.log("[FAVORITOS] String guardado:", favoritosString);
      if (favoritosString) {
        favoritosGuardados = JSON.parse(favoritosString);
        console.log("[FAVORITOS] Favoritos parseados:", favoritosGuardados);
      }
    } catch (error) {
      console.error("[FAVORITOS] Error al cargar favoritos:", error);
    }

    // Crear lista de favoritos
    todosLosFavoritosLista = [];
    for (let i = 0; i < favoritosGuardados.length; i++) {
      const himnoFav = favoritosGuardados[i];
      todosLosFavoritosLista.push({
        numero: himnoFav.numero,
        titulo: himnoFav.titulo,
        videoPath: himnoFav.videoPath,
        imagePath: himnoFav.imagePath,
      });
      // También agregar a la lista general
      todosLosHimnosLista.push({
        numero: himnoFav.numero,
        titulo: himnoFav.titulo,
        videoPath: himnoFav.videoPath,
        imagePath: himnoFav.imagePath,
      });
    }
    console.log(
      "[FAVORITOS] Lista creada, total:",
      todosLosFavoritosLista.length,
    );

    // Crear el himno de favoritos solo si hay favoritos
    if (todosLosFavoritosLista.length > 0) {
      console.log("[FAVORITOS] Creando tarjeta de favoritos...");
      let tituloFavoritos = "Favoritos";
      let imagePathFavoritos = "imagenes/portadaListaFavoritos.jpg";
      crearHimno(
        tituloFavoritos,
        null,
        imagePathFavoritos,
        todosLosFavoritosLista,
        null,
      );
      console.log("[FAVORITOS] Tarjeta creada exitosamente");

      // Agregar botón de eliminar a la tarjeta de favoritos
      // Esperar un momento para que se cree el elemento en el DOM
      setTimeout(() => {
        const contenedoresFavoritos =
          document.querySelectorAll(".video-container");
        const tarjetaFavoritos = Array.from(contenedoresFavoritos).find(
          (container) => {
            const h3 = container.querySelector("h3");
            return h3 && h3.textContent === "Favoritos";
          },
        );

        if (tarjetaFavoritos) {
          const botonEliminar = document.createElement("div");
          botonEliminar.classList.add("boton-eliminar-favoritos");
          botonEliminar.innerHTML = "🗑️";
          botonEliminar.title = "Eliminar todos los favoritos";

          botonEliminar.onclick = function (event) {
            event.stopPropagation();
            const confirmar = confirm(
              "¿Estás seguro de que deseas eliminar TODOS los favoritos?",
            );
            if (confirmar) {
              localStorage.removeItem("himnosFavoritos");
              console.log("[FAVORITOS] Lista de favoritos eliminada");
              // Recargar la categoría listas para actualizar la vista
              mostrarCategoria("listas");
            }
          };

          tarjetaFavoritos.appendChild(botonEliminar);
          console.log("[FAVORITOS] Botón de eliminar agregado");
        }
      }, 100);
    }

    //Lista de favoritos de YouTube:
    // Cargar favoritos de YouTube desde localStorage
    let favoritosYT = [];
    try {
      const favYTString = localStorage.getItem("youtubesFavoritos");
      console.log("[YT FAVORITOS] String guardado:", favYTString);
      if (favYTString) {
        favoritosYT = JSON.parse(favYTString);
        console.log("[YT FAVORITOS] Favoritos parseados:", favoritosYT);
      }
    } catch (error) {
      console.error("[YT FAVORITOS] Error al cargar favoritos:", error);
    }

    // Crear lista de favoritos de YouTube
    todosLosFavoritosYouTubeLista = [];
    for (let i = 0; i < favoritosYT.length; i++) {
      const videoYT = favoritosYT[i];
      todosLosFavoritosYouTubeLista.push({
        videoPath: videoYT.id,
        titulo: videoYT.title,
        imagePath: videoYT.thumbnail,
        duration: videoYT.duration,
        views: videoYT.views,
        uploadedAt: videoYT.uploadedAt,
        channel: videoYT.channel,
      });
    }
    console.log(
      "[YT FAVORITOS] Lista creada, total:",
      todosLosFavoritosYouTubeLista.length,
    );

    // Crear la tarjeta de favoritos de YouTube solo si hay favoritos
    if (todosLosFavoritosYouTubeLista.length > 0) {
      console.log("[YT FAVORITOS] Creando tarjeta de favoritos de YouTube...");
      let tituloFavoritosYT = "Favoritos YouTube";
      let imagePathFavoritosYT = "imagenes/portadaListaYouTube.jpg";
      crearHimno(
        tituloFavoritosYT,
        null,
        imagePathFavoritosYT,
        todosLosFavoritosYouTubeLista,
        null,
      );
      console.log("[YT FAVORITOS] Tarjeta creada exitosamente");

      // Agregar botón de eliminar a la tarjeta de favoritos de YouTube
      setTimeout(() => {
        const contenedoresFavYT = document.querySelectorAll(".video-container");
        const tarjetaFavYT = Array.from(contenedoresFavYT).find((container) => {
          const h3 = container.querySelector("h3");
          return h3 && h3.textContent === "Favoritos YouTube";
        });

        if (tarjetaFavYT) {
          const botonEliminarYT = document.createElement("div");
          botonEliminarYT.classList.add("boton-eliminar-favoritos");
          botonEliminarYT.innerHTML = "🗑️";
          botonEliminarYT.title = "Eliminar todos los favoritos de YouTube";

          botonEliminarYT.onclick = function (event) {
            event.stopPropagation();
            const confirmar = confirm(
              "¿Estás seguro de que deseas eliminar TODOS los favoritos de YouTube?",
            );
            if (confirmar) {
              localStorage.removeItem("youtubesFavoritos");
              console.log(
                "[YT FAVORITOS] Lista de favoritos de YouTube eliminada",
              );
              mostrarCategoria("listas");
            }
          };

          tarjetaFavYT.appendChild(botonEliminarYT);
          console.log("[YT FAVORITOS] Botón de eliminar agregado");
        }
      }, 150);
    }

    //Lista música para orar de fondo
    for (let i = 0; i < tituloMusicaParaOrarDeFondo.length; i++) {
      const numero = tituloMusicaParaOrarDeFondo[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `musicaParaOrarDeFondo/${numero}.mp4`;
      const titulo = tituloMusicaParaOrarDeFondo[i];
      const imagePath = `portadasParaOrarDeFondo/${numero}.png`;

      todosLosMusicaParaOrarDeFondoLista.push({
        numero,
        titulo,
        videoPath,
        imagePath,
      });
      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
    }
    let tituloAux = "Música para Orar";
    let imagePathAux = "imagenes/portadaListaMusicaParaOrarDeFondo.jpg";
    crearHimno(
      tituloAux,
      null,
      imagePathAux,
      todosLosMusicaParaOrarDeFondoLista,
      null,
    );

    //Lista de los himnos antiguos: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < titulos2.length; i++) {
      // Extraer el número del himno del título (los primeros 3 dígitos)
      const numero = titulos2[i].match(/\d{3}/)[0]; // Encuentra los primeros 3 dígitos en el título
      const videoPath = srcAux + `videosAntiguo/${numero}.mp4`; // Ruta del video con el número
      const titulo = `Antiguos`; // El título completo del himno
      const imagePath = srcAux + `portadasAntiguo/${numero}.jpg`; // Ruta de la imagen con el número

      // Almacenar en el array
      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosAntiguosLista.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = "Antiguos";
    imagePathAux = `imagenes/portadaListaAntiguo.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosAntiguosLista, null);

    //Lista de los coritos adventistas: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < titulos3.length; i++) {
      const numero = titulos3[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosCoritos/${numero}.mp4`;
      const titulo = `Coritos`;
      const imagePath = srcAux + `portadasCoritos/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosCoritosLista.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Coritos`;
    imagePathAux = `imagenes/portadaListaCoritos.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosCoritosLista, null);

    //Lista de los cantados: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 1; i <= 614; i++) {
      const numero = i.toString().padStart(3, "0");
      const titulo = titulos[i - 1] || `Himno ${numero}`;
      const videoPath = srcAux + `videos/${numero}.mp4`;
      const imagePath = srcAux + `portadas/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosCantadosLista.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Cantados`;
    imagePathAux = `imagenes/portadaListaCantado.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosCantadosLista, null);

    //Lista de los piano pista: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < tituloHimnosPianoPista.length; i++) {
      const numero = tituloHimnosPianoPista[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosPianoPista/${numero}.mp4`;
      const titulo = `Himnos Piano Pista`;
      const imagePath = `portadasHimnosPianoPista/001.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosHimnosPianoPista.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Himnos Piano Pista`;
    imagePathAux = `imagenes/portadaListaPianoPista.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosHimnosPianoPista, null);

    //Lista de los infantiles: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < tituloHimnosInfantiles.length; i++) {
      const numero = tituloHimnosInfantiles[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosInfantiles/${numero}.mp4`;
      const titulo = `Himnos Infantiles`;
      const imagePath = srcAux + `portadasHimnosInfantiles/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosHimnosInfantiles.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Himnos Infantiles`;
    imagePathAux = `imagenes/portadaListaInfantil.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosHimnosInfantiles, null);

    //Lista de los antiguos 1962: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < tituloHimnosAntiguos.length; i++) {
      const numero = tituloHimnosAntiguos[i].match(/\d{3}/)[0];
      const videoPath = srcAux + `videosHimnosAntiguos/${numero}.mp4`;
      const titulo = `Himnos Antiguos 1962`;
      const imagePath = srcAux + `portadasHimnosAntiguos/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosHimnosAntiguos.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Himnos Antiguos 1962`;
    imagePathAux = `imagenes/portadaListaHimnosAntiguos.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosHimnosAntiguos, null);

    tituloAux = `Todas las Listas`;
    imagePathAux = `imagenes/portadaListaTodos.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosHimnosLista, null);

    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaPowerPoint.style.display = "none";
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal",
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  }

  /*
  let duracionesHimnosAux;
  // Generar los himnos filtrados por categoría HIMNARIO 614 HIMNOS
  for (let i = inicio; i <= fin; i++) {
    const numero = i.toString().padStart(3, "0");
    const titulo = titulos[i - 1] || `Himno ${numero}`;
    const videoPath = srcAux+`videos/${numero}.mp4`;
    const imagePath = srcAux+`portadas/${numero}.jpg`;
    
    // Crear himno normal
    duracionesHimnosAux = duracionesHimnos[i - 1];
    crearHimno(titulo, videoPath, imagePath, null, duracionesHimnosAux);
    todosLosHimnos.push({
      numero,
      titulo,
      videoPath,
      imagePath,
      duracionesHimnosAux,
    });

  }
  */
  let premiumCategoria = localStorage.getItem("premium") === "true";
  if (premiumCategoria) {
    aplicarEstadoPremium(true);
  }
  document.getElementById("contenedor-contador").style.display = "none";
}

// Función para filtrar himnos
function filtrarHimnos(query) {
  himnarioContainer.innerHTML = ""; // Limpiar himnos anteriores

  // Convertir el query a minúsculas para una búsqueda más flexible
  const queryLower = query.toLowerCase();

  // Filtrar los himnos que contengan el query en cualquier parte del título
  const himnosFiltrados = todosLosHimnos.filter((himno) =>
    himno.titulo.toLowerCase().includes(queryLower),
  );

  // Mostrar los himnos filtrados
  himnosFiltrados.forEach((himno) => {
    crearHimno(
      himno.titulo,
      himno.videoPath,
      himno.imagePath,
      null,
      himno.duracionesHimnosAux,
    );
  });
}

const searchInput = document.getElementById("searchInput");
// Escuchar el evento de foco en el campo de búsqueda
searchInput.addEventListener("focus", function () {
  //mostrarCategoria('todos'); // Mostrar todos los himnos al hacer clic en el buscador
  document.getElementsByClassName(
    "contenedor-principal",
  )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  searchInput.value = "";
  // mostrarCategoria("todos");
});

// Escuchar el evento de entrada en el campo de búsqueda
searchInput.addEventListener("input", function () {
  const query = searchInput.value.trim();
  filtrarHimnos(query); // Filtrar himnos en base al texto de búsqueda
});

//Configuración de los botones configuración, menu de opciones y ventanas de opciones
const configBoton = document.getElementById("configBoton");
const configMenu = document.getElementById("configMenu");

//Manejadores de eventos
configBoton.addEventListener("click", function () {
  configMenu.classList.toggle("visible");
  document.getElementById("contenedor-contador").style.display = "none";
});

//Acerca De
document.getElementById("acercaDe").addEventListener("click", function (event) {
  document.getElementById("contenedor-ventanas-opciones").style.display =
    "block";
  document.getElementById("contenedor-ventanas-opciones").style.width = "250px";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion1").style.display = "block";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion2").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion3").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion4").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion5").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion6").style.display = "none";
});

//Más contenido
document.getElementById("masContenido").addEventListener("click", function () {
  document.getElementById("contenedor-ventanas-opciones").style.display =
    "block";
  document.getElementById("contenedor-ventanas-opciones").style.width = "350px";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion1").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion2").style.display = "block";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion3").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion4").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion5").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion6").style.display = "none";
});

//PayPal
document
  .getElementById("botonPaypalMenu")
  .addEventListener("click", function (event) {
    document.getElementById("contenedor-ventanas-opciones").style.display =
      "block";
    document.getElementById("contenedor-ventanas-opciones").style.width =
      "250px";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion1").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion2").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion3").style.display = "block";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion4").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion5").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion6").style.display = "none";
  });

//Reseñas:
document.getElementById("resenia").addEventListener("click", function (event) {
  document.getElementById("contenedor-ventanas-opciones").style.display =
    "block";
  document.getElementById("contenedor-ventanas-opciones").style.width = "100%";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion1").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion2").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion3").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion4").style.display = "block";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion5").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion6").style.display = "none";
});

//Página Web:
document.getElementById("web").addEventListener("click", function (event) {
  document.getElementById("contenedor-ventanas-opciones").style.display =
    "block";
  document.getElementById("contenedor-ventanas-opciones").style.width = "250px";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion1").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion2").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion3").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion4").style.display = "none";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion5").style.display = "block";
  document
    .getElementById("contenedor-ventanas-opciones")
    .querySelector(".opcion6").style.display = "none";
});

//Fondos de proyección:
document
  .getElementById("fondoPantalla")
  .addEventListener("click", function (event) {
    document.getElementById("contenedor-ventanas-opciones").style.display =
      "block";
    document.getElementById("contenedor-ventanas-opciones").style.width =
      "400px";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion1").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion2").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion3").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion4").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion5").style.display = "none";
    document
      .getElementById("contenedor-ventanas-opciones")
      .querySelector(".opcion6").style.display = "block";
  });

//Apartado para crear y seleccionar los fondos de proyección
// Lista de imágenes
let photos = [];
for (let i = 0; i <= 110; i++) {
  const numero = i.toString().padStart(3, "0");
  const src = `imagenes/fondoProyector/${numero}.jpg`;
  const title = "";
  photos.push({ src, title });
}

const photoList = document.getElementById("photo-list");

// Crear elementos para cada foto
photos.forEach((photo) => {
  const photoItem = document.createElement("div");
  photoItem.className = "photo-item";

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.title;

  let fondoImage;
  const button = document.createElement("button");
  button.textContent = "Enviar";
  button.addEventListener("click", () => {
    fondoImage = photo.src;
    const monitorActivo = esMonitorActivo();
    if (botonPRO || monitorActivo) {
      enviarDatos({
        videoPath: null,
        imagePath: null,
        versiculo: null,
        libroAux: null,
        estilosAux: null,
        lista: null,
        fondoBody: fondoImage,
        imagen: null,
        waterMark: waterMark,
      });
    }
  });

  photoItem.appendChild(img);
  photoItem.appendChild(button);
  photoList.appendChild(photoItem);
});

//Por si preciona cualquier parte de la pantalla, se cierra el menu
//Y cualquier otro elementos en superposición | NO USO
document.getElementById("cerrar").addEventListener("click", function (event) {
  document.getElementById("contenedor-ventanas-opciones").style.display =
    "none";
  configMenu.classList.toggle("visible");
});

// Ocultar el cursor después de 2 segundos sin movimiento
let timeout;

document.addEventListener("mousemove", function () {
  // Mostrar el cursor si se mueve
  document.body.style.cursor = "default";
  closePlayerButton.style.display = "flex";

  // Reiniciar el temporizador
  clearTimeout(timeout);

  // Ocultar el cursor después de 3 segundos
  timeout = setTimeout(() => {
    document.body.style.cursor = "none";
    closePlayerButton.style.display = "none";
  }, 3000);
});

const campoBusqueda = document.getElementById("busqueda-youtube");
campoBusqueda.addEventListener("click", function () {
  //campoBusqueda.value = "";
});

const botonYoutubeAux = document.getElementById("buscar-youtube-boton");
campoBusqueda.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    buscarVideos();
  }
});
// Función núcleo para búsqueda en YouTube (Reutilizable)
async function buscarVideosCore(
  input,
  resultsContainer,
  loaderElement,
  searchButton,
  onVideoSelected,
) {
  if (!input) return;

  searchButton.style.pointerEvents = "none";
  searchButton.style.cursor = "default";
  searchButton.style.opacity = "0.5";

  const premiumCategoria = localStorage.getItem("premium") === "true";
  let velocidadDeBusqueda = premiumCategoria ? 100 : 30000;

  if (!input.includes("youtube.com") && !input.includes("youtu.be")) {
    let apiUrl = `https://api-youtube-gamma.vercel.app/api/search?q=${encodeURIComponent(
      input,
    )}`;
    resultsContainer.innerHTML = "";
    if (loaderElement) loaderElement.style.display = "block";

    try {
      let response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Error API");
      let videos = await response.json();

      if (!premiumCategoria) videos = videos.slice(0, 8);

      // ENVIAR RESULTADOS AL CONTROL REMOTO (JSON)
      if (window.electronAPI && window.electronAPI.sendYoutubeResults) {
        const resultadosRemotos = videos.map((v) => ({
          id: v.id,
          title: v.title,
          thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          videoPath: v.id,
          imagePath: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          categoria: "youtube",
          duration: v.duration,
          views: v.views,
        }));
        window.electronAPI.sendYoutubeResults({
          resultados: resultadosRemotos,
        });
      }

      for (let video of videos) {
        const div = document.createElement("div");
        div.className = "vid";
        div.innerHTML = `
          <iframe width="100%" height="200" src="https://www.youtube.com/embed/${
            video.id
          }?rel=0&origin=${window.location.origin}" frameborder="0" allowfullscreen loading="lazy" style="pointer-events: none;"></iframe>
          <h3>${video.title}</h3>
          <p style="color: white;font-size: 12px; font-family: Arial, Helvetica, sans-serif; font-weight: bold;">
            ${
              video.duration ? `Duración: ${video.duration}` : ""
            } | Visualizaciones: ${video.views || ""}
          </p>
          <small style="color:white;font-size: 11px; font-family: Arial, Helvetica, sans-serif;">Canal: ${
            video.channel?.name || "Desconocido"
          }</small>
        `;

        div.onclick = () => onVideoSelected(video);

        // Lógica de favoritos (solo si estamos en la pestaña principal de YouTube)
        if (resultsContainer.id === "lista-videos") {
          const botonFavoritoYT = document.createElement("div");
          botonFavoritoYT.classList.add("contenedor-favorito");
          let favoritosYT = JSON.parse(
            localStorage.getItem("youtubesFavoritos") || "[]",
          );
          if (favoritosYT.some((fav) => fav.id === video.id))
            botonFavoritoYT.classList.add("active");

          botonFavoritoYT.onclick = (e) => {
            e.stopPropagation();
            let favs = JSON.parse(
              localStorage.getItem("youtubesFavoritos") || "[]",
            );
            const idx = favs.findIndex((f) => f.id === video.id);
            if (idx > -1) favs.splice(idx, 1);
            else favs.push(video);
            localStorage.setItem("youtubesFavoritos", JSON.stringify(favs));
            botonFavoritoYT.classList.toggle("active");
          };
          div.appendChild(botonFavoritoYT);
        }

        resultsContainer.appendChild(div);
        await new Promise((r) => setTimeout(r, velocidadDeBusqueda));
      }
    } catch (error) {
      console.error(error);
      resultsContainer.innerHTML =
        "<p style='color:red;text-align:center;'>Error al obtener videos</p>";
    } finally {
      if (loaderElement) loaderElement.style.display = "none";
      searchButton.style.pointerEvents = "all";
      searchButton.style.cursor = "pointer";
      searchButton.style.opacity = "1";
    }
  } else {
    // Caso de URL directa
    let videoIdMatch = input.match(
      /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/,
    );
    if (videoIdMatch) {
      let videoId = videoIdMatch[1];
      let img = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      // ENVIAR A REMOTO (Unico resultado)
      if (window.electronAPI && window.electronAPI.sendYoutubeResults) {
        const res = [
          {
            id: videoId,
            title: "Video de YouTube",
            thumbnail: img,
            videoPath: videoId,
            imagePath: img,
            categoria: "youtube",
          },
        ];
        window.electronAPI.sendYoutubeResults({ resultados: res });
      }

      resultsContainer.innerHTML = `
        <div id="contenedor-embed" style="pointer-events: none;">
          <iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}?mute=1" frameborder="0" allowfullscreen></iframe>
          <h3 style="cursor: pointer; pointer-events: all; text-align:center; color:white;" id="btn-reproducir-directo">Reproducir video</h3>
        </div>`;
      resultsContainer.querySelector("#btn-reproducir-directo").onclick =
        () => {
          onVideoSelected({
            id: videoId,
            thumbnail: img,
            title: "Video de YouTube",
          });
        };
    }
    searchButton.style.pointerEvents = "all";
    searchButton.style.cursor = "pointer";
    searchButton.style.opacity = "1";
  }
}

// Configuración de búsqueda en YouTube (Pestaña principal)
async function buscarVideos() {
  const input = document.getElementById("busqueda-youtube");
  const lista = document.getElementById("lista-videos");
  const loader = document.getElementById("loader");
  const boton = document.getElementById("buscar-youtube-boton");

  input.disabled = true;
  await buscarVideosCore(input.value.trim(), lista, loader, boton, (video) => {
    youtubeInicio(video.id, video.thumbnail);
  });
  input.disabled = false;
}

//Configuración YouTube
let url;
let auxUrlOnce = null;
let auxUrlDoce = null;
function youtubeInicio(url, poster) {
  // Si es una URL completa, extraemos el ID
  if (url) {
    let regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

    let match = url.match(regex);
    if (match) {
      url = match[1];
    }
  }

  const monitorActivo = esMonitorActivo();

  // Validamos el ID y llamamos a youtubeClappr
  if (url && url.length === 11 && (botonPRO == true || monitorActivo)) {
    console.log("Id del video YouTube: " + url);
    youtubeClappr(url, poster);
  } else if (url && url.length === 11 && botonPRO == false) {
    console.log("Id del video YouTube: " + url);
    youtubeClapprEstandar(url, poster);
  } else {
    console.warn("No se pudo obtener un ID de video válido.");
  }
}

function youtubeClapprEstandar(url, poster, lista) {
  audioHimno.pause();

  if (playerYouTube) {
    playerYouTube.destroy();
    playerYouTube = null;
  }

  // Limpiar el contenedor de video antes de cargar uno nuevo
  videoPlayerContainer.innerHTML = "";
  videoPlayerContainer.appendChild(closePlayerButton);
  closePlayerButton.style.display = "flex";
  // Crear el reproductor Clappr
  playerYouTube = new Clappr.Player({
    source: url,
    parentId: "#videoPlayerContainer",
    width: "100%",
    height: "100vh",
    preload: "auto",
    autoPlay: true,
    volume: 100,
    poster: poster,
    //hideMediaControl: true,
    disableVideoTagContextMenu: true,
    plugins: [YoutubePlugin, YoutubePluginControl],
    //YoutubePluginControl
    YoutubeVars: { languageCode: "en" },
    playbackNotSupportedMessage: "No se puede reproducir el contenido",
    watermark: waterMark,
    position: "bottom-right",
  });
  expandirIframeYouTube();

  // Mostrar el contenedor del reproductor
  videoPlayerContainer.style.display = "flex";

  // Escuchar cuando el video termine
  playerYouTube.on(Clappr.Events.PLAYER_ENDED, function () {
    if (lista && lista.length > 0) {
      const himnoAleatorio = lista[Math.floor(Math.random() * lista.length)];
      let newUrl = himnoAleatorio.videoPath;
      let newPoster = himnoAleatorio.imagePath;

      // Validar si es YouTube ID
      let isYouTubeNext = false;
      let youtubeIdNext = newUrl;
      if (newUrl) {
        let regex =
          /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
        let match = newUrl.match(regex);
        if (match) {
          youtubeIdNext = match[1];
          isYouTubeNext = true;
        } else if (newUrl.length === 11) {
          isYouTubeNext = true;
        }
      }

      if (isYouTubeNext) {
        youtubeClapprEstandar(youtubeIdNext, newPoster, lista);
      } else {
        // Si no es YouTube, usar el cargador aleatorio que ya maneja locales
        cargarReproductorAleatorio(lista);
      }
    } else {
      ocultarReproductor();
    }
  });
  playerYouTube.on(Clappr.Events.PLAYER_READY, () => {
    console.log("✅ Player listo, esperando 2 segundos...");

    setTimeout(() => {
      const poster = document.querySelector(".player-poster.clickable");
      if (poster) {
        console.log("🎬 Simulando clic en póster tras PLAYER_READY");

        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });
        poster.dispatchEvent(clickEvent);
      } else {
        console.log("⚠️ No se encontró póster, intentando play() directo");
        playerYouTube.play();
      }
    }, 1000);
  });
}

function expandirIframeYouTube() {
  const maxIntentos = 1000000;
  let intentos = 0;

  const intentarExpandir = () => {
    const iframe = document.querySelector("#videoPlayerContainer iframe");

    if (iframe) {
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.border = "none";
      iframe.style.margin = "0";
      iframe.style.padding = "0";
      iframe.style.zIndex = "6";
      iframe.style.objectFit = "cover";
      console.log("Iframe ajustado correctamente.");
    } else {
      intentos++;
      if (intentos < maxIntentos) {
        setTimeout(intentarExpandir, 300);
      } else {
        console.warn("No se pudo encontrar el iframe de YouTube.");
      }
    }
  };

  intentarExpandir();
}

function youtubeClappr(auxUrlOnce, poster, lista) {
  audioHimno.pause();
  enviarDatos({
    videoPath: auxUrlOnce,
    imagePath: poster,
    versiculo: null,
    libroAux: null,
    estilosAux: null,
    lista: lista,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
}

//FUNSIÓN PARA VIDEOS LOCALES ESTANDAR
function videosLocalesEstandar(url, poster, contextData = null) {
  audioHimno.pause();
  // Limpiar el contenedor de video antes de cargar uno nuevo
  videoPlayerContainer.innerHTML = "";
  videoPlayerContainer.appendChild(closePlayerButton);
  closePlayerButton.style.display = "flex";

  // Crear el reproductor Clappr
  // Nota: No usamos 'events' en el constructor para evitar problemas de 'this' y closure
  player = new Clappr.Player({
    source: url,
    parentId: "#videoPlayerContainer",
    width: "100%",
    height: "100vh",
    preload: "auto",
    autoPlay: true, // AutoPlay activado
    volume: 100,
    poster: poster,
    //hideMediaControl: true,
    disableVideoTagContextMenu: true,
    playbackNotSupportedMessage: "No se puede reproducir el contenido",
    watermark: waterMark,
    position: "bottom-right",
  });

  // Mostrar el contenedor del reproductor
  videoPlayerContainer.style.display = "flex";

  // --- LÓGICA DE PROGRESO Y VISTO ---
  let hasSeeked = false;

  // 1. Al iniciar la reproducción (PLAY), restaurar el tiempo si existe
  player.on(Clappr.Events.PLAYER_PLAY, function () {
    if (!hasSeeked && contextData && contextData.id) {
      const savedTime = localStorage.getItem(`progreso_${contextData.id}`);
      if (savedTime && parseFloat(savedTime) > 0) {
        console.log(`⏪ Restaurando video ${contextData.id} a ${savedTime}s`);
        player.seek(parseFloat(savedTime));
      }
      hasSeeked = true; // Evitar saltos repetidos
    }
  });

  // 2. Guardar progreso durante la reproducción
  player.on(Clappr.Events.PLAYER_TIMEUPDATE, function (progress) {
    if (contextData && contextData.id) {
      // Guardar cada 5 segundos aprox
      if (progress.current > 0 && Math.floor(progress.current) % 5 === 0) {
        localStorage.setItem(`progreso_${contextData.id}`, progress.current);
      }

      // Marcar como visto si supera el 90%
      if (progress.total > 0 && progress.current / progress.total > 0.9) {
        const watchedKey = `watched_${contextData.id}`;
        // Verificar si ya estaba marcado para no spammear el evento
        if (localStorage.getItem(watchedKey) !== "true") {
          localStorage.setItem(watchedKey, "true");
          console.log(`✅ Video ${contextData.id} marcado como visto`);

          // Disparar evento para actualizar UI
          const event = new CustomEvent("videoWatched", {
            detail: { id: contextData.id },
          });
          document.dispatchEvent(event);
        }
      }
    }
  });

  // 3. Limpiar recursos al terminar
  player.on(Clappr.Events.PLAYER_ENDED, function () {
    if (contextData && contextData.id) {
      localStorage.removeItem(`progreso_${contextData.id}`);
    }
    ocultarReproductor();
  });
}
function videosLocalesPro(auxUrlOnce, poster, lista = null) {
  audioHimno.pause();
  enviarDatos({
    videoPath: auxUrlOnce,
    imagePath: poster,
    versiculo: null,
    libroAux: null,
    estilosAux: null,
    lista: lista,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
}

//Código para ventana contadores
let ventanaSecundariaContador;
const botonContador = document.getElementById("botonContador");
const ventanaContador = document.getElementById("contenedor-contador");
const botonVentanaContador = document.getElementById("abrirVentanaContador");
botonContador.addEventListener("click", () => {
  const displayActual = getComputedStyle(ventanaContador).display;
  ventanaContador.style.display = displayActual === "none" ? "flex" : "none";
  document.getElementById("stopAlerta").style.display = "none";
  document.getElementById("contadores").style.display = "flex";
});

botonVentanaContador.addEventListener("click", () => {
  if (ventanaSecundariaContador && !ventanaSecundariaContador.closed) {
    ventanaSecundariaContador.close();
  } else {
    abrirVentanaContador();
  }
});

let startTime = Date.now();
let timerInterval;
let countdownInterval;
let syncInterval;

function updateClock() {
  let now = new Date();
  const timeStr = now.toLocaleTimeString(undefined, { hour12: true });
  document.getElementById("clock").textContent = "Reloj | " + timeStr;
}
setInterval(updateClock, 1000);
updateClock();

function updateTimer() {
  const elapsed = Date.now() - startTime;
  const hours = String(Math.floor(elapsed / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600000) / 60000)).padStart(
    2,
    "0",
  );
  const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
  document.getElementById("timer").textContent =
    `${hours}:${minutes}:${seconds} | cronómetro de inicio`;
}

function iniciarCronometro() {
  startTime = Date.now();
  updateTimer();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
}

function limpiar() {
  clearInterval(countdownInterval);
  document.getElementById("countdown").textContent = "00:00:00 | regresivo";
  document.getElementById("stopAlerta").style.display = "none";
  document.getElementById("contadores").style.display = "flex";
}

function limpiarTodo() {
  limpiar();
  startTime = Date.now();
  updateTimer();
  clearInterval(timerInterval);
}

function iniciarCuentaRegresiva() {
  clearInterval(countdownInterval);
  document.getElementById("stopAlerta").style.display = "none";
  document.getElementById("contadores").style.display = "flex";

  const minutos = parseInt(document.getElementById("minutosInput").value);
  if (isNaN(minutos) || minutos < 1) {
    alert("Por favor ingresa un número de minutos válido (mínimo 1).");
    return;
  }

  const tiempoTotal = minutos * 60 * 1000;
  const fin = Date.now() + tiempoTotal;

  countdownInterval = setInterval(() => {
    const restante = fin - Date.now();

    if (restante <= 0) {
      clearInterval(countdownInterval);
      document.getElementById("countdown").textContent = "00:00:00 | regresivo";
      document.getElementById("stopAlerta").style.display = "flex";
      document.getElementById("contadores").style.display = "none";
      return;
    }

    const horas = String(Math.floor(restante / 3600000)).padStart(2, "0");
    const mins = String(Math.floor((restante % 3600000) / 60000)).padStart(
      2,
      "0",
    );
    const segs = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

    document.getElementById("countdown").textContent =
      `${horas}:${mins}:${segs} | regresivo`;
  }, 1000);
}

function abrirVentanaContador() {
  if (ventanaSecundariaContador && !ventanaSecundariaContador.closed) {
    ventanaSecundariaContador.focus();
    return;
  }

  ventanaSecundariaContador = window.open(
    "",
    "ContadorSecundario",
    "width=800,height=600",
  );

  const ventanaHTML = `
  <html>
    <head>
      <title>Ventana Contadores</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: black;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        * {
          text-decoration: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        #contenedor-contador {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          max-width: 90%;
          max-height: 90%;
          padding: 20px;
          overflow: hidden;
          box-sizing: border-box;
          z-index: 12;
          background-color: black;
          border: 5px solid rgba(255, 255, 255, 0.8);
          border-radius: 1rem;
          box-shadow: inset 0 0 10px black, 0 0 10px black;
        }
        #contenedor-contador .clock, .timer, .cronometro, .temporizador {
        font-size: 5vw;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: bold;
          display: flex;
          flex-wrap: nowrap;
          width: 100%;
          height: auto;
          color: white;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .contadores {
        display: flex;
          font-size: 8vw;
          color: white;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: bold;
          flex-wrap: nowrap;
          width: 100%;
          text-align: center;
          background-color: brown;
          padding: 10px;
          border-radius: 30px;
          margin-bottom: 10px;
          justify-content: center;
        }
        .stop-alert {
          font-size: 10vw;
          font-weight: bold;
          color: red;
          display: none;
          animation: parpadeo 1s infinite, zoom 1.5s ease-in-out infinite;
          text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
          font-family: Arial, Helvetica, sans-serif;
          flex-wrap: nowrap;
        }
          .stop-alert img{
  width: 200px;
  height: auto;
}
        @keyframes parpadeo {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes zoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      </style>
    </head>
    <body>
      <div id="contenedor-contador">
        <div class="contadores" id="contadores">Contadores:</div>
        <div class="clock" id="relojSec">Reloj | 12:00:00 AM</div>
        <div class="cronometro" id="cronometroSec">00:00:00 | cronómetro de inicio</div>
        <div class="temporizador" id="regresivoSec">00:00:00 | regresivo</div>
        <div class="stop-alert" id="stopAlertaSec">STOP<img src="imagenes/stop.png"></div>
      </div>
      <script>
        window.addEventListener("message", (event) => {
          const data = event.data;
          if (data.reloj) document.getElementById("relojSec").textContent = data.reloj;
          if (data.cronometro) document.getElementById("cronometroSec").textContent = data.cronometro;
          if (data.regresivo) document.getElementById("regresivoSec").textContent = data.regresivo;
          document.getElementById("stopAlertaSec").style.display = data.mostrarSTOP ? "flex" : "none";
          document.getElementById("contadores").style.display = data.mostrarContadores ? "flex" : "none";
        });
        
      <\/script>
    </body>
  </html>
`;

  ventanaSecundariaContador.document.open();
  ventanaSecundariaContador.document.write(ventanaHTML);
  ventanaSecundariaContador.document.close();

  clearInterval(syncInterval);
  syncInterval = setInterval(enviarDatosASecundaria, 1000);
}

function enviarDatosASecundaria() {
  if (ventanaSecundariaContador && !ventanaSecundariaContador.closed) {
    const reloj = document.getElementById("clock").textContent;
    const cronometro = document.getElementById("timer").textContent;
    const regresivo = document.getElementById("countdown").textContent;
    const mostrarSTOP =
      document.getElementById("stopAlerta").style.display !== "none";
    const mostrarContadores =
      document.getElementById("contadores").style.display !== "none";
    ventanaSecundariaContador.postMessage(
      { reloj, cronometro, regresivo, mostrarSTOP, mostrarContadores },
      "*",
    );
  }
}

//CONTADOR DE VISTAS DEL HIMNARIO
const urlBase =
  "https://script.google.com/macros/s/AKfycby9UwCIJf0t18UkXWKYH4zu2C4xV3AHbKlGon3RGEk3icHpBeCbyYMyRTlQV3vbyXzfbQ/exec";

const IDs = {
  vistas: "himnario_adventista_pro",
  vistasUnicas: "himnario_adventista_pro_diaria",
  descargasUnicas: "himnario_adventista_pro_descarga",
};

let stats = {
  online: `<span id="contadorOnline">👁️ 0 En línea</span>`,
  vistas: null,
  vistasUnicas: null,
  descargasUnicas: null,
};

function anioMinisterio() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `© 2013-${anio} PROYECTO JA`;
}

let contadorYaEjecutado = false;

async function contadorDeVistas() {
  if (contadorYaEjecutado) return;
  contadorYaEjecutado = true;

  const hoy = new Date().toISOString().split("T")[0];
  const ultimaVista = localStorage.getItem("ultimaVistaDiaria");
  const entradaRegistrada = localStorage.getItem("entradaRegistrada");

  const idsARegistrar = [IDs.vistas];
  const idsSoloLeer = [];

  // Visita única por día
  if (ultimaVista !== hoy) {
    idsARegistrar.push(IDs.vistasUnicas);
    localStorage.setItem("ultimaVistaDiaria", hoy);
  } else {
    idsSoloLeer.push(IDs.vistasUnicas);
  }

  // Descarga única por usuario
  if (!entradaRegistrada) {
    idsARegistrar.push(IDs.descargasUnicas);
    localStorage.setItem("entradaRegistrada", "true");
  } else {
    idsSoloLeer.push(IDs.descargasUnicas);
  }

  // Hacemos las dos peticiones en paralelo
  try {
    const promesas = [];

    if (idsARegistrar.length > 0) {
      promesas.push(
        fetch(`${urlBase}?action=batch&id=${idsARegistrar.join(",")}`).then(
          (r) => r.json(),
        ),
      );
    }

    if (idsSoloLeer.length > 0) {
      promesas.push(
        fetch(`${urlBase}?action=leer&id=${idsSoloLeer.join(",")}`).then((r) =>
          r.json(),
        ),
      );
    }

    const [registro, lectura] = await Promise.all(promesas);

    const datos = { ...(registro || {}), ...(lectura || {}) };

    stats.vistas = `${formatearNumero(datos[IDs.vistas])} vista${
      datos[IDs.vistas] === 1 ? "" : "s"
    }`;
    stats.vistasUnicas = `${formatearNumero(
      datos[IDs.vistasUnicas],
    )} vistas por día`;
    stats.descargasUnicas = `${formatearNumero(
      datos[IDs.descargasUnicas],
    )} descarga${datos[IDs.descargasUnicas] === 1 ? "" : "s"}`;

    mostrarSiTodoListo();
  } catch (e) {
    console.error("Error al consultar estadísticas:", e);
    document.getElementById("contenedor-vistas").textContent =
      "Cargando estadísticas....";
  }
}

function mostrarSiTodoListo() {
  if (
    stats.online &&
    stats.vistas &&
    stats.vistasUnicas &&
    stats.descargasUnicas
  ) {
    document.getElementById("contenedor-vistas").innerHTML =
      `${stats.online} &nbsp;| ${stats.vistas} | ${stats.vistasUnicas} | ${stats.descargasUnicas}`;
  }
}

function refrescarStatsUnicasCada5Min() {
  const ids = [
    "himnario_adventista_pro_diaria",
    "himnario_adventista_pro_descarga",
  ];

  fetch(`${urlBase}?action=leer&id=${ids.join(",")}`)
    .then((res) => res.json())
    .then((data) => {
      if (data[IDs.vistasUnicas])
        stats.vistasUnicas = `${data[IDs.vistasUnicas]} vistas por día`;

      if (data[IDs.descargasUnicas])
        stats.descargasUnicas = `${data[IDs.descargasUnicas]} descarga${
          data[IDs.descargasUnicas] === 1 ? "" : "s"
        }`;

      mostrarSiTodoListo();
    })
    .catch((err) => {
      console.error("Error al refrescar stats únicas:", err);
    });
}

function formatearNumero(num) {
  return new Intl.NumberFormat().format(num); // sin parámetros
}

window.addEventListener("load", () => {
  contadorDeVistas();
  setInterval(refrescarStatsUnicasCada5Min, 5 * 60 * 1000);
});
//localStorage.removeItem("ultimaVistaDiaria");
//localStorage.removeItem("entradaRegistrada");

//LÓGICA DE IMAGEN Y VIDEO PARA EL BOTÓN DETENCIÓN DE ARCHIVOS EXPLORADOR INTERNO PC CON ELECTRON
//LÓGICA DE IMAGEN Y VIDEO PARA EL BOTÓN DETENCIÓN DE ARCHIVOS EXPLORADOR INTERNO PC CON ELECTRON
const botonVideoImgLocal = document.getElementById("botonVideoImgLocal");
botonVideoImgLocal.addEventListener("click", async () => {
  const rutaArchivo = await window.electronAPI.abrirDialogoMultimedia();
  if (!rutaArchivo) {
    console.log("No se seleccionó ningún archivo");
    return;
  }

  console.log("Archivo seleccionado:", rutaArchivo);
  const videoLocalUrl = formalizarRuta(rutaArchivo);

  // 🖼 Si es imagen
  if (rutaArchivo.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    try {
      const base64 = await window.electronAPI.leerArchivo(rutaArchivo);
      const extension = rutaArchivo.split(".").pop();
      const dataUrl = `data:image/${extension};base64,${base64}`;

      const monitorActivo = esMonitorActivo();

      if (botonPRO || monitorActivo) {
        enviarDatos({
          videoPath: null,
          imagePath: null,
          versiculo: null,
          libroAux: null,
          estilosAux: null,
          lista: null,
          fondoBody: null,
          imagen: dataUrl,
          waterMark: waterMark,
        });
      } else {
        videoPlayerContainer.innerHTML = "";
        videoPlayerContainer.appendChild(closePlayerButton);

        const img = document.createElement("img");
        img.src = dataUrl;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.margin = "auto";

        videoPlayerContainer.appendChild(img);
        closePlayerButton.style.display = "flex";
        videoPlayerContainer.style.display = "flex";
      }
    } catch (err) {
      console.error("❌ Error leyendo imagen:", err);
    }
  }

  // 🎥 Si es video
  else if (rutaArchivo.match(/\.(mp4|mkv|avi|mov|webm)$/i)) {
    const monitorActivo = esMonitorActivo();
    if (!botonPRO && !monitorActivo) {
      videosLocalesEstandar(videoLocalUrl, null);
    } else {
      videosLocalesPro(videoLocalUrl, null);
    }
  } else {
    console.warn("❌ Archivo no soportado.");
  }
});

//FUNSIÓN PARA VIDEOS LOCALES ESTANDAR
function videosLocalesEstandar(url, poster) {
  audioHimno.pause();
  // Limpiar el contenedor de video antes de cargar uno nuevo
  videoPlayerContainer.innerHTML = "";
  videoPlayerContainer.appendChild(closePlayerButton);
  closePlayerButton.style.display = "flex";
  // Crear el reproductor Clappr
  player = new Clappr.Player({
    source: url,
    parentId: "#videoPlayerContainer",
    width: "100%",
    height: "100vh",
    preload: "auto",
    autoPlay: true,
    volume: 100,
    poster: poster,
    //hideMediaControl: true,
    disableVideoTagContextMenu: true,
    playbackNotSupportedMessage: "No se puede reproducir el contenido",
    watermark: waterMark,
    position: "bottom-right",
  });

  // Mostrar el contenedor del reproductor
  videoPlayerContainer.style.display = "flex";

  // Escuchar cuando el video termine
  player.on(Clappr.Events.PLAYER_ENDED, function () {
    if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
      window.electronAPI.updatePlaybackStatus({ playing: false });
    }
    ocultarReproductor();
  });

  player.on(Clappr.Events.PLAYER_PLAY, function () {
    if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
      window.electronAPI.updatePlaybackStatus({
        playing: true,
        tipo: "video",
        titulo: currentHimnoPlaying
          ? currentHimnoPlaying.titulo || "Reproduciendo Video"
          : "Reproduciendo Video",
        numero: currentHimnoPlaying ? currentHimnoPlaying.numero || "" : "",
      });
    }
  });

  player.on(Clappr.Events.PLAYER_PAUSE, function () {
    if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
      window.electronAPI.updatePlaybackStatus({ playing: false });
    }
  });
}

function videosLocalesPro(auxUrlOnce, poster) {
  audioHimno.pause();
  enviarDatos({
    videoPath: auxUrlOnce,
    imagePath: poster,
    versiculo: null,
    libroAux: null,
    estilosAux: null,
    lista: null,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
}

//FUNCIONES PARA PERSONALIZAR LOS HIMNOS CON LETRAS ACCESIBLES Y AUDIOS CANTADO Y PISTA, FUNCIÓN PRO

const listaHimnos = document.getElementById("listaHimnos");
const tituloHimno = document.getElementById("tituloHimno");
const contenidoHimno = document.getElementById("contenidoHimno");
const audioHimno = document.getElementById("audioHimno");
const carpetaSelect = document.getElementById("carpetaSelect");
const searchInput2 = document.getElementById("searchInput");
const anuncioHimnos = document.getElementById("anuncioHimnos");

let himnos = [];
let himnosFiltrados = [];
let himnosEnglish = [];
let himnosFiltradosEnglish = [];
let textoGlobal;
let idiomaActual = "Español";
let currentHimnoPlaying = null; // Para control remoto

// Cargar JSON
async function cargarHimnos() {
  try {
    const response = await fetch("himnos.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el JSON de himnos");
    const data = await response.json();

    himnos = data.filter((h) => !h.ingles);
    const englishObj = data.find((h) => h.ingles);
    himnosEnglish = englishObj ? englishObj.ingles : [];

    renderHimnos();
  } catch (error) {
    console.error("Error al cargar himnos:", error);
  }
}

carpetaSelect.addEventListener("change", () => {
  idiomaActual =
    carpetaSelect.value === "audiosHimnosIngles" ? "English" : "Español";
  renderHimnos();
});

function renderHimnos() {
  listaHimnos.innerHTML = "";

  const lista = idiomaActual === "English" ? himnosEnglish : himnos;

  lista.forEach((himno) => {
    const div = document.createElement("div");
    div.className = "himno";
    div.textContent = himno.numero + ". " + (himno.titulo || "Sin título");
    div.addEventListener("click", () => mostrarTitulo(himno));
    listaHimnos.appendChild(div);
  });
}

// Búsqueda dinámica
searchInput2.addEventListener("input", () => {
  const query = searchInput2.value.toLowerCase().trim();

  // Lista según el idioma seleccionado
  const lista = idiomaActual === "English" ? himnosEnglish : himnos;

  const filtrados = query
    ? lista.filter((himno) => {
        const numeroFormateado = String(himno.numero).padStart(3, "0");
        const enNumero =
          numeroFormateado.includes(query) ||
          String(himno.numero).includes(query);
        const enTitulo = himno.titulo.toLowerCase().includes(query);
        const enEstrofas = himno.estrofas.some((e) =>
          e.toLowerCase().includes(query),
        );
        const enCoro = himno.coro
          ? himno.coro.toLowerCase().includes(query)
          : false;

        return enNumero || enTitulo || enEstrofas || enCoro;
      })
    : lista;

  // Renderizar los himnos filtrados
  listaHimnos.innerHTML = "";
  filtrados.forEach((himno) => {
    const div = document.createElement("div");
    div.className = "himno";
    div.textContent = himno.numero + ". " + (himno.titulo || "Sin título");
    div.addEventListener("click", () => mostrarTitulo(himno));
    listaHimnos.appendChild(div);
  });
});

function mostrarTitulo(himno) {
  tituloHimno.textContent = himno.numero + ". " + himno.titulo + " | Play ▶";

  // Limpio cualquier listener anterior
  tituloHimno.onclick = null;

  tituloHimno.onclick = () => {
    const numeroFormateado = String(himno.numero).padStart(3, "0");
    let carpeta;
    if (idiomaActual === "English") carpeta = "audiosHimnosIngles";
    else if (carpetaSelect.value === "audiosHimnosPista")
      carpeta = "audiosHimnosPista";
    else if (carpetaSelect.value === "audiosHimnosLetra")
      carpeta = "audiosHimnosLetra";
    else carpeta = "audiosHimnos";
    audioHimno.src = formalizarRuta(
      srcAux + `${carpeta}/${numeroFormateado}.mp3`,
    );
    audioHimno
      .play()
      .then(() => {
        // Notificar inicio reproducción
        currentHimnoPlaying = himno;
        console.log(
          "[PLAYBACK] 🎵 Reproduciendo:",
          himno.titulo,
          "# " + himno.numero,
        );
        if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
          console.log("[PLAYBACK] ✅ Enviando estado al backend");
          window.electronAPI.updatePlaybackStatus({
            playing: true,
            tipo: "audio",
            titulo: himno.titulo,
            numero: himno.numero,
          });
        } else {
          console.warn(
            "[PLAYBACK] ❌ electronAPI.updatePlaybackStatus no disponible",
          );
        }
      })
      .catch((err) => console.log("Error al reproducir:", err));

    // Listeners para audio
    audioHimno.onpause = () => {
      if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
        window.electronAPI.updatePlaybackStatus({ playing: false });
      }
    };
    audioHimno.onended = () => {
      if (window.electronAPI && window.electronAPI.updatePlaybackStatus) {
        window.electronAPI.updatePlaybackStatus({ playing: false });
      }
    };

    // 🔹 Marcar título como seleccionado (toggle)
    tituloHimno.style.color = "";
    mostrarContenido(himno.numero + "| " + himno.titulo);
  };

  contenidoHimno.innerHTML = "";
  contenidoHimno.scrollTop = 0;

  himno.estrofas.forEach((estrofa, i) => {
    const p = document.createElement("div");
    p.className = "estrofa";
    p.textContent = `Estrofa ${i + 1}: ${estrofa}`;

    p.addEventListener("click", () => {
      // Si se hace clic en estrofa, desmarcar coro
      const coroEl = contenidoHimno.querySelector(".coro.himno-seleccionado");
      if (coroEl) coroEl.classList.remove("himno-seleccionado");
      // 🔹 Al hacer clic, también marcamos la estrofa
      p.classList.toggle("himno-seleccionado");
    });

    p.addEventListener("click", () => mostrarContenido(estrofa));
    contenidoHimno.appendChild(p);
  });

  if (himno.coro) {
    const c = document.createElement("div");
    c.className = "coro";
    c.textContent = `Coro: ${himno.coro}`;

    c.addEventListener("click", () => {
      c.classList.toggle("himno-seleccionado");
    });

    c.addEventListener("click", () => mostrarContenido(himno.coro));
    contenidoHimno.appendChild(c);
  }
}

// Cambiar tamaño de letra
// Inicializar tamaño de fuente
let currentFontSizeAux = 20;
let fontSizeAux2;
let fontFamilyAux2;
let colorAux2;
let textAlignAux2;
let lineHeightAux2;
let letterSpacingAux2;
let fondoAux2;
let backgroundImageAux2;
// Incrementar tamaño de fuente
document.getElementById("increase-font2").onclick = () => {
  currentFontSizeAux += 4;
  actualizarTamanioFuente2(currentFontSizeAux);
};

// Decrementar tamaño de fuente
document.getElementById("decrease-font2").onclick = () => {
  if (currentFontSizeAux > 1) {
    currentFontSizeAux -= 4;
    actualizarTamanioFuente2(currentFontSizeAux);
  }
};

// Función para aplicar el tamaño de fuente a los elementos
function actualizarTamanioFuente2(size) {
  fontSizeAux2 = `${size}px`;
  mostrarContenido(textoGlobal);
}

document.getElementById("font-type2").onchange = (e) => {
  fontFamilyAux2 = e.target.value;
  mostrarContenido(textoGlobal);
};

// Cambiar color de fuente
document.getElementById("font-color2").oninput = (e) => {
  colorAux2 = e.target.value;
  mostrarContenido(textoGlobal);
};

// Cambiar alineación
document.getElementById("align-left2").onclick = () => {
  textAlignAux2 = "left";
  mostrarContenido(textoGlobal);
};

document.getElementById("align-center2").onclick = () => {
  textAlignAux2 = "center";
  mostrarContenido(textoGlobal);
};

document.getElementById("align-right2").onclick = () => {
  textAlignAux2 = "right";
  mostrarContenido(textoGlobal);
};

document.getElementById("align-justify2").onclick = () => {
  textAlignAux2 = "justify";
  mostrarContenido(textoGlobal);
};

// Cambiar espaciado de líneas
document.getElementById("line-spacing2").oninput = (e) => {
  lineHeightAux2 = e.target.value;
  mostrarContenido(textoGlobal);
};

// Cambiar espaciado entre letras
document.getElementById("letter-spacing2").oninput = (e) => {
  letterSpacingAux2 = e.target.value + "px";
  mostrarContenido(textoGlobal);
};

// Cambiar desvanecimiento de fondo
document.getElementById("desvanecer-fondo2").oninput = (e) => {
  fondoAux2 = e.target.value;
  mostrarContenido(textoGlobal);
};

const imagePath2 = "imagenes/fondoHimnos/";
const backgroundSelect = document.getElementById("background-select2");
//POR DEFECTO IMAGEN HIMNO PROYECCIÓN
backgroundImageAux2 = `url(${imagePath2 + "/000.jpg"})`;

if (backgroundSelect) {
  for (let i = 0; i <= 100; i++) {
    const img = document.createElement("img");
    img.src = `${imagePath2}${i.toString().padStart(3, "0")}.jpg`;
    img.alt = `Fondo ${i}`;
    img.className = "background-preview2";
    img.id = "background-preview2";
    img.style.cursor = "pointer";
    img.onclick = function () {
      if (miSwitch && miSwitch.checked) {
        // 🔵 Switch activado → siempre usar imagen guardada
        const guardada = localStorage.getItem("imagenGuardada");
        if (guardada) {
          vistaImagenCargada.src = guardada;
          dataUrl = guardada;
          backgroundImageAux2 = `url(${guardada})`;
          mostrarContenido(textoGlobal);
        } else {
          console.warn("⚠️ No hay imagen guardada en localStorage.");
        }
      } else {
        // ⚪ Switch apagado → usar lógica normal
        backgroundImageAux2 = `url(${img.src})`;
        mostrarContenido(textoGlobal);
      }
    };

    backgroundSelect.appendChild(img);
  }
}

audioHimno.addEventListener("ended", () => {
  const estilosAux = {
    fontSize: fontSizeAux2,
    fontFamily: fontFamilyAux2,
    color: colorAux2,
    textAlign: textAlignAux2,
    lineHeight: lineHeightAux2,
    letterSpacing: letterSpacingAux2,
    opacity: fondoAux2,
    backgroundImage: backgroundImageAux2,
  };
  textoGlobal = ".";

  enviarDatos({
    videoPath: null,
    imagePath: null,
    versiculo: (versiculoAux = textoGlobal),
    libroAux: null,
    estilosAux: estilosAux,
    lista: null,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
});

function mostrarContenido(texto) {
  textoGlobal = texto;
  const estilosAux = {
    fontSize: fontSizeAux2,
    fontFamily: fontFamilyAux2,
    color: colorAux2,
    textAlign: textAlignAux2,
    lineHeight: lineHeightAux2,
    letterSpacing: letterSpacingAux2,
    opacity: fondoAux2,
    backgroundImage: backgroundImageAux2,
  };

  // Llamar a la función ventanaSecundaria
  let versiculoAux = texto;

  enviarDatos({
    videoPath: null,
    imagePath: null,
    versiculo: versiculoAux,
    libroAux: null,
    estilosAux: estilosAux,
    lista: null,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
}

cargarHimnos();

//VER IMAGEN CARGADA EN IMG
let dataUrl;
const vistaImagenCargada = document.getElementById("imagenPrevia");
const botonCargarImagen = document.getElementById("botonCargarImagen");
const miSwitch = document.getElementById("miSwitch");
const estado = document.getElementById("estado");

// Cargar imagen guardada al inicio (si existe)
const guardada = localStorage.getItem("imagenGuardada");
if (guardada) {
  vistaImagenCargada.src = guardada;
  dataUrl = guardada;
  backgroundImageAux2 = `url(${guardada})`;
}

// Escuchar switch
miSwitch.addEventListener("change", () => {
  if (miSwitch.checked) {
    estado.textContent = "🔵 Encendido";
    // Si hay imagen guardada, forzar que esa sea la que se muestre
    const guardada = localStorage.getItem("imagenGuardada");
    if (guardada) {
      vistaImagenCargada.src = guardada;
      dataUrl = guardada;
      backgroundImageAux2 = `url(${guardada})`;
      mostrarContenido(textoGlobal);
    }
  } else {
    estado.textContent = "⚪ Apagado";
  }
});

// Escuchar carga de imagen
botonCargarImagen.addEventListener("click", async () => {
  // Si el switch está encendido, no permitir cargar nuevas imágenes
  if (miSwitch.checked) {
    alert("⚠️ El switch está activado. Usando la última imagen cargada.");
    return;
  }

  const rutaArchivo = await window.electronAPI.abrirDialogoMultimedia();
  if (rutaArchivo && rutaArchivo.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    try {
      const base64 = await window.electronAPI.leerArchivo(rutaArchivo);
      const extension = rutaArchivo.split(".").pop();
      dataUrl = `data:image/${extension};base64,${base64}`;
      vistaImagenCargada.src = dataUrl;
      backgroundImageAux2 = `url(${dataUrl})`;
      mostrarContenido(textoGlobal);

      // Guardar en localStorage para el futuro
      localStorage.setItem("imagenGuardada", dataUrl);
    } catch (err) {
      console.error("❌ Error leyendo imagen:", err);
    }
  }
});

//FUNCIÓN PARA COMUNICACIÓN AQUÍ CON EL PRELOAD Y EL MAIN
function enviarDatos(data) {
  // Agregar la categoría actual a los datos si no está presente
  if (!data.categoria && categoriaActual) {
    data.categoria = categoriaActual;
  }

  // Agregar el estado premium actual
  const esPremium = localStorage.getItem("premium") === "true";
  data.esPremium = esPremium;

  if (window.electronAPI) {
    window.electronAPI.enviarDatos(data);
  } else {
    console.error("electronAPI no está disponible");
  }
}

//CÓDIGO IMPORTANTE PARA LA PROYECCIÓN EN MONITORES
// 🔄 Cuando se detecte cambio en los monitores
window.electronAPI.onMonitoresActualizados(async () => {
  console.log("🔄 Actualizando lista de monitores...");
  await cargarMonitores();
});

const select = document.getElementById("selectMonitores");

// Definir srcAux inmediatamente si window.paths.src está disponible
// Si no está disponible, se definirá en DOMContentLoaded
let srcAux =
  window.paths && window.paths.src ? window.paths.src + "/" : undefined;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarMonitores();

  // Si srcAux aún no está definido, intentar definirlo ahora
  if (!srcAux) {
    if (!window.paths || !window.paths.src) {
      console.error("window.paths.src no está definido todavía");
      return;
    }
    srcAux = window.paths.src + "/";
  }

  // Forzar render solo si srcAux está definido
  if (srcAux) {
    await mostrarCategoria("todos");
  }

  // Pequeño retraso para dejar que el DOM pinte
  requestAnimationFrame(() => {
    validarPremium();
  });
});

// Solo agregar esta función al final para precarga de imágenes
function precargarImagenes() {
  // Verificar que srcAux esté definido antes de precargar
  if (!srcAux) {
    console.warn(
      "[PRECARGA] srcAux no está definido, omitiendo precarga de imágenes",
    );
    return;
  }

  // Precargar las primeras 20 imágenes para mejor experiencia
  for (let i = 1; i <= 20; i++) {
    const numero = i.toString().padStart(3, "0");
    const img = new Image();
    img.src = formalizarRuta(srcAux + `portadas/${numero}.jpg`);
  }
}

// Llamar a precarga después de que la página esté cargada
window.addEventListener("load", precargarImagenes);

async function cargarMonitores() {
  // 🚀 Inicializar opciones
  select.innerHTML = "";

  const optionPorDefecto = document.createElement("option");
  optionPorDefecto.value = "";
  optionPorDefecto.textContent = "Monitores";
  optionPorDefecto.selected = true;
  select.appendChild(optionPorDefecto);

  const optionCerrar = document.createElement("option");
  optionCerrar.value = -1;
  optionCerrar.textContent = "❌ Desactivar monitor";
  select.appendChild(optionCerrar);

  const monitores = await window.electronAPI.obtenerMonitores();
  monitores.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = `✅ Monitor ${m.id}: ${m.nombre} ${
      m.principal ? "(Principal)" : ""
    }`;
    select.appendChild(option);
  });

  // ✅ Cuando el usuario selecciona algo
  select.addEventListener("change", () => {
    const monitorId = parseInt(select.value, 10);
    const esPremium = localStorage.getItem("premium") === "true";

    if (isNaN(monitorId) || monitorId === -1) {
      // 👉 Modo normal
      window.electronAPI.abrirVentanaSecundaria(-1);
      activarModoNormal();
      return;
    }

    // 👉 Abrir ventana secundaria en el monitor seleccionado
    window.electronAPI.abrirVentanaSecundaria(monitorId);

    // Solo activar modo PRO si el usuario es premium
    if (esPremium) {
      activarModoPro();
    } else {
      // Usuario gratuito: mantener modo normal pero con monitor
      activarModoNormal();
    }
  });

  // 🔄 Resetear el select cuando la ventana secundaria se cierre manualmente
  window.electronAPI.onVentanaCerrada(() => {
    select.value = ""; // vuelve a "Monitores"
    activarModoNormal();
  });
}

// =============================
// Funciones de estados
// =============================
function activarModoPro() {
  audioHimno.pause();
  botonPRO = true;
  const esPremium = localStorage.getItem("premium") === "true";

  // Solo mostrar botones PRO si el usuario es premium
  if (esPremium) {
    botonBiblia.style.display = "flex";
    botonHimnosPro.style.display = "flex";
  } else {
    botonBiblia.style.display = "none";
    botonHimnosPro.style.display = "none";
  }

  enviarDatos({
    videoPath: null,
    imagePath: null,
    versiculo: null,
    libroAux: null,
    estilosAux: null,
    lista: null,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark,
  });
}

function activarModoNormal() {
  audioHimno.pause();
  botonPRO = false;
  // No cerrar la ventana secundaria aquí, para permitir proyección en modo gratuito
  // cerrarVentanaReproductor();

  botonBiblia.style.display = "none";
  ventanaBiblia.style.display = "none";
  ventanaYouTube.style.display = "none";
  botonHimnosPro.style.display = "none";
  ventanaHimnosPro.style.display = "none";
  ventanaPowerPoint.style.display = "none";
  ventanaProgramacion.style.display = "none";
  ventanaManual.style.display = "none";
  ventanaPelis.style.display = "none";
  himnarioContainer.style.display = "grid";
}

document.getElementById("ministerio").addEventListener("mouseover", () => {
  const contenedor = document.createElement("div");
  contenedor.id = "ministerio-year"; // Add an ID to the div
  contenedor.textContent = anioMinisterio();
  contenedor.style.display = "flex";
  contenedor.style.position = "absolute";
  contenedor.style.zIndex = "99";
  contenedor.style.top = "70px"; // Adjust from the top
  contenedor.style.left = "10px"; // Adjust from the left
  contenedor.style.padding = "5px 10px"; // Add padding
  contenedor.style.borderRadius = "1rem"; // Rounded corners
  contenedor.style.width = "auto";
  contenedor.style.height = "auto";
  contenedor.style.color = "white";
  contenedor.style.fontSize = "20px"; // Smaller font size
  contenedor.style.fontFamily = "Arial, Helvetica, sans-serif";
  contenedor.style.fontWeight = "bold";
  contenedor.style.fontStyle = "italic";
  contenedor.style.border = "4px solid rgba(255,255,255,0.8)";
  contenedor.style.backgroundColor = "rgba(139,69,19,1)"; // Transparent brown
  contenedor.style.boxShadow = "0px 0px 10px black"; // Add a subtle shadow
  document.body.appendChild(contenedor);
});

document.getElementById("ministerio").addEventListener("mouseout", () => {
  const yearDiv = document.getElementById("ministerio-year");
  if (yearDiv) {
    yearDiv.remove();
  }
});

// 🗓️ Array de actualizaciones
const actualizaciones = [
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: "",
  },
  {
    fecha: "2026-02-06",
    titulo: "Más de 10 actualizaciones se implementaron, tanto en funciones nuevas como en el control remoto",
    mensaje: "1- Se mejoró el sistema de actualizaciones, ahora las actualizaciones tienen un tiempo de espera antes de checar si hay alguna actualización. 2- Se implementó la funcionalidad que ahora puedes conectar automáticamente sin poner pin con solo escanear un código QR con tu cámara de tu dispositivo. 3- En el control remoto ahora se pueden cargar tanto videos como imágenes desde tu dispositivo, desde tu celular puedes cargar un video o imagen tipo: el presentador no pudo o no le dio chance de pasar el video al hermano, él mismo lo puede colocar, o bien; en el departamento de anuncios, el director desea subir la imagen del anuncio/anuncios desde su celular. Acepta solo mp4. 4- Se agregó el selector de monitores ahora integrado en el control remoto, ahora puedes conectar la pantalla o monitor desde el control remoto. 5- Se agregó la búscqueda de YouTube desde el control remoto. 6- Se implementó un nuevo botón de manual de usuario donde podrás encontrar lo más importante del software y algunos pasos que te pueden ayudar, además, hay un botón que puedes tocar y se abrirá un pdf donde aparecerá un manual básico extra que guiarás un poco mejor con más efecto visual de cómo funciona el software y algunos pasos a seguir. 7- Se agregó un nuevo botón para ver películas para toda la comunidad, recordarles que es totalmente gratis, si las películas no dan o algo por el estilo, no hacer comentarios tipo: no sirve esa aplicación... muy mala... | La opción de películas es gratuita para toda la comunidad. 8- En el control remoto se agregó una nueva opción de CHAT potente, dónde se pueden comunicar en tiempo real con los diferentes técnicos de algún evento grande, especial, seminarios o predicas grandes o gigantes; esto servirá para comunicarse entre los diferente agentes técnicos. 9- En esa misma opción de chat del control remoto, se agregó la funcionalidad de realizar llamadas grupales entre técnicos, podrán comunicarse en tiempo real a través de una llamada de audio para mejorar la comunicación entre equipo, técnicos de cabina, técnicos de cámara, técnicos de tarima, etc. Recordar que en el navegador tienen que activar la opción de ir al sitio de todas formas para darle permisos al micrófono. 10- Se agregó un contador de usuarios conectados en tiempo real en el control remoto. Además en la llamada de audio también aparecerán los que están conectados a la llamada.",
    version: "1.0.103",
    tipo: "Función nueva",
  },
  {
    fecha: "2026-01-23",
    titulo: "Mejora S.O",
    mensaje:
      "Se mejora potentemente el sistema de lectura de archivo en los dos sistemas: Windows y principalmente Mac, aunque solo una persona usuaria de Mac nos envío un video de cómo funcionaba, con eso se pudo hacer la lógica para reparar el error, se tuvo que usar mucho análisis ya que no se cuenta con una computadora Mac para hacer pruebas unitarias, se tuvo que hacer las correciones vendados los ojos confiando en Dios; esperamos que esta nueva actualización pueda dar en Mac, recordar que el instalador Mac a veces no funcionará por seguridad de Apple, por si no llega a funcionar, recomendamos descargar el .zip | Se sigue mejorando cada vez este software con la ayuda del Señor. Preguntas y sugerencias en el chat de la aplicación.",
    version: "1.0.98",
    tipo: "Mejora",
  },
  {
    fecha: "2026-01-11",
    titulo: "Mejora",
    mensaje:
      "Se mejoró la búsqueda en el programador de eventos, ahora se puede agregar a la columna DETALLES un video local o una imagen local, o bien, puedes buscar un video de YouTube y colocarlo dentro de las actividades por ejemplo: tener listo el probad y ved, el video misionero, una música especial, cualquier video o imagen. Esperamos que con está funcionalidad sea de gran de bendición. Disponible para usuarios que nos apoyan con su suscripción al ministerio, Dios les bendiga!",
    version: "1.0.97",
    tipo: "Mejora",
  },
  {
    fecha: "2026-01-10",
    titulo: "Programación de eventos | Cronograma | Optimización",
    mensaje:
      "Se implementó una nueva funcionalidad para la programación de eventos, actividades y especialmente programa de sábado o cultos entre semana o grupos pequeños o clubes. Con esta nueva funcionalidad ahora puedes hacer tus propios cronogramas para encargados de cada actividad y participación, o bien, directamente colocar el himno desde el mismo cronograma y exportarlo a PDF y a JPG para compartirlo con los encargados de cada actividad; además, se optimizó el software porque algunos usuarios no les cargaba bien el inicio, por lo que ahora el software tiene eventos optimizados en paralelo para que trabaje con más rápidez al inicio. Esperamos que con esta nueva funcionalidad sea de gran provecho para su iglesia, disponible para todos.",
    version: "1.0.96",
    tipo: "Función nueva",
  },
  {
    fecha: "2026-01-07",
    titulo: "Mejoramiento de interfaz control",
    mensaje:
      "Se mejoró la interfaz del control remoto celular, ahora es más moderna y visual cuando se reproduce un himno se sepa que sí se le dio play, además, agradecemos a las iglesias que nos apoyaron desde un principio con el software, ellas tienen una promoción especial que se les reflejará en su suscripción. Dios les bendiga!",
    version: "1.0.88",
    tipo: "Mejora",
  },
  {
    fecha: "2026-01-01",
    titulo: "Correciones de la zona premium | promoción de código",
    mensaje:
      "¡Feliz año nuevo! ❤🙏 Gratificante comenzar año con el mejor software. En esta nueva actualización se hizo correción del servidor respecto a la zona premium (código por máquina), ahora también si no puedes desde el software obtener la licencia, aparecerá un botón auxiliar que te enviará a tu navegador favorito para obtener el código de licencia. También, estén atentos a nuestras redes sociales, estaremos con una promoción de códigos para que uses en tu iglesia por un año, solo debes de participar y llegar a la meta, atentos a nuestra página oficial de PROYECTO JA y al canal de WhatsApp, bendiciones de lo alto!",
    version: "1.0.84",
    tipo: "Mejora",
  },
  {
    fecha: "2025-12-27",
    titulo: "Las teclas de flecha no chocan entre PowerPoint y Biblia",
    mensaje:
      "Se corrigió el error de confusión entre las diapositivas de Power Point y los versículos de la Biblia cuando se desplazaban las teclas entre si.",
    version: "1.0.83",
    tipo: "Correción",
  },
  {
    fecha: "2025-12-26",
    titulo: "Nueva funcionalidad: Proyección de Power Point",
    mensaje:
      "En esta nueva actualicación se agregó una nueva opción profesional para todos. Se agregó la opción para presentar presentaciones en Power Point en el mismo himnario, ahora podrás subir tus presentaciones desde el mismo software. Para usar esta opción hay dos opciones única: Tener instalado Power Point nativo y la calidad de conversión de la presentación será nitida en full resolución y rápida o la segunda opción que tendrías que descarga el software LibreOffice, esto para que funcione la opción de presentar power point desde el himnario, libre de errores y sin falla alguna; tienes dos botones para manejar las diapositivas o bien con las teclas del tecla de derecha e izquierda; además, se agregó poderosamente la presentación a control remoto celular, ahora puedes desde tu celular si eres usuario premium poder manejar las diapositivas y poder previsualizar la diapositiva actual y la siguiente, además, se agregó en el mismo control remoto la capcidad de que pueda subir tus propias presentaciones que tienes alojadas en tu almacenamiento local de tu celular o tablet o computadora donde deseas. Es control remoto celular es una opción muy importantísima para los que están en plataforma en el culto divio, charlas, seminarios o capacitaciones o líderes que lo requieran, ahora ya no tiene que comprar aparatos para controlar la presentación, ahora pueden controlarlo desde su propio celular y si no anda USB portable, desde el celular puede subir su presentación. Solo recuerda contectar a la misma red wifi de tu computadora y listo. Espero esta nueva funcionalidad sea de gran bendición!",
    version: "1.0.81",
    tipo: "Función nueva",
  },
  {
    fecha: "2025-12-19",
    titulo: "Mejora de diseño y funcionalidades",
    mensaje:
      "En esta actualización se hicieron mejora en diseño por ejemplo: Botones ordenados y espacio asignado, más optimización en el inicio. Además, se integra un nuevo CHAT para todos los usuarios donde podrán compartir en tiempo real sus saludos, peticiones y agradecimientos durante el programa del culto de adoración. También, se incorporó dos sistemas de listas: Lista de rreproducción para videos favoritos, ahora puedes tener tus videos o cantos favoritos del software; también se incorpora una lista de reproducción personalizada para videos de YouTube, ahora puedes tener tu propia lista de reproducción de YouTube para que disfrutes de los mejores momentos de cada música o videos que te gustan. Además, ahora los usuarios pueden tener la reproducción de proyección en una segunda ventana, saldrá otra marca de agua para promocionar nuestro software en sus iglesias, esto para usuarios gratis que no pueden adquirir una licencia (El software fue pensado para iglesias que pueden adquirir una licencia, pero usuarios individuales también les agrada tener el software en sus equipos para consumo personal). Próximamente se estará trajando en un nueva funcionalidad para programación de eventos especiales gracias a un seguidor que nos proporcionó la idea. Dios te bendiga!",
    version: "1.0.74",
    tipo: "Mejora",
  },
  {
    fecha: "2025-12-09",
    titulo: "Premium",
    mensaje:
      "Se mejoró el sistema de pagos, ahora acepta mensual y anual a través del método de pago con PayPal, próximamente se aceptará con Stripe, un poco más fácil pero más dificil de manejar dentro del Software. Nos han preguntando que unas iglesias no tienen internet, la respuesta es que usen el celular para la primera conexión con el software o bien, usar lo más principal: El modo sin internet del himnario que cubre los himnos cantados que se pueden usar en modo sin internet y el lector de archivo para imágenes y videos internos del computador, las demás cosas se requieren internet o bien, que se conecten la primera vez y ya no se necesiten internet durante el transcurso de programa o las actividades que se realizan. Más novedades en los siguientes días, bendiciones!",
    version: "1.0.73",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-28",
    titulo: "Mejoras en el sistema de códigos",
    mensaje:
      "Se mejoró el sistema premium. Ahora si compras una licencia, pero no tienes conexión a internet, desde la útlima vez que usaste el himnario con internet, habrá un periodo de gracia premium para que uses el himnario desde el momento que el sistema tuvo conexión a internet. Si te quedas sin internet durante el transcurso del programa y eres usuario premium, puedes utilizarlo con normalidad, porque contarás con 7 días para que pueda el sistema detecte que tienes licencia.",
    version: "v1.0.70",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-24",
    titulo: "Control Remoto Integrado",
    mensaje:
      "Ahora el control remoto se integra con el himnario!😱 Es decir, se puede controlar el himnario, también se puede controlar desde el teléfono, tablet y cualquier otro sistema operativo Android o Apple y computadora; Recuerda solo ingresar con la URL y el PIN de acceso, tanto la computadora como el dispositivo móvil tienen que estar conectados a la misma red Wifi, esta funcionalidad sirve mucho cuando la directora/o de cantos pasa adelante y quiere controlar el equipo por si el técnico no está, o por ejemplo, no sé escucha que dijeron en la plataforma y el técnico de equipo no escucho bien que himno se dijo, el/la que está presentando puede reproducir el himno que quiera por cualquier situación, disponible para las personas que apoyan el ministerio siendo premium. Como hoy es mi cumpleaños, se ha lanzado con mucho cariño está funcionalidad para todas aquellas personas que apoyan mi ministerio personal PROYECTO JA, Jesús bendiga sus corazones y nos motive a seguir trabajando para su obra!🥰",
    version: "v1.0.69",
    tipo: "Funcion nueva",
  },
  {
    fecha: "2025-11-22",
    titulo: "Biblia con nuevas funciones",
    mensaje:
      "Ahora la Biblia y sus versiones pasan los versículos ya sea presionando sobre el mismo, con botón o con las teclas izquierda o derecha del teclado de la computadora; además, automáticamente se pasan los versículos y capítulos al siguiente capítulo con su versículo, incluso se pasa al siguiente libro. También se actualizan cada estilo personalizado en tiempo real(letras,colores,espacios,tamaños,imágenes...). Espero sea de gran bendición. Esta funcionalidad fue idea de un seguidor, gracias a -Albeiro Navarro-",
    version: "v1.0.54",
    tipo: "Funcion nueva",
  },
  {
    fecha: "2025-11-21",
    titulo: "Himnario Adventista PRO Multiplataforma",
    mensaje:
      "Está es la primer versión beta que se estará probando para sistemas opertativos Windows, Mac, Linux y Ubuntu. Esperamos en las próximas horas tener más actualizaciones de pruebas con los usuarios de las diferentes plataformas.",
    version: "v1.0.48",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-21",
    titulo: "Iconos",
    mensaje:
      "Se reparó el acceso directo y de inicio de los iconos principales del programa. Esto ayuda a encontrar más fácilmente el programa.",
    version: "v1.0.32",
    tipo: "Correcion",
  },
  {
    fecha: "2025-11-21",
    titulo: "Mejora de estética en la instalación de inicio",
    mensaje:
      "Se mejoró el diseño y traslado de la consola de descarga, ahora aparecerá en el inicio con una interfaz más amigable y menos incomoda para disfrutar mejor de la experiencia del software.",
    version: "v1.0.30",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-20",
    titulo: "Mejora de descarga en la instalación de inicio",
    mensaje:
      "Como saben, tenemos un servidor gratis, el cual es de una entidad pública donde almacenamos todos nuestros archivos, y muchos hermanos han presentado el problema que a veces algunos archivos no se descargan correctamente, En esta nueva mejora, se ha implementado la detección de archivo por archivo por si algún archivo no se descarga bien, se vuelve a descargar o se vuelve a descargar si se vuelve abrir el programa. Con esta nueva funcionalidad ya no se tendrá que sufrir por si se quedó un archivo a media en la descarga o a veces la conexión de internet es muy lenta y la descarga no sigue. Este es un excelentísimo aporte, espero sea de gran bendición. Dios me los bendiga!",
    version: "v1.0.30",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-20",
    titulo:
      "Versiones antiguas afectan la instalación en algunas instalaciones recientes",
    mensaje:
      "Se agrego una mejora en el sistema de detención en el instalador cuando hay accesos directos antiguos en el computador. Esta nueva versión limpia carpetas, accesos directos y archivos temporales y antiguos del software.",
    version: "v1.0.30",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-18",
    titulo: "Versiones antiguas no funcionales",
    mensaje:
      "Las versiones antiguas dejaran de funcionar, es necesaria actualizar a la reciente y mantenerse actualizado a nuevas funciones del software.",
    version: "v1.0.29",
    tipo: "Correccion",
  },
  {
    fecha: "2025-11-18",
    titulo: "Error de proyección de YouTube",
    mensaje:
      "Se reparó el fallo que daba en la proyección con el monitor para reproducir automáticamente video de YouTube, ¡ya lista para usar!",
    version: "v1.0.28",
    tipo: "Correccion",
  },
  {
    fecha: "2025-11-17",
    titulo: "Apariencia y mejoramiento",
    mensaje:
      "La apariencia para el pago de suscripción se mejoró y se agregaron más características premium al sistema de ayuda del ministerio PROYECTO JA.",
    version: "v1.0.26",
    tipo: "Mejora",
  },
  {
    fecha: "2025-11-17",
    titulo: "Bug Pantalla Negra en Algunas Laptops",
    mensaje:
      "Se corrigió un pequeño fallo de optimización en la iniciación del software. Algunas personas presentaron problemas cuando abrian el programa: 1-Cargaba muy lento, 2-Se quedaba en negra parte de la pantalla y no cargaban los himnos. Se optimizó el programa y ahora carga en 0.500 milisegundos en computadora de 4/8gigas de Ram con Disco SSD con dos nucleos mínimo y procesador 2300 herts balanceado.",
    version: "v1.0.25",
    tipo: "Correccion",
  },
  {
    fecha: "2025-11-17",
    titulo: "Buscador de Youtube",
    mensaje:
      "Se mejoró el buscador de YouTube para evitar caídas repentinas con el contenido.",
    version: "v1.0.24",
    tipo: "Mejora",
  },
  {
    fecha: "2025-10-6",
    titulo:
      "Mejoramiento del reproductor de proyección y vista automática del video de YouTube",
    mensaje:
      "Se mejoró el reproductor profesional de proyección: Ya no se observa la barra de control cuando se coloca un himno, además, también se implementó en YouTube la mejora; además, ahora YouTube se reproduce automáticamente. Además, se agregó un botón de novedades para que revices qué actualizaciones han salido desde que se creó el software y te mantengas actualizado.",
    version: "v1.0.23",
    tipo: "Mejora",
  },
  {
    fecha: "2025-09-10",
    titulo:
      "Nueva funcionalidad para personalizar los himnos tanto español como inglés.",
    mensaje:
      "Se agregó y automatizó el software corriendo en su servidor propio. Nuevo botón para personalizar el himnario con ajustes de letra y versiones como cantado, instrumental, solo letra e inglés(se sigue modificando cada estrofa a su idioma con traductores voluntarios), además, en la misma sección, se puede cargar una imagen a proyección en el himno. Además se agregó la funcionalidad potente de auto-actualización de este software para futuras actualizaciones: ya no tendrás que descargar el mismo archivo zip todo el tiempo, este software desde esta versión se actualiza automáticamente.",
    version: "v1.0.19",
    tipo: "Funcion nueva",
  },
  {
    fecha: "2025-08-30",
    titulo: "Nuevas funciones!",
    mensaje:
      "Se transladó la opción PRO al lado superior de la pantalla, allí mismo se implenta un apartado de estadísticas nerd, además, se agregó funcionalidad de búsqueda de monitores disponibles en tu computador. Se repara la búsqueda en YouTube(nuevas políticas de navegadores web), Se agrega un reloj contador para predicadores. Se agregó también un botón para búsqueda de archivos en el explorador de archivos del disco.",
    version: "v1.0.18",
    tipo: "Funcion nueva",
  },
  {
    fecha: "2025-07-30",
    titulo: "Nuevos himnario implementados y nueva función de You Tube",
    mensaje:
      "Se agregaron nuevas versiones de himnario tanto orquestado, antiguo, cantado, instrumental, infantil, piano y listas de reproducción actualizadas. Además, nueva función potente, búsquedas de YouTube sin anuncios para reproducir en tu iglesia, tanto en modo local o activando el modo profesional.",
    version: "v1.0.2",
    tipo: "Funcion nueva",
  },
  {
    fecha: "2025-01-27",
    titulo: "Nuevas listas de reproducción.",
    mensaje:
      "Se implementa listas de reproducción en modo bucle y play automático tanto en local y profesional",
    version: "v1.0.1",
    tipo: "Mejora",
  },
  {
    fecha: "2024-011-09",
    titulo: "Publicación del Software",
    mensaje:
      "Creación del software del himnario con funcionalidad de proyección y búsqueda avanzada, himnario solo cantado. Funciones modo reproducción local y profesional.",
    version: "v1.0.0",
    tipo: "Funcion nueva",
  },
  /**
   * Función Nueva
   * Mejora
   * Corrección
   */
];

// 🎨 Función para renderizar los mensajes
function mostrarActualizaciones() {
  himnarioContainer.style.display = "grid";
  ventanaBiblia.style.display = "none";
  ventanaContador.style.display = "none";
  ventanaHimnosPro.style.display = "none";
  ventanaYouTube.style.display = "none";
  const contenedorPadre = document.getElementById("himnario");
  contenedorPadre.innerHTML = "";
  const contenedor = document.createElement("div");
  contenedor.className = "contenedorHijo";

  const card = document.createElement("div");
  card.className = "actualizacion";
  card.textContent =
    "Recuerda darnos tu opinión o dejarnos un comentario para seguir mejorando. Aquí mismo puedes dejarnos tus comentarios. (LEEMOS SOLO AQUÍ)";
  contenedor.appendChild(card);

  actualizaciones.forEach((item) => {
    if (item.fecha != "") {
      const card = document.createElement("div");
      card.className = "actualizacion";

      card.innerHTML = `
      <div class="fecha">${item.fecha} | PROYECTO JA</div>
      <h3>${item.titulo}</h3>
      <p>${item.mensaje}</p>
      <div class="extra">
        <span class="version">${item.version}</span>
        <span class="tipo ${item.tipo.toLowerCase()}">${item.tipo}</span>
      </div>
    `;
      contenedor.appendChild(card);
    }
  });
  contenedorPadre.appendChild(contenedor);

  // ✅ Inicializar carrusel de posts
  inicializarCarrusel(contenedor);
}

//TÍTULO DE LOS VIDEOS | SIEMPRE ABAJO DE TODO EL CÓDIGO PARA MAYOR FÁCILIDAD
const titulos = [
  "Himno: 001 Cantad alegres al Señor",
  "Himno: 002 Da gloria al Señor",
  "Himno: 003 Unidos en espiritu",
  "Himno: 004 Alabanzas sin cesar",
  "Himno: 005 A ti glorioso Dios",
  "Himno: 006 Hosanna",
  "Himno: 007 Oh Dios mi soberano Rey",
  "Himno: 008 Suenen dulces himnos",
  "Himno: 009 Alabemos al Señor",
  "Himno: 010 Alaba al Dios de Abraham",
  "Himno: 011 Alma bendice al Señor",
  "Himno: 012 Todos juntos reunidos",
  "Himno: 013 Al Dios invisible",
  "Himno: 014 Engrandecido sea Dios",
  "Himno: 015 Loamoste oh Dios",
  "Himno: 016 A nuestro Padre Dios",
  "Himno: 017 Oh Padre eterno Dios",
  "Himno: 018 Load al Padre",
  "Himno: 019 Padre nuestro",
  "Himno: 020 A Dios el Padre celestial",
  "Himno: 021 Gloria sea al Padre",
  "Himno: 022 Jehova esta en su santo templo",
  "Himno: 023 Silencio Silencio",
  "Himno: 024 Imploramos tu presencia",
  "Himno: 025 Siento la presencia del Señor",
  "Himno: 026 Aqui reunidos",
  "Himno: 027 Oh Pastor divino escucha",
  "Himno: 028 Tu pueblo jubiloso",
  "Himno: 029 Del culto el tiempo llega",
  "Himno: 030 Abre mis ojos",
  "Himno: 031 Oh Señor al orar",
  "Himno: 032 Nos reunimos en tu santuario",
  "Himno: 033 Tu presencia Padre amante invocamos",
  "Himno: 034 En momentos asi",
  "Himno: 035 Oye oh Señor",
  "Himno: 036 Oh Dios que oyes cada oracion",
  "Himno: 037 Dios os guarde",
  "Himno: 038 Que Dios te guarde",
  "Himno: 039 Despide hoy tu grey",
  "Himno: 040 Shalom",
  "Himno: 041 Gracia amor y comunion",
  "Himno: 042 Queda Señor",
  "Himno: 043 Agua de vida",
  "Himno: 044 Despidenos con tu bendicion",
  "Himno: 045 Despues Señor",
  "Himno: 046 Hoy amanece",
  "Himno: 047 Por la mañana",
  "Himno: 048 Oh Dios si he ofendido un corazon",
  "Himno: 049 Cristo ya la noche cierra",
  "Himno: 050 Baja el sol",
  "Himno: 051 Nuestro sol se pone ya",
  "Himno: 052 Señor Jesus el dia ya se fue",
  "Himno: 053 Oh amor de Dios",
  "Himno: 054 Tan bueno es Dios",
  "Himno: 055 Grande Señor es tu misericordia",
  "Himno: 056 De tal manera amo",
  "Himno: 057 Mi Dios me ama",
  "Himno: 058 Grande es el amor divino",
  "Himno: 059 Mirad que amor",
  "Himno: 060 Santo Santo Santo Tu gloria llena",
  "Himno: 061 Santo Santo Santo Dios omnipotente",
  "Himno: 062 Santo santo santo santo es el Señor",
  "Himno: 063 Al Rey adorad",
  "Himno: 064 Yo canto el poder de Dios",
  "Himno: 065 El mundo es de mi Dios",
  "Himno: 066 Sabes cuantos",
  "Himno: 067 Señor yo te conozco",
  "Himno: 068 Todo lo que ha creado Dios",
  "Himno: 069 Señor mi Dios",
  "Himno: 070 Nuestro Dios reina",
  "Himno: 071 Cada cosa hermosa",
  "Himno: 072 Fue un milagro",
  "Himno: 073 La creacion",
  "Himno: 074 Himno al creador",
  "Himno: 075 Grande es Jehova",
  "Himno: 076 Eterno Dios mi Creador",
  "Himno: 077 Sea exaltado",
  "Himno: 078 Al mundo paz",
  "Himno: 079 Se oye un canto en alta esfera",
  "Himno: 080 Venid pastorcillos",
  "Himno: 081 Noche de paz",
  "Himno: 082 Ya repican las campanas",
  "Himno: 083 La primera Navidad",
  "Himno: 084 Ve dilo en las montañas",
  "Himno: 085 Alla en el pesebre",
  "Himno: 086 A medianoche en Belen",
  "Himno: 087 Venid fieles todos",
  "Himno: 088 Oh aldehuela de Belen",
  "Himno: 089 Cristianos alegraos hoy",
  "Himno: 090 Somos del oriente",
  "Himno: 091 Que niño es este",
  "Himno: 092 Angeles cantando estan",
  "Himno: 093 Hubo Uno que quiso",
  "Himno: 094 Sangro mi soberano Dios",
  "Himno: 095 Un dia",
  "Himno: 096 Al contemplar la excelsa cruz",
  "Himno: 097 En el monte Calvario",
  "Himno: 098 Rostro divino",
  "Himno: 099 Jamas podra alguien separarnos",
  "Himno: 100 Dulces momentos",
  "Himno: 101 Cabeza sacrosanta",
  "Himno: 102 Cordero de Dios",
  "Himno: 103 Jesus resucitado",
  "Himno: 104 La tumba le encerro",
  "Himno: 105 Cristo ha resucitado",
  "Himno: 106 Tuya es la gloria",
  "Himno: 107 Canto el gran amor",
  "Himno: 108 Amigo fiel es Cristo",
  "Himno: 109 Un buen amigo tengo yo",
  "Himno: 110 Cristo es el mejor amigo",
  "Himno: 111 Como Jesus no hay otro amigo",
  "Himno: 112 Ningun otro me amo cual Cristo",
  "Himno: 113 Amor que no me dejaras",
  "Himno: 114 Dime la antigua historia",
  "Himno: 115 Oh cuan grande amor",
  "Himno: 116 Cristo esta a mi lado",
  "Himno: 117 No se por que",
  "Himno: 118 Cuando estes cansado y abatido",
  "Himno: 119 De su trono mi Jesus",
  "Himno: 120 Cuanto me alegra",
  "Himno: 121 Es Jesucristo la vida la luz",
  "Himno: 122 Divino pastor",
  "Himno: 123 Cuanto nos ama Jesus",
  "Himno: 124 Ama el Pastor sus ovejas",
  "Himno: 125 Infinito amor de Cristo",
  "Himno: 126 Abrigadas y salvas en el redil",
  "Himno: 127 Cristo nombre dulce",
  "Himno: 128 Tu nombre es dulce buen Jesus",
  "Himno: 129 Cual Jesus no hay otro nombre",
  "Himno: 130 Cristo Cristo Cristo",
  "Himno: 131 Bendito es el nombre de Jesus",
  "Himno: 132 Dulce hermoso nombre es Jesus",
  "Himno: 133 Venid con canticos venid",
  "Himno: 134 Cual mirra fragante",
  "Himno: 135 Cristo nombre sublime",
  "Himno: 136 Oh cuanto amo a Cristo",
  "Himno: 137 De Jesus el nombre invoca",
  "Himno: 138 De mi amante Salvador",
  "Himno: 139 La tierna voz del Salvador",
  "Himno: 140 Te quiero te quiero",
  "Himno: 141 Alabadle",
  "Himno: 142 Venid cantad de gozo en plenitud",
  "Himno: 143 Digno eres tu",
  "Himno: 144 Mi Salvador",
  "Himno: 145 Con acentos de alegria",
  "Himno: 146 Ni en la tierra",
  "Himno: 147 A Dios sea gloria",
  "Himno: 148 Solo Cristo",
  "Himno: 149 Junto a la cruz do Jesus murio",
  "Himno: 150 A Cristo doy mi canto",
  "Himno: 151 Por eso lo amo",
  "Himno: 152 A ti Jesus",
  "Himno: 153 Ved a Cristo",
  "Himno: 154 Dad gloria al Cordero Rey",
  "Himno: 155 En Sion Jesus hoy reina",
  "Himno: 156 A Cristo coronad",
  "Himno: 157 Majestad",
  "Himno: 158 Amanece ya la mañana de oro",
  "Himno: 159 Yo espero la mañana",
  "Himno: 160 Viene otra vez nuestro Salvador",
  "Himno: 161 Oh cuan gratas las nuevas",
  "Himno: 162 En presencia estar de Cristo",
  "Himno: 163 Cristo viene esto es cierto",
  "Himno: 164 Jesus pronto volvera",
  "Himno: 165 Vendra el Señor",
  "Himno: 166 Siervos de Dios la trompeta tocad",
  "Himno: 167 Quien en deslumbrante gloria",
  "Himno: 168 El Rey que viene",
  "Himno: 169 Cuando suene la trompeta",
  "Himno: 170 La segunda venida de Cristo",
  "Himno: 171 Has oido el mensaje",
  "Himno: 172 Promesa dulce",
  "Himno: 173 Sera al albor",
  "Himno: 174 Mira los hitos",
  "Himno: 175 Ved a Cristo que se acerca",
  "Himno: 176 Tu veras al Rey viniendo",
  "Himno: 177 Los tres mensajes angelicos",
  "Himno: 178 Contemple la gloria",
  "Himno: 179 Cristo viene Aquel dia se acerca",
  "Himno: 180 Si lo veremos",
  "Himno: 181 Una esperanza",
  "Himno: 182 Veremos a Cristo",
  "Himno: 183 No me olvide de ti",
  "Himno: 184 Nunca te rindas",
  "Himno: 185 Al cielo voy",
  "Himno: 186 Hace años escuche",
  "Himno: 187 Aunque anochezca",
  "Himno: 188 Gran alegria",
  "Himno: 189 Cristo muy pronto vendra",
  "Himno: 190 Santo Espiritu de Cristo",
  "Himno: 191 La nueva proclamad",
  "Himno: 192 Llena mi ser",
  "Himno: 193 Dios nos ha dado promesa",
  "Himno: 194 Vive en mi",
  "Himno: 195 Abre mis ojos a la luz",
  "Himno: 196 Santo Espiritu de Dios",
  "Himno: 197 Dulce Espiritu",
  "Himno: 198 Desciende Espiritu de amor",
  "Himno: 199 Movidos por tu Espiritu",
  "Himno: 200 Bautizanos hoy",
  "Himno: 201 Cancion del espiritu",
  "Himno: 202 Danos el fuego",
  "Himno: 203 Santo Espiritu llena mi vida",
  "Himno: 204 Oh cantadmelas otra vez",
  "Himno: 205 Dadme la Biblia",
  "Himno: 206 Padre tu Palabra es mi delicia",
  "Himno: 207 Dios nos habla",
  "Himno: 208 Santa Biblia",
  "Himno: 209 La Biblia nos habla de Cristo",
  "Himno: 210 Huye cual ave",
  "Himno: 211 Fija tus ojos en Cristo",
  "Himno: 212 A tu puerta Cristo esta",
  "Himno: 213 Tierno y amante Jesus nos invita",
  "Himno: 214 Mientras Jesus te llama",
  "Himno: 215 Con voz benigna te llama Jesus",
  "Himno: 216 Dios al prodigo llama",
  "Himno: 217 Bienvenida da Jesus",
  "Himno: 218 A Jesucristo ven sin tardar",
  "Himno: 219 Tan triste y tan lejos de Dios",
  "Himno: 220 Alla la puerta abierta esta",
  "Himno: 221 Puertas abiertas encontraran",
  "Himno: 222 Del trono celestial",
  "Himno: 223 Oi la voz del Salvador",
  "Himno: 224 Oi la voz del buen Jesus",
  "Himno: 225 Un hombre llegose de noche a Jesus",
  "Himno: 226 Buscad primero",
  "Himno: 227 Preste oidos el humano",
  "Himno: 228 Me buscareis y me hallareis",
  "Himno: 229 Has pensado lo que puede costar",
  "Himno: 230 Abre tu corazon",
  "Himno: 231 Todo en el altar",
  "Himno: 232 Entregate en oracion",
  "Himno: 233 Ven a la Fuente de vida",
  "Himno: 234 Temes que en la lucha",
  "Himno: 235 La razon de vivir",
  "Himno: 236 A Jesus entrega todo",
  "Himno: 237 Jesus hoy espera entrar en tu ser",
  "Himno: 238 Yo escucho buen Jesus",
  "Himno: 239 De Dios vagaba lejos yo",
  "Himno: 240 Te ruego oh Dios",
  "Himno: 241 Perdon te ruego mi Señor y Dios",
  "Himno: 242 Una es Señor mi peticion",
  "Himno: 243 Entrego todo a Cristo",
  "Himno: 244 Padre Dios",
  "Himno: 245 Cumplase oh Cristo tu voluntad",
  "Himno: 246 Te Quiero mi Señor",
  "Himno: 247 Yo te seguire",
  "Himno: 248 Que mi vida entera este",
  "Himno: 249 Tal como soy",
  "Himno: 250 Padre a tus pies me postro",
  "Himno: 251 No yo sino el",
  "Himno: 252 Dejo el mundo",
  "Himno: 253 Tuyo soy Jesus",
  "Himno: 254 Anhelo ser limpio",
  "Himno: 255 Oh Cristo te adoro",
  "Himno: 256 Jesus yo he prometido",
  "Himno: 257 Oh Ven te invito Cristo",
  "Himno: 258 Tu dejaste tu trono",
  "Himno: 259 Mi espiritu alma y cuerpo",
  "Himno: 260 Junto a la cruz de Cristo",
  "Himno: 261 Salvador a ti me rindo",
  "Himno: 262 Los tesoros del mundo",
  "Himno: 263 Entra en este corazon",
  "Himno: 264 Un dia mas por Cristo",
  "Himno: 265 La senda ancha dejare",
  "Himno: 266 Vivo por Cristo",
  "Himno: 267 A la cruz de Cristo voy",
  "Himno: 268 Puedo oir tu voz llamando",
  "Himno: 269 Prefiero a mi Cristo",
  "Himno: 270 Meditar en Jesus",
  "Himno: 271 Hoy me llama el mundo en vano",
  "Himno: 272 De esclavitud",
  "Himno: 273 Tu vida oh Salvador",
  "Himno: 274 Que te dare Maestro",
  "Himno: 275 Humilde oracion",
  "Himno: 276 Con nuestras mentes",
  "Himno: 277 Amarte mas",
  "Himno: 278 Puede el mundo ver a Jesus en mi",
  "Himno: 279 Transformame a tu imagen",
  "Himno: 280 Ser semejante a Jesus",
  "Himno: 281 He decidido seguir a Cristo",
  "Himno: 282 Brilla Jesus",
  "Himno: 283 Ven Señor Jesus",
  "Himno: 284 Me dice el Salvador",
  "Himno: 285 Confio en Jesucristo",
  "Himno: 286 Hay una fuente sin igual",
  "Himno: 287 Rey de mi vida",
  "Himno: 288 Al contemplarte mi Salvador",
  "Himno: 289 Que me puede dar perdon",
  "Himno: 290 Fuente de la vida eterna",
  "Himno: 291 Perdido fui a mi Jesus",
  "Himno: 292 Por fe en Cristo el Redentor",
  "Himno: 293 Quieres ser salvo de toda maldad",
  "Himno: 294 En Jesus por fe confio",
  "Himno: 295 Las manos Padre",
  "Himno: 296 Comprado con sangre por Cristo",
  "Himno: 297 Salvado con sangre por Cristo",
  "Himno: 298 Al Calvario solo Jesus ascendio",
  "Himno: 299 Hay vida en mirar",
  "Himno: 300 Lejos de mi Padre Dios",
  "Himno: 301 Cristo es mi amante Salvador",
  "Himno: 302 Grato es contar la historia",
  "Himno: 303 Sublime gracia",
  "Himno: 304 Mi Redentor el Rey de gloria",
  "Himno: 305 maravillosa su gracia es",
  "Himno: 306 Llego Jesus",
  "Himno: 307 Roca de la eternidad",
  "Himno: 308 Dios descendio",
  "Himno: 309 La voz de Jesus",
  "Himno: 310 Cristo centro de mi vida",
  "Himno: 311 Cuando junte Jesus las naciones",
  "Himno: 312 Dia grande viene",
  "Himno: 313 La hora del juicio",
  "Himno: 314 Cristo Rey Omnipotente",
  "Himno: 315 El Juicio empezo",
  "Himno: 316 Hay un mundo feliz mas alla",
  "Himno: 317 En el hogar do nunca habra",
  "Himno: 318 En la mansion de mi Señor",
  "Himno: 319 Cuando mi lucha termine al final",
  "Himno: 320 Jamas se dice adios alla",
  "Himno: 321 Alla sobre montes",
  "Himno: 322 Busquemos la patria",
  "Himno: 323 He de conocerle entonces",
  "Himno: 324 Pronto yo vere a Jesus",
  "Himno: 325 No puede el mundo ser mi hogar",
  "Himno: 326 Un dia yo he de faltar",
  "Himno: 327 Jerusalen mi amado hogar",
  "Himno: 328 Nos veremos junto al rio",
  "Himno: 329 En la celica morada",
  "Himno: 330 Hay un feliz Eden",
  "Himno: 331 La mañana gloriosa",
  "Himno: 332 En la tierra adonde ire",
  "Himno: 333 Aunque en esta vida",
  "Himno: 334 Cuanto anhelo llegar",
  "Himno: 335 Mi hogar celestial",
  "Himno: 336 Del bello pais he leido",
  "Himno: 337 Nunca mas adios",
  "Himno: 338 Las riberas de dicha inmortal",
  "Himno: 339 A veces oigo un himno",
  "Himno: 340 Oh que musica divina",
  "Himno: 341 Mas cerca del hogar",
  "Himno: 342 despues del rio",
  "Himno: 343 Quiero llegar a ser parte del cielo",
  "Himno: 344 Entonad un himno",
  "Himno: 345 Canta y tus penas se iran",
  "Himno: 346 Feliz el dia",
  "Himno: 347 Con gozo canto al Señor",
  "Himno: 348 Dicha grande",
  "Himno: 349 Gran gozo hay en mi alma hoy",
  "Himno: 350 Andando en la luz de Dios",
  "Himno: 351 Yo tengo gozo",
  "Himno: 352 Gozaos Cristo es Rey",
  "Himno: 353 Suenan melodias en mi ser",
  "Himno: 354 Voy caminando",
  "Himno: 355 Yo voy feliz",
  "Himno: 356 Gozo es conocer a Cristo",
  "Himno: 357 Jesus tu eres mi alegria",
  "Himno: 358 En el seno de mi alma",
  "Himno: 359 Regocijaos siempre",
  "Himno: 360 En Jesucristo martir de paz",
  "Himno: 361 Percibe mi alma un son",
  "Himno: 362 Con sin igual amor",
  "Himno: 363 Hay un canto nuevo en mi ser",
  "Himno: 364 Jesus da paz",
  "Himno: 365 Elevemos al Señor",
  "Himno: 366 En Cristo hallo amigo",
  "Himno: 367 Gracias Dios",
  "Himno: 368 Padre amado",
  "Himno: 369 Gratitud y alabanza",
  "Himno: 370 Por la excelsa majestad",
  "Himno: 371 Jesus te ama",
  "Himno: 372 Como agradecer",
  "Himno: 373 Mi Redentor es Cristo",
  "Himno: 374 Dulce comunion",
  "Himno: 375 Sed puros y santos",
  "Himno: 376 Dulce oracion",
  "Himno: 377 A los pies de Jesucristo",
  "Himno: 378 Oh que amigo nos es Cristo",
  "Himno: 379 Habla Señor a mi alma",
  "Himno: 380 Ando con Cristo",
  "Himno: 381 De mañana veo su faz",
  "Himno: 382 A solas al huerto yo voy",
  "Himno: 383 Habla a tu Dios de mañana",
  "Himno: 384 El jardin de oracion",
  "Himno: 385 Hablando con Jesus",
  "Himno: 386 Hay un lugar de paz",
  "Himno: 387 Aparte del mundo",
  "Himno: 388 Debo decir a Cristo",
  "Himno: 389 Conversar con Jesucristo",
  "Himno: 390 Soy yo Señor",
  "Himno: 391 Le importara a Jesus",
  "Himno: 392 Hay quien vela mis pisadas",
  "Himno: 393 Mi fe contempla a ti",
  "Himno: 394 Cuan firme cimiento",
  "Himno: 395 Oh cuan dulce es fiar en Cristo",
  "Himno: 396 Oh que Salvador",
  "Himno: 397 Oh buen Señor velada esta",
  "Himno: 398 Cuando sopla airada la tempestad",
  "Himno: 399 En estos tiempos",
  "Himno: 400 Castillo fuerte es nuestro Dios",
  "Himno: 401 Eterna Roca es mi Jesus",
  "Himno: 402 Oh salvo en la Roca",
  "Himno: 403 Cuando en la lucha",
  "Himno: 404 A cualquiera parte",
  "Himno: 405 Se quien es Jesus",
  "Himno: 406 Jesus es mi luz",
  "Himno: 407 Muy cerca de mi Redentor",
  "Himno: 408 Cristo me ayuda por el a vivir",
  "Himno: 409 Si mi debil fe flaqueare",
  "Himno: 410 Cuando te quiero",
  "Himno: 411 Bajo sus alas",
  "Himno: 412 Todas las promesas",
  "Himno: 413 Si la carga es pesada",
  "Himno: 414 Oh buen Maestro despierta",
  "Himno: 415 Salvo en los tiernos brazos",
  "Himno: 416 Oh tenga yo la ardiente fe",
  "Himno: 417 Dame la fe de mi Jesus",
  "Himno: 418 Padre yo vengo a ti",
  "Himno: 419 Por la justicia de Jesus",
  "Himno: 420 Nunca desmayes",
  "Himno: 421 Cariñoso Salvador",
  "Himno: 422 Nada puede ya faltarme",
  "Himno: 423 Pertenezco a mi Rey",
  "Himno: 424 Como podre estar triste",
  "Himno: 425 Dia en dia",
  "Himno: 426 Tengo paz",
  "Himno: 427 Lleva todo tu pesar a Cristo",
  "Himno: 428 Su oveja soy",
  "Himno: 429 El puede",
  "Himno: 430 Solo no estoy",
  "Himno: 431 A el mis problemas le doy",
  "Himno: 432 Como el ciervo",
  "Himno: 433 Conmigo marcha un angel",
  "Himno: 434 Jesus es mi vida",
  "Himno: 435 Dios sabe Dios oye Dios ve",
  "Himno: 436 El vive hoy",
  "Himno: 437 Tu presencia Padre amado da consuelo",
  "Himno: 438 Mira hacia Dios",
  "Himno: 439 Oh quien pudiera andar con Dios",
  "Himno: 440 Quiero Jesus contigo andar",
  "Himno: 441 Jesus te necesito",
  "Himno: 442 Oh Maestro y Salvador",
  "Himno: 443 Hay un lugar do quiero estar cerca de ti",
  "Himno: 444 No me pases",
  "Himno: 445 Mas de Jesus",
  "Himno: 446 Mas cerca oh Dios de ti",
  "Himno: 447 Mas santidad dame",
  "Himno: 448 Salvador mi bien eterno",
  "Himno: 449 Cristo mi piloto se",
  "Himno: 450 Oh Jesus Pastor divino",
  "Himno: 451 Cerca mas cerca",
  "Himno: 452 Contigo quiero andar",
  "Himno: 453 Como ser cual Cristo",
  "Himno: 454 Yo quisiera andar con Cristo",
  "Himno: 455 Mi mano ten",
  "Himno: 456 Como la mujer de junto al pozo",
  "Himno: 457 More en mi la belleza del Salvador",
  "Himno: 458 Orad por mi",
  "Himno: 459 Hablame mas de Cristo",
  "Himno: 460 Quiero estar cerca de Cristo",
  "Himno: 461 A tu lado anhelo estar",
  "Himno: 462 Dame a Cristo",
  "Himno: 463 Mi oracion",
  "Himno: 464 Ven inspiranos",
  "Himno: 465 Ven junto a mi",
  "Himno: 466 Guiame Oh Salvador",
  "Himno: 467 Siempre el Salvador conmigo",
  "Himno: 468 Paso a paso Dios me guia",
  "Himno: 469 Jesus me guia",
  "Himno: 470 Guiame Dios",
  "Himno: 471 Conduceme Maestro",
  "Himno: 472 Jesus mi guia es",
  "Himno: 473 Hablame y hablare",
  "Himno: 474 Que me importan",
  "Himno: 475 El camino es escabroso",
  "Himno: 476 Muy lejos el hogar esta",
  "Himno: 477 Los que aman al Señor",
  "Himno: 478 Se fiel siempre hermano",
  "Himno: 479 De la mano Señor",
  "Himno: 480 Digno eres oh Señor",
  "Himno: 481 Voy al cielo",
  "Himno: 482 Quiero cantar",
  "Himno: 483 Cuando al cielo lleguemos",
  "Himno: 484 Busca al Señor",
  "Himno: 485 Unidos en verdad",
  "Himno: 486 En los pasos de Jesus",
  "Himno: 487 Cristo eres justo Rey",
  "Himno: 488 Al andar con Jesus",
  "Himno: 489 Solo anhelo Cristo amado",
  "Himno: 490 Mejor que los sacrificios",
  "Himno: 491 Levantate cristiano",
  "Himno: 492 Trabajad Trabajad",
  "Himno: 493 Hoy quiero trabajar contigo",
  "Himno: 494 Cerca un alma agobiada esta",
  "Himno: 495 Mi deber",
  "Himno: 496 Sus manos somos",
  "Himno: 497 Manos",
  "Himno: 498 Puedes demostrar con tus manos",
  "Himno: 499 Jesus anduvo por aqui",
  "Himno: 500 Hazme tu siervo",
  "Himno: 501 Mi vida al servicio de Dios",
  "Himno: 502 Brilla en el sitio donde estes",
  "Himno: 503 Oh Dios que deseas la vida",
  "Himno: 504 Señor de todos",
  "Himno: 505 Hijo del reino",
  "Himno: 506 De pie de pie cristianos",
  "Himno: 507 Tentado no cedas",
  "Himno: 508 Contendamos siempre por nuestra fe",
  "Himno: 509 Firmes Fuertes",
  "Himno: 510 Quien esta por Cristo",
  "Himno: 511 Marchare en la divina luz",
  "Himno: 512 Nunca esteis desanimados",
  "Himno: 513 Honra al hombre de valor",
  "Himno: 514 Despertad despertad oh cristianos",
  "Himno: 515 Despliegue el cristiano su santa bandera",
  "Himno: 516 Firmes y adelante",
  "Himno: 517 De pie oh grey de Dios",
  "Himno: 518 Jesus esta buscando voluntarios hoy",
  "Himno: 519 Despierta hermano sin demorar",
  "Himno: 520 Adelante manda el Señor",
  "Himno: 521 Al Cristo ved",
  "Himno: 522 Suenen las palabras",
  "Himno: 523 Los sabios dan su ciencia",
  "Himno: 524 Traian en silencio presentes al Señor",
  "Himno: 525 Con gratitud llegamos",
  "Himno: 526 Oh mi patria te prometo hoy",
  "Himno: 527 Señor Jehova omnipotente Dios",
  "Himno: 528 Por montañas muy cansado",
  "Himno: 529 Iglesia de Cristo",
  "Himno: 530 Somos un pequeño pueblo muy feliz",
  "Himno: 531 La familia de Dios",
  "Himno: 532 Sagrado es el amor",
  "Himno: 533 Cuan bueno y agradable",
  "Himno: 534 En tu nombre comenzamos",
  "Himno: 535 Las faenas terminadas",
  "Himno: 536 En sombras de la tarde",
  "Himno: 537 Sabado santo",
  "Himno: 538 Hoy es dia de reposo",
  "Himno: 539 Oh dia delicioso",
  "Himno: 540 Ya asoma el sol brillante",
  "Himno: 541 Señor reposamos",
  "Himno: 542 Amo tu sabado",
  "Himno: 543 No te olvides nunca del dia del Señor",
  "Himno: 544 Hoy el sabado glorioso",
  "Himno: 545 Santo dia",
  "Himno: 546 Santo sabado bendito",
  "Himno: 547 Sabado es",
  "Himno: 548 Mi corazon se llena de alegria",
  "Himno: 549 Ya el fin se acerca",
  "Himno: 550 Dia santo del Señor",
  "Himno: 551 Embajador soy de mi Rey",
  "Himno: 552 Oh cuanto necesita",
  "Himno: 553 Os pusisteis a arar",
  "Himno: 554 Con cristo avanza hoy",
  "Himno: 555 Hoy gozoso medito",
  "Himno: 556 Yo quiero siempre brillar",
  "Himno: 557 Que estas haciendo por Cristo",
  "Himno: 558 Ama a tus projimos",
  "Himno: 559 No te de temor",
  "Himno: 560 Cristo esta buscando obreros",
  "Himno: 561 Oigo del Señor la voz llamando",
  "Himno: 562 Esparcid la luz de Cristo",
  "Himno: 563 Escuchad Jesus nos dice",
  "Himno: 564 Pronto la noche viene",
  "Himno: 565 Ve ve oh Sion",
  "Himno: 566 Centinelas del Maestro",
  "Himno: 567 Si en valles de peligros",
  "Himno: 568 Hay lugar en la amplia viña",
  "Himno: 569 Id y predicad el evangelio",
  "Himno: 570 Voluntario del Señor",
  "Himno: 571 La historia de Cristo contemos",
  "Himno: 572 Pescadores de hombres",
  "Himno: 573 Te envio a ti",
  "Himno: 574 Testimonio",
  "Himno: 575 Tocad trompeta ya",
  "Himno: 576 Proclamo hoy que soy cristiano",
  "Himno: 577 Yo quiero trabajar",
  "Himno: 578 El pueblo que conoce a su Dios",
  "Himno: 579 La fuente veo",
  "Himno: 580 Las aguas del bautismo",
  "Himno: 581 El pan de vida soy",
  "Himno: 582 Hoy venimos cual hermanos",
  "Himno: 583 La cena de la comunion",
  "Himno: 584 Amemonos hermanos",
  "Himno: 585 De rodillas partimos hoy el pan",
  "Himno: 586 En memoria de mi",
  "Himno: 587 Te dedicamos oh Señor",
  "Himno: 588 Ven alma que lloras",
  "Himno: 589 Perfecto amor",
  "Himno: 590 Guia a ti Señor",
  "Himno: 591 Todo es bello en el hogar",
  "Himno: 592 Si Dios esta feliz hogar",
  "Himno: 593 Hogar de mis recuerdos",
  "Himno: 594 Señor gracias por mi hogar",
  "Himno: 595 Feliz hogar",
  "Himno: 596 Edificamos familias",
  "Himno: 597 Oracion por un niño",
  "Himno: 598 Cristo yo te seguire",
  "Himno: 599 En este bello dia",
  "Himno: 600 Cuando venga Jesucristo",
  "Himno: 601 Cuando leo en la Biblia",
  "Himno: 602 Es el amor divino",
  "Himno: 603 Yo temprano busco a Cristo",
  "Himno: 604 Bellas las manitas son",
  "Himno: 605 Jesus tiene tiempo",
  "Himno: 606 Llama Jesus el Buen Pastor",
  "Himno: 607 Nitido rayo por Cristo",
  "Himno: 608 Corazones siempre alegres",
  "Himno: 609 Oh jovenes venid",
  "Himno: 610 Escuchamos tu llamada",
  "Himno: 611 Oh juventud del Rey",
  "Himno: 612 Jesus te necesita hoy",
  "Himno: 613 Hoy nos toca trabajar",
  "Himno: 614 Amenes",
];
const titulos2 = [
  "Himno 001 - Cantad Alegres",
  "Himno 004 - Alabadle",
  "Himno 006 - De mi Amante Salvador",
  "Himno 019 - Loásmote oh Dios",
  "Himno 020 - Ved a Cristo",
  "Himno 028 - Tu pueblo jubiloso",
  "Himno 031 - Del culto el tiempo llega",
  "Himno 036 - Dios nos guarde en su divina luz",
  "Himno 038 - Por la mañana",
  "Himno 057 - Jehová está en su santo templo",
  "Himno 062 - Oh amor de Dios",
  "Himno 063 - Mi Dios me ama",
  "Himno 077 - Yo canto el poder de Dios",
  "Himno 080 - Sabes cuántos",
  "Himno 083 - Al mundo paz",
  "Himno 096 - En el Monte Calvario",
  "Himno 100 - Jesús Resucitado",
  "Himno 102 - La Tumba le encerró",
  "Himno 104 - Cristo ha resucitado",
  "Himno 109 - Amigo fiel es Cristo",
  "Himno 120 - Fija tus ojos en Cristo",
  "Himno 127 - Como Jesús no hay otro amigo",
  "Himno 129 - Canto el gram amor",
  "Himno 131 - En Cristo hallo amigo",
  "Himno 133 - Cuando estés cansado y abatido",
  "Himno 141 - A Dios sea la gloria",
  "Himno 161 - Amanece ya la mañana de oro",
  "Himno 164 - Abre tu corazón",
  "Himno 165 - En presencia estar de Cristo",
  "Himno 170 - Jesús pronto volverá",
  "Himno 172 - El Rey que viene",
  "Himno 173 - Vendrá el Señor",
  "Himno 176 - Cuando suene la trompeta",
  "Himno 178 - La segunda venida de Cristo",
  "Himno 179 - Has oído el mensaje",
  "Himno 185 - Hay un mundo feliz más allá",
  "Himno 187 - Santo espíritu de Cristo",
  "Himno 232 - Con sin igual amor",
  "Himno 249 - Todas las promesas",
  "Himno 254 - Oh cuando dulce es fiar en Cristo",
  "Himno 259 - Que mi vida entera este",
  "Himno 262 - Tal como soy de pecador",
  "Himno 264 - Padre a tus pies me postro",
  "Himno 265 - Yo te seguiré oh Cristo",
  "Himno 267 - Mi espíritu, alma y cuerpo",
  "Himno 270 - Anhelo ser limpio",
  "Himno 277 - Yo me rindo a Ti",
  "Himno 278 - Al contemplarte mi Salvador",
  "Himno 334 - Hay gozo en mi alma hoy",
  "Himno 335 - Dulce comunión",
  "Himno 350 - Marcharé en la divina luz",
  "Himno 361 - Esparcid la luz de Cristo",
  "Himno 377 - No te de temor",
  "Himno 389 - El camino es escabroso",
  "Himno 396 - Meditar en Jesús",
  "Himno 404 - Prefiero a mi Cristo",
  "Himno 406 - Más de Jesús",
  "Himno 408 - Más cerca oh Dios de ti",
  "Himno 413 - Habla Señor a mi alma",
  "Himno 418 - Siempre el Salvador conmigo",
  "Himno 424 - Nunca desmayes",
  "Himno 438 - Iglesia de Cristo",
  "Himno 439 - En tu Nombre comenzamos",
  "Himno 441 - Oigo del Señor la voz llamándote",
  "Himno 450 - Hay un lugar en la amplia viña",
  "Himno 452 - Esuchamos tu llamado",
  "Himno 455 - Hoy nos toca trabajar",
  "Himno 460 - Corazones siempre alegres",
  "Himno 463 - En las aguas de la muerte",
  "Himno 472 - Día santo del Señor",
  "Himno 475 - Señor reposamos",
  "Himno 485 - Traían en silencio",
  "Himno 487 - Suenen las palabras",
  "Himno 493 - Día grande viene",
  "Himno 496 - Jerusalén mi amado hogar",
  "Himno 500 - Aunque en esta vida",
  "Himno 503 - Las riveras de dicha inmortal",
  "Himno 509 - Todo es bello en el hogar",
  "Himno 516 - Cuando venga Jesucristo",
];

const titulos3 = [
  "001 - Alegre Voy Cantando  Corito Adventista Letra",
  "002 - Por Nuestro Señor  Corito Adventista Letra",
  "003 - Pasando Mi Calor  Corito Adventista Letra",
  "004 - Quedate Señor  Corito Adventista Letra",
  "005 - Gozandome Yo Voy  Corito Adventista Letra",
  "006 - No Me Siento Solo  Corito Adventista Letra",
  "007 - Solo El Poder De Dios  Corito Adventista Letra",
  "008 - Yo Tengo Gozo  Corito Adventista Letra",
  "009 - Un Palacio Tengo  Corito Adventista Letra",
  "010 - Lampara Es A Mis Pies Tu Palabra  Corito Adventista",
  "011 - Puedes Confiar En El Señor  Corito Adventista",
  "012 - Cristo Nos Pide Que Subamos Mas  Corito Adventista",
  "013 - Aguas Frescas  Corito Adventista",
  "014 - Joven Te Llama  Corito Adventista",
  "015 - En Rumbo Voy  Corito Adventista",
  "016 - Mira Que Te Mando  Corito Adventista",
  "017 - En Mi Alma Suena Un Cantar  Corito Adventista",
  "018 - Demos Gracias al Señor  Corito Adventista",
  "019 - He Decidido Seguir A Cristo  Corito Adventista",
  "020 - Alelu Aleluya  Corito Adventista",
  "021 - No Importa De Donde Tu Vengas  Corito Adventista",
  "022 - Cada Dia Con Cristo  Corito Adventista",
  "023 - Sonreid El Rostro Iluminad  Corito Adventista",
  "024 - Caminando  Corito Adventista",
  "025 - Perder Los Bienes Es Mucho  Corito Adventista",
  "026 - Felicidad  Corito Adventista",
  "027 - Que Bonito Es  Corito Adventista",
  "028 - Pescadores Yo Os Haré  Corito Adventista",
  "029 - Si Tu Copa Rebosa De Amor  Corito Adventista",
  "030 - Fija Tus Ojos En Cristo  Pista",
  "031 - Con Cristo En Tu Barco  Corito Adventista",
  "032 - Hablemos de Cristo  Corito Letra",
  "033 - Voy Por El Mar  Corito Letra",
  "034 - Amigo Amas tu a Cristo  Corito Adventista",
  "035 - Marchad Oh Juventud  Corito Adventista",
  "036 - Quiero canta una linda canción",
  "037 - Ven Oh Ven  Corito Adventista",
  "038 - Hablando con Jesús  Corito Adventista",
];

const titulos4 = [
  "001 - Versión 1 - Himno de Aventureros",
  "002 - Versión 2 - Himno de Aventureros",
  "003 - Versión 1 - Himno de Conquistadores",
  "004 - Versión 2 - Himno de conquistadores",
  "005 - Versión 1 - Himno de Guías Mayores",
  "006 - Versión 2 - Himno de Guías Mayores",
  "007 - Versión 3 - Himno de Guías Mayores",
];

const titulos5 = [
  "001 - Himno Nacional de España",
  "002 - Himno Nacional de México",
  "003 - Himno Nacional de Guatemala",
  "004 - Himno Nacional de El Salvador",
  "005 - Himno Nacional de Honduras",
  "006 - Himno Nacional de Nicaragua",
  "007 - Versión 1 - Himno Nacional de Costa Rica",
  "008 - Versión 2 - Himno Nacional de Costa Rica",
  "009 - Himno Nacional de Panamá",
  "010 - Himno Nacional de Colombia",
  "011 - Himno Nacional de Ecuador",
  "012 - Himno Nacional de Perú",
  "013 - Himno Nacional de Bolivia",
  "014 - Himno Nacional de Chile",
  "015 - Himno Nacional de Argentina",
  "016 - Himno Nacional de Uruguay",
  "017 - Himno Nacional de Paraguay",
  "018 - Himno Nacional de Venezuela",
  "019 - Himno Nacional de Puerto Rico",
  "020 - Himno Nacional de República Dominicana",
  "021 - Himno Nacional de Cuba",
  "022 - Himno Nacional de Guinea Ecuatorial",
];

const tituloMusicaParaOrarDeFondo = [
  "001 - INSTRUMENTAL WORSHIP  YESHUA  Preaching, Reflection, Devotional, Meditation  WORSHIP",
  "002 - 1 HORA - INSTRUMENTAL PARA ORAR",
  "003 - Adoración Instrumental  Paz Espiritual  Descansa En Dios",
  "004 - 1 Hora de himnos adventistas en Piano  1 Hour adventist hymns on piano",
  "005 - 1 Hora de Himnos Adventistas en piano V2  1 Hour adventist hymns on piano  V2",
];

const tituloHimnosPianoPista = [
  "Himno 003 - Santo, Santo, Santo",
  "Himno 004 - Alabadle",
  "Himno 009 - En Sion Jesús hoy reina",
  "Himno 010 - Engrandecido sea Dios",
  "Himno 019 - Loamoste oh Dios",
  "Himno 052 - Oh, Dios, que oyes cada oración",
  "Himno 056 - Gloria sea al Padre",
  "Himno 070 - Santo, Santo, Santo",
  "Himno 129 - Canto el gran amor",
  "Himno 131 - En Cristo hallo amigo",
  "Himno 133 - Cuando estés cansado y abatido",
  "Himno 158 - Dad gloria al cordero Rey",
  "Himno 187 - Santo espíritu de Cristo",
  "Himno 190 - Dios nos ha dado promesa",
  "Himno 222 - Tan triste y tan lejos de Dios",
  "Himno 242 - Eterna Roca es mi Jesús",
  "Himno 248 - Bajo sus alas",
  "Himno 254 - Oh, cuán dulce es fiar en Cristo",
  "Himno 259 - Que mi vida entera este",
  "Himno 264 - Padre, a tus pies me postro",
  "Himno 265 - Yo te seguiré",
  "Himno 266 - Dejo el mundo",
  "Himno 269 - Tuyo soy, Jesús",
  "Himno 270 - Anhelo ser limpio",
  "Himno 290 - Quieres ser salvo de toda maldad",
  "Himno 293 - Que me pueda dar perdón",
  "Himno 294 - Comprado con sangre por Cristo",
  "Himno 306 - Entonad un himno",
  "Himno 323 - En Jesucristo mártir de paz",
  "Himno 378 - Firmes y adelantes",
  "Himno 458 - Yo tengo gozo",
  "Himno 472 - Día santo del Señor",
];

const tituloHimnosInfantiles = [
  "Himno 001 - Las trompetas toquen",
  "Himno 002 - Alabemos al Señor",
  "Himno 003 - Canto a mi Jesús",
  "Himno 004 - Cantemos hoy al Señor",
  "Himno 005 - Tengo manos",
  "Himno 006 - Demos gracias al Señor",
  "Himno 007 - Oye mi oración",
  "Himno 008 - Siempre estoy feliz",
  "Himno 009 - Todo el día soy feliz",
  "Himno 010 - Amo al Señor",
  "Himno 011 - Amo a Cristo",
  "Himno 012 - Oh, cuánto amo a Cristo",
  "Himno 013 - Nítido rayo por Cristo",
  "Himno 014 - Te amo mi Señor Jesús",
  "Himno 015 - Yo lo amo tanto",
  "Himno 016 - La canción del tic tac",
  "Himno 017 - Contento estoy que viene hoy",
  "Himno 018 - Buenos días",
  "Himno 019 - Sean bienvenidos",
  "Himno 020 - Oración por poder",
  "Himno 021 - Puedo orar",
  "Himno 022 - Canto para orar",
  "Himno 023 - Oh Dios, oye mi oración",
  "Himno 024 - Contento estoy que has venido",
  "Himno 025 - Dios ama al dador feliz",
  "Himno 026 - Traigo mi ofrenda",
  "Himno 027 - Al Señor traigo mi ofrenda",
  "Himno 028 - Unidos vamos a caminar",
  "Himno 029 - Te digo adiós",
  "Himno 030 - Las clases terminaron",
  "Himno 031 - Oigan las campanas",
  "Himno 032 - Me gusta ir a la iglesia",
  "Himno 033 - Hacia la iglesia voy",
  "Himno 034 - Voy a la iglesia",
  "Himno 035 - ¿Qué hace un bebé",
  "Himno 036 - El predicador",
  "Himno 037 - Entrega tu corazón",
  "Himno 038 - Me entrego a Jesús",
  "Himno 039 - Quiero ser como Jesús",
  "Himno 040 - Dios me ayuda a elegir",
  "Himno 041 - Alabemos a Jesús",
  "Himno 042 - Siempre yo hablo con Jesús",
  "Himno 043 - ¡Ora!",
  "Himno 044 - Puedo orar a Jesús",
  "Himno 045 - Mi mejor amigo es Cristo",
  "Himno 046 - Jesús me cuida",
  "Himno 047 - Sé que Jesús me ama",
  "Himno 048 - Sé que tu me amas Padre Dios",
  "Himno 049 - Oh, Dios es amor",
  "Himno 050 - Dios me cuida",
  "Himno 051 - Jesús sonríe y perdona",
  "Himno 052 - Cristo nunca falla",
  "Himno 053 - Pajaritos al cantar",
  "Himno 054 - Jesús siempre cuidará bien de ti",
  "Himno 055 - Jesús me quiere a mí",
  "Himno 056 - Mi Jesús es maravilloso",
  "Himno 057 - Maravilloso Jesús",
  "Himno 058 - Yo canto muy alegre",
  "Himno 059 - Mira al mundo",
  "Himno 060 - La creación",
  "Himno 061 - La semillita",
  "Himno 062 - El gran mar azul",
  "Himno 063 - Ángeles Dios envió",
  "Himno 064 - Cristo manda a su ángel",
  "Himno 065 - Un ángel Dios envía",
  "Himno 066 - Ángeles van cuidandome",
  "Himno 067 - Ángeles",
  "Himno 068 - Un ángel bajó",
  "Himno 069 - El buen pastor",
  "Himno 070 - Biblia",
  "Himno 071 - Corre a Jesús",
  "Himno 072 - Tierno corderito",
  "Himno 073 - Las mariposas",
  "Himno 074 - Los colores",
  "Himno 075 - Vamos junto a Jesús",
  "Himno 076 - Los niños necesitan un Salvador",
  "Himno 077 - Animales en el cielo",
  "Himno 078 - Dios nos prepara",
  "Himno 079 - Dios hizo",
  "Himno 080 - ¿Quien esta en el arca",
  "Himno 081 - Un gran barco hizo Noé",
  "Himno 082 - La canción del cuervo",
  "Himno 083 - Panes y peces",
  "Himno 084 - Naamán en el río",
  "Himno 085 - Enoc caminó con Dios",
  "Himno 086 - David era un niñito",
  "Himno 087 - Un buen niño fue Jesús",
  "Himno 088 - El regalo de Dios",
  "Himno 089 - Llegamos a Belén",
  "Himno 090 - Un día muy feliz",
  "Himno 091 - María amaba a Jesús",
  "Himno 092 - Clip, clop",
  "Himno 093 - Ángeles cantaron",
  "Himno 094 - Brilla estrellita",
  "Himno 095 - Navidad",
  "Himno 096 - El niño ha nacido",
  "Himno 097 - Gracias doy por Cristo",
  "Himno 098 - Buen amigo de Jesús seré",
  "Himno 099 - Mi amigo",
  "Himno 100 - Voy a saludar",
  "Himno 101 - Mi hogar será feliz",
  "Himno 102 - La iglesia",
  "Himno 103 - Una buena acción",
  "Himno 104 - Cuiden unos a otros",
  "Himno 105 - Hagamos el bien",
  "Himno 106 - Siempre hagamos el bien",
  "Himno 107 - El martillo de Noé",
  "Himno 108 - Obediente",
  "Himno 109 - Satanás es malo",
  "Himno 110 - Compartiendo",
  "Himno 111 - Quiero alegrar a mi Jesús",
  "Himno 112 - Dadivoso",
  "Himno 113 - Los niñitos de Cristo",
  "Himno 114 - Voy a ayudar",
  "Himno 115 - Seré un ayudante",
  "Himno 116 - Me gusta ayudar",
  "Himno 117 - Muchas cosas puedo hacer",
  "Himno 118 - Entregándome a Jesús",
  "Himno 119 - Bendecido",
  "Himno 120 - Mis manos le daré",
  "Himno 121 - Mi Dios siempre quiere",
  "Himno 122 - Somos sus manos",
  "Himno 123 - Tac, tac, tac",
  "Himno 124 - Labios bondadosos",
  "Himno 125 - Compartamos buenas nuevas",
  "Himno 126 - Dios es todo amor",
  "Himno 127 - Dios todo lo hizo bueno",
  "Himno 128 - Cantaré la grandeza de tu amor",
  "Himno 129 - Ámense los unos a los otros",
  "Himno 130 - Sean bondadosos unos con otros",
  "Himno 131 - Vamos a la casa de Dios",
  "Himno 132 - Hagamos bien a todos",
  "Himno 133 - El joven Samuel",
  "Himno 134 - Mi Dios les dará",
  "Himno 135 - Siempre hagan el bien",
  "Himno 136 - Que goces de buena salud",
  "Himno 137 - Encontré mi oveja",
  "Himno 138 - Cuánto te amo Señor",
  "Himno 139 - Jesús era obediente",
  "Himno 140 - Dios es amor",
  "Himno 141 - Canten al Señor",
  "Himno 142 - Obedezcan a sus padres",
  "Himno 143 - Danien oraba tres veces",
  "Himno 144 - Yo estoy contigo",
  "Himno 145 - Juntos por la fe",
  "Himno 146 - Servir con amor",
  "Himno 147 - Dad gracias al Señor",
  "Himno 148 - Te comportas fielmente",
  "Himno 149 - Hablen sus maravillas",
  "Himno 150 - Con amor eterno",
];

const tituloHimnosAntiguos = [
  "Himno 001 - Cantad alegres al Señor",
  "Himno 002 - Da gloria al Señor",
  "Himno 003 - ¡Santo! ¡Santo! ¡Santo!",
  "Himno 004 - ¡Alabadle!",
  "Himno 005 - A nuestro Padre Dios",
  "Himno 006 - De mi amante Salvador",
  "Himno 007 - Venid, con cánticos venid",
  "Himno 008 - Aquí reunidos",
  "Himno 009 - En Sion Jesús hoy reina",
  "Himno 010 - Engrandecido sea Dios",
  "Himno 011 - Unidos en espíritu",
  "Himno 012 - ¡Tu nombre es dulce, buen Jesús!",
  "Himno 013 - Oh Dios, mi soberano Rey",
  "Himno 014 - Oye la voz, Señor",
  "Himno 015 - En espíritu unidos",
  "Himno 016 - Alza tu canto",
  "Himno 017 - A Cristo coronad",
  "Himno 018 - ¡Suenen dulces himnos!",
  "Himno 019 - Loámoste, ¡oh Dios!",
  "Himno 020 - Ved a Cristo",
  "Himno 021 - Cristo, Señor",
  "Himno 022 - Alabanzas sin cesar",
  "Himno 023 - Oh Padre, eterno Dios",
  "Himno 024 - ¡Oh Dios, mi soberano Rey!",
  "Himno 025 - Ven a las aguas vivas, ven",
  "Himno 026 - Señor Jesús, supremo Rey",
  "Himno 027 - ¡Oh Pastor divino, escucha!",
  "Himno 028 - Tu pueblo jubiloso",
  "Himno 029 - Ven, oh Todopoderoso",
  "Himno 030 - Imploramos tu presencia",
  "Himno 031 - Del culto el tiempo llega",
  "Himno 032 - Despide hoy tu grey",
  "Himno 033 - Oh, Padre de la humanidad",
  "Himno 034 - Oh Señor, ven a bendecirnos",
  "Himno 035 - Después, Señor",
  "Himno 036 - Dios os guarde",
  "Himno 037 - Todos juntos tributemos",
  "Himno 038 - Por la mañana",
  "Himno 039 - Del alba al despuntar",
  "Himno 040 - Dulce es la canción",
  "Himno 041 - Las faenas terminadas",
  "Himno 042 - Condúceme, Maestro",
  "Himno 043 - Oh Dios, si he ofendido un corazón",
  "Himno 044 - Cristo, ya la noche cierra",
  "Himno 045 - Baja el sol",
  "Himno 046 - Guárdanos, oh Cristo",
  "Himno 047 - Nuestro sol se pone ya",
  "Himno 048 - Señor Jesús, el día ya se fue",
  "Himno 049 - En el curso de este día",
  "Himno 050 - Oyeme, Jesús divino",
  "Himno 051 - Despídenos con tu bendición",
  "Himno 052 - ¡Oh Dios, que oyes cada oración!",
  "Himno 053 - Padre, reunidos",
  "Himno 054 - Gloria demos al Padre",
  "Himno 055 - A Dios, el Padre celestial",
  "Himno 056 - Gloria sea al Padre",
  "Himno 057 - Jehová está en su santo templo",
  "Himno 058 - Jehová te bendiga",
  "Himno 059 - Jehová en el alto cielo",
  "Himno 060 - ¡Hosanna!",
  "Himno 061 - Grande es el amor divino",
  "Himno 062 - ¡Oh amor de Dios!",
  "Himno 063 - Mi Dios me ama",
  "Himno 064 - Hay anchura en su clemencia",
  "Himno 065 - Dios de luz y gloria excelsa",
  "Himno 066 - Omnisapiente Dios",
  "Himno 067 - Señor, mi Dios",
  "Himno 068 - Mi Creador, mi Rey",
  "Himno 069 - Al Rey adorad",
  "Himno 070 - Santo, Santo, Santo",
  "Himno 071 - Load al Padre",
  "Himno 072 - Eterno Dios, mi Creador",
  "Himno 073 - Padre, oh Padre, ven a guiarnos",
  "Himno 074 - A ti, glorioso Dios",
  "Himno 075 - Oh Dios eterno",
  "Himno 076 - ¡Cuán grande es Dios!",
  "Himno 077 - Yo canto el poder de Dios",
  "Himno 078 - El mundo es de mi Dios",
  "Himno 079 - Mirando al cielo",
  "Himno 080 - ¿Sabes cuántos¿",
  "Himno 081 - ¡Señor, yo te conozco!",
  "Himno 082 - Los heraldos celestiales",
  "Himno 083 - ¡Al mundo paz!",
  "Himno 084 - Se oye un canto en alta esfera",
  "Himno 085 - Venid, pastorcillos",
  "Himno 086 - Venid, pequeñuelos",
  "Himno 087 - Noche de paz",
  "Himno 088 - ¿Qué significa ese rumor¿",
  "Himno 089 - Los tiernos años",
  "Himno 090 - Hubo Uno que quiso",
  "Himno 091 - Al contemplar la excelsa cruz",
  "Himno 092 - Jamás podrá alguien separarnos",
  "Himno 093 - Sangró mi soberano Dios",
  "Himno 094 - Un día",
  "Himno 095 - Rostro divino",
  "Himno 096 - En el monte Calvario",
  "Himno 097 - Por fe contemplo al buen Jesús",
  "Himno 098 - Ved al divino Salvador",
  "Himno 099 - ¡Dulces momentos!",
  "Himno 100 - Jesús resucitado",
  "Himno 101 - El Señor resucitó",
  "Himno 102 - La tumba le encerró",
  "Himno 103 - Jesús por mí su vida dio",
  "Himno 104 - Cristo ha resucitado",
  "Himno 105 - ¿Le importará a Jesús¿",
  "Himno 106 - ¿Hay aquí quién nos ayude¿",
  "Himno 107 - Amor que no me dejarás",
  "Himno 108 - ¡Oh cuán dulce es la promesa!",
  "Himno 109 - Amigo fiel es Cristo",
  "Himno 110 - Ama el Pastor sus ovejas",
  "Himno 111 - Ni en la tierra",
  "Himno 112 - Dime la antigua historia",
  "Himno 113 - Como ovejas disfrutamos",
  "Himno 114 - Un buen amigo tengo yo",
  "Himno 115 - Hay un lugar do quiero estar",
  "Himno 116 - Hay quien vela",
  "Himno 117 - Aunque sean como grana",
  "Himno 118 - Dios tu tristeza entiende",
  "Himno 119 - Cristo es el mejor amigo",
  "Himno 120 - Fija tus ojos en Cristo",
  "Himno 121 - Por sobre el goce terrenal",
  "Himno 122 - Amoroso Salvador",
  "Himno 123 - Me dice el Salvador",
  "Himno 124 - La tierna voz del Salvador",
  "Himno 125 - Abrigadas y salvas en el redil",
  "Himno 126 - Ven a Cristo",
  "Himno 127 - Como Jesús no hay otro amigo",
  "Himno 128 - Huye cual ave",
  "Himno 129 - Canto el gran amor",
  "Himno 130 - Para mí, tan pecador",
  "Himno 131 - En Cristo hallo amigo",
  "Himno 132 - Las maravillas del amor",
  "Himno 133 - Cuando estés cansado y abatido",
  "Himno 134 - Dios tanto amó al mundo",
  "Himno 135 - Es Jesucristo la vida, la luz",
  "Himno 136 - Al fin conocí más de cerca a Jesús",
  "Himno 137 - Cual mirra fragante",
  "Himno 138 - Dominará Jesús",
  "Himno 139 - No hay un nombre en esta tierra",
  "Himno 140 - Venid, cantad a nuestro Señor",
  "Himno 141 - A Dios sea gloria",
  "Himno 142 - Si acaso te dejo, Jesús",
  "Himno 143 - Desde el glorioso trono",
  "Himno 144 - Te quiero, te quiero",
  "Himno 145 - De Jesús el nombre invoca",
  "Himno 146 - Junto a la cruz",
  "Himno 147 - ¡Oh qué Salvador!",
  "Himno 148 - Digno eres, oh Jesús",
  "Himno 149 - A Cristo doy mi canto",
  "Himno 150 - Cristo, si gozo al pecho da",
  "Himno 151 - ¡Cuán dulce el nombre de Jesús!",
  "Himno 152 - Hay una fuente sin igual",
  "Himno 153 - Oh buen Señor, velada está",
  "Himno 154 - Con acentos de alegría",
  "Himno 155 - Cristo, eres justo Rey",
  "Himno 156 - Venid, cantad, de gozo en plenitud",
  "Himno 157 - Jesús bendito, Salvador",
  "Himno 158 - Dad gloria al Cordero Rey",
  "Himno 159 - ¡Oh si pudiera yo contar!",
  "Himno 160 - Tiempo es de que en gloria venga Cristo",
  "Himno 161 - Amanece ya la mañana de oro",
  "Himno 162 - Viene otra vez nuestro Salvador",
  "Himno 163 - ¡Oh! cuán gratas las nuevas",
  "Himno 164 - Abre tu corazón",
  "Himno 165 - En presencia estar de Cristo",
  "Himno 166 - Hijo del reino",
  "Himno 167 - Guarda, dinos si la noche",
  "Himno 168 - El amanecer del día",
  "Himno 169 - Cristo viene",
  "Himno 170 - Jesús pronto volverá",
  "Himno 171 - Yo espero la mañana",
  "Himno 172 - El Rey que viene",
  "Himno 173 - ¡Vendrá el Señor!",
  "Himno 174 - Siervos de Dios, la trompeta tocad",
  "Himno 175 - ¿Quién en deslumbrante gloria¿",
  "Himno 176 - Cuando suene la trompeta",
  "Himno 177 - Se pone el fulgurante sol",
  "Himno 178 - La segunda venida de Cristo",
  "Himno 179 - ¿Has oído el mensaje¿",
  "Himno 180 - ¿Será al albor¿",
  "Himno 181 - Estando a orillas del Jordán",
  "Himno 182 - Cantaré, cantaré",
  "Himno 183 - Promesa dulce",
  "Himno 184 - Por mil arpas",
  "Himno 185 - Hay un mundo feliz más allá",
  "Himno 186 - Bellas canciones perennes",
  "Himno 187 - Santo Espíritu de Cristo",
  "Himno 188 - La nueva proclamad",
  "Himno 189 - Danos el fuego",
  "Himno 190 - Dios nos ha dado promesa",
  "Himno 191 - Ven, Espíritu eterno",
  "Himno 192 - Abre mis ojos a la luz",
  "Himno 193 - Alumbrante Espíritu",
  "Himno 194 - Desciende, Espíritu de amor",
  "Himno 195 - Ven a nuestras almas",
  "Himno 196 - ¡Cuán firme cimiento!",
  "Himno 197 - Dadme la Biblia",
  "Himno 198 - ¡Santa Biblia!",
  "Himno 199 - Oh, cantádmelas otra vez",
  "Himno 200 - Padre, tu Palabra es mi delicia",
  "Himno 201 - La Biblia nos habla de Cristo",
  "Himno 202 - En el mundo turbulento",
  "Himno 203 - Hoy llega a mis oídos",
  "Himno 204 - Ven, pródigo perdido, ven",
  "Himno 205 - A tu puerta Cristo está",
  "Himno 206 - Tierno y amante, Jesús nos invita",
  "Himno 207 - Cristo, el Pastor divino",
  "Himno 208 - ¿Te sientes casi resuelto¿",
  "Himno 209 - Mientras Jesús te llama",
  "Himno 210 - Con voz benigna te llama Jesús",
  "Himno 211 - Allá la puerta franca está",
  "Himno 212 - Francas las puertas encontrarán",
  "Himno 213 - Bienvenida da Jesús",
  "Himno 214 - A Jesucristo ven sin tardar",
  "Himno 215 - En el hogar do nunca habrá",
  "Himno 216 - ¿Temes que en la lucha¿",
  "Himno 217 - Oí la voz del buen Jesús",
  "Himno 218 - Por mí intercede",
  "Himno 219 - Oí la voz del Salvador",
  "Himno 220 - Del trono celestial",
  "Himno 221 - Dios al pródigo llama",
  "Himno 222 - Tan triste y tan lejos de Dios",
  "Himno 223 - En extraña tierra",
  "Himno 224 - Preste oídos el humano",
  "Himno 225 - Venid a mí los tristes",
  "Himno 226 - Yo escucho, buen Jesús",
  "Himno 227 - Ven a la fuente de vida",
  "Himno 228 - Un hombre llegóse de noche a Jesús",
  "Himno 229 - De Dios vagaba lejos yo",
  "Himno 230 - Cuando vengas",
  "Himno 231 - Te ruego, oh Dios",
  "Himno 232 - ¡Oh mi Dios!",
  "Himno 233 - En todo recio vendaval",
  "Himno 234 - Yo confío en Jesús",
  "Himno 235 - Cuando sopla airada la tempestad",
  "Himno 236 - Roca de la eternidad",
  "Himno 237 - Te quiero, mi Señor",
  "Himno 238 - Al andar con Jesús",
  "Himno 239 - A cualquiera parte",
  "Himno 240 - Mi fe contempla a ti",
  "Himno 241 - Jesús es mi luz",
  "Himno 242 - Eterna Roca es mi Jesús",
  "Himno 243 - Confío en Jesucristo",
  "Himno 244 - Cuando te quiero",
  "Himno 245 - ¡Oh! salvo en la Roca",
  "Himno 246 - Señor, en ti confío",
  "Himno 247 - Cristo me ayuda por él a vivir",
  "Himno 248 - Bajo sus alas",
  "Himno 249 - Todas las promesas",
  "Himno 250 - ¡Oh! tenga yo la ardiente fe",
  "Himno 251 - Oh peregrino ignoto, ven",
  "Himno 252 - Cuando en la lucha",
  "Himno 253 - ¿Qué me importan¿",
  "Himno 254 - ¡Oh, cuán dulce es fiar en Cristo!",
  "Himno 255 - Castillo fuerte es nuestro Dios",
  "Himno 256 - Por la justicia de Jesús",
  "Himno 257 - Padre, yo vengo a ti",
  "Himno 258 - A la cruz de Cristo voy",
  "Himno 259 - Que mi vida entera esté",
  "Himno 260 - Cúmplase, oh Cristo, tu voluntad",
  "Himno 261 - Tuyo quiero ser",
  "Himno 262 - Tal como soy",
  "Himno 263 - ¿Deberá Jesús la cruz llevar¿",
  "Himno 264 - Padre, a tus pies me postro",
  "Himno 265 - Yo te seguiré",
  "Himno 266 - Dejo el mundo",
  "Himno 267 - Mi espíritu, alma y cuerpo",
  "Himno 268 - Señor, Dios poderoso",
  "Himno 269 - Tuyo soy, Jesús",
  "Himno 270 - Anhelo ser limpio",
  "Himno 271 - Oh Cristo, te adoro",
  "Himno 272 - Jesús, yo he prometido",
  "Himno 273 - Tú dejaste tu trono",
  "Himno 274 - De esclavitud",
  "Himno 275 - Junto a la cruz de Cristo",
  "Himno 276 - Mi amor y vida doy a ti",
  "Himno 277 - Salvador, a ti me rindo",
  "Himno 278 - Al contemplarte, mi Salvador",
  "Himno 279 - No yo, sino él",
  "Himno 280 - ¡Oh Jesús!, mi cruz levanto",
  "Himno 281 - Fuente de la vida eterna",
  "Himno 282 - Entra en este corazón",
  "Himno 283 - Moro yo en las alturas",
  "Himno 284 - Rey de mi vida",
  "Himno 285 - Perdido, fui a mi Jesús",
  "Himno 286 - Andando en la luz de Dios",
  "Himno 287 - Perdido fue al buen Jesús",
  "Himno 288 - Los tesoros del mundo",
  "Himno 289 - Por fe en Cristo el Redentor",
  "Himno 290 - ¿Quieres ser salvo de toda maldad¿",
  "Himno 291 - Todos los que tengan sed",
  "Himno 292 - Al Calvario, solo, Jesús ascendió",
  "Himno 293 - ¿Qué me puede dar perdón¿",
  "Himno 294 - Comprado con sangre por Cristo",
  "Himno 295 - En Jesús por fe confío",
  "Himno 296 - Una es, Señor, mi petición",
  "Himno 297 - ¡Oh Jesús, Señor divino!",
  "Himno 298 - Hay vida en mirar",
  "Himno 299 - Lejos de mi Padre Dios",
  "Himno 300 - Ni fama, ni ciencia",
  "Himno 301 - Al cielo voy",
  "Himno 302 - ¿Quién es aquel que viene¿",
  "Himno 303 - Cristo es mi amante Salvador",
  "Himno 304 - Mi Redentor, el Rey de gloria",
  "Himno 305 - Cuando mi lucha toque a su final",
  "Himno 306 - Entonad un himno",
  "Himno 307 - Del Padre los bienes",
  "Himno 308 - En el seguro puerto",
  "Himno 309 - Si al vislumbrar en el mundo dichoso",
  "Himno 310 - Cuán grato es con amigos vernos",
  "Himno 311 - Solemne me es saber",
  "Himno 312 - ¡A la luz!",
  "Himno 313 - Más allá, en la excelsa patria",
  "Himno 314 - En la mansión de mi Señor",
  "Himno 315 - Allá sobre montes",
  "Himno 316 - Cuánto anhelo llegar",
  "Himno 317 - No está en la tierra mi hogar",
  "Himno 318 - Cuando aquí de mi vida",
  "Himno 319 - Un día yo he de faltar",
  "Himno 320 - Arrolladas las neblinas",
  "Himno 321 - Perfecta paz",
  "Himno 322 - Con gozo canto al Señor",
  "Himno 323 - En Jesucristo, mártir de paz",
  "Himno 324 - ¡Oh, buen Maestro, despierta!",
  "Himno 325 - Llenos de gozo",
  "Himno 326 - En Cristo feliz es mi alma",
  "Himno 327 - Salvo en los tiernos brazos",
  "Himno 328 - Precibe mi alma un son",
  "Himno 329 - Grato es contar la historia",
  "Himno 330 - ¡Feliz el día!",
  "Himno 331 - En el seno de mi alma",
  "Himno 332 - Con sin igual amor",
  "Himno 333 - Dicha grande",
  "Himno 334 - Gran gozo hay en mi alma hoy",
  "Himno 335 - Dulce comunión",
  "Himno 336 - Mi Redentor es Cristo",
  "Himno 337 - Cristo, tú prometes",
  "Himno 338 - ¡Silencio! ¡Silencio!",
  "Himno 339 - Primero oré por luz",
  "Himno 340 - Bendiciones ricas",
  "Himno 341 - Aparte del mundo",
  "Himno 342 - Ser puros y santos",
  "Himno 343 - A mí venid",
  "Himno 344 - Dulce oración",
  "Himno 345 - Jesús, te necesito",
  "Himno 346 - Cuando lleguen pruebas",
  "Himno 347 - Sol de mi ser",
  "Himno 348 - Quiero, Jesús, contigo andar",
  "Himno 349 - ¡Oh, qué amigo nos es Cristo!",
  "Himno 350 - Marcharé en la divina luz",
  "Himno 351 - Yo quiero trabajar",
  "Himno 352 - Levántate, cristiano",
  "Himno 353 - Centinelas del Maestro",
  "Himno 354 - ¡Oh! cuánto necesita",
  "Himno 355 - ¿Os pusisteis a arar¿",
  "Himno 356 - Despliegue el cristiano su santa bandera",
  "Himno 357 - Soy peregrino aquí",
  "Himno 358 - ¡El salvavidas!",
  "Himno 359 - ¡Trabajad! ¡Trabajad!",
  "Himno 360 - Cerca un alma agobiada está",
  "Himno 361 - Esparcid la luz de Cristo",
  "Himno 362 - Un día más por Cristo",
  "Himno 363 - ¿Quién está por Cristo¿",
  "Himno 364 - Hoy gozoso medito",
  "Himno 365 - Solitarios corazones",
  "Himno 366 - Tocad trompeta ya",
  "Himno 367 - ¿Qué estás haciendo por Cristo¿",
  "Himno 368 - Ama a tus prójimos",
  "Himno 369 - Vivo por Cristo",
  "Himno 370 - Muy constante es Jesús",
  "Himno 371 - Dame la fe de mi Jesús",
  "Himno 372 - Tentado, no cedas",
  "Himno 373 - Nunca estéis desanimados",
  "Himno 374 - Los hijos del reino",
  "Himno 375 - ¡Oh Rey eterno, avanza!",
  "Himno 376 - ¡Oh, hermanos!",
  "Himno 377 - No te dé temor",
  "Himno 378 - ¡Firmes y adelante!",
  "Himno 379 - ¡De pie, de pie, cristianos!",
  "Himno 380 - Contendamos siempre por nuestra fe",
  "Himno 381 - ¡Despertad, despertad, oh cristianos!",
  "Himno 382 - Aquí mis días ya se van",
  "Himno 383 - Sale a la lucha el Salvador",
  "Himno 384 - Voy al cielo",
  "Himno 385 - Los que aman al Señor",
  "Himno 386 - Peregrinos en desierto",
  "Himno 387 - La senda ancha dejaré",
  "Himno 388 - Soy peregrino aquí",
  "Himno 389 - El camino es escabroso",
  "Himno 390 - Busquemos la patria",
  "Himno 391 - ¿Muy lejos el hogar está¿",
  "Himno 392 - Hay tan sólo dos sendas",
  "Himno 393 - Aprendí el gran secreto",
  "Himno 394 - Puedo oír tu voz llamando",
  "Himno 395 - La cruz no es mayor",
  "Himno 396 - Meditar en Jesús",
  "Himno 397 - A los pies de Jesucristo",
  "Himno 398 - Sólo anhelo, Cristo amado",
  "Himno 399 - Cristo está conmigo",
  "Himno 400 - Ando con Cristo",
  "Himno 401 - Concédeme, Jesús, poder",
  "Himno 402 - Hoy me llama el mundo en vano",
  "Himno 403 - Hay un lugar do quiero estar",
  "Himno 404 - Prefiero mi Cristo",
  "Himno 405 - ¡Oh! ¡Maestro y Salvador!",
  "Himno 406 - Más de Jesús",
  "Himno 407 - No me pases",
  "Himno 408 - Mas cerca, oh Dios, de ti",
  "Himno 409 - ¡Oh! quién pudiera andar con Dios",
  "Himno 410 - Mi mano ten",
  "Himno 411 - Más santidad dame",
  "Himno 412 - Salvador, mi bien eterno",
  "Himno 413 - Habla, Señor, a mi alma",
  "Himno 414 - Cristo, tú eres para mí",
  "Himno 415 - Donde me guíe, seguiré",
  "Himno 416 - Cristo, mi piloto sé",
  "Himno 417 - En brazos del Maestro",
  "Himno 418 - ¡Siempre el Salvador conmigo!",
  "Himno 419 - Cerca, más cerca",
  "Himno 420 - Cariñoso Salvador",
  "Himno 421 - Nada puede ya faltarme",
  "Himno 422 - Divina Luz",
  "Himno 423 - Jesús me guía",
  "Himno 424 - Nunca desmayes",
  "Himno 425 - Cristo, tu voluntad",
  "Himno 426 - Alma mía, espera en tu Señor",
  "Himno 427 - ¿Oyes cómo Jesucristo¿",
  "Himno 428 - ¡Oh Jesús, Pastor divino!",
  "Himno 429 - Paso a paso Dios me guía",
  "Himno 430 - Si la fe me abandonare",
  "Himno 431 - Tengo en Dios un grande amor",
  "Himno 432 - Si la carga es pesada",
  "Himno 433 - Contigo quiero andar",
  "Himno 434 - Guíame, ¡oh Salvador!",
  "Himno 435 - ¡Cuán firme es de tu iglesia!",
  "Himno 436 - Sagrado es el amor",
  "Himno 437 - Oh Dios, escucha con bondad",
  "Himno 438 - Iglesia de Cristo",
  "Himno 439 - En tu nombre comenzamos",
  "Himno 440 - ¡Oh, cuánto me eres cara!",
  "Himno 441 - Oigo del Señor la voz llamando",
  "Himno 442 - En la montaña podrá no ser",
  "Himno 443 - Cristo está buscando obreros",
  "Himno 444 - Si en valles de peligros",
  "Himno 445 - Pronto la noche viene",
  "Himno 446 - De heladas codilleras",
  "Himno 447 - Escuchad, Jesús nos dice",
  "Himno 448 - ¡Ve, ve oh Sion!",
  "Himno 449 - ¡Señor!, la mies es mucha",
  "Himno 450 - Hay lugar en la amplia viña",
  "Himno 451 - La historia de Cristo contemos",
  "Himno 452 - Escuchamos tu llamada",
  "Himno 453 - Jesús está buscando voluntarios hoy",
  "Himno 454 - Honra al hombre de valor",
  "Himno 455 - Hoy nos toca trabajar",
  "Himno 456 - Habla a tu Dios de mañana",
  "Himno 457 - ¡Oh jóvenes, venid!",
  "Himno 458 - Yo tengo gozo",
  "Himno 459 - Voluntario del Señor",
  "Himno 460 - Corazones siempre alegres",
  "Himno 461 - La fuente veo",
  "Himno 462 - En lo profundo de la mar",
  "Himno 463 - En las aguas de la muerte",
  "Himno 464 - Las manos, Padre",
  "Himno 465 - Sábado santo",
  "Himno 466 - ¡Cuán dulce en este día!",
  "Himno 467 - Ya el fin se acerca",
  "Himno 468 - Hoy es día de reposo",
  "Himno 469 - Otros seis días de labor",
  "Himno 470 - Hoy el sábado glorioso",
  "Himno 471 - En sombras de la tarde",
  "Himno 472 - Día santo del Señor",
  "Himno 473 - ¡Oh día delicioso!",
  "Himno 474 - Oh, día del Señor",
  "Himno 475 - Señor, reposamos",
  "Himno 476 - Ya asoma el sol brillante",
  "Himno 477 - Santo día",
  "Himno 478 - Obediente a tu mandato",
  "Himno 479 - El pan de vida soy",
  "Himno 480 - Amoroso nos convidas",
  "Himno 481 - Espíritu de santidad",
  "Himno 482 - Amémonos, hermanos",
  "Himno 483 - Jesús invita hoy",
  "Himno 484 - Hoy venimos",
  "Himno 485 - Traían en silencio presentes al Señor",
  "Himno 486 - Al Cristo ved",
  "Himno 487 - Suenen las palabras",
  "Himno 488 - Predica tú",
  "Himno 489 - ¡Oh, dónde se hallará!",
  "Himno 490 - Jubilosas nuestras voces",
  "Himno 491 - Cuando pese nuestros hechos",
  "Himno 492 - Cuando junte Jesús las naciones",
  "Himno 493 - Día grande viene",
  "Himno 494 - No puede el mundo ser mi hogar",
  "Himno 495 - Hay un feliz Edén",
  "Himno 496 - Jerusalén, mi amado hogar",
  "Himno 497 - Jerusalén, la excelsa",
  "Himno 498 - Las montañas de Sion",
  "Himno 499 - De luz sin par es mi mansión",
  "Himno 500 - Aunque en esta vida",
  "Himno 501 - ¡Oh célica Jerusalén!",
  "Himno 502 - A veces oigo un himno",
  "Himno 503 - Las riberas de dicha inmortal",
  "Himno 504 - Del bello país he leído",
  "Himno 505 - ¿Nos veremos junto al río",
  "Himno 506 - En la tierra adonde iré",
  "Himno 507 - En la célica morada",
  "Himno 508 - Al bello hogar",
  "Himno 509 - Todo es bello",
  "Himno 510 - Hogar de mis recuerdos",
  "Himno 511 - Guía a ti, Señor",
  "Himno 512 - Perfecto amor",
  "Himno 513 - Cristo, yo te seguiré",
  "Himno 514 - De su trono, mi Jesús",
  "Himno 515 - En este bello día",
  "Himno 516 - Cuando venga Jesucristo",
  "Himno 517 - ¡Cuánto me alegra!",
  "Himno 518 - Cuando leo en la Biblia",
  "Himno 519 - Es el amor divino",
  "Himno 520 - Yo temprano busco a Cristo",
  "Himno 521 - Bellas las manitas son",
  "Himno 522 - Tu reino amo",
  "Himno 523 - ¡Oh santo Dios!",
  "Himno 524 - Ven, alma que lloras",
  "Himno 525 - No habrá más llanto allá",
  "Himno 526 - Llegaremos al hogar",
  "Himno 527 - ¿Para quién será el ay",
];

const tituloStream = [];

/**
 * 
 * 
 * <!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Visor PDF con Zoom</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    body {
      font-family: sans-serif;
      background: black;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }

    #controls {
      margin-bottom: 10px;
    }

    #controls button {
      padding: 5px 15px;
      font-size: 16px;
      margin: 0 5px;
      cursor: pointer;
    }

    #pdf-container {
      width: 90vw;
      height: 90vh;
      overflow-y: auto;
      background: black;
      padding: 10px;
      border-radius: 5px;
      box-shadow: 0 0 15px #000;
    }

    canvas {
      display: block;
      margin: 10px auto;
      border: 1px solid #ccc;
      background: white;
    }

    input[type="file"] {
      margin-bottom: 10px;
    }
  </style>
</head>
<body>

  <h2>📘 Visor de PDF</h2>

  <input type="file" id="upload-pdf" accept=".pdf" />

  <div id="controls">
    <button id="zoomIn">🔍 Aumentar</button>
    <button id="zoomOut">🔎 Reducir</button>
    <button id="resetZoom">🔄 Restablecer</button>
  </div>

  <div id="pdf-container"></div>

  <script>
    const input = document.getElementById("upload-pdf");
    const container = document.getElementById("pdf-container");

    let currentPDF = null;
    let currentScale = 1.0;

    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    function renderPDF(pdf) {
      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pdf.getPage(pageNum).then((page) => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const viewport = page.getViewport({ scale: currentScale });

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          page.render({ canvasContext: ctx, viewport: viewport });
          container.appendChild(canvas);
        });
      }
    }

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileReader = new FileReader();

      fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedarray).promise.then((pdf) => {
          currentPDF = pdf;
          currentScale = 1.0;
          renderPDF(pdf);
        });
      };

      fileReader.readAsArrayBuffer(file);
    });

    document.getElementById("zoomIn").addEventListener("click", () => {
      if (currentPDF) {
        currentScale += 0.1;
        renderPDF(currentPDF);
      }
    });

    document.getElementById("zoomOut").addEventListener("click", () => {
      if (currentPDF && currentScale > 0.2) {
        currentScale -= 0.1;
        renderPDF(currentPDF);
      }
    });

    document.getElementById("resetZoom").addEventListener("click", () => {
      if (currentPDF) {
        currentScale = 1.0;
        renderPDF(currentPDF);
      }
    });
  </script>
</body>
</html>

 */

// ========================================
// 🎨 CARRUSEL DE POSTS DE IGLESIAS
// ========================================

let carruselPosts = [];
let carruselIndexActual = 0;
let carruselPostsPorPagina = 3; // Por defecto

// Calcular cuántos posts mostrar según el ancho de pantalla
function calcularPostsPorPagina() {
  const ancho = window.innerWidth || document.documentElement.clientWidth;

  if (ancho >= 3200) {
    return 5;
  } else if (ancho >= 2560) {
    return 4;
  } else if (ancho >= 1920) {
    return 3;
  } else {
    return 2;
  }
}

// Cargar posts desde JSON
async function cargarCarruselPosts() {
  try {
    const response = await fetch(
      "https://proyectoja.github.io/carrusel-posts.json",
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("No se pudo cargar el carrusel");

    carruselPosts = await response.json();
    console.log(`[CARRUSEL] ✓ Cargados ${carruselPosts.length} posts`);
  } catch (error) {
    console.error("[CARRUSEL] Error al cargar posts:", error);
    carruselPosts = [];
  }
}

// Crear HTML del carrusel
function crearCarruselHTML() {
  const carruselHTML = `
    <div id="carrusel-posts-container">
      <div id="carrusel-posts-header">
        <h3>📸 Galería de Iglesias</h3>
        <div id="carrusel-posts-contador">Posts recibidos: ${carruselPosts.length}</div>
      </div>
      <div id="carrusel-posts-wrapper">
        <button class="carrusel-nav-btn" id="carrusel-prev-btn">‹</button>
        <div id="carrusel-posts-track"></div>
        <button class="carrusel-nav-btn" id="carrusel-next-btn">›</button>
      </div>
    </div>
  `;
  return carruselHTML;
}

// Renderizar posts visibles
function renderizarCarruselPosts() {
  const track = document.getElementById("carrusel-posts-track");
  if (!track) return;

  track.innerHTML = "";
  carruselPostsPorPagina = calcularPostsPorPagina();

  // Calcular posts visibles (con bucle)
  const totalPosts = carruselPosts.length;
  if (totalPosts === 0) {
    track.innerHTML =
      '<p style="color: white; text-align: center; grid-column: 1/-1;">No hay posts disponibles</p>';
    return;
  }

  for (let i = 0; i < carruselPostsPorPagina; i++) {
    const index = (carruselIndexActual + i) % totalPosts;
    const post = carruselPosts[index];

    const card = document.createElement("div");
    card.className = "carrusel-post-card";
    card.innerHTML = `
      <img src="${post.imagen}" alt="${
        post.iglesia
      }" class="carrusel-post-imagen" loading="lazy">
      <div class="carrusel-post-info">
        <h4 class="carrusel-post-iglesia">${post.iglesia}</h4>
        <p class="carrusel-post-pais">🌍 ${post.pais}</p>
        <p class="carrusel-post-fecha">📅 ${formatearFecha(
          post.fechaPublicada,
        )}</p>
        ${
          post.descripcion
            ? `<p class="carrusel-post-descripcion">${post.descripcion}</p>`
            : ""
        }
      </div>
    `;

    track.appendChild(card);
  }
}

// Formatear fecha
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { year: "numeric", month: "long", day: "numeric" };
  return fecha.toLocaleDateString("es-ES", opciones);
}

// Navegar al siguiente grupo
function carruselSiguiente() {
  if (carruselPosts.length === 0) return;
  carruselIndexActual =
    (carruselIndexActual + carruselPostsPorPagina) % carruselPosts.length;
  renderizarCarruselPosts();
}

// Navegar al anterior grupo
function carruselAnterior() {
  if (carruselPosts.length === 0) return;
  carruselIndexActual =
    (carruselIndexActual - carruselPostsPorPagina + carruselPosts.length) %
    carruselPosts.length;
  renderizarCarruselPosts();
}

// Inicializar carrusel en el contenedorHijo
async function inicializarCarrusel(contenedorHijo) {
  if (!contenedorHijo) return;

  await cargarCarruselPosts();

  // Agregar carrusel al INICIO del contenedorHijo
  contenedorHijo.insertAdjacentHTML("afterbegin", crearCarruselHTML());

  // Renderizar posts iniciales
  renderizarCarruselPosts();

  // Event listeners para botones
  const btnPrev = document.getElementById("carrusel-prev-btn");
  const btnNext = document.getElementById("carrusel-next-btn");

  if (btnPrev) btnPrev.addEventListener("click", carruselAnterior);
  if (btnNext) btnNext.addEventListener("click", carruselSiguiente);

  // Actualizar al cambiar tamaño de ventana
  window.addEventListener("resize", () => {
    const nuevosPostsPorPagina = calcularPostsPorPagina();
    if (nuevosPostsPorPagina !== carruselPostsPorPagina) {
      carruselIndexActual = 0; // Reset al redimensionar
      renderizarCarruselPosts();
    }
  });

  console.log("[CARRUSEL] ✅ Carrusel inicializado");
}

/*************************************************
 * ESTADO GLOBAL POWER POINT
 *************************************************/
window.powerPointState = {
  slides: [], // rutas a imágenes
  current: 0, // índice actual
  total: 0, // total de slides
  loaded: false, // hay presentación cargada
  aspect: "16:9", // relación de aspecto
  id: null, // id de la presentación
};

/*************************************************
 * REFERENCIAS DOM
 *************************************************/
const pptContainer = document.getElementById("contenedor-power-point");
const pptImage = document.getElementById("ppt-slide-actual");
const pptListContainer = document.getElementById("lista-presentacion");
const pptProgress = document.getElementById("ppt-progress");

// Inicializar con imagen por defecto
pptImage.src = "imagenes/powerpoint-proyectoja.jpg";

/*************************************************
 * RENDER DEL SLIDE ACTUAL
 *************************************************/
function renderPPTSlide() {
  if (!window.powerPointState.loaded) return;

  const index = window.powerPointState.current;
  const slide = window.powerPointState.slides[index];

  if (!slide) return;

  console.log("[PPT] Cargando imagen:", slide);

  // Crear una nueva imagen para probar la carga primero
  const testImage = new Image();

  testImage.onerror = function () {
    console.error("[PPT] Error al cargar la imagen:", slide);
    // En caso de error, mantener la imagen por defecto
    pptImage.src = "imagenes/powerpoint-proyectoja.jpg";
  };

  testImage.onload = function () {
    console.log(
      "[PPT] Imagen cargada correctamente:",
      slide,
      this.naturalWidth,
      "x",
      this.naturalHeight,
    );
    // Solo actualizar la imagen principal si se carga correctamente
    pptImage.src = slide;

    // 📌 ACTUALIZAR VISIBILIDAD DE MARCA DE AGUA SEGÚN ESTADO PREMIUM
    actualizarMarcaAguaPowerPoint();
  };

  // Iniciar la carga de la imagen de prueba
  testImage.src = slide;
}

/*************************************************
 * ACTUALIZAR MARCA DE AGUA POWERPOINT
 *************************************************/
function actualizarMarcaAguaPowerPoint() {
  const marcaAguaPPT = document.getElementById("marcadeagua-powerpoint");
  if (!marcaAguaPPT) return;

  // Verificar estado premium desde localStorage
  const esPremium = localStorage.getItem("premium") === "true";

  if (esPremium) {
    // Usuario premium: ocultar marca de agua
    marcaAguaPPT.classList.add("oculta");
    marcaAguaPPT.classList.remove("visible");
  } else {
    // Usuario gratis: mostrar marca de agua
    marcaAguaPPT.classList.remove("oculta");
    marcaAguaPPT.classList.add("visible");
  }
}

/*************************************************
 * NAVEGACIÓN
 *************************************************/
function pptNext() {
  if (!window.powerPointState.loaded) return;

  // Verificar si el contenedor de PowerPoint está activo, si no, activarlo
  const ventanaPowerPoint = document.getElementById("contenedor-power-point");
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
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    document.getElementById("contenedor-contador").style.display = "none";
    console.log(
      "[PPT] Contenedor activado automáticamente para navegación siguiente",
    );
  }

  if (window.powerPointState.current < window.powerPointState.total - 1) {
    window.powerPointState.current++;
    renderPPTSlide();
    fillPPTList(); // Actualizar la lista para resaltar la diapositiva actual

    // Sincronizar siempre (para monitor secundario Y control remoto)
    syncSecondaryWindow();
  }
}

function pptPrev() {
  if (!window.powerPointState.loaded) return;

  // Verificar si el contenedor de PowerPoint está activo, si no, activarlo
  const ventanaPowerPoint = document.getElementById("contenedor-power-point");
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
    ventanaProgramacion.style.display = "none";
    ventanaManual.style.display = "none";
    ventanaPelis.style.display = "none";
    document.getElementById("contenedor-contador").style.display = "none";
    console.log(
      "[PPT] Contenedor activado automáticamente para navegación anterior",
    );
  }

  if (window.powerPointState.current > 0) {
    window.powerPointState.current--;
    renderPPTSlide();
    fillPPTList(); // Actualizar la lista para resaltar la diapositiva actual

    // Sincronizar siempre (para monitor secundario Y control remoto)
    syncSecondaryWindow();
  }
}

/*************************************************
 * CARGAR PRESENTACIÓN (IMÁGENES)
 *************************************************/
function loadPowerPoint(slidesArray, presentationId = null) {
  if (!Array.isArray(slidesArray) || slidesArray.length === 0) {
    console.warn("PowerPoint: array de slides inválido");
    return;
  }

  // Verificar que al menos la primera slide sea válida antes de marcar como cargada
  const testFirstSlide = new Image();
  testFirstSlide.onerror = function () {
    console.error("[PPT] La primera diapositiva no es válida:", slidesArray[0]);
    // Mantener imagen por defecto
    pptImage.src = "imagenes/powerpoint-proyectoja.jpg";
  };

  testFirstSlide.onload = function () {
    console.log("[PPT] Primera diapositiva válida, cargando presentación");

    // 📌 Agregar imagen de fin de presentación al final del array
    const slidesConFinal = [
      ...slidesArray,
      "imagenes/powerpoint-proyectoja.jpg",
    ];
    console.log(
      `[PPT] Total de diapositivas (con fin): ${slidesConFinal.length}`,
    );

    window.powerPointState = {
      slides: slidesConFinal,
      current: 0,
      total: slidesConFinal.length,
      loaded: true,
      aspect: "16:9",
      id: presentationId,
    };

    pptContainer.classList.remove("vacio");

    // Activar automáticamente el contenedor de PowerPoint cuando se carga una presentación
    const ventanaPowerPoint = document.getElementById("contenedor-power-point");
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
      ventanaProgramacion.style.display = "none";
      ventanaManual.style.display = "none";
      ventanaPelis.style.display = "none";
      document.getElementById("contenedor-contador").style.display = "none";
      console.log("[PPT] Contenedor de PowerPoint activado automáticamente");
    }

    renderPPTSlide();
    fillPPTList(); // Llenar la lista de diapositivas
    syncSecondaryWindow();
  };

  // Probar la primera imagen
  testFirstSlide.src = slidesArray[0];
}

/*************************************************
 * LIMPIAR PRESENTACIÓN
 *************************************************/
function clearPowerPoint() {
  window.powerPointState.loaded = false;
  window.powerPointState.slides = [];
  window.powerPointState.current = 0;
  window.powerPointState.total = 0;
  window.powerPointState.id = null;

  // Restaurar imagen por defecto
  pptImage.src = "imagenes/powerpoint-proyectoja.jpg";
  pptContainer.classList.add("vacio");

  syncSecondaryWindow();
}

/*************************************************
 * FUNCIÓN PARA VERIFICAR CONTENEDOR ACTIVO
 *************************************************/
function esContenedorPowerPointActivo() {
  const ventanaPowerPoint = document.getElementById("contenedor-power-point");
  if (!ventanaPowerPoint) return false;
  return getComputedStyle(ventanaPowerPoint).display === "flex";
}

function esContenedorBibliaActivo() {
  const ventanaBiblia = document.getElementById("contenedor-biblia");
  if (!ventanaBiblia) return false;
  return getComputedStyle(ventanaBiblia).display === "flex";
}

/*************************************************
 * TECLADO (CONTROL RÁPIDO)
 *************************************************/
document.addEventListener("keydown", (e) => {
  // Verificar si estamos en un input, textarea o select
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.tagName === "SELECT"
  )
    return;

  // Verificar qué contenedor está activo
  const pptActivo = esContenedorPowerPointActivo();
  const bibliaActiva = esContenedorBibliaActivo();

  // Si PowerPoint está activo y cargado
  if (pptActivo && window.powerPointState.loaded) {
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
        e.preventDefault();
        pptNext();
        break;

      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        pptPrev();
        break;

      case "Home":
        e.preventDefault();
        window.powerPointState.current = 0;
        renderPPTSlide();
        fillPPTList();
        syncSecondaryWindow();
        break;

      case "End":
        e.preventDefault();
        window.powerPointState.current = window.powerPointState.total - 1;
        renderPPTSlide();
        fillPPTList();
        syncSecondaryWindow();
        break;
    }
  }
  // Si la Biblia está activa, dejar que biblia.js maneje las teclas
  // (el listener en biblia.js ya tiene su propia verificación)
});

/*************************************************
 * SINCRONIZACIÓN CON PANTALLA SECUNDARIA
 *************************************************/
function syncSecondaryWindow() {
  if (!window.powerPointState.loaded) {
    // Si no hay presentación cargada, enviar señal para limpiar PowerPoint en ventana secundaria
    if (window.electronAPI && window.electronAPI.sendToSecondary) {
      window.electronAPI.sendToSecondary({
        clearPowerPoint: true,
      });
    }
    return;
  }

  const index = window.powerPointState.current;
  const slide = window.powerPointState.slides[index];

  if (!slide) return;

  // Función para convertir URL file:// a URL HTTP para la ventana secundaria
  function convertirUrlParaVentanaSecundaria(url) {
    if (!url) return url;

    console.log("[PPT] Convirtiendo URL para ventana secundaria:", url);

    // Si ya es una URL HTTP, dejarla como está
    if (url.startsWith("http://") || url.startsWith("https://")) {
      console.log("[PPT] Ya es URL HTTP");
      return url;
    }

    // Para URLs file://
    if (url.startsWith("file:///")) {
      // Extraer solo el nombre del archivo (slide_001.png)
      const fileNameMatch = null; // DISABLED to use correct logic below

      if (fileNameMatch) {
        const fileName = fileNameMatch[0];
        // Construir URL simple: http://localhost:3000/ppt-temp/ppt-cache/slide_001.png
        const simpleUrl = `http://localhost:3000/ppt-temp/ppt-cache/${fileName}`;
        console.log("[PPT] URL simplificada:", simpleUrl);
        return simpleUrl;
      }

      // Si no encontramos el patrón, intentar extraer ruta completa
      try {
        const filePath = url.substring(8); // Eliminar 'file:///'

        // Buscar ppt-cache en la ruta
        const pptCacheIndex = filePath.toLowerCase().indexOf("ppt-cache");

        if (pptCacheIndex !== -1) {
          const relativePath = filePath.substring(pptCacheIndex);
          const normalizedPath = relativePath
            .replace(/\\\\/g, "/")
            .replace(/\\/g, "/");
          const httpUrl = `http://localhost:3000/ppt-temp/${normalizedPath}`;
          console.log("[PPT] URL construida:", httpUrl);
          return httpUrl;
        }
      } catch (err) {
        console.error("[PPT] Error procesando URL:", err);
      }
    }

    // Si llegamos aquí, devolver la URL original
    console.warn("[PPT] No se pudo convertir la URL, usando original");
    return url;
  }

  // Convertir la URL para la ventana secundaria
  const slideUrlParaVS = convertirUrlParaVentanaSecundaria(slide);

  // Enviar datos de PowerPoint a la ventana secundaria
  if (window.electronAPI && window.electronAPI.sendToSecondary) {
    const datos = {
      powerpoint: {
        slideUrl: slideUrlParaVS,
        current: index + 1,
        total: window.powerPointState.total,
        loaded: true,
      },
      esPremium: localStorage.getItem("premium") === "true",
    };

    console.log("[PPT] Datos enviados a ventana secundaria:", datos);
    console.log("[PPT] URL original:", slide);
    console.log("[PPT] URL para ventana secundaria:", slideUrlParaVS);

    window.electronAPI.sendToSecondary(datos);
  }

  // ENVIAR DATOS AL CONTROL REMOTO
  if (window.electronAPI && window.electronAPI.updateRemote) {
    const nextIndex = index + 1;
    let nextSlideUrl = null;

    // Si hay siguiente diapositiva, preparar su URL
    if (nextIndex < window.powerPointState.total) {
      const rawNextUrl = window.powerPointState.slides[nextIndex];
      const convertedNext = convertirUrlParaVentanaSecundaria(rawNextUrl);
      if (convertedNext) nextSlideUrl = convertedNext.trim();
    }

    const pptStatus = {
      current: index + 1,
      total: window.powerPointState.total,
      slideUrl: slideUrlParaVS ? slideUrlParaVS.trim() : null,
      nextSlideUrl: nextSlideUrl,
      hasNext: nextIndex < window.powerPointState.total,
      hasPrev: index > 0,
    };

    window.electronAPI.updateRemote(pptStatus);
  }
}

/*************************************************
 * UTILIDAD (OPCIONAL)
 *************************************************/
function getPowerPointInfo() {
  return {
    current: window.powerPointState.current + 1,
    total: window.powerPointState.total,
    loaded: window.powerPointState.loaded,
    id: window.powerPointState.id,
  };
}

//Cargar el archivo power point con visualización progresiva
async function openPowerPoint() {
  try {
    // Mostrar progreso
    pptProgressText.textContent = "Iniciando conversión de PowerPoint…";
    progressBox.style.display = "block";

    // Estado para manejar slides progresivas
    window.pptProgressiveSlides = {
      urls: [],
      loaded: false,
      currentIndex: 0,
    };

    // Configurar listener para nuevas slides
    window.electronAPI.onPPTSlideReady((data) => {
      console.log("[PPT] Nueva diapositiva recibida:", data);

      if (!window.pptProgressiveSlides.loaded && data.url) {
        // Primera slide - cargar presentación
        window.pptProgressiveSlides.urls = [data.url];
        window.pptProgressiveSlides.loaded = true;
        loadPowerPoint([data.url]);
        pptProgressText.textContent = `Diapositiva 1 de ? lista. Convirtiendo…`;
      } else if (window.pptProgressiveSlides.loaded && data.url) {
        // Agregar slide adicional
        window.pptProgressiveSlides.urls.push(data.url);

        // 📌 Actualizar slides asegurando que la imagen de fin esté al final
        const slidesConFinal = [
          ...window.pptProgressiveSlides.urls,
          "imagenes/powerpoint-proyectoja.jpg",
        ];
        window.powerPointState.slides = slidesConFinal;
        window.powerPointState.total = slidesConFinal.length;

        // Actualizar progreso
        if (data.total) {
          pptProgressText.textContent = `Diapositiva ${data.index + 1} de ${
            data.total
          } lista. Convirtiendo…`;
        } else {
          pptProgressText.textContent = `Diapositiva ${window.pptProgressiveSlides.urls.length} lista. Convirtiendo…`;
        }
      }
    });

    // Convertir PowerPoint a imágenes (esto iniciará el proceso)
    const slides = await window.electronAPI.openPowerPoint();

    if (!slides || slides.length === 0) {
      pptProgressText.textContent = "No se generaron las diapositivas...";
      setTimeout(() => {
        progressBox.style.display = "none";
      }, 2000);
      return;
    }

    // Si llegamos aquí, la conversión terminó y tenemos todas las slides
    // Cargar todas las imágenes
    loadPowerPoint(slides);

    // Ocultar progreso
    pptProgressText.textContent = "Conversión completada";
    setTimeout(() => {
      progressBox.style.display = "none";
    }, 2000);
  } catch (err) {
    console.error("Error al abrir PowerPoint:", err);
    pptProgressText.textContent = "Error: " + err.message;
    setTimeout(() => {
      progressBox.style.display = "none";
    }, 3000);
  }
}

/*************************************************
 * LLENAR LISTA DE DIAPOSITIVAS
 *************************************************/
function fillPPTList() {
  if (!window.powerPointState.loaded) return;

  const listContainer = document.getElementById("lista-presentacion");
  if (!listContainer) return;

  // Limpiar contenido anterior
  listContainer.innerHTML = "";

  // Crear título con número total de diapositivas
  const title = document.createElement("h2");
  title.textContent = `Lista diapositivas: ${window.powerPointState.total}`;
  listContainer.appendChild(title);

  // Crear contenedor para miniaturas
  const thumbnailsContainer = document.createElement("div");
  thumbnailsContainer.className = "ppt-thumbnails-container";

  // Crear miniaturas para cada diapositiva
  window.powerPointState.slides.forEach((slideUrl, index) => {
    const thumbnailContainer = document.createElement("div");
    thumbnailContainer.className = "ppt-thumbnail-container";
    if (index === window.powerPointState.current) {
      thumbnailContainer.classList.add("active");
    }

    const thumbnail = document.createElement("img");
    thumbnail.src = slideUrl;
    thumbnail.alt = `Diapositiva ${index + 1}`;

    const numberLabel = document.createElement("div");
    numberLabel.className = "ppt-thumbnail-number";

    // 📌 Mostrar "Fin" en la última diapositiva
    const isLastSlide = index === window.powerPointState.total - 1;
    numberLabel.textContent = isLastSlide ? "Fin" : index + 1;

    // Evento click para cambiar a esta diapositiva
    thumbnailContainer.onclick = () => {
      window.powerPointState.current = index;
      renderPPTSlide();
      fillPPTList(); // Actualizar la lista para resaltar la diapositiva actual
      syncSecondaryWindow();
    };

    thumbnailContainer.appendChild(thumbnail);
    thumbnailContainer.appendChild(numberLabel);
    thumbnailsContainer.appendChild(thumbnailContainer);
  });

  listContainer.appendChild(thumbnailsContainer);
}

async function convertPPTToImages(pptPath) {
  // 1. Crear carpeta temporal
  // 2. Convertir pptx → imágenes
  // 3. Retornar array ordenado de rutas

  return ["/ppt-cache/abc/slide_001.png", "/ppt-cache/abc/slide_002.png"];
}

//Mostrar progroso de imaganes que se están convirtiendo de power point a imagenes
const progressBox = document.getElementById("ppt-progress");
const pptProgressText = document.getElementById("ppt-progress-text");

window.electronAPI.onPptProgress((data) => {
  progressBox.style.display = "block";

  if (data.total) {
    pptProgressText.textContent = `Convirtiendo PowerPoint: ${data.current} de ${data.total} diapositivas…`;
  } else {
    pptProgressText.textContent = data.message;
  }

  if (data.done) {
    progressBox.style.display = "none";
  }
});

/*************************************************
 * FUNCIONALIDAD PARA BOTONES DE POWERPOINT
 *************************************************/
// Variable para controlar modo monitor
let modoMonitorActivo = false;

// Función para verificar si está en modo monitor
function verificarModoMonitor() {
  // Usar la función existente esMonitorActivo() que verifica si hay monitor seleccionado
  modoMonitorActivo = esMonitorActivo();

  console.log("[PPT] Modo monitor activo:", modoMonitorActivo);
  return modoMonitorActivo;
}

// Función para actualizar visibilidad de botones según modo
function actualizarVisibilidadBotonesPowerPoint() {
  const fullscreenBtn = document.getElementById("ppt-fullscreen-btn");
  if (!fullscreenBtn) return;

  if (modoMonitorActivo) {
    // Modo monitor: ocultar botón de pantalla completa
    fullscreenBtn.style.display = "none";
    console.log("[PPT] Modo monitor activo - Botón pantalla completa oculto");
  } else {
    // Modo estándar: mostrar botón de pantalla completa
    fullscreenBtn.style.display = "flex";
    console.log("[PPT] Modo estándar - Botón pantalla completa visible");
  }
}

// Función para sincronizar con ventana secundaria (si está en modo monitor)
function sincronizarConMonitor() {
  if (modoMonitorActivo && window.powerPointState.loaded) {
    syncSecondaryWindow();
  }
}

// Modificar funciones de navegación para sincronizar automáticamente
function pptNextConSincronizacion() {
  pptNext();
}

function pptPrevConSincronizacion() {
  pptPrev();
}

// Inicializar botones cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Botón de pantalla completa
  const fullscreenBtn = document.getElementById("ppt-fullscreen-btn");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", function () {
      const pptImage = document.getElementById("contenedor-ppt-actual");
      if (!pptImage) return;

      if (!document.fullscreenElement) {
        // Entrar en pantalla completa
        if (pptImage.requestFullscreen) {
          pptImage.requestFullscreen();
        } else if (pptImage.webkitRequestFullscreen) {
          /* Safari */
          pptImage.webkitRequestFullscreen();
        } else if (pptImage.msRequestFullscreen) {
          /* IE11 */
          pptImage.msRequestFullscreen();
        }
      } else {
        // Salir de pantalla completa
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          /* Safari */
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          /* IE11 */
          document.msExitFullscreen();
        }
      }
    });
  }

  // Verificar modo monitor al cargar
  setTimeout(() => {
    verificarModoMonitor();
    actualizarVisibilidadBotonesPowerPoint();
  }, 1000);

  // Actualizar botones periódicamente (Restaurado)
  setInterval(() => {
    verificarModoMonitor();
    actualizarVisibilidadBotonesPowerPoint();
  }, 5000);
});

// ==========================================
// MÓDULO DE EXPORTACIÓN (PDF / JPG)
// ==========================================

// Cargar librerías necesarias dinámicamente
// Cargar librerías necesarias dinámicamente (LOCALES para offline)
async function cargarLibreriasExportacion() {
  if (typeof html2canvas === "undefined") {
    const s1 = document.createElement("script");
    s1.src = "libs/html2canvas.min.js";
    document.head.appendChild(s1);
  }
  if (typeof jspdf === "undefined") {
    const s2 = document.createElement("script");
    s2.src = "libs/jspdf.min.js";
    document.head.appendChild(s2);
  }
  // Esperar un momento a que carguen
  await new Promise((r) => setTimeout(r, 1000));
}

// Función principal de exportación
async function exportarProgramacion(formato) {
  if (!formato || typeof formato !== "string") formato = "pdf"; // Default para botones antiguos
  const loader = document.createElement("div");
  loader.innerHTML = '<div class="spinner"></div> Generando archivo...';
  loader.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:white;padding:20px;border-radius:10px;z-index:10000;display:flex;align-items:center;gap:10px;";
  document.body.appendChild(loader);

  try {
    await cargarLibreriasExportacion();

    // Crear contenedor temporal para el renderizado
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;top:-10000px;left:0;width:1200px;background:white;padding:40px;font-family:Arial,sans-serif;color:black;";
    document.body.appendChild(container);

    // 1. Encabezado con Logos
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;border-bottom:3px solid #004481;padding-bottom:15px;";

    // Logo Proyecto JA
    const imgJA = new Image();
    imgJA.src = "imagenes/logo-proyectoja.png";
    imgJA.style.height = "100px";

    // Info Central
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = "text-align:center;flex:1;";
    const nombreIglesia =
      document.getElementById("nombre-iglesia")?.value || "IGLESIA ADVENTISTA";
    const fecha = document.getElementById("fecha-programa")?.value || "";
    infoDiv.innerHTML = `
            <h1 style="margin:0;color:#004481;font-size:28px;text-transform:uppercase;">PROGRAMA DE SERVICIOS</h1>
            <h2 style="margin:10px 0;color:#333;font-size:22px;">${nombreIglesia}</h2>
            <p style="margin:0;font-size:18px;color:#666;">${fecha}</p>
        `;

    // Logo Iglesia
    const imgIglesia = new Image();
    imgIglesia.src = "imagenes/logo-negro-iglesia-adventista.png";
    imgIglesia.style.height = "100px";

    header.appendChild(imgJA);
    header.appendChild(infoDiv);
    header.appendChild(imgIglesia);
    container.appendChild(header);

    // 2. Procesar Tablas
    const clonarTabla = (idOrigen, titulo) => {
      const origen = document.getElementById(idOrigen); // tbody
      if (!origen) return;
      // Buscar la tabla padre real o construir una
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "30px";

      const tituloDiv = document.createElement("div");
      tituloDiv.textContent = titulo;
      tituloDiv.style.cssText =
        "background:#004481;color:white;padding:8px 15px;font-size:20px;font-weight:bold;margin-bottom:10px;border-radius:5px 5px 0 0;";
      wrapper.appendChild(tituloDiv);

      const table = document.createElement("table");
      table.style.cssText =
        "width:100%;border-collapse:collapse;font-size:16px;";

      // Header de tabla
      const thead = document.createElement("tr");
      thead.style.background = "#f0f0f0";
      thead.innerHTML =
        '<th style="border:1px solid #ccc;padding:10px;text-align:center;width:60px;">N°</th><th style="border:1px solid #ccc;padding:10px;width:100px;">Hora</th><th style="border:1px solid #ccc;padding:10px;">Descripción</th><th style="border:1px solid #ccc;padding:10px;">Detalle / Himnos</th><th style="border:1px solid #ccc;padding:10px;">Encargado</th>';
      table.appendChild(thead);

      // Filas (Solo iterar sobre filas editables reales)
      const filasReales = origen.querySelectorAll("tr.fila-editable");
      filasReales.forEach((tr) => {
        const fila = document.createElement("tr");

        // Convertir inputs a texto de forma segura
        const getVal = (sel) => {
          const el = tr.querySelector(sel);
          return el ? el.value || el.textContent || "" : "";
        };

        // N°
        fila.innerHTML += `<td style="border:1px solid #ccc;padding:8px;text-align:center;">${
          tr.querySelector(".numero")?.textContent || ""
        }</td>`;

        // Hora
        fila.innerHTML += `<td style="border:1px solid #ccc;padding:8px;">${getVal(
          ".input-hora",
        )}</td>`;

        // Desc (Manejo robusto para select/input)
        let desc = getVal(".select-descripcion");
        if (!desc) {
          const select = tr.querySelector("select");
          if (
            select &&
            select.options &&
            select.options[select.selectedIndex]
          ) {
            desc = select.options[select.selectedIndex].text;
          }
        }
        fila.innerHTML += `<td style="border:1px solid #ccc;padding:8px;font-weight:bold;">${
          desc || ""
        }</td>`;

        // Detalle y Himnos
        const detalleTxt = getVal(".input-detalle");
        const chips = Array.from(tr.querySelectorAll(".texto-chip-himno")).map(
          (s) => s.textContent,
        );
        let detalleHtml = detalleTxt ? `<div>${detalleTxt}</div>` : "";
        if (chips.length) {
          detalleHtml += `<ul style="margin:5px 0 0 20px;padding:0;color:#004481;">${chips
            .map((c) => `<li>${c}</li>`)
            .join("")}</ul>`;
        }
        fila.innerHTML += `<td style="border:1px solid #ccc;padding:8px;">${detalleHtml}</td>`;

        // Encargado
        fila.innerHTML += `<td style="border:1px solid #ccc;padding:8px;">${getVal(
          ".input-presentacion",
        )}</td>`;

        table.appendChild(fila);
      });

      wrapper.appendChild(table);
      container.appendChild(wrapper);
    };

    clonarTabla("seccion-servicio-general", "PROGRAMACIÓN | CRONOGRAMA");
    clonarTabla("seccion-culto-adoracion", "CULTO DE ADORACIÓN");

    // Esperar carga de imagenes
    await new Promise((r) => setTimeout(r, 1500));

    // Generar Canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Mejor calidad
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Exportar
    const validFileName = `Programa_${
      document.getElementById("fecha-programa")?.value || "proyectoja"
    }`;

    if (formato === "jpg") {
      const link = document.createElement("a");
      link.download = `${validFileName}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    } else {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/jpeg", 0.9);

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${validFileName}.pdf`);
    }

    document.body.removeChild(container);
  } catch (e) {
    console.error(e);
    alert("Error al exportar: " + e.message);
  } finally {
    document.body.removeChild(loader);
  }
}

// Inicializar botones de exportación
function inicializarBotonesExportacion() {
  const inputFecha = document.getElementById("fecha-programa");
  if (!inputFecha) return;

  // Limpieza de botones viejos
  document.querySelectorAll("button").forEach((btn) => {
    const t = (btn.textContent || "").toLowerCase();
    if (
      (t.includes("exportar") || t.includes("txt")) &&
      !btn.className.includes("btn-exportar")
    ) {
      btn.style.display = "none";
    }
  });

  const container = inputFecha.parentElement; // Suponemos que está en un div

  // Crear contenedor de botones si no existe
  let btnContainer = document.getElementById("cont-btns-export");
  if (!btnContainer) {
    btnContainer = document.createElement("div");
    btnContainer.id = "cont-btns-export";
    btnContainer.style.cssText =
      "display:inline-flex;gap:10px;margin-left:20px;align-items:center;";
    container.appendChild(btnContainer);
  }

  btnContainer.innerHTML = ""; // Limpiar anteriores

  // Botón PDF
  const btnPDF = document.createElement("button");
  btnPDF.innerHTML = "PDF";
  btnPDF.className = "btn-exportar-pdf";
  btnPDF.style.cssText =
    "background:#d32f2f;color:white;border:none;padding:5px 15px;border-radius:4px;cursor:pointer;font-weight:bold;";
  btnPDF.onclick = () => exportarProgramacion("pdf");

  // Botón JPG
  const btnJPG = document.createElement("button");
  btnJPG.innerHTML = "JPG";
  btnJPG.className = "btn-exportar-jpg";
  btnJPG.style.cssText =
    "background:#1976d2;color:white;border:none;padding:5px 15px;border-radius:4px;cursor:pointer;font-weight:bold;";
  btnJPG.onclick = () => exportarProgramacion("jpg");

  btnContainer.appendChild(btnPDF);
  btnContainer.appendChild(btnJPG);
}

// Llamar a inicialización al cargar
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(inicializarBotonesExportacion, 2000); // Esperar a que se renderice la interfaz
  cargarLibreriasExportacion(); // Precargar scripts
});

/**
 * NOTA: HACER UN CONTENEDOR DONDE HAYA UNA TABLA PARA ORGANIZAR BIEN EL PROGRAMA DE LA IGLESIA,
 * EN EL CUAL SE VA A ADJUNTAR DESDE EL MISMO CONTENEDOR EL HIMNO QUE SE QUIERE MOSTRAR Y SOLO SE LE DA A REPRODUCIR
 * Y YA SE ENVÍA A PANTALLA, EN EL MISMO CONTENEDOR SE PONDRA LA INFORMACIÓN REQUERIDA COMO ESTÉTICA E INFORMACIÓN DE LA MISMA
 * TAMBIÉN SE AGRAGARÁ UN RELOJ REAL PARA QUE EL USUARIO VAYA VIENDO LA HORA Y LOS MINUTOS QUE TRANSCURREN EN EL PROGRAMA
 * TAMBIÉN SE PONDRÁ DE UN COLOR DIFERENTE LA FILA POR LA QUE VA EL PROGRAMA EN ESE MOMENTO, ESO SE HARÁ CONFIRME A LA HORA
 * O LOS MINUTOS QUE VA TRANSITANDO, ES UNA IMPLEMENTACIÓN MUY BONITA, RECORDAR ESTO.
 * HAY QUE IR TRABAJANDO EN CÓMO VAMOS IR IMPLEMENTANDO LA LISTA DE REPRODUCCIÓN QUE EL USUARIO PUEDA HACER,
 * PERO YO PENSABA EN HACERLO VÍA PLAY, QUE EN EL MISMO REGISTRO DE LA TABLA, HALLA UNA COLUMNA ESPECIFICA DONDE
 * VAYA EL BOTON A REPRODUCIR, HAY QUE PLANTEAR BIEN LA LÓGICA.
 *
 * Nota: Hacer una conexión bíblica para 10 jugadores gratis, para que lo usen
 * las iglesias, uniones y asosciaciones...
 */

/**
 * SISTEMA DE PROGRAMACIÓN DE EVENTOS - HIMNARIO ADVENTISTA PRO
 * Gestiona la tabla de programación de eventos del sábado
 */

// Opciones predefinidas para la columna Descripción
let opcionesPredefinidas = [
  "Bienvenida",
  "Servicio de Canto",
  "Escuela Sabática",
  "Doxología",
  "Oración",
  "Lectura Bíblica",
  "Himno",
  "Momento Musical",
  "Tema Central",
  "Sermón",
  "Provad y Ved",
  "Diezmos y Ofrendas",
  "Adoración Infantil",
  "Especial Musical",
  "Despedida",
  "Bendición",
];

// Cargar opciones personalizadas del localStorage
function cargarOpcionesPersonalizadas() {
  const guardadas = localStorage.getItem(
    "opciones-programacion-personalizadas",
  );
  if (guardadas) {
    const personalizadas = JSON.parse(guardadas);
    opcionesPredefinidas = [
      ...new Set([...opcionesPredefinidas, ...personalizadas]),
    ];
  }
}

// Guardar opciones personalizadas en localStorage
function guardarOpcionesPersonalizadas() {
  const personalizadas = opcionesPredefinidas.filter(
    (op) =>
      ![
        "Bienvenida",
        "Servicio de Canto",
        "Escuela Sabática",
        "Doxología",
        "Oración",
        "Lectura Bíblica",
        "Himno",
        "Momento Musical",
        "Tema Central",
        "Sermón",
        "Provad y Ved",
        "Diezmos y Ofrendas",
        "Adoración Infantil",
        "Especial Musical",
        "Despedida",
        "Bendición",
      ].includes(op),
  );
  localStorage.setItem(
    "opciones-programacion-personalizadas",
    JSON.stringify(personalizadas),
  );
}

// Renderizar lista de opciones en el panel de control
function renderizarListaOpciones() {
  const lista = document.getElementById("lista-opciones-programacion");
  if (!lista) return;

  lista.innerHTML = "";
  opcionesPredefinidas.forEach((opcion, index) => {
    const div = document.createElement("div");
    div.className = "opcion-item";

    const span = document.createElement("span");
    span.textContent = opcion;

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "×";
    btnEliminar.className = "btn-eliminar-opcion";
    btnEliminar.onclick = () => eliminarOpcionDescripcion(index);

    div.appendChild(span);
    div.appendChild(btnEliminar);
    lista.appendChild(div);
  });
}

// Agregar nueva opción de descripción
function agregarOpcionDescripcion() {
  const input = document.getElementById("nueva-opcion-programacion");
  const nuevaOpcion = input.value.trim();

  if (nuevaOpcion && !opcionesPredefinidas.includes(nuevaOpcion)) {
    opcionesPredefinidas.push(nuevaOpcion);
    guardarOpcionesPersonalizadas();
    renderizarListaOpciones();
    input.value = "";

    // Actualizar todos los selects existentes
    actualizarTodosLosSelects();
  } else if (opcionesPredefinidas.includes(nuevaOpcion)) {
    alert("Esta opción ya existe");
  }
}

// Eliminar opción de descripción
function eliminarOpcionDescripcion(index) {
  if (confirm(`¿Eliminar la opción "${opcionesPredefinidas[index]}"?`)) {
    opcionesPredefinidas.splice(index, 1);
    guardarOpcionesPersonalizadas();
    renderizarListaOpciones();
    actualizarTodosLosSelects();
  }
}

// Actualizar todos los selects de descripción en la tabla
function actualizarTodosLosSelects() {
  const selects = document.querySelectorAll(".select-descripcion");
  selects.forEach((select) => {
    const valorActual = select.value;
    select.innerHTML = "";

    opcionesPredefinidas.forEach((opcion) => {
      const option = document.createElement("option");
      option.value = opcion;
      option.textContent = opcion;
      if (opcion === valorActual) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });
}

// Crear select de opciones
function crearSelectDescripcion(valorInicial = "Bienvenida") {
  const select = document.createElement("select");
  select.className = "select-descripcion";

  opcionesPredefinidas.forEach((opcion) => {
    const option = document.createElement("option");
    option.value = opcion;
    option.textContent = opcion;
    if (opcion === valorInicial) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    guardarProgramacionAuto();
  });

  return select;
}

// Agregar fila a una sección específica
function agregarFilaSeccion(seccion) {
  const tbody = document.getElementById(`seccion-${seccion}`);
  const filas = tbody.querySelectorAll("tr:not(.subtitulo):not(.encabezado)");
  const numeroFila = filas.length + 1;

  const tr = document.createElement("tr");
  tr.className = "fila-editable";

  // N°
  const tdNumero = document.createElement("td");
  tdNumero.className = "numero";
  tdNumero.textContent = numeroFila;

  // Hora
  const tdHora = document.createElement("td");
  tdHora.className = "hora";
  const inputHora = document.createElement("input");
  inputHora.type = "time";
  inputHora.className = "input-hora";
  inputHora.value = "09:00";
  inputHora.addEventListener("change", guardarProgramacionAuto);
  tdHora.appendChild(inputHora);

  // Descripción
  const tdDescripcion = document.createElement("td");
  const valorInicial =
    seccion === "culto-adoracion" ? "Doxología" : "Bienvenida";
  const selectDescripcion = crearSelectDescripcion(valorInicial);
  tdDescripcion.appendChild(selectDescripcion);

  // Detalle (CON SELECTOR DE HIMNOS)
  const tdDetalle = document.createElement("td");
  const { contenedorDetalle } = crearControlesDetalle();
  tdDetalle.appendChild(contenedorDetalle);

  // Presentación
  const tdPresentacion = document.createElement("td");
  const inputPresentacion = document.createElement("input");
  inputPresentacion.type = "text";
  inputPresentacion.className = "input-presentacion";
  inputPresentacion.placeholder = "Encargado(a)...";
  inputPresentacion.addEventListener("input", guardarProgramacionAuto);
  tdPresentacion.appendChild(inputPresentacion);

  // Botón eliminar
  const tdAcciones = document.createElement("td");
  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "−";
  btnEliminar.className = "btn-eliminar-fila";
  btnEliminar.onclick = () => eliminarFila(tr, seccion);
  tdAcciones.appendChild(btnEliminar);

  tr.appendChild(tdNumero);
  tr.appendChild(tdHora);
  tr.appendChild(tdDescripcion);
  tr.appendChild(tdDetalle);
  tr.appendChild(tdPresentacion);
  tr.appendChild(tdAcciones);

  tbody.appendChild(tr);
  renumerarFilas(seccion);
  guardarProgramacionAuto();
}

// Eliminar fila (SIN CONFIRMACIÓN)
function eliminarFila(fila, seccion) {
  fila.remove();
  renumerarFilas(seccion);
  guardarProgramacionAuto();
}

// Renumerar filas de una sección
function renumerarFilas(seccion) {
  const tbody = document.getElementById(`seccion-${seccion}`);
  const filas = tbody.querySelectorAll("tr.fila-editable");

  filas.forEach((fila, index) => {
    const tdNumero = fila.querySelector(".numero");
    if (tdNumero) {
      tdNumero.textContent = index + 1;
    }
  });
}

// Categorías de himnarios disponibles
const categoriasHimnarios = {
  todos: "Himnario Nuevo (1-614)",
  himnosInfantiles: "Himnario Infantil",
  orquestado: "Himnario Orquestado",
  himnosAntiguos: "Himnario Antiguo 1962",
  coritos: "Coritos Adventistas",
  himnosJA: "Himnos JA",
  himnosNacionales: "Himnos Nacionales",
  orar: "Música Para Orar",
  himnosPianoPista: "Himnos Piano Pista",
  stream: "In-Pre-Out Stream",
};

// Función para obtener himnos según categoría
// Función para obtener himnos según categoría (DATOS REALES)
// Función para cargar datos de himnos sin depender del DOM (SOLO DATOS)
function cargarDatosCategoria(categoria) {
  console.log(`[DATA] Cargando datos para categoría: ${categoria}`);
  todosLosHimnos = []; // Reiniciar el array global

  let listaTitulos = [];
  let pathVideos = "";
  let pathPortadas = "";
  let tipoPortada = ".jpg";

  // Caso 1: Himnario Nuevo (Rango numérico)
  if (
    categoria === "todos" ||
    categoria === "1-150" ||
    categoria === "151-300" ||
    categoria === "301-450" ||
    categoria === "451-614"
  ) {
    let inicio = 1,
      fin = 614;
    // Si se desea, se puede ajustar el rango, pero para búsqueda cargamos todo por defecto si es 'todos'
    if (categoria !== "todos") {
      // Extraer rango si fuera necesario, pero el modal suele usar 'todos'
    }

    for (let i = inicio; i <= fin; i++) {
      const numero = String(i).padStart(3, "0");
      // Intentar usar variable global titulos si existe
      let titulo =
        typeof titulos !== "undefined" && titulos[i - 1]
          ? titulos[i - 1]
          : `Himno ${i}`;

      todosLosHimnos.push({
        numero,
        titulo,
        videoPath: srcAux + "videos/" + numero + ".mp4",
        imagePath: srcAux + "portadas/" + numero + ".jpg",
      });
    }
    return;
  }

  // Caso 2: Listas especiales basadas en arrays globales
  if (categoria === "orquestado") {
    listaTitulos = typeof titulos2 !== "undefined" ? titulos2 : [];
    pathVideos = "videosAntiguo/";
    pathPortadas = "portadasAntiguo/";
  } else if (categoria === "coritos") {
    listaTitulos = typeof titulos3 !== "undefined" ? titulos3 : [];
    pathVideos = "videosCoritos/";
    pathPortadas = "portadasCoritos/";
  } else if (categoria === "himnosJA") {
    listaTitulos = typeof titulos4 !== "undefined" ? titulos4 : [];
    pathVideos = "videosHimnosJA/";
    pathPortadas = "portadasHimnosJA/";
  } else if (categoria === "himnosNacionales") {
    listaTitulos = typeof titulos5 !== "undefined" ? titulos5 : [];
    pathVideos = "videosHimnosNacionales/";
    pathPortadas = "portadasHimnosNacionales/";
    tipoPortada = ".png";
  } else if (categoria === "orar") {
    listaTitulos =
      typeof tituloMusicaParaOrarDeFondo !== "undefined"
        ? tituloMusicaParaOrarDeFondo
        : [];
    pathVideos = "musicaParaOrarDeFondo/";
    pathPortadas = "portadasParaOrarDeFondo/";
    tipoPortada = ".png";
  } else if (categoria === "himnosPianoPista") {
    listaTitulos =
      typeof tituloHimnosPianoPista !== "undefined"
        ? tituloHimnosPianoPista
        : [];
    pathVideos = "videosHimnosPianoPista/";
    // Portada fija
  } else if (categoria === "himnosInfantiles") {
    listaTitulos =
      typeof tituloHimnosInfantiles !== "undefined"
        ? tituloHimnosInfantiles
        : [];
    pathVideos = "videosHimnosInfantiles/";
    pathPortadas = "portadasHimnosInfantiles/";
  } else if (categoria === "himnosAntiguos") {
    listaTitulos =
      typeof tituloHimnosAntiguos !== "undefined" ? tituloHimnosAntiguos : [];
    pathVideos = "videosHimnosAntiguos/";
    pathPortadas = "portadasHimnosAntiguos/";
  } else if (categoria === "stream") {
    listaTitulos = typeof titulos8 !== "undefined" ? titulos8 : []; // Asumiendo titulos8
    pathVideos = "videosStream/";
    pathPortadas = "portadasStream/";
  }

  // Procesar lista de títulos
  for (let i = 0; i < listaTitulos.length; i++) {
    const t = listaTitulos[i];
    const match = t.match(/\d{3}/);
    const numero = match ? match[0] : String(i + 1).padStart(3, "0");

    let img = formalizarRuta(srcAux + pathPortadas + numero + tipoPortada);
    if (categoria === "himnosPianoPista")
      img = "portadasHimnosPianoPista/001.jpg"; // Fix hardcoded

    todosLosHimnos.push({
      numero,
      titulo: t,
      videoPath: formalizarRuta(srcAux + pathVideos + numero + ".mp4"),
      imagePath: img,
    });
  }
}

// Función para obtener himnos según categoría (FUSIONADO EN SCRIPTS.JS)
function obtenerHimnosPorCategoria(categoria) {
  // Ahora usamos SIEMPRE todosLosHimnos porque cargarDatosCategoria lo ha llenado previamente
  // La categoría ya fue procesada, simplemente devolvemos lo que hay en memoria

  console.log(
    `[DEBUG] obtenerHimnosPorCategoria: Retornando ${todosLosHimnos.length} elementos para ${categoria}`,
  );

  if (todosLosHimnos.length === 0) {
    // Intento de recuperación si está vacío
    cargarDatosCategoria(categoria);
  }

  // Mapear al formato requerido por el modal
  return todosLosHimnos.map((himno, index) => ({
    numero: himno.numero || String(index + 1).padStart(3, "0"),
    titulo: himno.titulo || `Himno ${index + 1}`,
    categoria: categoria,
    videoPath: himno.videoPath,
    imagePath: himno.imagePath,
  }));
}

// Mantener retrocompatibilidad
function obtenerTodosLosHimnos() {
  return obtenerHimnosPorCategoria("todos");
}

// Función para reproducir himno (Directo sin UI)
async function reproducirHimno(numeroHimno, categoria = "todos") {
  console.log(`Reproduciendo contenido: ${numeroHimno} (${categoria})`);

  // 1. Detectar si es una URL (YouTube o Local) o un número de himno
  const esUrl =
    numeroHimno &&
    (numeroHimno.startsWith("http") || numeroHimno.startsWith("file://"));

  if (esUrl) {
    // Si es una URL, la reproducimos directamente
    await iniciarReproduccionHimno(
      "Contenido Multimedia",
      numeroHimno,
      null,
      null,
    );
    return;
  }

  // 2. Asegurar datos cargados para himnos estándar
  cargarDatosCategoria(categoria);

  // 3. Buscar himno en la lista cargada
  let himno = todosLosHimnos.find((h) => h.numero === numeroHimno);
  if (!himno) {
    const numFmt = String(numeroHimno).padStart(3, "0");
    himno = todosLosHimnos.find((h) => h.numero === numFmt);
  }

  if (himno) {
    await iniciarReproduccionHimno(
      himno.titulo,
      himno.videoPath,
      himno.imagePath,
      null,
    );
  } else {
    console.error(`Contenido no encontrado: ${numeroHimno} (${categoria})`);
    alert("No se encontró el contenido para reproducir.");
  }
}

// Variable global para el modal actual
let modalSelectorHimnosActual = null;

// Crear modal de selección de himnos (estilo Windows)
function crearModalSelectorHimnos(onHimnoSeleccionado) {
  // Crear overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay-himnos";

  // Crear modal
  const modal = document.createElement("div");
  modal.className = "modal-selector-himnos";

  // 1. Encabezado
  const header = document.createElement("div");
  header.className = "modal-header-himnos";
  header.innerHTML = "<h3>Seleccionar Himno</h3>";

  const btnCerrar = document.createElement("button");
  btnCerrar.className = "modal-close-himnos";
  btnCerrar.textContent = "×";
  btnCerrar.onclick = () => cerrarModalHimnos();
  header.appendChild(btnCerrar);

  // 2. Selector de categorías
  const contenedorCategorias = document.createElement("div");
  contenedorCategorias.className = "modal-categorias-himnos";

  const selectCategoria = document.createElement("select");
  selectCategoria.className = "select-categoria-himno";

  Object.entries(categoriasHimnarios).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value;
    selectCategoria.appendChild(option);
  });
  contenedorCategorias.appendChild(selectCategoria);

  // 3. Contenedor Especial (Botones Local/YouTube)
  const contenedorEspecial = document.createElement("div");
  contenedorEspecial.className = "modal-especial-himnos";
  contenedorEspecial.style.cssText =
    "display:flex;flex-direction:column;gap:10px;padding:15px 20px;background:#f0f0f0;border-bottom:1px solid #ddd;";

  const filaBotones = document.createElement("div");
  filaBotones.style.cssText = "display:flex;gap:10px;";

  const btnLocal = document.createElement("button");
  btnLocal.className = "btn-especial-modal local";
  btnLocal.innerHTML = "📁 Archivo Local";
  btnLocal.style.cssText =
    "flex:1;padding:10px;background:#2c3e50;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;transition:0.2s;";
  btnLocal.onmouseover = () => (btnLocal.style.background = "#34495e");
  btnLocal.onmouseout = () => (btnLocal.style.background = "#2c3e50");
  btnLocal.onclick = async () => {
    if (!esPremium) {
      alert(
        "Esta función solo está disponible para usuarios PREMIUM. ¡Apóyanos para desbloquearla!",
      );
      return;
    }
    const ruta = await window.electronAPI.abrirDialogoMultimedia();
    if (ruta) {
      const extension = ruta.split(".").pop().toLowerCase();
      const esImagen = ["jpg", "jpeg", "png", "gif", "webp"].includes(
        extension,
      );
      const nombre = ruta.split(/[\\/]/).pop();
      onHimnoSeleccionado({
        numero: formalizarRuta(ruta),
        titulo: `ARCHIVO: ${nombre}`,
        categoria: esImagen ? "imagen-local" : "video-local",
        videoPath: formalizarRuta(ruta),
        imagePath: null,
      });
      cerrarModalHimnos();
    }
  };

  const btnYoutube = document.createElement("button");
  btnYoutube.className = "btn-especial-modal youtube";
  btnYoutube.innerHTML = "🎬 YouTube / URL";
  btnYoutube.style.cssText =
    "flex:1;padding:10px;background:#c0392b;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;transition:0.2s;";
  btnYoutube.onmouseover = () => (btnYoutube.style.background = "#e74c3c");
  btnYoutube.onmouseout = () => (btnYoutube.style.background = "#c0392b");

  const areaUrl = document.createElement("div");
  areaUrl.style.cssText =
    "display:none;flex-direction:column;gap:10px;margin-top:5px;animation:fadeIn 0.3s;";
  areaUrl.innerHTML = `
    <div style="display:flex;gap:5px;">
      <input type="text" placeholder="Buscar en YouTube o pegar URL..." style="flex:1;padding:10px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
      <button class="btn-buscar-yt" style="padding:10px 15px;background:#c0392b;color:white;border:none;border-radius:4px;cursor:pointer;"><img src="iconos/iconoBuscar.png" style="width:16px;"></button>
    </div>
    <div class="loader-yt" style="display:none;padding:10px;text-align:center;"><div class="spinner" style="border-width:3px;width:20px;height:20px;margin:auto;"></div></div>
    <div class="resultados-yt" style="max-height:250px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></div>
  `;

  const inputYT = areaUrl.querySelector("input");
  const btnBuscarYT = areaUrl.querySelector(".btn-buscar-yt");
  const loaderYT = areaUrl.querySelector(".loader-yt");
  const listaYT = areaUrl.querySelector(".resultados-yt");

  const performSearch = async () => {
    let query = inputYT.value.trim();
    if (!query) return;

    await buscarVideosCore(query, listaYT, loaderYT, btnBuscarYT, (video) => {
      onHimnoSeleccionado({
        numero: `https://www.youtube.com/watch?v=${video.id}`,
        titulo: `YOUTUBE: ${video.title}`,
        categoria: "youtube",
        videoPath: video.id,
        imagePath: video.thumbnail,
      });
      cerrarModalHimnos();
    });
  };

  btnYoutube.onclick = () => {
    if (!esPremium) {
      alert(
        "Esta función solo está disponible para usuarios PREMIUM. ¡Apóyanos para desbloquearla!",
      );
      return;
    }
    areaUrl.style.display = areaUrl.style.display === "flex" ? "none" : "flex";
    if (areaUrl.style.display === "flex") inputYT.focus();
  };

  btnBuscarYT.onclick = performSearch;
  inputYT.onkeydown = (e) => {
    if (e.key === "Enter") performSearch();
  };

  filaBotones.appendChild(btnLocal);
  filaBotones.appendChild(btnYoutube);
  contenedorEspecial.appendChild(filaBotones);
  contenedorEspecial.appendChild(areaUrl);

  // 4. Buscador
  const buscador = document.createElement("div");
  buscador.className = "modal-buscador-himnos";
  const inputBuscar = document.createElement("input");
  inputBuscar.type = "text";
  inputBuscar.placeholder = "Buscar himno por número o título...";
  inputBuscar.className = "input-buscar-himno";
  buscador.appendChild(inputBuscar);

  // 5. Lista de himnos
  const contenedorLista = document.createElement("div");
  contenedorLista.className = "modal-lista-himnos";

  let categoriaActual = "todos";
  let himnos = obtenerHimnosPorCategoria(categoriaActual);

  function renderizarHimnos(filtro = "") {
    contenedorLista.innerHTML = "";
    const himnosFiltrados = filtro
      ? himnos.filter(
          (h) =>
            h.numero.includes(filtro) ||
            h.titulo.toLowerCase().includes(filtro.toLowerCase()),
        )
      : himnos;

    if (himnosFiltrados.length === 0) {
      contenedorLista.innerHTML =
        '<div class="no-resultados">No se encontraron himnos</div>';
      return;
    }

    himnosFiltrados.forEach((himno) => {
      const item = document.createElement("div");
      item.className = "modal-item-himno";
      item.textContent = `HIMNO ${himno.numero} - ${himno.titulo}`;
      item.onclick = () => {
        onHimnoSeleccionado({ ...himno, categoria: categoriaActual });
        cerrarModalHimnos();
      };
      contenedorLista.appendChild(item);
    });
  }

  // Event Listeners
  selectCategoria.addEventListener("change", (e) => {
    const nuevaCategoria = e.target.value;
    categoriaActual = nuevaCategoria;
    cargarDatosCategoria(nuevaCategoria);
    himnos = obtenerHimnosPorCategoria(nuevaCategoria);
    inputBuscar.value = "";
    renderizarHimnos();
  });

  inputBuscar.addEventListener("input", (e) => {
    renderizarHimnos(e.target.value);
  });

  renderizarHimnos();

  // Ensamblar modal
  modal.appendChild(header);
  modal.appendChild(contenedorCategorias);
  modal.appendChild(contenedorEspecial);
  modal.appendChild(buscador);
  modal.appendChild(contenedorLista);
  overlay.appendChild(modal);

  // Cerrar click fuera
  overlay.onclick = (e) => {
    if (e.target === overlay) cerrarModalHimnos();
  };

  return overlay;
}

// Cerrar modal de himnos
function cerrarModalHimnos() {
  if (modalSelectorHimnosActual) {
    modalSelectorHimnosActual.remove();
    modalSelectorHimnosActual = null;
  }
}

// Crear controles de detalle mejorados con selector de himnos
function crearControlesDetalle(valorInicial = "", himnosGuardados = []) {
  const contenedorDetalle = document.createElement("div");
  contenedorDetalle.className = "contenedor-detalle-programacion";

  // Fila principal: Input + Botón +
  const filaPrincipal = document.createElement("div");
  filaPrincipal.className = "fila-principal-detalle";

  // Input de texto principal
  const inputDetalle = document.createElement("input");
  inputDetalle.type = "text";
  inputDetalle.className = "input-detalle";
  inputDetalle.value = valorInicial;
  inputDetalle.placeholder = "Detalles opcionales...";
  inputDetalle.addEventListener("input", guardarProgramacionAuto);

  // Botón "+" para abrir modal de himnos
  const btnMas = document.createElement("button");
  btnMas.className = "btn-mas-detalle";
  btnMas.textContent = "+";
  btnMas.title = "Agregar himno";

  filaPrincipal.appendChild(inputDetalle);
  filaPrincipal.appendChild(btnMas);

  // Contenedor de himnos agregados
  const contenedorHimnos = document.createElement("div");
  contenedorHimnos.className = "contenedor-himnos-agregados";

  // Función visibilidad input
  const actualizarVisibilidadInput = () => {
    if (contenedorHimnos.children.length > 0) {
      inputDetalle.style.display = "none";
    } else {
      inputDetalle.style.display = "block";
    }
  };

  // Función para crear un chip de himno
  const crearChipHimno = (himno) => {
    const chip = document.createElement("div");
    chip.className = "chip-himno";
    chip.dataset.numeroHimno = himno.numero;
    chip.dataset.categoria = himno.categoria || "todos";

    const textoChip = document.createElement("span");

    // Lógica para mostrar título según tipo
    let textoMostrar = himno.titulo || `Himno ${himno.numero}`;

    // Si es YouTube o Local, ya tiene el prefijo en el titulo generado
    // Solo formateamos himnos numéricos estándar
    if (
      (himno.categoria === "todos" || !isNaN(himno.numero)) &&
      !textoMostrar.toLowerCase().includes("himno") &&
      !himno.numero.toString().startsWith("http") &&
      !himno.numero.toString().startsWith("file")
    ) {
      const numLimpio = String(himno.numero)
        .replace(/\D/g, "")
        .padStart(3, "0");
      if (!textoMostrar.includes(numLimpio)) {
        textoMostrar = `HIMNO ${numLimpio} - ${textoMostrar}`;
      }
    }

    // Estilo especial para tipos no himnos
    if (himno.categoria === "youtube") {
      chip.style.borderLeft = "4px solid #c0392b";
    } else if (
      himno.categoria === "video-local" ||
      himno.categoria === "imagen-local"
    ) {
      chip.style.borderLeft = "4px solid #2ecc71";
    }

    textoChip.textContent = textoMostrar;
    textoChip.className = "texto-chip-himno";
    textoChip.title = textoMostrar;

    const btnPlay = document.createElement("button");
    btnPlay.className = "btn-play-chip";
    btnPlay.innerHTML = "▶";
    btnPlay.title = "Reproducir";
    btnPlay.onclick = (e) => {
      e.stopPropagation();
      reproducirHimno(himno.numero, himno.categoria || "todos");
    };

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "btn-eliminar-chip";
    btnEliminar.innerHTML = "×";
    btnEliminar.title = "Eliminar";
    btnEliminar.onclick = (e) => {
      e.stopPropagation();
      chip.remove();
      actualizarVisibilidadInput();
      guardarProgramacionAuto();
    };

    chip.appendChild(textoChip);
    chip.appendChild(btnPlay);
    chip.appendChild(btnEliminar);

    return chip;
  };

  // Cargar himnos guardados si existen
  himnosGuardados.forEach((himnoNumero) => {
    // Si es una URL o ruta local, crear un objeto virtual
    if (
      himnoNumero &&
      (himnoNumero.startsWith("http") || himnoNumero.startsWith("file://"))
    ) {
      const esLocal = himnoNumero.startsWith("file://");
      const esYoutube =
        himnoNumero.includes("youtube.com") || himnoNumero.includes("youtu.be");
      const nombre = himnoNumero.split(/[\\/]/).pop().split("?")[0];

      contenedorHimnos.appendChild(
        crearChipHimno({
          numero: himnoNumero,
          titulo: esYoutube
            ? `YOUTUBE: ${himnoNumero.substring(0, 20)}...`
            : `ARCHIVO: ${nombre}`,
          categoria: esYoutube ? "youtube" : "local",
        }),
      );
      return;
    }

    // Intentar recuperar el objeto completo si es posible
    if (todosLosHimnos.length === 0) cargarDatosCategoria("todos");

    let himno = todosLosHimnos.find((h) => h.numero === himnoNumero);

    if (himno) {
      contenedorHimnos.appendChild(crearChipHimno(himno));
    } else {
      // Fallback básico si no se encuentra el objeto (para no romper la UI)
      contenedorHimnos.appendChild(
        crearChipHimno({
          numero: himnoNumero,
          titulo: `Himno ${himnoNumero}`,
          categoria: "todos",
        }),
      );
    }
  });

  actualizarVisibilidadInput(); // Estado inicial

  // Event listener para botón "+"
  btnMas.addEventListener("click", (e) => {
    e.preventDefault();

    // Crear y mostrar modal
    const modal = crearModalSelectorHimnos((himno) => {
      contenedorHimnos.appendChild(crearChipHimno(himno));
      actualizarVisibilidadInput(); // Actualizar visibilidad
      guardarProgramacionAuto();
    });

    modalSelectorHimnosActual = modal;
    document.body.appendChild(modal);
  });

  contenedorDetalle.appendChild(filaPrincipal);
  contenedorDetalle.appendChild(contenedorHimnos);

  return { contenedorDetalle, inputDetalle, contenedorHimnos };
}

// Guardar programación automáticamente
function guardarProgramacionAuto() {
  const programacion = obtenerDatosProgramacion();
  localStorage.setItem("programacion-eventos", JSON.stringify(programacion));
}

// Obtener datos de la programación
function obtenerDatosProgramacion() {
  const fecha = document.getElementById("fecha-programa")?.value || "";
  const iglesia =
    document.getElementById("nombre-iglesia")?.value || "IASD CENTRAL";

  const servicioGeneral = [];
  const cultoAdoracion = [];

  // Obtener filas del servicio general
  const filasServicio = document.querySelectorAll(
    "#seccion-servicio-general tr.fila-editable",
  );
  filasServicio.forEach((fila) => {
    // Obtener himnos agregados en esta fila
    const chips = fila.querySelectorAll(".chip-himno");
    const himnosAgregados = Array.from(chips).map(
      (chip) => chip.dataset.numeroHimno,
    );

    servicioGeneral.push({
      hora: fila.querySelector(".input-hora")?.value || "",
      descripcion: fila.querySelector(".select-descripcion")?.value || "",
      detalle: fila.querySelector(".input-detalle")?.value || "",
      himnos: himnosAgregados,
      presentacion: fila.querySelector(".input-presentacion")?.value || "",
    });
  });

  // Obtener filas del culto de adoración
  const filasCulto = document.querySelectorAll(
    "#seccion-culto-adoracion tr.fila-editable",
  );
  filasCulto.forEach((fila) => {
    // Obtener himnos agregados en esta fila
    const chips = fila.querySelectorAll(".chip-himno");
    const himnosAgregados = Array.from(chips).map(
      (chip) => chip.dataset.numeroHimno,
    );

    cultoAdoracion.push({
      hora: fila.querySelector(".input-hora")?.value || "",
      descripcion: fila.querySelector(".select-descripcion")?.value || "",
      detalle: fila.querySelector(".input-detalle")?.value || "",
      himnos: himnosAgregados,
      presentacion: fila.querySelector(".input-presentacion")?.value || "",
    });
  });

  return {
    fecha,
    iglesia,
    servicioGeneral,
    cultoAdoracion,
  };
}

// Cargar programación guardada
function cargarProgramacionGuardada() {
  const guardada = localStorage.getItem("programacion-eventos");
  if (!guardada) {
    // Si no hay datos guardados, crear filas por defecto
    agregarFilaSeccion("servicio-general");
    agregarFilaSeccion("culto-adoracion");
    return;
  }

  const programacion = JSON.parse(guardada);

  // Cargar fecha e iglesia
  if (programacion.fecha) {
    const inputFecha = document.getElementById("fecha-programa");
    if (inputFecha) inputFecha.value = programacion.fecha;
    actualizarFechaEnTabla(programacion.fecha);
  }

  if (programacion.iglesia) {
    const inputIglesia = document.getElementById("nombre-iglesia");
    if (inputIglesia) inputIglesia.value = programacion.iglesia;
    actualizarIglesiaEnTabla(programacion.iglesia);
  }

  // Cargar filas del servicio general
  programacion.servicioGeneral?.forEach((fila) => {
    const tbody = document.getElementById("seccion-servicio-general");
    const tr = crearFilaDesdeGuardado(fila, "servicio-general");
    tbody.appendChild(tr);
  });

  // Cargar filas del culto de adoración
  programacion.cultoAdoracion?.forEach((fila) => {
    const tbody = document.getElementById("seccion-culto-adoracion");
    const tr = crearFilaDesdeGuardado(fila, "culto-adoracion");
    tbody.appendChild(tr);
  });

  renumerarFilas("servicio-general");
  renumerarFilas("culto-adoracion");
}

// Crear fila desde datos guardados
function crearFilaDesdeGuardado(datos, seccion) {
  const tr = document.createElement("tr");
  tr.className = "fila-editable";

  // N°
  const tdNumero = document.createElement("td");
  tdNumero.className = "numero";

  // Hora
  const tdHora = document.createElement("td");
  tdHora.className = "hora";
  const inputHora = document.createElement("input");
  inputHora.type = "time";
  inputHora.className = "input-hora";
  inputHora.value = datos.hora || "09:00";
  inputHora.addEventListener("change", guardarProgramacionAuto);
  tdHora.appendChild(inputHora);

  // Descripción
  const tdDescripcion = document.createElement("td");
  const selectDescripcion = crearSelectDescripcion(
    datos.descripcion || "Bienvenida",
  );
  tdDescripcion.appendChild(selectDescripcion);

  // Detalle (CON SELECTOR DE HIMNOS)
  const tdDetalle = document.createElement("td");
  const { contenedorDetalle } = crearControlesDetalle(
    datos.detalle || "",
    datos.himnos || [],
  );
  tdDetalle.appendChild(contenedorDetalle);

  // Presentación
  const tdPresentacion = document.createElement("td");
  const inputPresentacion = document.createElement("input");
  inputPresentacion.type = "text";
  inputPresentacion.className = "input-presentacion";
  inputPresentacion.value = datos.presentacion || "";
  inputPresentacion.placeholder = "Encargado(a)...";
  inputPresentacion.addEventListener("input", guardarProgramacionAuto);
  tdPresentacion.appendChild(inputPresentacion);

  // Botón eliminar
  const tdAcciones = document.createElement("td");
  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "−";
  btnEliminar.className = "btn-eliminar-fila";
  btnEliminar.onclick = () => eliminarFila(tr, seccion);
  tdAcciones.appendChild(btnEliminar);

  tr.appendChild(tdNumero);
  tr.appendChild(tdHora);
  tr.appendChild(tdDescripcion);
  tr.appendChild(tdDetalle);
  tr.appendChild(tdPresentacion);
  tr.appendChild(tdAcciones);

  return tr;
}

// Actualizar fecha en la tabla
function actualizarFechaEnTabla(fecha) {
  const thFecha = document.getElementById("th-fecha");
  if (!thFecha || !fecha) return;

  const [year, month, day] = fecha.split("-");
  const meses = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  thFecha.textContent = `${parseInt(day)} DE ${meses[parseInt(month) - 1]}`;
}

// Actualizar iglesia en la tabla
function actualizarIglesiaEnTabla(iglesia) {
  const thIglesia = document.getElementById("th-iglesia");
  if (thIglesia) {
    thIglesia.textContent = iglesia.toUpperCase();
  }
}

// Guardar programación (botón manual)
function guardarProgramacion() {
  guardarProgramacionAuto();
  alert("✅ Programación guardada correctamente");
}

// Limpiar toda la programación
function limpiarProgramacion() {
  if (
    !confirm(
      "¿Está seguro de limpiar toda la programación? Esta acción no se puede deshacer.",
    )
  ) {
    return;
  }

  // Limpiar filas
  document
    .querySelectorAll("#seccion-servicio-general tr.fila-editable")
    .forEach((fila) => fila.remove());
  document
    .querySelectorAll("#seccion-culto-adoracion tr.fila-editable")
    .forEach((fila) => fila.remove());

  // Limpiar campos
  const inputFecha = document.getElementById("fecha-programa");
  const inputIglesia = document.getElementById("nombre-iglesia");
  if (inputFecha) inputFecha.value = "";
  if (inputIglesia) inputIglesia.value = "IASD CENTRAL";

  // Limpiar localStorage
  localStorage.removeItem("programacion-eventos");

  // Agregar al menos una fila en cada sección
  agregarFilaSeccion("servicio-general");
  agregarFilaSeccion("culto-adoracion");

  alert("✅ Programación limpiada");
}

// Exportar programación a texto (OBSOLETA - ELIMINADA)
// La nueva función exportarProgramacion(formato) maneja PDF y JPG
// Se mantiene este comentario para evitar conflictos de mezcla

// Inicializar sistema de programación
function inicializarProgramacion() {
  cargarOpcionesPersonalizadas();
  renderizarListaOpciones();
  cargarProgramacionGuardada();

  // Event listeners para fecha e iglesia
  const inputFecha = document.getElementById("fecha-programa");
  const inputIglesia = document.getElementById("nombre-iglesia");

  if (inputFecha) {
    inputFecha.addEventListener("change", (e) => {
      actualizarFechaEnTabla(e.target.value);
      guardarProgramacionAuto();
    });
  }

  if (inputIglesia) {
    inputIglesia.addEventListener("input", (e) => {
      actualizarIglesiaEnTabla(e.target.value);
      guardarProgramacionAuto();
    });
  }

  // Manejar Enter en el campo de nueva opción
  const inputNuevaOpcion = document.getElementById("nueva-opcion-programacion");
  if (inputNuevaOpcion) {
    inputNuevaOpcion.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        agregarOpcionDescripcion();
      }
    });
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarProgramacion);
} else {
  inicializarProgramacion();
}

// =======================================================
// MANEJO DE COMANDOS REMOTOS ADICIONALES
// =======================================================

if (window.electronAPI && window.electronAPI.onRemoteCommand) {
  window.electronAPI.onRemoteCommand((data) => {
    // console.log("Comando remoto recibido:", data); // Descomentar para debug
    const { command, data: cmdData } = data;

    if (command === "cambiar-monitor") {
      const monitorId = cmdData.id;
      console.log("🖥️ [REMOTO] Cambiando monitor a:", monitorId);

      // Usar la API expuesta para abrir la ventana
      window.electronAPI.abrirVentanaSecundaria(monitorId);

      // Sincronizar el selector de la UI principal
      const select = document.getElementById("selectMonitores");
      if (select) {
        select.value = monitorId;
      }

      // Replicar lógica de cambio de modo (Pro/Normal)
      const esPremium = localStorage.getItem("premium") === "true";

      if (monitorId === -1 || isNaN(monitorId)) {
        // Desactivar
        if (typeof activarModoNormal === "function") activarModoNormal();
      } else {
        // Activar según premium
        if (esPremium) {
          if (typeof activarModoPro === "function") activarModoPro();
        } else {
          if (typeof activarModoNormal === "function") activarModoNormal();
        }
      }
    } else if (command === "buscar-youtube") {
      const query = cmdData.query;
      console.log("🎬 [REMOTO] Buscando en YouTube (UI):", query);

      const input = document.getElementById("busqueda-youtube");
      const btn = document.getElementById("buscar-youtube-boton");

      if (input && btn) {
        // Intentar abrir la pestaña de YouTube si no está activa
        // Buscamos botones comunes
        const navBtn =
          document.getElementById("botonYoutube") ||
          document.querySelector(".botonYoutube");
        if (navBtn) {
          // Chequear si la ventana de YouTube ya está visible para evitar cerrarla (toggle)
          const ventanaYT = document.getElementById("ventanaYouTube");
          let yaVisible = false;

          if (ventanaYT) {
            const style = window.getComputedStyle(ventanaYT);
            if (style.display !== "none" && style.visibility !== "hidden") {
              yaVisible = true;
            }
          } else {
            // Fallback: verificar clases en el botón
            if (
              navBtn.classList.contains("active") ||
              navBtn.classList.contains("seleccionado")
            ) {
              yaVisible = true;
            }
          }

          if (!yaVisible) {
            navBtn.click();
          }
        }

        // Pequeño delay para asegurar que el contenedor esté listo antes de buscar
        setTimeout(() => {
          input.value = query;
          btn.click();
        }, 100);
      } else {
        console.error(
          "[REMOTO] No se encontraron elementos de búsqueda YouTube en la UI",
        );
      }
    } else if (command === "reproducir-youtube") {
      console.log("🎬 [REMOTO] Reproduciendo YouTube:", cmdData);

      const videoData = {
        numero: "YT",
        titulo: `YOUTUBE: ${cmdData.title}`,
        categoria: "youtube",
        videoPath: cmdData.id,
        imagePath: cmdData.thumbnail,
      };

      const lista = [videoData];

      // Verificar si existe la función estándar (usada internamente en buscarVideosCore)
      if (typeof youtubeClapprEstandar === "function") {
        youtubeClapprEstandar(cmdData.id, cmdData.thumbnail, lista);
      }
      // Si estamos en modo PRO con monitor, podría usarse la otra
      else if (
        typeof youtubeClappr === "function" &&
        typeof esMonitorActivo === "function" &&
        esMonitorActivo()
      ) {
        youtubeClappr(cmdData.id, cmdData.thumbnail, lista);
      } else {
        console.error(
          "[REMOTO] No se encontró función para reproducir YouTube",
        );
      }
    }
  });
}

// =======================================================
// LÓGICA MANUAL DE USUARIO
// =======================================================

async function cargarManual() {
  if (!ventanaManual) return;

  // Evitar recargar si ya tiene contenido, salvo que esté vacío
  if (ventanaManual.innerHTML.trim().length > 100) return;

  try {
    // Intentamos cargar el manual. Si no existe, usamos un contenido por defecto
    let text = "";
    try {
      const response = await fetch("MANUAL.md");
      if (response.ok) {
        text = await response.text();
      } else {
        throw new Error("Archivo no encontrado");
      }
    } catch (err) {
      text = `# Manual de Usuario
            
## Introducción
Bienvenido a **Himnario Pro**, la solución definitiva para la gestión multimedia en iglesias.

## Características
- **Búsqueda Avanzada**: Encuentra himnos rápidamente.
- **Control Remoto**: Gestiona todo desde tu móvil.
- **Biblia Integrada**: Múltiples versiones disponibles.

## Primeros Pasos
1. Abre la aplicación.
2. Selecciona un himno.
3. ¡Proyecta!

## Solución de Problemas
Si tienes dudas, contacta a soporte.
`;
    }

    // Parser Markdown Simple
    const lines = text.split("\n");
    let htmlContent = `<div class="manual-content" id="manualContentArea">`;
    let sidebarContent = `<div class="manual-sidebar">
                            <div class="manual-title">Manual de Usuario</div>
                            <div class="manual-toc-link active" onclick="scrollToManualSection('intro', this)">Inicio</div>`;

    let inList = false;
    const slugify = (text) => text.toLowerCase().replace(/[^\w]+/g, "-");

    lines.forEach((line, index) => {
      line = line.trim();

      if (line.startsWith("# ")) {
        const title = line.substring(2);
        htmlContent += `<h1 id="intro">${title}</h1>`;
        // Botón elegante para abrir manual PDF extra
        htmlContent += `
          <div style="width:100%; display:flex; justify-content:center; margin-bottom: 20px;">
            <button onclick="abrirVisorPdf()" class="btn-manual-extra">
              <i class="fa-solid fa-file-pdf"></i> Abrir manual extra
            </button>
          </div>
        `;
      } else if (line.startsWith("## ")) {
        const title = line.substring(3);
        const id = slugify(title) || "sec-" + index;
        htmlContent += `<h2 id="${id}">${title}</h2>`;
        sidebarContent += `<a class="manual-toc-link" onclick="scrollToManualSection('${id}', this)">${title}</a>`;
      } else if (line.startsWith("### ")) {
        const title = line.substring(4);
        htmlContent += `<h3>${title}</h3>`;
        sidebarContent += `<div class="manual-toc-sub">${title}</div>`;
      } else if (line.startsWith("- ")) {
        if (!inList) {
          htmlContent += "<ul>";
          inList = true;
        }
        const content = line
          .substring(2)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        htmlContent += `<li>${content}</li>`;
      } else if (line.startsWith("![")) {
        // Soporte para imágenes
        const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          htmlContent += `<div style="text-align:center; margin: 10px 0;">
                            <img src="${imgMatch[2]}" alt="${imgMatch[1]}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                          </div>`;
        }
      } else if (line.length > 0) {
        if (inList) {
          htmlContent += "</ul>";
          inList = false;
        }
        // Soporte para negrita y también imágenes en línea si las hubiera
        let content = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Renderizar imagenes en línea también si es necesario (aunque el bloque de arriba cubre el caso común)
        content = content.replace(
          /!\[(.*?)\]\((.*?)\)/g,
          '<img src="$2" alt="$1" style="max-width:100%; vertical-align:middle;">',
        );

        htmlContent += `<p>${content}</p>`;
      } else {
        if (inList) {
          htmlContent += "</ul>";
          inList = false;
        }
      }
    });

    if (inList) {
      htmlContent += "</ul>";
    }
    htmlContent += `</div>`;
    sidebarContent += `</div>`;

    ventanaManual.innerHTML = sidebarContent + htmlContent;
  } catch (e) {
    console.error(e);
  }
}

// Función global para scroll
window.scrollToManualSection = function (id, element) {
  const el = document.getElementById(id);
  const container = document.getElementById("manualContentArea");

  if (el && container) {
    // Scroll DENTRO del contenedor, no toda la página
    const offsetTop = el.offsetTop - container.offsetTop;
    container.scrollTo({
      top: offsetTop - 20, // 20px de margen superior
      behavior: "smooth",
    });
  }

  // Update active state
  if (element) {
    document
      .querySelectorAll(".manual-toc-link")
      .forEach((a) => a.classList.remove("active"));
    element.classList.add("active");
  }
};

if (botonManual) {
  botonManual.addEventListener("click", function () {
    const displayActual = getComputedStyle(ventanaManual).display;

    if (displayActual === "none") {
      ventanaHimnosPro.style.display = "none";
      ventanaBiblia.style.display = "none";
      ventanaYouTube.style.display = "none";
      himnarioContainer.style.display = "none";
      ventanaPowerPoint.style.display = "none";
      ventanaProgramacion.style.display = "none";
      ventanaManual.style.display = "flex";
      ventanaPelis.style.display = "none";
      cargarManual();
      document.getElementById("contenedor-contador").style.display = "none";
    } else {
      ventanaHimnosPro.style.display = "none";
      ventanaBiblia.style.display = "none";
      ventanaYouTube.style.display = "none";
      ventanaPowerPoint.style.display = "none";
      ventanaProgramacion.style.display = "none";
      ventanaManual.style.display = "none";
      ventanaPelis.style.display = "none";
      himnarioContainer.style.display = "grid";
    }
  });
}

// =======================================================
// VISOR PDF MANUAL EXTRA
// =======================================================
function abrirVisorPdf() {
  // Crear modal si no existe en el DOM
  let modal = document.getElementById('modal-manual-pdf');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-manual-pdf';
    modal.className = 'modal-pdf-overlay';
    
    // Contenido del modal
    modal.innerHTML = `
      <div class="modal-pdf-content">
        <div class="modal-pdf-header">
          <div class="modal-pdf-title">
            <i class="fa-solid fa-book-open"></i> Visor de Manual Extra
          </div>
          <button onclick="cerrarVisorPdf()" class="modal-pdf-close" title="Cerrar">
             <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div class="modal-pdf-body">
           <iframe src="manual/manual.pdf" allowfullscreen></iframe>
           
           <div class="pdf-error-fallback" id="pdf-error-fallback" style="display:none; padding:40px; text-align:center;">
              <i class="fa-solid fa-circle-exclamation" style="font-size:40px; color:#e74c3c; margin-bottom:15px;"></i>
              <h3>No se encontró el manual PDF</h3>
              
           </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const iframe = modal.querySelector('iframe');
    const fallback = modal.querySelector('#pdf-error-fallback');

    // Intentar detectar error de carga (limitado para iframes locales pero útil)
    iframe.onload = function() {
        // Si carga ok
    };
    iframe.onerror = function() {
        iframe.style.display = 'none';
        fallback.style.display = 'block';
    };
  }
  
  // Mostrar modal con animación
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('visible');
  }, 10);
}

function cerrarVisorPdf() {
  const modal = document.getElementById('modal-manual-pdf');
  if (modal) {
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.style.display = 'none';
      // Reset iframe src to stop playing if video/audio inside PDF (unlikely but good practice)
      const iframe = modal.querySelector('iframe');
      if(iframe) {
          const src = iframe.src;
          iframe.src = '';
          iframe.src = src;
      }
    }, 300);
  }
}

