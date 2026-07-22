// ============================================================
// MIRSAD — Reserve Optimizer Agent
// Strategic Petroleum Reserve drawdown optimization
// ============================================================

import { SPR_SITES, SPR_STATS, DRAWDOWN_STRATEGIES } from '../data/spr-data.js';
import { REFINERIES } from '../data/refineries.js';
import { IMPORT_STATS } from '../data/suppliers.js';

class ReserveOptimizer {
  constructor() {
    this.name = 'Reserve Optimizer';
    this.id = 'agent-reserves';
    this.status = 'active';
    this.currentPlan = null;
    this.listeners = [];
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  // Generate optimal drawdown plan for a scenario
  optimize(scenarioResults, strategyId = 'strategy-staged') {
    const startTime = performance.now();
    
    if (!scenarioResults) return null;

    const strategy = DRAWDOWN_STRATEGIES.find(s => s.id === strategyId) || DRAWDOWN_STRATEGIES[3];
    const supplyGap = scenarioResults.supplyGap?.daily_gap_bpd || 0;
    const duration = scenarioResults.duration || 90;
    const operationalSites = SPR_SITES.filter(s => s.status === 'operational');

    // Generate site-level drawdown schedules
    const siteSchedules = this.generateSiteSchedules(operationalSites, supplyGap, duration, strategy);
    
    // Calculate daily release profile
    const dailyProfile = this.generateDailyProfile(siteSchedules, duration, strategy);
    
    // Identify replenishment windows
    const replenishmentPlan = this.planReplenishment(siteSchedules, scenarioResults);
    
    // Calculate days of cover under this plan
    const coverageAnalysis = this.analyzeCoverage(siteSchedules, supplyGap, duration);
    
    // Cost analysis
    const costAnalysis = this.analyzeCost(siteSchedules, scenarioResults);

    const endTime = performance.now();

    this.currentPlan = {
      timestamp: new Date().toISOString(),
      scenarioId: scenarioResults.scenarioId,
      scenarioName: scenarioResults.scenarioName,
      strategy: {
        id: strategy.id,
        name: strategy.name,
        description: strategy.description
      },
      supply_gap_bpd: supplyGap,
      duration_days: duration,
      
      siteSchedules,
      dailyProfile,
      replenishmentPlan,
      coverageAnalysis,
      costAnalysis,
      
      allStrategies: DRAWDOWN_STRATEGIES.map(s => ({
        ...s,
        isSelected: s.id === strategyId,
        daysOfCover: this.quickCoverCalc(s, supplyGap),
        gapCoverage: Math.min(100, Math.round(
          (s.daily_release_bpd || SPR_STATS.max_combined_drawdown_bpd) / supplyGap * 100
        ))
      })),
      
      recommendations: this.generateRecommendations(coverageAnalysis, scenarioResults, strategy),
      processingTime: Math.round(endTime - startTime)
    };

    this.notify({ type: 'optimization-complete', plan: this.currentPlan });
    return this.currentPlan;
  }

  generateSiteSchedules(sites, totalGap, duration, strategy) {
    // Allocate drawdown proportionally to capacity and connectivity
    const totalCapacity = sites.reduce((sum, s) => sum + s.max_drawdown_rate_bpd, 0);
    
    return sites.map(site => {
      const share = site.max_drawdown_rate_bpd / totalCapacity;
      const dailyRelease = strategy.daily_release_bpd 
        ? Math.round(strategy.daily_release_bpd * share)
        : Math.round(totalCapacity * share * 0.65); // staged starts at 65%
      
      const totalReleaseBarrels = dailyRelease * duration;
      const currentStockBarrels = site.current_fill_mmt * 1e6 * 7.33; // MT to barrels
      const daysUntilEmpty = Math.round(currentStockBarrels / dailyRelease);
      
      // Daily stock level projection
      const stockProjection = [];
      let currentStock = site.current_fill_pct;
      const dailyDrainPct = (dailyRelease / (site.capacity_mmt * 1e6 * 7.33)) * 100;
      
      for (let day = 0; day <= Math.min(duration, daysUntilEmpty); day += Math.max(1, Math.floor(duration / 20))) {
        stockProjection.push({
          day,
          fill_pct: Math.max(0, Math.round((currentStock - dailyDrainPct * day) * 10) / 10),
          stock_mmt: Math.max(0, Math.round((site.current_fill_mmt - (dailyRelease * day / (1e6 * 7.33))) * 100) / 100)
        });
      }
      
      // Connected refineries that benefit
      const connectedRefs = REFINERIES.filter(r => 
        site.connected_refineries.includes(r.id)
      ).map(r => ({
        name: r.name,
        company: r.company,
        capacity_bpd: r.capacity_bpd
      }));
      
      return {
        site_id: site.id,
        site_name: site.name,
        location: site.location,
        coordinates: site.coordinates,
        
        current_fill_mmt: site.current_fill_mmt,
        current_fill_pct: site.current_fill_pct,
        capacity_mmt: site.capacity_mmt,
        
        max_drawdown_bpd: site.max_drawdown_rate_bpd,
        planned_drawdown_bpd: dailyRelease,
        
        days_until_empty: daysUntilEmpty,
        total_release_barrels: totalReleaseBarrels,
        total_release_mmt: Math.round(totalReleaseBarrels / (1e6 * 7.33) * 100) / 100,
        
        connected_refineries: connectedRefs,
        pipeline_connectivity: site.pipeline_connectivity,
        
        stockProjection,
        
        status: daysUntilEmpty > duration ? 'adequate' : 
                daysUntilEmpty > duration * 0.5 ? 'strained' : 'critical'
      };
    });
  }

  generateDailyProfile(siteSchedules, duration, strategy) {
    const profile = [];
    const totalDaily = siteSchedules.reduce((sum, s) => sum + s.planned_drawdown_bpd, 0);
    
    for (let day = 0; day <= duration; day += Math.max(1, Math.floor(duration / 30))) {
      let dayRelease = totalDaily;
      
      // Staged strategy modifiers
      if (strategy.stages) {
        if (day <= strategy.stages[0].days) {
          dayRelease = strategy.stages[0].rate_bpd;
        } else if (day <= strategy.stages[0].days + strategy.stages[1].days) {
          dayRelease = strategy.stages[1].rate_bpd;
        } else {
          dayRelease = strategy.stages[2].rate_bpd;
        }
      }
      
      // Check if any site is depleted
      siteSchedules.forEach(site => {
        if (day >= site.days_until_empty) {
          dayRelease -= site.planned_drawdown_bpd;
        }
      });
      
      const cumulativeRelease = Math.round(dayRelease * day / (1e6 * 7.33) * 100) / 100;
      const remainingStock = Math.max(0, 
        SPR_STATS.current_total_fill_mmt - cumulativeRelease
      );
      
      profile.push({
        day,
        daily_release_bpd: Math.max(0, dayRelease),
        cumulative_release_mmt: cumulativeRelease,
        remaining_stock_mmt: Math.round(remainingStock * 100) / 100,
        remaining_pct: Math.round(remainingStock / SPR_STATS.total_capacity_mmt * 100)
      });
    }
    
    return profile;
  }

  planReplenishment(siteSchedules, scenarioResults) {
    const windows = [];
    const scenarioDuration = scenarioResults.duration || 90;
    
    // Identify when replenishment should begin
    const criticalDay = Math.min(...siteSchedules.map(s => s.days_until_empty));
    const replenishmentStart = Math.max(0, criticalDay - 30); // Start 30 days before depletion
    
    SPR_SITES.filter(s => s.status === 'operational').forEach(site => {
      const schedule = siteSchedules.find(ss => ss.site_id === site.id);
      if (!schedule) return;
      
      windows.push({
        site_name: site.name,
        site_id: site.id,
        replenishment_start_day: replenishmentStart,
        lead_time_days: site.replenishment_lead_time_days,
        target_fill_pct: 90,
        current_fill_pct: schedule.stockProjection[schedule.stockProjection.length - 1]?.fill_pct || 0,
        volume_needed_mmt: Math.round((site.capacity_mmt * 0.9 - Math.max(0, 
          site.current_fill_mmt - schedule.total_release_mmt)) * 100) / 100,
        estimated_cost_usd_mn: Math.round(
          (site.capacity_mmt * 0.9 - Math.max(0, site.current_fill_mmt - schedule.total_release_mmt)) *
          1e6 * 7.33 * (scenarioResults.economicImpact?.brent_projected_usd || window.app?.liveBrentPrice || IMPORT_STATS.avg_brent_price_usd) / 1e6
        ),
        port_access: site.port_access,
        priority: schedule.status === 'critical' ? 'urgent' : 'normal'
      });
    });
    
    return windows;
  }

  analyzeCoverage(siteSchedules, supplyGap, duration) {
    const totalDailyDrawdown = siteSchedules.reduce((sum, s) => sum + s.planned_drawdown_bpd, 0);
    const totalAvailable = siteSchedules.reduce((sum, s) => sum + s.current_fill_mmt, 0);
    const totalReleased = siteSchedules.reduce((sum, s) => sum + s.total_release_mmt, 0);
    
    const daysOfCover = Math.round(totalAvailable * 1e6 * 7.33 / totalDailyDrawdown);
    const gapCoverage = Math.min(100, Math.round(totalDailyDrawdown / supplyGap * 100));
    const remainingAfter = Math.max(0, totalAvailable - totalReleased);
    
    return {
      total_available_mmt: Math.round(totalAvailable * 100) / 100,
      total_drawdown_bpd: totalDailyDrawdown,
      total_to_release_mmt: Math.round(totalReleased * 100) / 100,
      remaining_after_mmt: Math.round(remainingAfter * 100) / 100,
      remaining_after_pct: Math.round(remainingAfter / SPR_STATS.total_capacity_mmt * 100),
      days_of_cover: daysOfCover,
      supply_gap_coverage_pct: gapCoverage,
      scenario_duration: duration,
      sufficient: daysOfCover >= duration,
      deficit_days: Math.max(0, duration - daysOfCover),
      emergency_buffer_days: Math.max(0, daysOfCover - duration),
      
      // Benchmark comparison
      iea_target_days: 90,
      iea_gap_days: 90 - daysOfCover,
      
      verdict: daysOfCover >= duration 
        ? '✅ SPR reserves sufficient for scenario duration'
        : `<i data-lucide="alert-triangle"></i> SPR exhausted ${duration - daysOfCover} days before scenario resolution. Alternative procurement essential.`
    };
  }

  analyzeCost(siteSchedules, scenarioResults) {
    const totalReleased = siteSchedules.reduce((sum, s) => sum + s.total_release_mmt, 0);
    const releasedBarrels = totalReleased * 1e6 * 7.33;
    const brentPrice = scenarioResults?.economicImpact?.brent_projected_usd || window.app?.liveBrentPrice || IMPORT_STATS.avg_brent_price_usd;
    
    // SPR crude was purchased at lower prices
    const avgAcquisitionCost = 65.0; // USD/bbl average
    const marketValue = releasedBarrels * brentPrice;
    const acquisitionCost = releasedBarrels * avgAcquisitionCost;
    const savedCost = marketValue - acquisitionCost;
    
    return {
      total_released_mmt: Math.round(totalReleased * 100) / 100,
      total_released_barrels_mn: Math.round(releasedBarrels / 1e6 * 10) / 10,
      avg_acquisition_cost_usd: avgAcquisitionCost,
      current_market_price_usd: brentPrice,
      market_value_usd_mn: Math.round(marketValue / 1e6),
      acquisition_cost_usd_mn: Math.round(acquisitionCost / 1e6),
      implied_savings_usd_mn: Math.round(savedCost / 1e6),
      replenishment_cost_usd_mn: Math.round(marketValue / 1e6 * 1.05), // 5% premium for replenishment
    };
  }

  quickCoverCalc(strategy, supplyGap) {
    const rate = strategy.daily_release_bpd || SPR_STATS.max_combined_drawdown_bpd;
    const totalBarrels = SPR_STATS.current_total_fill_mmt * 1e6 * 7.33;
    return Math.round(totalBarrels / rate);
  }

  generateRecommendations(coverage, scenarioResults, strategy) {
    const recs = [];
    
    if (!coverage.sufficient) {
      recs.push({
        priority: 'critical',
        text: `SPR reserves will be exhausted ${coverage.deficit_days} days before scenario resolution. Immediate alternative procurement activation required.`
      });
    }
    
    recs.push({
      priority: 'high',
      text: `Recommended strategy: ${strategy.name}. ${strategy.description}`
    });
    
    if (coverage.supply_gap_coverage_pct < 50) {
      recs.push({
        priority: 'high',
        text: `SPR can only cover ${coverage.supply_gap_coverage_pct}% of the supply gap. Demand management measures should be activated simultaneously.`
      });
    }
    
    recs.push({
      priority: 'medium',
      text: `Post-crisis replenishment should begin as soon as prices normalize. Target 90% fill within 6 months.`
    });
    
    if (coverage.iea_gap_days > 0) {
      recs.push({
        priority: 'medium',
        text: `India's SPR coverage (${coverage.days_of_cover} days) is ${coverage.iea_gap_days} days below IEA recommended minimum of 90 days. Phase II construction should be accelerated.`
      });
    }
    
    return recs;
  }

  getSPRSummary() {
    return {
      sites: SPR_SITES,
      stats: SPR_STATS,
      strategies: DRAWDOWN_STRATEGIES
    };
  }
}

export { ReserveOptimizer };
