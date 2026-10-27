const API_URL = "https://script.google.com/macros/s/AKfycbyW2_C7am9z6ej2gwAmxWUj2vwDwe67zA7ZvYb0BxdJah6ajl0Lv0OzQ5UFKm3V0ru0ZA/exec"; // Recuerda mantener tu URL real de Apps Script
const LOGO_DRIVE_URL = "https://drive.google.com/file/d/1EM8MEbYssMssn1NKQfAIqA6n3Fvr1Zrb/view?usp=drive_link";
const LOGO_DORADO_URL = "https://drive.google.com/file/d/127ufDGHvGnuYGPtvRb3K5SDBLr687rNa/view?usp=drive_link";

const FONDO_ROJA_URL = "https://drive.google.com/file/d/19XJR7ZobDCXDTe8S3Dsq3EF50emXlz_Q/view?usp=drive_link";
const FONDO_AZUL_URL = "https://drive.google.com/file/d/1DbdswRma_oWAwc_FrKvDfV3LHiO8tFjV/view?usp=drive_link";

let championshipData = [];
let sandaData = [];
let llavesSandaData = [];
let taoluData = [];
let medalleroData = [];
let currentActiveLlave = null;
let currentCategoryFiltered = "";
let playerTimeouts = {};
let streamUrls = { sanda: "", taolu: "" };

function convertToDirectDriveUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

document.addEventListener('DOMContentLoaded', () => {
    const logoImg = document.getElementById('nav-logo');
    if (logoImg) logoImg.src = convertToDirectDriveUrl(LOGO_DRIVE_URL);

    const cardRoja = document.getElementById('card-esquina-roja');
    if (cardRoja) cardRoja.style.backgroundImage = `url('${convertToDirectDriveUrl(FONDO_ROJA_URL)}')`;

    const cardAzul = document.getElementById('card-esquina-azul');
    if (cardAzul) cardAzul.style.backgroundImage = `url('${convertToDirectDriveUrl(FONDO_AZUL_URL)}')`;

    loadAllData();
});

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-mmcGold', 'bg-mmcBorder/50');
        btn.classList.add('text-gray-300');
    });
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('text-mmcGold', 'bg-mmcBorder/50');

    document.querySelectorAll('.mob-btn').forEach(btn => {
        btn.classList.remove('text-mmcGold', 'font-bold');
        btn.classList.add('text-gray-400');
    });
    const activeMob = document.getElementById(`mob-${viewName}`);
    if (activeMob) {
        activeMob.classList.remove('text-gray-400');
        activeMob.classList.add('text-mmcGold', 'font-bold');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadAllData() {
    try {
        const resChamp = await fetch(`${API_URL}?sheet=Championship`);
        championshipData = await resChamp.json();
        renderChampionships(championshipData);
        setupStreams(championshipData);

        const resSanda = await fetch(`${API_URL}?sheet=Sanda`);
        sandaData = await resSanda.json();

        const resLlaves = await fetch(`${API_URL}?sheet=Llaves_Sanda`);
        llavesSandaData = await resLlaves.json();

        initSandaModule(sandaData, llavesSandaData);

        const resTaolu = await fetch(`${API_URL}?sheet=Taolu`);
        taoluData = await resTaolu.json();
        renderTaoluGroups(taoluData);

        const resMedall = await fetch(`${API_URL}?sheet=Medallero`);
        medalleroData = await resMedall.json();
        renderMedallero(medalleroData);
    } catch (err) {
        console.error("Error conectando con Google Sheets:", err);
        setupStreams([]);
    }
}

function renderChampionships(data) {
    const container = document.getElementById('championships-grid');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-gray-400 col-span-full">No se encontraron campeonatos registrados.</p>`;
        return;
    }

    container.innerHTML = data.map(item => {
        const nombre = item.Nombre_Campeonato || item.nombre_campeonato || "Campeonato Wushu";
        const sede = item.Sede || item.sede || "Lima, Perú";
        const estado = item.Estado_Competencia || item.estado_competencia || "EN CURSO";
        const bannerUrl = convertToDirectDriveUrl(item.Banner_URL || item.banner_url || "");

        return `
            <div class="relative rounded-2xl overflow-hidden border border-mmcBorder group shadow-xl min-h-[220px] flex flex-col justify-end p-6">
                ${bannerUrl ? `<div class="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style="background-image: url('${bannerUrl}');"></div>` : `<div class="absolute inset-0 bg-slate-900"></div>`}
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                <div class="relative z-10 space-y-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">${estado}</span>
                    <h4 class="text-lg font-black text-white leading-snug">${nombre}</h4>
                    <p class="text-xs text-gray-300 flex items-center"><i class="fa-solid fa-location-dot mr-1 text-mmcGold"></i> ${sede}</p>
                    <button onclick="switchView('sanda')" class="w-full mt-2 bg-mmcGold hover:bg-yellow-500 text-black font-black py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-lg">
                        Entrar al Evento <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function setupStreams(champData) {
    const sandaContainer = document.getElementById('sanda-stream-container');
    const taoluContainer = document.getElementById('taolu-stream-container');
    const sandaBadge = document.getElementById('sanda-badge-container');
    const taoluBadge = document.getElementById('taolu-badge-container');

    const activeChamp = champData && champData.length > 0 ? champData[0] : {};
    
    const sandaUrl = activeChamp.Transmision_Sanda || activeChamp.transmision_sanda || "";
    const sandaEstado = (activeChamp.Estado_Sanda || activeChamp.estado_sanda || "").trim().toUpperCase();

    const taoluUrl = activeChamp.Transmision_Taolu || activeChamp.transmision_taolu || "";
    const taoluEstado = (activeChamp.Estado_Taolu || activeChamp.estado_taolu || "").trim().toUpperCase();

    streamUrls.sanda = sandaUrl;
    streamUrls.taolu = taoluUrl;

    renderStreamInContainer(sandaContainer, sandaUrl, 'sanda');
    renderStreamBadge(sandaBadge, sandaEstado);

    renderStreamInContainer(taoluContainer, taoluUrl, 'taolu');
    renderStreamBadge(taoluBadge, taoluEstado);
}

function renderStreamBadge(badgeContainer, estado) {
    if (!badgeContainer) return;
    if (estado === "EN VIVO") {
        badgeContainer.innerHTML = `
            <span class="flex items-center bg-red-600 text-white text-xs px-3 py-1 rounded-full font-black shadow-lg uppercase tracking-wider border border-red-400">
                <span class="w-2.5 h-2.5 bg-white rounded-full mr-2 animate-pulse-dot inline-block"></span> EN VIVO
            </span>
        `;
    } else if (estado === "FINALIZADO" || estado === "FINALIZADDO") {
        badgeContainer.innerHTML = `
            <span class="flex items-center bg-slate-900/90 text-mmcGold text-xs px-3 py-1 rounded-full font-black shadow-lg uppercase tracking-wider border border-mmcGold/50">
                <i class="fa-solid fa-rotate-right mr-1.5 animate-spin"></i> REPETICIÓN DEL EVENTO
            </span>
        `;
    } else {
        badgeContainer.innerHTML = "";
    }
}

function renderStreamInContainer(container, url, type) {
    if (!container) return;

    if (!url || url.trim() === "") {
        container.innerHTML = `
            <div class="text-center p-6 flex flex-col items-center justify-center space-y-3 absolute inset-0 bg-black/95 z-10">
                <img src="${convertToDirectDriveUrl(LOGO_DORADO_URL)}" alt="MMC Logo" class="h-12 md:h-16 w-auto object-contain animate-pulse">
                <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">Esperando Transmisión En Vivo...</p>
            </div>
        `;
        document.getElementById(`${type}-player-controls`)?.classList.add('hidden');
    } else {
        let embedUrl = url;
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1]?.split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1`;
        } else if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1`;
        }

        container.innerHTML = `
            <iframe id="${type}-iframe" class="w-full h-full absolute inset-0 border-0" src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;
        document.getElementById(`${type}-player-controls`)?.classList.remove('hidden');
    }
}

function openStreamSource(type) {
    const url = streamUrls[type];
    if (url) {
        window.open(url, '_blank');
    } else {
        alert("No hay enlace de transmisión disponible.");
    }
}

function copyStreamLink(type) {
    const url = streamUrls[type];
    if (url) {
        navigator.clipboard.writeText(url).then(() => {
            alert("¡Enlace de transmisión copiado al portapapeles!");
        }).catch(err => {
            console.error("Error al copiar:", err);
        });
    } else {
        alert("No hay enlace para compartir.");
    }
}

function handlePlayerActivity(type) {
    const controls = document.getElementById(`${type}-player-controls`);
    if (controls && streamUrls[type]) {
        controls.classList.remove('player-hidden');
        clearTimeout(playerTimeouts[type]);
        playerTimeouts[type] = setTimeout(() => {
            controls.classList.add('player-hidden');
        }, 3500);
    }
}

function handlePlayerMouseLeave(type) {
    const controls = document.getElementById(`${type}-player-controls`);
    if (controls) {
        controls.classList.add('player-hidden');
    }
}

function toggleFullscreen(wrapperId) {
    const elem = document.getElementById(wrapperId);
    if (!elem) return;
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => alert(`Error al maximizar: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}

// ==========================================
// MÓDULO SANDA
// ==========================================
let currentMatchLevel = "AVANZADO"; 
let timerInterval = null;
let secondsLeft = 120;
let currentRound = 1;
let isResting = false;

function initSandaModule(data, llavesData) {
    const selectEl = document.getElementById('sanda-category-select');
    if (!selectEl) return;

    const categories = {};
    data.forEach(row => {
        const edad = row.Rango_Edad || row.rango_edad || "";
        const nivel = row.Nivel || row.nivel || "";
        const genero = row.Genero || row.genero || "";
        const peso = row.Peso || row.peso || "";
        const catKey = `${edad} ${nivel} ${genero} ${peso} KG`.trim();
        
        if (!categories[catKey]) categories[catKey] = [];
        categories[catKey].push(row);
    });

    const catKeys = Object.keys(categories);
    if (catKeys.length === 0) {
        selectEl.innerHTML = `<option value="">No hay categorías configuradas</option>`;
        return;
    }

    selectEl.innerHTML = catKeys.map(cat => `
        <option value="${cat}">${cat}</option>
    `).join('');

    filterSandaCategory(catKeys[0]);
}

function filterSandaCategory(categoryName) {
    currentCategoryFiltered = categoryName;
    const selectEl = document.getElementById('sanda-category-select');
    if (selectEl && selectEl.value !== categoryName) {
        selectEl.value = categoryName;
    }

    document.getElementById('bracket-category-title').innerText = categoryName;
    document.getElementById('bracket-subtitle-info').innerText = `Sanda • Categoría: ${categoryName} • Eliminación Directa`;

    const filtered = sandaData.filter(row => {
        const edad = row.Rango_Edad || row.rango_edad || "";
        const nivel = row.Nivel || row.nivel || "";
        const genero = row.Genero || row.genero || "";
        const peso = row.Peso || row.peso || "";
        return `${edad} ${nivel} ${genero} ${peso} KG`.trim() === categoryName;
    });

    const sampleNivel = (filtered[0]?.Nivel || filtered[0]?.nivel || "").toUpperCase();
    currentMatchLevel = sampleNivel.includes("NOVEL") ? "NOVEL" : "AVANZADO";
    resetTimer();

    renderTournamentBracketsTree(filtered, llavesSandaData);
    
    if (filtered.length > 0) {
        const pairs = {};
        filtered.forEach(row => {
            const llave = row.ID_Llave || row.id_llave || "P01";
            if (!pairs[llave]) pairs[llave] = [];
            pairs[llave].push(row);
        });
        const firstKey = Object.keys(pairs)[0];
        if (firstKey) {
            const firstPair = pairs[firstKey];
            const r = firstPair.find(f => (f.Color || f.color || "").toUpperCase() === "ROJO") || firstPair[0] || {};
            const b = firstPair.find(f => (f.Color || f.color || "").toUpperCase() === "AZUL") || firstPair[1] || {};
            
            const redDni = (r.DNI_Participante || r.dni_participante || "").toString().trim();
            const blueDni = (b.DNI_Participante || b.dni_participante || "").toString().trim();

            selectSandaMatch({
                name: redDni ? (r.Nombre_Completo || r.nombre_completo) : (r.Ganador_a_Ingresar || r.ganador_a_ingresar || "Por definir"),
                siglas: redDni ? (r.Siglas || r.siglas || "MMC") : "",
                inst: redDni ? (r.Nombre_Escuela || r.nombre_escuela || r.Institucion || r.institucion || "Master Martial Combat") : "",
                photo: redDni ? convertToDirectDriveUrl(r.URL_Foto || r.url_foto || "") : "",
                logo: redDni ? convertToDirectDriveUrl(r.URL_Logo || r.url_logo || "") : ""
            }, {
                name: blueDni ? (b.Nombre_Completo || b.nombre_completo) : (b.Ganador_a_Ingresar || b.ganador_a_ingresar || "Por definir"),
                siglas: blueDni ? (b.Siglas || b.siglas || "UPCH") : "",
                inst: blueDni ? (b.Nombre_Escuela || b.nombre_escuela || b.Institucion || b.institucion || "Universidad Peruana Cayetano Heredia") : "",
                photo: blueDni ? convertToDirectDriveUrl(b.URL_Foto || b.url_foto || "") : "",
                logo: blueDni ? convertToDirectDriveUrl(b.URL_Logo || b.url_logo || "") : ""
            }, firstKey);
        }
    }
}

function renderTournamentBracketsTree(filteredFighters, llavesData) {
    const container = document.getElementById('tournament-brackets-container');
    if (!container) return;

    const pairs = {};
    filteredFighters.forEach(row => {
        const llave = row.ID_Llave || row.id_llave || "P01";
        if (!pairs[llave]) pairs[llave] = [];
        pairs[llave].push(row);
    });

    const llaveKeys = Object.keys(pairs);
    if (llaveKeys.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 font-bold col-span-full">No hay llaves registradas para esta categoría.</p>`;
        return;
    }

    const phaseOrderMap = {
        "DIECISEISAVOS DE FINAL": 1,
        "OCTAVOS DE FINAL": 2,
        "CUARTOS DE FINAL": 3,
        "SEMIFINAL": 4,
        "FINAL": 5
    };

    const groupedPhases = {};

    llaveKeys.forEach(llaveId => {
        const llaveRow = llavesData.find(row => (row.ID_Llave_Sanda || row.id_llave_sanda || row.ID_Llave) === llaveId);
        let phaseName = llaveRow ? (llaveRow.Orden_de_Final || llaveRow.orden_de_final || "").trim().toUpperCase() : "";

        if (!phaseName) {
            if (llaveKeys.length >= 8) phaseName = "OCTAVOS DE FINAL";
            else if (llaveKeys.length >= 4) phaseName = "CUARTOS DE FINAL";
            else if (llaveKeys.length >= 2) phaseName = "SEMIFINAL";
            else phaseName = "FINAL";
        }

        if (!groupedPhases[phaseName]) groupedPhases[phaseName] = [];
        groupedPhases[phaseName].push(llaveId);
    });

    const activePhaseNames = Object.keys(groupedPhases).sort((a, b) => {
        const orderA = phaseOrderMap[a] || 99;
        const orderB = phaseOrderMap[b] || 99;
        return orderA - orderB;
    });

    const createCardHtml = (llaveId) => {
        const fighters = pairs[llaveId] || [];
        const r = fighters.find(f => (f.Color || f.color || "").toUpperCase() === "ROJO") || fighters[0] || {};
        const b = fighters.find(f => (f.Color || f.color || "").toUpperCase() === "AZUL") || fighters[1] || {};

        const llaveRow = llavesData.find(row => (row.ID_Llave_Sanda || row.id_llave_sanda) === llaveId);
        const estadoLlave = llaveRow ? (llaveRow.Estado || llaveRow.estado || "Pendiente") : "Pendiente";
        const ganadorOficial = llaveRow ? (llaveRow.Ganador || llaveRow.ganador || "").toUpperCase() : "";

        const redDni = (r.DNI_Participante || r.dni_participante || "").toString().trim();
        const blueDni = (b.DNI_Participante || b.dni_participante || "").toString().trim();

        const redName = redDni ? (r.Nombre_Completo || r.nombre_completo) : (r.Ganador_a_Ingresar || r.ganador_a_ingresar || "Ganador de llave previa");
        const blueName = blueDni ? (b.Nombre_Completo || b.nombre_completo) : (b.Ganador_a_Ingresar || b.ganador_a_ingresar || "Ganador de llave previa");

        const redClass = redDni ? (ganadorOficial === "AZUL" ? "text-slate-400 line-through opacity-50 font-normal" : "text-slate-900 font-extrabold") : "text-slate-500 italic font-medium";
        const blueClass = blueDni ? (ganadorOficial === "ROJO" ? "text-slate-400 line-through opacity-50 font-normal" : "text-slate-900 font-extrabold") : "text-slate-500 italic font-medium";

        const redPuesto = redDni ? (r.Puesto_Nombre || r.puesto_nombre || "").trim() : "";
        const redMedallaUrl = redDni ? convertToDirectDriveUrl(r.Puesto_URL || r.puesto_url || "") : "";

        const bluePuesto = blueDni ? (b.Puesto_Nombre || b.puesto_nombre || "").trim() : "";
        const blueMedallaUrl = blueDni ? convertToDirectDriveUrl(b.Puesto_URL || b.puesto_url || "") : "";

        const redObj = {
            name: redDni ? redName : (r.Ganador_a_Ingresar || r.ganador_a_ingresar || "Por definir"),
            siglas: redDni ? (r.Siglas || r.siglas || "") : "",
            inst: redDni ? (r.Nombre_Escuela || r.nombre_escuela || r.Institucion || r.institucion || "") : "",
            photo: redDni ? convertToDirectDriveUrl(r.URL_Foto || r.url_foto || "") : "",
            logo: redDni ? convertToDirectDriveUrl(r.URL_Logo || r.url_logo || "") : ""
        };

        const blueObj = {
            name: blueDni ? blueName : (b.Ganador_a_Ingresar || b.ganador_a_ingresar || "Por definir"),
            siglas: blueDni ? (b.Siglas || b.siglas || "") : "",
            inst: blueDni ? (b.Nombre_Escuela || b.nombre_escuela || b.Institucion || b.institucion || "") : "",
            photo: blueDni ? convertToDirectDriveUrl(b.URL_Foto || b.url_foto || "") : "",
            logo: blueDni ? convertToDirectDriveUrl(b.URL_Logo || b.url_logo || "") : ""
        };

        return `
            <div onclick='selectSandaMatch(${JSON.stringify(redObj)}, ${JSON.stringify(blueObj)}, ${JSON.stringify(llaveId)})' class="bg-white border-2 border-slate-300 hover:border-mmcGold cursor-pointer rounded-xl overflow-hidden shadow-md hover:shadow-xl transition w-[310px] flex-shrink-0 my-3">
                <div class="bg-slate-900 px-3 py-1.5 flex justify-between items-center border-b border-slate-700">
                    <span class="bg-slate-800 text-white font-mono text-xs font-black px-2.5 py-0.5 rounded border border-slate-600">${llaveId}</span>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded ${estadoLlave.toUpperCase() === 'FINALIZADO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">${estadoLlave}</span>
                </div>
                <div class="p-3 space-y-2">
                    <div class="flex justify-between items-center bg-red-50 px-3 py-2 rounded border-l-4 border-red-600 shadow-sm">
                        <div class="flex items-center space-x-2 overflow-hidden pr-2">
                            <span class="text-xs truncate ${redClass}" title="${redName}">${redName}</span>
                            ${redMedallaUrl ? `<img src="${redMedallaUrl}" alt="${redPuesto}" class="w-5 h-5 object-contain flex-shrink-0 drop-shadow" title="${redPuesto}">` : ''}
                        </div>
                        <span class="text-[9px] font-black text-red-600 flex-shrink-0">ROJO</span>
                    </div>
                    <div class="flex justify-between items-center bg-blue-50 px-3 py-2 rounded border-l-4 border-blue-600 shadow-sm">
                        <div class="flex items-center space-x-2 overflow-hidden pr-2">
                            <span class="text-xs truncate ${blueClass}" title="${blueName}">${blueName}</span>
                            ${blueMedallaUrl ? `<img src="${blueMedallaUrl}" alt="${bluePuesto}" class="w-5 h-5 object-contain flex-shrink-0 drop-shadow" title="${bluePuesto}">` : ''}
                        </div>
                        <span class="text-[9px] font-black text-blue-600 flex-shrink-0">AZUL</span>
                    </div>
                </div>
            </div>
        `;
    };

    container.innerHTML = activePhaseNames.map((phaseName, pIdx) => `
        <div class="flex flex-col items-center space-y-4">
            <span class="text-[11px] font-black text-slate-800 uppercase tracking-widest bg-slate-200/80 px-3 py-1 rounded-md border border-slate-300 shadow-sm">${phaseName}</span>
            <div class="flex flex-col justify-around space-y-4">
                ${groupedPhases[phaseName].map(k => createCardHtml(k)).join('')}
            </div>
        </div>
        ${pIdx < activePhaseNames.length - 1 ? `
            <div class="flex flex-col items-center justify-center">
                <svg width="45" height="220" class="stroke-slate-400 stroke-[3] fill-none">
                    <path d="M 0 55 Q 22 55, 22 110 T 45 165" />
                    <path d="M 0 165 Q 22 165, 22 110 T 45 55" />
                </svg>
            </div>
        ` : ''}
    `).join('');
}

function selectSandaMatch(red, blue, llaveId) {
    currentActiveLlave = llaveId;
    document.getElementById('sanda-red-fullname').innerText = red.name;
    document.getElementById('sanda-red-siglas').innerText = red.siglas;
    document.getElementById('sanda-red-inst').innerText = red.inst;

    const redPhotoBox = document.getElementById('sanda-red-photo-container');
    if (redPhotoBox) {
        redPhotoBox.innerHTML = red.photo ? `<img id="red-fighter-img" src="${red.photo}" class="w-full h-full object-cover object-top transition duration-300">` : `<i class="fa-solid fa-user text-6xl text-gray-600 absolute inset-0 m-auto w-fit h-fit"></i>`;
    }

    const redSchoolLogo = document.getElementById('sanda-red-school-logo');
    if (redSchoolLogo) {
        redSchoolLogo.innerHTML = red.logo ? `<img src="${red.logo}" class="w-full h-full object-contain">` : `<i class="fa-solid fa-graduation-cap text-xs text-mmcGold"></i>`;
    }

    document.getElementById('sanda-blue-fullname').innerText = blue.name;
    document.getElementById('sanda-blue-siglas').innerText = blue.siglas;
    document.getElementById('sanda-blue-inst').innerText = blue.inst;

    const bluePhotoBox = document.getElementById('sanda-blue-photo-container');
    if (bluePhotoBox) {
        bluePhotoBox.innerHTML = blue.photo ? `<img id="blue-fighter-img" src="${blue.photo}" class="w-full h-full object-cover object-top transition duration-300">` : `<i class="fa-solid fa-user text-6xl text-gray-600 absolute inset-0 m-auto w-fit h-fit"></i>`;
    }

    const blueSchoolLogo = document.getElementById('sanda-blue-school-logo');
    if (blueSchoolLogo) {
        blueSchoolLogo.innerHTML = blue.logo ? `<img src="${blue.logo}" class="w-full h-full object-contain">` : `<i class="fa-solid fa-graduation-cap text-xs text-mmcGold"></i>`;
    }

    updateRoundCirclesFromSheets();
}

async function syncMatchData() {
    try {
        const res = await fetch(`${API_URL}?sheet=Llaves_Sanda`);
        llavesSandaData = await res.json();
        updateRoundCirclesFromSheets();
        renderTournamentBracketsTree(sandaData.filter(row => {
            const edad = row.Rango_Edad || row.rango_edad || "";
            const nivel = row.Nivel || row.nivel || "";
            const genero = row.Genero || row.genero || "";
            const peso = row.Peso || row.peso || "";
            return `${edad} ${nivel} ${genero} ${peso} KG`.trim() === currentCategoryFiltered;
        }), llavesSandaData);
        alert("¡Datos, ganadores y estado de rounds actualizados desde Google Sheets!");
    } catch (e) {
        console.error("Error al sincronizar datos:", e);
    }
}

function updateRoundCirclesFromSheets() {
    if (!currentActiveLlave) return;
    const llaveRow = llavesSandaData.find(row => (row.ID_Llave_Sanda || row.id_llave_sanda) === currentActiveLlave);

    const r1 = llaveRow ? (llaveRow.Round1 || llaveRow.round1 || "-") : "-";
    const r2 = llaveRow ? (llaveRow.Round2 || llaveRow.round2 || "-") : "-";
    const r3 = llaveRow ? (llaveRow.Round3 || llaveRow.round3 || "-") : "-";

    const r1RedScore = llaveRow ? (llaveRow.ROJO_Round1 || llaveRow.rojo_round1 || "0") : "0";
    const r1BlueScore = llaveRow ? (llaveRow.AZUL_Round1 || llaveRow.azul_round1 || "0") : "0";

    const r2RedScore = llaveRow ? (llaveRow.ROJO_Round2 || llaveRow.rojo_round2 || "0") : "0";
    const r2BlueScore = llaveRow ? (llaveRow.AZUL_Round2 || llaveRow.azul_round2 || "0") : "0";

    const r3RedScore = llaveRow ? (llaveRow.ROJO_Round3 || llaveRow.rojo_round3 || "0") : "0";
    const r3BlueScore = llaveRow ? (llaveRow.AZUL_Round3 || llaveRow.azul_round3 || "0") : "0";

    applyRoundCircleStyle(1, r1, `${r1RedScore} / ${r1BlueScore}`);
    applyRoundCircleStyle(2, r2, `${r2RedScore} / ${r2BlueScore}`);
    applyRoundCircleStyle(3, r3, `${r3RedScore} / ${r3BlueScore}`);

    const oficialGanador = llaveRow ? (llaveRow.Ganador || llaveRow.ganador || "").toUpperCase() : "";

    const redImg = document.getElementById('red-fighter-img');
    const blueImg = document.getElementById('blue-fighter-img');
    const cardRoja = document.getElementById('card-esquina-roja');
    const cardAzul = document.getElementById('card-esquina-azul');
    const overlayRojo = document.getElementById('bg-overlay-rojo');
    const overlayAzul = document.getElementById('bg-overlay-azul');

    if (redImg && blueImg && cardRoja && cardAzul) {
        if (oficialGanador === "ROJO") {
            redImg.style.filter = "none";
            cardRoja.classList.add("ring-4", "ring-red-500", "shadow-red-500/50");
            if (overlayRojo) overlayRojo.style.background = "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(127,29,29,0.5), rgba(0,0,0,0.8))";

            blueImg.style.filter = "grayscale(100%) brightness(60%)";
            cardAzul.classList.remove("ring-4", "ring-blue-500", "shadow-blue-500/50");
            if (overlayAzul) overlayAzul.style.background = "linear-gradient(to bottom, rgba(20,20,20,0.9), rgba(40,40,40,0.8), rgba(10,10,10,0.9))";
        } else if (oficialGanador === "AZUL") {
            blueImg.style.filter = "none";
            cardAzul.classList.add("ring-4", "ring-blue-500", "shadow-blue-500/50");
            if (overlayAzul) overlayAzul.style.background = "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(30,58,138,0.5), rgba(0,0,0,0.8))";

            redImg.style.filter = "grayscale(100%) brightness(60%)";
            cardRoja.classList.remove("ring-4", "ring-red-500", "shadow-red-500/50");
            if (overlayRojo) overlayRojo.style.background = "linear-gradient(to bottom, rgba(20,20,20,0.9), rgba(40,40,40,0.8), rgba(10,10,10,0.9))";
        } else {
            redImg.style.filter = "none";
            blueImg.style.filter = "none";
            cardRoja.classList.remove("ring-4", "ring-red-500", "shadow-red-500/50");
            cardAzul.classList.remove("ring-4", "ring-blue-500", "shadow-blue-500/50");
            if (overlayRojo) overlayRojo.style.background = "";
            if (overlayAzul) overlayAzul.style.background = "";
        }
    }
}

function applyRoundCircleStyle(roundNum, winnerColor, scoreText) {
    const circle = document.getElementById(`round-circle-${roundNum}`);
    const scoreLabel = document.getElementById(`round-score-${roundNum}`);
    if (!circle || !scoreLabel) return;

    scoreLabel.innerText = scoreText;

    if (winnerColor === "ROJO") {
        circle.className = "w-3.5 h-3.5 rounded-full bg-red-600 shadow-md ring-2 ring-red-500/50";
    } else if (winnerColor === "AZUL") {
        circle.className = "w-3.5 h-3.5 rounded-full bg-blue-600 shadow-md ring-2 ring-blue-500/50";
    } else {
        circle.className = "w-3.5 h-3.5 rounded-full border border-slate-600 bg-slate-800 shadow-inner";
    }
}

function toggleTimer() {
    const btn = document.getElementById('timer-btn');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    } else {
        timerInterval = setInterval(() => {
            if (secondsLeft > 0) {
                secondsLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                if (!isResting) {
                    alert("¡Asalto finalizado! Tiempo de descanso.");
                    startRestPeriod();
                } else {
                    alert("¡Descanso finalizado! Siguiente asalto.");
                    nextRound();
                }
            }
        }, 1000);
        btn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    }
}

function startRestPeriod() {
    isResting = true;
    secondsLeft = 60;
    document.getElementById('sanda-round-title').innerText = `DESCANSO`;
    document.getElementById('sanda-level-badge').innerText = `Recuperación (1:00 min)`;
    updateTimerDisplay();
    toggleTimer();
}

function nextRound() {
    clearInterval(timerInterval);
    timerInterval = null;
    isResting = false;
    currentRound = currentRound < 3 ? currentRound + 1 : 1;
    secondsLeft = currentMatchLevel === "NOVEL" ? 90 : 120;
    
    document.getElementById('sanda-round-title').innerText = `ASALTO ${currentRound} / 3`;
    document.getElementById('sanda-level-badge').innerText = `Nivel ${currentMatchLevel} (${currentMatchLevel === "NOVEL" ? "1:30" : "2:00"} min)`;
    
    updateTimerDisplay();
    document.getElementById('timer-btn').innerHTML = `<i class="fa-solid fa-play"></i>`;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isResting = false;
    currentRound = 1;
    secondsLeft = currentMatchLevel === "NOVEL" ? 90 : 120;
    
    document.getElementById('sanda-round-title').innerText = `ASALTO 1 / 3`;
    document.getElementById('sanda-level-badge').innerText = `Nivel ${currentMatchLevel} (${currentMatchLevel === "NOVEL" ? "1:30" : "2:00"} min)`;
    
    updateRoundCirclesFromSheets();
    updateTimerDisplay();
    document.getElementById('timer-btn').innerHTML = `<i class="fa-solid fa-play"></i>`;
}

function updateTimerDisplay() {
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const s = String(secondsLeft % 60).padStart(2, '0');
    document.getElementById('sanda-timer').innerText = `${m}:${s}`;
}

// ==========================================
// MÓDULO TAOLU Y MEDALLERO (CON SELECT DE FILTROS)
// ==========================================
function renderTaoluGroups(data) {
    const container = document.getElementById('taolu-groups-container');
    const selectContainer = document.getElementById('taolu-group-select');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">No hay registros de Taolu disponibles.</p>`;
        return;
    }

    const groups = {};
    data.forEach(row => {
        const armas = row.Armas || row.armas || "Mano Libre";
        const nivel = row.Nivel || row.nivel || "Avanzado";
        const genero = row.Genero || row.genero || "General";
        const nombreForma = row.Nombre_Forma || row.nombre_forma || "Rutina General";
        const codigoForma = row.Codigo_Forma || row.codigo_forma || "GEN";

        const grupoKey = `${armas} - ${nivel} ${genero} - ${nombreForma} (${codigoForma})`;
        if (!groups[grupoKey]) groups[grupoKey] = [];
        groups[grupoKey].push(row);
    });

    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => Number(a.Orden_Salida || a.orden_salida || 99) - Number(b.Orden_Salida || b.orden_salida || 99));
    });

    let selectHtml = `<option value="ALL">Todos los Grupos (${data.length} Participantes)</option>`;
    let htmlContent = '';

    Object.keys(groups).forEach((grupoName, idx) => {
        const athletes = groups[grupoName];
        const safeId = `group-${idx}`;

        selectHtml += `<option value="${safeId}">${grupoName} (${athletes.length})</option>`;

        htmlContent += `
            <div class="taolu-group-card space-y-3 bg-white/95 text-slate-900 p-5 rounded-2xl shadow-xl border border-slate-300" data-groupid="${safeId}">
                <div class="bg-slate-900 text-white px-4 py-3 rounded-xl flex justify-between items-center shadow">
                    <h4 class="font-black text-xs md:text-sm uppercase tracking-wide text-mmcGold"><i class="fa-solid fa-khanda mr-2"></i> ${grupoName}</h4>
                    <span class="text-xs bg-slate-800 text-mmcGold font-bold px-3 py-1 rounded-full border border-slate-700">${athletes.length} Participantes</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-700 uppercase text-[10px] border-b border-slate-300 font-extrabold">
                            <tr>
                                <th class="py-3 px-3">Orden</th>
                                <th class="py-3 px-3">Deportista</th>
                                <th class="py-3 px-3">Escuela</th>
                                <th class="py-3 px-3 text-center">Género / Nivel</th>
                                <th class="py-3 px-3 text-center">Estado</th>
                                <th class="py-3 px-3 text-right">Puntaje Final</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            ${athletes.map(row => {
                                const nombre = row.Nombre_Completo || row.nombre_completo || "Competidor";
                                const escuela = row.Siglas_Escuela || row.siglas_escuela || "MMC";
                                const nombreEscuela = row.Nombre_Escuela || row.nombre_escuela || "Master Martial Combat";
                                const genero = row.Genero || row.genero || "";
                                const nivel = row.Nivel || row.nivel || "";
                                const puntaje = row.Puntaje_Final || row.puntaje_final || "0.00";
                                const estado = row.Estado || row.estado || "PENDIENTE";
                                const orden = row.Orden_Salida || row.orden_salida || "-";
                                const fotoUrl = convertToDirectDriveUrl(row.URL_Foto || row.url_foto || "");
                                const logoEscuelaUrl = convertToDirectDriveUrl(row.URL_Logo || row.url_logo || "");

                                return `
                                    <tr onclick="selectTaoluAtleta('${nombre}', '${grupoName}', '${puntaje}', '${fotoUrl}', '${escuela}', '${nombreEscuela}', '${logoEscuelaUrl}')" class="hover:bg-slate-100 cursor-pointer transition font-medium">
                                        <td class="py-3.5 px-3 font-extrabold text-amber-700">${orden}</td>
                                        <td class="py-3.5 px-3 font-bold text-slate-900 flex items-center space-x-2.5">
                                            ${fotoUrl ? `<img src="${fotoUrl}" class="w-8 h-8 rounded-full object-cover border border-mmcGold shadow">` : `<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600"><i class="fa-solid fa-user"></i></div>`}
                                            <span>${nombre}</span>
                                        </td>
                                        <td class="py-3.5 px-3 text-slate-700 font-bold text-xs">${escuela}</td>
                                        <td class="py-3.5 px-3 text-center text-xs text-slate-600">${genero} / ${nivel}</td>
                                        <td class="py-3.5 px-3 text-center">
                                            <span class="px-2.5 py-1 rounded text-[10px] font-black ${estado === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                                                ${estado}
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-3 text-right font-black text-amber-700 text-base">${puntaje}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    if (selectContainer) selectContainer.innerHTML = selectHtml;
    container.innerHTML = htmlContent;
}

function filterTaoluGroup(groupId) {
    document.querySelectorAll('.taolu-group-card').forEach(card => {
        if (groupId === 'ALL' || card.getAttribute('data-groupid') === groupId) card.style.display = 'block';
        else card.style.display = 'none';
    });
}

function selectTaoluAtleta(nombre, grupo, puntaje, fotoUrl, siglasEscuela, nombreEscuela, logoEscuelaUrl) {
    document.getElementById('taolu-selected-name').innerText = nombre || "Competidor";
    document.getElementById('taolu-selected-forma').innerText = grupo || "---";
    document.getElementById('taolu-selected-score').innerText = puntaje || "0.00";
    document.getElementById('taolu-selected-siglas').innerText = siglasEscuela || "MMC";
    document.getElementById('taolu-selected-inst').innerText = nombreEscuela || "Master Martial Combat";
    
    const avatarContainer = document.getElementById('taolu-avatar-container');
    if (avatarContainer) {
        avatarContainer.innerHTML = fotoUrl ? `<img src="${fotoUrl}" class="w-full h-full object-cover object-top">` : `<i class="fa-solid fa-user text-4xl text-gray-600"></i>`;
    }

    const schoolLogoContainer = document.getElementById('taolu-school-logo');
    if (schoolLogoContainer) {
        schoolLogoContainer.innerHTML = logoEscuelaUrl ? `<img src="${logoEscuelaUrl}" class="w-full h-full object-contain">` : `<i class="fa-solid fa-graduation-cap text-xs text-mmcGold"></i>`;
    }
}

function renderMedallero(data) {
    const container = document.getElementById('medallero-table-container');
    if (!container) return;

    const totals = {};
    data.forEach(row => {
        const esc = row.Nombre_Escuela || row.nombre_escuela || 'Independiente';
        if (!totals[esc]) totals[esc] = { esc, oro: 0, plata: 0, bronce: 0, puntos: 0 };
        if (row.ID_Puesto === 'M-1') totals[esc].oro += 1;
        if (row.ID_Puesto === 'M-2') totals[esc].plata += 1;
        if (row.ID_Puesto === 'M-3') totals[esc].bronce += 1;
        totals[esc].puntos += Number(row.Puntaje) || 0;
    });

    const sorted = Object.values(totals).sort((a, b) => b.puntos - a.puntos);

    container.innerHTML = `
        <table class="w-full text-left text-sm">
            <thead class="bg-slate-900 text-gray-400 uppercase text-[11px] border-b border-mmcBorder">
                <tr>
                    <th class="py-3 px-4">#</th>
                    <th class="py-3 px-4">Institución</th>
                    <th class="py-3 px-4 text-center text-yellow-400">Oro</th>
                    <th class="py-3 px-4 text-center text-gray-300">Plata</th>
                    <th class="py-3 px-4 text-center text-amber-600">Bronce</th>
                    <th class="py-3 px-4 text-right">Puntaje</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-mmcBorder">
                ${sorted.map((item, idx) => `
                    <tr class="hover:bg-slate-800/50 transition">
                        <td class="py-3 px-4 font-bold text-mmcGold">${idx + 1}</td>
                        <td class="py-3 px-4 font-bold text-white">${item.esc}</td>
                        <td class="py-3 px-4 text-center font-bold text-yellow-400">${item.oro}</td>
                        <td class="py-3 px-4 text-center font-bold text-gray-300">${item.plata}</td>
                        <td class="py-3 px-4 text-center font-bold text-amber-600">${item.bronce}</td>
                        <td class="py-3 px-4 text-right font-black text-mmcGold">${item.puntos} pts</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}