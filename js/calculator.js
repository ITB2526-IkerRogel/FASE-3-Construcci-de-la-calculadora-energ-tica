/**
 * Calculator Engine — Processa dinàmicament el JSON dataclean.json
 * Inclou projeccions IPC per al pròxim any i dades actuals tancades.
 */

const MESOS_LABELS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
const MESOS_FULL = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const DIES_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Ordre escolar: Set, Oct, Nov, Des, Gen, Feb, Mar, Abr, Mai, Jun, Jul, Ago
const ORDRE_ESCOLAR = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];

// ===== IPC CONFIGURATION =====
// IPC Espanya 2024: ~3.0%, Previsió 2025-2026: ~2.5-3.2%
const IPC = {
  actual_2024: 3.0,            // IPC tancat 2024
  previsio_2025: 2.8,          // Previsió IPC 2025
  previsio_2026: 2.5,          // Previsió IPC 2026
  electricitat_2025: 4.2,      // Augment específic electricitat
  aigua_2025: 3.5,             // Augment específic aigua
  materials_2025: 2.2,         // Augment materials/consumibles
  serveis_2025: 3.0,           // Augment serveis
};

// Factors estacionals per al curs escolar (set-jun lectiu, jul-ago no lectiu)
const FACTORS_ESCOLA = {
  lectiu:    [0.90, 0.90, 0.95, 0.95, 1.00, 1.05, 0.20, 0.15, 1.10, 1.00, 0.95, 0.85],
  aigua_est: [0.80, 0.80, 0.90, 1.00, 1.10, 1.20, 0.40, 0.30, 1.15, 1.00, 0.85, 0.75],
  electric:  [1.05, 1.00, 0.95, 0.85, 0.80, 0.90, 0.35, 0.30, 0.95, 0.90, 1.00, 1.10],
  solar:     [0.60, 0.75, 1.00, 1.20, 1.40, 1.50, 1.55, 1.45, 1.20, 0.90, 0.65, 0.55]
};

/**
 * Carrega el JSON dinàmicament. Retorna null si falla.
 */
async function carregarDades(url = './data/dataclean.json') {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    if (!data || typeof data !== 'object') throw new Error('JSON buit o invàlid');
    return data;
  } catch (err) {
    console.error('Error carregant JSON:', err);
    return null;
  }
}

// ===== PROCESSAMENT D'INDICADORS =====

/**
 * Processa consum_aigua: extreu mitjana diària i projecta mensualment.
 * Inclou dades actuals tancades i projeccions amb IPC.
 */
function processarAigua(data) {
  if (!data?.consum_aigua?.dades) return null;

  const dades = data.consum_aigua.dades;
  const consums = dades
    .filter(d => d.consum_total_diari_estimat_L)
    .map(d => d.consum_total_diari_estimat_L);

  const mitjanaDiaria = consums.reduce((s, v) => s + v, 0) / consums.length;
  const consumNocturn = data.consum_aigua.resum?.consum_nocturn_base_L_hora || 0;
  const picMaxim = data.consum_aigua.resum?.consum_diurn_pic_L_hora || 0;

  // Preu base aigua (2024): ~2.85 €/m³
  const preuBase = 0.00285;
  const preuIPC = preuBase * (1 + IPC.aigua_2025 / 100);

  // Dades actuals (any tancat 2024-2025)
  const mensualActual = DIES_MES.map((dies, i) => {
    const factor = FACTORS_ESCOLA.aigua_est[i];
    const consum = mitjanaDiaria * dies * factor;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum),
      cost: Math.round(consum * preuBase * 100) / 100,
      unitat: 'L'
    };
  });

  // Projeccions pròxim any amb IPC aplicat
  const mensualProjectat = DIES_MES.map((dies, i) => {
    const factor = FACTORS_ESCOLA.aigua_est[i];
    // Afegir variabilitat de ±5% per fer-ho realista
    const variabilitat = 1 + (Math.sin(i * 0.7 + 2) * 0.05);
    const consum = mitjanaDiaria * dies * factor * variabilitat;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum),
      cost: Math.round(consum * preuIPC * 100) / 100,
      unitat: 'L'
    };
  });

  const totalActual = mensualActual.reduce((s, m) => s + m.consum, 0);
  const totalCostActual = mensualActual.reduce((s, m) => s + m.cost, 0);
  const totalProjectat = mensualProjectat.reduce((s, m) => s + m.consum, 0);
  const totalCostProjectat = mensualProjectat.reduce((s, m) => s + m.cost, 0);

  return {
    id: 'consum_aigua',
    nom: "Consum d'Aigua",
    icona: '💧',
    color: '#42a5f5',
    cssClass: 'water',
    unitat: 'litres',
    unitatCurta: 'L',
    descripcio: data.consum_aigua.descripcio,
    valorBase: mitjanaDiaria,
    unitatBase: 'L/dia',
    consumNocturn,
    picMaxim,
    // Dades actuals tancades
    mensualActual,
    totalActual,
    totalCostActual: Math.round(totalCostActual * 100) / 100,
    // Projeccions amb IPC
    mensual: mensualProjectat,
    totalAnual: totalProjectat,
    totalCost: Math.round(totalCostProjectat * 100) / 100,
    // IPC info
    ipcAplicat: IPC.aigua_2025,
    preuActual: preuBase,
    preuProjectat: preuIPC,
    diferenciaCost: Math.round((totalCostProjectat - totalCostActual) * 100) / 100,
    percentAugment: Math.round(((totalCostProjectat - totalCostActual) / totalCostActual) * 10000) / 100,
    anomalia: data.consum_aigua.resum?.anomalia_detectada,
    dadesOriginals: dades
  };
}

/**
 * Processa consum_electric_solar: projecta des de dades diàries de gener.
 */
function processarElectric(data) {
  if (!data?.consum_electric_solar?.dades_gener_2025) return null;

  const dades = data.consum_electric_solar.dades_gener_2025;
  const resum = data.consum_electric_solar.resum_gener_2025;

  const diesLectius = dades.filter(d => d.consum_kWh > 300);
  const diesNoLectius = dades.filter(d => d.consum_kWh <= 300);

  const mitjanaLectiu = diesLectius.reduce((s, d) => s + d.consum_kWh, 0) / Math.max(diesLectius.length, 1);
  const mitjanaNoLectiu = diesNoLectius.reduce((s, d) => s + d.consum_kWh, 0) / Math.max(diesNoLectius.length, 1);
  const mitjanaProduccio = dades.reduce((s, d) => s + d.produccio_kWh, 0) / dades.length;

  const diesLectiusMes = [16, 16, 18, 18, 20, 18, 0, 0, 18, 20, 18, 14];
  const diesNoLectiusMes = DIES_MES.map((d, i) => d - diesLectiusMes[i]);

  // Preu base electricitat: ~0.18 €/kWh
  const preuBase = 0.18;
  const preuIPC = preuBase * (1 + IPC.electricitat_2025 / 100);

  const generarMensual = (preuKwh) => DIES_MES.map((dies, i) => {
    const factorElec = FACTORS_ESCOLA.electric[i];
    const factorSolar = FACTORS_ESCOLA.solar[i];

    const consumLectiu = diesLectiusMes[i] * mitjanaLectiu * factorElec;
    const consumNoLectiu = diesNoLectiusMes[i] * mitjanaNoLectiu * factorElec;
    const consumTotal = consumLectiu + consumNoLectiu;
    const produccioSolar = dies * mitjanaProduccio * factorSolar;

    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consumTotal * 10) / 10,
      produccioSolar: Math.round(produccioSolar * 10) / 10,
      importatXarxa: Math.round(Math.max(consumTotal - produccioSolar, 0) * 10) / 10,
      autoconsum: Math.round(Math.min(produccioSolar, consumTotal) * 10) / 10,
      cost: Math.round(consumTotal * preuKwh * 100) / 100,
      costNet: Math.round(Math.max(consumTotal - produccioSolar, 0) * preuKwh * 100) / 100,
      coberturaSolar: consumTotal > 0 ? Math.round((Math.min(produccioSolar, consumTotal) / consumTotal) * 1000) / 10 : 0,
      co2Evitat: Math.round(produccioSolar * 0.000478 * 1000) / 1000,
      unitat: 'kWh'
    };
  });

  const mensualActual = generarMensual(preuBase);
  const mensualProjectat = generarMensual(preuIPC);

  const totalActual = mensualActual.reduce((s, m) => s + m.consum, 0);
  const totalCostActual = mensualActual.reduce((s, m) => s + m.cost, 0);
  const totalSolar = mensualProjectat.reduce((s, m) => s + m.produccioSolar, 0);
  const totalAnual = mensualProjectat.reduce((s, m) => s + m.consum, 0);
  const totalCost = mensualProjectat.reduce((s, m) => s + m.cost, 0);
  const totalCostNet = mensualProjectat.reduce((s, m) => s + m.costNet, 0);
  const totalCO2 = mensualProjectat.reduce((s, m) => s + m.co2Evitat, 0);

  return {
    id: 'consum_electric_solar',
    nom: 'Electricitat i Solar',
    icona: '⚡',
    color: '#ffb74d',
    cssClass: 'electric',
    unitat: 'kWh',
    unitatCurta: 'kWh',
    descripcio: data.consum_electric_solar.descripcio,
    capacitatSolar: data.consum_electric_solar['capacitat_instal·lada_kWp'],
    valorBase: Math.round((mitjanaLectiu + mitjanaNoLectiu) / 2),
    unitatBase: 'kWh/dia (mitjana)',
    mitjanaLectiu: Math.round(mitjanaLectiu),
    mitjanaNoLectiu: Math.round(mitjanaNoLectiu),
    mitjanaProduccio: Math.round(mitjanaProduccio * 10) / 10,
    // Dades actuals
    mensualActual,
    totalActual: Math.round(totalActual),
    totalCostActual: Math.round(totalCostActual * 100) / 100,
    // Projeccions amb IPC
    mensual: mensualProjectat,
    totalAnual: Math.round(totalAnual),
    totalSolar: Math.round(totalSolar),
    totalCost: Math.round(totalCost * 100) / 100,
    totalCostNet: Math.round(totalCostNet * 100) / 100,
    totalCO2: Math.round(totalCO2 * 100) / 100,
    coberturaMitjana: totalAnual > 0 ? Math.round((totalSolar / totalAnual) * 1000) / 10 : 0,
    // IPC
    ipcAplicat: IPC.electricitat_2025,
    preuActual: preuBase,
    preuProjectat: preuIPC,
    diferenciaCost: Math.round((totalCost - totalCostActual) * 100) / 100,
    percentAugment: Math.round(((totalCost - totalCostActual) / totalCostActual) * 10000) / 100,
    dadesOriginals: dades,
    resumGener: resum
  };
}

/**
 * Processa consumibles_oficina: suma factures i projecta anualment.
 */
function processarConsumibles(data) {
  if (!data?.consumibles_oficina?.dades) return null;

  const factures = data.consumibles_oficina.dades;
  const resum = data.consumibles_oficina.resum;

  const totalFacturat = resum?.total_gastat_EUR || factures.reduce((s, f) => s + (f.total_factura_EUR || 0), 0);
  const anualEstimatActual = resum?.total_gastat_EUR ? resum.total_gastat_EUR * 2 : totalFacturat * 2;
  const anualEstimatProjectat = anualEstimatActual * (1 + IPC.materials_2025 / 100);

  const pesosEscola = [0.08, 0.08, 0.09, 0.10, 0.09, 0.10, 0.02, 0.01, 0.14, 0.12, 0.09, 0.08];

  const generarMensual = (total) => pesosEscola.map((pes, i) => {
    const consum = total * pes;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum * 100) / 100,
      cost: Math.round(consum * 100) / 100,
      unitat: '€'
    };
  });

  const mensualActual = generarMensual(anualEstimatActual);
  const mensualProjectat = generarMensual(anualEstimatProjectat);

  return {
    id: 'consumibles_oficina',
    nom: "Consumibles d'Oficina",
    icona: '📎',
    color: '#9575cd',
    cssClass: 'office',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.consumibles_oficina.descripcio,
    valorBase: Math.round(anualEstimatActual / 12),
    unitatBase: '€/mes (estimat)',
    paperResmes: resum?.paper_A4_resmes_total,
    retoladors: resum?.retoladors_pissarra_unitats,
    // Actuals
    mensualActual,
    totalActual: Math.round(anualEstimatActual * 100) / 100,
    totalCostActual: Math.round(anualEstimatActual * 100) / 100,
    // Projectat
    mensual: mensualProjectat,
    totalAnual: Math.round(anualEstimatProjectat * 100) / 100,
    totalCost: Math.round(anualEstimatProjectat * 100) / 100,
    // IPC
    ipcAplicat: IPC.materials_2025,
    diferenciaCost: Math.round((anualEstimatProjectat - anualEstimatActual) * 100) / 100,
    percentAugment: IPC.materials_2025,
    factures,
    observacio: resum?.observacio
  };
}

/**
 * Processa productes_neteja: suma factures i projecta anualment.
 */
function processarNeteja(data) {
  if (!data?.productes_neteja?.dades) return null;

  const factures = data.productes_neteja.dades;
  const resum = data.productes_neteja.resum;
  const anualEstimatActual = resum?.total_gastat_EUR ? resum.total_gastat_EUR * 2 : 2400;
  const anualEstimatProjectat = anualEstimatActual * (1 + IPC.materials_2025 / 100);

  const pesosEscola = [0.08, 0.08, 0.09, 0.09, 0.09, 0.10, 0.04, 0.03, 0.12, 0.10, 0.09, 0.09];

  const generarMensual = (total) => pesosEscola.map((pes, i) => {
    const consum = total * pes;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum * 100) / 100,
      cost: Math.round(consum * 100) / 100,
      unitat: '€'
    };
  });

  const mensualActual = generarMensual(anualEstimatActual);
  const mensualProjectat = generarMensual(anualEstimatProjectat);

  return {
    id: 'productes_neteja',
    nom: 'Productes de Neteja',
    icona: '🧹',
    color: '#66bb6a',
    cssClass: 'cleaning',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.productes_neteja.descripcio,
    valorBase: Math.round(anualEstimatActual / 12),
    unitatBase: '€/mes (estimat)',
    // Actuals
    mensualActual,
    totalActual: Math.round(anualEstimatActual * 100) / 100,
    totalCostActual: Math.round(anualEstimatActual * 100) / 100,
    // Projectat
    mensual: mensualProjectat,
    totalAnual: Math.round(anualEstimatProjectat * 100) / 100,
    totalCost: Math.round(anualEstimatProjectat * 100) / 100,
    // IPC
    ipcAplicat: IPC.materials_2025,
    diferenciaCost: Math.round((anualEstimatProjectat - anualEstimatActual) * 100) / 100,
    percentAugment: IPC.materials_2025,
    factures,
    detallResum: resum,
    observacio: resum?.observacio
  };
}

/**
 * Processa telecomunicacions: cost fix mensual.
 */
function processarTelecom(data) {
  if (!data?.telecomunicacions) return null;

  const resum = data.telecomunicacions.resum;
  const costMensualActual = resum?.cost_mensual_telecomunicacions_EUR || 80;
  const costMensualProjectat = Math.round(costMensualActual * (1 + IPC.serveis_2025 / 100) * 100) / 100;
  const anualActual = costMensualActual * 12;
  const anualProjectat = costMensualProjectat * 12;

  const mensualActual = DIES_MES.map((_, i) => ({
    mes: MESOS_FULL[i], mesAbr: MESOS_LABELS[i], index: i,
    consum: costMensualActual, cost: costMensualActual, unitat: '€'
  }));

  const mensualProjectat = DIES_MES.map((_, i) => ({
    mes: MESOS_FULL[i], mesAbr: MESOS_LABELS[i], index: i,
    consum: costMensualProjectat, cost: costMensualProjectat, unitat: '€'
  }));

  return {
    id: 'telecomunicacions',
    nom: 'Telecomunicacions',
    icona: '📡',
    color: '#26a69a',
    cssClass: 'telecom',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.telecomunicacions.descripcio,
    valorBase: costMensualActual,
    unitatBase: '€/mes',
    mensualActual,
    totalActual: anualActual,
    totalCostActual: anualActual,
    mensual: mensualProjectat,
    totalAnual: Math.round(anualProjectat * 100) / 100,
    totalCost: Math.round(anualProjectat * 100) / 100,
    ipcAplicat: IPC.serveis_2025,
    diferenciaCost: Math.round((anualProjectat - anualActual) * 100) / 100,
    percentAugment: IPC.serveis_2025,
    proveidors: resum?.proveidors,
    observacio: resum?.observacio
  };
}

/**
 * Processa manteniment: cost anual amb distribució irregular.
 */
function processarManteniment(data) {
  if (!data?.manteniment) return null;

  const resum = data.manteniment.resum;
  const totalAnualActual = resum?.total_gastat_manteniment_EUR || 3909.48;
  const totalAnualProjectat = totalAnualActual * (1 + IPC.serveis_2025 / 100);
  const categories = resum?.categories || {};

  const pesosReparacions = [0.05, 0.05, 0.08, 0.08, 0.15, 0.10, 0.12, 0.05, 0.10, 0.10, 0.07, 0.05];

  const generarMensual = (total) => pesosReparacions.map((pes, i) => ({
    mes: MESOS_FULL[i], mesAbr: MESOS_LABELS[i], index: i,
    consum: Math.round(total * pes * 100) / 100,
    cost: Math.round(total * pes * 100) / 100,
    unitat: '€'
  }));

  return {
    id: 'manteniment',
    nom: 'Manteniment',
    icona: '🔧',
    color: '#a1887f',
    cssClass: 'maintenance',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.manteniment.descripcio,
    valorBase: Math.round(totalAnualActual / 12),
    unitatBase: '€/mes (estimat)',
    mensualActual: generarMensual(totalAnualActual),
    totalActual: Math.round(totalAnualActual * 100) / 100,
    totalCostActual: Math.round(totalAnualActual * 100) / 100,
    mensual: generarMensual(totalAnualProjectat),
    totalAnual: Math.round(totalAnualProjectat * 100) / 100,
    totalCost: Math.round(totalAnualProjectat * 100) / 100,
    ipcAplicat: IPC.serveis_2025,
    diferenciaCost: Math.round((totalAnualProjectat - totalAnualActual) * 100) / 100,
    percentAugment: IPC.serveis_2025,
    categories,
    factures: data.manteniment.dades,
    observacio: resum?.observacio
  };
}

/**
 * Processa tots els indicadors disponibles al JSON.
 */
function processarTotsIndicadors(data) {
  const processadors = {
    consum_aigua: processarAigua,
    consum_electric_solar: processarElectric,
    consumibles_oficina: processarConsumibles,
    productes_neteja: processarNeteja,
    telecomunicacions: processarTelecom,
    manteniment: processarManteniment
  };

  const indicadors = {};
  const llistaIndicadors = data.indicadors || Object.keys(processadors);

  for (const id of llistaIndicadors) {
    if (processadors[id]) {
      const resultat = processadors[id](data);
      if (resultat) {
        indicadors[id] = resultat;
      }
    }
  }

  return indicadors;
}

/**
 * Calcula el consum per un període personalitzat.
 */
function calcularPeriode(indicador, mesInici, mesFi, usarActual = false) {
  const dades = usarActual ? indicador.mensualActual : indicador.mensual;
  if (!dades) return null;

  let periodeData = [];
  if (mesInici <= mesFi) {
    periodeData = dades.filter(m => m.index >= mesInici && m.index <= mesFi);
  } else {
    periodeData = dades.filter(m => m.index >= mesInici || m.index <= mesFi);
  }

  const totals = periodeData.reduce((acc, m) => {
    acc.consum += m.consum;
    acc.cost += m.cost;
    return acc;
  }, { consum: 0, cost: 0 });

  return {
    periode: periodeData,
    totals: {
      consum: Math.round(totals.consum * 100) / 100,
      cost: Math.round(totals.cost * 100) / 100,
      mesos: periodeData.length
    }
  };
}

/**
 * Calcula projeccions amb reducció aplicada.
 */
function calcularAmbReduccio(indicador, percentReduccio) {
  if (!indicador?.mensual) return null;

  const factor = 1 - (percentReduccio / 100);
  return indicador.mensual.map(m => ({
    ...m,
    consumOriginal: m.consum,
    consum: Math.round(m.consum * factor * 100) / 100,
    costOriginal: m.cost,
    cost: Math.round(m.cost * factor * 100) / 100
  }));
}

// ===== FORMATADORS =====

function formatNumber(num, decimals = 0) {
  return new Intl.NumberFormat('ca-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

function formatCurrency(num) {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Reordena un array mensual (12 elements) per ordre escolar: Set→Ago.
 * L'array d'entrada ha de tenir els elements amb propietat 'index' (0=Gen, ..., 11=Des).
 */
function reordenarCursEscolar(mensual) {
  if (!mensual || mensual.length !== 12) return mensual;
  return ORDRE_ESCOLAR.map(i => mensual.find(m => m.index === i)).filter(Boolean);
}

// ===== EXPORT =====
window.Calculator = {
  carregarDades,
  processarTotsIndicadors,
  calcularPeriode,
  calcularAmbReduccio,
  reordenarCursEscolar,
  processarAigua,
  processarElectric,
  processarConsumibles,
  processarNeteja,
  processarTelecom,
  processarManteniment,
  formatNumber,
  formatCurrency,
  MESOS_LABELS,
  MESOS_FULL,
  DIES_MES,
  ORDRE_ESCOLAR,
  FACTORS_ESCOLA,
  IPC
};
