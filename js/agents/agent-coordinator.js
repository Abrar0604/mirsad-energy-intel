// ============================================================
// MIRSAD — Agent Coordinator
// Multi-agent orchestration and pipeline management
// ============================================================

import { RiskIntelligenceAgent } from './risk-intelligence.js';
import { ScenarioModeller } from './scenario-modeller.js';
import { ProcurementOrchestrator } from './procurement-orchestrator.js';
import { ReserveOptimizer } from './reserve-optimizer.js';

class AgentCoordinator {
  constructor() {
    this.name = 'MIRSAD Coordinator';
    this.id = 'agent-coordinator';
    
    // Initialize all agents
    this.agents = {
      riskIntel: new RiskIntelligenceAgent(),
      scenarioModeller: new ScenarioModeller(),
      procurement: new ProcurementOrchestrator(),
      reserveOptimizer: new ReserveOptimizer()
    };
    
    this.pipelineStatus = {
      stages: [
        { id: 'signal', name: 'Signal Detection', status: 'idle', icon: '<i data-lucide="radio"></i>' },
        { id: 'risk', name: 'Risk Assessment', status: 'idle', icon: '<i data-lucide="bar-chart-2"></i>' },
        { id: 'scenario', name: 'Scenario Analysis', status: 'idle', icon: '<i data-lucide="activity"></i>' },
        { id: 'procurement', name: 'Procurement', status: 'idle', icon: '<i data-lucide="ship"></i>' },
        { id: 'reserve', name: 'Reserve Plan', status: 'idle', icon: '<i data-lucide="database"></i>' }
      ],
      lastRun: null,
      totalTime: 0
    };
    
    this.auditTrail = [];
    this.listeners = [];
    this.lastFullRun = null;
    this.activeFetchController = null;
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  addAuditEntry(agent, action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent,
      action,
      details
    };
    this.auditTrail.unshift(entry);
    if (this.auditTrail.length > 100) {
      this.auditTrail = this.auditTrail.slice(0, 100);
    }
    return entry;
  }

  updateStageStatus(stageId, status) {
    const stage = this.pipelineStatus.stages.find(s => s.id === stageId);
    if (stage) {
      stage.status = status;
      stage.timestamp = new Date().toISOString();
    }
    this.notify({ type: 'pipeline-update', pipeline: this.pipelineStatus });
  }

  // Initialize the entire system
  initialize() {
    this.addAuditEntry('Coordinator', 'INIT', 'System initialization started');
    
    // Initialize Risk Intelligence
    this.updateStageStatus('signal', 'active');
    this.updateStageStatus('risk', 'active');
    const riskAssessment = this.agents.riskIntel.initialize();
    this.updateStageStatus('signal', 'complete');
    this.updateStageStatus('risk', 'complete');
    this.addAuditEntry('Risk Intel', 'ASSESSED', 
      `Overall risk: ${riskAssessment.riskLabel} (${riskAssessment.overallRisk.overall}/100)`);
    
    this.addAuditEntry('Coordinator', 'INIT', 'System initialization complete');
    
    return {
      riskAssessment,
      agents: this.getAgentStatuses(),
      pipeline: this.pipelineStatus
    };
  }

  // Run the full signal-to-recommendation pipeline
  runFullPipeline(scenarioId = 'scenario-hormuz-partial', strategyId = 'strategy-staged') {
    const startTime = performance.now();
    this.addAuditEntry('Coordinator', 'PIPELINE_START', `Full pipeline initiated — Scenario: ${scenarioId}`);
    
    // Reset pipeline
    this.pipelineStatus.stages.forEach(s => s.status = 'idle');
    
    // Stage 1: Signal Detection
    this.updateStageStatus('signal', 'active');
    const riskAssessment = this.agents.riskIntel.getFullAssessment();
    this.updateStageStatus('signal', 'complete');
    this.addAuditEntry('Risk Intel', 'SIGNALS_PROCESSED', 
      `${riskAssessment.eventCount} events processed, ${riskAssessment.activeAlerts.length} active alerts`);
    
    // Stage 2: Risk Assessment
    this.updateStageStatus('risk', 'active');
    const corridorRisks = this.agents.riskIntel.getCorridorsByRisk();
    this.updateStageStatus('risk', 'complete');
    this.addAuditEntry('Risk Intel', 'RISK_SCORED', 
      `Highest risk corridor: ${corridorRisks[0]?.routeName} (${corridorRisks[0]?.composite}/100)`);
    
    // Stage 3: Scenario Simulation
    this.updateStageStatus('scenario', 'active');
    const scenarioResults = this.agents.scenarioModeller.simulate(scenarioId);
    this.updateStageStatus('scenario', 'complete');
    this.addAuditEntry('Scenario Modeller', 'SIMULATED', 
      `${scenarioResults.scenarioName}: Supply gap ${scenarioResults.supplyGap.daily_gap_bpd.toLocaleString()} bpd, Brent $${scenarioResults.economicImpact.brent_projected_usd}`);
    
    // Stage 4: Procurement Recommendations
    this.updateStageStatus('procurement', 'active');
    const procurementOutput = this.agents.procurement.generateRecommendations(scenarioResults);
    this.updateStageStatus('procurement', 'complete');
    this.addAuditEntry('Procurement', 'RECOMMENDATIONS', 
      `${procurementOutput.total_alternatives} alternatives identified, ${procurementOutput.gap_recoverable_pct}% gap recoverable`);
    
    // Stage 5: Reserve Optimization
    this.updateStageStatus('reserve', 'active');
    const reservePlan = this.agents.reserveOptimizer.optimize(scenarioResults, strategyId);
    this.updateStageStatus('reserve', 'complete');
    this.addAuditEntry('Reserve Optimizer', 'OPTIMIZED', 
      `${reservePlan.strategy.name}: ${reservePlan.coverageAnalysis.days_of_cover} days cover, ${reservePlan.coverageAnalysis.supply_gap_coverage_pct}% gap coverage`);
    
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    this.pipelineStatus.lastRun = new Date().toISOString();
    this.pipelineStatus.totalTime = totalTime;
    
    this.addAuditEntry('Coordinator', 'PIPELINE_COMPLETE', 
      `Full pipeline completed in ${totalTime}ms`);
    
    this.lastFullRun = {
      timestamp: new Date().toISOString(),
      processingTime: totalTime,
      scenarioId,
      riskAssessment,
      scenarioResults,
      procurementOutput,
      reservePlan,
      pipeline: { ...this.pipelineStatus },
      auditTrail: this.auditTrail.slice(0, 20)
    };
    
    this.notify({ type: 'pipeline-complete', results: this.lastFullRun });
    return this.lastFullRun;
  }

  // Process a new event through the pipeline
  processEvent(event) {
    this.addAuditEntry('Coordinator', 'EVENT_RECEIVED', `New event: ${event.title}`);
    
    // Update risk assessment
    const riskUpdate = this.agents.riskIntel.processEvent(event);
    this.addAuditEntry('Risk Intel', 'EVENT_PROCESSED', 
      `Risk updated: Overall ${riskUpdate.overallRisk.overall}/100 (${riskUpdate.riskLabel})`);
    
    this.notify({ 
      type: 'event-processed', 
      event, 
      riskUpdate,
      shouldRunPipeline: riskUpdate.overallRisk.overall > 65
    });
    
    return riskUpdate;
  }

  async triggerLiveAnalysis(topic = 'Middle East shipping routes') {
    this.addAuditEntry('Coordinator', 'LIVE_ANALYSIS_START', `Fetching real-time data for: ${topic}`);
    this.updateStageStatus('signal', 'active');
    this.updateStageStatus('risk', 'active');

    if (this.activeFetchController) {
      this.activeFetchController.abort();
    }
    this.activeFetchController = new AbortController();

    try {
      const response = await fetch('http://localhost:8000/api/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
        signal: this.activeFetchController.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      this.updateStageStatus('signal', 'complete');
      this.updateStageStatus('risk', 'complete');
      this.addAuditEntry('Risk Intel', 'LIVE_ANALYSIS_COMPLETE', `Live analysis complete. Risk Score: ${data.risk_score}/100`);

      this.notify({ type: 'live-analysis-complete', data });
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.addAuditEntry('Coordinator', 'LIVE_ANALYSIS_ABORTED', 'Previous request aborted.');
        return null;
      }
      this.updateStageStatus('signal', 'error');
      this.updateStageStatus('risk', 'error');
      this.addAuditEntry('Coordinator', 'LIVE_ANALYSIS_ERROR', `Error: ${error.message}`);
      this.notify({ type: 'live-analysis-error', error });
      throw error;
    } finally {
      this.activeFetchController = null;
    }
  }

  getAgentStatuses() {
    return Object.entries(this.agents).map(([key, agent]) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      key
    }));
  }

  getAuditTrail(count = 20) {
    return this.auditTrail.slice(0, count);
  }

  getLastResults() {
    return this.lastFullRun;
  }
}

export { AgentCoordinator };
