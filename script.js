/**
 * ============================================================================
 * FÓSILREPO - SCRIPT PRINCIPAL
 * Fuente de datos: SheetDB (Google Sheets como API)
 * ============================================================================
 * 
 * CONFIGURACIÓN:
 * - Endpoint SheetDB: https://sheetdb.io/api/v1/bn7dgyevjhgk1
 * - Estructura de columnas esperada: id, url, titulo, descripcion, categoria,
 *   fecha_descubrimiento, ubicacion
 * 
 * ============================================================================
 */

// ==================== CONFIGURACIÓN ====================
const SHEETDB_URL = 'https://sheetdb.io/api/v1/bn7dgyevjhgk1';

// ==================== VARIABLES GLOBALES ====================
let allFossils = [];
let currentCategory = "all";
let currentSearchTerm = "";

// ==================== ELEMENTOS DOM ====================
const fossilContainer = document.getElementById('fossilListContainer');
const categoriesContainer = document.getElementById('categoriesContainer');
const searchInput = document.getElementById('searchInput');
const resultCounterSpan = document.getElementById('resultCounter');
const modal = document.getElementById('fossilModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalMeta = document.getElementById('modalMeta');
const modalDesc = document.getElementById('modalDesc');
const closeModalBtn = document.getElementById('closeModalBtn');

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * Muestra u oculta el indicador de carga
 */
function setLoading(show) {
    if (show) {
        fossilContainer.innerHTML = '<div class="loading">🦕 Cargando especímenes desde la nube...</div>';
    }
}

/**
 * Datos de respaldo en caso de error de conexión
 */
function getFallbackFossils() {
    return [
        {
            id: "1",
            url: "https://picsum.photos/id/104/300/200",
            titulo: "Ammonite",
            descripcion: "Fósil de ammonite del período Jurásico. Excelente preservación de la concha espiral.",
            categoria: "Ammonites",
            fecha_descubrimiento: "1850",
            ubicacion: "Dorset, Inglaterra"
        },
        {
            id: "2",
            url: "https://picsum.photos/id/107/300/200",
            titulo: "Diente de T-Rex",
            descripcion: "Diente fosilizado de Tyrannosaurus Rex, encontrado en formaciones del Cretácico Superior.",
            categoria: "Dinosaurios",
            fecha_descubrimiento: "1902",
            ubicacion: "Montana, EE.UU."
        },
        {
            id: "3",
            url: "https://picsum.photos/id/130/300/200",
            titulo: "Trilobite",
            descripcion: "Fósil de trilobite del Cámbrico, especie Elrathia kingii. Perfecto estado de conservación.",
            categoria: "Tricolites",
            fecha_descubrimiento: "1888",
            ubicacion: "Gales, Reino Unido"
        },
        {
            id: "4",
            url: "https://picsum.photos/id/131/300/200",
            titulo: "Helecho Fosilizado",
            descripcion: "Impresión de helecho del período Carbonífero. Detalles de nervaduras visibles.",
            categoria: "Plantas",
            fecha_descubrimiento: "1923",
            ubicacion: "Pennsylvania, EE.UU."
        },
        {
            id: "5",
            url: "https://picsum.photos/id/144/300/200",
            titulo: "Mamut Lanudo",
            descripcion: "Fragmento de colmillo de Mammuthus primigenius. Conservado en permafrost siberiano.",
            categoria: "Mamíferos",
            fecha_descubrimiento: "2010",
            ubicacion: "Siberia, Rusia"
        },
        {
            id: "6",
            url: "https://picsum.photos/id/151/300/200",
            titulo: "Cráneo de Mosasaurus",
            descripcion: "Réplica de cráneo de Mosasaurus, depredador marino del Cretácico.",
            categoria: "Dinosaurios",
            fecha_descubrimiento: "1780",
            ubicacion: "Maastricht, Países Bajos"
        }
    ];
}

/**
 * Obtiene datos desde SheetDB
 */
async function fetchFossilsFromSheet() {
    try {
        console.log("📡 Cargando datos desde SheetDB...");
        console.log("URL:", SHEETDB_URL);
        
        const response = await fetch(SHEETDB_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("📊 Datos recibidos:", data);
        
        if (!data || data.length === 0) {
            throw new Error("No hay datos en la hoja");
        }
        
        const fossils = data.map((row, index) => ({
            id: row.id || index + 1,
            url: row.url || '',
            titulo: row.titulo || 'Sin título',
            descripcion: row.descripcion || '',
            categoria: row.categoria || 'General',
            fecha_descubrimiento: row.fecha_descubrimiento || '',
            ubicacion: row.ubicacion || ''
        }));
        
        console.log(`✅ Cargados ${fossils.length} fósiles desde SheetDB`);
        return fossils.filter(f => f.titulo !== 'Sin título' || f.url);
        
    } catch (error) {
        console.error("❌ Error cargando desde SheetDB:", error);
        console.warn("⚠️ Usando datos de respaldo (fósiles de ejemplo)");
        return getFallbackFossils();
    }
}

// ==================== FUNCIONES DE RENDERIZADO ====================

/**
 * Renderiza los botones de categorías (orden alfabético)
 */
function renderCategories() {
    const uniqueCats = [...new Set(allFossils.map(f => f.categoria).filter(c => c && c.trim() !== ""))];
    uniqueCats.sort((a, b) => a.localeCompare(b));

    let btnsHtml = `<button class="cat-btn ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">📚 Todos</button>`;

    uniqueCats.forEach(cat => {
        btnsHtml += `<button class="cat-btn ${currentCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });

    categoriesContainer.innerHTML = btnsHtml;

    // Agregar event listeners a los botones
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.cat;
            renderCategories(); // Refrescar estado activo
            filterAndRenderFossils();
        });
    });
}

/**
 * Obtiene los fósiles filtrados por categoría y búsqueda
 */
function getFilteredFossils() {
    let filtered = allFossils;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(f => f.categoria === currentCategory);
    }

    if (currentSearchTerm.trim() !== "") {
        const term = currentSearchTerm.trim().toLowerCase();
        filtered = filtered.filter(f =>
            f.titulo.toLowerCase().includes(term) ||
            f.descripcion.toLowerCase().includes(term) ||
            f.ubicacion.toLowerCase().includes(term) ||
            f.categoria.toLowerCase().includes(term)
        );
    }

    return filtered;
}

/**
 * Renderiza la lista de fósiles en el contenedor principal
 */
function renderFossilList() {
    const filtered = getFilteredFossils();
    resultCounterSpan.innerText = `Mostrando ${filtered.length} de ${allFossils.length} fósiles`;

    if (filtered.length === 0) {
        fossilContainer.innerHTML = `<div class="no-results">🔍 No se encontraron fósiles. Prueba con otra búsqueda o categoría.</div>`;
        return;
    }

    let html = '';

    filtered.forEach(fossil => {
        const imgUrl = fossil.url && fossil.url.trim() !== "" ? fossil.url : "";

        const imageHtml = imgUrl ?
            `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(fossil.titulo)}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'placeholder-img\'>🪨 Imagen no disponible</div>';">` :
            `<div class="placeholder-img">🪨 Imagen no disponible</div>`;

        const metaInfo = [];
        if (fossil.ubicacion) metaInfo.push(`📍 ${escapeHtml(fossil.ubicacion)}`);
        if (fossil.fecha_descubrimiento) metaInfo.push(`📅 ${escapeHtml(fossil.fecha_descubrimiento)}`);
        const metaHtml = metaInfo.length ? `<div class="meta">${metaInfo.join(' • ')}</div>` : '';

        const descPreview = fossil.descripcion.length > 120 ?
            fossil.descripcion.substring(0, 120) + '...' :
            fossil.descripcion;

        html += `
            <div class="fossil-card" data-id="${escapeHtml(fossil.id)}">
                <div class="card-img">
                    ${imageHtml}
                </div>
                <div class="card-info">
                    <h3>${escapeHtml(fossil.titulo)}</h3>
                    ${metaHtml}
                    <div class="desc">${escapeHtml(descPreview)}</div>
                </div>
            </div>
        `;
    });

    fossilContainer.innerHTML = html;

    // Agregar eventos de clic para abrir modal
    document.querySelectorAll('.fossil-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const fossil = allFossils.find(f => f.id === id);
            if (fossil) openModal(fossil);
        });
    });
}

/**
 * Filtra y renderiza (unifica acciones)
 */
function filterAndRenderFossils() {
    renderFossilList();
}

// ==================== FUNCIONES DEL MODAL ====================

/**
 * Abre el modal con la información ampliada del fósil
 */
function openModal(fossil) {
    modalImage.src = fossil.url && fossil.url.trim() !== "" ? fossil.url : "";
    modalImage.alt = fossil.titulo;
    modalImage.onerror = () => {
        modalImage.src = "";
        modalImage.alt = "Imagen no disponible";
    };

    modalTitle.innerText = fossil.titulo;

    const metaArray = [];
    if (fossil.categoria) metaArray.push(`📁 ${fossil.categoria}`);
    if (fossil.ubicacion) metaArray.push(`📍 ${fossil.ubicacion}`);
    if (fossil.fecha_descubrimiento) metaArray.push(`📅 ${fossil.fecha_descubrimiento}`);
    modalMeta.innerHTML = metaArray.join(' · ');

    modalDesc.innerText = fossil.descripcion || "Sin descripción disponible.";
    modal.classList.add('active');
}

/**
 * Cierra el modal
 */
function closeModal() {
    modal.classList.remove('active');
}

// ==================== EVENT LISTENERS ====================

/**
 * Inicializa los event listeners de la interfaz
 */
function initEventListeners() {
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        filterAndRenderFossils();
    });

    closeModalBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// ==================== INICIALIZACIÓN ====================

/**
 * Función principal de inicio
 */
async function init() {
    setLoading(true);
    allFossils = await fetchFossilsFromSheet();
    setLoading(false);
    renderCategories();
    renderFossilList();
    initEventListeners();
}

// Iniciar la aplicación
init();