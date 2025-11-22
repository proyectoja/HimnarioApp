# 🚀 GUÍA RÁPIDA - Publicar Nueva Versión

## UN SOLO COMANDO:

```bash
npm run deploy
```

**Esto hace TODO automáticamente:**
1. Incrementa versión (1.0.48 → 1.0.49)
2. Commit del cambio
3. Push a GitHub
4. GitHub Actions compila para 3 plataformas
5. Crea Release automáticamente
6. Usuarios reciben actualización

---

## FLUJO COMPLETO:

### Día a Día (Desarrollo):
```bash
# Haces cambios
git add .
git commit -m "Descripción del cambio"
git push
```
**Esto NO publica versión**, solo sube código.

---

### Cuando Quieres Publicar:
```bash
npm run deploy
```

**Espera 10-15 minutos.**

**Verifica:**
- Actions: https://github.com/proyectoja/HimnarioApp/actions
- Releases: https://github.com/proyectoja/HimnarioApp/releases

---

## TIPOS DE VERSIÓN:

### Patch (1.0.48 → 1.0.49)
```bash
npm run deploy
```
Para: Bug fixes, mejoras pequeñas

### Minor (1.0.49 → 1.1.0)
```bash
npm version minor
git push --tags
```
Para: Nuevas características

### Major (1.1.0 → 2.0.0)
```bash
npm version major
git push --tags
```
Para: Cambios grandes, breaking changes

---

## EJEMPLO REAL:

```bash
# Lunes: Arreglas bug
git add .
git commit -m "Fix: Error en reproductor"
git push

# Martes: Nueva función
git add .
git commit -m "Feature: Modo oscuro"
git push

# Miércoles: ¡Publicar!
npm run deploy

# Esperar ~15 min
# ✅ v1.0.49 publicada
# ✅ Usuarios la reciben automáticamente
```

---

## CHECKLIST ANTES DE PUBLICAR:

- [ ] Todo committeado
- [ ] App funciona localmente
- [ ] Sin errores críticos
- [ ] Internet estable

---

## ERRORES COMUNES:

**"git push rejected":**
```bash
git pull --rebase
git push
```

**"Workflow falla":**
- Ve a Actions → Click en workflow rojo
- Lee el error

---

## LO QUE VERÁN LOS USUARIOS:

1. Notificación: "Actualización v1.0.49 disponible"
2. Opciones: "Descargar Ahora" o "Más Tarde"
3. Si descargan: Widget con progreso en tiempo real
4. Al terminar: "¿Reiniciar ahora o más tarde?"
5. Si posponen reinicio: Se instala al cerrar app

---

**¡Eso es todo! Un comando, esperar 15 minutos, listo.** 🎉

---

**Última actualización:** 2025-11-21
**Versión de la app:** 1.0.48+
