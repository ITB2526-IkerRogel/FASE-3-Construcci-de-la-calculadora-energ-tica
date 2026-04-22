/**
 * Reduction.js — Calculadora interactiva.
 * Panell a l'esquerra (sticky) i accions a la dreta.
 * VERSIÓN COMPACTA PARA MINIMIZAR SCROLL.
 */

(function () {
  'use strict';

  const CURRENT_YEAR = new Date().getFullYear();
  const NEXT_YEAR = CURRENT_YEAR + 1;
  const HISTORIC_LABEL = `Actual (${CURRENT_YEAR - 1}-${String(CURRENT_YEAR).slice(-2)})`;

  let rawData = null;
  let indicadors = null;
  let totelesAccions = {};
  let selectedActions = new Set();

  document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    rawData = await Calculator.carregarDades();

    if (!rawData) {
      document.querySelector('main.container-wide').innerHTML = `<div class="error-container"><h2>Error dades</h2></div>`;
      return;
    }

    indicadors = Calculator.processarTotsIndicadors(rawData);
    buildAccionsData();
    renderImpactDashboard();
    renderReductionCards();
    updateImpact();
  });

  function setupNavigation() {
    const hamburger = document.querySelector('.nav-hamburger');
    const links = document.querySelector('.nav-links');
    if (hamburger && links) {
      hamburger.addEventListener('click', () => links.classList.toggle('open'));
    }
  }

  function buildAccionsData() {
    const accionsConfig = {
      consum_aigua: [
        { id: 'aigua_1', nom: 'Eliminació consum nocturn', desc: 'Reparar fuites (~160 L/h).', reduccio: 25, inversio: 1500, circular: false },
        { id: 'aigua_2', nom: 'Aixetes baix cabal', desc: 'Reductors als lavabos.', reduccio: 15, inversio: 2100, circular: false },
        { id: 'aigua_3', nom: 'Cisternes doble descàrrega', desc: 'Models de 3/6L.', reduccio: 10, inversio: 3200, circular: false },
        { id: 'aigua_4', nom: 'Recollida pluvial', desc: 'Reg del jardí.', reduccio: 8, inversio: 5500, circular: true }
      ],
      consum_electric_solar: [
        { id: 'elec_1', nom: 'Ampliació panells solars', desc: 'Fins a 60 kWp.', reduccio: 15, inversio: 22000, circular: true },
        { id: 'elec_2', nom: 'Il·luminació LED', desc: 'LED i sensors presència.', reduccio: 12, inversio: 6500, circular: true },
        { id: 'elec_3', nom: 'Standby zero', desc: 'Apagada programada.', reduccio: 8, inversio: 800, circular: false },
        { id: 'elec_4', nom: 'Optimització HVAC', desc: 'Termòstats intel·ligents.', reduccio: 10, inversio: 4200, circular: false }
      ],
      consumibles_oficina: [
        { id: 'ofic_1', nom: 'Digitalització', desc: 'Gestió digital documents.', reduccio: 20, inversio: 3500, circular: true },
        { id: 'ofic_2', nom: 'Impressió doble cara', desc: 'Configuració per defecte.', reduccio: 8, inversio: 0, circular: true },
        { id: 'ofic_3', nom: 'Retoladors recarregables', desc: 'Cartutxos eco.', reduccio: 5, inversio: 200, circular: true },
        { id: 'ofic_4', nom: 'Compra centralitzada', desc: 'Reduir enviaments.', reduccio: 5, inversio: 0, circular: true }
      ],
      productes_neteja: [
        { id: 'nete_1', nom: 'Assecadors d\'aire', desc: 'Eliminar paper secamans.', reduccio: 15, inversio: 3600, circular: true },
        { id: 'nete_2', nom: 'Productes concentrats', desc: 'Canvi a productes eco.', reduccio: 10, inversio: 300, circular: true },
        { id: 'nete_3', nom: 'Dosificadors automàtics', desc: 'Evitar malbaratament.', reduccio: 8, inversio: 1200, circular: false },
        { id: 'nete_4', nom: 'Microfibra reutilitzable', desc: 'Substituir material d\'un sol ús.', reduccio: 7, inversio: 400, circular: true }
      ]
    };
    totelesAccions = accionsConfig;
  }

  function renderImpactDashboard() {
    const container = document.getElementById('impact-dashboard');
    if (!container) return;

    container.innerHTML = `
      <div class="impact-dashboard-inner">
        <div class="impact-header" style="margin-bottom: 10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size: 1.4rem;">🧮</span>
            <h3 style="margin:0; font-size:1.2rem;">Impacte</h3>
          </div>
          <div class="impact-actions-bar" style="margin-top:5px; display:flex; gap:5px;">
            <button class="btn btn-sm btn-outline" id="btn-select-all" style="flex:1; padding:4px;">✅ Tot</button>
            <button class="btn btn-sm btn-outline" id="btn-deselect-all" style="flex:1; padding:4px;">❌ Res</button>
          </div>
        </div>

        <div class="impact-kpis" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:10px;">
          <div class="impact-kpi" style="padding:8px; text-align:center; background:var(--bg-secondary); border-radius:var(--radius-sm);">
            <div class="impact-kpi-value" id="impact-savings" style="font-size:1.1rem; font-weight:800; color:var(--clean-green);">0 €</div>
            <div class="impact-kpi-label" style="font-size:0.65rem; color:var(--text-muted);">Estalvi Anual</div>
          </div>
          <div class="impact-kpi" style="padding:8px; text-align:center; background:var(--bg-secondary); border-radius:var(--radius-sm);">
            <div class="impact-kpi-value" id="impact-investment" style="font-size:1.1rem; font-weight:800; color:var(--solar-amber);">0 €</div>
            <div class="impact-kpi-label" style="font-size:0.65rem; color:var(--text-muted);">Inversió Total</div>
          </div>
        </div>

        <div class="impact-per-indicator" id="impact-per-indicator" style="display:flex; flex-direction:column; gap:5px;">
        </div>

        <div style="margin-top: 10px; height: 160px; position: relative;">
          <canvas id="dynamic-savings-chart"></canvas>
        </div>
      </div>
    `;

    document.getElementById('btn-select-all').addEventListener('click', () => {
      document.querySelectorAll('.action-checkbox').forEach(cb => cb.checked = true);
      Object.values(totelesAccions).flat().forEach(a => selectedActions.add(a.id));
      updateImpact();
      updateVisualSelection();
    });

    document.getElementById('btn-deselect-all').addEventListener('click', () => {
      document.querySelectorAll('.action-checkbox').forEach(cb => cb.checked = false);
      selectedActions.clear();
      updateImpact();
      updateVisualSelection();
    });
  }

  function updateVisualSelection() {
    document.querySelectorAll('.interactive-action').forEach(item => {
      const cb = item.querySelector('.action-checkbox');
      item.classList.toggle('selected', cb.checked);
    });
  }

  function updateImpact() {
    let totalSavings = 0;
    let totalInvestment = 0;
    let totalCircular = 0;
    let totalSelected = selectedActions.size;
    let totalBaseCostAll = 0;

    const breakdownContainer = document.getElementById('impact-per-indicator');
    let html = '';

    const chartLabels = [];
    const chartCostActual = [];
    const chartEstalvi = [];
    const chartColors = [];

    const indicadorsAmbAccions = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];

    for (const clau of indicadorsAmbAccions) {
      const ind = indicadors[clau];
      const accions = totelesAccions[clau];
      if (!ind || !accions) continue;

      totalBaseCostAll += ind.totalCost;

      let indReduccio = 0;
      let indInversio = 0;
      let indSelected = 0;

      accions.forEach(a => {
        if (selectedActions.has(a.id)) {
          indReduccio += a.reduccio;
          indInversio += a.inversio;
          indSelected++;
          if (a.circular) totalCircular++;
        }
      });

      const effectiveReduccio = Math.min(indReduccio, 60);
      const estalvi = ind.totalCost * (effectiveReduccio / 100);
      const costNou = ind.totalCost - estalvi;

      totalSavings += estalvi;
      totalInvestment += indInversio;

      const labelCorto = ind.nom.replace("Consum d'", "").replace("Consumibles d'", "").replace("Productes de ", "");
      chartLabels.push(labelCorto);
      chartCostActual.push(costNou);
      chartEstalvi.push(estalvi);
      chartColors.push(ind.color);

      const barWidth = Math.min(effectiveReduccio / 60 * 100, 100);

      if (indSelected > 0) {
        html += `
          <div class="impact-indicator-row" style="background:var(--bg-secondary); padding:6px 10px; border-radius:var(--radius-sm);">
            <div class="impact-ind-header" style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              <span class="impact-ind-icon ${ind.cssClass}" style="width:18px;height:18px;font-size:0.75rem;">${ind.icona}</span>
              <span class="impact-ind-name" style="font-size:0.75rem; font-weight:600; flex:1;">${ind.nom}</span>
              <span class="impact-ind-pct" style="font-size:0.75rem; font-weight:700; color:var(--clean-green);">-${effectiveReduccio}%</span>
            </div>
            <div class="impact-ind-bar-wrapper" style="height:4px; background:var(--bg-primary); border-radius:2px; margin-bottom:4px;">
              <div class="impact-ind-bar-fill ${ind.cssClass}" style="width:${barWidth}%; height:100%; transition:width 0.3s ease;"></div>
            </div>
            <div class="impact-ind-detail" style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-muted); font-family:monospace;">
              <span>${Calculator.formatCurrency(ind.totalCost)} → <strong style="color:var(--clean-green);">${Calculator.formatCurrency(costNou)}</strong></span>
            </div>
          </div>
        `;
      }

      const cardSummary = document.getElementById(`card-summary-${clau}`);
      if (cardSummary) {
        cardSummary.innerHTML = indSelected > 0
          ? `<span class="card-summary-active" style="color:var(--clean-green); font-weight:600; font-size:0.7rem;">✅ ${indSelected} acc. · -${effectiveReduccio}%</span>`
          : `<span class="card-summary-inactive" style="color:var(--text-muted); font-size:0.7rem;">Cap acció</span>`;
      }
    }

    breakdownContainer.innerHTML = html;

    if (window.Charts && window.Charts.createDynamicSavingsChart) {
      window.Charts.createDynamicSavingsChart('dynamic-savings-chart', chartLabels, chartCostActual, chartEstalvi, chartColors);
    }

    document.getElementById('impact-savings').textContent = Calculator.formatCurrency(totalSavings);
    document.getElementById('impact-investment').textContent = Calculator.formatCurrency(totalInvestment);

    const globalReduccio = totalBaseCostAll > 0 ? (totalSavings / totalBaseCostAll) * 100 : 0;
    document.getElementById('stat-reduccio').textContent = `-${globalReduccio.toFixed(1)}%`;
    document.getElementById('stat-accions').textContent = totalSelected;

    const circPct = totalSelected > 0 ? Math.round((totalCircular / totalSelected) * 100) : 0;
    document.getElementById('stat-circular').textContent = `${circPct}%`;

    const roiEl = document.getElementById('stat-roi-footer');
    if (totalSavings > 0) {
      const roiYears = totalInvestment / totalSavings;
      roiEl.textContent = roiYears === 0 ? "Immediat" : `${roiYears.toFixed(1)} anys`;
    } else if (totalInvestment > 0) {
      roiEl.textContent = "Cap";
    } else {
      roiEl.textContent = "—";
    }
  }

  function renderReductionCards() {
    const grid = document.getElementById('reduction-grid');
    if (!grid) return;

    let html = '';
    const main4 = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];

    main4.forEach(clau => {
      const ind = indicadors[clau];
      const accions = totelesAccions[clau];
      if (!ind || !accions) return;

      html += `
        <div class="reduction-card" style="margin-bottom:10px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); overflow:hidden;">
          <div class="reduction-card-header" style="padding:8px 12px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">${ind.icona}</span>
              <h3 style="margin:0; font-size:0.95rem;">${ind.nom}</h3>
            </div>
            <div id="card-summary-${clau}"></div>
          </div>
          <div class="reduction-card-body" style="padding:6px;">
            ${accions.map(a => `
              <div class="action-item interactive-action" data-action-id="${a.id}" style="padding:6px 8px; margin-bottom:2px; border-radius:var(--radius-sm); border:1px solid transparent; cursor:pointer; display:flex; align-items:center; gap:10px; transition:all 0.2s;">
                <input type="checkbox" class="action-checkbox" data-id="${a.id}" ${selectedActions.has(a.id) ? 'checked' : ''} style="transform:scale(1.1); cursor:pointer; margin:0;">
                <div style="flex:1;">
                  <h4 style="margin:0; font-size:0.8rem;">${a.nom}</h4>
                  <p style="margin:0; font-size:0.7rem; color:var(--text-muted); line-height:1.2;">${a.desc}</p>
                </div>
                <div style="text-align:right; min-width:70px;">
                  <div style="font-weight:700; color:var(--ipc-red); font-size:0.8rem;">-${a.reduccio}%</div>
                  <div style="font-size:0.7rem; color:var(--solar-amber); font-weight:600;">${a.inversio > 0 ? a.inversio+'€' : '0€'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    });
    grid.innerHTML = html;

    grid.querySelectorAll('.interactive-action').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() !== 'input') {
          const cb = item.querySelector('.action-checkbox');
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });

      const cb = item.querySelector('.action-checkbox');
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedActions.add(id);
        else selectedActions.delete(id);
        updateImpact();
        updateVisualSelection();
      });
    });
  }

})();