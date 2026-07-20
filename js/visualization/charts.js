// ============================================================
// MIRSAD — Charts Module
// Chart.js visualizations for all dashboard views
// ============================================================

class ChartManager {
  constructor() {
    this.charts = {};
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#9ba3b5',
            font: { family: "'Inter', sans-serif", size: 11 },
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: 'rgba(19, 24, 41, 0.95)',
          titleColor: '#e8eaf0',
          bodyColor: '#9ba3b5',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: "'Inter', sans-serif", weight: '600', size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7280', font: { family: "'Inter', sans-serif", size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        },
        y: {
          ticks: { color: '#6b7280', font: { family: "'JetBrains Mono', monospace", size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        }
      }
    };
  }

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  }

  // Risk Score Trend Line
  createRiskTrendChart(canvasId, data) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Risk Score',
          data: data.map(d => d.value),
          borderColor: '#ef4444',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ef4444',
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          ...this.defaultOptions.scales,
          y: { 
            ...this.defaultOptions.scales.y,
            min: 0, max: 100,
            ticks: { ...this.defaultOptions.scales.y.ticks, stepSize: 20 }
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  // Import Source Donut
  createImportSourceChart(canvasId, suppliers) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#00b4d8',
      '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
      '#f59e0b', '#64748b', '#a855f7'
    ];

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: suppliers.map(s => s.name),
        datasets: [{
          data: suppliers.map(s => s.india_import_share),
          backgroundColor: colors.slice(0, suppliers.length),
          borderColor: '#131829',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#9ba3b5',
              font: { family: "'Inter', sans-serif", size: 10 },
              padding: 8,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: this.defaultOptions.plugins.tooltip
        }
      }
    });
    return this.charts[canvasId];
  }

  // Scenario Comparison Bar Chart
  createScenarioComparisonChart(canvasId, scenarios) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: scenarios.map(s => s.name),
        datasets: [
          {
            label: 'Brent Price Impact (%)',
            data: scenarios.map(s => s.brent_price_impact_pct),
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'GDP Impact (%)',
            data: scenarios.map(s => Math.abs(s.gdp_impact_pct) * 10),
            backgroundColor: 'rgba(249, 115, 22, 0.7)',
            borderColor: '#f97316',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Refinery Utilization Drop (%)',
            data: scenarios.map(s => s.refinery_utilization_drop_pct),
            backgroundColor: 'rgba(0, 180, 216, 0.7)',
            borderColor: '#00b4d8',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { 
            ...this.defaultOptions.plugins.legend,
            position: 'bottom'
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  // Brent Price Trajectory
  createPriceTrajectoryChart(canvasId, data) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.3)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Brent Crude (USD/bbl)',
          data: data.map(d => d.price),
          borderColor: '#f97316',
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: 1,
          pointHoverRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          ...this.defaultOptions.scales,
          y: {
            ...this.defaultOptions.scales.y,
            ticks: {
              ...this.defaultOptions.scales.y.ticks,
              callback: (val) => '$' + val
            }
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  // GDP Trajectory
  createGDPTrajectoryChart(canvasId, data) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(0, 180, 216, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 180, 216, 0)');

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.quarter),
        datasets: [{
          label: 'GDP ($T, annualized)',
          data: data.map(d => d.gdp_trn),
          borderColor: '#00b4d8',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00b4d8',
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          ...this.defaultOptions.scales,
          y: {
            ...this.defaultOptions.scales.y,
            ticks: {
              ...this.defaultOptions.scales.y.ticks,
              callback: (val) => '$' + val + 'T'
            }
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  // SPR Drawdown Waterfall
  createSPRDrawdownChart(canvasId, data) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => `Day ${d.day}`),
        datasets: [
          {
            label: 'Remaining Stock (MMT)',
            data: data.map(d => d.remaining_stock_mmt),
            borderColor: '#8b5cf6',
            backgroundColor: gradient,
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            borderWidth: 2
          },
          {
            label: 'Daily Release (K bpd)',
            data: data.map(d => d.daily_release_bpd / 1000),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.1,
            pointRadius: 2,
            borderWidth: 2,
            borderDash: [5, 3],
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          ...this.defaultOptions.scales,
          y: {
            ...this.defaultOptions.scales.y,
            position: 'left',
            title: { display: true, text: 'Stock (MMT)', color: '#6b7280', font: { size: 10 } }
          },
          y2: {
            position: 'right',
            ticks: { color: '#6b7280', font: { family: "'JetBrains Mono', monospace", size: 10 } },
            grid: { drawOnChartArea: false },
            border: { color: 'rgba(255,255,255,0.08)' },
            title: { display: true, text: 'Release (K bpd)', color: '#6b7280', font: { size: 10 } }
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  // Refinery Utilization Horizontal Bar
  createRefineryUtilizationChart(canvasId, refineries) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const top10 = refineries.slice(0, 10);

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top10.map(r => r.name.replace(' Refinery', '').replace(' (HPCL)', '')),
        datasets: [
          {
            label: 'Normal Utilization',
            data: top10.map(r => r.normalUtilization),
            backgroundColor: 'rgba(0, 180, 216, 0.3)',
            borderColor: '#00b4d8',
            borderWidth: 1,
            borderRadius: 3
          },
          {
            label: 'Under Disruption',
            data: top10.map(r => r.impactedUtilization),
            backgroundColor: top10.map(r => 
              r.status === 'critical' ? 'rgba(220, 38, 38, 0.7)' :
              r.status === 'stressed' ? 'rgba(249, 115, 22, 0.7)' :
              'rgba(34, 197, 94, 0.7)'
            ),
            borderColor: top10.map(r =>
              r.status === 'critical' ? '#dc2626' :
              r.status === 'stressed' ? '#f97316' :
              '#22c55e'
            ),
            borderWidth: 1,
            borderRadius: 3
          }
        ]
      },
      options: {
        ...this.defaultOptions,
        indexAxis: 'y',
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { 
            ...this.defaultOptions.plugins.legend,
            position: 'bottom'
          }
        },
        scales: {
          x: {
            ...this.defaultOptions.scales.x,
            max: 100,
            title: { display: true, text: 'Utilization %', color: '#6b7280', font: { size: 10 } }
          },
          y: {
            ...this.defaultOptions.scales.y,
            ticks: { ...this.defaultOptions.scales.y.ticks, font: { size: 9 } }
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  // Supply Gap Monthly Projection
  createSupplyGapChart(canvasId, data) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Supply Gap (MMT)',
          data: data.map(d => d.gap_mmt),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { display: false }
        }
      }
    });
    return this.charts[canvasId];
  }

  // Corridor Risk Radar
  createCorridorRiskRadar(canvasId, corridorData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const top6 = corridorData.slice(0, 6);

    this.charts[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: top6.map(c => c.routeName.split('→')[1]?.trim() || c.routeName),
        datasets: [{
          label: 'Risk Score',
          data: top6.map(c => c.composite),
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderColor: '#ef4444',
          borderWidth: 2,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#1a2035',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: this.defaultOptions.plugins.tooltip
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { 
              color: '#6b7280', 
              backdropColor: 'transparent',
              font: { size: 9 },
              stepSize: 25
            },
            grid: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: { 
              color: '#9ba3b5', 
              font: { family: "'Inter', sans-serif", size: 10 }
            }
          }
        }
      }
    });
    return this.charts[canvasId];
  }

  destroyAll() {
    Object.keys(this.charts).forEach(id => this.destroyChart(id));
  }
}

export { ChartManager };
