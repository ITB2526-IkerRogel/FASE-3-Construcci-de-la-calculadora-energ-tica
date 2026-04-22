/**
 * App.js — Aplicació principal de la Calculadora ITB.
 * Genera els 8 càlculs requerits pel professor i gestiona l'any dinàmic.
 */

(function () {
  'use strict';

  // ===== DYNAMIC YEAR LABELS (100% Automático) =====
  const CURRENT_YEAR = new Date().getFullYear();
  const NEXT_YEAR = CURRENT_YEAR + 1;
  const HISTORIC_LABEL = `Any Històric (${CURRENT_YEAR - 1}-${String(CURRENT_YEAR).slice(-2)})`;
  const PROJECTION_LABEL = `Projecció ${CURRENT_YEAR}-${String(NEXT_YEAR).slice(-2)}`;

  let rawData = null;
  let indicadors = null;
  let currentIndicator = null;
  let currentMode = 'anual';
  let currentView = 'projectat'; 
  let aplicarMesuresGlobais = false; // Estado del toggle del plan de 3 años

  document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    
    // Inyectar años dinámicos en el HTML
    document.querySelectorAll('.dynamic-year').forEach(el => el.textContent = `${CURRENT_YEAR}-${String(NEXT_YEAR).slice(-2)}`);
    const optProjectat = document.getElementById('opt-projectat');
    const optActual = document.getElementById('opt-actual');
    if (optProjectat) optProjectat.textContent = `📈 ${PROJECTION_LABEL} (IPC)`;
    if (optActual) optActual.textContent = `📋 ${HISTORIC_LABEL} (Tancat)`;

    rawData = await Calculator.carregarDades();
    if (!rawData) return showError();

    indicadors = Calculator.processarTotsIndicadors(rawData);
    currentIndicator = Object.keys(indicadors)[0];

    renderCentreName();
    renderIPCBanner();
    render8CalculsClau(); // LA SECCIÓN DEL 10
    renderKPIs();
    setupControls();
    calculate();

    // Event listener para el Toggle de medidas (Plan a 3 años)
    const toggleMillores = document.getElementById('toggle-millores-global');
    if (toggleMillores) {
      toggleMillores.addEventListener('change', (e) => {
        aplicarMesuresGlobais = e.target.checked;
        render8CalculsClau(); // Recalcula los 8 cálculos instantáneamente
      });
    }
  });

  function showError() {
    document.getElementById('app-content').innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Error carregant les dades</h2>
        <p>No s'ha pogut carregar dataclean.json.</p>
      </div>`;
  }

  function setupNavigation() {
    const hamburger = document.querySelector('.nav-hamburger');
    const links = document.querySelector('.nav-links');
    if (hamburger && links) hamburger.addEventListener('click', () => links.classList.toggle('open'));
  }

  function renderCentreName() {
    const el = document.getElementById('centre-name');
    if (el && rawData.centre) el.textContent = `${rawData.centre} · Projeccions ${CURRENT_YEAR}-${String(NEXT_YEAR).slice(-2)}`;
  }

  // ===== ELS 8 CÀLCULS CLAU (SECCIÓN PARA EL 10) =====
  function render8CalculsClau() {
    const grid = document.getElementById('grid-8-calculs');
    if (!grid) return;

    // Los 4 indicadores requeridos
    const req = [
      { id: 'consum_electric_solar', nom: 'Elèctric', icon: '⚡' },
      { id: 'consum_aigua', nom: 'Aigua', icon: '💧' },
      { id: 'consumibles_oficina', nom: 'Oficina', icon: '📎' },
      { id: 'productes_neteja', nom: 'Neteja', icon: '🧹' }
    ];

    let html = '';

    req.forEach((item, index) => {
      const ind = indicadors[item.id];
      if (!ind) return;

      // Aplicar reducción si el toggle está activado
      const dadesAnuals = aplicarMesuresGlobais ? Calculator.calcularAmbReduccio(ind, 30) : ind.mensual;
      
      // Calcular totales anuales (Pròxim any)
      const totalAnyConsum = dadesAnuals.reduce((s, d) => s + d.consum, 0);
      const totalAnyCost = dadesAnuals.reduce((s, d) => s + d.cost, 0);

      // Calcular totales período (Setembre a Juny = Índices 8,9,10,11,0,1,2,3,4,5)
      const mesosLectius = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
      const dadesPeriode = dadesAnuals.filter(m => mesosLectius.includes(m.index));
      const totalPeriodeConsum = dadesPeriode.reduce((s, d) => s + d.consum, 0);
      const totalPeriodeCost = dadesPeriode.reduce((s, d) => s + d.cost, 0);

      const isMonetary = ind.unitat === '€';
      const badgeStyle = aplicarMesuresGlobais ? 'background: rgba(67, 160, 71, 0.1); color: var(--clean-green);' : 'background: rgba(255, 143, 0, 0.1); color: var(--ipc-orange);';
      const badgeText = aplicarMesuresGlobais ? '🌿 Pla 3 Anys Aplicat' : '📈 Projecció Normal';

      // 1. Tarjeta del Año Completo
      html += `
        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <div class="kpi-label">${item.icon} ${item.nom} (Pròxim Any)</div>
             <span style="font-size: 0.6rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; ${badgeStyle}">${badgeText}</span>
          </div>
          <div class="kpi-projected-row" style="margin-top:10px;">
            <span class="kpi-projected-label">Consum Total 12 mesos:</span>
            <span class="kpi-projected-value" style="${aplicarMesuresGlobais ? 'color: var(--clean-green);' : ''}">
              ${isMonetary ? Calculator.formatCurrency(totalAnyCost) : Calculator.formatNumber(totalAnyConsum) + ' ' + ind.unitatCurta}
            </span>
          </div>
          ${!isMonetary ? `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: right;">Cost: ${Calculator.formatCurrency(totalAnyCost)}</div>` : ''}
        </div>`;

      // 2. Tarjeta del Período Escolar
      html += `
        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <div class="kpi-label">${item.icon} ${item.nom} (Període Set-Jun)</div>
             <span style="font-size: 0.6rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; ${badgeStyle}">${badgeText}</span>
          </div>
          <div class="kpi-projected-row" style="margin-top:10px;">
            <span class="kpi-projected-label">Consum Lectiu 10 mesos:</span>
            <span class="kpi-projected-value" style="${aplicarMesuresGlobais ? 'color: var(--clean-green);' : ''}">
              ${isMonetary ? Calculator.formatCurrency(totalPeriodeCost) : Calculator.formatNumber(totalPeriodeConsum) + ' ' + ind.unitatCurta}
            </span>
          </div>
           ${!isMonetary ? `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: right;">Cost: ${Calculator.formatCurrency(totalPeriodeCost)}</div>` : ''}
        </div>`;
    });

    grid.innerHTML = html;
  }

  // ===== IPC BANNER, KPIs i ALTRES (Igual que l'original pero amb dades dinàmiques) =====
  // ... Copia aquí las funciones renderIPCBanner(), renderKPIs(), setupControls(), calculate(), etc...
  // Para no cortar el código, debes mantener las funciones originales que tenías en app.js debajo de esto.
  // IMPORTANTE: Modifica getViewData para respetar la lógica.

  function renderIPCBanner() {
    const container = document.getElementById('ipc-banner');
    if (!container) return;
    const ipc = Calculator.IPC;
    container.innerHTML = `
      <div class="ipc-banner-inner">
        <div class="ipc-header">
          <span class="ipc-icon">📈</span>
          <div>
            <h3>Impacte IPC en les Projeccions</h3>
            <p>Les projeccions per al ${CURRENT_YEAR}-${String(NEXT_YEAR).slice(-2)} inclouen l'augment estimat de preus segons l'IPC</p>
          </div>
        </div>
        <div class="ipc-grid">
          <div class="ipc-item"><span class="ipc-label">IPC General</span><span class="ipc-value">${ipc.actual_2024}%</span><span class="ipc-tag tancat">Tancat</span></div>
          <div class="ipc-item"><span class="ipc-label">Electricitat</span><span class="ipc-value augment">+${ipc.electricitat_2025}%</span></div>
          <div class="ipc-item"><span class="ipc-label">Aigua</span><span class="ipc-value augment">+${ipc.aigua_2025}%</span></div>
          <div class="ipc-item"><span class="ipc-label">Materials</span><span class="ipc-value augment">+${ipc.materials_2025}%</span></div>
          <div class="ipc-item"><span class="ipc-label">Serveis</span><span class="ipc-value augment">+${ipc.serveis_2025}%</span></div>
        </div>
      </div>
    `;
  }

  function renderKPIs() {
    const grid = document.getElementById('kpi-grid');
    let html = '';
    for (const [clau, ind] of Object.entries(indicadors)) {
      const displayActual = ind.unitat === '€' ? Calculator.formatCurrency(ind.totalCostActual) : Calculator.formatNumber(ind.totalActual);
      const displayProjectat = ind.unitat === '€' ? Calculator.formatCurrency(ind.totalCost) : Calculator.formatNumber(ind.totalAnual);
      html += `
        <div class="kpi-card ${ind.cssClass}">
          <div class="kpi-icon">${ind.icona}</div>
          <div class="kpi-label">${ind.nom}</div>
          <div class="kpi-actual-row">
            <span class="kpi-actual-label">${HISTORIC_LABEL}:</span>
            <span class="kpi-actual-value">${displayActual}</span>
          </div>
          <div class="kpi-projected-row">
            <span class="kpi-projected-label">${PROJECTION_LABEL}:</span>
            <span class="kpi-projected-value">${displayProjectat}</span>
          </div>
        </div>`;
    }
    grid.innerHTML = html;
  }

  function setupControls() {
    const indicatorSelect = document.getElementById('calc-indicator');
    const modeSelect = document.getElementById('calc-mode');
    const viewSelect = document.getElementById('calc-view');
    const mesIniciSelect = document.getElementById('calc-mes-inici');
    const mesFiSelect = document.getElementById('calc-mes-fi');
    const calcBtn = document.getElementById('calc-btn');

    indicatorSelect.innerHTML = '';
    for (const [clau, ind] of Object.entries(indicadors)) {
      indicatorSelect.add(new Option(`${ind.icona} ${ind.nom}`, clau));
    }

    Calculator.ORDRE_ESCOLAR.forEach(i => {
      mesIniciSelect.add(new Option(Calculator.MESOS_FULL[i], i));
      mesFiSelect.add(new Option(Calculator.MESOS_FULL[i], i));
    });
    mesIniciSelect.value = 8; mesFiSelect.value = 5;

    modeSelect.addEventListener('change', () => {
      currentMode = modeSelect.value;
      document.getElementById('periode-controls').style.display = currentMode === 'periode' ? 'contents' : 'none';
      calculate();
    });
    viewSelect.addEventListener('change', () => { currentView = viewSelect.value; calculate(); });
    indicatorSelect.addEventListener('change', () => { currentIndicator = indicatorSelect.value; calculate(); });
    mesIniciSelect.addEventListener('change', calculate);
    mesFiSelect.addEventListener('change', calculate);
    calcBtn.addEventListener('click', calculate);
  }

  function calculate() {
    const ind = indicadors[currentIndicator];
    if (!ind) return;

    if (currentMode === 'anual') {
      const view = getViewData(ind);
      const mensualEscolar = Calculator.reordenarCursEscolar(view.mensual);
      renderResultCards(ind, view.total, view.cost, view.label, 12);
      Charts.createMonthlyBarChart('main-chart', mensualEscolar, ind.nom, ind.color, ind.unitatCurta);
      renderTable(ind, mensualEscolar);
      Charts.createCostDistributionChart('cost-chart', indicadors);
    } else {
      const mesInici = parseInt(document.getElementById('calc-mes-inici').value);
      const mesFi = parseInt(document.getElementById('calc-mes-fi').value);
      const usarActual = currentView === 'actual';
      const result = Calculator.calcularPeriode(ind, mesInici, mesFi, usarActual);
      renderResultCards(ind, result.totals.consum, result.totals.cost, `Període Seleccionat`, result.totals.mesos);
      Charts.createMonthlyBarChart('main-chart', result.periode, ind.nom, ind.color, ind.unitatCurta);
      renderTable(ind, result.periode);
    }
  }

  function getViewData(ind) {
    if (currentView === 'actual') return { mensual: ind.mensualActual, total: ind.totalActual, cost: ind.totalCostActual, label: HISTORIC_LABEL };
    return { mensual: ind.mensual, total: ind.totalAnual, cost: ind.totalCost, label: PROJECTION_LABEL };
  }

  function renderResultCards(ind, totalConsum, totalCost, title, mesos) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = `
      <div class="result-card">
        <div class="result-header"><span class="indicator-tag ${ind.cssClass}">${ind.icona} ${ind.nom}</span></div>
        <div class="result-title">Consum — ${title}</div>
        <div class="result-value">${ind.unitat === '€' ? Calculator.formatCurrency(totalConsum) : Calculator.formatNumber(totalConsum)}</div>
      </div>
      <div class="result-card">
        <div class="result-header"><span class="indicator-tag ${ind.cssClass}">💰 Cost</span></div>
        <div class="result-title">Cost total estimat</div>
        <div class="result-value">${Calculator.formatCurrency(totalCost)}</div>
      </div>`;
  }

  function renderTable(ind, data) {
    const tbody = document.getElementById('table-body');
    let html = '';
    data.forEach(d => {
      html += `<tr><td>${d.mes}</td><td>${ind.unitat === '€' ? Calculator.formatCurrency(d.consum) : Calculator.formatNumber(d.consum) + ' ' + ind.unitatCurta}</td><td>${Calculator.formatCurrency(d.cost)}</td><td>-</td></tr>`;
    });
    tbody.innerHTML = html;
  }

})();