var BASE_URL = "https://proyectoja.github.io/App/";
let contenedorLista;
let contenedorContPelis;

document.addEventListener("DOMContentLoaded", () => {
  contenedorLista = document.querySelector(".contenedor-lista");
  contenedorContPelis = document.querySelector(".contenedor-cont-pelis");

  if (contenedorContPelis) {
    contenedorContPelis.style.cursor = "pointer";
    contenedorContPelis.addEventListener("click", function () {
      const lateral = document.querySelector(".contenedor-lateral-derecho");
      if (lateral) {
        lateral.style.width = lateral.style.width === "0px" ? "auto" : "0px";
      }
    });
  }

  loadContent();

  const searchContainer = document.querySelector(".contenedor-buscador");
  const searchBtn = document.querySelector(".search-icon-btn");
  const searchInput = document.getElementById("buscar");

  if (searchContainer && searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !searchContainer.contains(e.target) &&
        searchContainer.classList.contains("active")
      ) {
        // Solo cerrar si el input está vacío
        if (searchInput.value.trim() === "") {
          searchContainer.classList.remove("active");
        }
      }
    });
  }
});

let contPelis = 0;
// Variable global para almacenar todas las películas y ser accesible por las listas
var carteles = [];

const jsonUrl = BASE_URL + "contenido.json";
const contenedorJWPLAYER = document.getElementById("contenedorJWPLAYER");

let banderaCartel = false;
let arregloAux = [];
const contenedorEspecial = document.getElementById("contenedorEspecial");
const contenedorEspecialSeries = document.getElementById(
  "contenedorEspecialSeries",
);

// Video.js player instance
let videoPlayer = null;

// ✅ SOLUCIÓN #1: Crear el IntersectionObserver UNA SOLA VEZ al inicio
// Esto evita que se acumulen múltiples observers cada vez que se abre un cartel
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        // Verificar que aún tenga data-src (prevenir carga duplicada)
        if (img.dataset.src && !img.src) {
          img.src = img.dataset.src; // Cargar la imagen
          img.removeAttribute("data-src"); // Eliminar el atributo una vez cargado
          img.onload = () => {
            img.style.opacity = "1"; // Aparecer suavemente
            observer.unobserve(img); // Dejar de observarla inmediatamente
          };
        }
      }
    });
  },
  {
    rootMargin: "50px", // Reducido de 100px para menos trabajo
    threshold: 0.1, // Solo necesita 10% de visibilidad para cargar
  },
);

// Función para cargar los datos desde el archivo JSON
function loadContent() {
  fetch(jsonUrl) // PRODUCCIÓN
    //fetch("contenido.json") //DESARROLLO
    .then((response) => response.json()) // Convertir a JSON
    .then((data) => {
      limpiarTodasLasURLs(data);

      // ✅ Filtrar las que tengan url y urlSub válidas
      const soloValidas = data.peliculas.filter(
        (video) =>
          (video.url && video.url.trim() !== "") ||
          (video.urlSub && video.urlSub.trim() !== "") ||
          (video.urlCas && video.urlCas.trim() !== "") ||
          (video.urlCor && video.urlCor.trim() !== "") ||
          (video.urlChi && video.urlChi.trim() !== "") ||
          (Array.isArray(video.urlLista) &&
            video.urlLista[0].file &&
            video.urlLista[0].file.trim() !== ""),
      );

      // ✅ Filtrar las que tengan urlLista válidas
      const soloValidasSeries = data.peliculas.filter(
        (video) =>
          (Array.isArray(video.urlLista) &&
            video.urlLista[0].file &&
            video.urlLista[0].file.trim() !== "") ||
          (Array.isArray(video.urlListaSub) &&
            video.urlListaSub[0].file &&
            video.urlListaSub[0].file.trim() !== "") ||
          (Array.isArray(video.urlListaCor) &&
            video.urlListaCor[0].file &&
            video.urlListaCor[0].file.trim() !== "") ||
          (Array.isArray(video.urlListaChi) &&
            video.urlListaChi[0].file &&
            video.urlListaChi[0].file.trim() !== ""),
      );

      // ✅ Tomar los últimos 30 válido
      arregloAux = soloValidas.slice(-30);

      data.peliculas.sort((a, b) => b.fecha - a.fecha); // PRODUCCIÓN
      const fragment = document.createDocumentFragment();
      const generosSet = new Set();
      let peliculasValidas = [];

      data.peliculas.forEach((video) => {
        //Creación cartel primero de construcción
        if (!banderaCartel) {
          crearCartelEspecial(video, fragment);
          banderaCartel = true;
        }

        // Validar que la película tenga datos correctos
        if (
          video.titulo &&
          !video.titulo.includes("rumble") &&
          !video.titulo.includes(".mp4") &&
          !video.descripcion.includes("rumble") &&
          !video.descripcion.includes(".mp4") &&
          !video.fecha.includes("rumble") &&
          !video.fecha.includes(".mp4") &&
          !video.duracion.includes("rumble") &&
          !video.duracion.includes(".mp4") &&
          !video.titulo.includes(".m3u8") &&
          !video.descripcion.includes(".m3u8") &&
          !video.fecha.includes(".m3u8") &&
          !video.duracion.includes(".m3u8")
        ) {
          crearCarteles(video, fragment);
          peliculasValidas.push(video);
          if (video.generos) {
            video.generos.split(",").forEach((g) => generosSet.add(g.trim()));
          }
        }
      });

      // Agregar todo el fragmento al DOM en una sola operación
      const contenedorTodas =
        document.getElementById("contenedorTodas") || contenedorLista;
      contenedorTodas.appendChild(fragment);

      // Actualizar contador
      contPelis = peliculasValidas.length;
      contenedorContPelis.textContent = `Total: ${contPelis} películas y series. `;

      // Guardar películas en un arreglo global para filtrar
      peliculasArreglo = peliculasValidas;
      // ASIGNACIÓN CRÍTICA: Hacer disponibles los datos para las listas
      carteles = peliculasValidas;

      // Crear botones de géneros una vez
      crearBotonesGenero([...generosSet]);

      //Películas Recientes
      if (banderaCartel) {
        arregloAux.reverse();
        const fragmentRecientes = document.createDocumentFragment();
        const fragmentSeries = document.createDocumentFragment();
        arregloAux.forEach((video) => {
          if (
            video.titulo &&
            !video.titulo.includes("rumble") &&
            !video.titulo.includes(".mp4") &&
            !video.descripcion.includes("rumble") &&
            !video.descripcion.includes(".mp4") &&
            !video.fecha.includes("rumble") &&
            !video.fecha.includes(".mp4") &&
            !video.duracion.includes("rumble") &&
            !video.duracion.includes(".mp4") &&
            !video.titulo.includes(".m3u8") &&
            !video.descripcion.includes(".m3u8") &&
            !video.fecha.includes(".m3u8") &&
            !video.duracion.includes(".m3u8")
          ) {
            crearCartelesRecientes(video, fragmentRecientes);
          }
        });
        contenedorEspecial.appendChild(fragmentRecientes);

        //Creación de los carteles de todas las series
        soloValidasSeries.reverse();
        soloValidasSeries.forEach((video) => {
          if (
            video.titulo &&
            !video.titulo.includes("rumble") &&
            !video.titulo.includes(".mp4") &&
            !video.descripcion.includes("rumble") &&
            !video.descripcion.includes(".mp4") &&
            !video.fecha.includes("rumble") &&
            !video.fecha.includes(".mp4") &&
            !video.duracion.includes("rumble") &&
            !video.duracion.includes(".mp4") &&
            !video.titulo.includes(".m3u8") &&
            !video.descripcion.includes(".m3u8") &&
            !video.fecha.includes(".m3u8") &&
            !video.duracion.includes(".m3u8")
          ) {
            crearCartelesSeries(video, fragmentSeries);
          }
        });
        contenedorEspecialSeries.appendChild(fragmentSeries);
      }
    })
    .catch((error) => {
      console.error("Error al cargar el archivo JSON:", error);
    });
}

// Variables globales para el nuevo diseño
var cartelActualGlobal;
// ===== FUNCIONES PRIME VIDEO STYLE =====

function mostrarPopupCalidades(cartel) {
  cartelActualGlobal = cartel;
  const popup = document.getElementById("popup-calidades");
  const lista = document.getElementById("lista-calidades");
  lista.innerHTML = "";

  // Restaurar el título del popup para reproducción
  const tituloPopup = popup.querySelector("h3");
  if (tituloPopup) {
    tituloPopup.textContent = "Selecciona la calidad";
  }

  const opciones = [];

  // Agregar opciones individuales
  if (cartel.url && cartel.url.trim() !== "")
    opciones.push({
      nombre: "Audio Latino",
      tipo: "simple",
      url: cartel.url,
      icon: "lat.png",
    });
  if (cartel.urlCas && cartel.urlCas.trim() !== "")
    opciones.push({
      nombre: "Audio Castellano",
      tipo: "simple",
      url: cartel.urlCas,
      icon: "cas.png",
    });
  if (cartel.urlSub && cartel.urlSub.trim() !== "")
    opciones.push({
      nombre: "Audio Subtitulado",
      tipo: "simple",
      url: cartel.urlSub,
      icon: "sub.png",
    });
  if (cartel.urlCor && cartel.urlCor.trim() !== "")
    opciones.push({
      nombre: "Audio Coreano",
      tipo: "simple",
      url: cartel.urlCor,
      icon: "cor.png",
    });
  if (cartel.urlChi && cartel.urlChi.trim() !== "")
    opciones.push({
      nombre: "Audio Chino",
      tipo: "simple",
      url: cartel.urlChi,
      icon: "chi.png",
    });

  // Agregar listas de reproducción
  if (Array.isArray(cartel.urlLista) && cartel.urlLista.length > 0)
    opciones.push({
      nombre: "Lista Latino",
      tipo: "lista",
      lista: cartel.urlLista,
      icon: "lat.png",
    });
  if (Array.isArray(cartel.urlListaCas) && cartel.urlListaCas.length > 0)
    opciones.push({
      nombre: "Lista Castellano",
      tipo: "lista",
      lista: cartel.urlListaCas,
      icon: "cas.png",
    });
  if (Array.isArray(cartel.urlListaSub) && cartel.urlListaSub.length > 0)
    opciones.push({
      nombre: "Lista Subtitulado",
      tipo: "lista",
      lista: cartel.urlListaSub,
      icon: "sub.png",
    });
  if (Array.isArray(cartel.urlListaCor) && cartel.urlListaCor.length > 0)
    opciones.push({
      nombre: "Lista Coreano",
      tipo: "lista",
      lista: cartel.urlListaCor,
      icon: "cor.png",
    });
  if (Array.isArray(cartel.urlListaChi) && cartel.urlListaChi.length > 0)
    opciones.push({
      nombre: "Lista Chino",
      tipo: "lista",
      lista: cartel.urlListaChi,
      icon: "chi.png",
    });

  if (opciones.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.className = "sin-opciones";
    mensaje.textContent = "No hay opciones de reproducción disponibles";
    lista.appendChild(mensaje);
  } else {
    opciones.forEach((opcion) => {
      const btn = document.createElement("button");
      btn.className = "calidad-btn";

      // Create icon
      if (opcion.icon) {
        const img = document.createElement("img");
        img.src = BASE_URL + opcion.icon;
        img.style.width = "24px";
        img.style.height = "24px";
        img.style.marginRight = "10px";
        img.style.verticalAlign = "middle";
        btn.appendChild(img);
      }

      // Create text
      const span = document.createElement("span");
      span.textContent = opcion.nombre;
      span.style.verticalAlign = "middle";
      btn.appendChild(span);

      btn.onclick = () => {
        if (opcion.tipo === "lista") {
          videoslocales(opcion.lista);
        } else {
          // Pasar objeto con URL e ID explícito para películas
          videoslocales({ url: opcion.url, id: cartelActualGlobal.id });
        }
      };
      lista.appendChild(btn);
    });
  }

  popup.style.display = "flex";
}

function videoslocales(input) {
  const cartel = cartelActualGlobal;
  const poster = cartel.poster || cartel.miniatura || "";

  // Normalizar entrada
  let url = "";
  let lista = null;
  let contextData = { id: null };

  if (Array.isArray(input)) {
    // Es una lista (Serie) enviada para abrir el menú
    lista = input;
    url = lista[0].file; // Default para Pro
    contextData.id = cartel.id + "_cap0"; // Default
  } else if (typeof input === "object" && input.url) {
    // Es un objeto con contexto específico (Ej: {url: "...", id: "..."})
    url = input.url;
    contextData.id = input.id;
  } else {
    // Es una URL directa (String) - Asumimos Película principal
    url = input;
    contextData.id = cartel.id;
  }

  // Siempre cerrar el popup de selección de calidades (el pequeño)
  cerrarPopupCalidades();

  if (lista) {
    // === ES UNA SERIE (LISTA) ===

    // 1. Mostrar la interfaz de lista (Shelf) en el popup principal
    if (typeof manejarInterfazSeries === "function") {
      manejarInterfazSeries(cartel, lista);
    }

    // 2. Lógica de Reproducción
    if (typeof esMonitorActivo === "function" && esMonitorActivo()) {
      // MODO PRO (Monitor Externo):
      if (typeof videosLocalesPro === "function") {
        videosLocalesPro(url, poster, lista);
      }
    } else {
      // MODO ESTÁNDAR (Local):
      console.log("Modo Estándar: Lista de episodios mostrada.");
    }
  } else {
    // === ES UN VIDEO ÚNICO (O CAPÍTULO SELECCIONADO) ===

    // Reproducir usando el reproductor correspondiente
    if (typeof esMonitorActivo === "function" && esMonitorActivo()) {
      if (typeof videosLocalesPro === "function") {
        // Nota: videosLocalesPro aún no soporta contextData para progreso en monitor remoto
        // pero lo pasamos por si se implementa a futuro
        videosLocalesPro(url, poster);
      }
    } else {
      if (typeof videosLocalesEstandar === "function") {
        // Pasamos contextData para guardar progreso
        videosLocalesEstandar(url, poster, contextData);
      }
    }
  }
}

// Evento global para actualizar UI cuando se marca como visto
document.addEventListener("videoWatched", function (e) {
  const id = e.detail.id;
  console.log("Recibido evento videoWatched para:", id);

  // Buscar si hay items de serie mostrados actualmente y marcarlos
  // El formato de ID de capitulo es "ID_capINDEX"
  if (id.includes("_cap")) {
    const parts = id.split("_cap");
    if (parts.length === 2) {
      const index = parseInt(parts[1]);
      const shelfItems = document.querySelectorAll(".shelf-item");
      if (shelfItems[index]) {
        const imgContainer = shelfItems[index].querySelector("div"); // El div relativo wrapper
        if (imgContainer && !imgContainer.querySelector(".watched-icon")) {
          const icon = document.createElement("div");
          icon.className = "watched-icon";
          icon.innerHTML = '<i class="fas fa-check-circle"></i>';
          imgContainer.appendChild(icon);
        }
      }
    }
  }
});

function reproducirConCalidad(urlOLista) {
  cerrarPopupCalidades();

  if (cartelActualGlobal) {
    console.log("Reproduciendo con calidad seleccionada:", urlOLista);

    // Limpiar el fondo del player
    const playerElement = document.getElementById("player");
    playerElement.style.backgroundImage = "none";
    playerElement.style.minHeight = "400px";

    // Llamar a la función de reproducción
    reproductorVideoJSAudios(cartelActualGlobal, "", urlOLista);
  } else {
    console.error("No hay cartel actual para reproducir");
    //alert("Error: No se puede reproducir el video");
  }
}

function cerrarPopupCalidades() {
  const popup = document.getElementById("popup-calidades");
  popup.style.display = "none";
}

function tieneLinkMP4(cartel) {
  const links = [
    cartel.url,
    cartel.urlSub,
    cartel.urlCas,
    cartel.urlCor,
    cartel.urlChi,
  ];

  for (const link of links) {
    if (validarLinkMP4(link)) return true;
  }

  const listas = [
    cartel.urlLista,
    cartel.urlListaSub,
    cartel.urlListaCas,
    cartel.urlListaCor,
    cartel.urlListaChi,
  ];

  for (const lista of listas) {
    if (Array.isArray(lista)) {
      for (const item of lista) {
        if (validarLinkMP4(item.file)) return true;
      }
    }
  }

  return false;
}

function validarLinkMP4(url) {
  return (
    url && typeof url === "string" && url.trim().toLowerCase().endsWith(".mp4")
  );
}

function descargarVideo(cartel) {
  // Recopilar TODAS las fuentes de video disponibles, independiente de si son .mp4
  const fuentesDisponibles = [];

  // Verificar URLs individuales (sin filtrar por .mp4 primero)
  if (cartel.url && cartel.url.trim() !== "") {
    fuentesDisponibles.push({
      nombre: "Audio Latino",
      url: cartel.url,
      icon: "lat.png",
      esMP4: validarLinkMP4(cartel.url),
    });
  }
  if (cartel.urlCas && cartel.urlCas.trim() !== "") {
    fuentesDisponibles.push({
      nombre: "Audio Castellano",
      url: cartel.urlCas,
      icon: "cas.png",
      esMP4: validarLinkMP4(cartel.urlCas),
    });
  }
  if (cartel.urlSub && cartel.urlSub.trim() !== "") {
    fuentesDisponibles.push({
      nombre: "Audio Subtitulado",
      url: cartel.urlSub,
      icon: "sub.png",
      esMP4: validarLinkMP4(cartel.urlSub),
    });
  }
  if (cartel.urlCor && cartel.urlCor.trim() !== "") {
    fuentesDisponibles.push({
      nombre: "Audio Coreano",
      url: cartel.urlCor,
      icon: "cor.png",
      esMP4: validarLinkMP4(cartel.urlCor),
    });
  }
  if (cartel.urlChi && cartel.urlChi.trim() !== "") {
    fuentesDisponibles.push({
      nombre: "Audio Chino",
      url: cartel.urlChi,
      icon: "chi.png",
      esMP4: validarLinkMP4(cartel.urlChi),
    });
  }

  // Verificar listas de reproducción
  const listas = [
    { lista: cartel.urlLista, nombre: "Lista Latino", icon: "lat.png" },
    { lista: cartel.urlListaCas, nombre: "Lista Castellano", icon: "cas.png" },
    { lista: cartel.urlListaSub, nombre: "Lista Subtitulado", icon: "sub.png" },
    { lista: cartel.urlListaCor, nombre: "Lista Coreano", icon: "cor.png" },
    { lista: cartel.urlListaChi, nombre: "Lista Chino", icon: "chi.png" },
  ];

  listas.forEach((item) => {
    if (Array.isArray(item.lista) && item.lista.length > 0) {
      item.lista.forEach((video, index) => {
        if (video.file && video.file.trim() !== "") {
          fuentesDisponibles.push({
            nombre: `${item.nombre} - ${
              video.label || "Episodio " + (index + 1)
            }`,
            url: video.file,
            icon: item.icon,
            esMP4: validarLinkMP4(video.file),
          });
        }
      });
    }
  });

  // Filtrar solo las que son .mp4 descargables
  const opcionesDescarga = fuentesDisponibles.filter((fuente) => fuente.esMP4);

  console.log(
    "🔍 Debug descarga - Fuentes totales:",
    fuentesDisponibles.length,
  );
  console.log("🔍 Debug descarga - Opciones .mp4:", opcionesDescarga.length);

  // Si no hay opciones de descarga válidas (.mp4)
  if (opcionesDescarga.length === 0) {
    alert("No se encontró un enlace de descarga válido (.mp4).");
    return;
  }

  // MODIFICACIÓN CLAVE: Si hay múltiples FUENTES (aunque solo una sea .mp4),
  // mostrar el selector para que el usuario vea todas las opciones disponibles
  if (fuentesDisponibles.length > 1 && opcionesDescarga.length > 0) {
    mostrarPopupDescarga(cartel, opcionesDescarga);
    return;
  }

  // Si solo hay UNA fuente en total, descargar directamente
  if (opcionesDescarga.length === 1) {
    ejecutarDescarga(opcionesDescarga[0].url, cartel.titulo);
    return;
  }

  // Si hay múltiples opciones .mp4, mostrar popup de selección
  mostrarPopupDescarga(cartel, opcionesDescarga);
}

// Función para ejecutar la descarga nativa del navegador
function ejecutarDescarga(url, titulo) {
  const nombreArchivo =
    titulo.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".mp4";

  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Función para mostrar el popup de selección de calidad para descarga
function mostrarPopupDescarga(cartel, opcionesDescarga) {
  const popup = document.getElementById("popup-calidades");
  const lista = document.getElementById("lista-calidades");
  lista.innerHTML = "";

  // Cambiar el título del popup
  const tituloPopup = popup.querySelector("h3");
  if (tituloPopup) {
    tituloPopup.textContent = "Selecciona la calidad para descargar";
  }

  opcionesDescarga.forEach((opcion) => {
    const btn = document.createElement("button");
    btn.className = "calidad-btn";

    // Crear ícono
    if (opcion.icon) {
      const img = document.createElement("img");
      img.src = BASE_URL + opcion.icon;
      img.style.width = "24px";
      img.style.height = "24px";
      img.style.marginRight = "10px";
      img.style.verticalAlign = "middle";
      btn.appendChild(img);
    }

    // Crear texto
    const span = document.createElement("span");
    span.textContent = opcion.nombre;
    span.style.verticalAlign = "middle";
    btn.appendChild(span);

    btn.onclick = () => {
      ejecutarDescarga(opcion.url, cartel.titulo);
      cerrarPopupCalidades();
    };

    lista.appendChild(btn);
  });

  popup.style.display = "flex";
}

function limpiarTodasLasURLs(data) {
  // Limpiar URLs en películas
  if (Array.isArray(data.peliculas)) {
    data.peliculas.forEach((pelicula) => {
      ["url", "urlCas", "urlSub", "urlCor", "urlChi"].forEach((campo) => {
        if (pelicula[campo] && pelicula[campo].includes("key=")) {
          const url = new URL(pelicula[campo]);
          url.searchParams.delete("key");
          pelicula[campo] = url.toString();
        }
      });
    });
  }

  // Limpiar URLs (Listas)
  if (Array.isArray(data.peliculas)) {
    data.peliculas.forEach((serie) => {
      [
        "urlLista",
        "urlListaSub",
        "urlListaCas",
        "urlListaCor",
        "urlListaChi",
      ].forEach((listaNombre) => {
        if (Array.isArray(serie[listaNombre])) {
          serie[listaNombre].forEach((item) => {
            if (item.file && item.file.includes("key=")) {
              const url = new URL(item.file);
              url.searchParams.delete("key");
              item.file = url.toString();
            }
          });
        }
      });
    });
  }

  return data;
}

// Filtrar películas por género y actualizar contador
function filtrarPorGenero(generoSeleccionado) {
  contenedorLista.innerHTML = ""; // Limpiar el contenedor antes de mostrar resultados

  const peliculasFiltradas = peliculasArreglo.filter(
    (pelicula) =>
      pelicula.generos &&
      pelicula.generos
        .split(",")
        .map((g) => g.trim())
        .includes(generoSeleccionado),
  );

  const fragment = document.createDocumentFragment();
  peliculasFiltradas.forEach((video) => crearCarteles(video, fragment));
  contenedorLista.appendChild(fragment);

  // Actualizar el contador de películas filtradas
  contenedorContPelis.textContent = `Total: ${peliculasFiltradas.length} películas y series en "${generoSeleccionado}". `;
}

// Crear los botones de género optimizados
function crearBotonesGenero(generos) {
  const contenedorFiltros = document.getElementById("contenedorFiltros");
  contenedorFiltros.innerHTML = ""; // Limpiar antes de agregar

  const fragment = document.createDocumentFragment();
  generos.forEach((genero) => {
    const btn = document.createElement("button");
    btn.textContent = genero;
    btn.classList.add("boton-genero");
    btn.addEventListener("click", () => filtrarPorGenero(genero));
    fragment.appendChild(btn);
  });

  contenedorFiltros.appendChild(fragment);
}

function esEstreno(anioPelicula) {
  const anioActual = new Date().getFullYear(); // Obtiene el año actual
  return anioPelicula === anioActual;
}

function debeMostrarAnuncio(idPelicula) {
  const ultimaPelicula = localStorage.getItem("ultimaPeliculaVista");
  const ultimaFecha = localStorage.getItem("ultimaFechaVista");
  const fechaActual = new Date().toISOString().split("T")[0];

  // Mostrar anuncio si la película es diferente o si ha pasado un día
  return ultimaPelicula !== idPelicula || ultimaFecha !== fechaActual;
}

function crearCartelEspecial(cartel) {
  const etiqueta = document.createElement("h3");
  etiqueta.textContent = "Lista de películas y series:";
  etiqueta.className = "etiquetaListaDePeliculas";

  contenedorLista.appendChild(etiqueta);
}

function crearCarteles(cartel) {
  const videoItem = document.createElement("div");
  videoItem.classList.add("contenedor-video");
  videoItem.addEventListener("click", function () {
    contenedorJWPLAYER.style.display = "flex";
    openPopJW(cartel);
  });
  videoItem.style.cursor = "pointer";

  let proxiAux = false;
  let serieAux = false;
  const calidadAux = document.createElement("div");
  calidadAux.className = "contenedor-calidad";

  if (cartel.calidad === "1") {
    calidadAux.textContent = "SD";
  } else if (cartel.calidad === "2") {
    calidadAux.textContent = "HD";
  } else if (cartel.calidad === "3") {
    calidadAux.textContent = "FULLHD";
  } else if (cartel.calidad === "4") {
    calidadAux.textContent = "60FPS";
  } else if (cartel.calidad === "5") {
    calidadAux.textContent = "2K";
  } else if (cartel.calidad === "6") {
    calidadAux.textContent = "4K";
  } else if (cartel.url.includes("") && cartel.calidad.includes("")) {
    calidadAux.textContent = "No Disponible";
    proxiAux = true;
  }

  if (Array.isArray(cartel.urlLista)) {
    serieAux = true;
  }

  videoItem.appendChild(calidadAux);

  const estrenoAux = document.createElement("div");
  estrenoAux.className = "contenedor-estreno";

  let fechaAux =
    typeof cartel.fecha === "string" && cartel.fecha.includes("-")
      ? new Date(cartel.fecha).getFullYear()
      : Number(cartel.fecha);

  let esEstrenoAux = false;
  if (esEstreno(fechaAux)) {
    estrenoAux.textContent = "Estreno";
    esEstrenoAux = true;
    videoItem.appendChild(estrenoAux);
  } else {
    esEstrenoAux = false;
  }
  if (proxiAux) {
    esEstrenoAux = true;
    estrenoAux.textContent = "Próxima..";
    estrenoAux.style.color = "white";
    estrenoAux.style.fontSize = "12px";
    estrenoAux.style.border = "1px solid green";
    estrenoAux.style.boxShadow = "0 0 1px white,0 0 1px white,";

    videoItem.appendChild(estrenoAux);
  } else {
    proxiAux = false;
  }

  if (serieAux && !esEstrenoAux) {
    const estrenoSerie = document.createElement("div");
    estrenoSerie.className = "contenedor-serie";
    estrenoSerie.textContent = "Serie";
    estrenoSerie.style.color = "yellow";
    estrenoSerie.style.fontSize = "12px";
    estrenoSerie.style.border = "1px solid yellow";
    estrenoSerie.style.boxShadow = "0 0 1px white,0 0 1px white,";
    estrenoSerie.style.top = "25px";
    videoItem.appendChild(estrenoSerie);
  }
  if (serieAux && esEstrenoAux) {
    const estrenoSerie = document.createElement("div");
    estrenoSerie.className = "contenedor-serie";
    estrenoSerie.textContent = "Serie";
    estrenoSerie.style.color = "yellow";
    estrenoSerie.style.fontSize = "12px";
    estrenoSerie.style.border = "1px solid yellow";
    estrenoSerie.style.boxShadow = "0 0 1px white,0 0 1px white,";

    videoItem.appendChild(estrenoSerie);
  } else {
    serieAux = false;
  }

  // Crear imágenes con carga diferida
  const poster = document.createElement("img");
  poster.dataset.src = cartel.miniatura; // Guardamos la URL en data-src
  poster.alt = cartel.nombreCanal;
  poster.classList.add("lazy"); // Agregamos una clase para identificarlas
  poster.style.opacity = "0";
  poster.style.transition = "opacity 0.2s ease-in-out";

  // ✅ OPTIMIZACIÓN CRÍTICA: Íconos de audio SIN lazy loading
  // Los íconos son muy pequeños (~5KB cada uno) y observarlos causa más overhead que beneficio
  const contenedorIconosAudios = document.createElement("div");
  contenedorIconosAudios.id = "contenedorIconosAudios";
  if (cartel.url || cartel.urlLista) {
    const iconoAudio = document.createElement("img");
    iconoAudio.src = BASE_URL + "lat.png"; // ✅ Carga directa (sin data-src)
    iconoAudio.id = "iconoAudio";
    contenedorIconosAudios.appendChild(iconoAudio);
  }
  if (cartel.urlSub || cartel.urlListaSub) {
    const iconoAudio = document.createElement("img");
    iconoAudio.src = BASE_URL + "sub.png"; // ✅ Carga directa
    iconoAudio.id = "iconoAudio";
    contenedorIconosAudios.appendChild(iconoAudio);
  }
  if (cartel.urlCas || cartel.urlListaCas) {
    const iconoAudio = document.createElement("img");
    iconoAudio.src = BASE_URL + "cas.png"; // ✅ Carga directa
    iconoAudio.id = "iconoAudio";
    contenedorIconosAudios.appendChild(iconoAudio);
  }
  if (cartel.urlCor || cartel.urlListaCor) {
    const iconoAudio = document.createElement("img");
    iconoAudio.src = BASE_URL + "cor.png"; // ✅ Carga directa
    iconoAudio.id = "iconoAudio";
    contenedorIconosAudios.appendChild(iconoAudio);
  }
  if (cartel.urlChi || cartel.urlListaChi) {
    const iconoAudio = document.createElement("img");
    iconoAudio.src = BASE_URL + "chi.png"; // ✅ Carga directa
    iconoAudio.id = "iconoAudio";
    contenedorIconosAudios.appendChild(iconoAudio);
  }
  videoItem.appendChild(contenedorIconosAudios);

  // Agregar la imagen al DOM
  //document.body.appendChild(poster);

  const title = document.createElement("h3");
  title.textContent = cartel.titulo;

  const h3Fecha = document.createElement("h2");
  h3Fecha.textContent = cartel.fecha + " | " + cartel.duracion;

  videoItem.appendChild(poster);
  // Observa la imagen recién creada
  observer.observe(poster);

  videoItem.appendChild(title);
  videoItem.appendChild(h3Fecha);

  //Modificar y validar según se agregen categorías del menú
  contenedorLista.appendChild(videoItem);
}

function crearCartelesRecientes(cartel) {
  const videoItem = document.createElement("div");
  videoItem.classList.add("contenedor-video-recientes");
  videoItem.addEventListener("click", function () {
    contenedorJWPLAYER.style.display = "flex";
    openPopJW(cartel);
  });
  videoItem.style.cursor = "pointer";

  let proxiAux = false;
  let serieAux = false;
  const calidadAux = document.createElement("div");
  calidadAux.className = "contenedor-calidad";

  if (cartel.calidad === "1") {
    calidadAux.textContent = "SD";
  } else if (cartel.calidad === "2") {
    calidadAux.textContent = "HD";
  } else if (cartel.calidad === "3") {
    calidadAux.textContent = "FULLHD";
  } else if (cartel.calidad === "4") {
    calidadAux.textContent = "60FPS";
  } else if (cartel.calidad === "5") {
    calidadAux.textContent = "2K";
  } else if (cartel.calidad === "6") {
    calidadAux.textContent = "4K";
  } else if (cartel.url.includes("") && cartel.calidad.includes("")) {
    calidadAux.textContent = "No Disponible";
    proxiAux = true;
  }

  if (Array.isArray(cartel.urlLista)) {
    serieAux = true;
  }

  videoItem.appendChild(calidadAux);

  const estrenoAux = document.createElement("div");
  estrenoAux.className = "contenedor-estreno";

  let fechaAux =
    typeof cartel.fecha === "string" && cartel.fecha.includes("-")
      ? new Date(cartel.fecha).getFullYear()
      : Number(cartel.fecha);

  let esEstrenoAux = false;
  if (esEstreno(fechaAux)) {
    estrenoAux.textContent = "Estreno";
    esEstrenoAux = true;
    videoItem.appendChild(estrenoAux);
  } else {
    esEstrenoAux = false;
  }
  if (proxiAux) {
    estrenoAux.textContent = "Próxima..";
    estrenoAux.style.color = "white";
    estrenoAux.style.fontSize = "12px";
    estrenoAux.style.border = "1px solid green";
    estrenoAux.style.boxShadow = "0 0 1px white,0 0 1px white,";

    videoItem.appendChild(estrenoAux);
  } else {
    proxiAux = false;
  }

  if (serieAux && !esEstrenoAux) {
    const estrenoSerie = document.createElement("div");
    estrenoSerie.className = "contenedor-serie";
    estrenoSerie.textContent = "Serie";
    estrenoSerie.style.color = "yellow";
    estrenoSerie.style.fontSize = "12px";
    estrenoSerie.style.border = "1px solid yellow";
    estrenoSerie.style.boxShadow = "0 0 1px white,0 0 1px white,";
    estrenoSerie.style.top = "25px";
    videoItem.appendChild(estrenoSerie);
  }
  if (serieAux && esEstrenoAux) {
    const estrenoSerie = document.createElement("div");
    estrenoSerie.className = "contenedor-serie";
    estrenoSerie.textContent = "Serie";
    estrenoSerie.style.color = "yellow";
    estrenoSerie.style.fontSize = "12px";
    estrenoSerie.style.border = "1px solid yellow";
    estrenoSerie.style.boxShadow = "0 0 1px white,0 0 1px white,";

    videoItem.appendChild(estrenoSerie);
  } else {
    serieAux = false;
  }

  // Crear imágenes con carga diferida
  const poster = document.createElement("img");
  poster.dataset.src = cartel.miniatura; // Guardamos la URL en data-src
  poster.alt = cartel.nombreCanal;
  poster.classList.add("lazy"); // Agregamos una clase para identificarlas
  poster.style.opacity = "0";
  poster.style.transition = "opacity 0.2s ease-in-out";

  //Crear íconos de los audios
  const contenedorIconosAudios = document.createElement("div");
  contenedorIconosAudios.id = "contenedorIconosAudios";
  if (cartel.url || cartel.urlLista) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "lat.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlSub || cartel.urlListaSub) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "sub.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlCas || cartel.urlListaCas) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "cas.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlCor || cartel.urlListaCor) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "cor.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlChi || cartel.urlListaChi) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "cas.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  videoItem.appendChild(contenedorIconosAudios);

  const title = document.createElement("h3");
  title.textContent = cartel.titulo;

  videoItem.appendChild(poster);
  // Observa la imagen recién creada
  observer.observe(poster);

  videoItem.appendChild(title);

  //Modificar y validar según se agregen categorías del menú
  contenedorEspecial.appendChild(videoItem);
}

function crearCartelesSeries(cartel) {
  const videoItem = document.createElement("div");
  videoItem.classList.add("contenedor-video-series");
  videoItem.addEventListener("click", function () {
    contenedorJWPLAYER.style.display = "flex";
    openPopJW(cartel);
  });
  videoItem.style.cursor = "pointer";

  let proxiAux = false;
  let serieAux = false;
  const calidadAux = document.createElement("div");
  calidadAux.className = "contenedor-calidad";

  if (cartel.calidad === "1") {
    calidadAux.textContent = "SD";
  } else if (cartel.calidad === "2") {
    calidadAux.textContent = "HD";
  } else if (cartel.calidad === "3") {
    calidadAux.textContent = "FULLHD";
  } else if (cartel.calidad === "4") {
    calidadAux.textContent = "60FPS";
  } else if (cartel.calidad === "5") {
    calidadAux.textContent = "2K";
  } else if (cartel.calidad === "6") {
    calidadAux.textContent = "4K";
  } else if (cartel.url.includes("") && cartel.calidad.includes("")) {
    calidadAux.textContent = "No Disponible";
    proxiAux = true;
  }

  if (Array.isArray(cartel.urlLista)) {
    serieAux = true;
  }

  videoItem.appendChild(calidadAux);

  const estrenoAux = document.createElement("div");
  estrenoAux.className = "contenedor-estreno";

  let fechaAux =
    typeof cartel.fecha === "string" && cartel.fecha.includes("-")
      ? new Date(cartel.fecha).getFullYear()
      : Number(cartel.fecha);

  let esEstrenoAux = false;
  if (esEstreno(fechaAux)) {
    estrenoAux.textContent = "Estreno";
    esEstrenoAux = true;
    videoItem.appendChild(estrenoAux);
  } else {
    esEstrenoAux = false;
  }
  if (proxiAux) {
    estrenoAux.textContent = "Próxima..";
    estrenoAux.style.color = "white";
    estrenoAux.style.fontSize = "12px";
    estrenoAux.style.border = "1px solid green";
    estrenoAux.style.boxShadow = "0 0 1px white,0 0 1px white,";

    videoItem.appendChild(estrenoAux);
  } else {
    proxiAux = false;
  }

  if (serieAux && !esEstrenoAux) {
    const estrenoSerie = document.createElement("div");
    estrenoSerie.className = "contenedor-serie";
    estrenoSerie.textContent = "Serie";
    estrenoSerie.style.color = "yellow";
    estrenoSerie.style.fontSize = "12px";
    estrenoSerie.style.border = "1px solid yellow";
    estrenoSerie.style.boxShadow = "0 0 1px white,0 0 1px white,";
    estrenoSerie.style.top = "25px";
    videoItem.appendChild(estrenoSerie);
  }
  if (serieAux && esEstrenoAux) {
    const estrenoSerie = document.createElement("div");
    estrenoSerie.className = "contenedor-serie";
    estrenoSerie.textContent = "Serie";
    estrenoSerie.style.color = "yellow";
    estrenoSerie.style.fontSize = "12px";
    estrenoSerie.style.border = "1px solid yellow";
    estrenoSerie.style.boxShadow = "0 0 1px white,0 0 1px white,";

    videoItem.appendChild(estrenoSerie);
  } else {
    serieAux = false;
  }

  // Crear imágenes con carga diferida
  const poster = document.createElement("img");
  poster.dataset.src = cartel.miniatura; // Guardamos la URL en data-src
  poster.alt = cartel.nombreCanal;
  poster.classList.add("lazy"); // Agregamos una clase para identificarlas
  poster.style.opacity = "0";
  poster.style.transition = "opacity 0.2s ease-in-out";

  //Crear íconos de los audios
  const contenedorIconosAudios = document.createElement("div");
  contenedorIconosAudios.id = "contenedorIconosAudios";
  if (cartel.url || cartel.urlLista) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "lat.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlSub || cartel.urlListaSub) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "sub.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlCas || cartel.urlListaCas) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "cas.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlCor || cartel.urlListaCor) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "cor.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  if (cartel.urlChi || cartel.urlListaChi) {
    const iconoAudio = document.createElement("img");
    iconoAudio.dataset.src = BASE_URL + "cas.png";
    iconoAudio.id = "iconoAudio";
    iconoAudio.classList.add("lazy");
    iconoAudio.style.opacity = "0";
    iconoAudio.style.transition = "opacity 0.2s ease-in-out";
    contenedorIconosAudios.appendChild(iconoAudio);
    observer.observe(iconoAudio);
  }
  videoItem.appendChild(contenedorIconosAudios);

  const title = document.createElement("h3");
  title.textContent = cartel.titulo;

  videoItem.appendChild(poster);
  // Observa la imagen recién creada
  observer.observe(poster);

  videoItem.appendChild(title);

  //Modificar y validar según se agregen categorías del menú
  contenedorEspecialSeries.appendChild(videoItem);
}

const inputBuscar = document.getElementById("buscar");
let peliculasArreglo = [];
let searchTimeout; // Variable para el debouncing

function filtrarPeliculas() {
  const consulta = inputBuscar.value.trim().toLowerCase();

  // ✅ OPTIMIZACIÓN: No hacer nada si es muy corto
  if (consulta.length > 0 && consulta.length < 3) {
    return;
  }

  // ✅ OPTIMIZACIÓN: Usar requestAnimationFrame para mejor rendimiento
  requestAnimationFrame(() => {
    // Limpiar el contenedor antes de agregar nuevos resultados
    contenedorLista.innerHTML = "";

    // Si no hay consulta, mostrar todas las películas (limitadas a 100)
    if (consulta === "") {
      const limitedPelis = peliculasArreglo.slice(0, 100);
      limitedPelis.forEach((pelicula) => {
        if (pelicula.titulo) {
          crearCarteles(pelicula);
        }
      });
    } else if (consulta.length >= 3) {
      const resultados = peliculasArreglo
        .filter((pelicula) => pelicula.titulo.toLowerCase().includes(consulta))
        .slice(0, 50); // Limitar resultados a 50
      resultados.forEach(crearCarteles);
    }
  });
}

// ✅ SOLUCIÓN #4: Debouncing - Esperar 300ms antes de ejecutar la búsqueda
function debouncedFilter() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(filtrarPeliculas, 300);
}

// Evento para la búsqueda en tiempo real (con debouncing)
inputBuscar.addEventListener("input", debouncedFilter);

const contenedorTituloPop = document.getElementById("titulo-pop");
const contenedorDescripcionPop = document.getElementById("descripcion-pop");
const contenedorGenerosPop = document.getElementById("generos-pop");
const contenedorMetadataPop = document.getElementById("metadata-pop");
const contenedorCerrarPop = document.getElementById("cerrar-pop");

const vast = "";
const posterPlayer = document.getElementById("player");

function openPopJW(cartel) {
  cartelActualGlobal = cartel;

  // Mostrar el contenedor principal
  contenedorJWPLAYER.style.display = "flex";

  // Configurar botón de descarga
  const btnDownload = document.getElementById("btn-download");
  console.log("🔍 Debug descarga - Cartel:", cartel);
  console.log("🔍 Debug descarga - URLs:", {
    url: cartel.url,
    urlSub: cartel.urlSub,
    urlCas: cartel.urlCas,
    urlCor: cartel.urlCor,
    urlChi: cartel.urlChi,
  });
  console.log("🔍 Debug descarga - Listas:", {
    urlLista: cartel.urlLista,
    urlListaSub: cartel.urlListaSub,
    urlListaCas: cartel.urlListaCas,
    urlListaCor: cartel.urlListaCor,
    urlListaChi: cartel.urlListaChi,
  });

  const tieneMP4 = tieneLinkMP4(cartel);
  console.log("🔍 Debug descarga - tieneLinkMP4():", tieneMP4);

  if (tieneMP4) {
    btnDownload.style.display = "flex";
    btnDownload.onclick = () => descargarVideo(cartel);
    console.log("✅ Botón de descarga VISIBLE");
  } else {
    btnDownload.style.display = "none";
    console.log("❌ Botón de descarga OCULTO");
  }

  // Configurar botón de play
  const btnPlay = document.getElementById("btn-play-movie");
  btnPlay.onclick = () => mostrarPopupCalidades(cartel);

  // Configurar botones adicionales
  const btnWatchlist = document.querySelector(".btn-watchlist");
  if (btnWatchlist) {
    btnWatchlist.onclick = () => toggleWatchlist(cartel);
    updateWatchlistButton(cartel.id);
  }

  const btnShare = document.querySelector(".btn-share");
  if (btnShare) {
    btnShare.onclick = () => (window.location.href = "http://action_share");
  }

  // Actualizar información de la película
  document.getElementById("titulo-pop").textContent = cartel.titulo;
  document.getElementById("descripcion-pop").textContent = cartel.descripcion;

  // Update poster and background
  const bgImage = document.getElementById("bg-image-pop");
  if (bgImage) {
    bgImage.style.backgroundImage = `url("${cartel.poster}")`;
  }

  const posterImage = document.getElementById("poster-image-pop");
  if (posterImage) {
    // Set CSS variables for responsive images
    posterImage.style.setProperty("--mobile-poster", `url("${cartel.poster}")`);
    posterImage.style.setProperty(
      "--desktop-poster",
      `url("${cartel.miniatura || cartel.poster}")`,
    );
  }

  const movieTitlePoster = document.getElementById("movie-title-poster");
  if (movieTitlePoster) {
    movieTitlePoster.textContent = cartel.titulo;
  }

  // Metadata formatting
  const metadataFull = document.getElementById("metadata-full-pop");
  if (metadataFull) {
    // Clean genres
    let genres = cartel.generos
      ? cartel.generos.replace(/^\s*todos\s*,?\s*/i, "")
      : "";

    let html = `${cartel.fecha} <span></span> ${cartel.duracion}`;
    if (genres) {
      html += ` <span></span> ${genres}`;
    }
    metadataFull.innerHTML = html;
  }

  // Legacy support for hidden elements
  const metaPop = document.getElementById("metadata-pop");
  if (metaPop)
    metaPop.textContent =
      "Año: " + cartel.fecha + " | Duración: " + cartel.duracion;

  const genPop = document.getElementById("generos-pop");
  if (genPop) playerElement.style.backgroundImage = "none";

  // Ocultar elementos que no se usan en el nuevo diseño
  const audiosPop = document.getElementById("audios-pop");
  if (audiosPop) audiosPop.style.display = "none";

  // Mostrar estadísticas (Solo leer, no contar visita aún)
  obtenerStats(cartel);
}

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxnBmUZwmoU64bPKnyhmeaDcOiHnDP-L4nMVK7YUGB8zg6C4ds0RJwb1srHK4B8SDBv4Q/exec";
const cooldown = 10 * 1000;
var cartelAux;
function getUniqueId(cartel, episodeIndex) {
  if (
    episodeIndex !== null &&
    episodeIndex !== undefined &&
    episodeIndex >= 0
  ) {
    return "proyectoja_" + cartel.id + "_cap_" + episodeIndex;
  }
  return "proyectoja_" + cartel.id;
}

function obtenerStats(cartel, episodeIndex = null) {
  cartelAux = getUniqueId(cartel, episodeIndex);

  // Leer voto del localStorage y actualizar UI inmediatamente
  const votoGuardado = getVotoAnterior();
  marcarBotonVotado(votoGuardado);

  fetch(`${GOOGLE_SCRIPT_URL}?id=${cartelAux}&action=get`)
    .then((res) => res.json())
    .then((data) => actualizarStats(data))
    .catch((err) => {
      // Si falla, al menos mostramos 0 o lo que haya
      console.error(err);
    });
}

function registrarVisita(cartel, episodeIndex = null) {
  const id = getUniqueId(cartel, episodeIndex);
  fetch(`${GOOGLE_SCRIPT_URL}?id=${id}&action=visita`)
    .then((res) => res.json())
    .then((data) => actualizarStats(data))
    .catch((err) => console.error(err));

  // Si es un capítulo (episodeIndex válido), también contar visita para la serie principal
  if (
    episodeIndex !== null &&
    episodeIndex !== undefined &&
    episodeIndex >= 0
  ) {
    const seriesId = getUniqueId(cartel, null);
    // Hacemos la petición para la serie pero NO actualizamos la UI (actualizarStats)
    // porque el usuario está viendo el capítulo
    fetch(`${GOOGLE_SCRIPT_URL}?id=${seriesId}&action=visita`).catch((err) =>
      console.error("Error al registrar visita de serie:", err),
    );
  }
}

function actualizarStats(data) {
  document.getElementById("vistas").textContent =
    data.visitas + " visualizaciones";
  document.getElementById("textLike").textContent = data.likes;
  document.getElementById("textDislike").textContent = data.dislikes;
}

function puedeEnviar(accion) {
  const clave = `${cartelAux}_${accion}_cooldown`;
  const ultima = localStorage.getItem(clave);
  const ahora = Date.now();
  if (!ultima || ahora - ultima > cooldown) {
    localStorage.setItem(clave, ahora);
    return true;
  }
  return false;
}

function getVotoAnterior() {
  return localStorage.getItem(`${cartelAux}_voto`);
}

function setVoto(voto) {
  localStorage.setItem(`${cartelAux}_voto`, voto);
}

function votar(nuevoVoto) {
  const anterior = getVotoAnterior();

  // Lógica de Toggle (Deshacer voto si es el mismo)
  if (anterior === nuevoVoto) {
    // Optimistic update: quitar voto
    marcarBotonVotado(null);
    setVoto(""); // Limpiar localStorage
    updateCountUI(nuevoVoto, -1);

    fetch(`${GOOGLE_SCRIPT_URL}?id=${cartelAux}&undo=${nuevoVoto}`)
      .then((res) => res.json())
      .then((data) => actualizarStats(data))
      .catch((err) => console.error(err));
    return;
  }

  // Si es un voto nuevo o cambio de voto
  if (!puedeEnviar(nuevoVoto)) {
    // Opcional: mostrar mensaje de cooldown
    return;
  }

  // Optimistic update
  marcarBotonVotado(nuevoVoto);
  setVoto(nuevoVoto);

  if (anterior) updateCountUI(anterior, -1); // Restar el anterior
  updateCountUI(nuevoVoto, 1); // Sumar el nuevo

  let urlFinal = `${GOOGLE_SCRIPT_URL}?id=${cartelAux}&action=${nuevoVoto}`;
  if (anterior) {
    urlFinal += `&undo=${anterior}`;
  }

  fetch(urlFinal)
    .then((res) => res.json())
    .then((data) => {
      actualizarStats(data);
    })
    .catch((err) => console.error("Error:", err));
}

function updateCountUI(type, delta) {
  const el =
    type === "like"
      ? document.getElementById("textLike")
      : document.getElementById("textDislike");
  if (el) {
    let val = parseInt(el.textContent) || 0;
    el.textContent = Math.max(0, val + delta);
  }
}

function marcarBotonVotado(voto) {
  const btnLike = document.getElementById("iconLike");
  const btnDislike = document.getElementById("iconDislike");

  if (voto === "like") {
    btnLike.className = "fas fa-thumbs-up"; // Filled thumbs up
    btnDislike.className = "far fa-thumbs-down"; // Outline thumbs down
  } else if (voto === "dislike") {
    btnLike.className = "far fa-thumbs-up"; // Outline thumbs up
    btnDislike.className = "fas fa-thumbs-down"; // Filled thumbs down
  } else {
    // Reset to default (outline)
    btnLike.className = "far fa-thumbs-up";
    btnDislike.className = "far fa-thumbs-down";
  }
}

const playerElement = document.getElementById("player");
const messageElement = document.getElementById("next-message");
const shelfElement = document.getElementById("shelf");
const labelElement = document.getElementById("more-label");

let currentIndex = 0;
let autoplayTimer = null;
let autoplayAux = false;
let index = 0;
let saveInterval = null;

function reproductorVideoJSTrailer(cartel, vast, trailer) {
  posterPlayer.style.backgroundImage = 'url("")';

  const seriesControls = document.getElementById("series-controls");
  if (seriesControls) seriesControls.style.display = "none";

  let v = extraerIdYoutube(trailer);

  if (videoPlayer) {
    videoPlayer.dispose();
    videoPlayer = null;
  }

  // Para YouTube, usamos un iframe embebido
  const playerWrapper = document.getElementById("player-wrapper");
  const posterImage = document.getElementById("poster-image-pop");

  if (playerWrapper) playerWrapper.style.display = "flex";
  if (posterImage) posterImage.style.display = "none";

  // Ocultar el botón de cerrar del popup principal
  const cerrarPop = document.getElementById("cerrar-pop");
  if (cerrarPop) cerrarPop.style.display = "none";

  const playerContainer = document.getElementById("player");
  playerContainer.innerHTML = `
    <iframe 
      width="100%" 
      height="100%" 
      src="https://www.youtube.com/embed/${v}?autoplay=1" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;

  console.log("Reproduciendo trailer de YouTube: " + v);
}

function extraerIdYoutubeUrl(url) {
  let youtubeUrl = new URL(url);
  let id = youtubeUrl.searchParams.get("v");
  return id;
}

function extraerIdYoutube(url) {
  const regex =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([^?&]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

let bloquesAnuncios = 0;

// Función para manejar la interfaz de series (Shelf/Lista) sin Video.js
function manejarInterfazSeries(cartel, playlist) {
  // Referencias a elementos del DOM
  const messageElement = document.getElementById("next-message");
  const shelfElement = document.getElementById("shelf");
  const labelElement = document.getElementById("more-label");
  const seriesControls = document.getElementById("series-controls");
  const playerWrapper = document.getElementById("player-wrapper");
  const posterImage = document.getElementById("poster-image-pop");
  const cerrarPop = document.getElementById("cerrar-pop");

  // Limpiar mensajes y estados previos
  if (messageElement) {
    messageElement.textContent = "";
    messageElement.style.display = "none";
  }

  // Configurar visualización del popup
  // Ocultamos la imagen del poster para dar espacio, pero mostramos el wrapper
  if (playerWrapper) playerWrapper.style.display = "flex";
  if (posterImage) posterImage.style.display = "none";

  // Limpiar contenedor donde antes iba el player (por si acaso)
  const playerContainer = document.getElementById("player");
  if (playerContainer) playerContainer.innerHTML = "";

  // Asegurar que el botón de cerrar esté visible (ya que no hay player fullscreen aquí)
  if (cerrarPop) cerrarPop.style.display = "flex";

  // Mostrar contenedores de la serie
  if (seriesControls) seriesControls.style.display = "flex";
  if (labelElement) {
    labelElement.style.display = "flex";
    labelElement.textContent = "Capítulos disponibles:";
  }

  if (shelfElement) {
    shelfElement.style.display = "flex";
    shelfElement.innerHTML = ""; // Limpiar lista anterior
  }

  // Generar la lista de capítulos
  if (Array.isArray(playlist)) {
    playlist.forEach((item, i) => {
      if (item.image && item.title && item.file) {
        const div = document.createElement("div");
        div.className = "shelf-item";

        // Verificar si el capítulo ha sido visto (lógica de UI)
        const watchedKey = "watched_" + cartel.id + "_cap" + i;
        const isWatched = localStorage.getItem(watchedKey) === "true";

        const watchedIconHTML = isWatched
          ? '<div class="watched-icon"><i class="fas fa-check-circle"></i></div>'
          : "";

        div.innerHTML = `
          <div style="position: relative;">
            <img src="${item.image}" loading="lazy">
            ${watchedIconHTML}
          </div>
          <div class="title">${item.title}</div>
        `;

        // Evento Click: Reproducir el capítulo específico
        div.addEventListener("click", () => {
          // Actualizar información del título en el popup
          const contenedorTituloPop = document.getElementById("titulo-pop");
          const contenedorDescripcionPop =
            document.getElementById("descripcion-pop");

          if (contenedorTituloPop) contenedorTituloPop.textContent = item.title;
          if (contenedorDescripcionPop)
            contenedorDescripcionPop.textContent = item.description || "";

          // LLAMAR A LA NUEVA FUNCIÓN DE REPRODUCCIÓN con el video individual
          // Pasamos objeto con URL e Identificador único para guardar progreso
          videoslocales({ url: item.file, id: cartel.id + "_cap" + i });
        });

        if (shelfElement) shelfElement.appendChild(div);
      }
    });
  }
}

const contenedorDisqus = document.getElementById("disqus_thread");

function closePlayerOnly() {
  if (videoPlayer) {
    videoPlayer.pause();
  }
  const playerWrapper = document.getElementById("player-wrapper");
  const posterImage = document.getElementById("poster-image-pop");

  if (playerWrapper) playerWrapper.style.display = "none";
  if (posterImage) posterImage.style.display = "flex";

  // Mostrar el botón de cerrar del popup principal
  const cerrarPop = document.getElementById("cerrar-pop");
  if (cerrarPop) cerrarPop.style.display = "flex";
}

function closePopJW() {
  // ✅ SOLUCIÓN #2: Destruir Video.js correctamente antes de cerrar
  if (videoPlayer) {
    console.log("🧹 Limpiando Video.js player");
    videoPlayer.dispose();
    videoPlayer = null;
  }

  // ✅ SOLUCIÓN #3: Limpiar completamente el DOM para liberar memoria
  const playerContainer = document.getElementById("player");
  if (playerContainer) playerContainer.innerHTML = "";

  // Limpiar el shelf (miniaturas de episodios)
  if (shelfElement) shelfElement.innerHTML = "";

  const playerWrapper = document.getElementById("player-wrapper");
  const posterImage = document.getElementById("poster-image-pop");

  if (playerWrapper) playerWrapper.style.display = "none";
  if (posterImage) posterImage.style.display = "flex";

  contenedorDisqus.textContent = "";
  contenedorJWPLAYER.style.display = "none";

  bloquesAnuncios = 0;
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
  labelElement.style.display = "none";
  messageElement.textContent = "";
  messageElement.style.display = "none";
  shelfElement.style.display = "none";

  // Resetear estadísticas
  document.getElementById("vistas").textContent = "";
  document.getElementById("textLike").textContent = "0";
  document.getElementById("textDislike").textContent = "0";
  const iconLike = document.getElementById("iconLike");
  const iconDislike = document.getElementById("iconDislike");
  if (iconLike) iconLike.className = "far fa-thumbs-up";
  if (iconDislike) iconDislike.className = "far fa-thumbs-down";

  console.log("✅ Popup cerrado y recursos liberados");
}

//anunciosAdsterra();
//Anucios publicitarios
function anunciosAdsterra() {
  let contador = 0; // Contador para llevar el seguimiento del número de veces que se han mostrado los anuncios
  const limite = 10; // Número de veces que los anuncios se mostrarán antes de la pausa
  const pausa = 5 * 60 * 1000; // 5 minutos en milisegundos
  let intervaloID; // Variable para almacenar el ID del intervalo

  // Función para actualizar los anuncios
  function actualizarAnuncios() {
    if (contador < limite) {
      // Actualizar los tres anuncios
      actualizarAnuncio1();
      setTimeout(actualizarAnuncio2, 1000);
      contador++;
    } else {
      // Pausa de 5 minutos
      console.log("Pausa de 5 minutos...");
      setTimeout(() => {
        contador = 0; // Reiniciar el contador después de la pausa
        console.log("Reiniciando presentación de anuncios...");
        actualizarAnuncios(); // Volver a mostrar los anuncios después de la pausa
      }, pausa);
    }
  }

  // Funciones para actualizar cada uno de los anuncios
  function actualizarAnuncio1() {
    const anuncioContainer = document.getElementById("anuncio-container1");
    anuncioContainer.innerHTML = "";

    const scriptElem = document.createElement("script");
    scriptElem.type = "text/javascript";
    window.atOptions = {
      key: "88a6bb18554c71538bb646e14b162cc5",
      format: "iframe",
      height: 50,
      width: 320,
      params: {},
    };
    scriptElem.src =
      "//www.highperformanceformat.com/88a6bb18554c71538bb646e14b162cc5/invoke.js";
    anuncioContainer.appendChild(scriptElem);
  }

  function actualizarAnuncio2() {
    const anuncioContainer = document.getElementById("anuncio-container2");
    anuncioContainer.innerHTML = "";

    const scriptElem = document.createElement("script");
    scriptElem.type = "text/javascript";
    window.atOptions = {
      key: "46e27ebf2835db11826f50ace565bd99",
      format: "iframe",
      height: 60,
      width: 468,
      params: {},
    };
    scriptElem.src =
      "//www.highperformanceformat.com/46e27ebf2835db11826f50ace565bd99/invoke.js";
    anuncioContainer.appendChild(scriptElem);
  }

  // Función para iniciar la actualización de anuncios
  function iniciarActualizacion() {
    if (!intervaloID) {
      console.log("Iniciando actualización de anuncios...");
      intervaloID = setInterval(actualizarAnuncios, 20000);
    }
  }

  // Función para detener la actualización de anuncios
  function detenerActualizacion() {
    if (intervaloID) {
      clearInterval(intervaloID);
      intervaloID = null;
      console.log("Actualización de anuncios detenida.");
    }
  }

  // Detectar cuando la pestaña está visible o el mouse está en la pestaña
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      iniciarActualizacion();
    } else {
      detenerActualizacion();
    }
  });

  window.addEventListener("mousemove", () => {
    if (document.visibilityState === "visible") {
      iniciarActualizacion();
    }
  });

  // Inicia la actualización si la página está visible al cargar
  if (document.visibilityState === "visible") {
    iniciarActualizacion();
  }
}

// Función para cargar Disqus dinámicamente usando el ID como identificador
function cargarChat() {
  const idAux = contenedorTituloPop.textContent.replace(/\s+/g, "_");
  const url = `https://proyectoja.com/${idAux}`;
  console.log(url);

  if (window.DISQUS) {
    DISQUS.reset({
      reload: true,
      config: function () {
        this.page.identifier = idAux;
        this.page.url = url;
      },
    });
  } else {
    window.disqus_config = function () {
      this.page.identifier = idAux;
      this.page.url = url;
    };

    const d = document,
      s = d.createElement("script");
    s.src = "https://https-proyectoja-github-io-proyectoja.disqus.com/embed.js"; // tu subdominio
    s.setAttribute("data-timestamp", +new Date());
    s.id = "disqus-script";
    (d.head || d.body).appendChild(s);
  }
}

const contUsuarios = document.getElementById("contUsuarios");

/**
 * Verifica si la película tiene un enlace .mp4 del dominio rumble.com
 * No debe ser una lista/playlist
 */
function tieneLinkMP4(cartel) {
  // Verificar que cartel existe
  if (!cartel) return false;

  // Si tiene urlLista o cualquier variante de listas, no mostrar el botón
  if (
    cartel.urlLista ||
    cartel.urlListaSub ||
    cartel.urlListaCas ||
    cartel.urlListaCor ||
    cartel.urlListaChi
  ) {
    return false;
  }

  // Verificar si alguna de las URLs de audio contiene .mp4 y es de rumble (rumble.com o rumble.cloud)
  const urls = [
    cartel.url,
    cartel.urlSub,
    cartel.urlCas,
    cartel.urlCor,
    cartel.urlChi,
  ];

  for (const url of urls) {
    if (url && typeof url === "string") {
      // Verificar si contiene .mp4 y es del dominio rumble (cualquier subdominio)
      if (url.includes(".mp4") && url.includes("rumble")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Descarga el video .mp4 de rumble usando fetch y blob con progreso
 */
async function descargarVideo(cartel) {
  if (!cartel) return;

  // Encontrar la primera URL válida de .mp4 de rumble
  const urls = [
    cartel.url,
    cartel.urlSub,
    cartel.urlCas,
    cartel.urlCor,
    cartel.urlChi,
  ];

  let urlDescarga = null;
  for (const url of urls) {
    if (
      url &&
      typeof url === "string" &&
      url.includes(".mp4") &&
      url.includes("rumble")
    ) {
      urlDescarga = url;
      break;
    }
  }

  if (!urlDescarga) {
    //alert("No se encontró un enlace de descarga válido");
    return;
  }

  // Limpiar el título de la película para usarlo como nombre de archivo
  const nombreArchivo = cartel.titulo
    ? `${cartel.titulo.replace(/[/\\?%*:|"<>]/g, "-")}.mp4`
    : "video.mp4";

  const btnDownload = document.getElementById("btn-download");
  const originalHTML = btnDownload.innerHTML;

  try {
    console.log("Iniciando descarga:", nombreArchivo);

    // Desactivar el botón durante la descarga
    btnDownload.disabled = true;
    btnDownload.classList.add("downloading");

    // Iniciar la descarga
    const response = await fetch(urlDescarga);
    if (!response.ok) throw new Error("Error al descargar el video");

    const contentLength = response.headers.get("content-length");
    const total = parseInt(contentLength, 10);
    let loaded = 0;

    // Crear un ReadableStream para rastrear el progreso
    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // Calcular porcentaje
      const percent = total ? Math.round((loaded / total) * 100) : 0;

      // Actualizar el botón con el progreso
      btnDownload.innerHTML = `
        <div class="download-progress">
          <div class="download-battery">
            <div class="battery-liquid" style="width: ${percent}%">
              <div class="liquid-wave"></div>
            </div>
          </div>
          <span class="download-percent">${percent}%</span>
        </div>
      `;
    }

    // Crear blob del archivo completo
    const blob = new Blob(chunks);

    // Crear un URL temporal del blob
    const blobUrl = window.URL.createObjectURL(blob);

    // Mostrar 100% brevemente
    btnDownload.innerHTML = `
      <div class="download-progress">
        <div class="download-battery">
          <div class="battery-liquid" style="width: 100%">
            <div class="liquid-wave"></div>
          </div>
        </div>
        <span class="download-percent">100%</span>
      </div>
    `;

    // Esperar un momento para que el usuario vea el 100%
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Crear un elemento 'a' temporal para forzar la descarga
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = nombreArchivo;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // Limpiar
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);

    console.log("✅ Descarga completada:", nombreArchivo);

    // Guardar registro de descarga
    saveDownloadRecord(cartel);

    // Restaurar el botón después de un momento
    setTimeout(() => {
      btnDownload.innerHTML = originalHTML;
      btnDownload.disabled = false;
      btnDownload.classList.remove("downloading");
    }, 1000);
  } catch (error) {
    console.error("Error al descargar:", error);
    //alert("No se pudo descargar el video. Intente nuevamente.");

    // Restaurar el botón en caso de error
    btnDownload.innerHTML = originalHTML;
    btnDownload.disabled = false;
    btnDownload.classList.remove("downloading");
  }
}

// Inicializar event listeners cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Cerrar popup al hacer clic fuera
  document
    .getElementById("popup-calidades")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        cerrarPopupCalidades();
      }
    });

  // Inicializar vista home
  switchView("home");
});

/* ===== NAVEGACIÓN Y GESTIÓN DE VISTAS ===== */

window.switchView = function (viewId) {
  // 1. Cerrar el popup de la película si está abierto
  if (typeof closePopJW === "function") {
    closePopJW();
  }

  // Ocultar todas las vistas
  document.querySelectorAll(".view-section").forEach((el) => {
    el.style.display = "none";
    el.classList.remove("active");
  });

  // Mostrar vista seleccionada
  const selectedView = document.getElementById(`view-${viewId}`);
  if (selectedView) {
    selectedView.style.display = "block";
    selectedView.classList.add("active");
  }

  // Actualizar barra de navegación
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
  });

  // Activar icono correspondiente
  const navIndex = viewId === "home" ? 0 : viewId === "lists" ? 1 : 2;
  const navItems = document.querySelectorAll(".nav-item");
  if (navItems[navIndex]) {
    navItems[navIndex].classList.add("active");
  }

  // Cargar datos si es necesario
  if (viewId === "lists") {
    renderListsView();
  } else if (viewId === "downloads") {
    renderDownloadsView();
  }
};

function openRequests() {
  // URL de pedidos (placeholder por ahora)
  const url = "http://action_offices"; // Ejemplo o dejar vacío
  window.open(url, "_blank");
}

/* ===== GESTIÓN DE LISTAS (HISTORIAL, LIKES, WATCHLIST) ===== */

function renderListsView() {
  console.log("🔄 Renderizando listas...");

  // DIAGNÓSTICO: Ver qué hay en localStorage
  console.log("📦 Contenido de localStorage:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`   - ${key}: ${localStorage.getItem(key)}`);
  }

  renderHistory();
  renderLikes();
  renderWatchlist();
}

function renderHistory() {
  const container = document.getElementById("list-history");
  if (!container) return;
  container.innerHTML = "";

  // Buscar en localStorage claves que empiecen con 'progreso_'
  const historyItems = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("progreso_")) {
      const id = key.replace("progreso_", "");
      console.log(`🔍 Buscando historial para ID: ${id}`);
      const cartel = findCartelById(id);
      if (cartel) {
        console.log(`   ✅ Encontrado: ${cartel.titulo}`);
        historyItems.push(cartel);
      } else {
        console.warn(`   ❌ No encontrado en carteles: ${id}`);
      }
    }
  }

  // console.log("📚 Items historial encontrados:", historyItems.length);

  if (historyItems.length === 0) {
    container.innerHTML =
      '<p class="empty-msg">No has visto nada recientemente.</p>';
    return;
  }

  historyItems.forEach((cartel) => {
    container.appendChild(createMiniCard(cartel));
  });
}

function renderLikes() {
  const container = document.getElementById("list-liked");
  if (!container) return;
  container.innerHTML = "";

  const likedItems = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Verificar formato de key de likes: 'proyectoja_ID_voto'
    if (key.endsWith("_voto") && localStorage.getItem(key) === "like") {
      // Extraer ID: quitar '_voto' del final y 'proyectoja_' del principio si existe
      let id = key.replace("_voto", "");
      if (id.startsWith("proyectoja_")) {
        id = id.replace("proyectoja_", "");
      }

      console.log(`❤️ Buscando like para ID: ${id} (Key original: ${key})`);
      const cartel = findCartelById(id);
      if (cartel) {
        likedItems.push(cartel);
      }
    }
  }

  if (likedItems.length === 0) {
    container.innerHTML =
      '<p class="empty-msg">No has dado like a nada aún.</p>';
    return;
  }

  likedItems.forEach((cartel) => {
    container.appendChild(createMiniCard(cartel));
  });
}

function renderWatchlist() {
  const container = document.getElementById("list-watchlist");
  if (!container) return;
  container.innerHTML = "";

  const watchlist = JSON.parse(localStorage.getItem("my_watchlist") || "[]");
  console.log("📑 Watchlist IDs:", watchlist);

  if (watchlist.length === 0) {
    container.innerHTML = '<p class="empty-msg">Tu lista está vacía.</p>';
    return;
  }

  watchlist.forEach((id) => {
    const cartel = findCartelById(id);
    if (cartel) {
      container.appendChild(createMiniCard(cartel, true)); // true = mostrar botón eliminar
    } else {
      console.warn(`   ❌ Watchlist: ID ${id} no encontrado en carteles.`);
    }
  });
}

// Función auxiliar para crear tarjetas mini
function createMiniCard(cartel, showDeleteButton = false) {
  const div = document.createElement("div");
  div.className = "movie-card-mini";
  div.onclick = () => openPopJW(cartel);

  const deleteButton = showDeleteButton
    ? `<button class="btn-remove-from-list" onclick="event.stopPropagation(); removeFromWatchlist('${cartel.id}')">
         <i class="fa-solid fa-times"></i>
       </button>`
    : "";

  div.innerHTML = `
    ${deleteButton}
    <img src="${cartel.poster || cartel.miniatura}" alt="${
      cartel.titulo
    }" loading="lazy">
    <div class="title">${cartel.titulo}</div>
  `;
  return div;
}

// Función auxiliar para encontrar cartel por ID mejorada
function findCartelById(id) {
  // Verificar si la variable global carteles existe
  if (
    typeof carteles !== "undefined" &&
    Array.isArray(carteles) &&
    carteles.length > 0
  ) {
    // DIAGNÓSTICO: Imprimir estructura del primer cartel (solo una vez)
    if (!window.debugCartelStructurePrinted) {
      console.log(
        "📦 Estructura de 'carteles' (primer elemento):",
        carteles[0],
      );
      console.log("📦 Total carteles cargados:", carteles.length);
      window.debugCartelStructurePrinted = true;
    }

    // Convertir ambos a string para asegurar coincidencia
    return carteles.find((c) => String(c.id) === String(id) || c.titulo === id);
  } else {
    console.warn("⚠️ La variable global 'carteles' está vacía o no definida.");
    return null;
  }
}

// Funciones para eliminar todo el contenido de cada lista
function clearHistory() {
  if (!confirm("¿Eliminar todo el historial de reproducción?")) return;

  // Eliminar todas las claves que empiecen con 'progreso_'
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("progreso_")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
  renderHistory();
}

function clearLikes() {
  if (!confirm('¿Eliminar todos los "Me gusta"?')) return;

  // Eliminar todas las claves de votos
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.endsWith("_voto")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
  renderLikes();
}

function clearWatchlist() {
  if (!confirm("¿Vaciar toda tu lista de seguimiento?")) return;

  localStorage.setItem("my_watchlist", "[]");
  renderWatchlist();
}

function removeFromWatchlist(id) {
  let watchlist = JSON.parse(localStorage.getItem("my_watchlist") || "[]");
  watchlist = watchlist.filter((itemId) => itemId !== id);
  localStorage.setItem("my_watchlist", JSON.stringify(watchlist));
  renderWatchlist();

  // Actualizar botón si la película está abierta
  updateWatchlistButton(id);
}

/* ===== GESTIÓN DE WATCHLIST ===== */

function toggleWatchlist(cartel) {
  let watchlist = JSON.parse(localStorage.getItem("my_watchlist") || "[]");
  const index = watchlist.indexOf(cartel.id);

  if (index === -1) {
    watchlist.push(cartel.id);
    //alert("Agregado a tu lista");
  } else {
    watchlist.splice(index, 1);
    //alert("Eliminado de tu lista");
  }

  localStorage.setItem("my_watchlist", JSON.stringify(watchlist));

  // Actualizar botón si está visible
  updateWatchlistButton(cartel.id);
}

function updateWatchlistButton(id) {
  const btn = document.querySelector(".btn-watchlist");
  if (!btn) return;

  const watchlist = JSON.parse(localStorage.getItem("my_watchlist") || "[]");
  if (watchlist.includes(id)) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> En tu lista';
    btn.style.color = "#00d9ff";
  } else {
    btn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Watchlist';
    btn.style.color = "white";
  }
}

/* ===== GESTIÓN DE DESCARGAS ===== */

function saveDownloadRecord(cartel) {
  const downloads = JSON.parse(localStorage.getItem("my_downloads") || "[]");

  // Asegurar que tenemos una imagen válida
  let posterUrl = cartel.poster || cartel.miniatura;
  if (!posterUrl) {
    posterUrl = "img/logo.png";
  }

  // Evitar duplicados
  if (!downloads.some((d) => d.id === cartel.id)) {
    downloads.unshift({
      id: cartel.id,
      titulo: cartel.titulo,
      poster: posterUrl,
      date: new Date().toISOString(),
    });
    localStorage.setItem("my_downloads", JSON.stringify(downloads));
  }
}

function renderDownloadsView() {
  const container = document.getElementById("list-downloads");
  if (!container) return;
  container.innerHTML = "";

  const downloads = JSON.parse(localStorage.getItem("my_downloads") || "[]");

  if (downloads.length === 0) {
    container.innerHTML =
      '<p class="empty-msg">No hay descargas recientes.</p>';
    return;
  }

  downloads.forEach((item) => {
    const div = document.createElement("div");
    div.className = "download-item";

    const date = new Date(item.date).toLocaleDateString();

    div.innerHTML = `
      <img src="${item.poster}" alt="${item.titulo}" onerror="this.src='https://via.placeholder.com/60x90?text=No+Img'">
      <div class="download-info">
        <h4>${item.titulo}</h4>
        <div class="download-status">
          <i class="fa-solid fa-check-circle"></i> Completado • ${date}
        </div>
      </div>
      <div class="download-actions">
        <button class="btn-icon btn-delete" onclick="deleteDownload('${item.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    container.appendChild(div);
  });
}

function playDownloaded(id) {
  const cartel = findCartelById(id);
  if (cartel) {
    openPopJW(cartel);
  }
}

function deleteDownload(id) {
  if (!confirm("¿Eliminar del historial de descargas?")) return;

  let downloads = JSON.parse(localStorage.getItem("my_downloads") || "[]");
  downloads = downloads.filter((d) => d.id !== id);
  localStorage.setItem("my_downloads", JSON.stringify(downloads));
  renderDownloadsView();
}

// Inicializar event listeners cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Cerrar popup al hacer clic fuera
  const popupCalidades = document.getElementById("popup-calidades");
  if (popupCalidades) {
    popupCalidades.addEventListener("click", function (e) {
      if (e.target === this) {
        cerrarPopupCalidades();
      }
    });
  }

  // Inicializar vista home
  if (typeof switchView === "function") {
    switchView("home");
  } else {
    console.error("switchView no está definida");
  }
});
