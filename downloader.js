// gestorDescargas.js
// Versión: descarga solo archivos faltantes y marca carpetas completadas usando .complete
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { log } = require("./logHelper"); // tu módulo de logs

// Carpeta base donde se almacenan los archivos
const BASE_DIR = path.join(__dirname, "src");

// Configuración de carpetas remotas
const CARPETAS = {
  prueba: "https://archive.org/details/003_20250924_202509",
  audiosHimnos: "https://archive.org/details/audiosHimnos",
  audiosHimnosIngles: "https://archive.org/details/audiosHimnosInglesActualizacion",
  audiosHimnosPista: "https://archive.org/details/audiosHimnosPista",
  musicaParaOrarDeFondo: "https://archive.org/details/musicaParaOrarDeFondo",
  portadas: "https://archive.org/details/portadas_20250925",
  portadasAntiguo: "https://archive.org/details/portadasAntiguo",
  portadasCoritos: "https://archive.org/details/portadasCoritos",
  portadasHimnosAntiguos: "https://archive.org/details/portadasHimnosAntiguos",
  portadasHimnosInfantiles: "https://archive.org/details/portadasHimnosInfantiles",
  portadasHimnosJA: "https://archive.org/details/portadasHimnosJA",
  portadasHimnosNacionales: "https://archive.org/details/portadasHimnosNacionales",
  videos: "https://archive.org/details/videos_20250925",
  videosAntiguo: "https://archive.org/details/videosAntiguo",
  videosCoritos: "https://archive.org/details/videosCoritos",
  videosHimnosAntiguos: "https://archive.org/details/videosHimnosAntiguos",
  videosHimnosInfantiles: "https://archive.org/details/videosHimnosInfantiles",
  videosHimnosJA: "https://archive.org/details/videosHimnosJA",
  videosHimnosNacionales: "https://archive.org/details/videosHimnosNacionales",
  videosHimnosPianoPista: "https://archive.org/details/videosHimnosPianoPista",
};

// -----------------------------
// FUNCIONES DE MARCA DE COMPLETADO
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

      if (fs.existsSync(filePath)) {
        console.log(`⚠️ Ya existe, ignorado: ${carpeta}/${file}`);
        log(`⚠️ Ya existe, ignorado: ${carpeta}/${file}`);
        return resolve(false);
      }

      console.log(`⏬ Descargando en ${carpeta}: ${file}`);
      log(`⏬ Descargando en ${carpeta}: ${file}`);

      const response = await axios.get(url, {
        responseType: "stream",
        maxRedirects: 5,
        timeout: 60000,
        validateStatus: (s) => s >= 200 && s < 400,
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      monitorDescarga(response, file, carpeta);

      let finished = false;

      writer.on("finish", () => {
        finished = true;
        console.log(`✅ Descargado en ${carpeta}: ${file}`);
        log(`✅ Descargado en ${carpeta}: ${file}`);
        resolve(true);
      });

      writer.on("error", (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error(`❌ Error al escribir archivo: ${err.message}`);
        log(`❌ Error al escribir archivo: ${err.message}`);
        reject(err);
      });

      setTimeout(() => {
        if (!finished) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          const msg = `❌ Timeout al descargar ${file} (cancelado)`;
          console.error(msg);
          log(msg);
          resolve(false);
        }
      }, 120000);
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

  const { data } = await axios.get(url, { timeout: 30000 });

  const regex = /href=["']\/download\/[^\/]+\/(?:([^"'\?<>#]+?\.(?:mp4|mp3|wav|ogg|mkv|jpg|jpeg|png|gif|webp)))['"]/gi;

  const archivos = [];
  let match;
  while ((match = regex.exec(data)) !== null) {
    archivos.push(match[1]);
  }

  return [...new Set(archivos.filter(f => f && !f.includes(".ia") && !f.includes("_thumb")))];
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

      console.log(`📂 Carpeta: ${carpeta}, archivos encontrados: ${archivos.length}`);
      log(`📂 Carpeta: ${carpeta}, archivos encontrados: ${archivos.length}`);

      for (const file of archivos) {
        await descargarArchivo(file, carpeta, downloadBase);
      }

      markFolderComplete(carpeta);
      console.log(`🎉 Carpeta ${carpeta} completada`);
      log(`🎉 Carpeta ${carpeta} completada`);
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

  for (const [carpeta, pageUrl] of Object.entries(CARPETAS)) {
    if (isFolderComplete(carpeta)) continue;

    const downloadBase = pageUrl.replace("/details/", "/download/");
    const carpetaPath = path.join(BASE_DIR, carpeta);
    fs.mkdirSync(carpetaPath, { recursive: true });

    const archivosLocales = fs.readdirSync(carpetaPath).filter(f => f !== ".complete");
    const archivosRemotos = await obtenerListaArchivos(pageUrl);

    const faltantes = archivosRemotos.filter(f => !archivosLocales.includes(f));
    if (faltantes.length === 0) {
      markFolderComplete(carpeta);
      continue;
    }

    console.log(`⬇️ Descargando ${faltantes.length} archivos en ${carpeta}`);
    log(`⬇️ Descargando ${faltantes.length} archivos en ${carpeta}`);
    for (const file of faltantes) {
      await descargarArchivo(file, carpeta, downloadBase);
    }
    markFolderComplete(carpeta);
    huboDescarga = true;
  }

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
  isFolderComplete
};

// -----------------------------
// Si se ejecuta directamente
// -----------------------------
if (require.main === module) {
  (async () => {
    await descargarTodo();
  })();
}
