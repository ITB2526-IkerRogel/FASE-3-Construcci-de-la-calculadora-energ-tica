/**
 * Charts Module — Gràfics per a la Calculadora ITB
 */

let activeCharts = {};

function destroyChart(canvasId) {
  if (activeCharts[canvasId]) {
    activeCharts[canvasId].destroy();
    delete activeCharts[canvasId];
  }
}

const CHART_TOOLTIP = {
  backgroundColor: '#ffffff',
  titleColor: '#111111',
  bodyColor: '#2d4a36',
  borderColor: 'rgba(46, 125, 50, 0.15)',
  borderWidth: 1,
  cornerRadius: 8,
  padding: 12,
  displayColors: false,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

const CHART_SCALES = {
  x: {
    grid: { display: false },
    ticks: { color: '#2d4a36', font: { family: 'Inter', size: 11, weight: 500 } }
  },
  y: {
    grid: { color: 'rgba(46, 125, 50, 0.1)' },
    ticks: {
      color: '#2d4a36',
      font: { family: 'JetBrains Mono', size: 11 },
      callback: function(v) { return Calculator.formatNumber(v); }
    }
  }
};

/**
 * Gràfic de barres mensual per un indicador.
 */
function createMonthlyBarChart(canvasId, data, label, color, unit) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, color + 'cc');
  gradient.addColorStop(1, color + '22');

  activeCharts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.mesAbr),
      datasets: [{
        label: label,
        data: data.map(d => d.consum),
        backgroundColor: gradient,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_TOOLTIP,
          callbacks: {
            label: (ctx) => `${Calculator.formatNumber(ctx.parsed.y, 1)} ${unit}`,
            afterLabel: (ctx) => `Cost: ${Calculator.formatCurrency(data[ctx.dataIndex].cost)}`
          }
        }
      },
      scales: CHART_SCALES,
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Gràfic de barres per electricitat: consum + producció solar.
 */
function createElectricChart(canvasId, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  activeCharts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.mesAbr),
      datasets: [
        {
          label: 'Consum total',
          data: data.map(d => d.consum),
          backgroundColor: '#ffb74d88',
          borderColor: '#ffb74d',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.8
        },
        {
          label: 'Producció solar',
          data: data.map(d => d.produccioSolar || 0),
          backgroundColor: '#66bb6a88',
          borderColor: '#66bb6a',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#111111',
            font: { family: 'Inter', size: 11, weight: 500 },
            boxWidth: 12, boxHeight: 3, padding: 20
          }
        },
        tooltip: {
          ...CHART_TOOLTIP,
          displayColors: true,
          callbacks: {
            afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              if (idx !== undefined && data[idx].coberturaSolar !== undefined) {
                return `Cobertura solar: ${data[idx].coberturaSolar}%`;
              }
            }
          }
        }
      },
      scales: CHART_SCALES,
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Gràfic de distribució de costos.
 */
function createCostDistributionChart(canvasId, indicadors) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = [];
  const values = [];
  const colors = [];

  for (const [_, ind] of Object.entries(indicadors)) {
    labels.push(ind.nom);
    values.push(ind.totalCost);
    colors.push(ind.color);
  }

  activeCharts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'bb'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
        spacing: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#111111',
            font: { family: 'Inter', size: 11, weight: 500 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10
          }
        },
        tooltip: {
          ...CHART_TOOLTIP,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${Calculator.formatCurrency(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Gràfic comparatiu línia: actual vs reduït.
 */
function createComparisonLineChart(canvasId, dataOriginal, dataReduced, label, color, unit) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  activeCharts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataOriginal.map(d => d.mesAbr),
      datasets: [
        {
          label: 'Actual',
          data: dataOriginal.map(d => d.consum),
          borderColor: '#9cb3a3',
          backgroundColor: 'rgba(156, 179, 163, 0.08)',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 3,
          pointBackgroundColor: '#9cb3a3',
          fill: false,
          tension: 0.3
        },
        {
          label: 'Amb millores',
          data: dataReduced.map(d => d.consum),
          borderColor: color,
          backgroundColor: color + '12',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: color,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#111111',
            font: { family: 'Inter', size: 11, weight: 500 },
            boxWidth: 12, boxHeight: 3, padding: 20
          }
        },
        tooltip: {
          ...CHART_TOOLTIP,
          displayColors: true,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Calculator.formatNumber(ctx.parsed.y, 1)} ${unit}`
          }
        }
      },
      scales: CHART_SCALES,
      animation: { duration: 1000, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Gràfic horari d'aigua (per un dia concret).
 */
function createHourlyWaterChart(canvasId, mostraHoraria, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  activeCharts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: mostraHoraria.map(h => h.hora),
      datasets: [{
        label: `Consum ${data}`,
        data: mostraHoraria.map(h => h.litres),
        borderColor: '#42a5f5',
        backgroundColor: 'rgba(66, 165, 245, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#42a5f5',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_TOOLTIP,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} litres`
          }
        }
      },
      scales: {
        ...CHART_SCALES,
        x: {
          ...CHART_SCALES.x,
          ticks: { ...CHART_SCALES.x.ticks, maxRotation: 45 }
        }
      },
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Gràfic de barres apilades per estalvis.
 */
function createSavingsChart(canvasId, indicadors, percentReduccio) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = [];
  const costActual = [];
  const estalvi = [];
  const colors = [];

  for (const [_, ind] of Object.entries(indicadors)) {
    labels.push(ind.nom);
    const est = ind.totalCost * (percentReduccio / 100);
    costActual.push(ind.totalCost - est);
    estalvi.push(est);
    colors.push(ind.color);
  }

  activeCharts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cost amb millores',
          data: costActual,
          backgroundColor: colors.map(c => c + '88'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'Estalvi',
          data: estalvi,
          backgroundColor: '#66bb6a55',
          borderColor: '#66bb6a',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#111111',
            font: { family: 'Inter', size: 11, weight: 500 },
            boxWidth: 12, boxHeight: 3, padding: 20
          }
        },
        tooltip: {
          ...CHART_TOOLTIP,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Calculator.formatCurrency(ctx.parsed.x)}`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(46, 125, 50, 0.08)' },
          ticks: {
            color: '#111111',
            font: { family: 'JetBrains Mono', size: 11 },
            callback: (v) => Calculator.formatCurrency(v)
          }
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#111111', font: { family: 'Inter', size: 12, weight: 600 } }
        }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' }
    }
  });
}

window.Charts = {
  createMonthlyBarChart,
  createElectricChart,
  createCostDistributionChart,
  createComparisonLineChart,
  createHourlyWaterChart,
  createSavingsChart,
  destroyChart
};
