// URL de tu API pública creada en Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbylxWsXimLL0e9i3xGt4iME2IaLNvAHZ_9G1IupFkoprMi608c3jQ1z-lox50X6aD5wVQ/exec";

let championshipData = [];
let sandaData = [];
let taoluData = [];
let medalleroData = [];

// Manejador de Navegación entre Vistas
function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    // Cambiar estado visual de botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-mmcGold', 'bg-mmcBorder/50');
        btn.classList.add('text-gray-300');
    });
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) {
        activeNav.classList.add('text-mmcGold', 'bg-mmcBorder/50');
    }
}

// Cargar Datos Iniciales de Google Sheets
async function loadAllData() {
    try {
        // Cargar Campeonato Activo
        const resChamp = await fetch(`${API_URL}?sheet=Championship`);
        championshipData = await resChamp.json();
        renderChampionships(championshipData);

        // Cargar Datos de Sanda
        const resSanda = await fetch(`${API_URL}?sheet=Sanda`);
        sandaData = await resSanda.json();
        renderSandaBrackets(sandaData);

        // Cargar Datos de Taolu
        const resTaolu = await fetch(`${API_URL}?sheet=Taolu`);
        taoluData = await resTaolu.json();
        renderTaoluList(taoluData);

        // Cargar Medallero
        const resMedallero = await fetch(`${API_URL}?sheet=Medallero`);
        medalleroData = await resMedallero.json();
        renderMedallero(medalleroData);

    } catch (err) {
        console.error("Error cargando los datos de MMC:", err);
    }
}

// Renderizar Tarjetas de Campeonatos
function renderChampionships(data) {
    const container = document.getElementById('championships-grid');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-gray-400">No hay eventos registrados actualmente.</p>`;
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="bg-mmcCard border border-mmcBorder hover:border-mmcGold transition rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg group">
            <div class="space-y-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">${item.Estado_Competencia || 'REGISTRADO'}</span>
                <h4 class="text-xl font-extrabold text-white group-hover:text-mmcGold transition">${item.Nombre_Campeonato}</h4>
                <p class="text-xs text-gray-400 flex items-center"><i class="fa-solid fa-location-dot mr-1 text-mmcGold"></i> ${item.Sede || 'Por confirmar'}</p>
            </div>
            <button onclick="switchView('sanda')" class="w-full bg-mmcGold hover:bg-yellow-500 text-black font-extrabold py-2 rounded-lg text-xs uppercase tracking-wider transition">
                Ingresar a la Competencia <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
        </div>
    `).join('');
}

// Renderizar Tabla de Medallero
function renderMedallero(data) {
    const container = document.getElementById('medallero-table-container');
    if (!container) return;

    // Agrupar por Escuela y calcular totales
    const totals = {};
    data.forEach(row => {
        const esc = row.Nombre_Escuela || 'Independiente';
        if (!totals[esc]) totals[esc] = { esc, oro: 0, plata: 0, bronce: 0, puntos: 0 };
        if (row.ID_Puesto === 'M-1') totals[esc].oro += 1;
        if (row.ID_Puesto === 'M-2') totals[esc].plata += 1;
        if (row.ID_Puesto === 'M-3') totals[esc].bronce += 1;
        totals[esc].puntos += Number(row.Puntaje) || 0;
    });

    const sorted = Object.values(totals).sort((a, b) => b.puntos - a.puntos);

    container.innerHTML = `
        <table class="w-full text-left text-sm">
            <thead class="bg-slate-900/80 text-gray-400 uppercase text-[11px] border-b border-mmcBorder">
                <tr>
                    <th class="py-3 px-4">#</th>
                    <th class="py-3 px-4">Escuela / Institución</th>
                    <th class="py-3 px-4 text-center text-yellow-400"><i class="fa-solid fa-circle"></i> Oro</th>
                    <th class="py-3 px-4 text-center text-gray-300"><i class="fa-solid fa-circle"></i> Plata</th>
                    <th class="py-3 px-4 text-center text-amber-600"><i class="fa-solid fa-circle"></i> Bronce</th>
                    <th class="py-3 px-4 text-right">Puntaje Total</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-mmcBorder">
                ${sorted.map((item, index) => `
                    <tr class="hover:bg-slate-800/40 transition">
                        <td class="py-3 px-4 font-bold ${index === 0 ? 'text-mmcGold' : 'text-gray-400'}">${index + 1}</td>
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

// Cronómetro Interactivo Sanda
let timerInterval = null;
let seconds = 120;

function toggleTimer() {
    const btn = document.getElementById('timer-btn');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.innerHTML = `<i class="fa-solid fa-play mr-1"></i> Reanudar`;
    } else {
        timerInterval = setInterval(() => {
            if (seconds > 0) {
                seconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                alert("¡Tiempo finalizado!");
            }
        }, 1000);
        btn.innerHTML = `<i class="fa-solid fa-pause mr-1"></i> Pausar`;
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    seconds = 120;
    updateTimerDisplay();
    document.getElementById('timer-btn').innerHTML = `<i class="fa-solid fa-play mr-1"></i> Iniciar`;
}

function updateTimerDisplay() {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    document.getElementById('sanda-timer').innerText = `${m}:${s}`;
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});