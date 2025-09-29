// verificarWrapper.js
// Este archivo simplemente importa la función de downloader que no requiere electron.
// De esta forma main.js no se convierte en dependencia circular.

const { verificarCarpetasYReiniciarSiFaltan } = require("./downloader"); // downloader no requiere main
module.exports = { verificarCarpetasYReiniciarSiFaltan };
