/**
 * App.js — Aplicació principal de la Calculadora ITB.
 * Carrega dinàmicament dataclean.json i genera els resultats sol·licitats (Fase 3.1).
 * Cobreix els càlculs anuals i per períodes dels diferents indicadors.
 */

(function () {
  'use strict';

  let rawData = null;
  let indicadors = null;
  let currentIndicator = null;
  let currentMode = 'anual';

  document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();

    // 1. Carregar les dades del JSON proporcionat
    rawData = await Calculator.carregarDades();

    if (!rawData) {
      showError();
      return;
    }

    // 2. Processar les dades aplicant tendències temporals i cicles estacionals
    indicadors = Calculator.processarTotsIndicadors(rawData);

    if (Object.keys(indicadors).length === 0) {
      showError('No s\'han trobat indicadors vàlids al JSON.');
      return;
    }

    // Seleccionem el primer indicador per defecte
    currentIndicator = Object.keys(indicadors)[0];

    renderCentreName();
    renderKPIs();
    setupControls();

    // 3. Generar els resultats inicials
    calculate();
  });

  function showError(msg) {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Error carregant les dades</h2>
        <p>${msg || 'No s\'ha pogut carregar el fitxer de dades. Assegura\'t que existeix i té un format JSON vàlid.'}</p>
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

  // ===== KPIs: Resum ràpid de l'estat global =====
  function renderKPIs() {
    const grid = document.getElementById('kpi-grid');
    let html = '';

    for (const [clau, ind] of Object.entries(indicadors)) {
      let detall = '';
      if (ind.id === 'consum_electric_solar') {
        detall = `Cobertura solar: ${ind.coberturaMitjana}%`;
      } else if (ind.anomalia) {
        detall = `⚠️ ${ind.anomalia.substring(0, 60)}…`;
      } else if (ind.observacio) {
        detall = ind.observacio.substring(0, 70);
      }

      const displayValue = ind.unitat === '€'
        ? Calculator.formatCurrency(ind.totalAnual)
        : Calculator.formatNumber(ind.totalAnual);

      const unitDisplay = ind.unitat === '€' ? `/any` : ` ${ind.unitatCurta}/any`;

      html += `
        <div class="kpi-card ${ind.cssClass}">
          <div class="kpi-icon">${ind.icona}</div>
          <div class="kpi-label">${ind.nom}</div>
          <div class="kpi-value">${displayValue}<span class="kpi-unit">${unitDisplay}</span></div>
          ${detall ? `<div class="kpi-detail">${detall}</div>` : ''}
        </div>`;
    }
    grid.innerHTML = html;
  }

  // ===== CONTROLS: Permeten els 8 càlculs diferents requerits =====
  function setupControls() {
    const indicatorSelect = document.getElementById('calc-indicator');
    const modeSelect = document.getElementById('calc-mode');
    const mesIniciSelect = document.getElementById('calc-mes-inici');
    const mesFiSelect = document.getElementById('calc-mes-fi');
    const calcBtn = document.getElementById('calc-btn');
    const periodeControls = document.getElementById('periode-controls');

    // Omplir el selector d'indicadors
    indicatorSelect.innerHTML = '';
    for (const [clau, ind] of Object.entries(indicadors)) {
      const opt = new Option(`${ind.icona} ${ind.nom}`, clau);
      indicatorSelect.add(opt);
    }

    // Omplir els selectors de mesos
    Calculator.MESOS_FULL.forEach((mes, i) => {
      mesIniciSelect.add(new Option(mes, i));
      mesFiSelect.add(new Option(mes, i));
    });

    // Per defecte: Curs escolar (Setembre a Juny)
    mesIniciSelect.value = 8; // Setembre
    mesFiSelect.value = 5;    // Juny

    modeSelect.addEventListener('change', () => {
      currentMode = modeSelect.value;
      periodeControls.style.display = currentMode === 'periode' ? 'contents' : 'none';
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

  // ===== CALCULATE: Genera els resultats segons la selecció =====
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

  // Càlculs anuals (Pròxim any complet)
  function renderAnualResults(ind) {
    renderResultCards(ind, ind.mensual, ind.totalAnual, ind.totalCost, 'Any Complet', ind.mensual.length);
    renderMainChart(ind, ind.mensual);
    renderTable(ind, ind.mensual);
    renderCostDistribution();
  }

  // Càlculs per període (Ex: Setembre a Juny)
  function renderPeriodeResults(ind, mesInici, mesFi) {
    const result = Calculator.calcularPeriode(ind, mesInici, mesFi);
    if (!result) return;

    const title = `${Calculator.MESOS_FULL[mesInici]} — ${Calculator.MESOS_FULL[mesFi]}`;
    renderResultCards(ind, result.periode, result.totals.consum, result.totals.cost, title, result.totals.mesos);
    renderMainChart(ind, result.periode);
    renderTable(ind, result.periode);
    renderCostDistribution();
  }

  // ===== RENDERITZACIÓ DE RESULTATS (Targetes, Gràfics i Taules) =====
  function renderResultCards(ind, data, totalConsum, totalCost, title, mesos) {
    const grid = document.getElementById('results-grid');
    const mitjana = mesos > 0 ? totalConsum / mesos : 0;
    const isMonetary = ind.unitat === '€';

    const consumDisplay = isMonetary
      ? Calculator.formatCurrency(totalConsum)
      : `${Calculator.formatNumber(totalConsum, 1)} <span class="kpi-unit">${ind.unitatCurta}</span>`;

    // Targetes dinàmiques segons el tipus d'indicador
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

    let card4 = '';
    if (ind.id === 'consum_electric_solar') {
      card4 = `
        <div class="result-card">
          <div class="result-header">
            <span class="indicator-tag ${ind.cssClass}">🌍 CO₂</span>
          </div>
          <div class="result-title">CO₂ evitat per solar</div>
          <div class="result-value">${Calculator.formatNumber(ind.totalCO2, 2)} <span class="kpi-unit">tones</span></div>
          <div class="result-detail">Lectiu: ${ind.mitjanaLectiu} kWh/dia · No lectiu: ${ind.mitjanaNoLectiu} kWh/dia</div>
        </div>`;
    } else {
      const fontText = ind.descripcio ? ind.descripcio.substring(0, 80) + '…' : 'Font de dades';
      card4 = `
        <div class="result-card">
          <div class="result-header">
            <span class="indicator-tag ${ind.cssClass}">📄 Font</span>
          </div>
          <div class="result-title">Font de les dades</div>
          <div class="result-value" style="font-size:0.85rem;font-family:Inter;font-weight:500;">${fontText}</div>
          <div class="result-detail">${rawData.font || ''}</div>
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
        <div class="result-title">Cost total projectat</div>
        <div class="result-value">${Calculator.formatCurrency(totalCost)}</div>
        <div class="result-detail">${mesos} mesos · ${Calculator.formatCurrency(totalCost / Math.max(mesos, 1))}/mes</div>
      </div>
      ${card3}
      ${card4}`;
  }

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

    const thead = document.getElementById('table-head');
    if (isElectric) {
      thead.innerHTML = `<tr><th>Mes</th><th>Consum</th><th>Cost</th><th>Solar</th><th>Cobertura</th><th>Nivell</th></tr>`;
    } else {
      thead.innerHTML = `<tr><th>Mes</th><th>Consum</th><th>Cost</th><th>Nivell</th></tr>`;
    }
  }

})();