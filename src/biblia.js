
const listaLibros = document.getElementById("lista-libros");
const listaCapitulos = document.getElementById("lista-capitulos");
const vistaPrevia = document.getElementById("vista-previa");
const vistaPrevia2 = document.getElementById("vista-previa2");

// Variable para almacenar la versión seleccionada
let versionSeleccionada = 'SpanishRVR1960Bible';

// Variables para navegación
let bibliaData = null; // Datos completos de la Biblia
let posicionActual = {
  testamentoIndex: 0,
  libroIndex: 0,
  capituloIndex: 0,
  versiculoIndex: 0
};

// Función para cargar el archivo JSON de la versión seleccionada
async function cargarVersion() {
  const versionSelect = document.getElementById("selector-versiones");
  versionSeleccionada = versionSelect.value;
  
  // Limpiar los capítulos antes de cargar la nueva versión
  listaCapitulos.innerHTML = '';

  try {
    // Obtener la ruta correcta desde userData
    const basePath = window.paths?.src || 'src';
    const rutaJSON = `${basePath}/versionesBiblias/${versionSeleccionada}.json`;
    
    console.log(`[BIBLIA] Cargando versión desde: ${rutaJSON}`);
    
    // Cargar el archivo JSON según la versión seleccionada
    const response = await fetch(rutaJSON);
    
    if (!response.ok) {
      throw new Error(`Error al cargar ${versionSeleccionada}: ${response.status}`);
    }
    
    const versionData = await response.json();
    bibliaData = versionData; // Guardar datos completos

    // Llamar a la función para cargar el libro con la nueva versión
    renderLibros(versionData);
    
    console.log(`[BIBLIA] Versión ${versionSeleccionada} cargada exitosamente`);
  } catch (error) {
    console.error(`[BIBLIA] Error al cargar versión ${versionSeleccionada}:`, error);
    
    // Si falla, intentar cargar RVR1960 por defecto
    if (versionSeleccionada !== 'SpanishRVR1960Bible') {
      console.log('[BIBLIA] Intentando cargar RVR1960 por defecto...');
      versionSeleccionada = 'SpanishRVR1960Bible';
      const versionSelect = document.getElementById("selector-versiones");
      versionSelect.value = versionSeleccionada;
      cargarVersion(); // Reintentar con RVR1960
    }
  }
}

// Array con los nombres de los libros según su número
const librosPorNumero = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", 
  "Josué", "Jueces", "Ruth", "1 Samuel", "2 Samuel",
  "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras", 
  "Nehemías", "Ester", "Job", "Salmos", "Proverbios",
  "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
  "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", 
  "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc", 
  "Sofonías", "Ageo", "Zacarías", "Malaquías",
  "Mateo", "Marcos", "Lucas", "Juan", "Hechos", 
  "Romanos", "1 Corintios", "2 Corintios", "Gálatas", "Efesios",
  "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo",
  "2 Timoteo", "Tito", "Filemón", "Hebreos", "Santiago", 
  "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan",
  "Judas", "Apocalipsis"
];

// Renderizar libros según la versión seleccionada
function renderLibros(versionData) {
  listaLibros.innerHTML = '';
  let libroIndexGlobal = 0;
  
  versionData.testaments.forEach((testamento, testamentoIndex) => {
    testamento.books.forEach((libro, libroIndex) => {
      const li = document.createElement("li");
      const libroNombre = librosPorNumero[libro.number - 1];
      li.textContent = libroNombre;
      li.onclick = () => {
        posicionActual = {
          testamentoIndex,
          libroIndex,
          capituloIndex: 0,
          versiculoIndex: 0
        };
        cargarLibro(libroNombre, libro, versionData.translation, testamentoIndex, libroIndex);
      };
      listaLibros.appendChild(li);
      libroIndexGlobal++;
    });
  });
}

// Cargar un libro y sus capítulos según la versión seleccionada
async function cargarLibro(libroNombre, libro, nombreTestamento, testamentoIndex, libroIndex) {
  listaCapitulos.innerHTML = `<h3>Cargando ${libro.name}...</h3>`;
  
  posicionActual.testamentoIndex = testamentoIndex;
  posicionActual.libroIndex = libroIndex;
  posicionActual.capituloIndex = 0;
  posicionActual.versiculoIndex = 0;

  mostrarCapitulos(libro.chapters, libroNombre, libro, nombreTestamento);
}

// Mostrar capítulos del libro cargado
function mostrarCapitulos(capitulos, nombreLibro, libro, nombreTestamento) {
  listaCapitulos.scrollTop = 0;
  listaCapitulos.innerHTML = `<h3>${nombreTestamento} - ${nombreLibro}</h3><ul id="lista-capitulos-interna"></ul>`;
  const listaInterna = document.getElementById("lista-capitulos-interna");

  capitulos.forEach((capitulo, capituloIndex) => {
    const li = document.createElement("li");
    li.textContent = `Capítulo ${capituloIndex + 1}`;
    li.onclick = () => {
      posicionActual.capituloIndex = capituloIndex;
      posicionActual.versiculoIndex = 0;
      mostrarVersiculos(capitulo.verses, capituloIndex + 1, nombreLibro, nombreTestamento);
    };
    listaInterna.appendChild(li);
  });
}

// Mostrar versículos del capítulo seleccionado
function mostrarVersiculos(versiculos, capitulo, nombreLibro, nombreTestamento) {
  listaCapitulos.innerHTML = `<h3>${nombreTestamento} - ${nombreLibro} - Capítulo ${capitulo}</h3><ul id="lista-versiculos"></ul>`;
  const listaVersiculos = document.getElementById("lista-versiculos");

  versiculos.forEach((versiculo, versiculoIndex) => {
    const li = document.createElement("li");
    li.textContent = `Versículo ${versiculoIndex + 1}: ${versiculo.text.substring(0, 30)}...`;
    li.onclick = () => {
      posicionActual.versiculoIndex = versiculoIndex;
      mostrarVistaPrevia(versiculo, nombreTestamento, nombreLibro, capitulo, versiculoIndex + 1);
      actualizarBotonesNavegacion();
      // Enviar automáticamente a pantalla secundaria al hacer clic
      if (typeof window.enviarVersiculo === 'function') {
        window.enviarVersiculo();
      }
    };
    listaVersiculos.appendChild(li);
  });
}

let versiculoAux = '';

// Mostrar un versículo en la vista previa
function mostrarVistaPrevia(versiculo, nombreTestamento, nombreLibro, capitulo, versiculoNumero) {
  const titulo = document.querySelector(".titulo1");
  const titulo2 = document.querySelector(".titulo2");
  const versiculo1 = document.querySelector(".versiculo1");
  const versiculo2 = document.querySelector(".versiculo2");

  titulo.innerHTML = `Vista Previa:`;
  titulo2.innerHTML = `Vista Previa Mini:`;
  versiculo1.innerHTML = `${versiculo.text}`;
  versiculo2.innerHTML = `${versiculo.text}`;

  versiculoAux = versiculo.text;
  window.versiculo = versiculoAux;

  const libroAux = `${nombreLibro} ${capitulo}:${versiculoNumero} | ${nombreTestamento}`;
  window.libro = libroAux;
  
  actualizarBotonesNavegacion();
}

// ============================================
// NAVEGACIÓN CON BOTONES Y TECLADO
// ============================================

// Navegar al versículo anterior
function navegarAnterior() {
  if (!bibliaData) return;
  
  const testamento = bibliaData.testaments[posicionActual.testamentoIndex];
  const libro = testamento.books[posicionActual.libroIndex];
  const capitulo = libro.chapters[posicionActual.capituloIndex];
  
  // Intentar retroceder al versículo anterior en el mismo capítulo
  if (posicionActual.versiculoIndex > 0) {
    posicionActual.versiculoIndex--;
    const versiculo = capitulo.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libro.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
    return;
  }
  
  // Si estamos en el primer versículo, ir al capítulo anterior
  if (posicionActual.capituloIndex > 0) {
    posicionActual.capituloIndex--;
    const capituloAnterior = libro.chapters[posicionActual.capituloIndex];
    posicionActual.versiculoIndex = capituloAnterior.verses.length - 1; // Último versículo del capítulo anterior
    const versiculo = capituloAnterior.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libro.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
    return;
  }
  
  // Si estamos en el primer capítulo, ir al libro anterior
  if (posicionActual.libroIndex > 0) {
    posicionActual.libroIndex--;
    const libroAnterior = testamento.books[posicionActual.libroIndex];
    posicionActual.capituloIndex = libroAnterior.chapters.length - 1; // Último capítulo
    const capituloAnterior = libroAnterior.chapters[posicionActual.capituloIndex];
    posicionActual.versiculoIndex = capituloAnterior.verses.length - 1; // Último versículo
    const versiculo = capituloAnterior.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libroAnterior.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
    return;
  }
  
  // Si estamos en el primer libro, ir al testamento anterior
  if (posicionActual.testamentoIndex > 0) {
    posicionActual.testamentoIndex--;
    const testamentoAnterior = bibliaData.testaments[posicionActual.testamentoIndex];
    posicionActual.libroIndex = testamentoAnterior.books.length - 1; // Último libro
    const libroAnterior = testamentoAnterior.books[posicionActual.libroIndex];
    posicionActual.capituloIndex = libroAnterior.chapters.length - 1; // Último capítulo
    const capituloAnterior = libroAnterior.chapters[posicionActual.capituloIndex];
    posicionActual.versiculoIndex = capituloAnterior.verses.length - 1; // Último versículo
    const versiculo = capituloAnterior.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libroAnterior.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
  }
}

// Navegar al versículo siguiente
function navegarSiguiente() {
  if (!bibliaData) return;
  
  const testamento = bibliaData.testaments[posicionActual.testamentoIndex];
  const libro = testamento.books[posicionActual.libroIndex];
  const capitulo = libro.chapters[posicionActual.capituloIndex];
  
  // Intentar avanzar al siguiente versículo en el mismo capítulo
  if (posicionActual.versiculoIndex < capitulo.verses.length - 1) {
    posicionActual.versiculoIndex++;
    const versiculo = capitulo.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libro.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
    return;
  }
  
  // Si estamos en el último versículo, ir al siguiente capítulo
  if (posicionActual.capituloIndex < libro.chapters.length - 1) {
    posicionActual.capituloIndex++;
    posicionActual.versiculoIndex = 0; // Primer versículo del siguiente capítulo
    const capituloSiguiente = libro.chapters[posicionActual.capituloIndex];
    const versiculo = capituloSiguiente.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libro.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
    return;
  }
  
  // Si estamos en el último capítulo, ir al siguiente libro
  if (posicionActual.libroIndex < testamento.books.length - 1) {
    posicionActual.libroIndex++;
    posicionActual.capituloIndex = 0; // Primer capítulo
    const libroSiguiente = testamento.books[posicionActual.libroIndex];
    const capituloSiguiente = libroSiguiente.chapters[posicionActual.capituloIndex];
    posicionActual.versiculoIndex = 0; // Primer versículo
    const versiculo = capituloSiguiente.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libroSiguiente.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
    return;
  }
  
  // Si estamos en el último libro, ir al siguiente testamento
  if (posicionActual.testamentoIndex < bibliaData.testaments.length - 1) {
    posicionActual.testamentoIndex++;
    posicionActual.libroIndex = 0; // Primer libro
    const testamentoSiguiente = bibliaData.testaments[posicionActual.testamentoIndex];
    const libroSiguiente = testamentoSiguiente.books[posicionActual.libroIndex];
    posicionActual.capituloIndex = 0; // Primer capítulo
    const capituloSiguiente = libroSiguiente.chapters[posicionActual.capituloIndex];
    posicionActual.versiculoIndex = 0; // Primer versículo
    const versiculo = capituloSiguiente.verses[posicionActual.versiculoIndex];
    const nombreLibro = librosPorNumero[libroSiguiente.number - 1];
    mostrarVistaPrevia(versiculo, bibliaData.translation, nombreLibro, posicionActual.capituloIndex + 1, posicionActual.versiculoIndex + 1);
    // Enviar automáticamente a pantalla secundaria
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
  }
}

// Actualizar estado de botones de navegación
function actualizarBotonesNavegacion() {
  const btnAnterior = document.getElementById("versiculo-anterior");
  const btnSiguiente = document.getElementById("versiculo-siguiente");
  
  if (!btnAnterior || !btnSiguiente || !bibliaData) return;
  
  // Verificar si estamos en el primer versículo de toda la Biblia
  const enPrimerVersiculo = posicionActual.testamentoIndex === 0 && 
                             posicionActual.libroIndex === 0 && 
                             posicionActual.capituloIndex === 0 && 
                             posicionActual.versiculoIndex === 0;
  
  // Verificar si estamos en el último versículo de toda la Biblia
  const ultimoTestamento = bibliaData.testaments[bibliaData.testaments.length - 1];
  const ultimoLibro = ultimoTestamento.books[ultimoTestamento.books.length - 1];
  const ultimoCapitulo = ultimoLibro.chapters[ultimoLibro.chapters.length - 1];
  
  const enUltimoVersiculo = posicionActual.testamentoIndex === bibliaData.testaments.length - 1 &&
                             posicionActual.libroIndex === ultimoTestamento.books.length - 1 &&
                             posicionActual.capituloIndex === ultimoLibro.chapters.length - 1 &&
                             posicionActual.versiculoIndex === ultimoCapitulo.verses.length - 1;
  
  // Habilitar/deshabilitar botones
  btnAnterior.disabled = enPrimerVersiculo;
  btnSiguiente.disabled = enUltimoVersiculo;
  
  // Cambiar estilo visual
  btnAnterior.style.opacity = enPrimerVersiculo ? '0.5' : '1';
  btnSiguiente.style.opacity = enUltimoVersiculo ? '0.5' : '1';
  btnAnterior.style.cursor = enPrimerVersiculo ? 'not-allowed' : 'pointer';
  btnSiguiente.style.cursor = enUltimoVersiculo ? 'not-allowed' : 'pointer';
}

// Crear botones de navegación programáticamente
function crearBotonesNavegacion() {
  const contenedorEnviar = document.querySelector('.contenedor-version-y-enviar');
  
  if (!contenedorEnviar) return;
  
  // Buscar si ya existen los botones
  let btnAnterior = document.getElementById("versiculo-anterior");
  let btnSiguiente = document.getElementById("versiculo-siguiente");
  
  if (btnAnterior && btnSiguiente) return; // Ya existen
  
  // Crear contenedor de navegación
  const navContainer = document.createElement('div');
  navContainer.className = 'contenedor-navegacion-biblia';
  // Estilo Flexbox para que estén en fila y centrados
  navContainer.style.cssText = 'display: flex; gap: 15px; justify-content: center; margin-top: 10px; width: 100%;';
  
  // Botón Anterior
  btnAnterior = document.createElement('button');
  btnAnterior.id = 'versiculo-anterior';
  btnAnterior.className = 'nav-biblia';
  btnAnterior.innerHTML = 'Anterior';
  btnAnterior.title = 'Versículo Anterior (Flecha Izquierda)';
  // Estilo Brown (Café)
  btnAnterior.style.cssText = 'padding: 10px 25px; font-size: 16px; cursor: pointer; background: #8B4513; color: white; border: none; border-radius: 5px; font-weight: bold; transition: background 0.3s;';
  btnAnterior.onmouseover = () => btnAnterior.style.background = '#A0522D'; // Un poco más claro al pasar el mouse
  btnAnterior.onmouseout = () => btnAnterior.style.background = '#8B4513';
  btnAnterior.onclick = navegarAnterior;
  
  // Botón Siguiente
  btnSiguiente = document.createElement('button');
  btnSiguiente.id = 'versiculo-siguiente';
  btnSiguiente.className = 'nav-biblia';
  btnSiguiente.innerHTML = 'Siguiente';
  btnSiguiente.title = 'Versículo Siguiente (Flecha Derecha)';
  // Estilo Brown (Café)
  btnSiguiente.style.cssText = 'padding: 10px 25px; font-size: 16px; cursor: pointer; background: #8B4513; color: white; border: none; border-radius: 5px; font-weight: bold; transition: background 0.3s;';
  btnSiguiente.onmouseover = () => btnSiguiente.style.background = '#A0522D';
  btnSiguiente.onmouseout = () => btnSiguiente.style.background = '#8B4513';
  btnSiguiente.onclick = navegarSiguiente;
  
  // Agregar botones al contenedor
  navContainer.appendChild(btnAnterior);
  navContainer.appendChild(btnSiguiente);
  
  // Agregar al DOM después del botón enviar
  const btnEnviar = document.getElementById('enviar');
  if (btnEnviar) {
    btnEnviar.parentNode.insertBefore(navContainer, btnEnviar.nextSibling);
  }
  
  console.log('[BIBLIA] Botones de navegación creados (Estilo Brown)');
}

// Listener de teclado para navegación
document.addEventListener('keydown', (e) => {
  // Si no estamos en la sección de Biblia, no hacer nada
  const contenedorBiblia = document.getElementById('contenedor-biblia');
  if (!contenedorBiblia || contenedorBiblia.style.display === 'none') return;
  
  // Si estamos escribiendo en un input, no navegar
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  
  // Navegar con flechas
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navegarAnterior();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    navegarSiguiente();
  }
});

// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
  // Cargar la versión seleccionada inicialmente
  cargarVersion();
  
  // Ocultar botón "Enviar" ya que ahora la navegación envía automáticamente
  const btnEnviar = document.getElementById("enviar");
  if (btnEnviar) {
    btnEnviar.style.display = "none";
    console.log('[BIBLIA] Botón Enviar ocultado - navegación auto-envía');
  }
  
  // Crear botones de navegación
  setTimeout(crearBotonesNavegacion, 500);

  // Agregar evento al selector de versiones
  document.getElementById("selector-versiones").addEventListener("change", cargarVersion);
  
  console.log('[BIBLIA] Sistema de navegación inicializado');
  console.log('[BIBLIA] Usa flechas ← → para navegar entre versículos');
  console.log('[BIBLIA] La navegación envía automáticamente a pantalla secundaria');
});

// ============================================
// RESTO DEL CÓDIGO ORIGINAL (estilos, etc.)
// ============================================

// Cambiar tamaño de letra
let currentFontSize = 20;
let currentFontSize2 = 20;

document.getElementById("increase-font").onclick = () => {
  currentFontSize += 4;
  currentFontSize2 += 4;
  vistaPrevia.style.fontSize = `${currentFontSize}px`;
  vistaPrevia2.style.fontSize = `${currentFontSize2}px`;
  actualizarTamanioFuente(currentFontSize);
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("decrease-font").onclick = () => {
  if (currentFontSize > 1 || currentFontSize2 > 1 ) {
    currentFontSize -= 4;
    currentFontSize2 -= 4;
    vistaPrevia.style.fontSize = `${currentFontSize}px`;
    vistaPrevia2.style.fontSize = `${currentFontSize2}px`;
    actualizarTamanioFuente(currentFontSize);
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
  }
};

function actualizarTamanioFuente(size) {
  window.fontSize = `${size}px`;
}

document.getElementById("font-type").onchange = (e) => {
  vistaPrevia.style.fontFamily = e.target.value;
  vistaPrevia2.style.fontFamily = e.target.value;
  const fontFamilyAux = vistaPrevia.style.fontFamily = e.target.value;
  window.fontFamily = fontFamilyAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("font-color").oninput = (e) => {
  vistaPrevia.style.color = e.target.value;
  vistaPrevia2.style.color = e.target.value;
  const colorAux = vistaPrevia.style.color = e.target.value;
  window.color = colorAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("align-left").onclick = () => {
  vistaPrevia.style.textAlign = "left";
  vistaPrevia2.style.textAlign = "left";
  const textAlignAux = vistaPrevia.style.textAlign = "left";
  window.textAlign = textAlignAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("align-center").onclick = () => {
  vistaPrevia.style.textAlign = "center";
  vistaPrevia2.style.textAlign = "center";
  const textAlignAux = vistaPrevia.style.textAlign = "center";
  window.textAlign = textAlignAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("align-right").onclick = () => {
  vistaPrevia.style.textAlign = "right";
  vistaPrevia2.style.textAlign = "right";
  const textAlignAux = vistaPrevia.style.textAlign = "right";
  window.textAlign = textAlignAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("align-justify").onclick = () => {
  vistaPrevia.style.textAlign = "justify";
  vistaPrevia2.style.textAlign = "justify";
  const textAlignAux = vistaPrevia.style.textAlign = "justify";
  window.textAlign = textAlignAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("line-spacing").oninput = (e) => {
  vistaPrevia.style.lineHeight = e.target.value;
  vistaPrevia2.style.lineHeight = e.target.value;
  const lineHeightAux = vistaPrevia.style.lineHeight = e.target.value;
  window.lineHeight = lineHeightAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("letter-spacing").oninput = (e) => {
  vistaPrevia.style.letterSpacing = e.target.value + "px";
  vistaPrevia2.style.letterSpacing = e.target.value + "px";
  const letterSpacingAux = vistaPrevia.style.letterSpacing = e.target.value + "px";
  window.letterSpacing = letterSpacingAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

document.getElementById("desvanecer-fondo").oninput = (e) => {
  const opacityValue = e.target.value;
  const fondo = document.getElementById("fondo");
  const fondo2 = document.getElementById("fondo2");
  fondo.style.opacity = opacityValue;
  fondo2.style.opacity = opacityValue;
  const fondoAux = fondo.style.opacity = opacityValue;
  window.fondo1 = fondoAux;
  if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
};

function setBackground(image) {
  if (vistaPrevia && vistaPrevia2) {
    vistaPrevia.style.backgroundImage = `url(${image})`;
    vistaPrevia.style.backgroundSize = "cover";
    vistaPrevia2.style.backgroundImage = `url(${image})`;
    vistaPrevia2.style.backgroundSize = "cover";
    const backgroundImageAux = vistaPrevia.style.backgroundImage = `url(${image})`;
    window.backgroundImage = backgroundImageAux;
    if (typeof window.enviarVersiculo === 'function') window.enviarVersiculo();
  }
}

const totalImages = 100;
const letrasImagenes = document.getElementById("letra-imagenes");
letrasImagenes.innerHTML = `Imágenes de Fondo: ${totalImages} imágenes.`;

document.addEventListener("DOMContentLoaded", () => {
  const imagePath = "imagenes/fondoVersiculo/";
  const backgroundSelect = document.getElementById("background-select");

  if (backgroundSelect) {
    for (let i = 1; i <= totalImages; i++) {
      const img = document.createElement("img");
      img.src = `${imagePath}${i}.jpg`;
      img.alt = `Fondo ${i}`;
      img.className = "background-preview";
      img.onclick = () => setBackground(img.src);
      backgroundSelect.appendChild(img);
    }
  }
});
