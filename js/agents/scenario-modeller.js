// ============================================================
// MIRSAD — Scenario Modeller Agent
// Disruption scenario simulation engine
// ============================================================

import { SCENARIOS } from '../data/scenarios.js';
import { REFINERIES } from '../data/refineries.js';
import { SUPPLY_ROUTES } from '../data/supply-routes.js';
import { SUPPLIERS, IMPORT_STATS } from '../data/suppliers.js';
import { SPR_STATS } from '../data/spr-data.js';

class ScenarioModeller {
  constructor() {
    this.name = 'Scenario Modeller';
    this.id = 'agent-scenario';
    this.status = 'active';
    this.activeScenario = null;
    this.simulationResults = null;
    this.listeners = [];
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  // Run a full scenario simulation
  simulate(scenarioId, params = {}) {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return null;

    this.activeScenario = scenarioId;
    const startTime = performance.now();

    // Override default params if provided
    const config = {
      duration: params.duration || scenario.duration_days,
      flowReduction: params.flowReduction || scenario.flow_reduction_pct,
      brentBase: params.brentBase || (window.app?.liveBrentPrice) || IMPORT_STATS.avg_brent_price_usd,
      ...params
    };

    // Run simulation components
    const supplyGap = this.calculateSupplyGap(scenario, config);
    const refineryImpact = this.calculateRefineryImpact(scenario, config);
    const economicImpact = this.calculateEconomicImpact(scenario, config);
    const fuelPriceImpact = this.calculateFuelPriceImpact(scenario, config);
    const powerSectorImpact = this.calculatePowerSectorImpact(scenario, config);
    const sprCoverage = this.calculateSPRCoverage(scenario, config);
    const gdpTrajectory = this.generateGDPTrajectory(scenario, config);
    const priceTrajectory = this.generatePriceTrajectory(scenario, config);

    const endTime = performance.now();

    this.simulationResults = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      severity: scenario.severity,
      probability: scenario.probability,
      duration: config.duration,
      simulationTime: Math.round(endTime - startTime),
      timestamp: new Date().toISOString(),
      
      supplyGap,
      refineryImpact,
      economicImpact,
      fuelPriceImpact,
      powerSectorImpact,
      sprCoverage,
      gdpTrajectory,
      priceTrajectory,
      
      timeline: scenario.timeline,
      assumptions: scenario.assumptions,
      
      summary: this.generateSummary(scenario, economicImpact, supplyGap)
    };

    this.notify({ type: 'simulation-complete', results: this.simulationResults });
    return this.simulationResults;
  }

  calculateSupplyGap(scenario, config) {
    const affectedRoutes = SUPPLY_ROUTES.filter(r => 
      scenario.affected_corridors.includes(r.id)
    );
    
    const totalAffectedVolume = affectedRoutes.reduce((sum, r) => 
      sum + r.annual_volume_mmt / 365 * 1000, 0); // daily KT
    
    const dailyGapKT = totalAffectedVolume * (config.flowReduction / 100);
    const monthlyGapMMT = dailyGapKT * 30 / 1000;
    const totalGapMMT = dailyGapKT * config.duration / 1000;
    
    // Monthly supply gap projection
    const monthlyProjection = [];
    const months = Math.ceil(config.duration / 30);
    for (let m = 1; m <= Math.min(months, 12); m++) {
      const recoveryFactor = m > months * 0.6 ? 
        1 - ((m - months * 0.6) / (months * 0.4)) * 0.5 : 1;
      monthlyProjection.push({
        month: m,
        gap_mmt: Math.round(monthlyGapMMT * recoveryFactor * 100) / 100,
        label: `Month ${m}`
      });
    }
    
    return {
      daily_gap_bpd: scenario.india_volume_loss_bpd,
      daily_gap_kt: Math.round(dailyGapKT * 10) / 10,
      monthly_gap_mmt: Math.round(monthlyGapMMT * 100) / 100,
      total_gap_mmt: Math.round(totalGapMMT * 100) / 100,
      affected_corridors: affectedRoutes.map(r => ({
        id: r.id,
        name: r.name,
        volume_loss_pct: config.flowReduction,
        annual_volume_mmt: r.annual_volume_mmt
      })),
      monthly_projection: monthlyProjection
    };
  }

  calculateRefineryImpact(scenario, config) {
    const impacts = REFINERIES.map(refinery => {
      const isDirectlyAffected = scenario.refineries_critical?.includes(refinery.id);
      const corridorOverlap = refinery.primary_corridors.filter(c => 
        scenario.affected_corridors.includes(c)
      );
      
      let utilizationDrop = 0;
      if (isDirectlyAffected) {
        utilizationDrop = scenario.refinery_utilization_drop_pct / 100;
      } else if (corridorOverlap.length > 0) {
        utilizationDrop = (scenario.refinery_utilization_drop_pct / 100) * 
          (corridorOverlap.length / refinery.primary_corridors.length) * 0.5;
      }
      
      const newUtilization = Math.max(0.2, refinery.utilization - utilizationDrop);
      const capacityLoss = (refinery.utilization - newUtilization) * refinery.capacity_bpd;
      
      return {
        id: refinery.id,
        name: refinery.name,
        company: refinery.company,
        location: refinery.location,
        normalUtilization: Math.round(refinery.utilization * 100),
        impactedUtilization: Math.round(newUtilization * 100),
        utilizationDrop: Math.round(utilizationDrop * 100),
        capacityLoss_bpd: Math.round(capacityLoss),
        status: utilizationDrop > 0.3 ? 'critical' : utilizationDrop > 0.1 ? 'stressed' : 'normal',
        isDirectlyAffected
      };
    });

    const totalCapacityLoss = impacts.reduce((sum, i) => sum + i.capacityLoss_bpd, 0);
    const criticalCount = impacts.filter(i => i.status === 'critical').length;
    const stressedCount = impacts.filter(i => i.status === 'stressed').length;

    return {
      refineries: impacts.sort((a, b) => b.utilizationDrop - a.utilizationDrop),
      totalCapacityLoss_bpd: totalCapacityLoss,
      avgUtilizationDrop: Math.round(scenario.refinery_utilization_drop_pct),
      criticalRefineries: criticalCount,
      stressedRefineries: stressedCount,
      nationalUtilization: Math.round(
        impacts.reduce((sum, i) => sum + i.impactedUtilization, 0) / impacts.length
      )
    };
  }

  calculateEconomicImpact(scenario, config) {
    const brentProjected = config.brentBase * (1 + scenario.brent_price_impact_pct / 100);
    const importBillIncrease = scenario.india_import_bill_increase_usd_bn;
    const dailyExtraCost = (importBillIncrease * 1e9) / 365;
    
    return {
      brent_current_usd: config.brentBase,
      brent_projected_usd: Math.round(brentProjected * 10) / 10,
      brent_increase_pct: scenario.brent_price_impact_pct,
      import_bill_increase_usd_bn: importBillIncrease,
      daily_extra_cost_usd_mn: Math.round(dailyExtraCost / 1e6),
      gdp_impact_pct: scenario.gdp_impact_pct,
      gdp_impact_usd_bn: Math.round(Math.abs(scenario.gdp_impact_pct) * 35 * 10) / 10,
      inflation_impact_pct: scenario.inflation_impact_pct,
      current_account_impact_pct: Math.round(scenario.india_import_bill_increase_usd_bn / 6.5 * 10) / 10,
      rupee_depreciation_pct: Math.round(scenario.brent_price_impact_pct * 0.15 * 10) / 10
    };
  }

  calculateFuelPriceImpact(scenario, config) {
    const currentPetrol = 104.50; // INR/litre baseline
    const currentDiesel = 91.25; // INR/litre baseline
    
    return {
      petrol: {
        current_inr: currentPetrol,
        projected_inr: Math.round((currentPetrol + scenario.petrol_price_impact_inr) * 10) / 10,
        increase_inr: scenario.petrol_price_impact_inr,
        increase_pct: Math.round(scenario.petrol_price_impact_inr / currentPetrol * 100 * 10) / 10
      },
      diesel: {
        current_inr: currentDiesel,
        projected_inr: Math.round((currentDiesel + scenario.diesel_price_impact_inr) * 10) / 10,
        increase_inr: scenario.diesel_price_impact_inr,
        increase_pct: Math.round(scenario.diesel_price_impact_inr / currentDiesel * 100 * 10) / 10
      }
    };
  }

  calculatePowerSectorImpact(scenario, config) {
    const stressLevels = {
      'Minimal': { score: 15, color: 'var(--color-risk-low)' },
      'Low': { score: 30, color: 'var(--color-risk-moderate)' },
      'Moderate': { score: 50, color: 'var(--color-risk-elevated)' },
      'High': { score: 70, color: 'var(--color-risk-high)' },
      'Critical': { score: 90, color: 'var(--color-risk-critical)' }
    };
    
    const stressKey = Object.keys(stressLevels).find(k => 
      scenario.power_sector_stress.startsWith(k)
    ) || 'Moderate';
    
    return {
      stress_level: stressKey,
      stress_score: stressLevels[stressKey].score,
      stress_color: stressLevels[stressKey].color,
      description: scenario.power_sector_stress,
      gas_price_impact_pct: Math.round(scenario.brent_price_impact_pct * 0.6),
      coal_substitution_increase_pct: stressLevels[stressKey].score > 50 ? 15 : 5
    };
  }

  calculateSPRCoverage(scenario, config) {
    const dailyGap = scenario.india_volume_loss_bpd;
    const sprCapacity = SPR_STATS.current_total_fill_mmt * 7.33 * 1e6 / 365; // barrels per day equivalent
    const maxDrawdown = SPR_STATS.max_combined_drawdown_bpd;
    
    const effectiveDrawdown = Math.min(maxDrawdown, dailyGap);
    const daysOfCover = Math.round(SPR_STATS.current_total_fill_mmt * 1e6 * 7.33 / effectiveDrawdown);
    const gapCovered = effectiveDrawdown / dailyGap * 100;
    
    return {
      supply_gap_bpd: dailyGap,
      max_drawdown_bpd: maxDrawdown,
      effective_drawdown_bpd: effectiveDrawdown,
      days_of_cover: Math.min(daysOfCover, 365),
      gap_covered_pct: Math.min(Math.round(gapCovered), 100),
      sufficient: daysOfCover >= config.duration,
      deficit_days: Math.max(0, config.duration - daysOfCover),
      recommendation: daysOfCover >= config.duration 
        ? 'SPR can cover the full scenario duration' 
        : `SPR exhausted by day ${daysOfCover}. Alternative procurement critical.`
    };
  }

  generateGDPTrajectory(scenario, config) {
    const quarters = Math.ceil(config.duration / 90) + 2;
    const trajectory = [];
    const baseGDP = 3.94; // Trillion USD (Q1 2026 annualized)
    
    for (let q = 0; q < Math.min(quarters, 8); q++) {
      let impact;
      if (q === 0) {
        impact = 0;
      } else if (q <= Math.ceil(config.duration / 90)) {
        impact = scenario.gdp_impact_pct * (q / Math.ceil(config.duration / 90));
      } else {
        const recovery = (q - Math.ceil(config.duration / 90)) * 0.3;
        impact = scenario.gdp_impact_pct * Math.max(0, 1 - recovery);
      }
      
      trajectory.push({
        quarter: `Q${(q % 4) + 1} ${2026 + Math.floor(q / 4)}`,
        gdp_trn: Math.round((baseGDP * (1 + impact / 100)) * 100) / 100,
        impact_pct: Math.round(impact * 100) / 100,
        label: q === 0 ? 'Pre-disruption' : `Quarter ${q}`
      });
    }
    
    return trajectory;
  }

  generatePriceTrajectory(scenario, config) {
    const trajectory = [];
    const basePrice = config.brentBase || (window.app?.liveBrentPrice) || IMPORT_STATS.avg_brent_price_usd;
    const peakPrice = basePrice * (1 + scenario.brent_price_impact_pct / 100);
    
    for (let day = 0; day <= config.duration; day += Math.max(1, Math.floor(config.duration / 30))) {
      let price;
      const phase = day / config.duration;
      
      if (phase < 0.1) {
        // Initial surge
        price = basePrice + (peakPrice - basePrice) * (phase / 0.1) * 0.8;
      } else if (phase < 0.3) {
        // Peak period
        price = basePrice + (peakPrice - basePrice) * (0.8 + Math.random() * 0.2);
      } else if (phase < 0.7) {
        // Elevated plateau
        price = basePrice + (peakPrice - basePrice) * (0.6 + Math.random() * 0.15);
      } else {
        // Recovery
        const recoveryProgress = (phase - 0.7) / 0.3;
        price = basePrice + (peakPrice - basePrice) * (0.6 - recoveryProgress * 0.4);
      }
      
      // Add some noise
      price += (Math.random() - 0.5) * 3;
      
      trajectory.push({
        day,
        price: Math.round(price * 100) / 100,
        label: `Day ${day}`
      });
    }
    
    return trajectory;
  }

  generateSummary(scenario, economicImpact, supplyGap) {
    return {
      headline: `${scenario.name}: ${scenario.severity.toUpperCase()} disruption scenario`,
      supply_impact: `${supplyGap.daily_gap_bpd.toLocaleString()} bbl/day supply loss for ${scenario.duration_days} days`,
      price_impact: `Brent crude projected at $${economicImpact.brent_projected_usd}/barrel (+${economicImpact.brent_increase_pct}%)`,
      economic_impact: `GDP impact: ${economicImpact.gdp_impact_pct}% | Import bill: +$${economicImpact.import_bill_increase_usd_bn}B`,
      consumer_impact: `Petrol: +₹${scenario.petrol_price_impact_inr}/L | Diesel: +₹${scenario.diesel_price_impact_inr}/L`,
      probability: `Assessed probability: ${Math.round(scenario.probability * 100)}%`
    };
  }

  // Compare two scenarios
  compare(scenarioId1, scenarioId2) {
    const result1 = this.simulate(scenarioId1);
    const result2 = this.simulate(scenarioId2);
    
    if (!result1 || !result2) return null;
    
    return {
      scenarios: [result1.scenarioName, result2.scenarioName],
      comparison: {
        supply_gap: [result1.supplyGap.daily_gap_bpd, result2.supplyGap.daily_gap_bpd],
        brent_price: [result1.economicImpact.brent_projected_usd, result2.economicImpact.brent_projected_usd],
        gdp_impact: [result1.economicImpact.gdp_impact_pct, result2.economicImpact.gdp_impact_pct],
        refinery_drop: [result1.refineryImpact.avgUtilizationDrop, result2.refineryImpact.avgUtilizationDrop],
        spr_coverage: [result1.sprCoverage.days_of_cover, result2.sprCoverage.days_of_cover],
        import_bill: [result1.economicImpact.import_bill_increase_usd_bn, result2.economicImpact.import_bill_increase_usd_bn]
      }
    };
  }

  getAvailableScenarios() {
    return SCENARIOS.map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      category: s.category,
      severity: s.severity,
      description: s.description,
      probability: s.probability,
      duration_days: s.duration_days
    }));
  }
}

export { ScenarioModeller };
