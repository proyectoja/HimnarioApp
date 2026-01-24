!macro customInit
  ; Esta macro se ejecuta ANTES de la instalación
  ; Se recomienda dejar que electron-builder maneje la limpieza de versiones anteriores y accesos directos
  
  SetShellVarContext all
  
  ; Limpieza de caché específico de la app (opcional, si es necesario borrar datos de usuario viejos)
  ; RMDir /r "$LOCALAPPDATA\com.proyectoja.himnarioadventistapro"
!macroend

!macro customInstall
  ; Dejar vacío para que electron-builder maneje la creación de accesos directos
  ; según la configuración de package.json (createDesktopShortcut, createStartMenuShortcut)
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
