// ============================================================
// MIRSAD — Map Engine
// Leaflet-based geospatial visualization
// ============================================================

import { SUPPLY_ROUTES, CHOKEPOINTS, SIMULATED_VESSELS } from '../data/supply-routes.js';
import { REFINERIES } from '../data/refineries.js';
import { SPR_SITES } from '../data/spr-data.js';
import { RiskIntelligenceAgent } from '../agents/risk-intelligence.js';

class MapEngine {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.layers = {
      routes: null,
      refineries: null,
      ports: null,
      chokepoints: null,
      vessels: null,
      sprSites: null,
      riskZones: null
    };
    this.layerVisibility = {
      routes: true,
      refineries: true,
      chokepoints: true,
      vessels: true,
      sprSites: true,
      riskZones: true
    };
  }

  initialize() {
    if (this.map) return this.map;

    // Create map
    this.map = L.map(this.containerId, {
      center: [20, 55],
      zoom: 4,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: true
    });

    // High-performance Dark Gray Canvas basemap (free, reliable, zero watermarks)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© <a href="https://www.esri.com">Esri</a> · USGS, NOAA',
      maxZoom: 16
    }).addTo(this.map);

    // Subtle dark labels overlay
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      opacity: 0.65
    }).addTo(this.map);

    // Add zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Re-render Lucide icons inside Leaflet popups whenever one opens
    this.map.on('popupopen', (e) => {
      if (window.lucide && e.popup) {
        window.lucide.createIcons({
          root: e.popup.getElement()
        });
      }
    });

    // Initialize all layers
    this.initRoutes();
    this.initRefineries();
    this.initChokepoints();
    this.initVessels();
    this.initSPRSites();
    this.initRiskZones();

    return this.map;
  }

  initRoutes() {
    this.layers.routes = L.layerGroup().addTo(this.map);

    SUPPLY_ROUTES.forEach(route => {
      const coords = route.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
      const riskColor = this.getRiskColor(route.current_risk_score);
      const riskLevel = RiskIntelligenceAgent.getRiskLevel(route.current_risk_score);
      
      // Main visible route line
      const routeLine = L.polyline(coords, {
        color: riskColor,
        weight: 3,
        opacity: 0.8,
        dashArray: route.current_risk_score > 65 ? '8, 4' : null,
        className: `route-${riskLevel}`
      });

      // Generous invisible hit-buffer polyline (18px wide) for easy clickability anywhere along the corridor
      const hitBuffer = L.polyline(coords, {
        weight: 18,
        opacity: 0,
        interactive: true
      });

      const popupHtml = this.createRoutePopup(route);
      routeLine.bindPopup(popupHtml, { offset: [0, -4] });
      hitBuffer.bindPopup(popupHtml, { offset: [0, -4] });

      const onHover = () => routeLine.setStyle({ weight: 5, opacity: 1 });
      const onOut = () => routeLine.setStyle({ weight: 3, opacity: 0.8 });

      routeLine.on('mouseover', onHover);
      routeLine.on('mouseout', onOut);
      hitBuffer.on('mouseover', onHover);
      hitBuffer.on('mouseout', onOut);

      this.layers.routes.addLayer(routeLine);
      this.layers.routes.addLayer(hitBuffer);

      // Animated flow dots: must have interactive: false so they never intercept clicks
      if (route.status === 'active') {
        const flowDot = L.circleMarker(coords[Math.floor(coords.length / 2)], {
          radius: 3,
          fillColor: riskColor,
          fillOpacity: 0.9,
          color: 'transparent',
          className: 'animate-pulse-glow',
          interactive: false
        });
        this.layers.routes.addLayer(flowDot);
      }
    });
  }

  initRefineries() {
    this.layers.refineries = L.layerGroup().addTo(this.map);

    REFINERIES.forEach(refinery => {
      const isStressed = refinery.utilization < 0.85;
      const markerHtml = `<div class="map-marker marker-refinery ${isStressed ? 'marker-refinery--stressed' : ''}" 
        title="${refinery.name}"><i data-lucide="factory"></i></div>`;
      
      // Offset SEZ slightly so Jamnagar DTA and SEZ do not completely occlude each other at low zoom
      let lat = refinery.coordinates[1];
      let lng = refinery.coordinates[0];
      if (refinery.id === 'ref-ril-sez') {
        lat += 0.12;
        lng -= 0.14;
      }

      const marker = L.marker(
        [lat, lng], 
        {
          icon: L.divIcon({
            html: markerHtml,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -14]
          })
        }
      );

      marker.bindPopup(this.createRefineryPopup(refinery));
      this.layers.refineries.addLayer(marker);
    });
  }

  initChokepoints() {
    this.layers.chokepoints = L.layerGroup().addTo(this.map);

    CHOKEPOINTS.forEach(cp => {
      const markerHtml = `<div class="map-marker marker-chokepoint" title="${cp.name}"><i data-lucide="alert-triangle"></i></div>`;
      
      const marker = L.marker(
        [cp.coordinates[1], cp.coordinates[0]],
        {
          icon: L.divIcon({
            html: markerHtml,
            className: 'custom-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16]
          }),
          zIndexOffset: 1000
        }
      );

      marker.bindPopup(this.createChokepointPopup(cp));
      this.layers.chokepoints.addLayer(marker);
    });
  }

  initVessels() {
    this.layers.vessels = L.layerGroup().addTo(this.map);

    SIMULATED_VESSELS.forEach(vessel => {
      const markerHtml = `<div class="map-marker marker-vessel" title="${vessel.name}"
        style="transform: rotate(${vessel.heading}deg)"><i data-lucide="ship"></i></div>`;
      
      const marker = L.marker(
        [vessel.position[1], vessel.position[0]],
        {
          icon: L.divIcon({
            html: markerHtml,
            className: 'custom-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -10]
          })
        }
      );

      marker.bindPopup(this.createVesselPopup(vessel));
      this.layers.vessels.addLayer(marker);
    });
  }

  initSPRSites() {
    this.layers.sprSites = L.layerGroup().addTo(this.map);

    SPR_SITES.filter(s => s.status === 'operational').forEach(site => {
      const markerHtml = `<div class="map-marker marker-spr" title="${site.name}"><i data-lucide="database"></i></div>`;
      
      const marker = L.marker(
        [site.coordinates[1], site.coordinates[0]],
        {
          icon: L.divIcon({
            html: markerHtml,
            className: 'custom-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [0, -14]
          })
        }
      );

      marker.bindPopup(this.createSPRPopup(site));
      this.layers.sprSites.addLayer(marker);
    });
  }

  initRiskZones() {
    this.layers.riskZones = L.layerGroup().addTo(this.map);

    // Hormuz risk zone (non-interactive so it never occludes markers or routes underneath)
    const hormuzZone = L.circle([26.0, 56.4], {
      radius: 150000,
      fillColor: '#dc2626',
      fillOpacity: 0.08,
      color: '#dc2626',
      weight: 1,
      dashArray: '6, 4',
      interactive: false
    });
    this.layers.riskZones.addLayer(hormuzZone);

    // Red Sea risk zone (non-interactive)
    const redSeaZone = L.circle([15.0, 42.0], {
      radius: 300000,
      fillColor: '#ef4444',
      fillOpacity: 0.06,
      color: '#ef4444',
      weight: 1,
      dashArray: '6, 4',
      interactive: false
    });
    this.layers.riskZones.addLayer(redSeaZone);

    // Bab-el-Mandeb risk zone (non-interactive)
    const babZone = L.circle([12.6, 43.3], {
      radius: 100000,
      fillColor: '#dc2626',
      fillOpacity: 0.1,
      color: '#dc2626',
      weight: 1.5,
      dashArray: '4, 3',
      interactive: false
    });
    this.layers.riskZones.addLayer(babZone);
  }

  // Popup creators
  createRoutePopup(route) {
    const riskLevel = RiskIntelligenceAgent.getRiskLevel(route.current_risk_score);
    return `
      <div class="map-popup">
        <div class="map-popup__title"><i data-lucide="ship"></i> ${route.name}</div>
        <div class="map-popup__divider"></div>
        <div class="map-popup__row">
          <span class="map-popup__label">Origin</span>
          <span class="map-popup__value">${route.origin}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Destination</span>
          <span class="map-popup__value">${route.destination}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Distance</span>
          <span class="map-popup__value">${route.distance_nm.toLocaleString()} nm</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Transit Time</span>
          <span class="map-popup__value">${route.transit_days} days</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Volume</span>
          <span class="map-popup__value">${route.annual_volume_mmt} MMT/yr</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Import Share</span>
          <span class="map-popup__value">${route.share_of_imports}%</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Chokepoints</span>
          <span class="map-popup__value">${route.chokepoints.join(', ')}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Risk Score</span>
          <span class="map-popup__value" style="color: ${this.getRiskColor(route.current_risk_score)}">${route.current_risk_score}/100 (${riskLevel.toUpperCase()})</span>
        </div>
      </div>
    `;
  }

  createRefineryPopup(refinery) {
    return `
      <div class="map-popup">
        <div class="map-popup__title"><i data-lucide="factory"></i> ${refinery.name}</div>
        <div class="map-popup__divider"></div>
        <div class="map-popup__row">
          <span class="map-popup__label">Company</span>
          <span class="map-popup__value">${refinery.company}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Capacity</span>
          <span class="map-popup__value">${refinery.capacity_mmtpa} MMTPA</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Utilization</span>
          <span class="map-popup__value">${Math.round(refinery.utilization * 100)}%</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Crude Storage</span>
          <span class="map-popup__value">${refinery.storage_days} days</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Hormuz Exposure</span>
          <span class="map-popup__value" style="color: ${this.getRiskColor(refinery.hormuz_exposure * 100)}">${Math.round(refinery.hormuz_exposure * 100)}%</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Grades</span>
          <span class="map-popup__value" style="font-size:10px">${refinery.crude_grades.slice(0, 3).join(', ')}</span>
        </div>
      </div>
    `;
  }

  createChokepointPopup(cp) {
    return `
      <div class="map-popup">
        <div class="map-popup__title"><i data-lucide="alert-triangle"></i> ${cp.name}</div>
        <div class="map-popup__divider"></div>
        <div class="map-popup__row">
          <span class="map-popup__label">Daily Flow</span>
          <span class="map-popup__value">${cp.daily_flow_mbd} M bbl/day</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Width</span>
          <span class="map-popup__value">${cp.width_nm ? cp.width_nm + ' nm' : 'Open water'}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Controlled By</span>
          <span class="map-popup__value" style="font-size:10px">${cp.controlled_by}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Threat Level</span>
          <span class="map-popup__value" style="color: ${this.getRiskColor(cp.risk_level === 'critical' ? 90 : cp.risk_level === 'high' ? 70 : 40)}">${cp.risk_level.toUpperCase()}</span>
        </div>
        <div class="map-popup__divider"></div>
        <p style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px">${cp.current_threat}</p>
      </div>
    `;
  }

  createVesselPopup(vessel) {
    return `
      <div class="map-popup">
        <div class="map-popup__title"><i data-lucide="ship"></i> ${vessel.name}</div>
        <div class="map-popup__divider"></div>
        <div class="map-popup__row">
          <span class="map-popup__label">Type</span>
          <span class="map-popup__value">${vessel.type}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Flag</span>
          <span class="map-popup__value">${vessel.flag}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">DWT</span>
          <span class="map-popup__value">${(vessel.dwt / 1000).toFixed(0)}K</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Cargo</span>
          <span class="map-popup__value">${vessel.cargo}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Destination</span>
          <span class="map-popup__value">${vessel.destination}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Speed</span>
          <span class="map-popup__value">${vessel.speed} kn</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Heading</span>
          <span class="map-popup__value">${vessel.heading}°</span>
        </div>
      </div>
    `;
  }

  createSPRPopup(site) {
    return `
      <div class="map-popup">
        <div class="map-popup__title"><i data-lucide="database"></i> SPR: ${site.name}</div>
        <div class="map-popup__divider"></div>
        <div class="map-popup__row">
          <span class="map-popup__label">Phase</span>
          <span class="map-popup__value">${site.phase}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Capacity</span>
          <span class="map-popup__value">${site.capacity_mmt} MMT</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Current Fill</span>
          <span class="map-popup__value">${site.current_fill_pct}%</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Crude Stored</span>
          <span class="map-popup__value" style="font-size:10px">${site.crude_stored}</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Max Drawdown</span>
          <span class="map-popup__value">${(site.max_drawdown_rate_bpd/1000).toFixed(0)}K bpd</span>
        </div>
        <div class="map-popup__row">
          <span class="map-popup__label">Storage Type</span>
          <span class="map-popup__value" style="font-size:10px">${site.storage_type}</span>
        </div>
      </div>
    `;
  }

  // Toggle layer visibility
  toggleLayer(layerName) {
    if (!this.layers[layerName]) return;
    
    this.layerVisibility[layerName] = !this.layerVisibility[layerName];
    
    if (this.layerVisibility[layerName]) {
      this.map.addLayer(this.layers[layerName]);
    } else {
      this.map.removeLayer(this.layers[layerName]);
    }
    
    return this.layerVisibility[layerName];
  }

  // Zoom to region presets
  zoomTo(region) {
    const presets = {
      'india': { center: [22, 78], zoom: 5 },
      'hormuz': { center: [26, 56], zoom: 7 },
      'redsea': { center: [18, 40], zoom: 5 },
      'persian-gulf': { center: [27, 50], zoom: 6 },
      'indian-ocean': { center: [5, 65], zoom: 4 },
      'global': { center: [20, 55], zoom: 3 },
      'malacca': { center: [3, 102], zoom: 6 }
    };
    
    const preset = presets[region];
    if (preset) {
      this.map.flyTo(preset.center, preset.zoom, { duration: 1.5 });
    }
  }

  // Update route colors based on risk scores
  updateRouteRisks(corridorRisks) {
    if (!this.layers.routes) return;
    
    this.layers.routes.eachLayer(layer => {
      if (layer instanceof L.Polyline && !(layer instanceof L.Circle)) {
        // Find matching route
        const routeData = SUPPLY_ROUTES.find(r => {
          const coords = r.coordinates.map(c => [c[1], c[0]]);
          return JSON.stringify(coords) === JSON.stringify(layer.getLatLngs().map(ll => [ll.lat, ll.lng]));
        });
        
        if (routeData && corridorRisks[routeData.id]) {
          const score = corridorRisks[routeData.id].composite;
          layer.setStyle({
            color: this.getRiskColor(score),
            dashArray: score > 65 ? '8, 4' : null
          });
        }
      }
    });
  }

  getRiskColor(score) {
    if (score >= 80) return '#dc2626';
    if (score >= 65) return '#ef4444';
    if (score >= 45) return '#f97316';
    if (score >= 25) return '#eab308';
    return '#22c55e';
  }

  resize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

export { MapEngine };
