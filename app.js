document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const goldRateInput = document.getElementById('goldRate');
    const usdRateInput = document.getElementById('usdRate');
    const eurRateInput = document.getElementById('eurRate');
    const updateBtn = document.getElementById('updateRatesBtn');
    const lastUpdateText = document.getElementById('lastUpdate');
    
    const assetInputs = document.querySelectorAll('.asset-input');
    const nisabDisplay = document.getElementById('nisabValue');
    const netMatrahDisplay = document.getElementById('netMatrah');
    const totalZakatDisplay = document.getElementById('totalZakat');
    const statusBadge = document.getElementById('nisabStatus');

    // Constants
    const NISAB_GOLD_WEIGHT = 80.18; // Standard Nisab in grams of gold

    // Initialization
    init();

    async function init() {
        await fetchRates();
        setupListeners();
        calculateAll();
    }

    function setupListeners() {
        // Recalculate on any input change
        [goldRateInput, usdRateInput, eurRateInput].forEach(input => {
            input.addEventListener('input', calculateAll);
        });

        assetInputs.forEach(input => {
            input.addEventListener('input', calculateAll);
        });

        updateBtn.addEventListener('click', async () => {
            updateBtn.classList.add('loading');
            updateBtn.textContent = 'Güncelleniyor...';
            await fetchRates();
            calculateAll();
            updateBtn.classList.remove('loading');
            updateBtn.textContent = 'Kurları Güncelle 🔄';
        });
    }

    async function fetchRates() {
        try {
            // Using a free and open API for currency (USD and EUR to TRY)
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await response.json();
            
            if (data && data.rates) {
                const usdToTry = data.rates.TRY;
                const eurToTry = (1 / data.rates.EUR) * data.rates.TRY;
                
                usdRateInput.value = usdToTry.toFixed(2);
                eurRateInput.value = eurToTry.toFixed(2);
                
                // Gold rate is harder to find without API key, we keep the default or 
                // try a proxy if available. For now, we update currency and 
                // keep gold manually adjustable or find a trick.
                // Note: Real-time Turkish gold rates often come from local APIs.
                
                const now = new Date();
                lastUpdateText.textContent = `Son güncelleme: ${now.toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error('Kurlar alınamadı:', error);
            lastUpdateText.textContent = 'Kurlar güncellenirken hata oluştu.';
        }
    }

    function calculateAll() {
        const goldRate = parseFloat(goldRateInput.value) || 0;
        const usdRate = parseFloat(usdRateInput.value) || 0;
        const eurRate = parseFloat(eurRateInput.value) || 0;

        let totalAssetsTL = 0;
        let totalDebtsTL = 0;

        assetInputs.forEach(input => {
            const val = parseFloat(input.value) || 0;
            const type = input.dataset.type;
            const id = input.id;
            let currentTL = 0;

            switch(type) {
                case 'tl':
                    currentTL = val;
                    break;
                case 'usd':
                    currentTL = val * usdRate;
                    break;
                case 'eur':
                    currentTL = val * eurRate;
                    break;
                case 'gold':
                    currentTL = val * goldRate;
                    break;
                case 'neg-tl':
                    currentTL = val;
                    totalDebtsTL += val;
                    break;
            }

            if (type !== 'neg-tl') {
                totalAssetsTL += currentTL;
            }

            // Update individual TL value display
            const displayId = id + 'Val';
            const displayEl = document.getElementById(displayId);
            if (displayEl) {
                displayEl.textContent = formatCurrency(currentTL);
            }
        });

        const netMatrah = totalAssetsTL - totalDebtsTL;
        const nisabValue = goldRate * NISAB_GOLD_WEIGHT;

        // Display results
        nisabDisplay.textContent = formatCurrency(nisabValue);
        netMatrahDisplay.textContent = formatCurrency(netMatrah > 0 ? netMatrah : 0);

        if (netMatrah >= nisabValue) {
            const zakat = netMatrah * 0.025;
            totalZakatDisplay.textContent = formatCurrency(zakat);
            statusBadge.innerHTML = 'Zekat vermeniz gerekiyor. Mevcut varlığınız nisab miktarının üzerindedir.<br><small style="opacity: 0.8; font-weight: 400;">(Not: Bu malın üzerinden tam 1 kamerî yıl geçmiş olması gerekir.)</small>';
            statusBadge.className = 'status-badge over-nisab';
        } else {
            totalZakatDisplay.textContent = formatCurrency(0);
            if (netMatrah <= 0) {
                statusBadge.textContent = 'Borçlarınız varlıklarınızdan fazla veya eşit.';
            } else {
                statusBadge.textContent = 'Mevcut varlığınız nisab miktarının (80.18 gr altın) altındadır. Zekat düşmez.';
            }
            statusBadge.className = 'status-badge under-nisab';
        }
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(val);
    }
});
