// ============================================================
// MIRSAD — Main Application
// App initialization, view management, UI rendering
// ============================================================

import { AgentCoordinator } from './agents/agent-coordinator.js';
import { MapEngine } from './visualization/map-engine.js';
import { ChartManager } from './visualization/charts.js';
import { AnimationManager } from './visualization/animations.js';
import { GEOPOLITICAL_EVENTS, EVENT_ICONS } from './data/geopolitical-events.js';
import { SUPPLY_ROUTES } from './data/supply-routes.js';
import { SUPPLIERS, IMPORT_STATS } from './data/suppliers.js';
import { SCENARIOS } from './data/scenarios.js';
import { SPR_SITES, SPR_STATS, DRAWDOWN_STRATEGIES } from './data/spr-data.js';
import { RiskIntelligenceAgent } from './agents/risk-intelligence.js';

class MirsadApp {
  constructor() {
    this.coordinator = new AgentCoordinator();
    this.mapEngine = null;
    this.charts = new ChartManager();
    this.animations = new AnimationManager();
    this.currentView = 'command-center';
    this.pipelineResults = null;
    this.selectedScenario = 'scenario-hormuz-partial';
    this.selectedStrategy = 'strategy-staged';
  }

  async initialize() {
    console.log('<i data-lucide="telescope"></i> MIRSAD — Initializing...');
    
    // Auto-render Lucide icons on DOM changes (debounced to prevent infinite loops)
    let _lucideTimer = null;
    let _lucideRendering = false;
    const observer = new MutationObserver(() => {
      if (_lucideRendering) return; // guard: don't re-trigger while we're replacing icons
      clearTimeout(_lucideTimer);
      _lucideTimer = setTimeout(() => {
        if (window.lucide) {
          _lucideRendering = true;
          try { lucide.createIcons(); } catch(e) { /* ignore */ }
          _lucideRendering = false;
        }
      }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initialize agent coordinator
    const initResult = this.coordinator.initialize();
    console.log('✅ Agents initialized. Risk level:', initResult.riskAssessment.riskLabel);

    // Set up navigation
    this.setupNavigation();

    // Render KPI ticker
    this.renderKPITicker(initResult.riskAssessment);

    // Initialize map
    this.mapEngine = new MapEngine('map-container');
    this.mapEngine.initialize();

    // Render initial view
    this.renderCommandCenter(initResult.riskAssessment);

    // Run full pipeline with default scenario
    this.runPipeline();

    // Fetch backend system status (LLM pool badge)
    this.fetchSystemStatus();

    // Update time
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Simulated live events are now triggered manually via the 'Scan Live Threats' button
    // this.startLiveEventSimulation();

    // Handle global resize
    window.addEventListener('resize', () => {
      if (this.currentView === 'command-center') {
        this.mapEngine?.resize();
      }
    });

    // Initial icon render
    if (window.lucide) {
      lucide.createIcons();
    }
    
    console.log('✅ MIRSAD fully operational.');
  }

  setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchView(view);
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Command Center sidebar tabs
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    sidebarTabs.forEach(sbTab => {
      sbTab.addEventListener('click', () => {
        const targetTab = sbTab.dataset.sidebarTab;
        sidebarTabs.forEach(t => t.classList.remove('active'));
        sbTab.classList.add('active');

        document.querySelectorAll('.sidebar-tab-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        const targetPanel = document.getElementById(`sb-panel-${targetTab}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  switchView(viewId) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(viewId);
    if (panel) {
      panel.classList.add('active');
      this.currentView = viewId;

      // Trigger view-specific rendering
      setTimeout(() => {
        switch (viewId) {
          case 'command-center':
            this.mapEngine?.resize();
            break;
          case 'risk-intel':
            this.renderRiskIntelView();
            break;
          case 'scenarios':
            this.renderScenariosView();
            break;
          case 'procurement':
            this.renderProcurementView();
            break;
          case 'reserves':
            this.renderReservesView();
            break;
        }
      }, 50);
    }
  }

  runPipeline() {
    this.pipelineResults = this.coordinator.runFullPipeline(this.selectedScenario, this.selectedStrategy);
    this.renderPipelineStatus(this.coordinator.pipelineStatus);
    this.renderAuditTrail(this.coordinator.getAuditTrail());
  }

  async runLiveAnalysis() {
    const btn = document.getElementById('btn-live-scan');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Scanning 9-node pipeline...';
    }

    try {
      const data = await this.coordinator.triggerLiveAnalysis('Middle East shipping routes');
      if (data) {
        // Store the full enriched response
        this.lastLiveData = data;

        // Update existing UI
        if (this.pipelineResults) {
          this.pipelineResults.riskAssessment.overallRisk.overall = data.risk_score;
          this.renderCommandCenter(this.pipelineResults.riskAssessment);
          this.renderKPITicker(this.pipelineResults.riskAssessment);
        }

        // Render new sophistication pass UI components
        this.renderMetricsDashboard(data.computed_metrics);
        this.renderTrajectoryForecast(data.trajectory_forecast);
        this.renderSourcesIndicator(data);
        this.updateLLMPoolBadge(data.llm_pool);

        // Show a rich summary instead of basic alert
        const sources = data.sources_consulted || 0;
        const facts = data.rag_info?.facts_retrieved || 0;
        const keys = data.llm_pool?.keys_used || 0;
        alert(
          `✅ MIRSAD v2.0 Analysis Complete!\n\n` +
          `Risk Score: ${data.risk_score}/100\n` +
          `${data.risk_summary?.substring(0, 200)}...\n\n` +
          `📊 ${sources} sources · ${facts} RAG facts · ${keys} LLM keys used\n` +
          `📈 7-day forecast: ${data.trajectory_forecast?.forecast_7d?.direction || '—'}\n` +
          `\nSwitch to Risk Intelligence tab to see full metrics.`
        );
      }
    } catch (error) {
      alert(`Error during live analysis: ${error.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="radio"></i> Scan Live Threats';
      }
      this.renderAuditTrail(this.coordinator.getAuditTrail());
    }
  }

  // ── KPI Ticker ──
  renderKPITicker(assessment) {
    const ticker = document.getElementById('kpi-ticker');
    if (!ticker) return;

    const brentPrice = 82.50;
    const riskScore = assessment.overallRisk.overall;
    const hormuzThreat = assessment.overallRisk.hormuzThreat;
    const sprDays = SPR_STATS.days_of_national_consumption;
    const alertCount = assessment.activeAlerts.filter(a => 
      a.severity === 'critical' || a.severity === 'high'
    ).length;

    ticker.innerHTML = `
      <div class="kpi-item">
        <span class="kpi-item__label">Brent Crude</span>
        <span class="kpi-item__value" id="kpi-brent">$${brentPrice.toFixed(2)}</span>
        <span class="kpi-item__change kpi-item__change--up">▲ 3.2%</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">MIRSAD Risk Index</span>
        <span class="kpi-item__value" id="kpi-risk" style="color: ${RiskIntelligenceAgent.getRiskColor(riskScore)}">${riskScore}/100</span>
        <span class="badge badge--${RiskIntelligenceAgent.getRiskLevel(riskScore)}" style="font-size:9px">${RiskIntelligenceAgent.getRiskLabel(riskScore)}</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">Hormuz Threat</span>
        <span class="kpi-item__value" style="color: ${RiskIntelligenceAgent.getRiskColor(hormuzThreat)}">${hormuzThreat}/100</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">SPR Cover</span>
        <span class="kpi-item__value">${sprDays} days</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">Active Alerts</span>
        <span class="kpi-item__value" style="color: var(--color-risk-high)">${alertCount}</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">Import Dependency</span>
        <span class="kpi-item__value">${IMPORT_STATS.import_dependency_pct}%</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">Hormuz Exposure</span>
        <span class="kpi-item__value" style="color: var(--color-risk-elevated)">${IMPORT_STATS.hormuz_exposure_pct}%</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-item__label">Pipeline Response</span>
        <span class="kpi-item__value" style="color: var(--color-accent-primary)" id="kpi-pipeline-time">—</span>
      </div>
    `;
  }

  // ── Command Center ──
  renderCommandCenter(assessment) {
    this.renderAlertFeed(assessment.activeAlerts);
    this.renderCorridorOverview(assessment.corridorRisks);
    this.renderRiskGauge(assessment.overallRisk.overall);
    this.renderAgentStatuses();
  }

  renderRiskGauge(score) {
    const container = document.getElementById('risk-gauge-container');
    if (!container) return;

    const color = RiskIntelligenceAgent.getRiskColor(score);
    const circumference = 2 * Math.PI * 52;
    const maxDash = circumference * (270 / 360);

    container.innerHTML = `
      <div class="risk-gauge">
        <svg class="risk-gauge__svg" viewBox="0 0 120 120">
          <circle class="risk-gauge__bg" cx="60" cy="60" r="52" />
          <circle class="risk-gauge__fill" cx="60" cy="60" r="52" 
            stroke="${color}" 
            style="stroke-dasharray: ${maxDash} ${circumference}; stroke-dashoffset: ${maxDash}"
            id="risk-gauge-fill" />
        </svg>
        <div class="risk-gauge__value">
          <div class="risk-gauge__number" style="color: ${color}" id="risk-gauge-number">0</div>
          <div class="risk-gauge__label">${RiskIntelligenceAgent.getRiskLabel(score)}</div>
        </div>
      </div>
    `;

    // Animate
    setTimeout(() => {
      this.animations.animateGauge(document.getElementById('risk-gauge-fill'), score);
      this.animations.animateCounter(document.getElementById('risk-gauge-number'), score);
    }, 300);
  }

  renderAlertFeed(alerts) {
    const feed = document.getElementById('alert-feed');
    if (!feed) return;

    const recentAlerts = alerts.slice(0, 15);
    feed.innerHTML = recentAlerts.map(alert => `
      <div class="alert-item alert-item--${alert.severity}" data-alert-id="${alert.id}">
        <div class="alert-item__icon">${EVENT_ICONS[alert.type] || '<i data-lucide="pin"></i>'}</div>
        <div class="alert-item__content">
          <div class="alert-item__title">${alert.title}</div>
          <div class="alert-item__description">${alert.description}</div>
          <div class="alert-item__meta">
            <span class="badge badge--${alert.severity}">${alert.severity}</span>
            <span class="alert-item__time">${this.formatTime(alert.timestamp)}</span>
          </div>
        </div>
      </div>
    `).join('');

    this.animations.staggerEntrance(feed, '.alert-item', { delay: 40 });
  }

  renderCorridorOverview(corridorRisks) {
    const container = document.getElementById('corridor-overview');
    if (!container) return;

    const sorted = Object.values(corridorRisks)
      .sort((a, b) => b.composite - a.composite);

    container.innerHTML = sorted.map(cr => {
      const route = SUPPLY_ROUTES.find(r => r.id === cr.routeId);
      const color = RiskIntelligenceAgent.getRiskColor(cr.composite);
      return `
        <div class="corridor-card" data-corridor="${cr.routeId}">
          <div class="mini-gauge">
            <svg class="mini-gauge__svg" viewBox="0 0 40 40">
              <circle class="mini-gauge__bg" cx="20" cy="20" r="16" />
              <circle class="mini-gauge__fill" cx="20" cy="20" r="16" 
                stroke="${color}"
                style="stroke-dasharray: ${2 * Math.PI * 16 * (cr.composite / 100)} ${2 * Math.PI * 16}; stroke-dashoffset: 0" />
            </svg>
            <span class="mini-gauge__value" style="color: ${color}">${cr.composite}</span>
          </div>
          <div class="corridor-card__info">
            <div class="corridor-card__name">${cr.routeName}</div>
            <div class="corridor-card__detail">${route ? route.annual_volume_mmt + ' MMT/yr' : ''} · ${route ? route.transit_days + 'd transit' : ''}</div>
          </div>
          <span class="badge badge--${RiskIntelligenceAgent.getRiskLevel(cr.composite)}">${RiskIntelligenceAgent.getRiskLevel(cr.composite)}</span>
        </div>
      `;
    }).join('');
  }

  renderAgentStatuses() {
    const container = document.getElementById('agent-statuses');
    if (!container) return;

    const agents = this.coordinator.getAgentStatuses();
    container.innerHTML = agents.map(agent => `
      <div class="agent-status">
        <div class="agent-status__dot"></div>
        <span class="agent-status__name">${agent.name}</span>
        <span class="agent-status__state">Active</span>
      </div>
    `).join('');
  }

  renderPipelineStatus(pipeline) {
    const container = document.getElementById('pipeline-status');
    if (!container) return;

    container.innerHTML = pipeline.stages.map((stage, i) => `
      <div class="pipeline-stage">
        <div class="pipeline-stage__dot pipeline-stage__dot--${stage.status}">
          ${stage.status === 'complete' ? '✓' : stage.icon}
        </div>
        <span class="pipeline-stage__label">${stage.name}</span>
      </div>
      ${i < pipeline.stages.length - 1 ? `<div class="pipeline-stage__connector pipeline-stage__connector--${stage.status === 'complete' ? 'active' : ''}"></div>` : ''}
    `).join('');

    // Update pipeline time in KPI
    const timeEl = document.getElementById('kpi-pipeline-time');
    if (timeEl && pipeline.totalTime) {
      timeEl.textContent = pipeline.totalTime + 'ms';
    }
  }

  renderAuditTrail(entries) {
    const container = document.getElementById('audit-trail');
    if (!container) return;

    container.innerHTML = entries.slice(0, 12).map(entry => `
      <div class="audit-entry">
        <span class="audit-entry__time">${this.formatTimeShort(entry.timestamp)}</span>
        <span class="audit-entry__agent">${entry.agent}</span>
        <span class="audit-entry__action">${entry.details}</span>
      </div>
    `).join('');
  }

  // ── Risk Intelligence View ──
  renderRiskIntelView() {
    if (!this.pipelineResults) return;
    const assessment = this.pipelineResults.riskAssessment;

    // Risk trend chart
    const trendData = GEOPOLITICAL_EVENTS
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((e, i) => ({
        label: new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: Math.min(100, 30 + (e.riskDelta > 0 ? e.riskDelta : 0) + Math.random() * 15 + i * 2)
      }));
    this.charts.createRiskTrendChart('chart-risk-trend', trendData);

    // Import source chart
    const topSuppliers = SUPPLIERS.sort((a, b) => b.india_import_share - a.india_import_share).slice(0, 10);
    this.charts.createImportSourceChart('chart-import-sources', topSuppliers);

    // Corridor risk radar
    const corridorData = this.coordinator.agents.riskIntel.getCorridorsByRisk();
    this.charts.createCorridorRiskRadar('chart-corridor-radar', corridorData);

    // Risk stats
    this.renderRiskStats(assessment);
  }

  renderRiskStats(assessment) {
    const container = document.getElementById('risk-stats');
    if (!container) return;

    const stats = [
      { label: 'Overall Risk', value: assessment.overallRisk.overall, suffix: '/100', color: RiskIntelligenceAgent.getRiskColor(assessment.overallRisk.overall), icon: '<i data-lucide="bar-chart-2"></i>' },
      { label: 'Hormuz Threat', value: assessment.overallRisk.hormuzThreat, suffix: '/100', color: RiskIntelligenceAgent.getRiskColor(assessment.overallRisk.hormuzThreat), icon: '<i data-lucide="swords"></i>' },
      { label: 'Red Sea Threat', value: assessment.overallRisk.redSeaThreat, suffix: '/100', color: RiskIntelligenceAgent.getRiskColor(assessment.overallRisk.redSeaThreat), icon: '<i data-lucide="zap"></i>' },
      { label: 'Sanctions Risk', value: assessment.overallRisk.sanctionsRisk, suffix: '/100', color: RiskIntelligenceAgent.getRiskColor(assessment.overallRisk.sanctionsRisk), icon: '<i data-lucide="ban"></i>' }
    ];

    container.innerHTML = `<div class="dashboard-stats-row">
      ${stats.map(s => `
        <div class="stat-card stat-card--danger">
          <div class="stat-card__header">
            <span class="stat-card__icon">${s.icon}</span>
          </div>
          <div class="stat-card__value" style="color: ${s.color}">${s.value}${s.suffix}</div>
          <div class="stat-card__label">${s.label}</div>
        </div>
      `).join('')}
    </div>`;
  }

  // ── Scenarios View ──
  renderScenariosView() {
    this.renderScenarioSelector();
    if (this.pipelineResults?.scenarioResults) {
      this.renderScenarioResults(this.pipelineResults.scenarioResults);
    }
  }

  renderScenarioSelector() {
    const container = document.getElementById('scenario-selector');
    if (!container) return;

    container.innerHTML = `
      <div class="sidebar-section__title"><i data-lucide="clipboard-list"></i> Select Scenario</div>
      ${SCENARIOS.map(s => `
        <div class="scenario-option ${s.id === this.selectedScenario ? 'selected' : ''}" 
             data-scenario="${s.id}" onclick="window.app.selectScenario('${s.id}')">
          <div class="scenario-option__radio"></div>
          <div>
            <div class="scenario-option__name">${s.icon} ${s.name}</div>
            <div class="scenario-option__desc">${s.category} · P: ${Math.round(s.probability * 100)}% · ${s.duration_days}d</div>
          </div>
        </div>
      `).join('')}
      <button class="btn btn--primary" style="width:100%; margin-top: var(--space-3)" onclick="window.app.runSelectedScenario()">
        <i data-lucide="zap"></i> Run Simulation
      </button>
    `;
  }

  selectScenario(scenarioId) {
    this.selectedScenario = scenarioId;
    document.querySelectorAll('.scenario-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.scenario === scenarioId);
    });
  }

  runSelectedScenario() { console.log("Button clicked!");
    this.pipelineResults = this.coordinator.runFullPipeline(this.selectedScenario, this.selectedStrategy);
    this.renderPipelineStatus(this.coordinator.pipelineStatus);
    this.renderAuditTrail(this.coordinator.getAuditTrail());
    this.renderKPITicker(this.pipelineResults.riskAssessment);
    this.renderScenarioResults(this.pipelineResults.scenarioResults);
  }

  renderScenarioResults(results) {
    if (!results) return;

    // Impact summary
    const impactContainer = document.getElementById('scenario-impact-summary');
    if (impactContainer) {
      impactContainer.innerHTML = `
        <div class="impact-grid">
          <div class="impact-item">
            <div class="impact-item__value">$${results.economicImpact.brent_projected_usd}</div>
            <div class="impact-item__label">Brent Price (USD)</div>
          </div>
          <div class="impact-item">
            <div class="impact-item__value" style="color: var(--color-risk-critical)">${results.economicImpact.gdp_impact_pct}%</div>
            <div class="impact-item__label">GDP Impact</div>
          </div>
          <div class="impact-item">
            <div class="impact-item__value">${results.supplyGap.daily_gap_bpd.toLocaleString()}</div>
            <div class="impact-item__label">Supply Gap (bpd)</div>
          </div>
          <div class="impact-item">
            <div class="impact-item__value">+$${results.economicImpact.import_bill_increase_usd_bn}B</div>
            <div class="impact-item__label">Import Bill Increase</div>
          </div>
          <div class="impact-item">
            <div class="impact-item__value">+₹${results.fuelPriceImpact.petrol.increase_inr}</div>
            <div class="impact-item__label">Petrol Price/L</div>
          </div>
          <div class="impact-item">
            <div class="impact-item__value">${results.sprCoverage.days_of_cover}d</div>
            <div class="impact-item__label">SPR Cover</div>
          </div>
        </div>
      `;
    }

    // Charts
    this.charts.createPriceTrajectoryChart('chart-price-trajectory', results.priceTrajectory);
    this.charts.createGDPTrajectoryChart('chart-gdp-trajectory', results.gdpTrajectory);
    this.charts.createRefineryUtilizationChart('chart-refinery-impact', results.refineryImpact.refineries);
    this.charts.createSupplyGapChart('chart-supply-gap', results.supplyGap.monthly_projection);

    // Assumptions
    const assumptionsContainer = document.getElementById('scenario-assumptions');
    if (assumptionsContainer) {
      assumptionsContainer.innerHTML = results.assumptions.map(a => `
        <div class="assumption-tag">ℹ️ ${a}</div>
      `).join('');
    }

    // Timeline
    const timelineContainer = document.getElementById('scenario-timeline');
    if (timelineContainer) {
      timelineContainer.innerHTML = `<div class="timeline">
        ${results.timeline.map((t, i) => `
          <div class="timeline__item ${i === 0 ? 'timeline__item--danger' : i === results.timeline.length - 1 ? 'timeline__item--active' : ''}">
            <div style="font-size: var(--font-size-xs); color: var(--color-accent-primary); font-family: var(--font-family-mono); margin-bottom: 2px">Day ${t.day}</div>
            <div style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 2px">${t.event}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">${t.impact}</div>
          </div>
        `).join('')}
      </div>`;
    }
  }

  // ── Procurement View ──
  renderProcurementView() {
    if (!this.pipelineResults?.procurementOutput) return;
    const output = this.pipelineResults.procurementOutput;

    // Header stats
    const headerEl = document.getElementById('procurement-header');
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="section-header">
          <div class="section-header__title">
            <span class="icon"><i data-lucide="ship"></i></span>
            <h2>Procurement Recommendations</h2>
          </div>
          <div class="section-header__actions">
            <div class="response-time">
              <span class="response-time__icon"><i data-lucide="zap"></i></span>
              Signal → Recommendation: ${this.pipelineResults.processingTime}ms
            </div>
          </div>
        </div>
        <div class="dashboard-stats-row" style="margin-bottom: var(--space-4)">
          <div class="stat-card stat-card--accent">
            <div class="stat-card__value">${output.total_alternatives}</div>
            <div class="stat-card__label">Alternatives Found</div>
          </div>
          <div class="stat-card stat-card--success">
            <div class="stat-card__value">${output.gap_recoverable_pct}%</div>
            <div class="stat-card__label">Gap Recoverable</div>
          </div>
          <div class="stat-card stat-card--warning">
            <div class="stat-card__value">${output.fastest_delivery_days}d</div>
            <div class="stat-card__label">Fastest Delivery</div>
          </div>
          <div class="stat-card stat-card--danger">
            <div class="stat-card__value">${output.supply_gap_bpd.toLocaleString()}</div>
            <div class="stat-card__label">Supply Gap (bpd)</div>
          </div>
        </div>
      `;
    }

    // Recommendation cards
    const gridEl = document.getElementById('procurement-grid');
    if (gridEl) {
      gridEl.innerHTML = output.recommendations.slice(0, 8).map(rec => {
        const feasColor = rec.feasibility_score >= 70 ? 'var(--color-success)' :
                          rec.feasibility_score >= 50 ? 'var(--color-warning)' : 'var(--color-risk-high)';
        return `
          <div class="procurement-card">
            <div class="procurement-card__header">
              <div class="procurement-card__rank">${rec.rank}</div>
              <div>
                <div class="procurement-card__title">${rec.supplier.flag} ${rec.supplier.name}</div>
                <div class="procurement-card__subtitle">${rec.supplier.region} · ${rec.supplier.crude_grades.slice(0, 2).join(', ')}</div>
              </div>
              <span class="badge badge--${rec.recommendation_level === 'highly-recommended' ? 'low' : rec.recommendation_level === 'recommended' ? 'moderate' : 'elevated'}">${rec.recommendation_level}</span>
            </div>
            <div class="procurement-card__metrics">
              <div class="procurement-card__metric">
                <div class="procurement-card__metric-value">${(rec.available_volume_bpd / 1000).toFixed(0)}K</div>
                <div class="procurement-card__metric-label">Avail. (bpd)</div>
              </div>
              <div class="procurement-card__metric">
                <div class="procurement-card__metric-value">$${rec.total_delivered_cost_usd}</div>
                <div class="procurement-card__metric-label">Delivered $/bbl</div>
              </div>
              <div class="procurement-card__metric">
                <div class="procurement-card__metric-value">${rec.time_to_first_barrel_days}d</div>
                <div class="procurement-card__metric-label">First Barrel</div>
              </div>
              <div class="procurement-card__metric">
                <div class="procurement-card__metric-value">${rec.gap_coverage_pct}%</div>
                <div class="procurement-card__metric-label">Gap Cover</div>
              </div>
            </div>
            <div class="procurement-card__feasibility">
              <div style="display:flex; justify-content:space-between; font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                <span>Feasibility Score</span>
                <span style="color: ${feasColor}; font-weight: 600; font-family: var(--font-family-mono)">${rec.feasibility_score}/100</span>
              </div>
              <div class="feasibility-bar">
                <div class="feasibility-bar__fill" style="width: ${rec.feasibility_score}%; background: ${feasColor}"></div>
              </div>
            </div>
            <div class="procurement-card__actions">
              <button class="btn btn--sm btn--primary" style="flex:1">Execute Order</button>
              <button class="btn btn--sm" style="flex:1">View Details</button>
            </div>
          </div>
        `;
      }).join('');

      this.animations.staggerEntrance(gridEl, '.procurement-card', { delay: 80, translateY: 20 });
    }
  }

  // ── Reserves View ──
  renderReservesView() {
    if (!this.pipelineResults?.reservePlan) return;
    const plan = this.pipelineResults.reservePlan;

    // SPR sites
    const sitesContainer = document.getElementById('spr-sites');
    if (sitesContainer) {
      sitesContainer.innerHTML = plan.siteSchedules.map(site => {
        const fillColor = site.status === 'critical' ? 'var(--color-risk-high)' :
                         site.status === 'strained' ? 'var(--color-warning)' : 'var(--color-accent-primary)';
        return `
          <div class="spr-site">
            <div class="spr-site__icon"><i data-lucide="database"></i></div>
            <div class="spr-site__info">
              <div class="spr-site__name">${site.site_name}</div>
              <div class="spr-site__capacity">${site.capacity_mmt} MMT capacity · ${(site.planned_drawdown_bpd / 1000).toFixed(0)}K bpd release</div>
            </div>
            <div class="spr-site__level">
              <div class="spr-site__level-value" style="color: ${fillColor}">${site.current_fill_pct}%</div>
              <div class="spr-site__level-bar">
                <div class="spr-site__level-fill" style="width: ${site.current_fill_pct}%; background: ${fillColor}"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Strategy selector
    const strategyContainer = document.getElementById('strategy-selector');
    if (strategyContainer) {
      strategyContainer.innerHTML = plan.allStrategies.map(s => `
        <div class="scenario-option ${s.isSelected ? 'selected' : ''}" 
             data-strategy="${s.id}" onclick="window.app.selectStrategy('${s.id}')">
          <div class="scenario-option__radio"></div>
          <div>
            <div class="scenario-option__name">${s.name}</div>
            <div class="scenario-option__desc">${s.daysOfCover} days cover · ${s.gapCoverage}% gap coverage</div>
          </div>
        </div>
      `).join('');
    }

    // Coverage analysis
    const coverageContainer = document.getElementById('coverage-analysis');
    if (coverageContainer) {
      const ca = plan.coverageAnalysis;
      coverageContainer.innerHTML = `
        <div class="dashboard-stats-row">
          <div class="stat-card stat-card--accent">
            <div class="stat-card__value">${ca.days_of_cover}</div>
            <div class="stat-card__label">Days of Cover</div>
          </div>
          <div class="stat-card ${ca.sufficient ? 'stat-card--success' : 'stat-card--danger'}">
            <div class="stat-card__value">${ca.supply_gap_coverage_pct}%</div>
            <div class="stat-card__label">Gap Coverage</div>
          </div>
          <div class="stat-card stat-card--warning">
            <div class="stat-card__value">${ca.remaining_after_pct}%</div>
            <div class="stat-card__label">Remaining After</div>
          </div>
        </div>
        <div style="padding: var(--space-3); background: ${ca.sufficient ? 'var(--color-success-bg)' : 'var(--color-error-bg)'}; border-radius: var(--radius-lg); margin-top: var(--space-3); font-size: var(--font-size-sm);">
          ${ca.verdict}
        </div>
      `;
    }

    // SPR drawdown chart
    this.charts.createSPRDrawdownChart('chart-spr-drawdown', plan.dailyProfile);

    // Recommendations
    const recsContainer = document.getElementById('reserve-recommendations');
    if (recsContainer) {
      recsContainer.innerHTML = plan.recommendations.map(r => `
        <div class="alert-item alert-item--${r.priority === 'critical' ? 'critical' : r.priority === 'high' ? 'high' : 'moderate'}">
          <div class="alert-item__icon">${r.priority === 'critical' ? '<i data-lucide="siren"></i>' : r.priority === 'high' ? '<i data-lucide="alert-triangle"></i>' : 'ℹ️'}</div>
          <div class="alert-item__content">
            <div class="alert-item__title" style="font-size: var(--font-size-sm)">${r.text}</div>
          </div>
        </div>
      `).join('');
    }

    // Benchmark comparison
    const benchmarkContainer = document.getElementById('spr-benchmarks');
    if (benchmarkContainer) {
      const benchmarks = SPR_STATS.benchmarks;
      benchmarkContainer.innerHTML = Object.entries(benchmarks).map(([key, days]) => {
        const name = key.replace('_spr_days', '').replace('_', ' ').replace('iea recommendation', 'IEA Target').toUpperCase();
        const barWidth = Math.min(100, (days / 150) * 100);
        const isIndia = false;
        return `
          <div style="margin-bottom: var(--space-2)">
            <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); margin-bottom: 4px">
              <span style="color: var(--color-text-secondary)">${name}</span>
              <span style="font-family: var(--font-family-mono); font-weight: 600">${days}d</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width: ${barWidth}%"></div>
            </div>
          </div>
        `;
      }).join('') + `
        <div style="margin-bottom: var(--space-2)">
          <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); margin-bottom: 4px">
            <span style="color: var(--color-risk-high); font-weight: 600">INDIA</span>
            <span style="font-family: var(--font-family-mono); font-weight: 600; color: var(--color-risk-high)">${SPR_STATS.days_of_national_consumption}d</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill progress-bar__fill--danger" style="width: ${(SPR_STATS.days_of_national_consumption / 150) * 100}%"></div>
          </div>
        </div>
      `;
    }
  }

  selectStrategy(strategyId) {
    this.selectedStrategy = strategyId;
    // Re-run reserve optimization with new strategy
    if (this.pipelineResults?.scenarioResults) {
      this.pipelineResults.reservePlan = this.coordinator.agents.reserveOptimizer.optimize(
        this.pipelineResults.scenarioResults, strategyId
      );
      this.renderReservesView();
    }
  }

  // ── Live Event Simulation ──
  startLiveEventSimulation() {
    // Simulate new events appearing
    const futureEvents = [
      {
        type: 'maritime',
        category: 'Live Intelligence',
        title: 'VLCC "Arabian Pearl" deviation detected near Hormuz',
        description: 'AIS tracking shows VLCC Arabian Pearl (320K DWT, UAE flag) making unexpected course change 40nm from Strait of Hormuz. Vessel was carrying Murban crude to Mangalore.',
        severity: 'moderate',
        affectedCorridors: ['hormuz-mangalore'],
        affectedSuppliers: ['uae'],
        source: 'AIS Intelligence',
        priceImpact: 0.5,
        riskDelta: 5
      },
      {
        type: 'sanctions',
        category: 'Regulatory Update',
        title: 'India MoPNG issues emergency crude diversification directive',
        description: 'Ministry of Petroleum & Natural Gas issues directive to all PSU refiners to maintain minimum 30% non-Hormuz crude sourcing by Q4 2026.',
        severity: 'low',
        affectedCorridors: [],
        affectedSuppliers: [],
        source: 'MoPNG Gazette',
        priceImpact: -0.3,
        riskDelta: -3
      }
    ];

    let eventIndex = 0;
    setInterval(() => {
      if (eventIndex < futureEvents.length) {
        const event = {
          ...futureEvents[eventIndex],
          id: `live-${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        this.coordinator.processEvent(event);
        eventIndex++;

        // Update alerts if on command center
        if (this.currentView === 'command-center') {
          const assessment = this.coordinator.agents.riskIntel.getFullAssessment();
          this.renderAlertFeed(assessment.activeAlerts);
        }
      }
    }, 15000); // New event every 15 seconds
  }

  // ══════════════════════════════════════════════════
  // SOPHISTICATION PASS: New Rendering Methods
  // ══════════════════════════════════════════════════

  // ── Quantitative Metrics Dashboard (SSI, HHI, DoA, PSI) ──
  renderMetricsDashboard(metrics) {
    const container = document.getElementById('metrics-dashboard');
    if (!container || !metrics) return;

    const ssi = metrics.supply_security_index || {};
    const hhi = metrics.hhi_concentration || {};
    const doa = metrics.days_of_autonomy || {};
    const psi = metrics.price_sensitivity_index || {};

    const metricCards = [
      {
        name: 'Supply Security Index',
        value: ssi.value ?? '—',
        unit: '/100',
        color: ssi.color || 'blue',
        level: ssi.level || '—',
        formula: ssi.formula || '',
        interpretation: ssi.interpretation || '',
        components: ssi.components
      },
      {
        name: 'Supplier Concentration (HHI)',
        value: hhi.value ?? '—',
        unit: '',
        color: hhi.color || 'blue',
        level: hhi.level || '—',
        formula: hhi.formula || '',
        interpretation: hhi.interpretation || '',
        extra: hhi.top_3_share ? `Top 3: ${(hhi.top_3_share * 100).toFixed(1)}%` : ''
      },
      {
        name: 'Days of Autonomy',
        value: doa.value ?? '—',
        unit: ' days',
        color: doa.color || 'blue',
        level: doa.level || '—',
        formula: doa.formula || '',
        interpretation: doa.interpretation || '',
        breakdown: doa.breakdown
      },
      {
        name: 'Price Sensitivity Index',
        value: psi.value ?? '—',
        unit: ' ₹/L per $/bbl',
        color: psi.color || 'blue',
        level: psi.level || '—',
        formula: psi.formula || '',
        interpretation: psi.interpretation || ''
      }
    ];

    container.innerHTML = metricCards.map(m => `
      <div class="metric-card metric-card--${m.color}">
        <div class="metric-card__header">
          <span class="metric-card__name">${m.name}</span>
          <span class="metric-card__badge metric-card__badge--${m.color}">${m.level}</span>
        </div>
        <div class="metric-card__value metric-card__value--${m.color}">${m.value}${m.unit}</div>
        ${m.extra ? `<div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">${m.extra}</div>` : ''}
        ${m.breakdown ? `<div style="font-size: 10px; color: var(--color-text-tertiary); margin-bottom: 4px;">
          SPR: ${m.breakdown.spr_days}d · Transit: ${m.breakdown.transit_days}d · Contracted: ${m.breakdown.contracted_days}d
        </div>` : ''}
        ${m.components ? `<div style="font-size: 10px; color: var(--color-text-tertiary); margin-bottom: 4px;">
          SPR: ${m.components.spr_cover}% · Diversity: ${m.components.supplier_diversity}% · Routes: ${m.components.route_diversity}%
        </div>` : ''}
        <div class="metric-card__formula">${m.formula}</div>
        <div class="metric-card__interpretation">${m.interpretation}</div>
      </div>
    `).join('');
  }

  // ── Predictive Risk Trajectory (7/30-day forecast) ──
  renderTrajectoryForecast(forecast) {
    const container = document.getElementById('trajectory-forecast');
    if (!container || !forecast) return;

    const f7 = forecast.forecast_7d || {};
    const f30 = forecast.forecast_30d || {};
    const signals = forecast.signal_components || {};

    const dirIcon = (dir) => dir === 'increasing' ? '↗' : dir === 'decreasing' ? '↘' : '→';
    const dirColor = (dir) => dir === 'increasing' ? '#ef4444' : dir === 'decreasing' ? '#10b981' : '#f59e0b';

    container.innerHTML = `
      <div class="trajectory-card">
        <div class="trajectory-card__title">
          <i data-lucide="clock"></i> Current Risk Score
        </div>
        <div class="trajectory-card__score" style="color: ${dirColor(f7.direction)}">${forecast.current_score}/100</div>
        <div class="signal-components">
          <span class="signal-chip ${signals.event_momentum > 0 ? 'signal-chip--positive' : 'signal-chip--negative'}">
            Events: ${signals.event_momentum > 0 ? '+' : ''}${signals.event_momentum}
          </span>
          <span class="signal-chip ${signals.vessel_signal > 0 ? 'signal-chip--positive' : 'signal-chip--negative'}">
            AIS: ${signals.vessel_signal > 0 ? '+' : ''}${signals.vessel_signal}
          </span>
          <span class="signal-chip ${signals.commodity_signal > 0 ? 'signal-chip--positive' : 'signal-chip--negative'}">
            Oil: ${signals.commodity_signal > 0 ? '+' : ''}${signals.commodity_signal}
          </span>
        </div>
      </div>

      <div class="trajectory-card">
        <div class="trajectory-card__title">
          <i data-lucide="calendar"></i> 7-Day Forecast
        </div>
        <div style="display: flex; align-items: baseline; gap: 12px;">
          <div class="trajectory-card__score" style="color: ${dirColor(f7.direction)}">${f7.predicted_score ?? '—'}</div>
          <span class="trajectory-card__direction trajectory-card__direction--${f7.direction || 'stable'}">
            ${dirIcon(f7.direction)} ${f7.direction || 'stable'} (±${f7.magnitude || 0})
          </span>
        </div>
        <div class="trajectory-card__confidence">
          Confidence: ${((f7.confidence || 0) * 100).toFixed(0)}%
          <div class="confidence-bar"><div class="confidence-bar__fill" style="width: ${(f7.confidence || 0) * 100}%"></div></div>
        </div>
      </div>

      <div class="trajectory-card">
        <div class="trajectory-card__title">
          <i data-lucide="calendar"></i> 30-Day Forecast
        </div>
        <div style="display: flex; align-items: baseline; gap: 12px;">
          <div class="trajectory-card__score" style="color: ${dirColor(f30.direction)}">${f30.predicted_score ?? '—'}</div>
          <span class="trajectory-card__direction trajectory-card__direction--${f30.direction || 'stable'}">
            ${dirIcon(f30.direction)} ${f30.direction || 'stable'} (±${f30.magnitude || 0})
          </span>
        </div>
        <div class="trajectory-card__confidence">
          Confidence: ${((f30.confidence || 0) * 100).toFixed(0)}%
          <div class="confidence-bar"><div class="confidence-bar__fill" style="width: ${(f30.confidence || 0) * 100}%"></div></div>
        </div>
      </div>
    `;
  }

  // ── Sources Consulted & RAG Grounding ──
  renderSourcesIndicator(data) {
    const container = document.getElementById('sources-indicator');
    if (!container) return;

    const sources = data.sources_consulted || 0;
    const rag = data.rag_info || {};
    const llmPool = data.llm_pool || {};
    const vessel = data.vessel_signals || [];
    const commodity = data.commodity_prices || {};
    const citations = data.citations || [];

    const factsHtml = (rag.top_facts || []).map(f => `
      <div class="fact-item">
        <span class="fact-item__score">${(f.relevance * 100).toFixed(0)}%</span>
        <div>
          <div class="fact-item__text">${f.text}</div>
          <div class="fact-item__source">${f.source}</div>
        </div>
      </div>
    `).join('');

    const vesselHtml = vessel.length ? `
      <div style="margin-top: var(--space-2)">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: var(--space-2)">
          <i data-lucide="anchor" style="width:12px;height:12px"></i> Chokepoint AIS Signals
        </div>
        <div class="vessel-signals">
          ${vessel.slice(0, 5).map(v => `
            <div class="vessel-chip">
              <div class="vessel-chip__dot vessel-chip__dot--${v.congestion_level}"></div>
              <div>
                <div style="font-weight: 600;">${v.chokepoint_name}</div>
                <div style="font-size: 10px; color: var(--color-text-tertiary)">
                  ${v.transit_count_24h}/${v.avg_transit_count_24h} transits · ${v.deviation_pct > 0 ? '+' : ''}${v.deviation_pct}%
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const brent = commodity.brent || {};
    const commodityHtml = brent.current_price ? `
      <div style="margin-top: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-surface-2); border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); font-size: var(--font-size-xs);">
        <span style="font-weight: 600;">🛢️ Brent:</span> $${brent.current_price}
        <span style="color: ${brent.change_7d_pct > 0 ? '#ef4444' : '#10b981'}; margin-left: 8px;">
          ${brent.change_7d_pct > 0 ? '▲' : '▼'} ${Math.abs(brent.change_7d_pct)}% (7d)
        </span>
        <span style="color: var(--color-text-tertiary); margin-left: 8px;">Vol: ${brent.volatility_30d}%</span>
        <span style="color: var(--color-text-tertiary); margin-left: 8px;">Source: ${commodity.source}</span>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="sources-summary">
        <div class="source-stat">
          <span class="source-stat__value">${sources}</span>
          <span class="source-stat__label">Sources Consulted</span>
        </div>
        <div class="source-stat">
          <span class="source-stat__value">${rag.facts_retrieved || 0}</span>
          <span class="source-stat__label">Facts Retrieved</span>
        </div>
        <div class="source-stat">
          <span class="source-stat__value">${llmPool.keys_used || 0}</span>
          <span class="source-stat__label">LLM Keys Used</span>
        </div>
        <div class="source-stat">
          <span class="source-stat__value">${llmPool.total_calls || 0}</span>
          <span class="source-stat__label">LLM Calls Made</span>
        </div>
        <div class="source-stat">
          <span class="source-stat__value">${data.articles_analyzed || 0}</span>
          <span class="source-stat__label">Articles Analyzed</span>
        </div>
        <div class="source-stat">
          <span class="source-stat__value" style="font-size: 14px;">${rag.fact_store_backend || '—'}</span>
          <span class="source-stat__label">Vector Backend</span>
        </div>
      </div>
      ${commodityHtml}
      ${vesselHtml}
      ${factsHtml ? `
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: var(--space-2);">
            <i data-lucide="book-open" style="width:12px;height:12px"></i> Top Retrieved Facts (RAG)
          </div>
          <div class="facts-list">${factsHtml}</div>
        </div>
      ` : ''}
      ${citations.length ? `
        <div style="font-size: 10px; color: var(--color-text-tertiary); margin-top: var(--space-2);">
          Citations: ${citations.join(' · ')}
        </div>
      ` : ''}
    `;
  }

  // ── LLM Pool Health Badge (Top Bar) ──
  updateLLMPoolBadge(poolData) {
    const badge = document.getElementById('llm-pool-badge');
    const text = document.getElementById('llm-pool-text');
    if (!badge || !text) return;

    if (!poolData) {
      text.textContent = 'LLM Pool: —';
      return;
    }

    const poolStatus = poolData.pool_status || [];
    const total = poolStatus.length;
    const healthy = poolStatus.filter(c => c.status === 'healthy').length;

    text.textContent = `LLM Pool: ${healthy}/${total} healthy`;

    badge.classList.remove('llm-pool-badge--degraded', 'llm-pool-badge--down');
    if (healthy === 0) {
      badge.classList.add('llm-pool-badge--down');
    } else if (healthy < total) {
      badge.classList.add('llm-pool-badge--degraded');
    }

    // Build tooltip with per-key details
    const details = poolStatus.map(c =>
      `${c.provider}/${c.model}: ${c.status} (${c.requests_today}/${c.daily_limit} today)`
    ).join('\n');
    badge.title = `LLM Key Rotation Pool\n${details}`;
  }

  // Fetch system status on init to populate LLM badge
  async fetchSystemStatus() {
    try {
      const response = await fetch('http://localhost:8000/api/system-status');
      if (response.ok) {
        const status = await response.json();
        this.updateLLMPoolBadge(status.llm_pool);
      }
    } catch (e) {
      // Backend not running — leave badge as-is
    }
  }

  // ── Utilities ──
  updateClock() {
    const el = document.getElementById('system-clock');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + ' IST';
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }) + 
           ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatTimeShort(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MirsadApp();
  window.app.initialize();
});

export { MirsadApp };
