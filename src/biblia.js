
const listaLibros = document.getElementById("lista-libros");
const listaCapitulos = document.getElementById("lista-capitulos");
const vistaPrevia = document.getElementById("vista-previa");
const vistaPrevia2 = document.getElementById("vista-previa2");

// Variable para almacenar la versión seleccionada
let versionSeleccionada = 'SpanishRVR1960Bible';

// Función para cargar el archivo JSON de la versión seleccionada
async function cargarVersion() {
  const versionSelect = document.getElementById("selector-versiones");
  versionSeleccionada = versionSelect.value;
  

  // Limpiar los capítulos antes de cargar la nueva versión
  listaCapitulos.innerHTML = ''; // Limpiar los capítulos

  // Cargar el archivo JSON según la versión seleccionada
  const response = await fetch(`versionesBiblias/${versionSeleccionada}.json`);
  const versionData = await response.json();

  // Llamar a la función para cargar el libro con la nueva versión
  renderLibros(versionData);
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
  listaLibros.innerHTML = ''; // Limpiar la lista de libros antes de agregar los nuevos
  versionData.testaments.forEach((testamento) => {
    testamento.books.forEach((libro, index) => {
      const li = document.createElement("li");
      const libroNombre = librosPorNumero[libro.number - 1]; // Acceder al nombre del libro por número (restamos 1 porque los índices empiezan en 0)
      li.textContent = libroNombre;  // Mostrar el nombre del libro
      li.onclick = () => cargarLibro(libroNombre, libro, versionData.translation);
      listaLibros.appendChild(li);
    });
  });
}


// Cargar un libro y sus capítulos según la versión seleccionada
async function cargarLibro(libroNombre, libro, nombreTestamento) {
  listaCapitulos.innerHTML = `<h3>Cargando ${libro.name}...</h3>`;

  // Mostrar capítulos del libro en la versión seleccionada
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
    li.onclick = () => mostrarVersiculos(capitulo.verses, capituloIndex + 1, nombreLibro, nombreTestamento);
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
    li.onclick = () => mostrarVistaPrevia(versiculo, nombreTestamento, nombreLibro, capitulo, versiculoIndex + 1);
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

  // Actualizar la información global (solo cuando es necesario)
  const libroAux = `${nombreLibro} ${capitulo}:${versiculoNumero} | ${nombreTestamento}`;
  window.libro = libroAux;
}

// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
  // Cargar la versión seleccionada inicialmente
  cargarVersion();

  // Agregar evento al selector de versiones
  document.getElementById("selector-versiones").addEventListener("change", cargarVersion);
});


    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /*const listaLibros = document.getElementById("lista-libros");
    const listaCapitulos = document.getElementById("lista-capitulos");
    const vistaPrevia = document.getElementById("vista-previa");
    const vistaPrevia2 = document.getElementById("vista-previa2");
    // Renderizar libros
    function renderLibros() {
      libros.forEach((libro, index) => {
        const li = document.createElement("li");
        li.textContent = libro.nombre;
        li.onclick = () => cargarLibro(libro.archivo, libro.nombre);
        listaLibros.appendChild(li);
      });
    }

    // Cargar un libro dinámicamente
    async function cargarLibro(archivo, nombreLibro) {
      listaCapitulos.innerHTML = `<h3>Cargando ${nombreLibro}...</h3>`;
      const modulo = await import(archivo);
      mostrarCapitulos(modulo.default, nombreLibro);
    }

    // Mostrar capítulos del libro cargado
    function mostrarCapitulos(capitulos, nombreLibro) {
      listaCapitulos.innerHTML = `<h3>${nombreLibro}</h3><ul id="lista-capitulos-interna"></ul>`;
      const listaInterna = document.getElementById("lista-capitulos-interna");
      capitulos.forEach((versiculos, capituloIndex) => {
        const li = document.createElement("li");
        li.textContent = `Capítulo ${capituloIndex + 1}`;
        li.onclick = () => mostrarVersiculos(versiculos, capituloIndex + 1, nombreLibro);
        listaInterna.appendChild(li);
      });
    }

    // Mostrar versículos del capítulo seleccionado
    function mostrarVersiculos(versiculos, capitulo, nombreLibro) {
      listaCapitulos.innerHTML = `<h3>${nombreLibro} - Capítulo ${capitulo}</h3><ul id="lista-versiculos"></ul>`;
      const listaVersiculos = document.getElementById("lista-versiculos");
      versiculos.forEach((versiculo, versiculoIndex) => {
        const li = document.createElement("li");
        li.textContent = `Versículo ${versiculoIndex + 1}: ${versiculo.substring(0, 30)}...`;
        li.onclick = () => mostrarVistaPrevia(versiculo, nombreLibro, capitulo, versiculoIndex + 1);
        listaVersiculos.appendChild(li);
      });
    }

    let versiculoAux = '';
    // Mostrar un versículo en la vista previa
    function mostrarVistaPrevia(versiculo, nombreLibro, capitulo, versiculoNumero) {
      const titulo = document.querySelector(".titulo1");
      const titulo2 = document.querySelector(".titulo2");
      const versiculo1 = document.querySelector(".versiculo1");
      const versiculo2 = document.querySelector(".versiculo2");
      
      titulo.innerHTML = `Vista Previa:`;
      titulo2.innerHTML = `Vista Previa Mini:`;
      versiculo1.innerHTML = `${versiculo}`;
      versiculo2.innerHTML = `${versiculo}`;

      versiculoAux = versiculo;
      window.versiculo = versiculoAux;
      // Actualizar la información global (solo cuando es necesario)
      const libroAux = `${nombreLibro} ${capitulo}:${versiculoNumero} | RVR1960`;
      window.libro = libroAux;  // Actualiza el libro y versículo en la variable global
          
    }

    // Inicializar la aplicación
    document.addEventListener("DOMContentLoaded", () => {
        renderLibros();
    });*/

    

// Cambiar tamaño de letra
// Inicializar tamaño de fuente
let currentFontSize = 20; // Tamaño inicial en píxeles
let currentFontSize2 = 20;
// Incrementar tamaño de fuente
document.getElementById("increase-font").onclick = () => {
  currentFontSize += 4; // Incrementar tamaño
  currentFontSize2 += 4;
  vistaPrevia.style.fontSize = `${currentFontSize}px`;
  vistaPrevia2.style.fontSize = `${currentFontSize2}px`;
  actualizarTamanioFuente(currentFontSize);
};

// Decrementar tamaño de fuente
document.getElementById("decrease-font").onclick = () => {
  if (currentFontSize > 1 || currentFontSize2 > 1 ) { // Evitar tamaño negativo o cero
    currentFontSize -= 4; // Incrementar tamaño
    currentFontSize2 -= 4;
    vistaPrevia.style.fontSize = `${currentFontSize}px`;
    vistaPrevia2.style.fontSize = `${currentFontSize2}px`;
    actualizarTamanioFuente(currentFontSize);
  }
};

// Función para aplicar el tamaño de fuente a los elementos
function actualizarTamanioFuente(size) {
  window.fontSize = `${size}px`; // Actualizar la variable global
}


document.getElementById("font-type").onchange = (e) => {
  vistaPrevia.style.fontFamily = e.target.value;
  vistaPrevia2.style.fontFamily = e.target.value;
  const fontFamilyAux = vistaPrevia.style.fontFamily = e.target.value;
  window.fontFamily = fontFamilyAux;
};

// Cambiar color de fuente
document.getElementById("font-color").oninput = (e) => {
  vistaPrevia.style.color = e.target.value;
  vistaPrevia2.style.color = e.target.value;
  const colorAux = vistaPrevia.style.color = e.target.value;
  window.color = colorAux;
};

// Cambiar alineación
document.getElementById("align-left").onclick = () => {
  vistaPrevia.style.textAlign = "left";
  vistaPrevia2.style.textAlign = "left";
  const textAlignAux = vistaPrevia.style.textAlign = "left";
  window.textAlign = textAlignAux;
};

document.getElementById("align-center").onclick = () => {
  vistaPrevia.style.textAlign = "center";
  vistaPrevia2.style.textAlign = "center";
  const textAlignAux = vistaPrevia.style.textAlign = "center";
  window.textAlign = textAlignAux;
};

document.getElementById("align-right").onclick = () => {
  vistaPrevia.style.textAlign = "right";
  vistaPrevia2.style.textAlign = "right";
  const textAlignAux = vistaPrevia.style.textAlign = "right";
  window.textAlign = textAlignAux;
};

document.getElementById("align-justify").onclick = () => {
  vistaPrevia.style.textAlign = "justify";
  vistaPrevia2.style.textAlign = "justify";
  const textAlignAux = vistaPrevia.style.textAlign = "justify";
  window.textAlign = textAlignAux;
};

// Cambiar espaciado de líneas
document.getElementById("line-spacing").oninput = (e) => {
  vistaPrevia.style.lineHeight = e.target.value;
  vistaPrevia2.style.lineHeight = e.target.value;
  const lineHeightAux = vistaPrevia.style.lineHeight = e.target.value;
  window.lineHeight = lineHeightAux;
};

// Cambiar espaciado entre letras
document.getElementById("letter-spacing").oninput = (e) => {
  vistaPrevia.style.letterSpacing = e.target.value + "px";
  vistaPrevia2.style.letterSpacing = e.target.value + "px";
  const letterSpacingAux = vistaPrevia.style.letterSpacing = e.target.value + "px";
  window.letterSpacing = letterSpacingAux;
};

// Cambiar desvanecimiento de fondo
document.getElementById("desvanecer-fondo").oninput = (e) => {
  const opacityValue = e.target.value;
  // Cambiar la opacidad de la capa de fondo
  const fondo = document.getElementById("fondo");
  const fondo2 = document.getElementById("fondo2");
  fondo.style.opacity = opacityValue;
  fondo2.style.opacity = opacityValue;
  const fondoAux = fondo.style.opacity = opacityValue;
  window.fondo1 = fondoAux;
};



// Cambiar vista previa
function setBackground(image) {
  if (vistaPrevia && vistaPrevia2) {
    vistaPrevia.style.backgroundImage = `url(${image})`;
    vistaPrevia.style.backgroundSize = "cover";
    vistaPrevia2.style.backgroundImage = `url(${image})`;
    vistaPrevia2.style.backgroundSize = "cover";
    const backgroundImageAux = vistaPrevia.style.backgroundImage = `url(${image})`;
    window.backgroundImage = backgroundImageAux;
  }
}

const totalImages = 100; // Número total de imágenes
const letrasImagenes = document.getElementById("letra-imagenes");
letrasImagenes.innerHTML = `Imágenes de Fondo: ${totalImages} imágenes.`;

// Cargar imágenes automáticamente
document.addEventListener("DOMContentLoaded", () => {
  const imagePath = "imagenes/fondoVersiculo/"; // Ruta de las imágenes
  const backgroundSelect = document.getElementById("background-select");

  if (backgroundSelect) {
    for (let i = 1; i <= totalImages; i++) {
      const img = document.createElement("img");
      img.src = `${imagePath}${i}.jpg`; // Ruta de cada imagen
      img.alt = `Fondo ${i}`;
      img.className = "background-preview";
      img.onclick = () => setBackground(img.src); // Asignar el evento click
      backgroundSelect.appendChild(img); // Añadir imagen al contenedor
    }
  }
});




    //Libros completos de la Biblia, versión reina valera 1960
    /*const libros = [
  { nombre: "Génesis", archivo: "./biblia/genesis.js" },
  { nombre: "Éxodo", archivo: "./biblia/exodo.js" },
  { nombre: "Levítico", archivo: "./biblia/levitico.js" },
  { nombre: "Números", archivo: "./biblia/numeros.js" },
  { nombre: "Deuteronomio", archivo: "./biblia/deuteronomio.js" },
  { nombre: "Josué", archivo: "./biblia/josue.js" },
  { nombre: "Jueces", archivo: "./biblia/jueces.js" },
  { nombre: "Rut", archivo: "./biblia/rut.js" },
  { nombre: "1 Samuel", archivo: "./biblia/1_samuel.js" },
  { nombre: "2 Samuel", archivo: "./biblia/2_samuel.js" },
  { nombre: "1 Reyes", archivo: "./biblia/1_reyes.js" },
  { nombre: "2 Reyes", archivo: "./biblia/2_reyes.js" },
  { nombre: "1 Crónicas", archivo: "./biblia/1_cronicas.js" },
  { nombre: "2 Crónicas", archivo: "./biblia/2_cronicas.js" },
  { nombre: "Esdras", archivo: "./biblia/esdras.js" },
  { nombre: "Nehemías", archivo: "./biblia/nehemias.js" },
  { nombre: "Ester", archivo: "./biblia/ester.js" },
  { nombre: "Job", archivo: "./biblia/job.js" },
  { nombre: "Salmos", archivo: "./biblia/salmos.js" },
  { nombre: "Proverbios", archivo: "./biblia/proverbios.js" },
  { nombre: "Eclesiastés", archivo: "./biblia/eclesiastes.js" },
  { nombre: "Cantares", archivo: "./biblia/cantares.js" },
  { nombre: "Isaías", archivo: "./biblia/isaias.js" },
  { nombre: "Jeremías", archivo: "./biblia/jeremias.js" },
  { nombre: "Lamentaciones", archivo: "./biblia/lamentaciones.js" },
  { nombre: "Ezequiel", archivo: "./biblia/ezequiel.js" },
  { nombre: "Daniel", archivo: "./biblia/daniel.js" },
  { nombre: "Oseas", archivo: "./biblia/oseas.js" },
  { nombre: "Joel", archivo: "./biblia/joel.js" },
  { nombre: "Amós", archivo: "./biblia/amos.js" },
  { nombre: "Abdías", archivo: "./biblia/abdias.js" },
  { nombre: "Jonás", archivo: "./biblia/jonas.js" },
  { nombre: "Miqueas", archivo: "./biblia/miqueas.js" },
  { nombre: "Nahúm", archivo: "./biblia/nahum.js" },
  { nombre: "Habacuc", archivo: "./biblia/habacuc.js" },
  { nombre: "Sofonías", archivo: "./biblia/sofonias.js" },
  { nombre: "Hageo", archivo: "./biblia/hageo.js" },
  { nombre: "Zacarías", archivo: "./biblia/zacarias.js" },
  { nombre: "Malaquías", archivo: "./biblia/malaquias.js" },
  { nombre: "Mateo", archivo: "./biblia/mateo.js" },
  { nombre: "Marcos", archivo: "./biblia/marcos.js" },
  { nombre: "Lucas", archivo: "./biblia/lucas.js" },
  { nombre: "Juan", archivo: "./biblia/juan.js" },
  { nombre: "Hechos", archivo: "./biblia/hechos.js" },
  { nombre: "Romanos", archivo: "./biblia/romanos.js" },
  { nombre: "1 Corintios", archivo: "./biblia/1_corintios.js" },
  { nombre: "2 Corintios", archivo: "./biblia/2_corintios.js" },
  { nombre: "Gálatas", archivo: "./biblia/galatas.js" },
  { nombre: "Efesios", archivo: "./biblia/efesios.js" },
  { nombre: "Filipenses", archivo: "./biblia/filipenses.js" },
  { nombre: "Colosenses", archivo: "./biblia/colosenses.js" },
  { nombre: "1 Tesalonicenses", archivo: "./biblia/1_tesalonicenses.js" },
  { nombre: "2 Tesalonicenses", archivo: "./biblia/2_tesalonicenses.js" },
  { nombre: "1 Timoteo", archivo: "./biblia/1_timoteo.js" },
  { nombre: "2 Timoteo", archivo: "./biblia/2_timoteo.js" },
  { nombre: "Tito", archivo: "./biblia/tito.js" },
  { nombre: "Filemón", archivo: "./biblia/filemon.js" },
  { nombre: "Hebreos", archivo: "./biblia/hebreos.js" },
  { nombre: "Santiago", archivo: "./biblia/santiago.js" },
  { nombre: "1 Pedro", archivo: "./biblia/1_pedro.js" },
  { nombre: "2 Pedro", archivo: "./biblia/2_pedro.js" },
  { nombre: "1 Juan", archivo: "./biblia/1_juan.js" },
  { nombre: "2 Juan", archivo: "./biblia/2_juan.js" },
  { nombre: "3 Juan", archivo: "./biblia/3_juan.js" },
  { nombre: "Judas", archivo: "./biblia/judas.js" },
  { nombre: "Apocalipsis", archivo: "./biblia/apocalipsis.js" },
];*/
