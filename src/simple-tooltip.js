/**
 * Sistema de Tooltips Simple
 * addToolTip(elemento, mensaje, posición, opciones)
 * removeToolTip(elemento)
 */

function addToolTip(elemento, mensaje, posicion = "top", opciones = {}) {
  // Obtener el elemento
  const el =
    typeof elemento === "string" ? document.querySelector(elemento) : elemento;
  if (!el) {
    console.error("Elemento no encontrado:", elemento);
    return null;
  }

  // Opciones por defecto
  const defaults = {
    colorFondo: "#cf1313", // Color de fondo
    colorTexto: "white", // Color del texto
    tamanoTexto: "20px", // Tamaño de fuente
    estiloTexto: "Arial, Helvetica, sans-serif", // Familia de fuente
    pesoTexto: "bold", // Peso de fuente
    estiloItalico: "italic", // Estilo itálico
    borde: "2px solid white", // Borde
    borderRadius: "1rem", // Radio del borde
    padding: "5px 10px", // Espaciado interno
    boxShadow: "inset 0 0 10px #000", // Sombra interna
    zIndex: "1000", // Nivel z
    delay: 300, // Retardo para mostrar
    duracion: 0.5, // Duración de transición
    mostrarSiempre: false, // Mostrar siempre visible
    flecha: true, // Mostrar flecha
    anchoFlecha: "15px", // Ancho de la flecha
    margenFlecha: "-15px", // Margen de la flecha
  };

  // Combinar opciones
  const config = { ...defaults, ...opciones };

  // Crear tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "simple-tooltip";
  tooltip.textContent = mensaje;
  tooltip.style.cssText = `
        position: absolute;
        color: ${config.colorTexto};
        font-size: ${config.tamanoTexto};
        font-family: ${config.estiloTexto};
        font-weight: ${config.pesoTexto};
        font-style: ${config.estiloItalico};
        background-color: ${config.colorFondo};
        border: ${config.borde};
        border-radius: ${config.borderRadius};
        padding: ${config.padding};
        box-shadow: ${config.boxShadow};
        z-index: ${config.zIndex};
        opacity: 0;
        transition: opacity ${config.duracion}s ease;
        pointer-events: none;
        white-space: nowrap;
        text-align: center;
    `;

  // Flecha del tooltip si está habilitada
  if (config.flecha) {
    const arrow = document.createElement("div");
    arrow.className = "simple-tooltip-arrow";
    arrow.style.cssText = `
            content: "";
            position: absolute;
            border-style: solid;
            border-width: ${config.anchoFlecha};
        `;
    tooltip.appendChild(arrow);
  }

  // Crear contenedor
  const container = document.createElement("div");
  container.className = "simple-tooltip-container";
  container.style.cssText = `
        position: absolute;
        z-index: ${config.zIndex};
        pointer-events: none;
    `;

  container.appendChild(tooltip);
  document.body.appendChild(container);

  // Posicionar tooltip
  function posicionarTooltip() {
    const rect = el.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    let top, left;
    const arrow = tooltip.querySelector(".simple-tooltip-arrow");

    switch (posicion.toLowerCase()) {
      case "top":
        top = rect.top + scrollTop - tooltipRect.height - 10;
        left = rect.left + scrollLeft + rect.width / 2 - tooltipRect.width / 2;
        if (arrow) {
          arrow.style.cssText = `
                        top: 100%;
                        left: 50%;
                        margin-left: ${config.margenFlecha};
                        border-style: solid;
                        border-width: ${config.anchoFlecha};
                        border-color: ${config.colorFondo} transparent transparent transparent;
                    `;
        }
        break;
      case "bottom":
        top = rect.bottom + scrollTop + 10;
        left = rect.left + scrollLeft + rect.width / 2 - tooltipRect.width / 2;
        if (arrow) {
          arrow.style.cssText = `
                        bottom: 100%;
                        left: 50%;
                        margin-left: ${config.margenFlecha};
                        border-style: solid;
                        border-width: ${config.anchoFlecha};
                        border-color: transparent transparent ${config.colorFondo} transparent;
                    `;
        }
        break;
      case "left":
        top = rect.top + scrollTop + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left + scrollLeft - tooltipRect.width - 10;
        if (arrow) {
          arrow.style.cssText = `
                        top: 50%;
                        right: 100%;
                        margin-top: ${config.margenFlecha};
                        border-style: solid;
                        border-width: ${config.anchoFlecha};
                        border-color: transparent transparent transparent ${config.colorFondo};
                    `;
        }
        break;
      case "right":
        top = rect.top + scrollTop + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + scrollLeft + 10;
        if (arrow) {
          arrow.style.cssText = `
                        top: 50%;
                        left: 100%;
                        margin-top: ${config.margenFlecha};
                        border-style: solid;
                        border-width: ${config.anchoFlecha};
                        border-color: transparent ${config.colorFondo} transparent transparent;
                    `;
        }
        break;
    }

    // Ajustar para no salir de pantalla
    if (top < scrollTop) top = scrollTop + 5;
    if (top + tooltipRect.height > scrollTop + window.innerHeight) {
      top = scrollTop + window.innerHeight - tooltipRect.height - 5;
    }
    if (left < scrollLeft) left = scrollLeft + 5;
    if (left + tooltipRect.width > scrollLeft + window.innerWidth) {
      left = scrollLeft + window.innerWidth - tooltipRect.width - 5;
    }

    container.style.top = `${top}px`;
    container.style.left = `${left}px`;
  }

  // Mostrar/ocultar
  let showTimeout, hideTimeout;

  function mostrar() {
    clearTimeout(hideTimeout);
    showTimeout = setTimeout(() => {
      posicionarTooltip();
      tooltip.style.opacity = "1";
    }, config.delay);
  }

  function ocultar() {
    clearTimeout(showTimeout);
    hideTimeout = setTimeout(() => {
      tooltip.style.opacity = "0";
    }, 100);
  }

  // Eventos
  if (config.mostrarSiempre) {
    mostrar();
  } else {
    el.addEventListener("mouseenter", mostrar);
    el.addEventListener("mouseleave", ocultar);
  }

  // Redimensionar
  window.addEventListener("resize", posicionarTooltip);
  window.addEventListener("scroll", posicionarTooltip);

  // Guardar referencia para poder removerlo
  const tooltipData = {
    container,
    tooltip,
    mostrar,
    ocultar,
    posicionarTooltip,
    config: { ...config, posicion },
  };

  el._tooltipData = tooltipData;

  // Retornar objeto con métodos de control
  return {
    mostrar: () => {
      mostrar();
      return this;
    },
    ocultar: () => {
      ocultar();
      return this;
    },
    actualizar: (
      nuevoMensaje = null,
      nuevaPosicion = null,
      nuevasOpciones = {}
    ) => {
      if (nuevoMensaje !== null) tooltip.textContent = nuevoMensaje;
      if (nuevaPosicion !== null) posicion = nuevaPosicion;
      if (nuevasOpciones && Object.keys(nuevasOpciones).length > 0) {
        Object.assign(config, nuevasOpciones);
        // Actualizar estilos
        tooltip.style.color = config.colorTexto;
        tooltip.style.fontSize = config.tamanoTexto;
        tooltip.style.fontFamily = config.estiloTexto;
        tooltip.style.fontWeight = config.pesoTexto;
        tooltip.style.fontStyle = config.estiloItalico;
        tooltip.style.backgroundColor = config.colorFondo;
        tooltip.style.border = config.borde;
        tooltip.style.borderRadius = config.borderRadius;
        tooltip.style.padding = config.padding;
        tooltip.style.boxShadow = config.boxShadow;
      }
      posicionarTooltip();
      return this;
    },
    remover: () => {
      if (!config.mostrarSiempre) {
        el.removeEventListener("mouseenter", mostrar);
        el.removeEventListener("mouseleave", ocultar);
      }
      window.removeEventListener("resize", posicionarTooltip);
      window.removeEventListener("scroll", posicionarTooltip);
      container.remove();
      delete el._tooltipData;
      return null;
    },
  };
}

// Función para remover tooltip
function removeToolTip(elemento) {
  const el =
    typeof elemento === "string" ? document.querySelector(elemento) : elemento;
  if (el && el._tooltipData) {
    el._tooltipData.remover();
    return true;
  }
  return false;
}

// Función para obtener tooltip existente
function getToolTip(elemento) {
  const el =
    typeof elemento === "string" ? document.querySelector(elemento) : elemento;
  return el && el._tooltipData ? el._tooltipData : null;
}

// Exportar al global
window.addToolTip = addToolTip;
window.removeToolTip = removeToolTip;
window.getToolTip = getToolTip;

// Ejemplos de uso automático comentados
// Ejemplo: Tooltips para los botones del himnario
document.addEventListener("DOMContentLoaded", function () {
  // Solo si los elementos existen
  if (document.getElementById("botonVideoImgLocal")) {
    addToolTip("#botonVideoImgLocal", "Videos e Imágenes Locales", "top");
  }
  if (document.getElementById("botonYoutube")) {
    addToolTip("#botonYoutube", "Reproductor de YouTube", "top", {
      colorFondo: "#ff0000",
    });
  }
  if (document.getElementById("botonContador")) {
    addToolTip("#botonContador", "Contador y Temporizador", "top", {
      colorFondo: "#4ecdc4",
    });
  }
  if (document.getElementById("botonHimnosPro")) {
    addToolTip("#botonHimnosPro", "Himnos Personalizados", "top", {
      colorFondo: "#45b7d1",
    });
  }
  if (document.getElementById("configBoton")) {
    addToolTip("#configBoton", "Configuración y Opciones", "top");
  }
  if (document.getElementById("botonNovedades")) {
    addToolTip("#botonNovedades", "Novedades y Actualizaciones", "top", {
      colorFondo: "#feca57",
      colorTexto: "#333",
    });
  }
  if (document.getElementById("botonBiblia")) {
    addToolTip("#botonBiblia", "Biblia para Proyectar", "top", {
      colorFondo: "#5f27cd",
    });
  }
  if (document.getElementById("botonProgramacion")) {
    addToolTip(
      "#botonProgramacion",
      "Programación de Eventos | Próximamente...",
      "top",
      {
        colorFondo: "#54a0ff",
      }
    );
  }
  if (document.getElementById("cerrar")) {
    addToolTip("#cerrar", "Cerrar Menú", "right");
  }
  if (document.getElementById("web")) {
    addToolTip("#web", "Página Web", "right");
  }
  if (document.getElementById("resenia")) {
    addToolTip("#resenia", "Reseñas y comentarios", "right");
  }
  if (document.getElementById("fondoPantalla")) {
    addToolTip("#fondoPantalla", "Fondos de Pantalla para proyectar", "right");
  }
  if (document.getElementById("masContenido")) {
    addToolTip("#masContenido", "Más material para tu iglesia", "right");
  }
  if (document.getElementById("botonPaypalMenu")) {
    addToolTip("#botonPaypalMenu", "Donaciones al ministerio", "right");
  }
  if (document.getElementById("acercaDe")) {
    addToolTip("#acercaDe", "Información del Software", "right");
  }
  if (document.getElementById("botonPremium")) {
    addToolTip("#botonPremium", "Adquirir licencia del Software", "bottom");
  }
  if (document.getElementById("botonPowerPoint")) {
    addToolTip("#botonPowerPoint", "Power Point para proyectar", "top", {
      colorFondo: "#ff6600ff",
    });
  }
});
