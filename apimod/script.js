const API = "https://pokeapi.co/api/v2/pokemon/";
const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

const RANGOS = {
    1: [1, 151],
    2: [152, 251],
    3: [252, 386],
    4: [387, 493],

};

const formulario = document.getElementById("formulario");
const buscador = document.getElementById("buscador");
const btnBuscar = document.getElementById("btnBuscar");
const generacion = document.getElementById("generacion");
const catalogo = document.getElementById("catalogo");
const detalle = document.getElementById("detalle");

const contador = document.getElementById("contador");
const paginaInfo = document.getElementById("paginaInfo");
const estadoCatalogo = document.getElementById("estadoCatalogo");

const estadoHTTP = document.getElementById("estadoHTTP");
const tiempoHTTP = document.getElementById("tiempoHTTP");
const salidaJSON = document.getElementById("salidaJSON");
const btnCopiar = document.getElementById("btnCopiar");

let todosLosPokemon = [];
let pokemonActual = null;
let ultimoJSON = "";
let ultimaBusqueda = 0;

const nombresStats = {
    hp: "PS / Vida",
    attack: "Ataque",
    defense: "Defensa",
    "special-attack": "Ataque especial",
    "special-defense": "Defensa especial",
    speed: "Velocidad",
};

const nombresTipos = {
    normal: "Normal",
    fire: "Fuego",
    water: "Agua",
    electric: "Eléctrico",
    grass: "Planta",
    ice: "Hielo",
    fighting: "Lucha",
    poison: "Veneno",
    ground: "Tierra",
    flying: "Volador",
    psychic: "Psíquico",
    bug: "Bicho",
    rock: "Roca",
    ghost: "Fantasma",
    dragon: "Dragón",
    dark: "Siniestro",
    steel: "Acero",
    fairy: "Hada",
};

function nombreBonito(nombre) {
    return nombre
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function imagenPorId(id) {
    return SPRITES + id + ".png";
}

function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function mostrarEstadoHTTP(codigo, texto) {
    estadoHTTP.textContent = codigo + " " + texto;
    estadoHTTP.className = codigo >= 200 && codigo < 300 ? "" : "error";
}

async function cargarCatalogo() {
    estadoCatalogo.textContent = "Consultando los 493 Pokémon...";

    try {
        const inicio = performance.now();

        const respuesta = await fetch(API + "?limit=493&offset=0");

        if (!respuesta.ok) {
            throw new Error("Error HTTP " + respuesta.status);
        }

        const datos = await respuesta.json();

        todosLosPokemon = datos.results.map((pokemon, indice) => ({
            id: indice + 1,
            name: pokemon.name,
            url: pokemon.url,
        }));

        tiempoHTTP.textContent = Math.round(performance.now() - inicio) + " ms";

        mostrarEstadoHTTP(respuesta.status, respuesta.statusText);

        estadoCatalogo.textContent = "";
        actualizarCatalogo();

        // Mostrar un Pokémon inicial.
        await buscarPokemon("25");
    } catch (error) {
        estadoCatalogo.textContent = "No se pudo cargar el catálogo. Comprueba Internet e inténtalo de nuevo.";

        mostrarEstadoHTTP(0, "Error de conexión");

        salidaJSON.textContent = JSON.stringify(
            {
                error: error.message,
            },
            null,
            2
        );
    }
}

function obtenerGeneracion(id) {
    if (id <= 151) return 1;
    if (id <= 251) return 2;
    if (id <= 386) return 3;
    return 4;
}

function actualizarCatalogo() {
    const texto = buscador.value.trim().toLowerCase();
    const gen = generacion.value;

    const filtrados = todosLosPokemon.filter((pokemon) => {
        const coincideGen = gen === "all" || obtenerGeneracion(pokemon.id) === Number(gen);

        const coincideTexto = !texto || pokemon.name.includes(texto) || String(pokemon.id) === texto.replace(/^#/, "");

        return coincideGen && coincideTexto;
    });

    catalogo.replaceChildren();

    contador.textContent = filtrados.length + " Pokémon";
    paginaInfo.textContent = filtrados.length + " resultados de " + todosLosPokemon.length;

    if (filtrados.length === 0) {
        estadoCatalogo.textContent = "No se encontraron Pokémon con ese filtro.";
        return;
    }

    estadoCatalogo.textContent = "";

    const fragmento = document.createDocumentFragment();

    filtrados.forEach((pokemon) => {
        const tarjeta = document.createElement("button");
        tarjeta.type = "button";
        tarjeta.className = "tarjeta";

        if (pokemonActual?.id === pokemon.id) {
            tarjeta.classList.add("seleccionada");
        }

        const imagen = document.createElement("img");
        imagen.src = imagenPorId(pokemon.id);
        imagen.alt = nombreBonito(pokemon.name);
        imagen.loading = "lazy";
        imagen.onerror = () => {
            imagen.onerror = null;
            imagen.src =
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + pokemon.id + ".png";
        };

        const id = crearElemento("span", "id", "#" + String(pokemon.id).padStart(3, "0"));

        const nombre = crearElemento("span", "nombre", nombreBonito(pokemon.name));

        const genNumero = obtenerGeneracion(pokemon.id);
        const genTexto = ["", "Kanto", "Johto", "Hoenn", "Sinnoh"][genNumero];

        const region = crearElemento("span", "mini-tipo", "Generación " + genNumero + " · " + genTexto);

        tarjeta.append(imagen, id, nombre, region);

        tarjeta.addEventListener("click", () => {
            buscador.value = pokemon.name;
            buscarPokemon(pokemon.id);
        });

        fragmento.appendChild(tarjeta);
    });

    catalogo.appendChild(fragmento);
}

async function buscarPokemon(identificador) {
    const consulta = String(identificador ?? buscador.value)
    .trim()
    .toLowerCase()
    .replace(/^#/, "");

    if (!consulta) return;

    if (!/^[a-z0-9-]+$/.test(consulta)) {
        mostrarMensaje("Escribe un nombre o número válido.");
        return;
    }

    // Solo permitimos Pokémon del 1 al 493.
    if (/^\d+$/.test(consulta)) {
        const numero = Number(consulta);

        if (numero < 1 || numero > 493) {
            mostrarMensaje("El número debe estar entre 1 y 493.");
            return;
        }
    }

    const solicitudId = ++ultimaBusqueda;
    const inicio = performance.now();

    btnBuscar.disabled = true;
    btnBuscar.textContent = "Buscando...";

    estadoHTTP.textContent = "Consultando...";
    estadoHTTP.className = "";
    tiempoHTTP.textContent = "--";

    try {
        const respuesta = await fetch(API + encodeURIComponent(consulta) + "/");

        const datos = await respuesta.json();

        if (solicitudId !== ultimaBusqueda) return;

        ultimoJSON = JSON.stringify(datos, null, 2);
        salidaJSON.textContent = ultimoJSON;

        mostrarEstadoHTTP(respuesta.status, respuesta.statusText);

        tiempoHTTP.textContent = Math.round(performance.now() - inicio) + " ms";

        if (!respuesta.ok) {
            throw new Error("No se encontró ese Pokémon.");
        }

        if (datos.id < 1 || datos.id > 493) {
            throw new Error("Este proyecto admite las generaciones I a IV.");
        }

        pokemonActual = datos;
        buscador.value = datos.name;

        mostrarFicha(datos);
        actualizarCatalogo();

        document.getElementById("detalle").scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    } catch (error) {
        if (solicitudId !== ultimaBusqueda) return;

        mostrarMensaje(error.message);

        if (!ultimoJSON) {
            salidaJSON.textContent = JSON.stringify(
                {
                    error: error.message,
                },
                null,
                2
            );
        }

        if (estadoHTTP.textContent === "Consultando...") {
            mostrarEstadoHTTP(0, "Error de conexión");
        }
    } finally {
        if (solicitudId === ultimaBusqueda) {
            btnBuscar.disabled = false;
            btnBuscar.textContent = "Buscar";
        }
    }
}

function mostrarMensaje(texto) {
    detalle.replaceChildren();

    const caja = crearElemento("div", "detalle-vacio");
    const titulo = crearElemento("h2", "", "No se pudo completar la consulta");
    const mensaje = crearElemento("p", "", texto);

    caja.append(titulo, mensaje);
    detalle.appendChild(caja);
}

function mostrarFicha(datos) {
    detalle.replaceChildren();

    const ficha = crearElemento("div", "ficha");
    const zonaImagen = crearElemento("div", "ficha-imagen");
    const imagen = document.createElement("img");

    imagen.src =
        datos.sprites.other?.["official-artwork"]?.front_default ||
        datos.sprites.front_default ||
        imagenPorId(datos.id);

    imagen.alt = nombreBonito(datos.name);
    imagen.onerror = () => {
        imagen.onerror = null;
        imagen.src = imagenPorId(datos.id);
    };

    zonaImagen.appendChild(imagen);

    const info = crearElemento("div", "ficha-info");

    info.appendChild(
        crearElemento(
            "p",
            "numero",
            "#" + String(datos.id).padStart(3, "0") + " · GENERACIÓN " + obtenerGeneracion(datos.id)
        )
    );

    info.appendChild(crearElemento("h2", "", nombreBonito(datos.name)));

    const tipos = crearElemento("div", "tipos");

    datos.types.forEach((item) => {
        const tipo = item.type.name;
        tipos.appendChild(crearElemento("span", "tipo", nombresTipos[tipo] || nombreBonito(tipo)));
    });

    info.appendChild(tipos);

    const medidas = crearElemento("div", "medidas");

    [
        ["Altura", datos.height / 10 + " m"],
        ["Peso", datos.weight / 10 + " kg"],
        ["Experiencia base", datos.base_experience ?? "N/D"],
    ].forEach(([titulo, valor]) => {
        const caja = crearElemento("div", "medida");
        caja.append(crearElemento("span", "", titulo), crearElemento("strong", "", String(valor)));
        medidas.appendChild(caja);
    });

    info.appendChild(medidas);
    info.appendChild(crearElemento("h3", "", "Estadísticas base"));

    datos.stats.forEach((item) => {
        const fila = crearElemento("div", "stat");

        const nombre = nombresStats[item.stat.name] || item.stat.name;
        const valor = item.base_stat;

        const nombreElemento = crearElemento("span", "stat-nombre", nombre);
        const barra = crearElemento("div", "barra-stat");
        const relleno = crearElemento("div", "relleno-stat");

        relleno.style.width = Math.min((valor / 255) * 100, 100) + "%";
        barra.appendChild(relleno);

        fila.append(nombreElemento, barra, crearElemento("strong", "", String(valor)));

        info.appendChild(fila);
    });

    info.appendChild(crearElemento("h3", "", "Habilidades"));

    const listaHabilidades = crearElemento("div", "habilidades");

    datos.abilities.forEach((item) => {
        let nombre = nombreBonito(item.ability.name);

        if (item.is_hidden) nombre += " (oculta)";

        listaHabilidades.appendChild(crearElemento("span", "habilidad", nombre));
    });

    info.appendChild(listaHabilidades);

    const navegacion = crearElemento("div", "navegacion-ficha");

    const anterior = crearElemento("button", "boton-secundario", datos.id > 1 ? "← Anterior" : "Primer Pokémon");

    anterior.disabled = datos.id <= 1;

    anterior.addEventListener("click", () => {
        buscarPokemon(datos.id - 1);
    });

    const siguiente = crearElemento("button", "", datos.id < 493 ? "Siguiente →" : "Último Pokémon");

    siguiente.disabled = datos.id >= 493;

    siguiente.addEventListener("click", () => {
        buscarPokemon(datos.id + 1);
    });

    navegacion.append(anterior, siguiente);
    info.appendChild(navegacion);

    ficha.append(zonaImagen, info);
    detalle.appendChild(ficha);
}

formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscarPokemon(buscador.value);
});

generacion.addEventListener("change", actualizarCatalogo);

buscador.addEventListener("input", actualizarCatalogo);

btnCopiar.addEventListener("click", async () => {
    if (!ultimoJSON) {
        alert("Primero debes consultar un Pokémon.");
        return;
    }

    try {
        await navigator.clipboard.writeText(ultimoJSON);
        btnCopiar.textContent = "¡Copiado!";

        setTimeout(() => {
            btnCopiar.textContent = "Copiar JSON";
        }, 1500);
    } catch {
        alert("No se pudo copiar. Selecciona el JSON manualmente.");
    }
});

cargarCatalogo();
