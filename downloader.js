// gestorDescargas.js
// Versión: descarga solo archivos faltantes, marca carpetas completadas usando .complete
// y ahora marca también archivos individuales con file.complete

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const {
  log,
  sendShowLogs,
  sendHideLogs,
  enviarArchivoDescargado,
  enviarProgresoDescarga,
} = require("./logHelper");
const { app } = require("electron");

// Carpeta base donde se almacenan los archivos
const BASE_DIR = path.join(app.getPath("userData"), "src");
//const BASE_DIR = "src/pruebas_downloader";

// Configuración de carpetas remotas
const CARPETAS = {
  //pruebas: "https://archive.org/details/prueba1_202509",
  versionesBiblias: "https://archive.org/details/versionesBiblias",
  portadas: "https://archive.org/details/portadas_20250925",
  videos: "https://archive.org/details/videos_20250925",
  portadasAntiguo: "https://archive.org/details/portadasAntiguo",
  videosAntiguo: "https://archive.org/details/videosAntiguo",
  portadasCoritos: "https://archive.org/details/portadasCoritos",
  videosCoritos: "https://archive.org/details/videosCoritos",
  portadasHimnosAntiguos: "https://archive.org/details/portadasHimnosAntiguos",
  videosHimnosAntiguos: "https://archive.org/details/videosHimnosAntiguos",
  portadasHimnosInfantiles:
    "https://archive.org/details/portadasHimnosInfantiles",
  videosHimnosInfantiles: "https://archive.org/details/videosHimnosInfantiles",
  portadasHimnosJA: "https://archive.org/details/portadasHimnosJA",
  videosHimnosJA: "https://archive.org/details/videosHimnosJA",
  portadasHimnosNacionales:
    "https://archive.org/details/portadasHimnosNacionales",
  videosHimnosNacionales: "https://archive.org/details/videosHimnosNacionales",
  videosHimnosPianoPista: "https://archive.org/details/videosHimnosPianoPista",
  audiosHimnos: "https://archive.org/details/audiosHimnos",
  audiosHimnosIngles:
    "https://archive.org/details/audiosHimnosInglesActualizacion",
  audiosHimnosPista: "https://archive.org/details/audiosHimnosPista",
  musicaParaOrarDeFondo: "https://archive.org/details/musicaParaOrarDeFondo",
};

// -----------------------------
// FUNCIONES DE MARCA DE COMPLETADO POR CARPETA
// -----------------------------
function markFolderComplete(carpeta) {
  const marker = path.join(BASE_DIR, carpeta, ".complete");
  fs.writeFileSync(marker, "ok", "utf-8");
}

function isFolderComplete(carpeta) {
  const marker = path.join(BASE_DIR, carpeta, ".complete");
  return fs.existsSync(marker);
}

// -----------------------------
// MARCAS DE ARCHIVOS INDIVIDUALES
// -----------------------------
function markFileComplete(carpeta, file) {
  const marker = path.join(BASE_DIR, carpeta, `${file}.complete`);
  fs.writeFileSync(marker, "ok", "utf-8");
}

function isFileComplete(carpeta, file) {
  const marker = path.join(BASE_DIR, carpeta, `${file}.complete`);
  return fs.existsSync(marker);
}

// -----------------------------
// MONITOR DE DESCARGA
// -----------------------------
function monitorDescarga(response, file, carpeta) {
  return new Promise((resolve) => {
    const total = parseInt(response.headers["content-length"] || "0", 10);
    let descargado = 0;
    const startTime = Date.now();

    response.data.on("data", (chunk) => {
      descargado += chunk.length;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = descargado / elapsed;

      let speedStr =
        speed > 1024 * 1024
          ? `${(speed / (1024 * 1024)).toFixed(2)} MB/s`
          : `${(speed / 1024).toFixed(2)} KB/s`;

      if (total > 0) {
        const porcentaje = ((descargado / total) * 100).toFixed(2);
        const msg = `📊 ${carpeta}/${file}: ${porcentaje}% (${speedStr})`;
        console.log(msg);
        log(msg);
      }
    });

    response.data.on("end", () => resolve());
  });
}

// -----------------------------
// DESCARGAR UN ARCHIVO
// -----------------------------
async function descargarArchivo(file, carpeta, baseUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `${baseUrl}${baseUrl.endsWith("/") ? "" : "/"}${encodeURIComponent(file)}`;
      const carpetaPath = path.join(BASE_DIR, carpeta);
      const filePath = path.join(carpetaPath, file);

      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // Si existe el archivo y su archivo.complete → se ignora
      if (fs.existsSync(filePath) && isFileComplete(carpeta, file)) {
        console.log(`⚠️ Ya existe y completo: ${carpeta}/${file}`);
        log(`⚠️ Ya existe y completo: ${carpeta}/${file}`);
        return resolve(false);
      }

      console.log(`⏬ Descargando en ${carpeta}: ${file}`);
      log(`⏬ Descargando en ${carpeta}: ${file}`);

      const response = await axios.get(url, {
        responseType: "stream",
        maxRedirects: 5,
        timeout: 120000, // 120 segundos para archivos grandes
        validateStatus: (s) => s >= 200 && s < 400,
        maxContentLength: Infinity, // Permitir archivos de cualquier tamaño
        maxBodyLength: Infinity,
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      monitorDescarga(response, file, carpeta);

      let finished = false;

      writer.on("finish", () => {
        finished = true;
        markFileComplete(carpeta, file); // ← NUEVO
        console.log(`✅ Descargado en ${carpeta}: ${file}`);
        log(`✅ Descargado en ${carpeta}: ${file}`);

        // Notificar al renderer que se descargó un archivo
        enviarArchivoDescargado({ carpeta, file });

        resolve(true);
      });

      writer.on("error", (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error(`❌ Error al escribir archivo: ${err.message}`);
        log(`❌ Error al escribir archivo: ${err.message}`);
        reject(err);
      });

      // Timeout más largo para archivos grandes (5 minutos)
      const timeoutDuration = 300000; // 300 segundos = 5 minutos
      setTimeout(() => {
        if (!finished) {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              console.error(
                `Error al eliminar archivo incompleto: ${e.message}`,
              );
            }
          }
          const msg = `❌ Timeout al descargar ${file} después de ${timeoutDuration / 1000}s (cancelado)`;
          console.error(msg);
          log(msg);
          resolve(false);
        }
      }, timeoutDuration);
    } catch (err) {
      console.error(`❌ Error al descargar ${file}: ${err.message}`);
      log(`❌ Error al descargar ${file}: ${err.message}`);
      resolve(false);
    }
  });
}

// -----------------------------
// OBTENER LISTA DE ARCHIVOS REMOTOS
// -----------------------------
async function obtenerListaArchivos(url) {
  console.log(`🔍 Buscando archivos en el servidor`);
  log(`🔍 Buscando archivos en el servidor`);

  // Usar API de Internet Archive para versionesBiblias
  if (url.includes("versionesBiblias")) {
    try {
      const identifier = "versionesBiblias";
      const apiUrl = `https://archive.org/metadata/${identifier}`;
      console.log(`📡 Usando API de Internet Archive: ${apiUrl}`);
      log(`📡 Usando API de Internet Archive`);

      const { data } = await axios.get(apiUrl, { timeout: 30000 });

      // Extraer archivos de la respuesta de la API
      const files = data.files || [];
      const jsonFiles = files
        .filter((f) => f.name && f.name.endsWith(".json"))
        .map((f) => f.name);

      console.log(`📋 Archivos JSON encontrados vía API: ${jsonFiles.length}`);
      log(`📋 Archivos JSON encontrados vía API: ${jsonFiles.length}`);

      if (jsonFiles.length > 0) {
        console.log(
          `📄 Lista: ${jsonFiles.slice(0, 5).join(", ")}${jsonFiles.length > 5 ? "..." : ""}`,
        );
        log(`� Primeros archivos: ${jsonFiles.slice(0, 3).join(", ")}...`);
      }

      return jsonFiles;
    } catch (err) {
      console.error(`❌ Error usando API de Internet Archive: ${err.message}`);
      log(`❌ Error usando API: ${err.message}`);
      return [];
    }
  }

  // Método original para otras carpetas
  const { data } = await axios.get(url, { timeout: 30000 });

  const regex =
    /href=["']\/download\/[^\/]+\/(?:([^"'?\<>#]+?\.(?:mp4|mp3|wav|ogg|mkv|jpg|jpeg|png|gif|webp|json)))["']/gi;

  const archivos = [];
  let match;
  while ((match = regex.exec(data)) !== null) {
    archivos.push(match[1]);
  }

  const uniqueFiles = [
    ...new Set(
      archivos.filter((f) => f && !f.includes(".ia") && !f.includes("_thumb")),
    ),
  ];

  console.log(`📋 Archivos encontrados: ${uniqueFiles.length}`);
  log(`📋 Archivos encontrados: ${uniqueFiles.length}`);

  if (uniqueFiles.length > 0 && uniqueFiles.length <= 30) {
    console.log(`📄 Lista: ${uniqueFiles.join(", ")}`);
    log(
      `📄 Lista: ${uniqueFiles.slice(0, 10).join(", ")}${uniqueFiles.length > 10 ? "..." : ""}`,
    );
  }

  return uniqueFiles;
}

// -----------------------------
// DESCARGAR TODO
// -----------------------------
async function descargarTodo() {
  console.log("⚡ Iniciando descarga de todas las carpetas");

  for (const [carpeta, pageUrl] of Object.entries(CARPETAS)) {
    if (isFolderComplete(carpeta)) {
      console.log(`✅ Carpeta ${carpeta} ya completa, saltada`);
      log(`✅ Carpeta ${carpeta} ya completa, saltada`);
      continue;
    }

    try {
      const downloadBase = pageUrl.replace("/details/", "/download/");
      const carpetaPath = path.join(BASE_DIR, carpeta);
      fs.mkdirSync(carpetaPath, { recursive: true });

      const archivos = await obtenerListaArchivos(pageUrl);
      if (archivos.length === 0) {
        console.log(`⚠️ No hay archivos en el servidor para ${carpeta}`);
        log(`⚠️ No hay archivos en el servidor para ${carpeta}`);
        continue;
      }

      console.log(
        `📂 Carpeta: ${carpeta}, archivos encontrados: ${archivos.length}`,
      );
      log(`📂 Carpeta: ${carpeta}, archivos encontrados: ${archivos.length}`);

      for (const file of archivos) {
        await descargarArchivo(file, carpeta, downloadBase);
      }

      // Verificar que todos tienen .complete
      const todosCompletos = archivos.every((f) => isFileComplete(carpeta, f));
      if (todosCompletos) {
        markFolderComplete(carpeta);
        console.log(`🎉 Carpeta ${carpeta} COMPLETADA`);
        log(`🎉 Carpeta ${carpeta} COMPLETADA`);
      } else {
        console.log(`⚠️ Carpeta ${carpeta} NO completa, faltan .complete`);
      }
    } catch (err) {
      console.error(`❌ Error en carpeta ${carpeta}: ${err.message}`);
      log(`❌ Error en carpeta ${carpeta}: ${err.message}`);
    }
  }
}

// -----------------------------
// VERIFICAR CARPETAS Y DESCARGAR SOLO FALTANTES
// -----------------------------
async function verificarCarpetasYReiniciarSiFaltan() {
  let huboDescarga = false;
  let hayDescargasPendientes = false;

  const carpetasAProcesar = Object.entries(CARPETAS).filter(
    ([carpeta]) => !isFolderComplete(carpeta),
  );

  if (carpetasAProcesar.length === 0) {
    log("✅ Todas las carpetas están marcadas como completas.");
    return false;
  }

  log("🔍 Calculando total de archivos para el progreso...");
  let totalArchivosGlobal = 0;
  let archivosProcesados = 0;
  let carpetasProcesadas = 0;
  const totalCarpetas = carpetasAProcesar.length;
  const mapaArchivosRemotos = new Map();

  // Primer paso: Obtener todas las listas de archivos remotos
  for (const [carpeta, pageUrl] of carpetasAProcesar) {
    try {
      const archivosRemotos = await obtenerListaArchivos(pageUrl);
      mapaArchivosRemotos.set(carpeta, archivosRemotos);
      totalArchivosGlobal += archivosRemotos.length;
    } catch (err) {
      console.error(`Error obteniendo lista para ${carpeta}: ${err.message}`);
      mapaArchivosRemotos.set(carpeta, []);
    }
  }

  if (totalArchivosGlobal === 0) {
    log("✅ Todas las carpetas están al día o no se encontraron archivos.");
    return false;
  }

  // Función interna para actualizar UI
  const actualizarUI = () => {
    const porcentaje = Math.round(
      (archivosProcesados / totalArchivosGlobal) * 100,
    );
    enviarProgresoDescarga({
      completados: archivosProcesados,
      total: totalArchivosGlobal,
      porcentaje: porcentaje,
      carpetasCompletadas: carpetasProcesadas,
      totalCarpetas: totalCarpetas,
    });
  };

  // Mostrar el contenedor si hay archivos
  sendShowLogs();
  actualizarUI();

  // Segundo paso: Procesar descargas
  for (const [carpeta, pageUrl] of carpetasAProcesar) {
    const downloadBase = pageUrl.replace("/details/", "/download/");
    const carpetaPath = path.join(BASE_DIR, carpeta);
    if (!fs.existsSync(carpetaPath)) {
      fs.mkdirSync(carpetaPath, { recursive: true });
    }

    const archivosRemotos = mapaArchivosRemotos.get(carpeta) || [];

    for (const file of archivosRemotos) {
      const filePath = path.join(carpetaPath, file);
      const tieneComplete = isFileComplete(carpeta, file);

      if (fs.existsSync(filePath) && tieneComplete) {
        // Ya está completo, solo sumamos al progreso
        archivosProcesados++;
      } else {
        // Falta o está incompleto, descargar
        const exito = await descargarArchivo(file, carpeta, downloadBase);
        if (exito) huboDescarga = true;
        archivosProcesados++;
      }
      actualizarUI();
    }

    // Al terminar una carpeta
    carpetasProcesadas++;
    actualizarUI();

    // Verificar si la carpeta se completó tras procesar todos sus archivos
    const todosCompletos = archivosRemotos.every((f) =>
      isFileComplete(carpeta, f),
    );
    if (todosCompletos && archivosRemotos.length > 0) {
      markFolderComplete(carpeta);
      log(`🎉 Carpeta ${carpeta} completada`);
    } else if (archivosRemotos.length > 0) {
      log(`⚠️ Carpeta ${carpeta} procesada pero faltan algunos .complete`);
    }
  }

  // Notificación final
  const msgFinal = huboDescarga
    ? "✅ Descargas completadas. Ocultando logs en 8 segundos..."
    : "✅ Todos los archivos ya están presentes. Ocultando logs en 8 segundos...";

  log(msgFinal);
  setTimeout(() => {
    log("[INFO] Ocultando contenedor de logs...");
    sendHideLogs();
  }, 8000);

  return huboDescarga;
}

// -----------------------------
// Export
// -----------------------------
module.exports = {
  descargarTodo,
  obtenerListaArchivos,
  descargarArchivo,
  verificarCarpetasYReiniciarSiFaltan,
  markFolderComplete,
  isFolderComplete,
  markFileComplete,
  isFileComplete,
};

// -----------------------------
// Si se ejecuta directamente
// -----------------------------
if (require.main === module) {
  (async () => {
    await descargarTodo();
  })();
}

//PARA PRUEBAS
