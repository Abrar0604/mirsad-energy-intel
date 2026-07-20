// ============================================================
// MIRSAD — Supply Routes Data
// Major crude supply corridors to India with route coordinates
// ============================================================

const SUPPLY_ROUTES = [
  {
    id: 'hormuz-jamnagar',
    name: 'Persian Gulf → Jamnagar',
    origin: 'Ras Tanura / Basrah',
    destination: 'Jamnagar (RIL)',
    chokepoints: ['Strait of Hormuz'],
    distance_nm: 1480,
    transit_days: 7,
    vessel_class: 'VLCC',
    annual_volume_mmt: 42.5,
    share_of_imports: 18.2,
    risk_level: 'high',
    hormuz_dependent: true,
    coordinates: [
      [49.5, 26.5],   // Ras Tanura
      [56.2, 26.3],   // Hormuz approach
      [56.5, 25.5],   // Hormuz strait
      [58.0, 24.0],   // Gulf of Oman
      [62.0, 22.5],   // Arabian Sea
      [66.0, 21.0],   // Approach
      [69.8, 22.5]    // Jamnagar
    ],
    status: 'active',
    current_risk_score: 72
  },
  {
    id: 'hormuz-mangalore',
    name: 'Persian Gulf → Mangalore',
    origin: 'Kuwait / UAE Ports',
    destination: 'Mangalore (MRPL/ONGC)',
    chokepoints: ['Strait of Hormuz'],
    distance_nm: 1850,
    transit_days: 9,
    vessel_class: 'Suezmax',
    annual_volume_mmt: 28.3,
    share_of_imports: 12.1,
    risk_level: 'high',
    hormuz_dependent: true,
    coordinates: [
      [48.5, 29.3],   // Kuwait
      [54.0, 26.8],   // UAE waters
      [56.5, 25.5],   // Hormuz
      [59.0, 23.5],   // Gulf of Oman
      [63.0, 20.0],   // Arabian Sea
      [67.0, 17.0],   // Approach
      [74.8, 12.9]    // Mangalore
    ],
    status: 'active',
    current_risk_score: 68
  },
  {
    id: 'russia-espo-paradip',
    name: 'Russia (ESPO) → Paradip',
    origin: 'Kozmino (ESPO Terminal)',
    destination: 'Paradip (IOCL)',
    chokepoints: ['Malacca Strait'],
    distance_nm: 5200,
    transit_days: 22,
    vessel_class: 'Aframax/Suezmax',
    annual_volume_mmt: 38.5,
    share_of_imports: 16.5,
    risk_level: 'moderate',
    hormuz_dependent: false,
    coordinates: [
      [132.9, 42.7],  // Kozmino
      [128.0, 37.0],  // Korea Strait
      [122.0, 30.0],  // East China Sea
      [117.0, 22.0],  // South China Sea
      [110.0, 8.0],   // Approach Malacca
      [103.5, 1.3],   // Malacca Strait
      [95.0, 5.0],    // Andaman Sea
      [86.7, 20.3]    // Paradip
    ],
    status: 'active',
    current_risk_score: 42
  },
  {
    id: 'west-africa-mumbai',
    name: 'West Africa → Mumbai',
    origin: 'Bonny (Nigeria) / Djeno (Congo)',
    destination: 'Mumbai (BPCL/HPCL)',
    chokepoints: ['Cape of Good Hope'],
    distance_nm: 6800,
    transit_days: 28,
    vessel_class: 'VLCC/Suezmax',
    annual_volume_mmt: 22.8,
    share_of_imports: 9.8,
    risk_level: 'moderate',
    hormuz_dependent: false,
    coordinates: [
      [7.1, 4.5],     // Bonny, Nigeria
      [3.0, 0.0],     // Gulf of Guinea
      [5.0, -10.0],   // South Atlantic
      [12.0, -25.0],  // Approach Cape
      [18.5, -34.0],  // Cape of Good Hope
      [30.0, -30.0],  // Indian Ocean entry
      [45.0, -15.0],  // Mozambique Channel
      [55.0, -5.0],   // Central Indian Ocean
      [65.0, 10.0],   // Arabian Sea
      [72.8, 18.9]    // Mumbai
    ],
    status: 'active',
    current_risk_score: 38
  },
  {
    id: 'us-gulf-vizag',
    name: 'US Gulf → Vizag',
    origin: 'Houston / LOOP Terminal',
    destination: 'Vizag (HPCL)',
    chokepoints: ['Suez Canal', 'Bab-el-Mandeb (alt: Cape route)'],
    distance_nm: 9200,
    transit_days: 38,
    vessel_class: 'VLCC',
    annual_volume_mmt: 15.6,
    share_of_imports: 6.7,
    risk_level: 'elevated',
    hormuz_dependent: false,
    coordinates: [
      [-95.0, 29.0],  // Houston
      [-88.0, 27.0],  // Gulf of Mexico
      [-80.0, 24.0],  // Florida Strait
      [-65.0, 20.0],  // Atlantic
      [-20.0, 30.0],  // Mid-Atlantic
      [0.0, 35.0],    // Gibraltar approach
      [30.0, 32.0],   // Mediterranean
      [32.3, 31.2],   // Suez Canal
      [35.0, 28.0],   // Red Sea north
      [43.0, 12.5],   // Bab-el-Mandeb
      [55.0, 10.0],   // Arabian Sea
      [70.0, 13.0],   // Bay of Bengal approach
      [83.3, 17.7]    // Vizag
    ],
    status: 'active',
    current_risk_score: 55
  },
  {
    id: 'guyana-kochi',
    name: 'Guyana → Kochi',
    origin: 'Georgetown (Stabroek Block)',
    destination: 'Kochi (BPCL)',
    chokepoints: ['Suez Canal / Cape route'],
    distance_nm: 8900,
    transit_days: 36,
    vessel_class: 'Suezmax',
    annual_volume_mmt: 5.2,
    share_of_imports: 2.2,
    risk_level: 'moderate',
    hormuz_dependent: false,
    coordinates: [
      [-58.0, 7.0],   // Georgetown
      [-45.0, 0.0],   // Mid-Atlantic
      [-20.0, -10.0], // South Atlantic
      [5.0, -25.0],   // Approach Cape
      [18.5, -34.0],  // Cape of Good Hope
      [40.0, -20.0],  // Indian Ocean
      [55.0, -5.0],   // Central Indian Ocean
      [65.0, 5.0],    // Arabian Sea
      [76.3, 9.9]     // Kochi
    ],
    status: 'active',
    current_risk_score: 35
  },
  {
    id: 'brazil-chennai',
    name: 'Brazil → Chennai',
    origin: 'Santos / Angra dos Reis',
    destination: 'Chennai (CPCL)',
    chokepoints: ['Cape of Good Hope'],
    distance_nm: 8500,
    transit_days: 35,
    vessel_class: 'VLCC/Suezmax',
    annual_volume_mmt: 8.4,
    share_of_imports: 3.6,
    risk_level: 'low',
    hormuz_dependent: false,
    coordinates: [
      [-46.3, -23.9], // Santos
      [-40.0, -20.0], // Brazil coast
      [-15.0, -28.0], // South Atlantic
      [5.0, -33.0],   // Approach Cape
      [18.5, -34.0],  // Cape of Good Hope
      [35.0, -25.0],  // Indian Ocean
      [55.0, -10.0],  // Central Indian Ocean
      [70.0, 0.0],    // Approach India
      [80.3, 13.1]    // Chennai
    ],
    status: 'active',
    current_risk_score: 25
  },
  {
    id: 'norway-vadinar',
    name: 'Norway/North Sea → Vadinar',
    origin: 'Mongstad / Sture (Norway)',
    destination: 'Vadinar (Nayara Energy)',
    chokepoints: ['Suez Canal', 'Bab-el-Mandeb'],
    distance_nm: 6100,
    transit_days: 25,
    vessel_class: 'Suezmax',
    annual_volume_mmt: 6.8,
    share_of_imports: 2.9,
    risk_level: 'elevated',
    hormuz_dependent: false,
    coordinates: [
      [5.0, 60.5],    // Mongstad
      [0.0, 55.0],    // North Sea
      [-5.0, 48.0],   // English Channel
      [-10.0, 36.0],  // Gibraltar approach
      [15.0, 35.0],   // Mediterranean
      [32.3, 31.2],   // Suez Canal
      [35.0, 28.0],   // Red Sea
      [43.0, 12.5],   // Bab-el-Mandeb
      [50.0, 15.0],   // Gulf of Aden
      [60.0, 18.0],   // Arabian Sea
      [69.7, 22.3]    // Vadinar
    ],
    status: 'active',
    current_risk_score: 50
  }
];

// Chokepoint definitions
const CHOKEPOINTS = [
  {
    id: 'hormuz',
    name: 'Strait of Hormuz',
    coordinates: [56.4, 26.0],
    width_nm: 21,
    daily_flow_mbd: 21.0,
    description: 'World\'s most critical oil chokepoint. ~21M bbl/day transit.',
    risk_level: 'critical',
    controlled_by: 'Iran / Oman territorial waters',
    current_threat: 'Active — IRGC naval presence, seizure attempts'
  },
  {
    id: 'bab-el-mandeb',
    name: 'Bab-el-Mandeb',
    coordinates: [43.3, 12.6],
    width_nm: 18,
    daily_flow_mbd: 6.2,
    description: 'Southern Red Sea chokepoint. ~6.2M bbl/day transit.',
    risk_level: 'critical',
    controlled_by: 'Yemen (Houthi threat) / Djibouti',
    current_threat: 'Active — Houthi anti-ship missiles, drones, mines'
  },
  {
    id: 'suez',
    name: 'Suez Canal',
    coordinates: [32.35, 31.0],
    width_nm: 0.12,
    daily_flow_mbd: 5.5,
    description: 'Critical shortcut between Mediterranean and Red Sea.',
    risk_level: 'elevated',
    controlled_by: 'Egypt (SCA)',
    current_threat: 'Moderate — Congestion, political instability'
  },
  {
    id: 'malacca',
    name: 'Malacca Strait',
    coordinates: [101.5, 2.5],
    width_nm: 1.5,
    daily_flow_mbd: 16.0,
    description: 'Southeast Asia\'s primary shipping lane. ~16M bbl/day transit.',
    risk_level: 'moderate',
    controlled_by: 'Malaysia / Indonesia / Singapore',
    current_threat: 'Low — Piracy concerns, congestion'
  },
  {
    id: 'cape',
    name: 'Cape of Good Hope',
    coordinates: [18.5, -34.4],
    width_nm: null,
    daily_flow_mbd: 9.0,
    description: 'Alternative to Suez route. Longer transit but no chokepoint restrictions.',
    risk_level: 'low',
    controlled_by: 'International waters',
    current_threat: 'Minimal — Weather risks, longer transit'
  }
];

// Simulated vessel positions (AIS-inspired)
const SIMULATED_VESSELS = [
  { id: 'v001', name: 'KAMDHENU SPIRIT', type: 'VLCC', flag: 'IN', dwt: 320000, route: 'hormuz-jamnagar', position: [60.5, 23.2], heading: 120, speed: 14.5, cargo: 'Basrah Medium', destination: 'Jamnagar' },
  { id: 'v002', name: 'DESH GARIMA', type: 'VLCC', flag: 'IN', dwt: 318000, route: 'hormuz-jamnagar', position: [65.0, 21.5], heading: 135, speed: 13.8, cargo: 'Arab Heavy', destination: 'Jamnagar' },
  { id: 'v003', name: 'MAHARASHTRA', type: 'Suezmax', flag: 'IN', dwt: 158000, route: 'hormuz-mangalore', position: [58.5, 22.0], heading: 150, speed: 14.2, cargo: 'Kuwait Export', destination: 'Mangalore' },
  { id: 'v004', name: 'NS CHAMPION', type: 'Aframax', flag: 'LR', dwt: 115000, route: 'russia-espo-paradip', position: [110.0, 12.0], heading: 250, speed: 13.0, cargo: 'ESPO Blend', destination: 'Paradip' },
  { id: 'v005', name: 'PACIFIC VOYAGER', type: 'Suezmax', flag: 'PA', dwt: 156000, route: 'russia-espo-paradip', position: [95.5, 6.0], heading: 260, speed: 12.5, cargo: 'Sokol', destination: 'Vadinar' },
  { id: 'v006', name: 'WEST AFRICA SUN', type: 'VLCC', flag: 'GR', dwt: 310000, route: 'west-africa-mumbai', position: [45.0, -10.0], heading: 50, speed: 14.0, cargo: 'Bonny Light', destination: 'Mumbai' },
  { id: 'v007', name: 'EAGLE HOUSTON', type: 'VLCC', flag: 'US', dwt: 305000, route: 'us-gulf-vizag', position: [40.0, 14.0], heading: 90, speed: 13.5, cargo: 'WTI Midland', destination: 'Vizag' },
  { id: 'v008', name: 'NORDIC SPIRIT', type: 'Suezmax', flag: 'NO', dwt: 155000, route: 'norway-vadinar', position: [35.5, 27.0], heading: 140, speed: 14.0, cargo: 'Johan Sverdrup', destination: 'Vadinar' },
  { id: 'v009', name: 'SANTOS TRADER', type: 'Suezmax', flag: 'BR', dwt: 152000, route: 'brazil-chennai', position: [50.0, -18.0], heading: 60, speed: 13.2, cargo: 'Lula', destination: 'Chennai' },
  { id: 'v010', name: 'ARABIAN PEARL', type: 'VLCC', flag: 'AE', dwt: 320000, route: 'hormuz-jamnagar', position: [55.0, 25.0], heading: 110, speed: 12.0, cargo: 'Murban', destination: 'Mangalore' }
];

export { SUPPLY_ROUTES, CHOKEPOINTS, SIMULATED_VESSELS };
