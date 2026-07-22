// ============================================================
// MIRSAD — Procurement Orchestrator Agent
// Alternative source identification and ranking
// ============================================================

import { SUPPLIERS, IMPORT_STATS } from '../data/suppliers.js';
import { SUPPLY_ROUTES } from '../data/supply-routes.js';
import { REFINERIES } from '../data/refineries.js';

class ProcurementOrchestrator {
  constructor() {
    this.name = 'Procurement Orchestrator';
    this.id = 'agent-procurement';
    this.status = 'active';
    this.recommendations = [];
    this.listeners = [];
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  // Generate procurement recommendations based on scenario
  generateRecommendations(scenarioResults) {
    const startTime = performance.now();
    
    if (!scenarioResults) return [];

    const affectedCorridors = scenarioResults.supplyGap?.affected_corridors?.map(c => c.id) || [];
    const supplyGapBPD = scenarioResults.supplyGap?.daily_gap_bpd || 0;

    // Find unaffected or less-affected suppliers
    const alternativeSources = SUPPLIERS.filter(supplier => {
      // Check if this supplier's routes are NOT in the affected corridors
      const supplierRoutes = SUPPLY_ROUTES.filter(r => {
        const routeSuppliers = this.getRouteSuppliers(r.id);
        return routeSuppliers.includes(supplier.id);
      });
      
      const allAffected = supplierRoutes.every(r => affectedCorridors.includes(r.id));
      return !allAffected && supplier.current_risk !== 'critical';
    });

    // Score and rank alternatives
    this.recommendations = alternativeSources.map(supplier => {
      const route = this.getBestRoute(supplier, affectedCorridors);
      const score = this.scoreAlternative(supplier, route, supplyGapBPD, scenarioResults);
      
      return {
        rank: 0, // Will be set after sorting
        supplier: {
          id: supplier.id,
          name: supplier.name,
          flag: supplier.flag,
          region: supplier.region,
          crude_grades: supplier.crude_grades
        },
        route: route ? {
          id: route.id,
          name: route.name,
          distance_nm: route.distance_nm,
          transit_days: route.transit_days,
          vessel_class: route.vessel_class
        } : null,
        
        // Volume available
        available_volume_bpd: this.estimateAvailableVolume(supplier, scenarioResults),
        gap_coverage_pct: Math.min(100, Math.round(
          this.estimateAvailableVolume(supplier, scenarioResults) / supplyGapBPD * 100
        )),
        
        // Cost analysis
        spot_premium_usd: this.estimateSpotPremium(supplier, scenarioResults),
        freight_cost_usd_bbl: this.estimateFreightCost(route),
        total_delivered_cost_usd: this.calculateDeliveredCost(supplier, route, scenarioResults),
        cost_vs_term_pct: this.calculateCostDelta(supplier, route, scenarioResults),
        
        // Logistics
        time_to_first_barrel_days: route ? route.transit_days + 3 : 999, // +3 for loading
        tanker_availability: this.assessTankerAvailability(route),
        port_congestion: this.assessPortCongestion(route),
        
        // Compatibility
        refinery_compatibility: this.assessRefineryCompatibility(supplier),
        grade_match_score: this.assessGradeMatch(supplier, scenarioResults),
        
        // Risk
        corridor_risk_score: route ? route.current_risk_score : 100,
        sanctions_risk: supplier.current_risk === 'moderate' && supplier.id === 'russia' ? 'medium' : 'low',
        
        // Overall
        feasibility_score: score,
        recommendation_level: score >= 80 ? 'highly-recommended' : score >= 60 ? 'recommended' : score >= 40 ? 'viable' : 'limited',
        
        // Action
        action_items: this.generateActionItems(supplier, route, scenarioResults)
      };
    })
    .sort((a, b) => b.feasibility_score - a.feasibility_score)
    .map((rec, idx) => ({ ...rec, rank: idx + 1 }));

    const endTime = performance.now();
    
    const output = {
      timestamp: new Date().toISOString(),
      scenarioId: scenarioResults.scenarioId,
      supply_gap_bpd: supplyGapBPD,
      recommendations: this.recommendations,
      total_alternatives: this.recommendations.length,
      top_recommendation: this.recommendations[0] || null,
      total_recoverable_bpd: this.recommendations.reduce((sum, r) => sum + r.available_volume_bpd, 0),
      gap_recoverable_pct: Math.min(100, Math.round(
        this.recommendations.reduce((sum, r) => sum + r.available_volume_bpd, 0) / supplyGapBPD * 100
      )),
      fastest_delivery_days: Math.min(...this.recommendations.map(r => r.time_to_first_barrel_days)),
      processing_time_ms: Math.round(endTime - startTime)
    };

    this.notify({ type: 'recommendations-generated', output });
    return output;
  }

  getRouteSuppliers(routeId) {
    const routeSupplierMap = {
      'hormuz-jamnagar': ['iraq', 'saudi', 'uae', 'kuwait', 'iran'],
      'hormuz-mangalore': ['iraq', 'saudi', 'uae', 'kuwait', 'iran'],
      'russia-espo-paradip': ['russia'],
      'west-africa-mumbai': ['nigeria', 'angola'],
      'us-gulf-vizag': ['us'],
      'guyana-kochi': ['guyana'],
      'brazil-chennai': ['brazil'],
      'norway-vadinar': ['norway']
    };
    return routeSupplierMap[routeId] || [];
  }

  getBestRoute(supplier, affectedCorridors) {
    const supplierRoutes = SUPPLY_ROUTES.filter(r => {
      const routeSuppliers = this.getRouteSuppliers(r.id);
      return routeSuppliers.includes(supplier.id) && !affectedCorridors.includes(r.id);
    });
    
    if (supplierRoutes.length === 0) {
      // Find any unaffected route as alternative
      return SUPPLY_ROUTES.find(r => !affectedCorridors.includes(r.id)) || null;
    }
    
    return supplierRoutes.sort((a, b) => a.current_risk_score - b.current_risk_score)[0];
  }

  scoreAlternative(supplier, route, gapBPD, scenarioResults) {
    let score = 50; // baseline
    
    // Volume availability (0-25 points)
    const availVol = this.estimateAvailableVolume(supplier, scenarioResults);
    score += Math.min(25, (availVol / gapBPD) * 25);
    
    // Reliability (0-20 points)
    score += (supplier.reliability_score / 100) * 20;
    
    // Transit time (0-15 points, shorter = better)
    if (route) {
      score += Math.max(0, 15 - (route.transit_days / 40) * 15);
    }
    
    // Cost (0-15 points)
    const premium = Math.abs(supplier.typical_premium);
    score += Math.max(0, 15 - premium);
    
    // Risk (0-15 points)
    const riskPenalty = route ? (route.current_risk_score / 100) * 15 : 15;
    score += 15 - riskPenalty;
    
    // Grade compatibility (0-10 points)
    score += this.assessGradeMatch(supplier, scenarioResults) * 0.1;
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  estimateAvailableVolume(supplier, scenarioResults) {
    // Estimate additional volume available on spot market
    const currentVolume = supplier.volume_bpd;
    const spotShare = supplier.spot_share;
    const baseSpotVolume = currentVolume * spotShare;
    
    // During disruption, additional spot volume may be available
    const surgeCapacity = supplier.id === 'saudi' ? 1500000 * 0.3 : // Saudi spare capacity
      supplier.id === 'us' ? currentVolume * 0.2 :
      supplier.id === 'russia' ? currentVolume * 0.15 :
      currentVolume * 0.1;
    
    return Math.round(Math.min(baseSpotVolume + surgeCapacity, currentVolume * 1.5));
  }

  estimateSpotPremium(supplier, scenarioResults) {
    const baselinePremium = supplier.typical_premium;
    const disruptionSurcharge = scenarioResults?.economicImpact?.brent_increase_pct 
      ? scenarioResults.economicImpact.brent_increase_pct * 0.1 : 2.0;
    
    return Math.round((Math.max(0, baselinePremium) + disruptionSurcharge) * 10) / 10;
  }

  estimateFreightCost(route) {
    if (!route) return 0;
    // Approximate freight cost based on distance
    const baseRate = 2.5; // USD/bbl for short haul
    const distanceMultiplier = route.distance_nm / 2000;
    return Math.round(baseRate * distanceMultiplier * 10) / 10;
  }

  calculateDeliveredCost(supplier, route, scenarioResults) {
    const liveBrent = window.app?.liveBrentPrice || IMPORT_STATS.avg_brent_price_usd;
    const brentBase = scenarioResults?.economicImpact?.brent_projected_usd || liveBrent;
    const premium = this.estimateSpotPremium(supplier, scenarioResults);
    const freight = this.estimateFreightCost(route);
    return Math.round((brentBase + premium + freight) * 10) / 10;
  }

  calculateCostDelta(supplier, route, scenarioResults) {
    const liveBrent = window.app?.liveBrentPrice || IMPORT_STATS.avg_brent_price_usd;
    const termCost = liveBrent + supplier.typical_premium + 2.0; // baseline term contract
    const spotCost = this.calculateDeliveredCost(supplier, route, scenarioResults);
    return Math.round(((spotCost - termCost) / termCost) * 100 * 10) / 10;
  }

  assessTankerAvailability(route) {
    if (!route) return { status: 'unknown', score: 0 };
    const vesselMap = {
      'VLCC': { availability: 'moderate', score: 60, rate_usd_day: 85000 },
      'Suezmax': { availability: 'good', score: 75, rate_usd_day: 55000 },
      'Aframax': { availability: 'good', score: 80, rate_usd_day: 42000 },
      'Aframax/Suezmax': { availability: 'good', score: 75, rate_usd_day: 48000 },
      'VLCC/Suezmax': { availability: 'moderate', score: 65, rate_usd_day: 70000 }
    };
    return vesselMap[route.vessel_class] || { availability: 'moderate', score: 60, rate_usd_day: 65000 };
  }

  assessPortCongestion(route) {
    if (!route) return 'unknown';
    // Simulated congestion levels
    const congestionMap = {
      'hormuz-jamnagar': 'moderate',
      'hormuz-mangalore': 'moderate',
      'russia-espo-paradip': 'low',
      'west-africa-mumbai': 'low',
      'us-gulf-vizag': 'moderate',
      'guyana-kochi': 'low',
      'brazil-chennai': 'low',
      'norway-vadinar': 'low'
    };
    return congestionMap[route.id] || 'moderate';
  }

  assessRefineryCompatibility(supplier) {
    const compatibleRefineries = REFINERIES.filter(ref => {
      return ref.crude_grades.some(grade => 
        supplier.crude_grades.some(sg => 
          grade.toLowerCase().includes(sg.toLowerCase().split(' ')[0]) ||
          sg.toLowerCase().includes(grade.toLowerCase().split(' ')[0])
        )
      );
    });
    
    return {
      compatible_count: compatibleRefineries.length,
      compatible_refineries: compatibleRefineries.map(r => r.name).slice(0, 5),
      compatibility_pct: Math.round(compatibleRefineries.length / REFINERIES.length * 100)
    };
  }

  assessGradeMatch(supplier, scenarioResults) {
    // Simple grade compatibility score
    const affectedRefineries = scenarioResults?.refineryImpact?.refineries
      ?.filter(r => r.status !== 'normal') || [];
    
    let matchScore = 0;
    affectedRefineries.forEach(ref => {
      const fullRef = REFINERIES.find(r => r.id === ref.id);
      if (fullRef) {
        const hasMatch = fullRef.crude_grades.some(grade =>
          supplier.crude_grades.some(sg => {
            const gradeApi = supplier.avg_api_gravity;
            // API gravity compatibility check (±10 degrees)
            return Math.abs(gradeApi - 30) < 15;
          })
        );
        if (hasMatch) matchScore += 10;
      }
    });
    
    return Math.min(100, matchScore);
  }

  generateActionItems(supplier, route, scenarioResults) {
    const items = [];
    
    items.push(`Contact ${supplier.name} ${supplier.flag} trading desk for spot cargo availability`);
    
    if (route) {
      items.push(`Secure ${route.vessel_class} tanker for ${route.name} corridor (${route.transit_days} days transit)`);
    }
    
    if (supplier.spot_share > 0.5) {
      items.push(`Negotiate term contract extension — current spot exposure at ${Math.round(supplier.spot_share * 100)}%`);
    }
    
    items.push(`Verify crude grade compatibility with target refineries`);
    items.push(`Confirm port draft/berth availability at discharge terminal`);
    
    if (supplier.id === 'russia') {
      items.push(`⚠️ Review sanctions compliance — verify P&I/insurance coverage`);
    }
    
    return items;
  }
}

export { ProcurementOrchestrator };
