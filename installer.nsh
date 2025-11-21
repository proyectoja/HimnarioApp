!macro customInit
  ; Esta macro se ejecuta ANTES de la instalación
  ; Aquí limpiamos accesos directos e instalaciones antiguas
  SetShellVarContext all
  
  ; 🧹 Limpieza de accesos directos antiguos (ANTES de crear los nuevos)
  Delete "$DESKTOP\Himnario Adventista Pro.lnk"
  RMDir /r "$SMPROGRAMS\Himnario Adventista Pro"


  ; 🧹 Borrar carpetas antiguas de instalación
  RMDir /r "$PROGRAMFILES\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\Himnario Adventista Pro"
  RMDir /r "$APPDATA\Himnario Adventista Pro"

  ; 🧹 Borrar caché viejo
  RMDir /r "$LOCALAPPDATA\com.proyectoja.himnarioadventistapro"
!macroend

!macro customInstall
  SetShellVarContext all
  
  ; 🎯 Crear accesos directos MANUALMENTE (después de la instalación)
  ; Esto garantiza que siempre se creen, incluso con oneClick installers
  
  ; Crear acceso directo en el Escritorio
  CreateShortCut "$DESKTOP\Himnario Adventista Pro.lnk" \
                 "$INSTDIR\Himnario Adventista Pro.exe" \
                 "" \
                 "$INSTDIR\Himnario Adventista Pro.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Himnario Adventista Pro - PROYECTO JA"
  
  ; Crear acceso directo en el Menú Inicio
  CreateDirectory "$SMPROGRAMS\Himnario Adventista Pro"
  CreateShortCut "$SMPROGRAMS\Himnario Adventista Pro\Himnario Adventista Pro.lnk" \
                 "$INSTDIR\Himnario Adventista Pro.exe" \
                 "" \
                 "$INSTDIR\Himnario Adventista Pro.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Himnario Adventista Pro - PROYECTO JA"
!macroend


!macro customUnInstall
  SetShellVarContext all

  ; 🧹 Borrar accesos directos
  Delete "$DESKTOP\Himnario Adventista Pro.lnk"
  
  ; Borrar carpeta completa del menú de inicio
  RMDir /r "$SMPROGRAMS\Himnario Adventista Pro"

  ; 🧹 Borrar carpetas del programa
  RMDir /r "$PROGRAMFILES\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\Himnario Adventista Pro"
  RMDir /r "$APPDATA\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\com.proyectoja.himnarioadventistapro"

!macroend
