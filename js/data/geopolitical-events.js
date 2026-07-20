// ============================================================
// MIRSAD — Geopolitical Events Data
// Real-world-inspired event feed for risk intelligence
// ============================================================

const GEOPOLITICAL_EVENTS = [
  // ── 2025 Events ──
  {
    id: 'evt-001',
    timestamp: '2025-01-15T08:30:00Z',
    type: 'military',
    category: 'Strait of Hormuz',
    title: 'IRGC Naval Exercise Announced in Strait of Hormuz',
    description: 'Iran\'s Islamic Revolutionary Guard Corps announces a 5-day naval exercise in the Strait of Hormuz, deploying fast-attack craft and anti-ship missile batteries. Commercial shipping warned of restricted navigation zones.',
    severity: 'high',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['iraq', 'saudi', 'uae', 'kuwait'],
    source: 'OSINT / Naval Intelligence',
    priceImpact: 3.2,
    riskDelta: 15
  },
  {
    id: 'evt-002',
    timestamp: '2025-02-08T14:15:00Z',
    type: 'sanctions',
    category: 'Iran Sanctions',
    title: 'US Announces Secondary Sanctions on Iranian Oil Exports',
    description: 'US Treasury Department designates 12 entities facilitating Iranian crude exports, including shipping companies and port operators. Indian refiners with Iranian crude contracts face compliance risks.',
    severity: 'elevated',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['iran'],
    source: 'US Treasury / OFAC',
    priceImpact: 2.1,
    riskDelta: 10
  },
  {
    id: 'evt-003',
    timestamp: '2025-03-22T06:45:00Z',
    type: 'attack',
    category: 'Red Sea / Houthi',
    title: 'Houthi Anti-Ship Missile Strikes Tanker in Red Sea',
    description: 'Ansar Allah forces launch anti-ship ballistic missile striking a Suezmax tanker carrying 1M barrels of crude near Bab-el-Mandeb strait. Vessel sustains moderate damage, crew evacuated. Major shipping companies suspend Red Sea transit.',
    severity: 'critical',
    affectedCorridors: ['us-gulf-vizag', 'norway-vadinar', 'guyana-kochi'],
    affectedSuppliers: ['us', 'norway', 'guyana'],
    source: 'UKMTO / IMO',
    priceImpact: 5.8,
    riskDelta: 25
  },
  {
    id: 'evt-004',
    timestamp: '2025-04-10T11:00:00Z',
    type: 'diplomatic',
    category: 'OPEC+',
    title: 'OPEC+ Emergency Meeting: Voluntary Production Cuts Extended',
    description: 'OPEC+ members agree to extend voluntary production cuts of 1.65M bbl/day through Q3 2025, citing global demand uncertainty. Saudi Arabia signals willingness for additional unilateral cuts if prices fall below $80.',
    severity: 'elevated',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore', 'west-africa-mumbai'],
    affectedSuppliers: ['saudi', 'iraq', 'uae', 'kuwait', 'nigeria'],
    source: 'OPEC Secretariat',
    priceImpact: 4.1,
    riskDelta: 12
  },
  {
    id: 'evt-005',
    timestamp: '2025-05-03T09:20:00Z',
    type: 'military',
    category: 'Strait of Hormuz',
    title: 'US-Iran Standoff: USS Eisenhower Carrier Group Deployed',
    description: 'Pentagon deploys USS Dwight D. Eisenhower carrier strike group to Persian Gulf after Iranian fast boats harass commercial vessels. Brent crude surges 8.3% in single session. Indian refiners forced onto spot markets at steep premiums.',
    severity: 'critical',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['iraq', 'saudi', 'uae', 'kuwait', 'iran'],
    source: 'DoD / Reuters',
    priceImpact: 8.3,
    riskDelta: 30
  },
  {
    id: 'evt-006',
    timestamp: '2025-06-18T16:30:00Z',
    type: 'maritime',
    category: 'Shipping Disruption',
    title: 'Suez Canal Congestion: 45+ Vessels Queued',
    description: 'Suez Canal Authority reports severe congestion with 45+ vessels queued for transit. Average wait times extend to 72 hours. Several tankers carrying crude for Indian refineries diverted via Cape of Good Hope, adding 12-15 days transit.',
    severity: 'moderate',
    affectedCorridors: ['us-gulf-vizag', 'norway-vadinar'],
    affectedSuppliers: ['us', 'norway'],
    source: 'Suez Canal Authority / MarineTraffic',
    priceImpact: 1.5,
    riskDelta: 8
  },
  {
    id: 'evt-007',
    timestamp: '2025-07-25T07:00:00Z',
    type: 'sanctions',
    category: 'Russia Sanctions',
    title: 'EU 15th Sanctions Package Targets Russian Oil Shadow Fleet',
    description: 'European Union adopts 15th sanctions package adding 47 shadow fleet tankers to sanctions list. Several vessels identified as carrying Russian crude to Indian ports. Insurance and P&I club coverage complications escalate.',
    severity: 'elevated',
    affectedCorridors: ['russia-espo-paradip'],
    affectedSuppliers: ['russia'],
    source: 'European Commission',
    priceImpact: 2.8,
    riskDelta: 14
  },
  {
    id: 'evt-008',
    timestamp: '2025-08-12T13:45:00Z',
    type: 'attack',
    category: 'Red Sea / Houthi',
    title: 'Houthi Drone Swarm Attack on Merchant Vessels',
    description: 'Coordinated drone swarm attack on 3 commercial vessels in the southern Red Sea. One VLCC carrying 2M barrels sustains fire damage. US and UK naval forces respond with strikes on Houthi positions in Yemen.',
    severity: 'critical',
    affectedCorridors: ['us-gulf-vizag', 'norway-vadinar', 'brazil-chennai'],
    affectedSuppliers: ['us', 'norway', 'brazil'],
    source: 'CENTCOM / Lloyd\'s List',
    priceImpact: 4.6,
    riskDelta: 20
  },
  {
    id: 'evt-009',
    timestamp: '2025-09-30T10:00:00Z',
    type: 'diplomatic',
    category: 'Bilateral',
    title: 'India-Saudi Arabia Long-term Crude Supply Agreement Signed',
    description: 'India and Saudi Arabia sign 5-year strategic crude supply agreement guaranteeing minimum 500K bbl/day supply with preferential pricing. Agreement includes emergency supply provision and strategic storage cooperation.',
    severity: 'low',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['saudi'],
    source: 'MEA India',
    priceImpact: -1.2,
    riskDelta: -8
  },
  {
    id: 'evt-010',
    timestamp: '2025-10-15T08:00:00Z',
    type: 'infrastructure',
    category: 'Port Disruption',
    title: 'Cyclone Damage Disrupts Paradip Port Operations',
    description: 'Severe cyclonic storm causes significant damage to Paradip port infrastructure. Port operations suspended for estimated 3 weeks. IOCL Paradip refinery forced to draw from reserves; crude deliveries diverted to Vizag.',
    severity: 'high',
    affectedCorridors: ['russia-espo-paradip'],
    affectedSuppliers: ['russia'],
    source: 'Indian Ports Authority',
    priceImpact: 0.8,
    riskDelta: 12
  },
  // ── 2026 Events ──
  {
    id: 'evt-011',
    timestamp: '2026-01-08T07:30:00Z',
    type: 'sanctions',
    category: 'Iran Sanctions',
    title: 'US Sanctions Snapback: Full Reimposition on Iranian Oil',
    description: 'US invokes sanctions snapback mechanism, reimposing full secondary sanctions on Iranian crude exports. India\'s imports from Iran (~200K bbl/day) face immediate disruption. Refiners scramble for alternative medium-sour crude grades.',
    severity: 'critical',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['iran'],
    source: 'US State Department / OFAC',
    priceImpact: 6.2,
    riskDelta: 28
  },
  {
    id: 'evt-012',
    timestamp: '2026-02-14T15:00:00Z',
    type: 'military',
    category: 'Strait of Hormuz',
    title: 'Iran Threatens Hormuz Closure Amid Nuclear Talks Collapse',
    description: 'Iranian Supreme National Security Council issues statement threatening Strait of Hormuz closure if \"economic warfare\" against Iran continues. IRGC deploys additional naval assets to Strait. Insurance premiums for Gulf transit surge 340%.',
    severity: 'critical',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['iraq', 'saudi', 'uae', 'kuwait', 'iran'],
    source: 'IRNA / Reuters',
    priceImpact: 7.5,
    riskDelta: 35
  },
  {
    id: 'evt-013',
    timestamp: '2026-03-05T11:20:00Z',
    type: 'attack',
    category: 'Red Sea / Houthi',
    title: 'Houthi Naval Mine Detected in Bab-el-Mandeb Strait',
    description: 'US Navy minesweeper detects and neutralizes sea mine in shipping lane near Bab-el-Mandeb strait. Intelligence suggests Houthi forces have deployed multiple mines in the area. Major shipping lines halt Red Sea transit indefinitely.',
    severity: 'high',
    affectedCorridors: ['us-gulf-vizag', 'norway-vadinar', 'guyana-kochi'],
    affectedSuppliers: ['us', 'norway', 'guyana'],
    source: 'NAVCENT / UKMTO',
    priceImpact: 3.8,
    riskDelta: 18
  },
  {
    id: 'evt-014',
    timestamp: '2026-04-01T09:00:00Z',
    type: 'diplomatic',
    category: 'OPEC+',
    title: 'OPEC+ Emergency Cut: 2M bbl/day Production Reduction',
    description: 'OPEC+ announces emergency production cut of 2M bbl/day effective immediately, citing need to \"stabilize markets\" amid geopolitical uncertainty. Saudi Arabia leads with 1M bbl/day voluntary cut. Brent surges above $95.',
    severity: 'critical',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore', 'west-africa-mumbai'],
    affectedSuppliers: ['saudi', 'iraq', 'uae', 'kuwait', 'nigeria'],
    source: 'OPEC Secretariat',
    priceImpact: 9.1,
    riskDelta: 22
  },
  {
    id: 'evt-015',
    timestamp: '2026-04-22T14:30:00Z',
    type: 'maritime',
    category: 'Shipping Disruption',
    title: 'Global VLCC Shortage: Tanker Rates Hit Record Highs',
    description: 'Cape of Good Hope rerouting combined with increased demand pushes VLCC day rates to $120,000+. Aframax rates surge 280%. Indian refiners face $3-5/barrel freight premium on all crude imports. Spot market premiums widen to $4.50/barrel above term contracts.',
    severity: 'high',
    affectedCorridors: ['west-africa-mumbai', 'brazil-chennai', 'us-gulf-vizag', 'guyana-kochi'],
    affectedSuppliers: ['nigeria', 'brazil', 'us', 'guyana'],
    source: 'Clarkson Research / Baltic Exchange',
    priceImpact: 3.2,
    riskDelta: 15
  },
  {
    id: 'evt-016',
    timestamp: '2026-05-10T06:00:00Z',
    type: 'infrastructure',
    category: 'Pipeline Disruption',
    title: 'ESPO Pipeline Maintenance: Russian Crude Shipments Reduced',
    description: 'Transneft announces 30-day maintenance shutdown of ESPO pipeline segment, reducing Russian Pacific crude exports by 400K bbl/day. Kozmino port loadings halved. Indian refiners relying on ESPO blend (particularly Paradip, Vadinar) seek alternatives.',
    severity: 'elevated',
    affectedCorridors: ['russia-espo-paradip'],
    affectedSuppliers: ['russia'],
    source: 'Transneft / Interfax',
    priceImpact: 1.8,
    riskDelta: 10
  },
  {
    id: 'evt-017',
    timestamp: '2026-05-28T10:15:00Z',
    type: 'diplomatic',
    category: 'Bilateral',
    title: 'India-Guyana Crude Supply MOU: Diversification Push',
    description: 'India signs MOU with Guyana for 100K bbl/day crude supply starting 2027. ExxonMobil\'s Stabroek block production expansion supports the agreement. Move signals India\'s strategic diversification away from Gulf dependence.',
    severity: 'low',
    affectedCorridors: ['guyana-kochi'],
    affectedSuppliers: ['guyana'],
    source: 'MEA India / MoPNG',
    priceImpact: -0.5,
    riskDelta: -5
  },
  {
    id: 'evt-018',
    timestamp: '2026-06-12T08:30:00Z',
    type: 'military',
    category: 'Persian Gulf',
    title: 'Iranian Seizure Attempt on Commercial Tanker Near Hormuz',
    description: 'IRGC fast boats attempt to seize a Marshall Islands-flagged tanker carrying Iraqi crude destined for India\'s Jamnagar refinery. US Navy helicopter intervention prevents seizure. Incident escalates tensions to 2019-crisis levels.',
    severity: 'critical',
    affectedCorridors: ['hormuz-jamnagar', 'hormuz-mangalore'],
    affectedSuppliers: ['iraq', 'saudi', 'uae', 'kuwait'],
    source: 'CENTCOM / UKMTO',
    priceImpact: 5.5,
    riskDelta: 28
  },
  {
    id: 'evt-019',
    timestamp: '2026-06-25T16:00:00Z',
    type: 'sanctions',
    category: 'Russia Sanctions',
    title: 'G7 Tightens Russian Oil Price Cap Enforcement',
    description: 'G7 nations agree on enhanced enforcement mechanisms for the $60/barrel Russian oil price cap, including mandatory attestation for all service providers. Indian refiners processing discounted Russian crude face increased compliance scrutiny.',
    severity: 'moderate',
    affectedCorridors: ['russia-espo-paradip'],
    affectedSuppliers: ['russia'],
    source: 'G7 Summit Communiqué',
    priceImpact: 1.2,
    riskDelta: 7
  },
  {
    id: 'evt-020',
    timestamp: '2026-07-05T09:00:00Z',
    type: 'attack',
    category: 'Red Sea / Houthi',
    title: 'Houthi Escalation: Underwater Drone Targets Oil Infrastructure',
    description: 'Houthi forces deploy underwater drone targeting offshore oil loading terminal in Saudi Red Sea coast. Attack intercepted but signals significant capability upgrade. All Red Sea energy infrastructure on heightened alert.',
    severity: 'high',
    affectedCorridors: ['us-gulf-vizag', 'norway-vadinar'],
    affectedSuppliers: ['us', 'norway', 'saudi'],
    source: 'Saudi Press Agency / CENTCOM',
    priceImpact: 4.2,
    riskDelta: 20
  }
];

// Event type icons
const EVENT_ICONS = {
  military: '⚔️',
  sanctions: '🚫',
  attack: '💥',
  diplomatic: '🤝',
  maritime: '🚢',
  infrastructure: '🏗️'
};

// Event severity order
const SEVERITY_ORDER = {
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  critical: 5
};

export { GEOPOLITICAL_EVENTS, EVENT_ICONS, SEVERITY_ORDER };
