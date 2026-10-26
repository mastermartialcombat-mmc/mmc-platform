const API_URL = "https://script.google.com/macros/s/AKfycbyW2_C7am9z6ej2gwAmxWUj2vwDwe67zA7ZvYb0BxdJah6ajl0Lv0OzQ5UFKm3V0ru0ZA/exec"; // Recuerda mantener tu URL real de Apps Script
const LOGO_DRIVE_URL = "https://drive.google.com/file/d/1EM8MEbYssMssn1NKQfAIqA6n3Fvr1Zrb/view?usp=drive_link";

const FONDO_ROJA_URL = "https://drive.google.com/file/d/19XJR7ZobDCXDTe8S3Dsq3EF50emXlz_Q/view?usp=drive_link";
const FONDO_AZUL_URL = "https://drive.google.com/file/d/1DbdswRma_oWAwc_FrKvDfV3LHiO8tFjV/view?usp=drive_link";

let championshipData = [];
let sandaData = [];
let llavesSandaData = [];
let taoluData = [];
let medalleroData = [];
let currentActiveLlave = null;
let currentCategoryFiltered = "";

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

// ==========================================
// MÓDULO SANSHOU
// ==========================================
let currentMatchLevel = "AVANZADO"; 
let timerInterval = null;
let secondsLeft = 120;
let currentRound = 1;
let isResting = false;

function initSandaModule(data, llavesData) {
    const filtersContainer = document.getElementById('sanda-category-filters');
    if (!filtersContainer) return;

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
        filtersContainer.innerHTML = `<span class="text-xs text-gray-400">No hay categorías configuradas.</span>`;
        return;
    }

    filtersContainer.innerHTML = catKeys.map((cat, idx) => `
        <button onclick="filterSandaCategory('${cat}')" id="cat-btn-${idx}" class="sanda-cat-btn px-3 py-1.5 rounded-lg text-xs font-bold ${idx === 0 ? 'bg-mmcGold text-black' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'} transition">
            ${cat}
        </button>
    `).join('');

    filterSandaCategory(catKeys[0]);
}

function filterSandaCategory(categoryName) {
    currentCategoryFiltered = categoryName;
    document.querySelectorAll('.sanda-cat-btn').forEach(btn => {
        if (btn.innerText.trim() === categoryName) {
            btn.className = "sanda-cat-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-mmcGold text-black transition";
        } else {
            btn.className = "sanda-cat-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-gray-300 hover:bg-slate-700 transition";
        }
    });

    document.getElementById('bracket-category-title').innerText = categoryName;
    document.getElementById('bracket-subtitle-info').innerText = `Sanshou • Categoría: ${categoryName} • Eliminación Directa`;

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

    renderTournamentBrackets(filtered, llavesSandaData);
    renderMatchesList(filtered);
}

function renderTournamentBrackets(filteredFighters, llavesData) {
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
        container.innerHTML = `<p class="text-xs text-gray-400 col-span-full">No hay llaves para esta categoría.</p>`;
        return;
    }

    container.innerHTML = llaveKeys.map(llaveId => {
        const fighters = pairs[llaveId];
        const r = fighters.find(f => (f.Color || f.color || "").toUpperCase() === "ROJO") || fighters[0] || {};
        const b = fighters.find(f => (f.Color || f.color || "").toUpperCase() === "AZUL") || fighters[1] || {};

        const llaveRow = llavesData.find(row => (row.ID_Llave_Sanda || row.id_llave_sanda) === llaveId);
        const estadoLlave = llaveRow ? (llaveRow.Estado || llaveRow.estado || "Pendiente") : "Pendiente";

        const redName = r.Nombre_Completo || r.nombre_completo || "Por definir";
        const blueName = b.Nombre_Completo || b.nombre_completo || "Por definir";

        const redObj = {
            name: redName,
            siglas: r.Siglas || r.siglas || "MMC",
            inst: r.Nombre_Escuela || r.nombre_escuela || r.Institucion || r.institucion || "Master Martial Combat",
            photo: convertToDirectDriveUrl(r.URL_Foto || r.url_foto || ""),
            logo: convertToDirectDriveUrl(r.URL_Logo || r.url_logo || "")
        };

        const blueObj = {
            name: blueName,
            siglas: b.Siglas || b.siglas || "UPCH",
            inst: b.Nombre_Escuela || b.nombre_escuela || b.Institucion || b.institucion || "Universidad Peruana Cayetano Heredia",
            photo: convertToDirectDriveUrl(b.URL_Foto || b.url_foto || ""),
            logo: convertToDirectDriveUrl(b.URL_Logo || b.url_logo || "")
        };

        return `
            <div onclick='selectSandaMatch(${JSON.stringify(redObj)}, ${JSON.stringify(blueObj)}, ${JSON.stringify(llaveId)})' class="bg-black/40 border border-mmcBorder hover:border-mmcGold cursor-pointer rounded-xl overflow-hidden shadow-xl transition space-y-0">
                <!-- Cuadro Oscuro Superior con Número/Código de Llave (Estilo Referencia) -->
                <div class="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-mmcBorder">
                    <span class="bg-slate-950 text-white font-mono text-xs font-black px-2.5 py-1 rounded border border-slate-700 shadow-inner">${llaveId}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded ${estadoLlave === 'FINALIZADO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">${estadoLlave}</span>
                </div>
                
                <!-- Tarjeta de Contendientes (Rojo Arriba, Azul Abajo) -->
                <div class="p-3 space-y-1.5">
                    <div class="flex justify-between items-center bg-red-950/40 px-3 py-2 rounded-lg border-l-4 border-red-600">
                        <span class="font-bold text-xs text-white truncate">${redName}</span>
                        <span class="text-[9px] font-black text-red-400 uppercase tracking-wider">ROJO</span>
                    </div>
                    <div class="flex justify-between items-center bg-blue-950/40 px-3 py-2 rounded-lg border-l-4 border-blue-600">
                        <span class="font-bold text-xs text-white truncate">${blueName}</span>
                        <span class="text-[9px] font-black text-blue-400 uppercase tracking-wider">AZUL</span>
                    </div>
                </div>

                <div class="px-3 pb-3">
                    <button class="w-full bg-slate-800 hover:bg-slate-700 text-mmcGold text-[10px] font-bold py-1.5 rounded uppercase tracking-wider transition">
                        Cargar en Marcador En Vivo
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderMatchesList(filtered) {
    const matchesContainer = document.getElementById('sanda-matches-list');
    if (!matchesContainer) return;

    const pairs = {};
    filtered.forEach(row => {
        const llave = row.ID_Llave || row.id_llave || "Combate 1";
        if (!pairs[llave]) pairs[llave] = [];
        pairs[llave].push(row);
    });

    matchesContainer.innerHTML = Object.keys(pairs).map(llaveId => {
        const fighters = pairs[llaveId];
        const r = fighters.find(f => (f.Color || f.color || "").toUpperCase() === "ROJO") || fighters[0] || {};
        const b = fighters.find(f => (f.Color || f.color || "").toUpperCase() === "AZUL") || fighters[1] || {};

        const redObj = {
            name: r.Nombre_Completo || r.nombre_completo || "Esquina Roja",
            siglas: r.Siglas || r.siglas || "MMC",
            inst: r.Nombre_Escuela || r.nombre_escuela || r.Institucion || r.institucion || "Master Martial Combat",
            photo: convertToDirectDriveUrl(r.URL_Foto || r.url_foto || ""),
            logo: convertToDirectDriveUrl(r.URL_Logo || r.url_logo || "")
        };

        const blueObj = {
            name: b.Nombre_Completo || b.nombre_completo || "Esquina Azul",
            siglas: b.Siglas || b.siglas || "UPCH",
            inst: b.Nombre_Escuela || b.nombre_escuela || b.Institucion || b.institucion || "Universidad Peruana Cayetano Heredia",
            photo: convertToDirectDriveUrl(b.URL_Foto || b.url_foto || ""),
            logo: convertToDirectDriveUrl(b.URL_Logo || b.url_logo || "")
        };

        return `
            <div onclick='selectSandaMatch(${JSON.stringify(redObj)}, ${JSON.stringify(blueObj)}, ${JSON.stringify(llaveId)})' class="bg-slate-900 border border-mmcBorder hover:border-mmcGold cursor-pointer rounded-xl p-4 transition space-y-3 shadow-md">
                <div class="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                    <span>LLAVE: ${llaveId}</span>
                    <span class="text-mmcGold">${currentCategoryFiltered}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center text-xs">
                    <div class="bg-red-950/30 p-2 rounded border border-red-600/20 truncate">
                        <span class="text-red-400 font-bold block text-[9px]">ROJO</span>
                        <span class="text-white font-semibold truncate block">${redObj.name}</span>
                    </div>
                    <div class="bg-blue-950/30 p-2 rounded border border-blue-600/20 truncate">
                        <span class="text-blue-400 font-bold block text-[9px]">AZUL</span>
                        <span class="text-white font-semibold truncate block">${blueObj.name}</span>
                    </div>
                </div>
                <button class="w-full bg-slate-800 hover:bg-slate-700 text-mmcGold text-[11px] font-bold py-1.5 rounded uppercase transition">
                    Cargar en Marcador En Vivo
                </button>
            </div>
        `;
    }).join('');

    if (Object.keys(pairs).length > 0) {
        const firstKey = Object.keys(pairs)[0];
        const firstPair = pairs[firstKey];
        const r = firstPair.find(f => (f.Color || f.color || "").toUpperCase() === "ROJO") || firstPair[0] || {};
        const b = firstPair.find(f => (f.Color || f.color || "").toUpperCase() === "AZUL") || firstPair[1] || {};

        selectSandaMatch({
            name: r.Nombre_Completo || r.nombre_completo || "Esquina Roja",
            siglas: r.Siglas || r.siglas || "MMC",
            inst: r.Nombre_Escuela || r.nombre_escuela || r.Institucion || r.institucion || "Master Martial Combat",
            photo: convertToDirectDriveUrl(r.URL_Foto || r.url_foto || ""),
            logo: convertToDirectDriveUrl(r.URL_Logo || r.url_logo || "")
        }, {
            name: b.Nombre_Completo || b.nombre_completo || "Esquina Azul",
            siglas: b.Siglas || b.siglas || "UPCH",
            inst: b.Nombre_Escuela || b.nombre_escuela || b.Institucion || b.institucion || "Universidad Peruana Cayetano Heredia",
            photo: convertToDirectDriveUrl(b.URL_Foto || b.url_foto || ""),
            logo: convertToDirectDriveUrl(b.URL_Logo || b.url_logo || "")
        }, firstKey);
    }
}

function selectSandaMatch(red, blue, llaveId) {
    currentActiveLlave = llaveId;
    document.getElementById('sanda-red-fullname').innerText = red.name;
    document.getElementById('sanda-red-siglas').innerText = red.siglas;
    document.getElementById('sanda-red-inst').innerText = red.inst;

    const redPhotoBox = document.getElementById('sanda-red-photo-container');
    if (redPhotoBox) {
        redPhotoBox.innerHTML = red.photo ? `<img src="${red.photo}" class="w-full h-full object-cover object-top">` : `<i class="fa-solid fa-user text-6xl text-gray-600 absolute inset-0 m-auto w-fit h-fit"></i>`;
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
        bluePhotoBox.innerHTML = blue.photo ? `<img src="${blue.photo}" class="w-full h-full object-cover object-top">` : `<i class="fa-solid fa-user text-6xl text-gray-600 absolute inset-0 m-auto w-fit h-fit"></i>`;
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
        alert("¡Datos y puntajes de rounds actualizados desde Google Sheets!");
    } catch (e) {
        console.error("Error al sincronizar datos:", e);
    }
}

function updateRoundCirclesFromSheets() {
    if (!currentActiveLlave) return;
    const llaveRow = llavesSandaData.find(row => (row.ID_Llave_Sanda || row.id_llave_sanda) === currentActiveLlave);

    const r1Winner = llaveRow ? (llaveRow.Round1 || llaveRow.round1 || "-") : "-";
    const r2Winner = llaveRow ? (llaveRow.Round2 || llaveRow.round2 || "-") : "-";
    const r3Winner = llaveRow ? (llaveRow.Round3 || llaveRow.round3 || "-") : "-";

    const r1RedScore = llaveRow ? (llaveRow.ROJO_Round1 || llaveRow.rojo_round1 || "0") : "0";
    const r1BlueScore = llaveRow ? (llaveRow.AZUL_Round1 || llaveRow.azul_round1 || "0") : "0";

    const r2RedScore = llaveRow ? (llaveRow.ROJO_Round2 || llaveRow.rojo_round2 || "0") : "0";
    const r2BlueScore = llaveRow ? (llaveRow.AZUL_Round2 || llaveRow.azul_round2 || "0") : "0";

    const r3RedScore = llaveRow ? (llaveRow.ROJO_Round3 || llaveRow.rojo_round3 || "0") : "0";
    const r3BlueScore = llaveRow ? (llaveRow.AZUL_Round3 || llaveRow.azul_round3 || "0") : "0";

    applyRoundCircleStyle(1, r1Winner, `${r1RedScore} / ${r1BlueScore}`);
    applyRoundCircleStyle(2, r2Winner, `${r2RedScore} / ${r2BlueScore}`);
    applyRoundCircleStyle(3, r3Winner, `${r3RedScore} / ${r3BlueScore}`);
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

// Cronómetro
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
// MÓDULO TAOLU Y MEDALLERO
// ==========================================
function renderTaoluGroups(data) {
    const container = document.getElementById('taolu-groups-container');
    const filtersContainer = document.getElementById('taolu-groups-filters');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">No hay registros de Taolu disponibles.</p>`;
        return;
    }

    const groups = {};
    data.forEach(row => {
        const forma = row.Nombre_Forma || row.nombre_forma || "Rutina General";
        const codigo = row.Codigo_Forma || row.codigo_forma || "GEN";
        const grupoKey = `${forma} [${codigo}]`;
        if (!groups[grupoKey]) groups[grupoKey] = [];
        groups[grupoKey].push(row);
    });

    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => Number(a.Orden_Salida || a.orden_salida || 99) - Number(b.Orden_Salida || b.orden_salida || 99));
    });

    let filterHtml = `<button onclick="filterTaoluGroup('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-mmcGold text-black transition">Todos los Grupos</button>`;
    let htmlContent = '';

    Object.keys(groups).forEach((grupoName, idx) => {
        const athletes = groups[grupoName];
        const safeId = `group-${idx}`;

        filterHtml += `<button onclick="filterTaoluGroup('${safeId}')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-gray-300 hover:bg-slate-700 transition">${grupoName}</button>`;

        htmlContent += `
            <div class="taolu-group-card space-y-3" data-groupid="${safeId}">
                <div class="bg-slate-900 px-4 py-2.5 rounded-lg border border-mmcBorder flex justify-between items-center">
                    <h4 class="font-extrabold text-sm text-mmcGold uppercase"><i class="fa-solid fa-shield-halved mr-2"></i> ${grupoName}</h4>
                    <span class="text-xs bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full">${athletes.length} Participantes</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-900/60 text-gray-400 uppercase text-[10px] border-b border-mmcBorder">
                            <tr>
                                <th class="py-2.5 px-3">Orden</th>
                                <th class="py-2.5 px-3">Deportista</th>
                                <th class="py-2.5 px-3">Escuela</th>
                                <th class="py-2.5 px-3 text-center">Género / Nivel</th>
                                <th class="py-2.5 px-3 text-center">Estado</th>
                                <th class="py-2.5 px-3 text-right">Puntaje Final</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-mmcBorder">
                            ${athletes.map(row => {
                                const nombre = row.Nombre_Completo || row.nombre_completo || "Competidor";
                                const escuela = row.Siglas_Escuela || row.siglas_escuela || "MMC";
                                const genero = row.Genero || row.genero || "";
                                const nivel = row.Nivel || row.nivel || "";
                                const puntaje = row.Puntaje_Final || row.puntaje_final || "0.00";
                                const estado = row.Estado || row.estado || "PENDIENTE";
                                const orden = row.Orden_Salida || row.orden_salida || "-";
                                const fotoUrl = convertToDirectDriveUrl(row.URL_Foto || row.url_foto || "");

                                return `
                                    <tr onclick="selectTaoluAtleta('${nombre}', '${grupoName}', '${puntaje}', '${fotoUrl}')" class="hover:bg-slate-800/60 cursor-pointer transition">
                                        <td class="py-3 px-3 font-bold text-mmcGold">${orden}</td>
                                        <td class="py-3 px-3 font-bold text-white flex items-center space-x-2">
                                            ${fotoUrl ? `<img src="${fotoUrl}" class="w-7 h-7 rounded-full object-cover border border-mmcGold">` : `<div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-gray-400"><i class="fa-solid fa-user"></i></div>`}
                                            <span>${nombre}</span>
                                        </td>
                                        <td class="py-3 px-3 text-gray-300 text-xs">${escuela}</td>
                                        <td class="py-3 px-3 text-center text-xs text-gray-400">${genero} / ${nivel}</td>
                                        <td class="py-3 px-3 text-center">
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${estado === 'FINALIZADO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                                ${estado}
                                            </span>
                                        </td>
                                        <td class="py-3 px-3 text-right font-black text-mmcGold">${puntaje}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    if (filtersContainer) filtersContainer.innerHTML = filterHtml;
    container.innerHTML = htmlContent;
}

function filterTaoluGroup(groupId) {
    document.querySelectorAll('.taolu-group-card').forEach(card => {
        if (groupId === 'ALL' || card.getAttribute('data-groupid') === groupId) card.style.display = 'block';
        else card.style.display = 'none';
    });
}

function selectTaoluAtleta(nombre, grupo, puntaje, fotoUrl) {
    document.getElementById('taolu-selected-name').innerText = nombre;
    document.getElementById('taolu-selected-forma').innerText = grupo;
    document.getElementById('taolu-selected-score').innerText = puntaje;
    
    const avatarContainer = document.getElementById('taolu-avatar-container');
    if (avatarContainer) {
        avatarContainer.innerHTML = fotoUrl ? `<img src="${fotoUrl}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-2xl text-gray-500"></i>`;
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