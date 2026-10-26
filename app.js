const API_URL = "https://script.google.com/macros/s/AKfycbyW2_C7am9z6ej2gwAmxWUj2vwDwe67zA7ZvYb0BxdJah6ajl0Lv0OzQ5UFKm3V0ru0ZA/exec"; // Reemplaza con tu URL real

let championshipData = [];
let medalleroData = [];

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-mmcGold', 'bg-mmcBorder/50');
        btn.classList.add('text-gray-300');
    });
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) {
        activeNav.classList.add('text-mmcGold', 'bg-mmcBorder/50');
    }
}

async function loadAllData() {
    try {
        const resChamp = await fetch(`${API_URL}?sheet=Championship`);
        championshipData = await resChamp.json();
        renderChampionships(championshipData);

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
        container.innerHTML = `<p class="text-gray-400 col-span-full">No se encontraron campeonatos registrados en el Excel.</p>`;
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="bg-mmcCard border border-mmcBorder hover:border-mmcGold transition rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
            <div class="space-y-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">${item.Estado_Competencia || 'EN CURSO'}</span>
                <h4 class="text-lg font-black text-white">${item.Nombre_Campeonato}</h4>
                <p class="text-xs text-gray-400 flex items-center"><i class="fa-solid fa-location-dot mr-1 text-mmcGold"></i> ${item.Sede || 'Lima, Perú'}</p>
            </div>
            <button onclick="switchView('sanda')" class="w-full bg-mmcGold hover:bg-yellow-500 text-black font-black py-2 rounded-lg text-xs uppercase tracking-wider transition shadow">
                ENTRAR A LA COMPETENCIA <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
        </div>
    `).join('');
}

function renderMedallero(data) {
    const container = document.getElementById('medallero-table-container');
    if (!container) return;

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
        btn.innerHTML = `<i class="fa-solid fa-play mr-1"></i> Reanudar`;
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
        btn.innerHTML = `<i class="fa-solid fa-pause mr-1"></i> Pausar`;
    }
}
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    seconds = 120;
    document.getElementById('sanda-timer').innerText = `02:00`;
    document.getElementById('timer-btn').innerHTML = `<i class="fa-solid fa-play mr-1"></i> Iniciar`;
}

document.addEventListener('DOMContentLoaded', loadAllData);