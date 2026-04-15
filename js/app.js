/**
 * App.js — Aplicació principal de la Calculadora ITB.
 * Mostra dades actuals tancades + projeccions amb IPC per al pròxim any.
 */

(function () {
  'use strict';

  let rawData = null;
  let indicadors = null;
  let currentIndicator = null;
  let currentMode = 'anual';
  let currentView = 'projectat'; // 'actual' o 'projectat'

  document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();

    rawData = await Calculator.carregarDades();

    if (!rawData) {
      showError();
      return;
    }

    indicadors = Calculator.processarTotsIndicadors(rawData);

    if (Object.keys(indicadors).length === 0) {
      showError("No s'han trobat indicadors vàlids al JSON.");
      return;
    }

    currentIndicator = Object.keys(indicadors)[0];

    renderCentreName();
    renderIPCBanner();
    renderKPIs();
    setupControls();
    calculate();
  });

  function showError(msg) {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Error carregant les dades</h2>
        <p>${msg || "No s'ha pogut carregar el fitxer de dades. Assegura't que existeix i té un format JSON vàlid."}</p>
        <code>data/dataclean.json</code>
      </div>`;
  }

  function setupNavigation() {
    const hamburger = document.querySelector('.nav-hamburger');
    const links = document.querySelector('.nav-links');
    if (hamburger && links) {
      hamburger.addEventListener('click', () => links.classList.toggle('open'));
    }
  }

  function renderCentreName() {
    const el = document.getElementById('centre-name');
    if (el && rawData.centre) {
      el.textContent = `${rawData.centre} · Període: ${rawData.periode || 'Actual'}`;
    }
  }

  // ===== IPC BANNER =====
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
            <p>Les projeccions per al pròxim any inclouen l'augment estimat de preus segons l'IPC i els índexs sectorials</p>
          </div>
        </div>
        <div class="ipc-grid">
          <div class="ipc-item">
            <span class="ipc-label">IPC General 2024</span>
            <span class="ipc-value">${ipc.actual_2024}%</span>
            <span class="ipc-tag tancat">Tancat</span>
          </div>
          <div class="ipc-item">
            <span class="ipc-label">Electricitat 2025</span>
            <span class="ipc-value augment">+${ipc.electricitat_2025}%</span>
            <span class="ipc-tag previsio">Previsió</span>
          </div>
          <div class="ipc-item">
            <span class="ipc-label">Aigua 2025</span>
            <span class="ipc-value augment">+${ipc.aigua_2025}%</span>
            <span class="ipc-tag previsio">Previsió</span>
          </div>
          <div class="ipc-item">
            <span class="ipc-label">Materials 2025</span>
            <span class="ipc-value augment">+${ipc.materials_2025}%</span>
            <span class="ipc-tag previsio">Previsió</span>
          </div>
          <div class="ipc-item">
            <span class="ipc-label">Serveis 2025</span>
            <span class="ipc-value augment">+${ipc.serveis_2025}%</span>
            <span class="ipc-tag previsio">Previsió</span>
          </div>
          <div class="ipc-item">
            <span class="ipc-label">IPC Previsió 2026</span>
            <span class="ipc-value">~${ipc.previsio_2026}%</span>
            <span class="ipc-tag previsio">Estimació</span>
          </div>
        </div>
      </div>
    `;
  }

  // ===== KPIs =====
  function renderKPIs() {
    const grid = document.getElementById('kpi-grid');
    let html = '';

    for (const [clau, ind] of Object.entries(indicadors)) {
      const ipcBadge = ind.ipcAplicat ?
        `<div class="kpi-ipc">📈 +${ind.ipcAplicat}% IPC · <span class="cost-diff">+${Calculator.formatCurrency(ind.diferenciaCost)}</span></div>` : '';

      let detall = '';
      if (ind.id === 'consum_electric_solar') {
        detall = `Cobertura solar: ${ind.coberturaMitjana}%`;
      } else if (ind.anomalia) {
        detall = `⚠️ ${ind.anomalia.substring(0, 60)}…`;
      } else if (ind.observacio) {
        detall = ind.observacio.substring(0, 70);
      }

      // Mostrar actual vs projectat
      const displayActual = ind.unitat === '€'
        ? Calculator.formatCurrency(ind.totalCostActual)
        : Calculator.formatNumber(ind.totalActual);
      const displayProjectat = ind.unitat === '€'
        ? Calculator.formatCurrency(ind.totalCost)
        : Calculator.formatNumber(ind.totalAnual);
      const unitDisplay = ind.unitat === '€' ? '/any' : ` ${ind.unitatCurta}/any`;

      html += `
        <div class="kpi-card ${ind.cssClass}">
          <div class="kpi-icon">${ind.icona}</div>
          <div class="kpi-label">${ind.nom}</div>
          <div class="kpi-actual-row">
            <span class="kpi-actual-label">Actual 2024-25:</span>
            <span class="kpi-actual-value">${displayActual}<small>${unitDisplay}</small></span>
          </div>
          <div class="kpi-projected-row">
            <span class="kpi-projected-label">Projecció 2025-26:</span>
            <span class="kpi-projected-value">${displayProjectat}<small>${unitDisplay}</small></span>
          </div>
          ${ipcBadge}
          ${detall ? `<div class="kpi-detail">${detall}</div>` : ''}
        </div>`;
    }
    grid.innerHTML = html;
  }

  // ===== CONTROLS =====
  function setupControls() {
    const indicatorSelect = document.getElementById('calc-indicator');
    const modeSelect = document.getElementById('calc-mode');
    const viewSelect = document.getElementById('calc-view');
    const mesIniciSelect = document.getElementById('calc-mes-inici');
    const mesFiSelect = document.getElementById('calc-mes-fi');
    const calcBtn = document.getElementById('calc-btn');
    const periodeControls = document.getElementById('periode-controls');

    // Populate indicator dropdown from actual data
    indicatorSelect.innerHTML = '';
    for (const [clau, ind] of Object.entries(indicadors)) {
      const opt = new Option(`${ind.icona} ${ind.nom}`, clau);
      indicatorSelect.add(opt);
    }

    // Populate months in school-year order (Sep → Aug)
    Calculator.ORDRE_ESCOLAR.forEach(i => {
      mesIniciSelect.add(new Option(Calculator.MESOS_FULL[i], i));
      mesFiSelect.add(new Option(Calculator.MESOS_FULL[i], i));
    });
    mesIniciSelect.value = 8; // Setembre
    mesFiSelect.value = 5;   // Juny

    modeSelect.addEventListener('change', () => {
      currentMode = modeSelect.value;
      periodeControls.style.display = currentMode === 'periode' ? 'contents' : 'none';
      calculate();
    });

    viewSelect.addEventListener('change', () => {
      currentView = viewSelect.value;
      calculate();
    });

    indicatorSelect.addEventListener('change', () => {
      currentIndicator = indicatorSelect.value;
      calculate();
    });

    mesIniciSelect.addEventListener('change', calculate);
    mesFiSelect.addEventListener('change', calculate);
    calcBtn.addEventListener('click', calculate);
  }

  // ===== CALCULATE =====
  function calculate() {
    const ind = indicadors[currentIndicator];
    if (!ind) return;

    if (currentMode === 'anual') {
      renderAnualResults(ind);
    } else {
      const mesInici = parseInt(document.getElementById('calc-mes-inici').value);
      const mesFi = parseInt(document.getElementById('calc-mes-fi').value);
      renderPeriodeResults(ind, mesInici, mesFi);
    }
  }

  function getViewData(ind) {
    if (currentView === 'actual') {
      return {
        mensual: ind.mensualActual || ind.mensual,
        total: ind.totalActual || ind.totalAnual,
        cost: ind.totalCostActual || ind.totalCost,
        label: 'Actual 2024-25'
      };
    }
    return {
      mensual: ind.mensual,
      total: ind.totalAnual,
      cost: ind.totalCost,
      label: 'Projecció 2025-26 (amb IPC)'
    };
  }

  function renderAnualResults(ind) {
    const view = getViewData(ind);
    // Reordenar per curs escolar (Set → Ago) per a la visualització
    const mensualEscolar = Calculator.reordenarCursEscolar(view.mensual);
    renderResultCards(ind, view.mensual, view.total, view.cost, view.label, view.mensual.length);
    renderMainChart(ind, mensualEscolar);
    renderTable(ind, mensualEscolar);
    renderCostDistribution();
    renderComparisonActualVsProjected(ind);
    renderDadesRealsSection(ind);
  }

  function renderPeriodeResults(ind, mesInici, mesFi) {
    const usarActual = currentView === 'actual';
    const result = Calculator.calcularPeriode(ind, mesInici, mesFi, usarActual);
    if (!result) return;

    const title = `${Calculator.MESOS_FULL[mesInici]} — ${Calculator.MESOS_FULL[mesFi]} (${currentView === 'actual' ? 'Actual' : 'Projectat'})`;
    renderResultCards(ind, result.periode, result.totals.consum, result.totals.cost, title, result.totals.mesos);
    renderMainChart(ind, result.periode);
    renderTable(ind, result.periode);
    renderCostDistribution();

    // Per al període, no mostrar la comparació
    const compContainer = document.getElementById('comparison-section');
    if (compContainer) compContainer.innerHTML = '';
    const realContainer = document.getElementById('dades-reals');
    if (realContainer) realContainer.innerHTML = '';
  }

  // ===== RENDER RESULTS =====
  function renderResultCards(ind, data, totalConsum, totalCost, title, mesos) {
    const grid = document.getElementById('results-grid');
    const mitjana = mesos > 0 ? totalConsum / mesos : 0;
    const isMonetary = ind.unitat === '€';
    const isProjected = currentView === 'projectat';

    const consumDisplay = isMonetary
      ? Calculator.formatCurrency(totalConsum)
      : `${Calculator.formatNumber(totalConsum, 1)} <span class="kpi-unit">${ind.unitatCurta}</span>`;

    // Card IPC
    let ipcCard = '';
    if (isProjected && ind.ipcAplicat) {
      ipcCard = `
        <div class="result-card ipc-highlight">
          <div class="result-header">
            <span class="indicator-tag ipc">📈 IPC</span>
          </div>
          <div class="result-title">Augment per IPC aplicat</div>
          <div class="result-value">+${ind.ipcAplicat}%</div>
          <div class="result-detail">Diferència: +${Calculator.formatCurrency(ind.diferenciaCost)} respecte actual</div>
        </div>`;
    }

    let card3 = '';
    if (ind.id === 'consum_electric_solar') {
      card3 = `
        <div class="result-card">
          <div class="result-header">
            <span class="indicator-tag ${ind.cssClass}">☀️ Solar</span>
          </div>
          <div class="result-title">Producció solar projectada</div>
          <div class="result-value">${Calculator.formatNumber(ind.totalSolar, 0)} <span class="kpi-unit">kWh</span></div>
          <div class="result-detail">Cobertura: ${ind.coberturaMitjana}% · ${ind.capacitatSolar} kWp instal·lats</div>
        </div>`;
    } else if (ind.id === 'consum_aigua') {
      card3 = `
        <div class="result-card">
          <div class="result-header">
            <span class="indicator-tag ${ind.cssClass}">⚠️ Anomalia</span>
          </div>
          <div class="result-title">Consum nocturn detectat</div>
          <div class="result-value">${Calculator.formatNumber(ind.consumNocturn, 0)} <span class="kpi-unit">L/hora</span></div>
          <div class="result-detail">Pic màxim diürn: ${Calculator.formatNumber(ind.picMaxim, 0)} L/hora</div>
        </div>`;
    } else {
      card3 = `
        <div class="result-card">
          <div class="result-header">
            <span class="indicator-tag ${ind.cssClass}">📊 Anàlisi</span>
          </div>
          <div class="result-title">Valor base estimat</div>
          <div class="result-value">${isMonetary ? Calculator.formatCurrency(ind.valorBase) : Calculator.formatNumber(ind.valorBase, 0)}</div>
          <div class="result-detail">${ind.unitatBase}</div>
        </div>`;
    }

    grid.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <span class="indicator-tag ${ind.cssClass}">${ind.icona} ${ind.nom}</span>
        </div>
        <div class="result-title">Consum total — ${title}</div>
        <div class="result-value">${consumDisplay}</div>
        <div class="result-detail">Mitjana: ${isMonetary ? Calculator.formatCurrency(mitjana) : Calculator.formatNumber(mitjana, 1) + ' ' + ind.unitatCurta}/mes</div>
      </div>
      <div class="result-card">
        <div class="result-header">
          <span class="indicator-tag ${ind.cssClass}">💰 Cost</span>
        </div>
        <div class="result-title">Cost total estimat</div>
        <div class="result-value">${Calculator.formatCurrency(totalCost)}</div>
        <div class="result-detail">${mesos} mesos · ${Calculator.formatCurrency(totalCost / Math.max(mesos, 1))}/mes</div>
      </div>
      ${card3}
      ${ipcCard}`;
  }

  // ===== COMPARISON ACTUAL vs PROJECTED =====
  function renderComparisonActualVsProjected(ind) {
    const container = document.getElementById('comparison-section');
    if (!container) return;

    if (!ind.mensualActual) {
      container.innerHTML = '';
      return;
    }

    const isMonetary = ind.unitat === '€';
    const totalActual = isMonetary ? ind.totalCostActual : ind.totalActual;
    const totalProjectat = isMonetary ? ind.totalCost : ind.totalAnual;
    const diff = totalProjectat - totalActual;
    const pctDiff = ((diff / totalActual) * 100).toFixed(1);

    container.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">📊 Comparació Actual vs. Projecció</h2>
      </div>
      <div class="comparison-highlight">
        <div class="comp-card actual-card">
          <div class="comp-badge tancat">✓ Tancat</div>
          <div class="comp-label">Dades Actuals 2024-25</div>
          <div class="comp-value">${isMonetary ? Calculator.formatCurrency(totalActual) : Calculator.formatNumber(totalActual) + ' ' + ind.unitatCurta}</div>
          <div class="comp-sublabel">Cost: ${Calculator.formatCurrency(ind.totalCostActual)}</div>
        </div>
        <div class="comp-arrow">
          <div class="arrow-line"></div>
          <div class="arrow-badge">+${pctDiff}%</div>
          <div class="arrow-detail">IPC +${ind.ipcAplicat || 0}%</div>
        </div>
        <div class="comp-card projected-card">
          <div class="comp-badge previsio">📈 Projecció</div>
          <div class="comp-label">Projecció 2025-26</div>
          <div class="comp-value">${isMonetary ? Calculator.formatCurrency(totalProjectat) : Calculator.formatNumber(totalProjectat) + ' ' + ind.unitatCurta}</div>
          <div class="comp-sublabel">Cost: ${Calculator.formatCurrency(ind.totalCost)} (+${Calculator.formatCurrency(ind.diferenciaCost)})</div>
        </div>
      </div>
    `;
  }

  // ===== DADES REALS (factures originals) =====
  function renderDadesRealsSection(ind) {
    const container = document.getElementById('dades-reals');
    if (!container) return;

    let html = '';

    if (ind.id === 'consum_aigua' && ind.dadesOriginals) {
      html = `
        <div class="section-header">
          <h2 class="section-title">📋 Dades Reals — Comptador Intel·ligent</h2>
        </div>
        <div class="real-data-grid">
          ${ind.dadesOriginals.map(d => `
            <div class="real-data-card">
              <div class="real-data-header">
                <span class="data-date">${d.data}</span>
                <span class="data-value">${Calculator.formatNumber(d.consum_total_diari_estimat_L)} L</span>
              </div>
              <div class="real-data-detail">
                <span>Pic: ${d.pic_maxim.hora} — ${d.pic_maxim.litres} L</span>
              </div>
              <p class="data-obs">${d.observacions}</p>
            </div>
          `).join('')}
        </div>`;
    } else if (ind.id === 'consum_electric_solar' && ind.resumGener) {
      const r = ind.resumGener;
      html = `
        <div class="section-header">
          <h2 class="section-title">📋 Dades Reals — Plant Report Gener 2025</h2>
        </div>
        <div class="real-data-grid">
          <div class="real-data-card">
            <div class="real-data-header">
              <span class="data-date">Gener 2025 (22 dies)</span>
              <span class="data-value">${Calculator.formatNumber(r.consum_total_kWh, 1)} kWh consumits</span>
            </div>
            <div class="real-data-stats">
              <span>☀️ Producció solar: ${Calculator.formatNumber(r.produccio_total_kWh, 1)} kWh</span>
              <span>🔌 Importat xarxa: ${Calculator.formatNumber(r.importat_xarxa_total_kWh, 1)} kWh</span>
              <span>♻️ Autoconsum: ${Calculator.formatNumber(r.autoconsum_total_kWh, 1)} kWh</span>
              <span>🌍 CO₂ evitat: ${r.CO2_evitat_total_t} t</span>
              <span>☀️ Cobertura solar: ${r['cobertura_solar_mitjana_%']}%</span>
            </div>
            <p class="data-obs">${r.observacions}</p>
          </div>
        </div>`;
    } else if (ind.factures) {
      html = `
        <div class="section-header">
          <h2 class="section-title">📋 Factures Originals</h2>
        </div>
        <div class="real-data-grid">
          ${ind.factures.map(f => `
            <div class="real-data-card">
              <div class="real-data-header">
                <span class="data-date">${f.factura || f.mes || ''} — ${f.data || f.mes || ''}</span>
                <span class="data-value">${Calculator.formatCurrency(f.total_factura_EUR || f.total_EUR || 0)}</span>
              </div>
              ${f.proveidor ? `<div class="real-data-detail"><span>Proveïdor: ${f.proveidor}</span></div>` : ''}
              ${f.items ? `<ul class="factura-items">${f.items.map(item => 
                `<li>${item.descripcio} — ${Calculator.formatCurrency(item.total)}</li>`
              ).join('')}</ul>` : ''}
            </div>
          `).join('')}
        </div>`;
    }

    container.innerHTML = html;
  }

  // ===== CHART =====
  function renderMainChart(ind, data) {
    if (ind.id === 'consum_electric_solar') {
      Charts.createElectricChart('main-chart', data);
    } else {
      Charts.createMonthlyBarChart('main-chart', data, ind.nom, ind.color, ind.unitatCurta);
    }
  }

  function renderCostDistribution() {
    Charts.createCostDistributionChart('cost-chart', indicadors);
  }

  // ===== TABLE =====
  function renderTable(ind, data) {
    const tbody = document.getElementById('table-body');
    const isElectric = ind.id === 'consum_electric_solar';
    let html = '';
    let totalConsum = 0, totalCost = 0;

    data.forEach(d => {
      totalConsum += d.consum;
      totalCost += d.cost;
      const barWidth = Math.min((d.consum / Math.max(...data.map(x => x.consum))) * 100, 100);

      let extraCol = '';
      if (isElectric) {
        extraCol = `<td>${Calculator.formatNumber(d.produccioSolar, 1)} kWh</td><td>${d.coberturaSolar}%</td>`;
      }

      html += `<tr>
        <td class="row-label">${d.mes}</td>
        <td>${ind.unitat === '€' ? Calculator.formatCurrency(d.consum) : Calculator.formatNumber(d.consum, 1) + ' ' + ind.unitatCurta}</td>
        <td>${Calculator.formatCurrency(d.cost)}</td>
        ${extraCol}
        <td>
          <div class="progress-bar" style="width:120px;height:6px;">
            <div class="progress-fill ${ind.cssClass}" style="width:${barWidth}%;"></div>
          </div>
        </td>
      </tr>`;
    });

    html += `<tr style="font-weight:700;background:var(--bg-secondary);">
      <td class="row-label">TOTAL</td>
      <td>${ind.unitat === '€' ? Calculator.formatCurrency(totalConsum) : Calculator.formatNumber(totalConsum, 1) + ' ' + ind.unitatCurta}</td>
      <td>${Calculator.formatCurrency(totalCost)}</td>
      ${isElectric ? '<td></td><td></td>' : ''}
      <td></td>
    </tr>`;

    tbody.innerHTML = html;

    // Update table headers for electric
    const thead = document.getElementById('table-head');
    if (isElectric) {
      thead.innerHTML = '<tr><th>Mes</th><th>Consum</th><th>Cost</th><th>Solar</th><th>Cobertura</th><th>Nivell</th></tr>';
    } else {
      thead.innerHTML = '<tr><th>Mes</th><th>Consum</th><th>Cost</th><th>Nivell</th></tr>';
    }
  }

})();
