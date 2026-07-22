// ============================================================
// MIRSAD — Strategic Petroleum Reserve Data
// India's SPR sites, fill levels, and drawdown parameters
// SOURCE: Indian Strategic Petroleum Reserves Ltd (ISPRL) public disclosures.
//         Capacity and fill data from PPAC annual reports 2024-25.
//         Benchmark data from EIA and IEA published statistics.
// ============================================================

const SPR_SITES = [
  {
    id: 'spr-vizag',
    name: 'Visakhapatnam',
    location: 'Visakhapatnam, Andhra Pradesh',
    coordinates: [83.32, 17.72],
    phase: 'Phase I',
    operator: 'Indian Strategic Petroleum Reserves Ltd (ISPRL)',
    storage_type: 'Underground Rock Cavern',
    capacity_mmt: 1.33,
    capacity_million_barrels: 9.77,
    current_fill_mmt: 1.15,
    current_fill_pct: 86.5,
    crude_stored: 'Arab Light, Basrah Light',
    max_drawdown_rate_bpd: 75000,
    connected_refineries: ['ref-hpcl-vizag', 'ref-iocl-paradip'],
    pipeline_connectivity: true,
    port_access: 'Vizag Port — single buoy mooring',
    replenishment_lead_time_days: 45,
    status: 'operational'
  },
  {
    id: 'spr-mangalore',
    name: 'Mangalore (Padur)',
    location: 'Mangalore, Karnataka',
    coordinates: [74.85, 12.90],
    phase: 'Phase I',
    operator: 'ISPRL',
    storage_type: 'Underground Rock Cavern',
    capacity_mmt: 1.50,
    capacity_million_barrels: 11.02,
    current_fill_mmt: 1.28,
    current_fill_pct: 85.3,
    crude_stored: 'Abu Dhabi Murban',
    max_drawdown_rate_bpd: 85000,
    connected_refineries: ['ref-mrpl', 'ref-bpcl-kochi'],
    pipeline_connectivity: true,
    port_access: 'New Mangalore Port — dedicated crude terminal',
    replenishment_lead_time_days: 40,
    status: 'operational'
  },
  {
    id: 'spr-padur',
    name: 'Padur',
    location: 'Udupi District, Karnataka',
    coordinates: [74.78, 13.15],
    phase: 'Phase I',
    operator: 'ISPRL',
    storage_type: 'Underground Rock Cavern',
    capacity_mmt: 2.50,
    capacity_million_barrels: 18.37,
    current_fill_mmt: 2.10,
    current_fill_pct: 84.0,
    crude_stored: 'Arab Heavy, Kuwait Export',
    max_drawdown_rate_bpd: 120000,
    connected_refineries: ['ref-mrpl', 'ref-bpcl-kochi'],
    pipeline_connectivity: true,
    port_access: 'Via Mangalore Port pipeline',
    replenishment_lead_time_days: 42,
    status: 'operational'
  },
  {
    id: 'spr-chandikhol',
    name: 'Chandikhol',
    location: 'Jajpur, Odisha',
    coordinates: [86.07, 20.72],
    phase: 'Phase II',
    operator: 'ISPRL (under construction)',
    storage_type: 'Underground Rock Cavern',
    capacity_mmt: 4.40,
    capacity_million_barrels: 32.32,
    current_fill_mmt: 0,
    current_fill_pct: 0,
    crude_stored: 'N/A — under construction',
    max_drawdown_rate_bpd: 200000,
    connected_refineries: ['ref-iocl-paradip', 'ref-iocl-haldia'],
    pipeline_connectivity: false,
    port_access: 'Via Paradip Port (planned)',
    replenishment_lead_time_days: 50,
    status: 'under_construction',
    completion_date: '2028-Q2'
  },
  {
    id: 'spr-padur-expansion',
    name: 'Padur Phase II Expansion',
    location: 'Udupi District, Karnataka',
    coordinates: [74.82, 13.18],
    phase: 'Phase II',
    operator: 'ISPRL (under construction)',
    storage_type: 'Underground Rock Cavern',
    capacity_mmt: 2.50,
    capacity_million_barrels: 18.37,
    current_fill_mmt: 0,
    current_fill_pct: 0,
    crude_stored: 'N/A — under construction',
    max_drawdown_rate_bpd: 120000,
    connected_refineries: ['ref-mrpl'],
    pipeline_connectivity: false,
    port_access: 'Via Mangalore Port (planned)',
    replenishment_lead_time_days: 42,
    status: 'under_construction',
    completion_date: '2029-Q1'
  }
];

const SPR_STATS = {
  get total_capacity_mmt() { return SPR_SITES.reduce((sum, site) => sum + site.capacity_mmt, 0); },
  get total_capacity_million_barrels() { return SPR_SITES.reduce((sum, site) => sum + site.capacity_million_barrels, 0); },
  get current_total_fill_mmt() { return SPR_SITES.reduce((sum, site) => sum + site.current_fill_mmt, 0); },
  get current_total_fill_pct() { return (this.current_total_fill_mmt / this.total_capacity_mmt) * 100; },
  get max_combined_drawdown_bpd() { return SPR_SITES.reduce((sum, site) => sum + (site.max_drawdown_rate_bpd || 0), 0); },
  
  india_daily_consumption_bpd: 5244000,
  india_daily_imports_bpd: 4654000,
  
  get days_of_national_consumption() { return Number(((this.current_total_fill_mmt * 1e6 * 7.33) / this.india_daily_consumption_bpd).toFixed(1)); },
  get days_of_import_cover() { return Number(((this.current_total_fill_mmt * 1e6 * 7.33) / this.india_daily_imports_bpd).toFixed(1)); },
  
  // Phase II planned
  phase2_additional_capacity_mmt: 6.90,
  phase2_total_capacity_mmt: 12.23,
  phase2_target_days_cover: 22,
  
  // Commercial storage (refiners' own)
  commercial_storage_days: 65,
  commercial_storage_mmt: 72.0,
  
  // Comparison benchmarks
  benchmarks: {
    us_spr_days: 35,
    china_spr_days: 80,
    japan_spr_days: 145,
    south_korea_spr_days: 95,
    iea_recommendation_days: 90
  }
};

// Drawdown strategies
const DRAWDOWN_STRATEGIES = [
  {
    id: 'strategy-conservative',
    name: 'Conservative Drawdown',
    description: 'Minimal daily release to extend coverage period. Prioritizes long-term buffer.',
    daily_release_bpd: 100000,
    get days_of_cover() { return Math.round((SPR_STATS.current_total_fill_mmt * 1e6 * 7.33) / this.daily_release_bpd); },
    get total_release_mmt() { return SPR_STATS.current_total_fill_mmt; },
    suitable_for: 'Gradual supply tightening, price-driven shortages',
    risk: 'May not prevent refinery shutdowns in acute shortage'
  },
  {
    id: 'strategy-moderate',
    name: 'Balanced Drawdown',
    description: 'Moderate release rate balancing coverage duration with immediate relief.',
    daily_release_bpd: 180000,
    get days_of_cover() { return Math.round((SPR_STATS.current_total_fill_mmt * 1e6 * 7.33) / this.daily_release_bpd); },
    get total_release_mmt() { return SPR_STATS.current_total_fill_mmt; },
    suitable_for: 'Partial corridor disruption, moderate supply shock',
    risk: 'Exhaustion risk if disruption exceeds forecast duration'
  },
  {
    id: 'strategy-aggressive',
    name: 'Maximum Drawdown',
    description: 'Full-capacity drawdown to maximize immediate supply. Shortest coverage.',
    daily_release_bpd: 280000,
    get days_of_cover() { return Math.round((SPR_STATS.current_total_fill_mmt * 1e6 * 7.33) / this.daily_release_bpd); },
    get total_release_mmt() { return SPR_STATS.current_total_fill_mmt; },
    suitable_for: 'Full blockade, emergency supply gap, refinery shutdown prevention',
    risk: 'Reserves exhausted rapidly; depends on alternative supply activation within 2 weeks'
  },
  {
    id: 'strategy-staged',
    name: 'Staged Release Protocol',
    description: 'Escalating drawdown: 100K → 180K → 280K bpd as situation demands. Adaptive approach.',
    daily_release_bpd: null,
    stages: [
      { name: 'Stage 1 — Alert', days: 7, rate_bpd: 100000, trigger: 'Risk score > 70' },
      { name: 'Stage 2 — Elevated', days: 14, rate_bpd: 180000, trigger: 'Supply gap confirmed' },
      { name: 'Stage 3 — Emergency', days: null, rate_bpd: 280000, trigger: 'Refinery shutdowns imminent' }
    ],
    get days_of_cover() { 
      // Approximate for staged: 7 days @ 100k, 14 days @ 180k, rest at max
      const totalBarrels = SPR_STATS.current_total_fill_mmt * 1e6 * 7.33;
      const b1 = 7 * 100000;
      const b2 = 14 * 180000;
      if (totalBarrels <= b1) return Math.round(totalBarrels / 100000);
      if (totalBarrels <= b1 + b2) return 7 + Math.round((totalBarrels - b1) / 180000);
      return 21 + Math.round((totalBarrels - b1 - b2) / 280000);
    },
    get total_release_mmt() { return SPR_STATS.current_total_fill_mmt; },
    suitable_for: 'Evolving crisis with uncertain duration',
    risk: 'Decision latency at stage transitions; political delays'
  }
];

export { SPR_SITES, SPR_STATS, DRAWDOWN_STRATEGIES };
