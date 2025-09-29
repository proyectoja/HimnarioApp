const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const BASE_DIR = path.join(app.getPath("userData"), "resources");

function getResourcePath(relativePath) {
  const userPath = path.join(BASE_DIR, relativePath);
  const appPath = path.join(__dirname, "src", relativePath);

  // Si existe en userData, usa ese
  if (fs.existsSync(userPath)) return userPath;

  // Si no, usa el empaquetado en src/
  return appPath;
}

module.exports = { getResourcePath, BASE_DIR };
