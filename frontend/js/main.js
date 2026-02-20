const API_BASE_URL = ''; // Now served by Flask directly

let isProcessing = false;

// Prediction Form Handling
const predictForm = document.getElementById('predictForm');
if (predictForm) {
    predictForm.onsubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isProcessing) return;

        const submitBtn = predictForm.querySelector('button[type="submit"]');
        const submitBtnText = submitBtn.innerHTML;

        try {
            isProcessing = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="animate-pulse">Processing...</span>`;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

            const errorMsg = document.getElementById('errorMsg');
            const loading = document.getElementById('loading');
            const placeholder = document.getElementById('placeholder');
            const resultCard = document.getElementById('resultCard');

            errorMsg.classList.add('hidden');
            loading.classList.remove('hidden');
            placeholder.style.display = 'none';
            resultCard.style.display = 'none';

            const formData = new FormData(predictForm);
            const data = {
                pm25: parseFloat(formData.get('pm25')) || 0,
                pm10: parseFloat(formData.get('pm10')) || 0,
                no2: parseFloat(formData.get('no2')) || 0,
                so2: parseFloat(formData.get('so2')) || 0,
                co: parseFloat(formData.get('co')) || 0,
                o3: parseFloat(formData.get('o3')) || 0
            };

            console.log("Analyzing data:", data);

            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || `Server Error (${response.status})`);

            console.log("AI Result:", result);

            // Robust History Deduplication
            const history = JSON.parse(localStorage.getItem('aqi_history') || '[]');

            // Allow entry only if it's different from the very last one, OR if 2 seconds have passed since the last one
            const lastEntry = history[0];
            const isLiteralDuplicate = lastEntry &&
                JSON.stringify(lastEntry.data) === JSON.stringify(data) &&
                Math.abs(lastEntry.aqi - result.aqi) < 0.01;

            if (!isLiteralDuplicate) {
                history.unshift({
                    date: new Date().toLocaleTimeString(),
                    aqi: result.aqi,
                    category: result.category,
                    data: data,
                    id: Date.now() // Unique ID for each entry
                });
                localStorage.setItem('aqi_history', JSON.stringify(history.slice(0, 10)));
            }

            displayResult(result);

        } catch (error) {
            console.error("Critical Failure:", error);
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.innerText = `System Alert: ${error.message}`;
            errorMsg.classList.remove('hidden');
            document.getElementById('placeholder').style.display = 'flex';
        } finally {
            document.getElementById('loading').classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtnText;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            setTimeout(() => { isProcessing = false; }, 500); // Small cooldown
        }
    };
}

function displayResult(result) {
    const resultCard = document.getElementById('resultCard');
    const aqiValue = document.getElementById('aqiValue');
    const aqiCategory = document.getElementById('aqiCategory');
    const healthAdvice = document.getElementById('healthAdvice');
    const badge = document.getElementById('badge');

    aqiValue.innerText = result.aqi;
    aqiCategory.innerText = result.category;
    healthAdvice.innerText = result.health_advice;

    // Category styling
    let color = '#39ff14'; // Default green
    let borderClass = 'border-green-500';
    let badgeClass = 'bg-green-500/20 text-green-400';

    if (result.aqi > 50 && result.aqi <= 100) {
        color = '#facc15';
        borderClass = 'border-yellow-400';
        badgeClass = 'bg-yellow-400/20 text-yellow-400';
    } else if (result.aqi > 100 && result.aqi <= 200) {
        color = '#fb923c';
        borderClass = 'border-orange-400';
        badgeClass = 'bg-orange-400/20 text-orange-400';
    } else if (result.aqi > 200 && result.aqi <= 300) {
        color = '#ef4444';
        borderClass = 'border-red-500';
        badgeClass = 'bg-red-500/20 text-red-400';
    } else if (result.aqi > 300) {
        color = '#7c3aed';
        borderClass = 'border-purple-600';
        badgeClass = 'bg-purple-600/20 text-purple-400';
    }

    resultCard.className = `result-card glass p-10 h-full border-t-8 ${borderClass}`;
    resultCard.style.display = 'block';
    badge.className = `px-4 py-2 rounded-full font-bold uppercase text-xs tracking-wider ${badgeClass}`;
    badge.innerText = result.category;

    AOS.refresh();
}

// Dashboard Logic
function initDashboard() {
    const history = JSON.parse(localStorage.getItem('aqi_history') || '[]');
    const historyBody = document.getElementById('historyBody');

    if (historyBody) {
        if (history.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">No predictions recorded yet.</td></tr>';
        } else {
            historyBody.innerHTML = history.map(item => `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4">${item.date}</td>
                    <td class="p-4 font-bold text-cyan-400">${item.aqi}</td>
                    <td class="p-4"><span class="px-2 py-1 rounded text-xs bg-white/10">${item.category}</span></td>
                </tr>
            `).join('');
        }
    }

    // Chart.js - Small demo chart if data exists
    const ctx = document.getElementById('pollutantChart');
    if (ctx && history.length > 0) {
        const last = history[0].data;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'],
                datasets: [{
                    label: 'Pollutant Concentration',
                    data: [last.pm25, last.pm10, last.no2, last.so2, last.co, last.o3],
                    backgroundColor: [
                        'rgba(0, 210, 255, 0.5)',
                        'rgba(57, 255, 20, 0.5)',
                        'rgba(250, 204, 21, 0.5)',
                        'rgba(251, 146, 60, 0.5)',
                        'rgba(239, 68, 68, 0.5)',
                        'rgba(124, 58, 237, 0.5)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

function clearHistory() {
    if (confirm("Are you sure you want to clear your prediction history?")) {
        localStorage.removeItem('aqi_history');
        initDashboard();
        // Update stats if on dashboard
        const totalScans = document.getElementById('totalScans');
        const avgAQI = document.getElementById('avgAQI');
        if (totalScans) totalScans.innerText = '0';
        if (avgAQI) avgAQI.innerText = '0.0';
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);
