// ============================================================
// MIRSAD — Risk Intelligence Agent
// Multi-source geopolitical risk scoring engine
// ============================================================

import { GEOPOLITICAL_EVENTS, SEVERITY_ORDER } from '../data/geopolitical-events.js';
import { SUPPLY_ROUTES, CHOKEPOINTS } from '../data/supply-routes.js';
import { SUPPLIERS } from '../data/suppliers.js';

class RiskIntelligenceAgent {
  constructor() {
    this.name = 'Risk Intelligence Agent';
    this.id = 'agent-risk-intel';
    this.status = 'active';
    this.lastUpdate = null;
    this.riskScores = {};
    this.corridorRisks = {};
    this.activeAlerts = [];
    this.eventHistory = [];
    this.weights = {
      geopolitical: 0.30,
      chokepoint: 0.25,
      priceVolatility: 0.15,
      sanctions: 0.15,
      maritime: 0.15
    };
    this.listeners = [];
  }

  // Subscribe to risk updates
  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  // Initialize with current state
  initialize() {
    this.calculateBaselineRisks();
    this.processHistoricalEvents();
    this.lastUpdate = new Date();
    return this.getFullAssessment();
  }

  // Calculate baseline risk scores for each corridor
  calculateBaselineRisks() {
    SUPPLY_ROUTES.forEach(route => {
      const chokeRisk = this.assessChokepoints(route);
      const supplierRisk = this.assessSupplierRisk(route);
      const distanceRisk = Math.min(route.distance_nm / 100, 100) * 0.1;
      
      this.corridorRisks[route.id] = {
        routeId: route.id,
        routeName: route.name,
        composite: Math.round(route.current_risk_score),
        components: {
          geopolitical: supplierRisk,
          chokepoint: chokeRisk,
          priceVolatility: this.calculatePriceVolatilityScore(),
          sanctions: this.assessSanctionsRisk(route),
          maritime: this.assessMaritimeRisk(route)
        },
        hormuzExposure: route.hormuz_dependent,
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      };
    });

    // Overall risk index
    this.riskScores.overall = this.calculateOverallRisk();
    this.riskScores.hormuzThreat = this.calculateHormuzThreat();
    this.riskScores.redSeaThreat = this.calculateRedSeaThreat();
    this.riskScores.sanctionsRisk = this.calculateSanctionsComposite();
  }

  assessChokepoints(route) {
    let score = 0;
    if (route.chokepoints.includes('Strait of Hormuz')) score += 45;
    if (route.chokepoints.some(c => c.includes('Bab-el-Mandeb'))) score += 35;
    if (route.chokepoints.includes('Suez Canal')) score += 15;
    if (route.chokepoints.includes('Malacca Strait')) score += 10;
    return Math.min(score, 100);
  }

  assessSupplierRisk(route) {
    // Get risk from associated suppliers
    const riskMap = { low: 15, moderate: 35, elevated: 55, high: 75, critical: 90 };
    let maxRisk = 0;
    SUPPLIERS.forEach(s => {
      if (s.current_risk && riskMap[s.current_risk]) {
        // Check if this supplier uses this corridor
        const routeSuppliers = GEOPOLITICAL_EVENTS
          .filter(e => e.affectedCorridors?.includes(route.id))
          .flatMap(e => e.affectedSuppliers || []);
        if (routeSuppliers.includes(s.id)) {
          maxRisk = Math.max(maxRisk, riskMap[s.current_risk]);
        }
      }
    });
    return maxRisk || 20; // baseline if no specific supplier risk
  }

  calculatePriceVolatilityScore() {
    // Simulated price volatility index based on recent events
    const recentEvents = GEOPOLITICAL_EVENTS
      .filter(e => new Date(e.timestamp) > new Date('2026-01-01'))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const avgPriceImpact = recentEvents.length > 0
      ? recentEvents.slice(0, 5).reduce((sum, e) => sum + Math.abs(e.priceImpact), 0) / Math.min(recentEvents.length, 5)
      : 2.0;
    
    return Math.min(Math.round(avgPriceImpact * 10), 100);
  }

  assessSanctionsRisk(route) {
    let score = 0;
    const sanctionEvents = GEOPOLITICAL_EVENTS.filter(e => 
      e.type === 'sanctions' && e.affectedCorridors?.includes(route.id)
    );
    score += sanctionEvents.length * 12;
    // Check supplier sanctions exposure
    if (route.id.includes('russia')) score += 25;
    if (route.id.includes('iran') || SUPPLIERS.find(s => s.id === 'iran' && s.current_risk === 'critical')) score += 35;
    return Math.min(score, 100);
  }

  assessMaritimeRisk(route) {
    let score = 10; // baseline
    const attackEvents = GEOPOLITICAL_EVENTS.filter(e =>
      (e.type === 'attack' || e.type === 'maritime') && e.affectedCorridors?.includes(route.id)
    );
    score += attackEvents.length * 15;
    if (route.distance_nm > 8000) score += 10; // long-haul risk
    return Math.min(score, 100);
  }

  calculateOverallRisk() {
    const corridorScores = Object.values(this.corridorRisks);
    if (corridorScores.length === 0) return 50;
    
    // Volume-weighted risk
    const routes = SUPPLY_ROUTES;
    let weightedSum = 0;
    let totalVolume = 0;
    
    corridorScores.forEach(cr => {
      const route = routes.find(r => r.id === cr.routeId);
      if (route) {
        weightedSum += cr.composite * route.share_of_imports;
        totalVolume += route.share_of_imports;
      }
    });
    
    return totalVolume > 0 ? Math.round(weightedSum / totalVolume) : 50;
  }

  calculateHormuzThreat() {
    const hormuzRoutes = Object.values(this.corridorRisks)
      .filter(cr => cr.hormuzExposure);
    if (hormuzRoutes.length === 0) return 0;
    return Math.round(hormuzRoutes.reduce((sum, cr) => sum + cr.composite, 0) / hormuzRoutes.length);
  }

  calculateRedSeaThreat() {
    const redSeaCorridors = ['us-gulf-vizag', 'norway-vadinar', 'guyana-kochi'];
    const redSeaRoutes = Object.values(this.corridorRisks)
      .filter(cr => redSeaCorridors.includes(cr.routeId));
    if (redSeaRoutes.length === 0) return 0;
    return Math.round(redSeaRoutes.reduce((sum, cr) => sum + cr.composite, 0) / redSeaRoutes.length);
  }

  calculateSanctionsComposite() {
    const sanctionTargets = Object.values(this.corridorRisks)
      .filter(cr => cr.components.sanctions > 30);
    if (sanctionTargets.length === 0) return 20;
    return Math.round(sanctionTargets.reduce((sum, cr) => sum + cr.components.sanctions, 0) / sanctionTargets.length);
  }

  // Process a new geopolitical event
  processEvent(event) {
    this.eventHistory.push({
      ...event,
      processedAt: new Date().toISOString()
    });

    // Update corridor risk scores
    if (event.affectedCorridors) {
      event.affectedCorridors.forEach(corridorId => {
        if (this.corridorRisks[corridorId]) {
          const cr = this.corridorRisks[corridorId];
          const delta = event.riskDelta || 0;
          const severityMultiplier = (SEVERITY_ORDER[event.severity] || 3) / 3;
          
          cr.composite = Math.min(100, Math.max(0, 
            cr.composite + Math.round(delta * severityMultiplier * 0.7)
          ));
          cr.trend = delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'stable';
          cr.lastUpdated = new Date().toISOString();
        }
      });
    }

    // Update overall scores
    this.riskScores.overall = this.calculateOverallRisk();
    this.riskScores.hormuzThreat = this.calculateHormuzThreat();
    this.riskScores.redSeaThreat = this.calculateRedSeaThreat();
    this.riskScores.sanctionsRisk = this.calculateSanctionsComposite();

    // Generate alert
    if (SEVERITY_ORDER[event.severity] >= 3) {
      this.generateAlert(event);
    }

    this.lastUpdate = new Date();
    this.notify({ type: 'event-processed', event, risks: this.riskScores });
    
    return this.getFullAssessment();
  }

  // Process all historical events up to a given date
  processHistoricalEvents(upToDate = null) {
    const cutoff = upToDate ? new Date(upToDate) : new Date();
    const events = GEOPOLITICAL_EVENTS
      .filter(e => new Date(e.timestamp) <= cutoff)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    events.forEach(event => {
      this.eventHistory.push({ ...event, processedAt: event.timestamp });
      
      if (event.affectedCorridors) {
        event.affectedCorridors.forEach(corridorId => {
          if (this.corridorRisks[corridorId]) {
            const delta = (event.riskDelta || 0) * 0.3; // historical decay
            this.corridorRisks[corridorId].composite = Math.min(100, Math.max(0,
              this.corridorRisks[corridorId].composite + Math.round(delta)
            ));
          }
        });
      }
      
      if (SEVERITY_ORDER[event.severity] >= 3) {
        this.generateAlert(event);
      }
    });

    // Recalculate aggregates
    this.riskScores.overall = this.calculateOverallRisk();
    this.riskScores.hormuzThreat = this.calculateHormuzThreat();
    this.riskScores.redSeaThreat = this.calculateRedSeaThreat();
    this.riskScores.sanctionsRisk = this.calculateSanctionsComposite();
  }

  generateAlert(event) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      severity: event.severity,
      title: event.title,
      description: event.description,
      type: event.type,
      category: event.category,
      affectedCorridors: event.affectedCorridors,
      priceImpact: event.priceImpact,
      source: event.source,
      acknowledged: false
    };
    
    this.activeAlerts.unshift(alert);
    // Keep last 50 alerts
    if (this.activeAlerts.length > 50) {
      this.activeAlerts = this.activeAlerts.slice(0, 50);
    }
    
    return alert;
  }

  // Get risk color for a score
  static getRiskColor(score) {
    if (score >= 80) return 'var(--color-risk-critical)';
    if (score >= 65) return 'var(--color-risk-high)';
    if (score >= 45) return 'var(--color-risk-elevated)';
    if (score >= 25) return 'var(--color-risk-moderate)';
    return 'var(--color-risk-low)';
  }

  static getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 65) return 'high';
    if (score >= 45) return 'elevated';
    if (score >= 25) return 'moderate';
    return 'low';
  }

  static getRiskLabel(score) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 65) return 'HIGH';
    if (score >= 45) return 'ELEVATED';
    if (score >= 25) return 'MODERATE';
    return 'LOW';
  }

  // Full assessment output
  getFullAssessment() {
    return {
      agentId: this.id,
      agentName: this.name,
      timestamp: new Date().toISOString(),
      status: this.status,
      overallRisk: this.riskScores,
      corridorRisks: this.corridorRisks,
      activeAlerts: this.activeAlerts,
      eventCount: this.eventHistory.length,
      riskLevel: RiskIntelligenceAgent.getRiskLevel(this.riskScores.overall),
      riskLabel: RiskIntelligenceAgent.getRiskLabel(this.riskScores.overall)
    };
  }

  // Get sorted corridors by risk
  getCorridorsByRisk() {
    return Object.values(this.corridorRisks)
      .sort((a, b) => b.composite - a.composite);
  }

  // Get recent alerts
  getRecentAlerts(count = 10) {
    return this.activeAlerts.slice(0, count);
  }
}

export { RiskIntelligenceAgent };
