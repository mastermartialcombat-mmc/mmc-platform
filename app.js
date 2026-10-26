const API_URL = "https://script.google.com/macros/s/AKfycbyW2_C7am9z6ej2gwAmxWUj2vwDwe67zA7ZvYb0BxdJah6ajl0Lv0OzQ5UFKm3V0ru0ZA/exec"; // Recuerda poner tu URL real de Apps Script

// URL del Logo oficial proporcionado por Marycielo
const LOGO_DRIVE_URL = "https://drive.google.com/file/d/1EM8MEbYssMssn1NKQfAIqA6n3Fvr1Zrb/view?usp=drive_link";

let championshipData = [];
let taoluData = [];
let medalleroData = [];

// Convertidor automático de enlaces de Google Drive para imágenes directas
function convertToDirectDriveUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// Cargar Logo al iniciar
document.addEventListener('DOMContentLoaded', () => {
    const logoImg = document.getElementById('nav-logo');
    if (logoImg) {
        logoImg.src = convertToDirectDriveUrl(LOGO_DRIVE_URL);
    }
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
        container.innerHTML = `<p class="text-gray-400 col-span-full">No se encontraron campeonatos en el Excel.</p>`;
        return;
    }

    container.innerHTML = data.map(item => {
        const nombre = item.Nombre_Campeonato || item.nombre_campeonato || "Campeonato Wushu";
        const sede = item.Sede || item.sede || "Lima, Perú";
        const estado = item.Estado_Competencia || item.estado_competencia || "EN CURSO";

        return `
            <div class="bg-mmcCard border border-mmcBorder hover:border-mmcGold transition rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
                <div class="space-y-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">${estado}</span>
                    <h4 class="text-lg font-black text-white">${nombre}</h4>
                    <p class="text-xs text-gray-400 flex items-center"><i class="fa-solid fa-location-dot mr-1 text-mmcGold"></i> ${sede}</p>
                </div>
                <button onclick="switchView('sanda')" class="w-full bg-mmcGold hover:bg-yellow-500 text-black font-black py-2 rounded-lg text-xs uppercase tracking-wider transition shadow">
                    ENTRAR A LA COMPETENCIA <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Renderizar Taolu dividido por Grupos y Formas
function renderTaoluGroups(data) {
    const container = document.getElementById('taolu-groups-container');
    const filtersContainer = document.getElementById('taolu-groups-filters');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">No hay registros de Taolu disponibles.</p>`;
        return;
    }

    // Agrupar por Forma y Código
    const groups = {};
    data.forEach(row => {
        const forma = row.Nombre_Forma || row.nombre_forma || "Rutina General";
        const codigo = row.Codigo_Forma || row.codigo_forma || "GEN";
        const grupoKey = `${forma} [${codigo}]`;
        
        if (!groups[grupoKey]) groups[grupoKey] = [];
        groups[grupoKey].push(row);
    });

    // Ordenar deportistas dentro de cada grupo por Orden de Salida
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => {
            const ordenA = Number(a.Orden_Salida || a.orden_salida || 99);
            const ordenB = Number(b.Orden_Salida || b.orden_salida || 99);
            return ordenA - ordenB;
        });
    });

    // Renderizar botones de filtro y tablas por grupo
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
    const cards = document.querySelectorAll('.taolu-group-card');
    cards.forEach(card => {
        if (groupId === 'ALL' || card.getAttribute('data-groupid') === groupId) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function selectTaoluAtleta(nombre, grupo, puntaje, fotoUrl) {
    document.getElementById('taolu-selected-name').innerText = nombre;
    document.getElementById('taolu-selected-forma').innerText = grupo;
    document.getElementById('taolu-selected-score').innerText = puntaje;
    
    const avatarContainer = document.getElementById('taolu-avatar-container');
    if (avatarContainer) {
        if (fotoUrl) {
            avatarContainer.innerHTML = `<img src="${fotoUrl}" class="w-full h-full object-cover">`;
        } else {
            avatarContainer.innerHTML = `<i class="fa-solid fa-user text-2xl text-gray-500"></i>`;
        }
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

let timerInterval = null;
let seconds = 120;
function toggleTimer() {
    const btn = document.getElementById('timer-btn');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.innerText = "Iniciar";
    } else {
        timerInterval = setInterval(() => {
            if (seconds > 0) {
                seconds--;
                const m = String(Math.floor(seconds / 60)).padStart(2, '0');
                const s = String(seconds % 60).padStart(2, '0');
                document.getElementById('sanda-timer').innerText = `${m}:${s}`;
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }, 1000);
        btn.innerText = "Pausar";
    }
}
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    seconds = 120;
    document.getElementById('sanda-timer').innerText = `02:00`;
    document.getElementById('timer-btn').innerText = "Iniciar";
}