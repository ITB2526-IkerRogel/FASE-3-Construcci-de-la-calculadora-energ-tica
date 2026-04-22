/**
 * Plan.js — Pla d'acció a 3 anys per la Calculadora ITB.
 * Inclou recàlcul amb millores usant dades actuals i projectades.
 */

(function () {
  'use strict';

  // ===== DYNAMIC YEAR LABELS =====
  const CURRENT_YEAR = new Date().getFullYear();
  const NEXT_YEAR = CURRENT_YEAR + 1;
  const HISTORIC_LABEL = 'Any Històric (2024-25)';
  const PROJECTION_LABEL = `Projecció IPC ${CURRENT_YEAR}-${String(NEXT_YEAR).slice(-2)}`;

  let rawData = null;
  let indicadors = null;

  document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    rawData = await Calculator.carregarDades();

    if (!rawData) {
      document.querySelector('main.container').innerHTML = `
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h2>Error carregant les dades</h2>
          <p>No s'ha pogut carregar el fitxer de dades.</p>
          <code>data/dataclean.json</code>
        </div>`;
      return;
    }

    indicadors = Calculator.processarTotsIndicadors(rawData);
    renderCentreName();
    renderObjectives();
    renderTimeline();
    renderSavingsChart();
    renderComparisonCharts();
    renderComparatives();
    renderProgressBars();
    renderEconomiaCircular();
  });

  function setupNavigation() {
    const hamburger = document.querySelector('.nav-hamburger');
    const links = document.querySelector('.nav-links');
    if (hamburger && links) {
      hamburger.addEventListener('click', () => links.classList.toggle('open'));
    }
  }

  function renderCentreName() {
    const el = document.getElementById('centre-name');
    if (el && rawData.centre) el.textContent = rawData.centre;
  }

  // ===== OBJECTIVES =====
  function renderObjectives() {
    const container = document.getElementById('objectives-list');
    if (!container) return;

    const objectives = [];

    if (indicadors.consum_aigua) {
      const ind = indicadors.consum_aigua;
      objectives.push({
        icona: '💧', bg: 'var(--water-blue-glow)',
        titol: 'Reducció del 30% en consum d\'aigua',
        desc: `Actual: ${Calculator.formatNumber(ind.totalActual)} L/any → Objectiu: ${Calculator.formatNumber(ind.totalActual * 0.7)} L/any. Projecció IPC: ${Calculator.formatNumber(ind.totalAnual)} L/any (+${ind.ipcAplicat}%). Prioritat: eliminar consum nocturn anòmal.`
      });
    }

    if (indicadors.consum_electric_solar) {
      const ind = indicadors.consum_electric_solar;
      objectives.push({
        icona: '⚡', bg: 'var(--solar-amber-glow)',
        titol: 'Reducció del 30% en consum elèctric i augment solar',
        desc: `Actual: ${Calculator.formatNumber(ind.totalActual)} kWh → Objectiu: ${Calculator.formatNumber(ind.totalActual * 0.7)} kWh. Cost actual: ${Calculator.formatCurrency(ind.totalCostActual)} → Projecció IPC: ${Calculator.formatCurrency(ind.totalCost)} (+${ind.ipcAplicat}%). Augmentar cobertura solar del ${ind.coberturaMitjana}% al 30%.`
      });
    }

    if (indicadors.consumibles_oficina) {
      const ind = indicadors.consumibles_oficina;
      objectives.push({
        icona: '📎', bg: 'var(--office-purple-glow)',
        titol: 'Reducció del 30% en consumibles d\'oficina',
        desc: `Actual: ${Calculator.formatCurrency(ind.totalCostActual)} → Objectiu: ${Calculator.formatCurrency(ind.totalCostActual * 0.7)}. Amb IPC (+${ind.ipcAplicat}%): ${Calculator.formatCurrency(ind.totalCost)}. Reduir de 210 a 105 resmes/any.`
      });
    }

    if (indicadors.productes_neteja) {
      const ind = indicadors.productes_neteja;
      objectives.push({
        icona: '🧹', bg: 'var(--clean-green-glow)',
        titol: 'Reducció del 30% en productes de neteja',
        desc: `Actual: ${Calculator.formatCurrency(ind.totalCostActual)} → Objectiu: ${Calculator.formatCurrency(ind.totalCostActual * 0.7)}. Amb IPC (+${ind.ipcAplicat}%): ${Calculator.formatCurrency(ind.totalCost)}. Eliminar paper secamans d'un sol ús.`
      });
    }

    objectives.push({
      icona: '♻️', bg: 'rgba(102, 187, 106, 0.12)',
      titol: 'Economia circular integrada',
      desc: 'Mínim 60% de les accions seguiran principis d\'economia circular: reutilització, reciclatge, productes durables i energia renovable.'
    });

    objectives.push({
      icona: '🌍', bg: 'rgba(66, 165, 245, 0.12)',
      titol: 'Reducció d\'emissions CO₂',
      desc: `Augmentar la producció solar per evitar > 1 tona CO₂/any (actual: ${indicadors.consum_electric_solar?.totalCO2 || 0.44} t CO₂ evitades).`
    });

    container.innerHTML = objectives.map(o => `
      <li class="objective-item fade-in">
        <div class="objective-icon" style="background:${o.bg};">${o.icona}</div>
        <div class="objective-content">
          <h4>${o.titol}</h4>
          <p>${o.desc}</p>
        </div>
      </li>
    `).join('');
  }

  // ===== TIMELINE =====
  function renderTimeline() {
    const container = document.getElementById('timeline');
    if (!container) return;

    const anys = [
      {
        nom: 'Any 1 — Fonaments (2025-2026)',
        objectiu: 10,
        badge: 'y1',
        trimestres: {
          T1: 'Auditoria energètica i hídrica. Reparació fuites (consum nocturn). Aixetes baix cabal als lavabos.',
          T2: 'Il·luminació LED + sensors presència. Configuració impressores doble cara. Productes eco concentrats.',
          T3: 'Cisternes doble descàrrega. Digitalització documental. Dosificadors automàtics. Standby zero aules.',
          T4: 'Avaluació resultats primer any. Ajustos basats en dades del comptador intel·ligent.'
        }
      },
      {
        nom: 'Any 2 — Consolidació (2026-2027)',
        objectiu: 20,
        badge: 'y2',
        trimestres: {
          T1: 'Ampliació instal·lació solar (30→60 kWp). Optimització HVAC amb termòstats intel·ligents.',
          T2: 'Recollida aigua pluvial al terrat. Assecadors d\'aire als lavabos (eliminar paper secamans).',
          T3: 'Compra responsable centralitzada. Sistema microfibra reutilitzable. Retoladors recarregables.',
          T4: 'Seguiment i optimització de tots els sistemes. Formació personal neteja.'
        }
      },
      {
        nom: 'Any 3 — Excel·lència (2027-2028)',
        objectiu: 30,
        badge: 'y3',
        trimestres: {
          T1: 'Consolidació de totes les mesures. Reg per degoteig amb sensors al jardí.',
          T2: 'Optimització avançada basada en dades acumulades. Bateria per autoconsum solar.',
          T3: 'Sol·licitud certificació ambiental del centre (ISO 14001 o EMAS).',
          T4: 'Avaluació final completa. Publicació resultats. Planificació futura 2028-2030.'
        }
      }
    ];

    container.innerHTML = anys.map((any, idx) => `
      <div class="timeline-year fade-in fade-in-delay-${idx + 1}">
        <div class="timeline-marker"></div>
        <div class="year-header">
          <h3>${any.nom}</h3>
          <span class="year-badge ${any.badge}">Objectiu: -${any.objectiu}%</span>
        </div>
        <div class="quarter-grid">
          ${Object.entries(any.trimestres).map(([t, desc]) => `
            <div class="quarter-card">
              <div class="quarter-label">${t}</div>
              <p>${desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ===== SAVINGS CHART =====
  function renderSavingsChart() {
    const mainIndicadors = {};
    ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'].forEach(k => {
      if (indicadors[k]) mainIndicadors[k] = indicadors[k];
    });
    Charts.createSavingsChart('savings-chart', mainIndicadors, 30);
  }

  // ===== COMPARISON LINE CHARTS =====
  function renderComparisonCharts() {
    const container = document.getElementById('indicator-charts');
    if (!container) return;

    const main4 = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];
    let html = '';

    for (const clau of main4) {
      const ind = indicadors[clau];
      if (!ind) continue;
      html += `
        <div class="chart-container fade-in">
          <h3 style="font-size:1rem;font-weight:600;margin-bottom:var(--space-md);">
            ${ind.icona} ${ind.nom} — Actual vs. Amb Millores (-30%)
          </h3>
          <div class="chart-wrapper" style="height:250px;">
            <canvas id="chart-${clau}"></canvas>
          </div>
        </div>`;
    }
    container.innerHTML = html;

    requestAnimationFrame(() => {
      for (const clau of main4) {
        const ind = indicadors[clau];
        if (!ind) continue;
        const reduced = Calculator.calcularAmbReduccio(ind, 30);
        if (reduced) {
          // Reordenar per curs escolar (Set → Ago)
          const mensualEscolar = Calculator.reordenarCursEscolar(ind.mensual);
          const reducedEscolar = Calculator.reordenarCursEscolar(reduced);
          Charts.createComparisonLineChart(`chart-${clau}`, mensualEscolar, reducedEscolar, ind.nom, ind.color, ind.unitatCurta);
        }
      }
    });
  }

  // ===== COMPARATIVES TABLE =====
  function renderComparatives() {
    const container = document.getElementById('comparison-grid');
    if (!container) return;

    const main4 = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];
    let html = '';

    for (const clau of main4) {
      const ind = indicadors[clau];
      if (!ind) continue;

      const isMonetary = ind.unitat === '€';
      // Use actual costs as baseline
      const costActual = ind.totalCostActual;
      const costProjectatIPC = ind.totalCost;
      const costReduït = costActual * 0.7;
      const estalviVsActual = costActual * 0.3;
      const estalviVsIPC = costProjectatIPC - costReduït;

      const consumActual = isMonetary ? ind.totalCostActual : ind.totalActual;
      const consumReduït = consumActual * 0.7;

      html += `
        <div class="comparison-card">
          <h4>${ind.icona} ${ind.nom} — Any 3 (-30%)</h4>
          <div class="comparison-row">
            <span class="label">${HISTORIC_LABEL}</span>
            <span class="values">
              <span class="original">${isMonetary ? Calculator.formatCurrency(consumActual) : Calculator.formatNumber(consumActual) + ' ' + ind.unitatCurta}</span>
            </span>
          </div>
          <div class="comparison-row">
            <span class="label">${PROJECTION_LABEL}</span>
            <span class="values">
              <span style="color:var(--ipc-red);font-weight:600;">${Calculator.formatCurrency(costProjectatIPC)} (+${ind.ipcAplicat}%)</span>
            </span>
          </div>
          <div class="comparison-row">
            <span class="label">Amb reducció -30%</span>
            <span class="values">
              <span class="reduced">${isMonetary ? Calculator.formatCurrency(consumReduït) : Calculator.formatNumber(consumReduït) + ' ' + ind.unitatCurta}</span>
            </span>
          </div>
          <div class="comparison-row">
            <span class="label">Estalvi vs. actual</span>
            <span class="values">
              <span class="saving">⬇ ${Calculator.formatCurrency(estalviVsActual)} (-30%)</span>
            </span>
          </div>
          <div class="comparison-row">
            <span class="label">Estalvi vs. IPC</span>
            <span class="values">
              <span class="saving">⬇ ${Calculator.formatCurrency(estalviVsIPC)}</span>
            </span>
          </div>
        </div>`;
    }
    container.innerHTML = html;
  }

  // ===== PROGRESS BARS =====
  function renderProgressBars() {
    const container = document.getElementById('progress-bars');
    if (!container) return;

    const main4 = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];
    const reduccionsPerAny = { 1: 10, 2: 20, 3: 30 };

    let html = '<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:var(--space-lg);">Progrés de reducció acumulat</h3>';

    for (let any = 1; any <= 3; any++) {
      const pctTarget = reduccionsPerAny[any];
      html += `<p style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-bottom:var(--space-sm);margin-top:var(--space-lg);">ANY ${any} — Objectiu: -${pctTarget}%</p>`;

      for (const clau of main4) {
        const ind = indicadors[clau];
        if (!ind) continue;
        
        const actualCost = ind.totalCostActual;
        const estalvi = actualCost * (pctTarget / 100);
        
        html += `
          <div class="progress-item">
            <div class="progress-label">
              <span>${ind.icona} ${ind.nom}</span>
              <span>-${pctTarget}% (${Calculator.formatCurrency(estalvi)})</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${ind.cssClass}" style="width:${Math.min(pctTarget / 0.35, 100)}%;"></div>
            </div>
          </div>`;
      }
    }
    container.innerHTML = html;
  }

  // ===== ECONOMIA CIRCULAR =====
  function renderEconomiaCircular() {
    const container = document.getElementById('eco-circular');
    if (!container) return;

    const inversions = [1500, 2100, 3200, 5500, 22000, 6500, 800, 4200, 3500, 0, 200, 0, 3600, 300, 1200, 400];
    const inversioTotal = inversions.reduce((s, v) => s + v, 0);

    const main4 = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];
    let estalviActual = 0;
    let estalviIPC = 0;
    main4.forEach(k => {
      if (indicadors[k]) {
        estalviActual += indicadors[k].totalCostActual * 0.3;
        estalviIPC += indicadors[k].totalCost * 0.3;
      }
    });

    const roi = estalviActual > 0 ? (inversioTotal / estalviActual).toFixed(1) : '—';

    container.innerHTML = `
      <div class="info-card">
        <h3>♻️ Principis d'Economia Circular Aplicats</h3>
        <p style="margin-bottom:var(--space-lg);">
          El pla incorpora 10 de 16 accions (62%) basades en principis d'economia circular:
          reducció, reutilització, reciclatge i energies renovables.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-lg);">
          <div class="stat-highlight">
            <div class="big-number green">62%</div>
            <div class="stat-label">Accions circulars</div>
          </div>
          <div class="stat-highlight">
            <div class="big-number blue">${Calculator.formatCurrency(inversioTotal)}</div>
            <div class="stat-label">Inversió total</div>
          </div>
          <div class="stat-highlight">
            <div class="big-number amber">${Calculator.formatCurrency(estalviActual)}</div>
            <div class="stat-label">Estalvi anual vs. actual</div>
          </div>
          <div class="stat-highlight">
            <div class="big-number teal">${roi} anys</div>
            <div class="stat-label">Retorn inversió</div>
          </div>
        </div>
        <div style="margin-top:var(--space-lg);padding:var(--space-md);background:var(--ipc-orange-glow);border-radius:var(--radius-md);border:1px solid rgba(255,143,0,0.15);">
          <p style="font-size:0.8rem;font-weight:600;color:var(--ipc-orange);margin-bottom:4px;">📈 Nota IPC</p>
          <p style="font-size:0.8rem;">Si no s'apliquen les millores, l'augment de costos per IPC seria de ${Calculator.formatCurrency(estalviIPC - estalviActual)} addicionals l'any vinent. Les mesures de reducció no només estalvien sinó que protegeixen contra la inflació.</p>
        </div>
        <ul style="margin-top:var(--space-lg);">
          <li><strong>Reduir:</strong> Menys consum elèctric, d'aigua i material gràcies a la tecnologia i sensibilització.</li>
          <li><strong>Reutilitzar:</strong> Bayetes de microfibra, paper per esborranys, aigua pluvial recollida al terrat.</li>
          <li><strong>Reciclar:</strong> Paper reciclat, retoladors Pilot BEgreen (75% tinta reciclada), gestió residus.</li>
          <li><strong>Renovar:</strong> Energia solar fotovoltaica ampliada, productes ecològics certificats, compra responsable.</li>
        </ul>
      </div>`;
  }

})();
