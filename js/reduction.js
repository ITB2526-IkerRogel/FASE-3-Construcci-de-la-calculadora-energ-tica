/**
 * Reduction.js — Pàgina d'estratègies de reducció per la Calculadora ITB.
 * Inclou les dades actuals i projectades per cada indicador.
 */

(function () {
  'use strict';

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
    renderReductionCards();
    renderTips();
    renderODS();
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

  function renderReductionCards() {
    const grid = document.getElementById('reduction-grid');
    if (!grid) return;

    const accions = {
      consum_aigua: {
        accions: [
          { nom: 'Eliminació consum nocturn', desc: 'Investigar i reparar possibles fuites detectades (consum nocturn ~160 L/h constant). Pot estalviar >3.800 L/dia.', reduccio: 25, inversio: 1500, circular: false },
          { nom: 'Aixetes de baix cabal amb polsador', desc: 'Instal·lar reductors de cabal i polsadors temporitzats a tots els lavabos del centre.', reduccio: 15, inversio: 2100, circular: false },
          { nom: 'Cisternes doble descàrrega', desc: 'Substituir cisternes convencionals per models de doble descàrrega (3/6L).', reduccio: 10, inversio: 3200, circular: false },
          { nom: 'Recollida d\'aigua pluvial', desc: 'Sistema de recollida al terrat per a reg del jardí i neteja exterior.', reduccio: 8, inversio: 5500, circular: true }
        ]
      },
      consum_electric_solar: {
        accions: [
          { nom: 'Ampliació panells solars', desc: `Ampliar de ${rawData.consum_electric_solar?.['capacitat_instal·lada_kWp'] || 30.94} kWp a 60 kWp per cobrir fins al 25-30% del consum.`, reduccio: 15, inversio: 22000, circular: true },
          { nom: 'Il·luminació LED + sensors', desc: 'Substituir fluorescents per LED i instal·lar sensors de presència a zones comunes.', reduccio: 12, inversio: 6500, circular: true },
          { nom: 'Standby zero a les aules', desc: 'Regletes amb interruptor i apagada programada dels equips fora d\'horari lectiu.', reduccio: 8, inversio: 800, circular: false },
          { nom: 'Optimització HVAC', desc: 'Termòstats intel·ligents i programació adaptada als horaris reals de les aules.', reduccio: 10, inversio: 4200, circular: false }
        ]
      },
      consumibles_oficina: {
        accions: [
          { nom: 'Digitalització documental', desc: `Reduir les ${rawData.consumibles_oficina?.resum?.paper_A4_resmes_total || 105} resmes semestrals amb gestió documental digital i pissarres digitals.`, reduccio: 20, inversio: 3500, circular: true },
          { nom: 'Impressió a doble cara per defecte', desc: 'Configurar totes les impressores en mode doble cara i escala de grisos per defecte.', reduccio: 8, inversio: 0, circular: true },
          { nom: 'Retoladors recarregables', desc: `Els ${rawData.consumibles_oficina?.resum?.retoladors_pissarra_unitats || 185} retoladors BEgreen ja són eco. Assegurar reciclatge complet dels cartutxos.`, reduccio: 5, inversio: 200, circular: true },
          { nom: 'Compra responsable centralitzada', desc: 'Centralitzar comandes a Lyreco trimestralment per reduir costos i enviaments.', reduccio: 5, inversio: 0, circular: true }
        ]
      },
      productes_neteja: {
        accions: [
          { nom: 'Assecadors d\'aire elèctrics', desc: 'Substituir paper secamans per assecadors d\'aire. Elimina 15 fardos/any (~273€ + impacte ambiental).', reduccio: 15, inversio: 3600, circular: true },
          { nom: 'Productes concentrats ecològics', desc: 'Canviar a productes de neteja ecològics concentrats: redueix envasos un 70%.', reduccio: 10, inversio: 300, circular: true },
          { nom: 'Dosificadors automàtics', desc: 'Dosificadors per sabó i productes de neteja per evitar malbaratament.', reduccio: 8, inversio: 1200, circular: false },
          { nom: 'Microfibra reutilitzable', desc: 'Substituir material d\'un sol ús per bayetes de microfibra reutilitzables.', reduccio: 7, inversio: 400, circular: true }
        ]
      }
    };

    let html = '';
    const indicadorsAmbAccions = ['consum_aigua', 'consum_electric_solar', 'consumibles_oficina', 'productes_neteja'];

    for (const clau of indicadorsAmbAccions) {
      const ind = indicadors[clau];
      if (!ind) continue;
      const accio = accions[clau];
      if (!accio) continue;

      const totalReduccio = accio.accions.reduce((s, a) => s + a.reduccio, 0);

      // Calcular estalvi real basat en IPC projectat
      const estalviAnual = ind.totalCost * (totalReduccio / 100);

      html += `
        <div class="reduction-card">
          <div class="reduction-card-header">
            <div class="icon-wrapper ${ind.cssClass}">${ind.icona}</div>
            <div>
              <h3>${ind.nom}</h3>
              <p style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
                ${accio.accions.length} accions · Potencial: -${totalReduccio}% · Estalvi: ${Calculator.formatCurrency(estalviAnual)}/any
              </p>
            </div>
          </div>
          <div class="reduction-card-body">
            ${accio.accions.map((a, i) => `
              <div class="action-item">
                <div class="action-number">${i + 1}</div>
                <div class="action-content">
                  <h4>${a.nom}</h4>
                  <p>${a.desc}</p>
                  <div class="action-meta">
                    <span>📉 -${a.reduccio}%</span>
                    <span>💰 ${a.inversio > 0 ? Calculator.formatCurrency(a.inversio) : 'Sense cost'}</span>
                    ${a.circular ? '<span class="eco-badge">♻️ Economia circular</span>' : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }
    grid.innerHTML = html;
  }

  function renderTips() {
    const container = document.getElementById('tips-container');
    if (!container) return;

    const tips = [
      {
        icona: '💧', titol: 'Reduir consum d\'aigua',
        consells: [
          'Investigar el consum nocturn constant de ~160 L/h detectat al comptador intel·ligent.',
          'Revisar canonades del centre per possibles fuites (una fuita pot perdre 30 L/dia).',
          'Instal·lar temporitzadors a les aixetes dels lavabos.',
          'Conscienciar alumnes sobre l\'ús responsable de l\'aigua amb cartells i campanyes.',
          'Reutilitzar aigua de neteja per al reg del jardí.',
          'Implementar reg per degoteig amb sensors d\'humitat als espais verds.'
        ]
      },
      {
        icona: '⚡', titol: 'Reduir consum elèctric',
        consells: [
          'Apagar tots els equips completament fora d\'horari lectiu (diferència >400 kWh vs ~160 kWh).',
          'Maximitzar l\'autoconsum solar (actual 11.88%) amb bateries o canvi d\'horaris d\'ús intensiu.',
          'Programar climatització adaptada als horaris reals d\'ús de les aules.',
          'Aprofitar la llum natural a les aules amb persianes i cortines adequades.',
          'Manteniment preventiu trimestral de l\'HVAC per evitar avaries costoses.',
          'Considerar ampliar la instal·lació fotovoltaica actual de 30.94 kWp.'
        ]
      },
      {
        icona: '📎', titol: 'Reduir consumibles',
        consells: [
          'Promoure l\'ús de plataformes digitals (Moodle, Google Classroom) per reduir impressions.',
          'Configurar impressió a doble cara i escala de grisos per defecte a totes les impressores.',
          'Reutilitzar fulls impresos per una cara com a esborranys.',
          'Establir sistema de préstec de material entre departaments.',
          'Prioritzar productes eco com els retoladors Pilot BEgreen (75% tinta reciclada).',
          'Centralitzar comandes trimestrals per reduir enviaments i obtenir descomptes.'
        ]
      },
      {
        icona: '🧹', titol: 'Reduir productes de neteja',
        consells: [
          'Substituir paper secamans per assecadors d\'aire: major estalvi a llarg termini.',
          'Comprar productes de neteja a granel i concentrats per reduir envasos plàstics.',
          'Formar el personal de neteja en dosificació correcta dels productes.',
          'Establir protocols de neteja diferenciats segons espai i nivell d\'ús.',
          'Implementar inventari digital per controlar estocs i evitar sobrecompres.',
          'Considerar productes ecològics amb certificació ambiental.'
        ]
      }
    ];

    container.innerHTML = tips.map(t => `
      <div class="info-card fade-in">
        <h3>${t.icona} ${t.titol}</h3>
        <ul>${t.consells.map(c => `<li>${c}</li>`).join('')}</ul>
      </div>
    `).join('');
  }

  function renderODS() {
    const container = document.getElementById('ods-container');
    if (!container || !rawData.indicadors_resum) return;

    const inds = rawData.indicadors_resum.indicadors || [];
    let html = '<div class="info-card"><h3>🌍 Objectius de Desenvolupament Sostenible (ODS)</h3><div style="margin-top:var(--space-md);">';

    inds.forEach(ind => {
      const ods = ind.ODS_relacionat || [];
      html += `<div style="margin-bottom:var(--space-md);"><strong style="font-size:0.85rem;">${ind.nom}</strong><div style="margin-top:4px;">`;
      ods.forEach(o => {
        html += `<span class="ods-badge">${o}</span> `;
      });
      html += `</div></div>`;
    });

    html += '</div></div>';
    container.innerHTML = html;
  }

})();
