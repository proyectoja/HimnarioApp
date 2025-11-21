# GitHub Actions - Build Multiplataforma

Este proyecto utiliza GitHub Actions para compilar automáticamente la aplicación para **Windows**, **macOS** y **Linux**.

## 🚀 Cómo funciona

### Automático (Recomendado)
1. Haz tus cambios en el código
2. Ejecuta: `npm run release`
3. GitHub Actions compilará automáticamente para las 3 plataformas
4. Los instaladores aparecerán en el release de GitHub

### Manual
Puedes ejecutar el workflow manualmente desde:
- GitHub → Actions → Build & Release → Run workflow

## 📦 Archivos generados

### Windows
- `Himnario Adventista Pro Setup X.X.X.exe` (instalador NSIS)

### macOS
- `Himnario Adventista Pro-X.X.X.dmg` (imagen de disco)

### Linux
- `Himnario Adventista Pro-X.X.X.AppImage` (portable)
- `himnarioadventistapro_X.X.X_amd64.deb` (Debian/Ubuntu)

## 🔑 Requisitos

- El repositorio debe ser público (para usar runners gratuitos)
- El token `GITHUB_TOKEN` está disponible automáticamente
- No necesitas configurar nada adicional

## 📝 Notas

- Los builds toman aproximadamente 15-20 minutos
- macOS requiere runners específicos de GitHub
- Todos los builds son gratuitos en repositorios públicos
