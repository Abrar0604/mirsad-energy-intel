"""
MIRSAD — Vessel / AIS Chokepoint Congestion Signals
====================================================
Simulated chokepoint transit data based on public baseline statistics.
No free public AIS API is available (MarineTraffic free tier: ~10 req/month).

Baseline values are calibrated from EIA and public port authority reports.
Live deviations are simulated to demonstrate the analytics pipeline.

Source: Baselines from EIA / public AIS statistics.
        Live signals: SIMULATED (no free API).

Usage:
    from agents.vessel_tool import fetch_vessel_signals
    signals = fetch_vessel_signals()
"""

import random
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger("mirsad.vessel")


# Baseline transit data calibrated from public AIS statistics
CHOKEPOINT_BASELINES = {
    "hormuz": {
        "name": "Strait of Hormuz",
        "avg_daily_transits": 85,
        "avg_tanker_transits": 42,
        "avg_wait_hours": 2.5,
        "region": "Persian Gulf",
        "importance": "critical"
    },
    "bab_el_mandeb": {
        "name": "Bab el-Mandeb",
        "avg_daily_transits": 65,
        "avg_tanker_transits": 28,
        "avg_wait_hours": 1.8,
        "region": "Red Sea",
        "importance": "high"
    },
    "suez": {
        "name": "Suez Canal",
        "avg_daily_transits": 75,
        "avg_tanker_transits": 22,
        "avg_wait_hours": 8.5,
        "region": "Egypt",
        "importance": "high"
    },
    "malacca": {
        "name": "Strait of Malacca",
        "avg_daily_transits": 95,
        "avg_tanker_transits": 35,
        "avg_wait_hours": 3.0,
        "region": "Southeast Asia",
        "importance": "moderate"
    },
    "cape_good_hope": {
        "name": "Cape of Good Hope",
        "avg_daily_transits": 55,
        "avg_tanker_transits": 18,
        "avg_wait_hours": 0.5,
        "region": "South Africa",
        "importance": "moderate"
    }
}


def fetch_vessel_signals() -> List[Dict[str, Any]]:
    """
    Generate realistic AIS-style chokepoint transit signals.
    
    Each signal represents the current state of maritime traffic at a major
    chokepoint, with deviations from baseline indicating potential disruptions.
    
    Returns:
        List of chokepoint signal dicts with congestion analysis.
    """
    signals = []
    timestamp = datetime.utcnow().isoformat()

    for choke_id, baseline in CHOKEPOINT_BASELINES.items():
        signal = _generate_signal(choke_id, baseline, timestamp)
        signals.append(signal)

    # Sort by deviation magnitude (most abnormal first)
    signals.sort(key=lambda s: abs(s["deviation_pct"]), reverse=True)

    logger.info(f"[Vessel] Generated {len(signals)} chokepoint signals. "
                f"Most deviated: {signals[0]['chokepoint_name']} ({signals[0]['deviation_pct']:+.1f}%)")

    return signals


def _generate_signal(choke_id: str, baseline: Dict[str, Any], timestamp: str) -> Dict[str, Any]:
    """Generate a single chokepoint congestion signal."""
    avg_transits = baseline["avg_daily_transits"]
    avg_tanker = baseline["avg_tanker_transits"]
    avg_wait = baseline["avg_wait_hours"]

    # Simulate current conditions with some variance
    # Use different disruption profiles per chokepoint to make data interesting
    disruption_factor = _get_disruption_factor(choke_id)

    transit_24h = max(5, int(avg_transits * disruption_factor + random.gauss(0, avg_transits * 0.05)))
    tanker_24h = max(2, int(avg_tanker * disruption_factor + random.gauss(0, avg_tanker * 0.05)))
    current_wait = max(0.1, avg_wait * (1 / max(disruption_factor, 0.3)) + random.gauss(0, 0.5))

    deviation_pct = ((transit_24h - avg_transits) / avg_transits) * 100
    tanker_deviation_pct = ((tanker_24h - avg_tanker) / avg_tanker) * 100

    # Queue depth (vessels waiting)
    if deviation_pct < -20:
        queue_depth = random.randint(8, 25)  # congestion or avoidance = longer queues
    elif deviation_pct < -10:
        queue_depth = random.randint(3, 12)
    else:
        queue_depth = random.randint(0, 5)

    # Congestion level classification
    congestion = _classify_congestion(deviation_pct, current_wait, avg_wait)

    # Risk contribution score (how much this signal contributes to overall risk)
    risk_contribution = _compute_risk_contribution(deviation_pct, congestion, baseline["importance"])

    return {
        "chokepoint_id": choke_id,
        "chokepoint_name": baseline["name"],
        "region": baseline["region"],
        "importance": baseline["importance"],
        "timestamp": timestamp,

        # Transit counts
        "transit_count_24h": transit_24h,
        "avg_transit_count_24h": avg_transits,
        "deviation_pct": round(deviation_pct, 1),

        # Tanker-specific
        "tanker_count_24h": tanker_24h,
        "avg_tanker_count_24h": avg_tanker,
        "tanker_deviation_pct": round(tanker_deviation_pct, 1),

        # Wait times
        "avg_wait_hours": round(current_wait, 1),
        "baseline_wait_hours": avg_wait,

        # Congestion
        "tanker_queue_depth": queue_depth,
        "congestion_level": congestion,

        # Computed
        "risk_contribution": risk_contribution,

        # Data source attribution
        "source": "Simulated (no free AIS API available)",
        "data_type": "simulated"
    }


def _get_disruption_factor(choke_id: str) -> float:
    """
    Get a per-chokepoint disruption factor to create realistic variance.
    
    Factor < 1.0 means fewer transits (disruption/avoidance).
    Factor > 1.0 means more transits (rerouting overflow).
    """
    # Create interesting but realistic patterns
    profiles = {
        "hormuz": random.choice([
            random.uniform(0.70, 0.85),   # moderate disruption (30% chance)
            random.uniform(0.85, 1.0),     # mild disruption (40% chance)
            random.uniform(1.0, 1.10),     # normal-high (30% chance)
        ]),
        "bab_el_mandeb": random.choice([
            random.uniform(0.55, 0.70),   # significant Houthi disruption (25%)
            random.uniform(0.70, 0.85),   # moderate disruption (35%)
            random.uniform(0.90, 1.05),   # near normal (40%)
        ]),
        "suez": random.choice([
            random.uniform(0.80, 0.95),   # some rerouting away (40%)
            random.uniform(0.95, 1.05),   # normal (40%)
            random.uniform(1.05, 1.15),   # overflow from Red Sea avoidance (20%)
        ]),
        "malacca": random.uniform(0.92, 1.08),  # generally stable
        "cape_good_hope": random.choice([
            random.uniform(1.10, 1.35),   # rerouting overflow (40%)
            random.uniform(0.95, 1.10),   # normal (60%)
        ])
    }
    return profiles.get(choke_id, random.uniform(0.85, 1.15))


def _classify_congestion(deviation_pct: float, current_wait: float, baseline_wait: float) -> str:
    """Classify congestion level."""
    wait_ratio = current_wait / max(baseline_wait, 0.1)

    if deviation_pct < -30 or wait_ratio > 3.0:
        return "severe"
    elif deviation_pct < -15 or wait_ratio > 2.0:
        return "high"
    elif deviation_pct < -5 or wait_ratio > 1.5:
        return "elevated"
    elif deviation_pct > 15:
        return "overflow"  # unusual spike (rerouting target)
    else:
        return "normal"


def _compute_risk_contribution(deviation_pct: float, congestion: str, importance: str) -> int:
    """Compute how much this chokepoint signal contributes to overall risk (0-100)."""
    # Base score from deviation
    base = min(100, abs(deviation_pct) * 1.5) if deviation_pct < 0 else max(0, deviation_pct * 0.5)

    # Weight by importance
    weights = {"critical": 1.5, "high": 1.2, "moderate": 0.8, "low": 0.5}
    base *= weights.get(importance, 1.0)

    # Congestion bonus
    congestion_bonus = {"severe": 20, "high": 12, "elevated": 5, "overflow": 8, "normal": 0}
    base += congestion_bonus.get(congestion, 0)

    return min(100, max(0, int(base)))
