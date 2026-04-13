/**
 * Calculator Engine — Processa dinàmicament el JSON dataclean.json
 * S'adapta a l'estructura de dades real de l'ITB.
 */

const MESOS_LABELS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
const MESOS_FULL = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const DIES_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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
async function carregarDades(url = 'data/dataclean.json') {
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

  // Projectar mensualment amb factors estacionals
  const mensual = DIES_MES.map((dies, i) => {
    const factor = FACTORS_ESCOLA.aigua_est[i];
    const consum = mitjanaDiaria * dies * factor;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum),
      cost: Math.round(consum * 0.00285 * 100) / 100, // ~2.85€/m³ → 0.00285€/L
      unitat: 'L'
    };
  });

  const totalAnual = mensual.reduce((s, m) => s + m.consum, 0);
  const totalCost = mensual.reduce((s, m) => s + m.cost, 0);

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
    mensual,
    totalAnual,
    totalCost: Math.round(totalCost * 100) / 100,
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

  // Classificar dies: lectiu (>300kWh) vs no lectiu (<250kWh)
  const diesLectius = dades.filter(d => d.consum_kWh > 300);
  const diesNoLectius = dades.filter(d => d.consum_kWh <= 300);

  const mitjanaLectiu = diesLectius.reduce((s, d) => s + d.consum_kWh, 0) / Math.max(diesLectius.length, 1);
  const mitjanaNoLectiu = diesNoLectius.reduce((s, d) => s + d.consum_kWh, 0) / Math.max(diesNoLectius.length, 1);
  const mitjanaProduccio = dades.reduce((s, d) => s + d.produccio_kWh, 0) / dades.length;

  // Dies lectius per mes (aprox): 22 dies lectius, ~8 caps de setmana/festius per mes escolar
  const diesLectiusMes = [16, 16, 18, 18, 20, 18, 0, 0, 18, 20, 18, 14];
  const diesNoLectiusMes = DIES_MES.map((d, i) => d - diesLectiusMes[i]);

  const mensual = DIES_MES.map((dies, i) => {
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
      cost: Math.round(consumTotal * 0.18 * 100) / 100, // ~0.18€/kWh
      costNet: Math.round(Math.max(consumTotal - produccioSolar, 0) * 0.18 * 100) / 100,
      coberturaSolar: consumTotal > 0 ? Math.round((Math.min(produccioSolar, consumTotal) / consumTotal) * 1000) / 10 : 0,
      co2Evitat: Math.round(produccioSolar * 0.000478 * 1000) / 1000, // t CO2
      unitat: 'kWh'
    };
  });

  const totalAnual = mensual.reduce((s, m) => s + m.consum, 0);
  const totalSolar = mensual.reduce((s, m) => s + m.produccioSolar, 0);
  const totalCost = mensual.reduce((s, m) => s + m.cost, 0);
  const totalCostNet = mensual.reduce((s, m) => s + m.costNet, 0);
  const totalCO2 = mensual.reduce((s, m) => s + m.co2Evitat, 0);

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
    mensual,
    totalAnual: Math.round(totalAnual),
    totalSolar: Math.round(totalSolar),
    totalCost: Math.round(totalCost * 100) / 100,
    totalCostNet: Math.round(totalCostNet * 100) / 100,
    totalCO2: Math.round(totalCO2 * 100) / 100,
    coberturaMitjana: totalAnual > 0 ? Math.round((totalSolar / totalAnual) * 1000) / 10 : 0,
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

  // Mapa de factures per mes
  const perMes = {};
  factures.forEach(f => {
    const dataF = new Date(f.data);
    const mesKey = dataF.getMonth();
    if (!perMes[mesKey]) perMes[mesKey] = 0;
    perMes[mesKey] += f.total_factura_EUR || 0;
  });

  // Total facturat i mesos amb dades
  const totalFacturat = resum?.total_gastat_EUR || factures.reduce((s, f) => s + (f.total_factura_EUR || 0), 0);

  // Distribució mensual amb factors escola (més activitat set-oct, abr-jun)
  const pesosEscola = [0.08, 0.08, 0.09, 0.10, 0.09, 0.10, 0.02, 0.01, 0.14, 0.12, 0.09, 0.08];
  const anualEstimat = resum?.total_gastat_EUR ? resum.total_gastat_EUR * 2 : totalFacturat * 2; // 6 mesos → 12

  const mensual = pesosEscola.map((pes, i) => {
    const consum = anualEstimat * pes;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum * 100) / 100,
      cost: Math.round(consum * 100) / 100,
      unitat: '€'
    };
  });

  return {
    id: 'consumibles_oficina',
    nom: "Consumibles d'Oficina",
    icona: '📎',
    color: '#9575cd',
    cssClass: 'office',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.consumibles_oficina.descripcio,
    valorBase: Math.round(anualEstimat / 12),
    unitatBase: '€/mes (estimat)',
    paperResmes: resum?.paper_A4_resmes_total,
    retoladors: resum?.retoladors_pissarra_unitats,
    mensual,
    totalAnual: Math.round(anualEstimat * 100) / 100,
    totalCost: Math.round(anualEstimat * 100) / 100,
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
  const anualEstimat = resum?.total_gastat_EUR ? resum.total_gastat_EUR * 2 : 2400;

  const pesosEscola = [0.08, 0.08, 0.09, 0.09, 0.09, 0.10, 0.04, 0.03, 0.12, 0.10, 0.09, 0.09];

  const mensual = pesosEscola.map((pes, i) => {
    const consum = anualEstimat * pes;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum * 100) / 100,
      cost: Math.round(consum * 100) / 100,
      unitat: '€'
    };
  });

  return {
    id: 'productes_neteja',
    nom: 'Productes de Neteja',
    icona: '🧹',
    color: '#66bb6a',
    cssClass: 'cleaning',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.productes_neteja.descripcio,
    valorBase: Math.round(anualEstimat / 12),
    unitatBase: '€/mes (estimat)',
    mensual,
    totalAnual: Math.round(anualEstimat * 100) / 100,
    totalCost: Math.round(anualEstimat * 100) / 100,
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
  const costMensual = resum?.cost_mensual_telecomunicacions_EUR || 80;
  const anualEstimat = resum?.cost_anual_estimat_EUR || costMensual * 12;

  const mensual = DIES_MES.map((_, i) => ({
    mes: MESOS_FULL[i],
    mesAbr: MESOS_LABELS[i],
    index: i,
    consum: costMensual,
    cost: costMensual,
    unitat: '€'
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
    valorBase: costMensual,
    unitatBase: '€/mes',
    mensual,
    totalAnual: anualEstimat,
    totalCost: anualEstimat,
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
  const totalAnual = resum?.total_gastat_manteniment_EUR || 3909.48;
  const categories = resum?.categories || {};

  // Distribució mensual (reparacions concentrades en mesos específics)
  const pesosReparacions = [0.05, 0.05, 0.08, 0.08, 0.15, 0.10, 0.12, 0.05, 0.10, 0.10, 0.07, 0.05];

  const mensual = pesosReparacions.map((pes, i) => {
    const consum = totalAnual * pes;
    return {
      mes: MESOS_FULL[i],
      mesAbr: MESOS_LABELS[i],
      index: i,
      consum: Math.round(consum * 100) / 100,
      cost: Math.round(consum * 100) / 100,
      unitat: '€'
    };
  });

  return {
    id: 'manteniment',
    nom: 'Manteniment',
    icona: '🔧',
    color: '#a1887f',
    cssClass: 'maintenance',
    unitat: '€',
    unitatCurta: '€',
    descripcio: data.manteniment.descripcio,
    valorBase: Math.round(totalAnual / 12),
    unitatBase: '€/mes (estimat)',
    mensual,
    totalAnual: Math.round(totalAnual * 100) / 100,
    totalCost: Math.round(totalAnual * 100) / 100,
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
 * Calcula el consum per un període personalitzat (p.ex. setembre a juny).
 */
function calcularPeriode(indicador, mesInici, mesFi) {
  if (!indicador?.mensual) return null;

  let periodeData = [];
  if (mesInici <= mesFi) {
    periodeData = indicador.mensual.filter(m => m.index >= mesInici && m.index <= mesFi);
  } else {
    periodeData = indicador.mensual.filter(m => m.index >= mesInici || m.index <= mesFi);
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

// ===== EXPORT =====
window.Calculator = {
  carregarDades,
  processarTotsIndicadors,
  calcularPeriode,
  calcularAmbReduccio,
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
  FACTORS_ESCOLA
};
