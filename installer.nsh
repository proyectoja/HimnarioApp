!macro customInit
  ; Esta macro se ejecuta ANTES de la instalación
  ; Aquí limpiamos accesos directos e instalaciones antiguas
  SetShellVarContext all
  
  ; 🧹 Limpieza de accesos directos antiguos (ANTES de crear los nuevos)
  IfFileExists "$SMPROGRAMS\Himnario Adventista Pro.lnk" 0 +2
    Delete "$SMPROGRAMS\Himnario Adventista Pro.lnk"

  IfFileExists "$DESKTOP\Himnario Adventista Pro.lnk" 0 +2
    Delete "$DESKTOP\Himnario Adventista Pro.lnk"

  ; 🧹 Borrar carpetas antiguas de instalación
  RMDir /r "$PROGRAMFILES\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\Himnario Adventista Pro"
  RMDir /r "$APPDATA\Himnario Adventista Pro"

  ; 🧹 Borrar caché viejo
  RMDir /r "$LOCALAPPDATA\com.proyectoja.himnarioadventistapro"
!macroend

!macro customInstall
  ; Esta macro se ejecuta DESPUÉS de la instalación principal
  ; NSIS ya creó los accesos directos, NO los borremos aquí
!macroend


!macro customUnInstall
  SetShellVarContext all

  ; 🧹 Borrar accesos directos
  IfFileExists "$SMPROGRAMS\Himnario Adventista Pro.lnk" +1 0
    Delete "$SMPROGRAMS\Himnario Adventista Pro.lnk"

  IfFileExists "$DESKTOP\Himnario Adventista Pro.lnk" +1 0
    Delete "$DESKTOP\Himnario Adventista Pro.lnk"

  ; 🧹 Borrar carpetas del programa
  RMDir /r "$PROGRAMFILES\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\Himnario Adventista Pro"
  RMDir /r "$APPDATA\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\com.proyectoja.himnarioadventistapro"

!macroend
