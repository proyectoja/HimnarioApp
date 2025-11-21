!macro customInstall
  SetShellVarContext all

  ; 🧹 Limpieza de accesos directos antiguos (solo si existen)
  IfFileExists "$SMPROGRAMS\Himnario Adventista Pro.lnk" +1 0
    Delete "$SMPROGRAMS\Himnario Adventista Pro.lnk"

  IfFileExists "$DESKTOP\Himnario Adventista Pro.lnk" +1 0
    Delete "$DESKTOP\Himnario Adventista Pro.lnk"

  ; 🧹 Borrar carpetas antiguas de instalación
  RMDir /r "$PROGRAMFILES\Himnario Adventista Pro"
  RMDir /r "$LOCALAPPDATA\Himnario Adventista Pro"
  RMDir /r "$APPDATA\Himnario Adventista Pro"

  ; 🧹 Borrar caché viejo
  RMDir /r "$LOCALAPPDATA\com.proyectoja.himnarioadventistapro"

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
