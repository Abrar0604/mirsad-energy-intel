import { SPR_STATS } from './spr-data.js';

const SCENARIOS = [
// ... (down to line 107)
  {
    id: 'scenario-hormuz-partial',
    name: 'Hormuz Partial Closure',
    icon: '⚔️',
    category: 'Military/Geopolitical',
    severity: 'critical',
    description: 'Iran partially restricts transit through Strait of Hormuz, reducing flow by 50%. IRGC naval forces implement "inspection zones" targeting specific flag states.',
    trigger: 'Iran-US military escalation; IRGC retaliatory action',
    probability: 0.25,
    duration_days: 90,
    
    // Supply impact
    flow_reduction_pct: 50,
    affected_volume_mbd: 10.5,
    india_volume_loss_bpd: 850000,
    affected_corridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affected_suppliers: ['iraq', 'saudi', 'uae', 'kuwait', 'iran'],
    
    // Economic impact
    brent_price_impact_pct: 35,
    brent_projected_usd: 111.4,
    india_import_bill_increase_usd_bn: 28.5,
    gdp_impact_pct: -0.8,
    petrol_price_impact_inr: 18.5,
    diesel_price_impact_inr: 22.0,
    inflation_impact_pct: 1.8,
    
    // Refinery impact
    refinery_utilization_drop_pct: 22,
    refineries_critical: ['ref-ril-jam', 'ref-ril-sez', 'ref-iocl-gujarat', 'ref-iocl-mathura'],
    
    // Power sector
    power_sector_stress: 'High — Gas turbine plants face fuel switching challenges',
    
    // Timeline
    timeline: [
      { day: 1, event: 'IRGC announces restricted navigation zones', impact: 'Insurance premiums surge 500%' },
      { day: 3, event: 'Major tanker operators suspend Hormuz transit', impact: 'Spot crude prices surge 15%' },
      { day: 7, event: 'Indian refiners activate contingency procurement', impact: 'SPR drawdown initiated' },
      { day: 14, event: 'Alternative supply routes fully activated', impact: 'Partial supply restoration via Cape route' },
      { day: 30, event: 'International diplomatic intervention intensifies', impact: 'Limited tanker convoys resume' },
      { day: 60, event: 'Partial reopening of select shipping lanes', impact: 'Insurance premiums begin declining' },
      { day: 90, event: 'Scenario resolution — full reopening', impact: 'Markets stabilize over 2-3 weeks' }
    ],
    
    // Assumptions
    assumptions: [
      'Iran restricts but does not fully close the strait',
      'US Navy does not establish forced convoy system before day 30',
      'OPEC spare capacity of 3.5M bbl/day is partially available',
      'Indian SPR at 80% fill level at scenario start',
      'Cape of Good Hope rerouting adds 12-15 days transit',
      'Tanker availability constrained but not zero'
    ]
  },
  {
    id: 'scenario-hormuz-full',
    name: 'Full Hormuz Blockade',
    icon: '🚫',
    category: 'Military/Geopolitical',
    severity: 'critical',
    description: 'Complete closure of Strait of Hormuz due to military conflict. All commercial shipping halted. Mine deployment and active naval engagement.',
    trigger: 'Full-scale Iran military conflict; mine warfare',
    probability: 0.08,
    duration_days: 30,
    
    flow_reduction_pct: 100,
    affected_volume_mbd: 21.0,
    india_volume_loss_bpd: 1700000,
    affected_corridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affected_suppliers: ['iraq', 'saudi', 'uae', 'kuwait', 'iran'],
    
    brent_price_impact_pct: 80,
    brent_projected_usd: 148.5,
    india_import_bill_increase_usd_bn: 52.0,
    gdp_impact_pct: -2.1,
    petrol_price_impact_inr: 38.0,
    diesel_price_impact_inr: 45.0,
    inflation_impact_pct: 3.5,
    
    refinery_utilization_drop_pct: 45,
    refineries_critical: ['ref-ril-jam', 'ref-ril-sez', 'ref-iocl-gujarat', 'ref-iocl-mathura', 'ref-iocl-panipat', 'ref-bpcl-mumbai', 'ref-mrpl'],
    
    power_sector_stress: 'Critical — Rolling blackouts in industrial zones likely',
    
    timeline: [
      { day: 1, event: 'Hormuz fully closed — mine deployment confirmed', impact: 'Global oil prices surge 40%+ intraday' },
      { day: 2, event: 'India declares energy emergency', impact: 'SPR emergency drawdown authorized' },
      { day: 5, event: 'Fuel rationing measures implemented', impact: 'Industrial consumption restricted 20%' },
      { day: 10, event: 'US/Coalition mine clearing operations begin', impact: 'Insurance rates become prohibitive' },
      { day: 20, event: 'Partial naval escort corridors established', impact: 'Limited tanker transit resumes' },
      { day: 30, event: 'Military operations reduce threat level', impact: 'Gradual reopening process begins' }
    ],
    
    get assumptions() {
      return [
        'Full military blockade with active mine warfare',
        'US/Coalition military response within 48 hours',
        'Duration limited to 30 days by international military intervention',
        'Saudi East-West pipeline (5M bbl/day capacity) operational as partial bypass',
        'UAE Fujairah strategic reserves accessible',
        `India SPR provides ${SPR_STATS.days_of_national_consumption} days cover at current drawdown rate`
      ];
    }
  },
  {
    id: 'scenario-opec-cut',
    name: 'OPEC+ Emergency Production Cut',
    icon: '📉',
    category: 'Market/Policy',
    severity: 'high',
    description: 'OPEC+ implements emergency production cut of 2M bbl/day to support prices, with Saudi Arabia leading 1M bbl/day voluntary reduction.',
    trigger: 'OPEC+ policy decision; price defense strategy',
    probability: 0.40,
    duration_days: 180,
    
    flow_reduction_pct: 12,
    affected_volume_mbd: 2.0,
    india_volume_loss_bpd: 350000,
    affected_corridors: ['hormuz-jamnagar', 'hormuz-mangalore', 'west-africa-mumbai'],
    affected_suppliers: ['saudi', 'iraq', 'uae', 'kuwait', 'nigeria'],
    
    brent_price_impact_pct: 22,
    brent_projected_usd: 100.7,
    india_import_bill_increase_usd_bn: 18.5,
    gdp_impact_pct: -0.4,
    petrol_price_impact_inr: 12.0,
    diesel_price_impact_inr: 14.5,
    inflation_impact_pct: 0.9,
    
    refinery_utilization_drop_pct: 8,
    refineries_critical: ['ref-ril-jam', 'ref-iocl-panipat'],
    
    power_sector_stress: 'Moderate — Fuel cost increase but supply adequate',
    
    timeline: [
      { day: 1, event: 'OPEC+ announces emergency cut', impact: 'Brent surges 8-10%' },
      { day: 7, event: 'Term contract nominations reduced', impact: 'Spot market premiums widen' },
      { day: 30, event: 'Indian refiners diversify to non-OPEC sources', impact: 'US, Brazil, Guyana volumes increase' },
      { day: 60, event: 'Market rebalances at higher price level', impact: 'New pricing equilibrium established' },
      { day: 120, event: 'OPEC+ compliance begins weakening', impact: 'Some members exceed quotas' },
      { day: 180, event: 'Cuts partially rolled back', impact: 'Prices moderate 5-8%' }
    ],
    
    assumptions: [
      'OPEC+ achieves 85% compliance rate',
      'Non-OPEC production (US, Brazil, Guyana) continues growing',
      'Global demand growth at 1.2M bbl/day annually',
      'India can increase Russian crude imports by 200K bbl/day',
      'Strategic reserves not drawn down for price-driven shortages',
      'No simultaneous geopolitical disruption'
    ]
  },
  {
    id: 'scenario-redsea',
    name: 'Red Sea Shipping Suspension',
    icon: '💥',
    category: 'Security/Maritime',
    severity: 'high',
    description: 'Escalated Houthi attacks force complete suspension of commercial shipping through Red Sea and Bab-el-Mandeb strait. All traffic rerouted via Cape of Good Hope.',
    trigger: 'Houthi capability escalation; successful attack on major tanker',
    probability: 0.35,
    duration_days: 120,
    
    flow_reduction_pct: 0,
    affected_volume_mbd: 0,
    india_volume_loss_bpd: 0,
    affected_corridors: ['us-gulf-vizag', 'norway-vadinar', 'guyana-kochi'],
    affected_suppliers: ['us', 'norway', 'guyana'],
    
    brent_price_impact_pct: 15,
    brent_projected_usd: 94.9,
    india_import_bill_increase_usd_bn: 12.0,
    gdp_impact_pct: -0.3,
    petrol_price_impact_inr: 8.5,
    diesel_price_impact_inr: 10.0,
    inflation_impact_pct: 0.6,
    
    refinery_utilization_drop_pct: 5,
    refineries_critical: ['ref-hpcl-vizag', 'ref-nayara'],
    
    power_sector_stress: 'Low — Supply continues via Cape route, only delayed',
    
    additional_impacts: {
      freight_premium_usd_bbl: 4.5,
      transit_time_increase_days: 14,
      tanker_utilization_increase_pct: 12,
      vlcc_rate_increase_pct: 180
    },
    
    timeline: [
      { day: 1, event: 'Major tanker attacked — shipping lines suspend Red Sea transit', impact: 'Freight rates surge 150%' },
      { day: 5, event: 'All Suez-bound crude diverted to Cape route', impact: '+12-15 days transit time' },
      { day: 14, event: 'VLCC shortage emerges from longer voyages', impact: 'Day rates hit $120K' },
      { day: 30, event: 'Supply chain adapts to longer transit', impact: 'Inventory buffers strained' },
      { day: 60, event: 'US/Coalition military operations intensify', impact: 'Selective convoy system proposed' },
      { day: 90, event: 'Partial Red Sea transit resumes with naval escort', impact: 'Freight premiums begin declining' },
      { day: 120, event: 'Commercial shipping confidence recovers', impact: 'Normal routing partially restored' }
    ],
    
    assumptions: [
      'No actual supply volume loss — only rerouting delay',
      'Cape of Good Hope route remains safe',
      'Tanker fleet can absorb longer voyage times',
      'Indian port infrastructure handles delayed arrivals',
      'Refinery crude storage buffers absorb 2-week delay',
      'Insurance markets continue covering Cape route'
    ]
  },
  {
    id: 'scenario-iran-sanctions',
    name: 'Iran Sanctions Snapback',
    icon: '🚫',
    category: 'Sanctions/Policy',
    severity: 'elevated',
    description: 'Full reimposition of US secondary sanctions on Iranian crude exports. India loses ~200K bbl/day of discounted Iranian supply. Refiners must find medium-sour alternatives.',
    trigger: 'US policy decision; JCPOA collapse; sanctions snapback mechanism',
    probability: 0.55,
    duration_days: 365,
    
    flow_reduction_pct: 100,
    affected_volume_mbd: 0.8,
    india_volume_loss_bpd: 200000,
    affected_corridors: ['hormuz-jamnagar'],
    affected_suppliers: ['iran'],
    
    brent_price_impact_pct: 8,
    brent_projected_usd: 89.1,
    india_import_bill_increase_usd_bn: 6.5,
    gdp_impact_pct: -0.15,
    petrol_price_impact_inr: 4.5,
    diesel_price_impact_inr: 5.5,
    inflation_impact_pct: 0.3,
    
    refinery_utilization_drop_pct: 3,
    refineries_critical: ['ref-ril-sez', 'ref-mrpl'],
    
    power_sector_stress: 'Minimal — volume replaceable from alternative sources',
    
    timeline: [
      { day: 1, event: 'US announces sanctions snapback', impact: 'Iranian crude cargoes at sea face seizure risk' },
      { day: 7, event: 'Indian refiners halt Iranian crude lifting', impact: 'Spot market demand increases' },
      { day: 14, event: 'Alternative procurement activated', impact: 'Iraq, Saudi increase allocations' },
      { day: 30, event: 'Supply gap largely closed', impact: 'Premium of $2-3/bbl on replacements' },
      { day: 90, event: 'New supply patterns stabilized', impact: 'Long-term contracts renegotiated' }
    ],
    
    assumptions: [
      'India complies with US secondary sanctions',
      'No waiver granted to Indian refiners',
      'Iranian crude replaceable with Iraqi/Saudi medium-sour',
      'No simultaneous Hormuz disruption',
      'Payment mechanism (INR/rupee) settlements unwound',
      'Replacement crude available at 2-3% premium'
    ]
  }
];

export { SCENARIOS };
