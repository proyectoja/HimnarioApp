// ===============================
// MANEJADOR DE CONTROL REMOTO
// ===============================

// Variable global para guardar la URL del control remoto
let controlRemotoURL = null;

// Escuchar cuando el control remoto se inicia
if (window.electronAPI && window.electronAPI.onControlRemotoIniciado) {
  console.log('✅ Listener de control remoto registrado');
  
  window.electronAPI.onControlRemotoIniciado((data) => {
    controlRemotoURL = data.url;
    const pin = data.pin || '------';
    
    console.log(`📱 Control Remoto iniciado en: ${data.url}`);
    console.log(`🔐 PIN: ${pin}`);
    
    // Mostrar notificación popup
    setTimeout(() => {
      mostrarNotificacionControlRemoto(data.url, pin);
    }, 3000);
  });
} else {
  console.error('⚠️ window.electronAPI.onControlRemotoIniciado no disponible');
}

// Solicitar estado actual del control remoto cuando se carga este script
if (window.electronAPI && window.electronAPI.obtenerEstadoControlRemoto) {
  console.log('🔍 Solicitando estado actual del control remoto...');
  
  window.electronAPI.obtenerEstadoControlRemoto().then((estado) => {
    if (estado && estado.activo) {
      console.log('✅ Control remoto ya está activo:', estado);
      
      // Mostrar notificación
      setTimeout(() => {
        mostrarNotificacionControlRemoto(estado.url, estado.pin);
      }, 3000);
    } else {
      console.log('⏳ Control remoto aún no está activo, esperando evento...');
    }
  }).catch((error) => {
    console.error('❌ Error al obtener estado:', error);
  });
} else {
  console.warn('⚠️ obtenerEstadoControlRemoto no disponible');
}

// Función para mostrar la notificación del control remoto
function mostrarNotificacionControlRemoto(url, pin) {
  // Crear elemento de notificación si no existe
  let notif = document.getElementById('control-remoto-notificacion');
  
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'control-remoto-notificacion';
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: 'Segoe UI', sans-serif;
      animation: slideIn 0.5s ease;
    `;
    
    notif.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">📱</span>
        <strong style="flex: 1;">Control Remoto Activo</strong>
        <button id="cerrar-notif-control" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px;">×</button>
      </div>
      <p style="margin: 5px 0; font-size: 14px;">Conéctate desde tu celular:</p>
      <p style="margin: 5px 0; font-size: 16px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 5px; word-break: break-all;">${url}</p>
      <p style="margin: 5px 0; font-size: 12px; opacity: 0.9;">🔐 PIN: <strong style="font-size: 20px; letter-spacing: 2px;">${pin}</strong></p>
      <button id="copiar-url-control" style="
        margin-top: 10px;
        width: 100%;
        padding: 8px;
        background: rgba(255,255,255,0.3);
        border: 1px solid rgba(255,255,255,0.5);
        color: white;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">📋 Copiar URL</button>
    `;
    
    document.body.appendChild(notif);
    
    // Botón para cerrar
    document.getElementById('cerrar-notif-control').addEventListener('click', () => {
      notif.style.animation = 'slideOut 0.5s ease';
      setTimeout(() => notif.remove(), 500);
    });
    
    // Botón para copiar URL
    document.getElementById('copiar-url-control').addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copiar-url-control');
        const textoOriginal = btn.textContent;
        btn.textContent = '✅ Copiado!';
        btn.style.background = 'rgba(76, 175, 80, 0.8)';
        setTimeout(() => {
          btn.textContent = textoOriginal;
          btn.style.background = 'rgba(255,255,255,0.3)';
        }, 2000);
      });
    });
    
    // Auto-cerrar después de 15 segundos
    setTimeout(() => {
      if (notif && notif.parentNode) {
        notif.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => notif.remove(), 500);
      }
    }, 600000);
  }
  
  // Agregar animaciones CSS
  if (!document.getElementById('control-remoto-styles')) {
    const style = document.createElement('style');
    style.id = 'control-remoto-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Escuchar comandos remotos
if (window.electronAPI && window.electronAPI.onRemoteCommand) {
  window.electronAPI.onRemoteCommand((data) => {
    const { command, data: commandData } = data;
    console.log(`📱 Comando remoto recibido: ${command}`, commandData);
    
    // Procesar el comando
    procesarComandoRemoto(command, commandData);
  });
}

// Función para procesar comandos remotos
function procesarComandoRemoto(comando, datos) {
  switch (comando) {
    case 'buscar-himnos':
      // Buscar en el array global todosLosHimnosLista
      if (datos && datos.query) {
        const query = datos.query.toLowerCase().trim();
        console.log(`🔍 Buscando: "${query}"`);
        
        // Buscar en el array global (si está cargado)
        if (typeof todosLosHimnosLista !== 'undefined' && todosLosHimnosLista && todosLosHimnosLista.length > 0) {
          const resultados = todosLosHimnosLista.filter(himno => {
            const numeroMatch = himno.numero && himno.numero.toString().includes(query);
            const tituloMatch = himno.titulo && himno.titulo.toLowerCase().includes(query);
            return numeroMatch || tituloMatch;
          });
          
          console.log(`✅ Encontrados ${resultados.length} resultados`);
          
          // Guardar resultados en una variable global para que la interfaz pueda acceder
          window.resultadosBusqueda = resultados.slice(0, 20); // Máximo 20 resultados
        } else {
          console.warn('⚠️ El array todosLosHimnosLista no está disponible aún');
          window.resultadosBusqueda = [];
        }
      }
      break;
    
    case 'cambiar-categoria':
      if (datos && datos.categoria) {
        if (typeof mostrarCategoria === 'function') {
          mostrarCategoria(datos.categoria);
          console.log(`Categoría cambiada a: ${datos.categoria}`);
        }
      }
      break;

    case 'reproducir-himno-numero':
      if (datos && datos.numero) {
        console.log(`🎵 Buscando himno #${datos.numero}...`);
        
        // Primero asegurarse de estar en la categoría correcta
        if (typeof mostrarCategoria === 'function') {
          let categoria = datos.categoria || 'todos';
          
          // Mapear categorías del control remoto a las internas
          const mapaCategorias = {
            'Himnos': 'todos',
            'Orquestado': 'orquestado',
            'Coritos': 'coritos',
            'JA': 'himnosJA',
            'Nacionales': 'himnosNacionales',
            'Infantiles': 'himnosInfantiles',
            'Antiguos 1962': 'himnosAntiguos',
            'Piano Pista': 'himnosPianoPista'
          };
          
          if (mapaCategorias[categoria]) {
            categoria = mapaCategorias[categoria];
          }
          
          console.log(`📂 Cambiando a categoría "${categoria}"...`);
          mostrarCategoria(categoria);
        }
        
        // Esperar un momento para que se cargue la categoría
        setTimeout(() => {
          const numero = String(datos.numero).padStart(3, '0');
          // Buscar el elemento del himno en el DOM
          const himnoElements = document.querySelectorAll('.video-container');
          let himnoEncontrado = false;
          
          console.log(`🔍 Buscando entre ${himnoElements.length} elementos...`);
          
          for (let element of himnoElements) {
            const h3 = element.querySelector('h3');
            if (h3) {
              const texto = h3.textContent;
              // Buscar el número exacto al inicio del título
              if (texto.startsWith(numero) || texto.includes(`${numero}.`) || texto.includes(`${numero} `)) {
                console.log(`✅ ¡Himno encontrado! Título: ${texto}`);
                
                // IMPORTANTE: Hacer click en la IMAGEN, no en el contenedor
                const img = element.querySelector('img');
                if (img) {
                  console.log('🖱️ Haciendo click en la imagen...');
                  img.click();
                  himnoEncontrado = true;
                  
                  // Esperar a que se cargue el reproductor y darle play automáticamente
                  console.log('⏳ Esperando a que se cargue el reproductor...');
                  setTimeout(() => {
                    // Intentar darle play al reproductor
                    if (typeof player !== 'undefined' && player) {
                      console.log('▶️ Dando play al reproductor Clappr...');
                      player.play();
                    } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
                      console.log('▶️ Dando play al reproductor YouTube...');
                      playerYouTube.playVideo();
                    } else {
                      console.log('🔍 Buscando reproductor en el DOM...');
                      // Intentar encontrar y hacer click en el botón de play del reproductor
                      const playButton = document.querySelector('.player-poster') || 
                                       document.querySelector('[data-poster]') ||
                                       document.querySelector('.media-control-button.play');
                      if (playButton) {
                        console.log('🎬 Haciendo click en el póster/play...');
                        playButton.click();
                      }
                    }
                  }, 2000); // Esperar 2 segundos para que se cargue el reproductor
                  
                  break;
                } else {
                  console.warn('⚠️ No se encontró la imagen dentro del contenedor');
                }
              }
            }
          }
          
          if (!himnoEncontrado) {
            console.warn(`⚠️ No se encontró el himno #${datos.numero}, intentando búsqueda sin padding...`);
            // Intentar buscar sin padding
            for (let element of himnoElements) {
              const h3 = element.querySelector('h3');
              if (h3 && h3.textContent.includes(String(datos.numero))) {
                console.log(`✅ ¡Himno encontrado (sin padding)! Título: ${h3.textContent}`);
                const img = element.querySelector('img');
                if (img) {
                  img.click();
                  himnoEncontrado = true;
                  
                  // También darle play aquí
                  setTimeout(() => {
                    if (typeof player !== 'undefined' && player) {
                      player.play();
                    } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
                      playerYouTube.playVideo();
                    }
                  }, 2000);
                  
                  break;
                }
              }
            }
          }
          
          if (!himnoEncontrado) {
            console.error(`❌ No se pudo encontrar el himno #${datos.numero} en el DOM`);
          } else {
            console.log(`🎉 Himno #${datos.numero} cargado, reproducción iniciando...`);
          }
        }, 1000); // Aumentado a 1 segundo para dar más tiempo a que se cargue
      }
      break;

    case 'play-reproduccion':
      // Play del reproductor actual
      if (typeof player !== 'undefined' && player) {
        player.play();
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        playerYouTube.playVideo();
      }
      break;

    case 'stop-reproduccion':
      // Stop (cerrar el reproductor)
      const closeBtn = document.getElementById('closePlayer');
      if (closeBtn) {
        closeBtn.click();
      } else if (typeof player !== 'undefined' && player) {
        player.pause();
        player.currentTime = 0;
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        playerYouTube.stopVideo();
      }
      break;
    
    case 'cambiar-volumen':
      if (datos && typeof datos.volumen !== 'undefined') {
        console.log(`🔊 Cambiando volumen del sistema a: ${datos.volumen}%`);
        
        // Usar IPC para cambiar volumen del sistema
        if (window.electronAPI && window.electronAPI.cambiarVolumen) {
          window.electronAPI.cambiarVolumen(datos.volumen).then(() => {
            console.log('✅ Volumen del sistema cambiado exitosamente');
          }).catch(err => {
            console.error('❌ Error al cambiar volumen del sistema:', err);
          });
        }
      }
      break;
    
    case 'siguiente-himno':
      // Buscar el botón de siguiente himno
      const btnSiguiente = document.querySelector('[onclick*="siguiente"]') || 
                           document.querySelector('.btn-siguiente') ||
                           document.querySelector('#siguiente');
      if (btnSiguiente) btnSiguiente.click();
      else console.warn('No se encontró el botón siguiente');
      break;
      
    case 'anterior-himno':
      // Buscar el botón de anterior himno
      const btnAnterior = document.querySelector('[onclick*="anterior"]') ||
                          document.querySelector('.btn-anterior') ||
                          document.querySelector('#anterior');
      if (btnAnterior) btnAnterior.click();
      else console.warn('No se encontró el botón anterior');
      break;
      
    case 'play-pause':
      // Intentar play/pause del reproductor
      if (typeof player !== 'undefined' && player) {
        if (player.paused) {
          player.play();
        } else {
          player.pause();
        }
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        const state = playerYouTube.getPlayerState();
        if (state === 1) { // Reproduciendo
          playerYouTube.pauseVideo();
        } else {
          playerYouTube.playVideo();
        }
      }
      break;
      
    case 'detener':
      // Detener reproducción
      if (typeof player !== 'undefined' && player) {
        player.pause();
        player.currentTime = 0;
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        playerYouTube.stopVideo();
      }
      break;
      
    case 'ir-a-himno':
      if (datos && datos.numero) {
        // Buscar función para ir a un himno específico
        if (typeof mostrarHimno === 'function') {
          mostrarHimno(datos.numero);
        } else if (typeof cargarHimno === 'function') {
          cargarHimno(datos.numero);
        }
        console.log(`Ir al himno ${datos.numero}`);
      }
      break;
      
    case 'ir-inicio':
      // Ir a la página de inicio
      if (typeof mostrarCategoria === 'function') {
        mostrarCategoria('todos');
      }
      break;
      
    case 'abrir-biblia':
      // Abrir sección de biblia
      const btnBiblia = document.querySelector('[onclick*="biblia"]') ||
                        document.querySelector('#biblia') ||
                        document.querySelector('.btn-biblia');
      if (btnBiblia) btnBiblia.click();
      break;
      
    case 'abrir-coros':
      // Abrir sección de coros
      if (typeof mostrarCategoria === 'function') {
        mostrarCategoria('coritos');
      }
      break;
      
    case 'abrir-videos':
      // Abrir sección de videos
      if (typeof mostrarCategoria === 'function') {
        mostrarCategoria('videos');
      }
      break;
      
    case 'volumen-mas':
      // Aumentar volumen
      if (typeof player !== 'undefined' && player) {
        player.volume = Math.min(player.volume + 0.1, 1);
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        const volActual = playerYouTube.getVolume();
        playerYouTube.setVolume(Math.min(volActual + 10, 100));
      }
      break;
      
    case 'volumen-menos':
      // Disminuir volumen
      if (typeof player !== 'undefined' && player) {
        player.volume = Math.max(player.volume - 0.1, 0);
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        const volActual = playerYouTube.getVolume();
        playerYouTube.setVolume(Math.max(volActual - 10, 0));
      }
      break;
      
    case 'volumen-medio':
      // Volumen al 50%
      if (typeof player !== 'undefined' && player) {
        player.volume = 0.5;
      } else if (typeof playerYouTube !== 'undefined' && playerYouTube) {
        playerYouTube.setVolume(50);
      }
      break;
      
    case 'buscar':
      if (datos && datos.texto) {
        // Buscar himno
        const inputBusqueda = document.querySelector('#buscador') ||
                              document.querySelector('input[type="search"]') ||
                              document.querySelector('.busqueda');
        if (inputBusqueda) {
          inputBusqueda.value = datos.texto;
          // Disparar evento de búsqueda
          const evento = new Event('input', { bubbles: true });
          inputBusqueda.dispatchEvent(evento);
        }
      }
      break;
      
    case 'abrir-proyeccion':
      // Abrir ventana de proyección
      const btnProyeccion = document.querySelector('[onclick*="proyeccion"]') ||
                            document.querySelector('#proyeccion') ||
                            document.querySelector('.btn-proyeccion');
      if (btnProyeccion) btnProyeccion.click();
      break;
      
    case 'cerrar-proyeccion':
      // Cerrar ventana de proyección
      if (window.electronAPI && window.electronAPI.abrirVentanaSecundaria) {
        window.electronAPI.abrirVentanaSecundaria(-1);
      }
      break;
      
    default:
      console.warn(`Comando no reconocido: ${comando}`);
  }
}

console.log('📱 Manejador de control remoto cargado');
