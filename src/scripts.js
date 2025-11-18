// PayPal suscripción y validación de pago
let player = null;
let playerYouTube = null;
let playerWindow = null;
let botonPRO = false;
let botonLista = false;
let botonFondo = false;
let esPremium = false;
let waterMark = "";
let modo = "live"; // o "sandbox"
//modo = "sandbox";

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
async function validarPremium() {
  const subscriptionId = localStorage.getItem("paypalSubscriptionId");
  console.log("Id de suscripción en almacanamiento: ", subscriptionId);

  if (!subscriptionId) {
    localStorage.setItem("premium", "false");
    aplicarEstadoPremium(false);
    return;
  }

  try {
    const res = await fetch(
      `https://verificador-paypal.vercel.app/api/verificaPremium?subscriptionId=${subscriptionId}&modo=${modo}`
    );
    const data = await res.json();

    if (data.premium === true) {
      localStorage.setItem("premium", "true");
      aplicarEstadoPremium(true);
    } else {
      localStorage.setItem("premium", "false");
      aplicarEstadoPremium(false);
    }
  } catch (err) {
    console.error("❌ Error al verificar premium:", err);
    localStorage.setItem("premium", "false");
    aplicarEstadoPremium(false);
  }
}
function aplicarEstadoPremium(esPremiumAux) {
  if (esPremiumAux) {
    waterMark = "";
    botonPremium.style.display = "none";
    contenedorPremium.style.display = "none";
    document.querySelectorAll(".contenedorPremiumActivado").forEach((el) => {
      el.style.display = "flex";
    });
    contenedorMonitor.style.display = "flex";
  } else {
    waterMark = "imagenes/logo-proyectoja.png";
    botonPremium.style.display = "flex";
    document.querySelectorAll(".contenedorPremiumActivado").forEach((el) => {
      el.style.display = "none";
    });
    contenedorMonitor.style.display = "none";
  }
}

//localStorage.setItem("paypalSubscriptionId", "");
const botonPremium = document.getElementById("botonPremium");
const contenedorPremium = document.getElementById("paypal-button-container");
async function validarCodigos() {
  const codigoIngresado = document.getElementById('codigoUnico').value.trim();
  
  // Si el campo está vacío pero hay un subscriptionId almacenado, validar ese
  const subscriptionIdAlmacenado = localStorage.getItem("paypalSubscriptionId");
  
  let codigoAValidar = codigoIngresado;
  
  if (!codigoIngresado && subscriptionIdAlmacenado) {
    codigoAValidar = subscriptionIdAlmacenado;
  }
  
  if (!codigoAValidar) {
    alert("⚠️ Ingresa un código primero.");
    return;
  }
  
  try {
    // Validar en el servidor
    const res = await fetch(
      `https://verificador-paypal.vercel.app/api/verificaPremium?subscriptionId=${codigoAValidar}&modo=${modo}`
    );
    
    if (!res.ok) {
      throw new Error('Error al conectar con el servidor');
    }
    
    const data = await res.json();

    if (data.premium === true) {
      alert("✅ Código válido, acceso premium activado");
      
      // Guardar el subscriptionId si es válido
      if (codigoIngresado) {
        localStorage.setItem("paypalSubscriptionId", codigoIngresado);
      }
      
      localStorage.setItem("premium", "true");
      aplicarEstadoPremium(true);
      
    } else {
      alert("❌ Código inválido o expirado.");
      
      // Si estamos validando el código almacenado y no es válido, limpiarlo
      if (!codigoIngresado && subscriptionIdAlmacenado) {
        localStorage.removeItem("paypalSubscriptionId");
        localStorage.setItem("premium", "false");
        aplicarEstadoPremium(false);
      } else {
        localStorage.setItem("premium", "false");
        aplicarEstadoPremium(false);
      }
    }
  } catch (err) {
    console.error("❌ Error al verificar premium:", err);
    alert("❌ Error al conectar con el servidor. Intenta nuevamente.");
    localStorage.setItem("premium", "false");
    aplicarEstadoPremium(false);
  }
}

botonPremium.addEventListener("click", function () {
  const displayContenedorPremium = getComputedStyle(contenedorPremium).display;

  if (displayContenedorPremium === "none") {
    contenedorPremium.textContent = "";
    validarPremium();
    const subscriptionIdDos = localStorage.getItem("paypalSubscriptionId");
    
    // Aplicar estilos mejorados al contenedor principal
    contenedorPremium.style.display = "flex";
    contenedorPremium.style.flexDirection = "column";
    contenedorPremium.style.padding = "15px";
    contenedorPremium.style.overflowY = "auto";
    contenedorPremium.style.overflowX = "hidden";
    contenedorPremium.style.maxHeight = "70%";
    contenedorPremium.style.width = "auto";
    contenedorPremium.style.minWidth = "400px";
    contenedorPremium.style.maxWidth = "90vw";

    // Contenedor interno para mejor control
    const contenedorInterno = document.createElement("div");
    contenedorInterno.style.width = "100%";
    contenedorInterno.style.display = "flex";
    contenedorInterno.style.flexDirection = "column";
    contenedorInterno.style.gap = "15px";

    // Título principal
    const tituloPrincipal = document.createElement("h2");
    tituloPrincipal.textContent = "Actualiza tu Experiencia";
    tituloPrincipal.style.color = "#FFF8DC";
    tituloPrincipal.style.textAlign = "center";
    tituloPrincipal.style.margin = "0";
    tituloPrincipal.style.fontFamily = "Arial, sans-serif";
    tituloPrincipal.style.fontSize = "22px";
    tituloPrincipal.style.fontWeight = "bold";
    tituloPrincipal.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
    contenedorInterno.appendChild(tituloPrincipal);

    // Contenedor de comparación (layout horizontal para pantallas grandes, vertical para móviles)
    const contenedorComparacion = document.createElement("div");
    contenedorComparacion.style.display = "flex";
    contenedorComparacion.style.flexDirection = "row";
    contenedorComparacion.style.gap = "10px";
    contenedorComparacion.style.flexWrap = "wrap";
    contenedorComparacion.style.justifyContent = "center";

    // Columna Versión Gratis
    const columnaGratis = document.createElement("div");
    columnaGratis.style.flex = "1";
    columnaGratis.style.minWidth = "180px";
    columnaGratis.style.background = "linear-gradient(135deg, #F5F5DC 0%, #DEB887 100%)";
    columnaGratis.style.padding = "12px";
    columnaGratis.style.borderRadius = "8px";
    columnaGratis.style.textAlign = "center";
    columnaGratis.style.boxShadow = "0 4px 8px rgba(139, 69, 19, 0.2)";
    columnaGratis.style.border = "2px solid #D2B48C";

    const tituloGratis = document.createElement("h3");
    tituloGratis.textContent = "🎵 Gratis";
    tituloGratis.style.color = "#8B4513";
    tituloGratis.style.margin = "0 0 10px 0";
    tituloGratis.style.fontSize = "18px";
    tituloGratis.style.fontWeight = "bold";

    const listaGratis = document.createElement("ul");
    listaGratis.style.textAlign = "left";
    listaGratis.style.color = "#654321";
    listaGratis.style.listStyle = "none";
    listaGratis.style.padding = "0";
    listaGratis.style.margin = "0";
    listaGratis.style.fontSize = "14px";
    listaGratis.innerHTML = `
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #8B4513; position: absolute; left: 0;">✅</span> Todos los himnos
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #8B4513; position: absolute; left: 0;">✅</span> Búsqueda y filtros
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #8B4513; position: absolute; left: 0;">✅</span> Listas de reproducción
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #DC143C; position: absolute; left: 0;">❌</span> Con marca de agua
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #DC143C; position: absolute; left: 0;">❌</span> YouTube limitado
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #DC143C; position: absolute; left: 0;">❌</span> Proyección estándar
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #DC143C; position: absolute; left: 0;">❌</span> Biblia y versiones
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #DC143C; position: absolute; left: 0;">❌</span> Himnos personalizables
      </li>
    `;

    columnaGratis.appendChild(tituloGratis);
    columnaGratis.appendChild(listaGratis);
    contenedorComparacion.appendChild(columnaGratis);

    // Columna Versión Premium
    const columnaPremium = document.createElement("div");
    columnaPremium.style.flex = "1";
    columnaPremium.style.minWidth = "180px";
    columnaPremium.style.background = "linear-gradient(135deg, #D2691E 0%, #CD853F 100%)";
    columnaPremium.style.padding = "12px";
    columnaPremium.style.borderRadius = "8px";
    columnaPremium.style.textAlign = "center";
    columnaPremium.style.boxShadow = "0 4px 8px rgba(210, 105, 30, 0.4)";
    columnaPremium.style.border = "2px solid #F4A460";
    columnaPremium.style.position = "relative";

    const tituloPremium = document.createElement("h3");
    tituloPremium.textContent = "⭐ Premium";
    tituloPremium.style.color = "#FFF8DC";
    tituloPremium.style.margin = "0 0 10px 0";
    tituloPremium.style.fontSize = "18px";
    tituloPremium.style.fontWeight = "bold";
    tituloPremium.style.textShadow = "1px 1px 2px rgba(0,0,0,0.3)";

    const listaPremium = document.createElement("ul");
    listaPremium.style.textAlign = "left";
    listaPremium.style.color = "#FFF8DC";
    listaPremium.style.listStyle = "none";
    listaPremium.style.padding = "0";
    listaPremium.style.margin = "0";
    listaPremium.style.fontSize = "14px";
    listaPremium.innerHTML = `
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> <strong>Sin marca de agua</strong>
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> YouTube ilimitado
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> Máxima velocidad
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> Proyección profesional
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> Biblia y versiones
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> Himnos personalizables
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> Soporte prioritario
      </li>
      <li style="margin-bottom: 6px; padding-left: 18px; position: relative;">
        <span style="color: #FFD700; position: absolute; left: 0;">✅</span> Actualizaciones
      </li>
    `;

    columnaPremium.appendChild(tituloPremium);
    columnaPremium.appendChild(listaPremium);
    contenedorComparacion.appendChild(columnaPremium);

    contenedorInterno.appendChild(contenedorComparacion);

    // Sección de código de suscripción
    const seccionCodigo = document.createElement("div");
    seccionCodigo.style.width = "100%";
    seccionCodigo.style.background = "rgba(245, 222, 179, 0.95)";
    seccionCodigo.style.padding = "15px";
    seccionCodigo.style.borderRadius = "8px";
    seccionCodigo.style.marginBottom = "0";
    seccionCodigo.style.textAlign = "center";
    seccionCodigo.style.border = "1px solid #D2B48C";

    const tituloCodigo = document.createElement("h4");
    tituloCodigo.textContent = "🔑 ¿Ya tienes un código?";
    tituloCodigo.style.color = "#8B4513";
    tituloCodigo.style.margin = "0 0 12px 0";
    tituloCodigo.style.fontSize = "16px";
    tituloCodigo.style.fontWeight = "bold";

    const contenedorInput = document.createElement("div");
    contenedorInput.style.display = "flex";
    contenedorInput.style.flexDirection = "column";
    contenedorInput.style.gap = "10px";
    contenedorInput.style.alignItems = "center";

    const codigoUnico = document.createElement("input");
    codigoUnico.id = "codigoUnico";
    codigoUnico.type = "text";
    codigoUnico.placeholder = subscriptionIdDos ? subscriptionIdDos : "Ingresa tu código premium...";
    codigoUnico.style.width = "100%";
    codigoUnico.style.maxWidth = "250px";
    codigoUnico.style.padding = "10px 12px";
    codigoUnico.style.border = "2px solid #D2B48C";
    codigoUnico.style.borderRadius = "20px";
    codigoUnico.style.fontSize = "14px";
    codigoUnico.style.outline = "none";
    codigoUnico.style.background = "#FFF8DC";
    codigoUnico.style.color = "#8B4513";
    codigoUnico.style.transition = "all 0.3s ease";

    codigoUnico.addEventListener("focus", function() {
      this.style.borderColor = "#8B4513";
      this.style.boxShadow = "0 0 8px rgba(139, 69, 19, 0.3)";
    });

    codigoUnico.addEventListener("blur", function() {
      this.style.borderColor = "#D2B48C";
      this.style.boxShadow = "none";
    });

    const botonValidar = document.createElement("button");
    botonValidar.textContent = "🔓 Activar Premium";
    botonValidar.style.padding = "10px 20px";
    botonValidar.style.background = "linear-gradient(135deg, #8B4513, #A0522D)";
    botonValidar.style.color = "#FFF8DC";
    botonValidar.style.border = "none";
    botonValidar.style.borderRadius = "20px";
    botonValidar.style.fontSize = "14px";
    botonValidar.style.fontWeight = "bold";
    botonValidar.style.cursor = "pointer";
    botonValidar.style.transition = "all 0.3s ease";
    botonValidar.style.boxShadow = "0 3px 10px rgba(139, 69, 19, 0.3)";
    botonValidar.style.minWidth = "150px";

    botonValidar.addEventListener("mouseover", function() {
      this.style.transform = "translateY(-1px)";
      this.style.boxShadow = "0 5px 15px rgba(139, 69, 19, 0.4)";
    });

    botonValidar.addEventListener("mouseout", function() {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "0 3px 10px rgba(139, 69, 19, 0.3)";
    });

    botonValidar.onclick = () => validarCodigos();

    contenedorInput.appendChild(codigoUnico);
    contenedorInput.appendChild(botonValidar);

    seccionCodigo.appendChild(tituloCodigo);
    seccionCodigo.appendChild(contenedorInput);
    contenedorInterno.appendChild(seccionCodigo);

    // Separador
    const separador = document.createElement("div");
    separador.style.width = "100%";
    separador.style.textAlign = "center";
    separador.style.margin = "10px 0";
    separador.style.position = "relative";

    const textoSeparador = document.createElement("span");
    textoSeparador.textContent = "O compra tu licencia por $1,99";
    textoSeparador.style.background = "linear-gradient(135deg, #8B4513 0%, #A0522D 100%)";
    textoSeparador.style.color = "#FFF8DC";
    textoSeparador.style.padding = "6px 15px";
    textoSeparador.style.borderRadius = "15px";
    textoSeparador.style.fontSize = "14px";
    textoSeparador.style.fontWeight = "bold";
    textoSeparador.style.border = "1px solid #D2691E";

    separador.appendChild(textoSeparador);
    contenedorInterno.appendChild(separador);

    // Mensaje motivacional
    const mensajeMotivacional = document.createElement("div");
    mensajeMotivacional.style.textAlign = "center";
    mensajeMotivacional.style.marginBottom = "15px";
    mensajeMotivacional.style.padding = "10px";
    mensajeMotivacional.style.background = "rgba(210, 105, 30, 0.2)";
    mensajeMotivacional.style.borderRadius = "8px";
    mensajeMotivacional.style.border = "1px solid rgba(210, 105, 30, 0.3)";

    const textoMotivacional = document.createElement("p");
    textoMotivacional.innerHTML = "✨ <strong>¡Sé un ángel de esperanza!</strong> ✨";
    textoMotivacional.style.color = "#FFF8DC";
    textoMotivacional.style.margin = "0";
    textoMotivacional.style.fontSize = "14px";
    textoMotivacional.style.lineHeight = "1.3";
    textoMotivacional.style.textShadow = "1px 1px 2px rgba(0,0,0,0.3)";

    mensajeMotivacional.appendChild(textoMotivacional);
    contenedorInterno.appendChild(mensajeMotivacional);

    // Contenedor de PayPal - ESPACIO RESERVADO
    const paypalContainer = document.createElement("div");
    paypalContainer.id = "paypal-button-container-inner";
    paypalContainer.style.width = "100%";
    paypalContainer.style.minHeight = "50px";
    paypalContainer.style.display = "flex";
    paypalContainer.style.justifyContent = "center";
    paypalContainer.style.alignItems = "center";
    paypalContainer.style.marginBottom = "10px";

    // Texto temporal mientras carga PayPal
    const textoCargaPayPal = document.createElement("div");
    textoCargaPayPal.textContent = "Cargando opciones de pago...";
    textoCargaPayPal.style.color = "#FFF8DC";
    textoCargaPayPal.style.fontSize = "12px";
    textoCargaPayPal.style.fontStyle = "italic";
    paypalContainer.appendChild(textoCargaPayPal);

    contenedorInterno.appendChild(paypalContainer);

    // Agregar contenedor interno al principal
    contenedorPremium.appendChild(contenedorInterno);

    // NUEVO: Mensaje sobre cambios en el monto
    const mensajeMonto = document.createElement("div");
    mensajeMonto.style.textAlign = "center";
    mensajeMonto.style.marginTop = "5px";
    mensajeMonto.style.padding = "8px";
    mensajeMonto.style.background = "rgba(139, 69, 19, 0.3)";
    mensajeMonto.style.borderRadius = "6px";
    mensajeMonto.style.border = "1px solid rgba(210, 105, 30, 0.4)";

    const textoMonto = document.createElement("p");
    textoMonto.innerHTML = "💡 <strong>Nota:</strong> El monto puede variar según actualizaciones futuras del servicio. Los suscriptores actuales mantienen su tarifa.";
    textoMonto.style.color = "#FFF8DC";
    textoMonto.style.margin = "0";
    textoMonto.style.fontSize = "10px";
    textoMonto.style.lineHeight = "1.2";
    textoMonto.style.textShadow = "1px 1px 1px rgba(0,0,0,0.3)";
    textoMonto.style.fontStyle = "italic";

    mensajeMonto.appendChild(textoMonto);
    contenedorInterno.appendChild(mensajeMonto);

    // Agregar contenedor interno al principal
    contenedorPremium.appendChild(contenedorInterno);

    // Inicializar PayPal después de un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      paypalContainer.innerHTML = ""; // Limpiar texto temporal
      
      paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "subscribe",
            height: 40,
            tagline: false
          },
          createSubscription: function (data, actions) {
            return actions.subscription.create({
              plan_id: "P-40E25374WC496032ENB62ANQ",
            });
          },
          onApprove: function (data, actions) {
            const subscriptionId = data.subscriptionID;
            alert("🎉 ¡Suscripción exitosa! Ahora disfrutas de todas las ventajas premium.");

            localStorage.setItem("paypalSubscriptionId", subscriptionId);
            localStorage.setItem("premium", "true");

            location.reload();
          },
          onCancel: function () {
            alert("Suscripción cancelada. Puedes intentarlo nuevamente cuando lo desees.");
          },
          onError: function (err) {
            alert("❌ Error con el proceso de pago. Por favor, intenta nuevamente.");
            console.error("Error con PayPal:", err);
          },
        })
        .render("#paypal-button-container-inner");
    }, 100);

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


// Función para crear los contenedores de himnos
function crearHimno(titulo, videoPath, imagePath, lista, duracion) {
  const container = document.createElement("div");
  container.classList.add("video-container");

  const triangulo = document.createElement("div");
  triangulo.className = "triangulo";
  container.appendChild(triangulo);

  // Imagen de portada
  const img = document.createElement("img");
  img.src = imagePath;
  img.alt = titulo;
  img.loading = "lazy";

  // título
  const h3 = document.createElement("h3");
  h3.textContent = titulo;

  // evento de clic en la imagen
  img.onclick = function () {
    if (botonPRO == false) {
      audioHimno.pause();
      // Limpiar el contenedor de video antes de cargar uno nuevo
      videoPlayerContainer.innerHTML = "";
      videoPlayerContainer.appendChild(closePlayerButton);
      closePlayerButton.style.display = "flex";

      if (botonLista == false) {
        // Crear el reproductor Clappr
        player = new Clappr.Player({
          source: videoPath,
          parentId: "#videoPlayerContainer",
          width: "100%",
          height: "100vh",
          preload: "auto",
          autoPlay: false,
          volume: 100,
          poster: imagePath,
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
            waterMark: waterMark
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
            waterMark: waterMark
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
            waterMark: waterMark
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
            waterMark: waterMark
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

  // Limpiar el contenedor de video antes de cargar uno nuevo
  videoPlayerContainer.innerHTML = "";
  videoPlayerContainer.appendChild(closePlayerButton);
  closePlayerButton.style.display = "flex";

  // Crear el reproductor Clappr
  player = new Clappr.Player({
    source: himnoAleatorio.videoPath,
    parentId: "#videoPlayerContainer",
    width: "100%",
    height: "100vh",
    preload: "auto",
    autoPlay: true,
    volume: 100,
    disableVideoTagContextMenu: true,
    poster: himnoAleatorio.imagePath,
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
  for (let i = inicio; i <= fin; i += tamanoLote) {
    const finLote = Math.min(i + tamanoLote - 1, fin);
    
    // Procesar lote actual
    for (let j = i; j <= finLote; j++) {
      const numero = j.toString().padStart(3, "0");
      const titulo = titulos[j - 1] || `Himno ${numero}`;
      const videoPath = srcAux+`videos/${numero}.mp4`;
      const imagePath = srcAux+`portadas/${numero}.jpg`;
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
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

function ventanaSecundaria(
  videoPath,
  imagePath,
  versiculo,
  libroAux,
  estilosAux,
  lista,
  fondoBody,
  imagen,
  waterMark
) {
  // Si la ventana no está abierta, la creamos y cargamos el contenido

  if (!playerWindow || playerWindow.closed) {
    playerWindow = window.open("", "playerWindow", "width=800,height=600");

    // Contenido HTML con Clappr
    const newWindowContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="description" content="Compartiendo esperanza!">
                <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Para Internet Explorer -->
                <link rel="icon" href="iconos/iconoWindows.ico" type="image/ico">
                <title>Ventana Secundaria Reproductor Himnario PRO | PROYECTO JA</title>
                
                <script type="text/javascript" charset="utf-8" src="clappr.js"></script>
                <script type="text/javascript" charset="utf-8" src="clappr-playback-rate.js"></script>
                <script type="text/javascript" charset="utf-8" src="clappr-youtube-playback.js"></script>
                <script type="text/javascript" charset="utf-8" src="clappr-pip-plugin.js"></script>
                <link rel="stylesheet" href="styles.css">
                <style>
                body{
                    background-image: url('imagenes/fondoBienvenida.jpg');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    z-index: 1;

                }
                    * {
          text-decoration: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-user-drag: none;
        }
                #contenedor-principal, #videoPlayerContainer {
                        display: none; /* Ambos contenedores inician ocultos */
                    }
                #contenedor-principal{
                    background-color: brown;
                    width: 100%;
                    height: 100%;
                    margin: 0%;
                    padding: 0%;
                    box-sizing: border-box;
                    overflow: hidden;
                    position: absolute;
                    z-index: 2;
                }
                    #contenedorImg{
                    z-index: 6;
                    width: 100%;
                    height: 100vh;
                    display: none;
  justify-content: center;
  justify-items: center;
  align-items: center;
  background-color: black;
  overflow: hidden;
  display: none;
                    }
 #contenedorImg img{
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  margin: auto;
  }
                #vista-previaVS {
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    background-color: transparent;
                    overflow: hidden;
                    padding: 0;
                    justify-content: center;
                    padding: 20px;
                    width: 100%;
                    height: 100%;
                    color: #fff;
                    box-sizing: border-box;
                    background-position: bottom;
                    background-repeat: no-repeat;
                    background-size: cover;
                    z-index: 3;
                    transition: opacity 0.3s ease;
                    h3 {
                        position: relative;
                        z-index: 5;
                        margin: 0%;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }

                    p {
                        position: relative;
                        z-index: 5;
                        margin: 0%;
                    }
                }

                #fondoVS {
                    display: flex;
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    box-sizing: border-box;
                    background-color: #000;
                    top: 0;
                    left: 0;
                    opacity: 0;
                    /* Nivel inicial de opacidad */
                    transition: opacity 0.3s ease;
                    /* Transición suave */
                    z-index: 4;
                }
                #fullscreenButton {
                        position: absolute;
                        font-size: 50px;
                        font-weight: bold;
                        top: 20px;
                        right: 20px;
                        padding: 10px 20px;
                        background-color: rgba(0, 0, 0, 0.7);
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        z-index: 6;
                    }
                    #fullscreenButton:hover {border: 2px solid #ccc;}
                    #fullscreenButton.hidden {
                        display: none;
                    }
                    #vista-previaVS img {
                        width: 450px;
                        height: auto;
                        display: flex;
                        position: absolute;
                        left: 20px;
                        bottom: 10px;
                        z-index: 4;
                    }

#player-container-youtube {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 7;
  overflow: hidden;
}

#player-youtube {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#player-youtube iframe {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* para que no se recorte */
  border: none;
  z-index: 8;
}


                </style>
            </head>
            <body>
                <div id="contenedor-principal">
                    <div id="vista-previaVS">
                        <div id="fondoVS"></div>
                        <p id="versiculoVS"></p></br>
                        <h3 id="tituloVS"></h3>
                        <img id="waterMark">
                    </div>
                </div>
                <button id="fullscreenButton">Pantalla Completa</button>
                <div id="videoPlayerContainer"></div>
                <div id="contenedorImg"><img id="idImg"></div>
                <div id="player-container-youtube" style='
                    align-items:center; 
                    width: 100%; 
                    height: 100%;
                    background-color: transparent;
                    justify-content:center; 
                    display:none;
                    position:absolute;
                    margin:auto;
                    overflow:hidden;'>
                    <div id="player-youtube"></div>
                </div>
                
                <script>
                let player = null;
                let playerYouTube = null;
                let waterMarkAux = "";
                    const fullscreenButton = document.getElementById("fullscreenButton");
                    const contenedorPrincipal = document.getElementById("contenedor-principal");
                    const vistaPrevia = document.getElementById("vista-previaVS");
                    const versiculoContainer = document.getElementById("versiculoVS");
                    const tituloLibro = document.getElementById("tituloVS");
                    const fondoContainer = document.getElementById("fondoVS");
                    const videoPlayerContainer = document.getElementById("videoPlayerContainer");
                    const waterMarkBiblia = document.getElementById("waterMark");
                    window.addEventListener("message", (event) => {
                        console.log("Datos recibidos:", event.data);
                        const { videoPath, imagePath, versiculo, libroAux, estilosAux, lista, fondoBody, imagen, waterMark } = event.data;

                        waterMarkAux = waterMark;
                        waterMarkBiblia.src = waterMark;
                        videoPlayerContainer.innerHTML = "";
                        contenedorPrincipal.style.display = "none";
                        videoPlayerContainer.style.display = "none";

                        


    
                        if(fondoBody){
                            if (player) {
                                player.destroy();
                                player = null;
                            }
                                if(playerYouTube){
                                playerYouTube.destroy();
                                playerYouTube = null;
                                }
                            //document.getElementById("player-container-youtube").style.display = "none";
                            document.body.style.backgroundImage = "url('" + fondoBody + "')";
                            contenedorPrincipal.style.display = "none";
                            videoPlayerContainer.style.display = "none";

                        }else if(imagen){
                          if (player) {
                                player.destroy();
                                player = null;
                            }
                                if(playerYouTube){
                                playerYouTube.destroy();
                                playerYouTube = null;
                                }
                            //document.getElementById("player-container-youtube").style.display = "none";
                            document.getElementById("idImg").src = imagen;
                            document.getElementById("contenedorImg").style.display = "flex";
                            contenedorPrincipal.style.display = "none";
                            videoPlayerContainer.style.display = "none";
                        }else{
                          document.getElementById("contenedorImg").style.display = "none";
                        }

                        // Mostrar contenido según los datos enviados
                        if (versiculo) {
                            if (player) {
                                player.destroy();
                                player = null;
                            }
                                if(playerYouTube){
                                playerYouTube.destroy();
                                playerYouTube = null;
                                }
                            //document.getElementById("player-container-youtube").style.display = "none";
                            if(versiculo === "."){versiculoContainer.innerText = "";}else{versiculoContainer.innerText = versiculo;}
                            tituloLibro.innerText = libroAux;
                            // Aplica estilos al versículo
                            Object.keys(estilosAux).forEach(key => {
                                if (key !== "opacity") { 
                                    vistaPrevia.style[key] = estilosAux[key];
                                }else if (key == "opacity"){
                                    fondoContainer.style[key] = estilosAux[key];
                                }else{
                                    fondoContainer.style.opacity = '0';
                                }

                                if(key == "fontSize"){
                                    tituloLibro.style[key] = estilosAux[key];
                                }else if(key == "fontFamily"){
                                    tituloLibro.style[key] = estilosAux[key];
                                }else if(key == "color"){
                                    tituloLibro.style[key] = estilosAux[key];
                                }
                            });
                            contenedorPrincipal.style.display = "block";

                        }else if(lista){
                            cargarReproductorAleatorioVS(lista);           

                        } else if(videoPath.length <= 11){
                          if (player) {
                            player.destroy();
                            player = null;
                          }
                          if(playerYouTube){
                                playerYouTube.destroy();
                                playerYouTube = null;
                                }

                          document.body.style.backgroundImage = "url('imagenes/fondoBienvenida.jpg')";
                          console.log("Id ventana YouTube: " + videoPath);
                            document.getElementById("player-container-youtube").style.display = "flex";
                            const playerYoutube =document.getElementById("player-youtube");
                          playerYouTube = new Clappr.Player({
                            source: videoPath,
                            watermark: waterMarkAux,
                            position: "bottom-right",
                            autoPlay: true,
                            exitFullscreenOnEnd: false,
                            disableVideoTagContextMenu: true,
                            volume: 100,
                            poster: 'https://i.ytimg.com/vi/'+videoPath+'/hqdefault.jpg',
                            playbackNotSupportedMessage: "No se puede reproducir el contenido",
                            plugins: [YoutubePlugin,YoutubePluginControl], 
                            //YoutubePluginControl
                            YoutubeVars : {"languageCode":"en"},
                            parentId: "#player-youtube"
                          });

                          

                          console.log("Clappr version:", Clappr.version);

                          // Esperar a que el póster esté en el DOM
                          const observer = new MutationObserver(() => {
                            const poster = document.querySelector('.player-poster.clickable');
                            if (poster) {
                              poster.addEventListener('click', () => {
                                console.log("🟢 Clic en el póster detectado");

                                // Escuchar cuando el video haya avanzado al menos 2 segundos
                                playerYouTube.on(Clappr.Events.PLAYER_TIMEUPDATE, function checkTime(event) {
                                  const currentTime = event.current || (event.progress && event.progress.current);
                                  console.log("⏱ Tiempo actual:", currentTime);

                                  if (currentTime >= 2) {
  console.log("✅ Verificando pantalla completa...");

  if (!document.fullscreenElement) {
    console.log("✅ Solicitando pantalla completa...");
    document.documentElement.requestFullscreen()
      .then(() => console.log("🟢 Fullscreen activado"))
      .catch(err => console.warn("❌ No se pudo activar fullscreen:", err));
  } else {
    console.log("🔁 Ya estás en pantalla completa, no se solicita nuevamente.");
  }

  playerYouTube.off(Clappr.Events.PLAYER_TIMEUPDATE, checkTime); // detener escucha
}

                                });
                              });

                              observer.disconnect(); // dejamos de observar
                            }
                          });

                          // Observar el DOM por si el póster aparece luego
                          observer.observe(document.body, { childList: true, subtree: true });
                          expandirIframeYouTube();
                          







                        } else{
                          if (player) {
                            player.destroy();
                            player = null;
                          }
                            if(playerYouTube){
                                playerYouTube.destroy();
                                playerYouTube = null;
                                }
                            videoPlayerContainer.style.display = "block";
                            player = new Clappr.Player({
                                source: videoPath,
                                parentId: "#videoPlayerContainer",
                                width: "100%",
                                height: "100vh",
                                preload: 'auto',
                                autoPlay: true,
                                exitFullscreenOnEnd: false,
                                disableVideoTagContextMenu: true,
                                volume: 100,
                                //plugins: [MediaControl.MainPlugin],
                                //mediaControl: {
                                //    disableBeforeVideoStarts: true
                                //},
                                poster: imagePath,
                                watermark: waterMarkAux,
                                playbackNotSupportedMessage: "No se puede reproducir el contenido",
                                position: "bottom-right"
                            });

                            
                        }

                        

                        function expandirIframeYouTube() {
  const maxIntentos = 1000000;
  let intentos = 0;

  const intentarExpandir = () => {
    const iframe = document.querySelector('#player-youtube iframe');

    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.border = 'none';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.zIndex = '6';
      iframe.style.objectFit = 'cover';
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


                        
                        
                    });
                    
                    function ajustarZoom() {
                    let container = document.getElementById("player-container-youtube");
                    let playerElement = document.getElementById("player-youtube");

                    let contenedorAncho = container.clientWidth;
                    let contenedorAlto = container.clientHeight;

                    let escalaAncho = contenedorAncho / 640; // Escala basada en el ancho
                    let escalaAlto = contenedorAlto / 360; // Escala basada en la altura

                    let escalaFinal = Math.min(escalaAncho, escalaAlto); // Mantener proporción

                    playerElement.style.transform = "scale(" + escalaFinal + ")";

                    //playerElement.style.transformOrigin = "top left"; // Evitar desajustes
                    }

                    //window.addEventListener("resize", ajustarZoom);
                    //ajustarZoom(); // Ajustar al cargar

                    //Función para listas de reproducción automática en ventana secundaria
                    function cargarReproductorAleatorioVS(lista){
                        if (player) {
                                player.destroy();
                                player = null;
                        }
                        if(playerYouTube){
                                playerYouTube.destroy();
                                playerYouTube = null;
                                }
                          
                        
                        videoPlayerContainer.innerHTML = "";

                        // Seleccionar un video aleatorio de la lista
                        const himnoAleatorio = lista[Math.floor(Math.random() * lista.length)];
                        videoPlayerContainer.style.display = "block";
                            player = new Clappr.Player({
                                source: himnoAleatorio.videoPath,
                                parentId: "#videoPlayerContainer",
                                width: "100%",
                                height: "100vh",
                                preload: 'auto',
                                autoPlay: true,
                                exitFullscreenOnEnd: false,
                                volume: 100,
                                //plugins: [MediaControl.MainPlugin],
                                //mediaControl: {
                                //    disableBeforeVideoStarts: true
                                //},
                                poster: himnoAleatorio.imagePath,
                                watermark: waterMarkAux,
                                playbackNotSupportedMessage: "No se puede reproducir el contenido",
                                position: "bottom-right"
                            });
                            player.unmute();
                        // Escuchar cuando el video termine
                        player.on(Clappr.Events.PLAYER_ENDED, function() {
                            
                            cargarReproductorAleatorioVS(lista); // Cargar y reproducir un nuevo video aleatorio
                        });
                        
                    }

                    // Función para activar pantalla completa
                    function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.body.requestFullscreen()
      .then(() => console.log("🟢 Body en pantalla completa"))
      .catch(err => console.warn("❌ No se pudo activar fullscreen:", err));
    fullscreenButton.classList.add('hidden');
  } else {
    document.exitFullscreen()
      .then(() => console.log("🔙 Saliste de pantalla completa"))
      .catch(err => console.warn("❌ No se pudo salir de fullscreen:", err));
    fullscreenButton.classList.remove('hidden');
  }
}


                    // Mostrar el botón cuando la ventana no está en pantalla completa
                    document.addEventListener('fullscreenchange', () => {
                        if (document.fullscreenElement) {
                            fullscreenButton.classList.add('hidden'); // Oculta el botón
                        } else {
                            fullscreenButton.classList.remove('hidden'); // Muestra el botón
                        }
                            ajustarTamanoReproductorFullscreen();
                    });

                    fullscreenButton.addEventListener("click", toggleFullScreen);
                    
                    function ajustarTamanoReproductorFullscreen() {
  const isFullscreen = !!document.fullscreenElement;

  const container = document.getElementById("videoPlayerContainer");
  const playerYoutube = document.getElementById("player-youtube");

  if (isFullscreen) {
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";

    if (playerYoutube) {
      playerYoutube.style.width = "100%";
      playerYoutube.style.height = "100%";
    }

  } else {
    container.style.width = "100%";
    container.style.height = "100vh";
    container.style.position = "relative";
  }
}


                    window.onbeforeunload = () => {
                            window.opener.postMessage("closed", "*");
                        };
                </script>
                
            </body>
            </html>
        
        `;

    // Cargar el contenido en la nueva ventana
    playerWindow.document.open();
    playerWindow.document.write(newWindowContent);
    playerWindow.document.close();
  }

  // Enviar los datos al reproductor en la ventana secundaria
  playerWindow.postMessage(
    {
      videoPath,
      imagePath,
      versiculo,
      libroAux,
      estilosAux,
      lista,
      fondoBody,
      imagen,
      waterMark,
    },
    "*"
  );
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

document.getElementById("enviar").addEventListener("click", () => {
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
    waterMark: waterMark
  });
});

//const toggleContainer = document.querySelector(".toggle-container");
const botonBiblia = document.getElementById("botonBiblia");
const ventanaBiblia = document.getElementById("contenedor-biblia");
const botonYoutube = document.getElementById("botonYoutube");
const ventanaYouTube = document.getElementById("contenedor-youtube");
const botonHimnosPro = document.getElementById("botonHimnosPro");
const ventanaHimnosPro = document.getElementById(
  "contenedor-himnos-personalizados"
);

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

botonBiblia.addEventListener("click", function () {
  const displayActual = getComputedStyle(ventanaBiblia).display;

  if (displayActual === "none") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "flex";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "none";
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
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
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
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
    document.getElementById("contenedor-contador").style.display = "none";
  } else {
    ventanaHimnosPro.style.display = "none";
    ventanaYouTube.style.display = "none";
    ventanaBiblia.style.display = "none";
    himnarioContainer.style.display = "grid";
  }
});

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
        console.error("Error al salir de pantalla completa:", err)
      );
  } else {
    console.log("No hay elementos en pantalla completa.");
  }
}

// Función para mostrar los himnos por categoría
async function mostrarCategoria(categoria) {
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
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
    // Cargar en lotes para mejor rendimiento
    await cargarHimnosEnLotes(inicio, fin, 50);
  } else if (categoria === "1-100") {
    inicio = 1;
    fin = 100;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "101-200") {
    inicio = 101;
    fin = 200;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "201-300") {
    inicio = 201;
    fin = 300;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "301-400") {
    inicio = 301;
    fin = 400;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "401-500") {
    inicio = 401;
    fin = 500;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "501-614") {
    inicio = 501;
    fin = 614;
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "orquestado") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos2.length; i++) {
      // Extraer el número del himno del título (los primeros 3 dígitos)
      const numero = titulos2[i].match(/\d{3}/)[0]; // Encuentra los primeros 3 dígitos en el título
      const videoPath = srcAux+`videosAntiguo/${numero}.mp4`; // Ruta del video con el número
      const titulo = titulos2[i]; // El título completo del himno
      const imagePath = srcAux+`portadasAntiguo/${numero}.jpg`; // Ruta de la imagen con el número

      // Almacenar en el array
      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      // Crear el himno con la función respectiva
      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "coritos") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos3.length; i++) {
      const numero = titulos3[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosCoritos/${numero}.mp4`;
      const titulo = titulos3[i];
      const imagePath = srcAux+`portadasCoritos/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondoJA.jpg")';
  } else if (categoria === "himnosJA") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos4.length; i++) {
      const numero = titulos4[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosJA/${numero}.mp4`;
      const titulo = titulos4[i];
      const imagePath = srcAux+`portadasHimnosJA/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondoJA.jpg")';
  } else if (categoria === "himnosNacionales") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < titulos5.length; i++) {
      const numero = titulos5[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosNacionales/${numero}.mp4`;
      const titulo = titulos5[i];
      const imagePath = srcAux+`portadasHimnosNacionales/${numero}.png`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "orar") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloMusicaParaOrarDeFondo.length; i++) {
      const numero = tituloMusicaParaOrarDeFondo[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`musicaParaOrarDeFondo/${numero}.mp4`;
      const titulo = tituloMusicaParaOrarDeFondo[i];
      const imagePath = srcAux+`portadasParaOrarDeFondo/${numero}.png`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "himnosPianoPista") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloHimnosPianoPista.length; i++) {
      const numero = tituloHimnosPianoPista[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosPianoPista/${numero}.mp4`;
      const titulo = tituloHimnosPianoPista[i];
      const imagePath = `portadasHimnosPianoPista/001.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "himnosInfantiles") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloHimnosInfantiles.length; i++) {
      const numero = tituloHimnosInfantiles[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosInfantiles/${numero}.mp4`;
      const titulo = tituloHimnosInfantiles[i];
      const imagePath = srcAux+`portadasHimnosInfantiles/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "himnosAntiguos") {
    ventanaHimnosPro.style.display = "none";
    ventanaBiblia.style.display = "none";
    ventanaYouTube.style.display = "none";
    himnarioContainer.style.display = "grid";
    for (let i = 0; i < tituloHimnosAntiguos.length; i++) {
      const numero = tituloHimnosAntiguos[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosAntiguos/${numero}.mp4`;
      const titulo = tituloHimnosAntiguos[i];
      const imagePath = srcAux+`portadasHimnosAntiguos/${numero}.jpg`;

      todosLosHimnos.push({ numero, titulo, videoPath, imagePath });

      crearHimno(titulo, videoPath, imagePath, null, null);
    }
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  } else if (categoria === "listas") {
    botonLista = true;
    //Lista música para orar de fondo
    for (let i = 0; i < tituloMusicaParaOrarDeFondo.length; i++) {
      const numero = tituloMusicaParaOrarDeFondo[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`musicaParaOrarDeFondo/${numero}.mp4`;
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
      null
    );

    //Lista de los himnos antiguos: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < titulos2.length; i++) {
      // Extraer el número del himno del título (los primeros 3 dígitos)
      const numero = titulos2[i].match(/\d{3}/)[0]; // Encuentra los primeros 3 dígitos en el título
      const videoPath = srcAux+`videosAntiguo/${numero}.mp4`; // Ruta del video con el número
      const titulo = `Antiguos`; // El título completo del himno
      const imagePath = srcAux+`portadasAntiguo/${numero}.jpg`; // Ruta de la imagen con el número

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
      const videoPath = srcAux+`videosCoritos/${numero}.mp4`;
      const titulo = `Coritos`;
      const imagePath = srcAux+`portadasCoritos/${numero}.jpg`;

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
      const videoPath = srcAux+`videos/${numero}.mp4`;
      const imagePath = srcAux+`portadas/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosCantadosLista.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Cantados`;
    imagePathAux = `imagenes/portadaListaCantado.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosCantadosLista, null);

    //Lista de los piano pista: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < tituloHimnosPianoPista.length; i++) {
      const numero = tituloHimnosPianoPista[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosPianoPista/${numero}.mp4`;
      const titulo = `Himnos Piano Pista`;
      const imagePath = `portadasHimnosPianoPista/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosHimnosPianoPista.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Himnos Piano Pista`;
    imagePathAux = `imagenes/portadaListaPianoPista.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosHimnosPianoPista, null);

    //Lista de los infantiles: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < tituloHimnosInfantiles.length; i++) {
      const numero = tituloHimnosInfantiles[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosInfantiles/${numero}.mp4`;
      const titulo = `Himnos Infantiles`;
      const imagePath = srcAux+`portadasHimnosInfantiles/${numero}.jpg`;

      todosLosHimnosLista.push({ numero, titulo, videoPath, imagePath });
      todosLosHimnosInfantiles.push({ numero, titulo, videoPath, imagePath });
    }
    tituloAux = `Himnos Infantiles`;
    imagePathAux = `imagenes/portadaListaInfantil.jpg`;
    crearHimno(tituloAux, null, imagePathAux, todosLosHimnosInfantiles, null);

    //Lista de los antiguos 1962: °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
    for (let i = 0; i < tituloHimnosAntiguos.length; i++) {
      const numero = tituloHimnosAntiguos[i].match(/\d{3}/)[0];
      const videoPath = srcAux+`videosHimnosAntiguos/${numero}.mp4`;
      const titulo = `Himnos Antiguos 1962`;
      const imagePath = srcAux+`portadasHimnosAntiguos/${numero}.jpg`;

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
    himnarioContainer.style.display = "grid";
    document.getElementsByClassName(
      "contenedor-principal"
    )[0].style.backgroundImage = 'url("imagenes/fondo1.jpg")';
  }

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
    himno.titulo.toLowerCase().includes(queryLower)
  );

  // Mostrar los himnos filtrados
  himnosFiltrados.forEach((himno) => {
    crearHimno(
      himno.titulo,
      himno.videoPath,
      himno.imagePath,
      null,
      himno.duracionesHimnosAux
    );
  });
}

const searchInput = document.getElementById("searchInput");
// Escuchar el evento de foco en el campo de búsqueda
searchInput.addEventListener("focus", function () {
  //mostrarCategoria('todos'); // Mostrar todos los himnos al hacer clic en el buscador
  document.getElementsByClassName(
    "contenedor-principal"
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
document.getElementById("paypal").addEventListener("click", function (event) {
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
    if (botonPRO) {
      
      enviarDatos({
        videoPath: null,
        imagePath: null,
        versiculo: null,
        libroAux: null,
        estilosAux: null,
        lista: null,
        fondoBody: fondoImage,
        imagen: null,
        waterMark: waterMark
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
//Configuración de búsqueda en YouTube
async function buscarVideos() {
  botonYoutubeAux.style.pointerEvents = "none";
  botonYoutubeAux.style.cursor = "default";
  botonYoutubeAux.style.opacity = "0.5";

  let input = document.getElementById("busqueda-youtube").value.trim();
  document.getElementById("busqueda-youtube").disabled = true;
  let lista = document.getElementById("lista-videos");
  let premiumCategoria = localStorage.getItem("premium") === "true";

  let velocidadDeBusqueda = 0;
  

  if (input !== "" && !input.includes("youtube.com")) {
    // URL de tu API desplegada en Vercel
    let apiUrl = `https://api-youtube-gamma.vercel.app/api/search?q=${encodeURIComponent(
      input
    )}`;
    lista.innerHTML = ""; // Limpiar resultados anteriores
    document.getElementById("loader").style.display = "block";
    try {
      let response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Error en la respuesta de la API");

      let videos = await response.json();
      if(premiumCategoria){
        velocidadDeBusqueda = 100;
      }else{
        velocidadDeBusqueda = 30000;
        videos = videos.slice(0,8);
      }
      // Mostrar videos uno por uno
      for (let video of videos) {
        const div = document.createElement("div");
        div.className = "vid";
        div.innerHTML = `
          <iframe width="100%" height="200" 
            src="https://www.youtube.com/embed/${video.id}?rel=0"
            frameborder="0" allowfullscreen loading="lazy"
            style="pointer-events: none;">
          </iframe>
          <h3>${video.title}</h3>
          <p style="color: white;font-size: 12px;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;">
            ${
              video.duration ? `Duración: ${video.duration}` : ""
            } | Visualizaciones: ${video.views ? ` ${video.views}` : ""}
          </p>
          <small style="color:white;font-size: 12px;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;">
            ${video.uploadedAt ? `Hace: ${video.uploadedAt}` : ""}
          </small>
          <small style="color:white;font-size: 12px;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;">
            Canal: ${video.channel?.name || "Desconocido"}
          </small>
        `;

        div.onclick = () => youtubeInicio(video.id, video.thumbnail);

        if (premiumCategoria) {
          const contenedorPremiumActivado = document.createElement("div");
          contenedorPremiumActivado.classList.add("contenedorPremiumActivado");
          contenedorPremiumActivado.textContent = "";
          contenedorPremiumActivado.style.display = "flex";
          div.appendChild(contenedorPremiumActivado);
        }
        lista.appendChild(div);

        await new Promise((r) => setTimeout(r, velocidadDeBusqueda));
      }

      botonYoutubeAux.style.pointerEvents = "all";
      botonYoutubeAux.style.cursor = "pointer";
      botonYoutubeAux.style.opacity = "1";
    } catch (error) {
      console.error(error);
      alert("Error al obtener videos");
    } finally {
      document.getElementById("loader").style.display = "none";
      botonYoutubeAux.style.pointerEvents = "all";
      botonYoutubeAux.style.cursor = "pointer";
      botonYoutubeAux.style.opacity = "1";
      document.getElementById("busqueda-youtube").disabled = false;
    }
  } else if (input !== "" && input.includes("youtube.com")) {
    // Si es un link de YouTube, extraemos el video ID
    let videoIdMatch = input.match(
      /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/
    );

    if (videoIdMatch) {
      let videoId = videoIdMatch[1];
      let img = "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg";

      let videosHTML = `
        <div id="contenedor-embed" style="pointer-events: none;">
          <iframe width="560" height="315" 
            src="https://www.youtube.com/embed/${videoId}?mute=1" 
            frameborder="0" allowfullscreen>
          </iframe>
          <h3 id="enviarVideo" style="cursor: pointer; pointer-events: all;" onclick='youtubeInicio("${videoId}", "${img}")'>Enviar</h3>
        </div>
      `;
      lista.innerHTML = videosHTML;
      botonYoutubeAux.style.pointerEvents = "all";
      botonYoutubeAux.style.cursor = "pointer";
      botonYoutubeAux.style.opacity = "1";
    }
  } else {
    botonYoutubeAux.style.pointerEvents = "all";
    botonYoutubeAux.style.cursor = "pointer";
    botonYoutubeAux.style.opacity = "1";
  }
}

//Configuración YouTube
let url;
let auxUrlOnce = null;
let auxUrlDoce = null;
function youtubeInicio(url, poster) {
  // Si es una URL completa, extraemos el ID
  let regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

  let match = url.match(regex);
  if (match) {
    url = match[1];
  }

  // Validamos el ID y llamamos a youtubeClappr
  if (url && url.length === 11 && botonPRO == true) {
    console.log("Id del video YouTube: " + url);
    youtubeClappr(url, poster);
  } else if (url && url.length === 11 && botonPRO == false) {
    console.log("Id del video YouTube: " + url);
    youtubeClapprEstandar(url, poster);
  } else {
    console.warn("No se pudo obtener un ID de video válido.");
  }
}

function youtubeClapprEstandar(url, poster) {
  audioHimno.pause();
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
    autoPlay: false,
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
    ocultarReproductor();
  });
  playerYouTube.on(Clappr.Events.PLAYER_READY, () => {
    console.log("✅ Player listo, esperando 2 segundos...");
  
    setTimeout(() => {
      const poster = document.querySelector('.player-poster.clickable');
      if (poster) {
        console.log("🎬 Simulando clic en póster tras PLAYER_READY");
  
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
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

function youtubeClappr(auxUrlOnce, poster) {
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
    waterMark: waterMark
  });
}

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
    ocultarReproductor();
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
    waterMark: waterMark
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
    "0"
  );
  const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
  document.getElementById(
    "timer"
  ).textContent = `${hours}:${minutes}:${seconds} | cronómetro de inicio`;
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
      "0"
    );
    const segs = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

    document.getElementById(
      "countdown"
    ).textContent = `${horas}:${mins}:${segs} | regresivo`;
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
    "width=800,height=600"
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
      "*"
    );
  }
}

//CONTADOR DE VISTAS DEL HIMNARIO
const urlBase =
  "https://script.google.com/macros/s/AKfycbwxhR2Yqk5DlDWt5aUeNTSzASSaXB50At2Q5STaH4NITGfFYefICIb9o8CNbwuk0WiCYA/exec";

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

async function contadorDeVistas() {
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
          (r) => r.json()
        )
      );
    }

    if (idsSoloLeer.length > 0) {
      promesas.push(
        fetch(`${urlBase}?action=leer&id=${idsSoloLeer.join(",")}`).then((r) =>
          r.json()
        )
      );
    }

    const [registro, lectura] = await Promise.all(promesas);

    const datos = { ...(registro || {}), ...(lectura || {}) };

    stats.vistas = `${formatearNumero(datos[IDs.vistas])} vista${
      datos[IDs.vistas] === 1 ? "" : "s"
    }`;
    stats.vistasUnicas = `${formatearNumero(
      datos[IDs.vistasUnicas]
    )} vistas únicas por día`;
    stats.descargasUnicas = `${formatearNumero(
      datos[IDs.descargasUnicas]
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
    document.getElementById("contenedor-vistas").innerHTML = `${
      stats.online
    } &nbsp;| ${stats.vistas} | ${stats.vistasUnicas} | ${
      stats.descargasUnicas
    }`;
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
        stats.vistasUnicas = `${data[IDs.vistasUnicas]} vistas únicas por día`;

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

contadorDeVistas();
setInterval(refrescarStatsUnicasCada5Min, 5 * 60 * 1000);
//localStorage.removeItem("ultimaVistaDiaria");
//localStorage.removeItem("entradaRegistrada");



//LÓGICA DE IMAGEN Y VIDEO PARA EL BOTÓN DETENCIÓN DE ARCHIVOS EXPLORADOR INTERNO PC CON ELECTRON
const botonVideoImgLocal = document.getElementById("botonVideoImgLocal");
botonVideoImgLocal.addEventListener("click", async () => {
  const rutaArchivo = await window.electronAPI.abrirDialogoMultimedia();
  if (!rutaArchivo) {
    console.log("No se seleccionó ningún archivo");
    return;
  }

  console.log("Archivo seleccionado:", rutaArchivo);
  const videoLocalUrl = `file://${rutaArchivo}`;

  // 🖼 Si es imagen
  if (rutaArchivo.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    try {
      const base64 = await window.electronAPI.leerArchivo(rutaArchivo);
      const extension = rutaArchivo.split(".").pop();
      const dataUrl = `data:image/${extension};base64,${base64}`;

      if (botonPRO) {
        
        enviarDatos({
          videoPath: null,
          imagePath: null,
          versiculo: null,
          libroAux: null,
          estilosAux: null,
          lista: null,
          fondoBody: null,
          imagen: dataUrl,
          waterMark: waterMark
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
    if (!botonPRO) {
      videosLocalesEstandar(videoLocalUrl, null);
    } else {
      videosLocalesPro(videoLocalUrl, null);
    }
  } else {
    console.warn("❌ Archivo no soportado.");
  }
});














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
          e.toLowerCase().includes(query)
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
    audioHimno.src = srcAux+`${carpeta}/${numeroFormateado}.mp3`;
    audioHimno.play().catch((err) => console.log("Error al reproducir:", err));

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
    versiculo: versiculoAux = textoGlobal,
    libroAux: null,
    estilosAux: estilosAux,
    lista: null,
    fondoBody: null,
    imagen: null,
    waterMark: waterMark
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
    waterMark: waterMark
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

let srcAux;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarMonitores();

  // Asegúrate que window.paths.src existe antes de usarlo
  if (!window.paths || !window.paths.src) {
    console.error("window.paths.src no está definido todavía");
    return;
  }

  srcAux = window.paths.src + "/";

  // Forzar render
  await mostrarCategoria("todos");

  // Pequeño retraso para dejar que el DOM pinte
  requestAnimationFrame(() => {
    validarPremium();
  });
});

// Solo agregar esta función al final para precarga de imágenes
function precargarImagenes() {
  // Precargar las primeras 20 imágenes para mejor experiencia
  for (let i = 1; i <= 20; i++) {
    const numero = i.toString().padStart(3, "0");
    const img = new Image();
    img.src = srcAux + `portadas/${numero}.jpg`;
  }
}

// Llamar a precarga después de que la página esté cargada
window.addEventListener('load', precargarImagenes);

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
    option.textContent = `✅ Monitor ${m.id}: ${m.nombre} ${m.principal ? "(Principal)" : ""}`;
    select.appendChild(option);
  });

  // ✅ Cuando el usuario selecciona algo
  select.addEventListener("change", () => {
    const monitorId = parseInt(select.value, 10);

    if (isNaN(monitorId) || monitorId === -1) {
      // 👉 Modo normal
      window.electronAPI.abrirVentanaSecundaria(-1);
      activarModoNormal();
      return;
    }

    // 👉 Modo PRO (monitor válido)
    window.electronAPI.abrirVentanaSecundaria(monitorId);
    activarModoPro();
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
    waterMark: waterMark,
  });
}

function activarModoNormal() {
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






document.getElementById("ministerio").addEventListener("mouseover",()=>{
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
  contenedor.style.width ="auto";
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
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "",
    titulo: "",
    mensaje: "",
    version: "",
    tipo: ""
  },
  {
    fecha: "2025-11-17",
    titulo: "En desarrollo...",
    mensaje: "Se está trabajando en la sección de Biblia para pasar con el teclado o avanzar los versículos a petición de un usuarios.",
    version: "v1.0.26",
    tipo: "Función nueva"
  },
  {
    fecha: "2025-11-17",
    titulo: "Apariencia y mejoramiento",
    mensaje: "La apariencia para el pago de suscripción se mejoró y se agregaron más características premium al sistema de ayuda del ministerio PROYECTO JA.",
    version: "v1.0.26",
    tipo: "Mejor"
  },
  {
    fecha: "2025-11-17",
    titulo: "Bug Pantalla Negra en Algunas Laptops",
    mensaje: "Se corrigió un pequeño fallo de optimización en la iniciación del software. Algunas personas presentaron problemas cuando abrian el programa: 1-Cargaba muy lento, 2-Se quedaba en negra parte de la pantalla y no cargaban los himnos. Se optimizó el programa y ahora carga en 0.500 milisegundos en computadora de 4/8gigas de Ram con Disco SSD con dos nucleos mínimo y procesador 2300 herts balanceado.",
    version: "v1.0.25",
    tipo: "Corrección"
  },
  {
    fecha: "2025-11-17",
    titulo: "Buscador de Youtube",
    mensaje: "Se mejoró el buscador de YouTube para evitar caídas repentinas con el contenido.",
    version: "v1.0.24",
    tipo: "Mejor"
  },
  {
    fecha: "2025-10-6",
    titulo: "Mejoramiento del reproductor de proyección y vista automática del video de YouTube",
    mensaje: "Se mejoró el reproductor profesional de proyección: Ya no se observa la barra de control cuando se coloca un himno, además, también se implementó en YouTube la mejora; además, ahora YouTube se reproduce automáticamente. Además, se agregó un botón de novedades para que revices qué actualizaciones han salido desde que se creó el software y te mantengas actualizado.",
    version: "v1.0.23",
    tipo: "Mejora"
  },
  {
    fecha: "2025-09-10",
    titulo: "Nueva funcionalidad para personalizar los himnos tanto español como inglés.",
    mensaje: "Se agregó y automatizó el software corriendo en su servidor propio. Nuevo botón para personalizar el himnario con ajustes de letra y versiones como cantado, instrumental, solo letra e inglés(se sigue modificando cada estrofa a su idioma con traductores voluntarios), además, en la misma sección, se puede cargar una imagen a proyección en el himno. Además se agregó la funcionalidad potente de auto-actualización de este software para futuras actualizaciones: ya no tendrás que descargar el mismo archivo zip todo el tiempo, este software desde esta versión se actualiza automáticamente.",
    version: "v1.0.19",
    tipo: "Función nueva"
  },
  {
    fecha: "2025-08-30",
    titulo: "Nuevas funciones!",
    mensaje: "Se transladó la opción PRO al lado superior de la pantalla, allí mismo se implenta un apartado de estadísticas nerd, además, se agregó funcionalidad de búsqueda de monitores disponibles en tu computador. Se repara la búsqueda en YouTube(nuevas políticas de navegadores web), Se agrega un reloj contador para predicadores. Se agregó también un botón para búsqueda de archivos en el explorador de archivos del disco.",
    version: "v1.0.18",
    tipo: "Función nueva"
  },
  {
    fecha: "2025-07-30",
    titulo: "Nuevos himnario implementados y nueva función de You Tube",
    mensaje: "Se agregaron nuevas versiones de himnario tanto orquestado, antiguo, cantado, instrumental, infantil, piano y listas de reproducción actualizadas. Además, nueva función potente, búsquedas de YouTube sin anuncios para reproducir en tu iglesia, tanto en modo local o activando el modo profesional.",
    version: "v1.0.2",
    tipo: "Función nueva"
  },
  {
    fecha: "2025-01-27",
    titulo: "Nuevas listas de reproducción.",
    mensaje: "Se implementa listas de reproducción en modo bucle y play automático tanto en local y profesional",
    version: "v1.0.1",
    tipo: "Mejora"
  },
  {
    fecha: "2024-011-09",
    titulo: "Publicación del Software",
    mensaje: "Creación del software del himnario con funcionalidad de proyección y búsqueda avanzada, himnario solo cantado. Funciones modo reproducción local y profesional.",
    version: "v1.0.0",
    tipo: "Función nueva"
  }
  /**
   * Función Nueva
   * Mejor
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
  const contenedor  = document.createElement("div");
  contenedor.className = "contenedorHijo";
  
  const card = document.createElement("div");
  card.className = "actualizacion";
  card.textContent = "Recuerda darnos tu opinión o dejarnos un comentario para seguir mejorando. Aquí mismo puedes dejarnos tus comentarios. (LEEMOS SOLO AQUÍ)";
  contenedor.appendChild(card);

  actualizaciones.forEach(item => {
    if(item.fecha != ""){
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
