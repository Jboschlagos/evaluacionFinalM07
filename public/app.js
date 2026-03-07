/* ══════════════════════════════════════════════
   PALASED — Lógica Frontend
   ══════════════════════════════════════════════ */

// ── Coordenadas de cada país del sistema ──
const COORDS = {
    "Luxemburgo": [49.8153, 6.1296],
    "Suiza": [46.8182, 8.2275],
    "Noruega": [60.4720, 8.4689],
    "Estados Unidos": [37.0902, -95.7129],
    "Holanda": [52.1326, 5.2913],
    "Finlandia": [61.9241, 25.7482],
    "Alemania": [51.1657, 10.4515],
    "Japon": [36.2048, 138.2529],
    "España": [40.4637, -3.7492],
    "Chile": [-35.675, -71.5430],
    "Mexico": [23.6345, -102.5528],
    "Brasil": [-14.235, -51.9253],
    "Argentina": [-38.416, -63.6167],
};

// ── Estado de la app ──
let limite = 5;
let offset = 0;
let pagina = 1;
let markers = {};     // nombre → leaflet marker
let mapa;

// ═══════════════════════════════════════
// INICIALIZAR MAPA
// ═══════════════════════════════════════
function initMapa() {
    mapa = L.map("map", {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
    });

    // Tile oscuro estilo CEPAL
    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 18 }
    ).addTo(mapa);

    // Controles de zoom personalizados (abajo derecha)
    L.control.zoom({ position: "bottomright" }).addTo(mapa);
    L.control.attribution({ position: "bottomleft", prefix: "© CartoDB · PALASED" }).addTo(mapa);
}

// ═══════════════════════════════════════
// CREAR MARCADOR PERSONALIZADO
// ═══════════════════════════════════════
function crearIcono(esNuevo = false) {
    return L.divIcon({
        className: "",
        html: `<div class="marker-pin ${esNuevo ? "new" : ""}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
}

// ═══════════════════════════════════════
// COLOCAR MARCADORES EN EL MAPA
// ═══════════════════════════════════════
function ponerMarcadores(paises) {
    // Limpiar marcadores anteriores
    Object.values(markers).forEach(m => mapa.removeLayer(m));
    markers = {};

    paises.forEach(p => {
        const coords = COORDS[p.nombre];
        if (!coords) return;

        const marker = L.marker(coords, { icon: crearIcono() }).addTo(mapa);

        const popup = `
      <div class="popup-content">
        <h4>${p.nombre}</h4>
        <div class="popup-row"><span>Continente</span><span>${p.continente}</span></div>
        <div class="popup-row"><span>Población</span><span>${Number(p.poblacion).toLocaleString("es-CL")}</span></div>
        <div class="popup-row"><span>PIB 2019</span><span>USD ${Number(p.pib_2019).toLocaleString("es-CL")}</span></div>
        <div class="popup-row"><span>PIB 2020</span><span>USD ${Number(p.pib_2020).toLocaleString("es-CL")}</span></div>
      </div>`;

        marker.bindPopup(popup, { maxWidth: 220 });
        markers[p.nombre] = marker;
    });
}

// ═══════════════════════════════════════
// CARGAR LISTA DE PAÍSES
// ═══════════════════════════════════════
async function cargarPaises() {
    const loading = document.getElementById("loading");
    const tabla = document.getElementById("tabla");
    const tbody = document.getElementById("tabla-body");

    loading.style.display = "flex";
    tabla.style.display = "none";

    try {
        const res = await fetch(`/paises?limite=${limite}&offset=${offset}`);
        const json = await res.json();

        if (!json.ok) throw new Error(json.mensaje);

        const datos = json.data;

        // Renderizar tabla
        tbody.innerHTML = "";
        datos.forEach((p, i) => {
            const cont = (p.continente || "").toLowerCase();
            const tr = document.createElement("tr");
            tr.style.animationDelay = `${i * 40}ms`;
            tr.innerHTML = `
        <td>${p.nombre}</td>
        <td><span class="continent-badge ${cont}">${p.continente}</span></td>
        <td>${Number(p.poblacion).toLocaleString("es-CL")}</td>
        <td>${Number(p.pib_2019).toLocaleString("es-CL")}</td>
        <td>${Number(p.pib_2020).toLocaleString("es-CL")}</td>`;

            // Al hacer clic en la fila → abrir popup del mapa
            tr.addEventListener("click", () => {
                const m = markers[p.nombre];
                if (m) {
                    mapa.setView(m.getLatLng(), 4, { animate: true });
                    m.openPopup();
                }
            });

            tbody.appendChild(tr);
        });

        // Actualizar marcadores del mapa
        ponerMarcadores(datos);

        // Paginación
        document.getElementById("page-info").textContent = `Página ${pagina}`;
        document.getElementById("btn-prev").disabled = offset === 0;
        document.getElementById("btn-next").disabled = datos.length < limite;

        loading.style.display = "none";
        tabla.style.display = "table";

        // Estado online
        setStatus(true);

    } catch (err) {
        loading.innerHTML = `<span style="color:var(--red);font-size:12px">⚠ ${err.message}</span>`;
        setStatus(false);
    }
}

// ═══════════════════════════════════════
// AGREGAR PAÍS
// ═══════════════════════════════════════
async function agregarPais() {
    const nombre = document.getElementById("add-nombre").value.trim();
    const continente = document.getElementById("add-continente").value;
    const poblacion = document.getElementById("add-poblacion").value;
    const pib_2019 = document.getElementById("add-pib2019").value;
    const pib_2020 = document.getElementById("add-pib2020").value;
    const msgEl = document.getElementById("msg-agregar");

    msgEl.className = "msg";
    msgEl.textContent = "";

    if (!nombre || !continente || !poblacion || !pib_2019 || !pib_2020) {
        mostrarMsg(msgEl, "error", "⚠ Todos los campos son obligatorios.");
        return;
    }

    try {
        const res = await fetch("/paises", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre, continente,
                poblacion: Number(poblacion),
                pib_2019: Number(pib_2019),
                pib_2020: Number(pib_2020)
            }),
        });
        const json = await res.json();

        if (!json.ok) throw new Error(json.mensaje);

        mostrarMsg(msgEl, "success", `✓ ${json.mensaje}`);

        // Agregar marcador temporal al mapa si tenemos coords
        const coords = COORDS[nombre];
        if (coords) {
            const m = L.marker(coords, { icon: crearIcono(true) }).addTo(mapa);
            m.bindPopup(`<div class="popup-content"><h4>${nombre}</h4><div class="popup-row"><span>Recién agregado</span></div></div>`);
            markers[nombre] = m;
            mapa.setView(coords, 4, { animate: true });
        }

        // Limpiar formulario
        ["add-nombre", "add-continente", "add-poblacion", "add-pib2019", "add-pib2020"]
            .forEach(id => { document.getElementById(id).value = ""; });

        // Recargar lista
        cargarPaises();

    } catch (err) {
        mostrarMsg(msgEl, "error", `⚠ ${err.message}`);
    }
}

// ═══════════════════════════════════════
// ELIMINAR PAÍS
// ═══════════════════════════════════════
async function eliminarPais() {
    const nombre = document.getElementById("del-nombre").value.trim();
    const msgEl = document.getElementById("msg-eliminar");

    msgEl.className = "msg";
    msgEl.textContent = "";

    if (!nombre) {
        mostrarMsg(msgEl, "error", "⚠ Ingresa el nombre del país.");
        return;
    }

    try {
        const res = await fetch(`/paises/${encodeURIComponent(nombre)}`, { method: "DELETE" });
        const json = await res.json();

        if (!json.ok) throw new Error(json.mensaje);

        mostrarMsg(msgEl, "success", `✓ ${json.mensaje}`);

        // Remover marcador del mapa
        if (markers[nombre]) {
            mapa.removeLayer(markers[nombre]);
            delete markers[nombre];
        }

        document.getElementById("del-nombre").value = "";
        cargarPaises();

    } catch (err) {
        mostrarMsg(msgEl, "error", `⚠ ${err.message}`);
    }
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function mostrarMsg(el, tipo, texto) {
    el.className = `msg ${tipo}`;
    el.textContent = texto;
}

function setStatus(online) {
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    dot.className = `status-dot ${online ? "online" : ""}`;
    text.textContent = online ? "Conectado" : "Sin conexión";
}

// ═══════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════

// Tabs
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
});

// Selector de registros
document.querySelectorAll(".sel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".sel-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        limite = parseInt(btn.dataset.limite);
        offset = 0;
        pagina = 1;
        cargarPaises();
    });
});

// Paginación
document.getElementById("btn-next").addEventListener("click", () => {
    offset += limite;
    pagina++;
    cargarPaises();
});

document.getElementById("btn-prev").addEventListener("click", () => {
    offset = Math.max(0, offset - limite);
    pagina = Math.max(1, pagina - 1);
    cargarPaises();
});

// Formularios
document.getElementById("btn-agregar").addEventListener("click", agregarPais);
document.getElementById("btn-eliminar").addEventListener("click", eliminarPais);

// ═══════════════════════════════════════
// ARRANCAR
// ═══════════════════════════════════════
initMapa();
cargarPaises();