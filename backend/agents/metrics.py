"""
MIRSAD — Quantitative Risk Metrics
====================================
Pure, testable metric calculations with explicit formulas.
No LLM involvement — these are deterministic computations.

Usage:
    from agents.metrics import compute_all_metrics
    metrics = compute_all_metrics(supplier_shares, spr_data, route_data, commodity_data)
"""

import math
from typing import Dict, Any, List, Optional


# ── Constants calibrated from India energy data ──
INDIA_DAILY_CONSUMPTION_BPD = 5_350_000        # ~5.35M bpd total crude consumption
INDIA_DAILY_IMPORTS_BPD = 4_650_000             # ~4.65M bpd crude imports
INDIA_IMPORT_DEPENDENCY = 0.873                 # 87.3%
INDIA_HORMUZ_EXPOSURE = 0.58                    # 58% of imports through Hormuz
BRENT_TO_INR_FUEL_ELASTICITY = 0.42             # INR/liter per $1/bbl Brent change (est.)
NATIONAL_HEDGE_RATIO = 0.15                     # ~15% hedged (India hedges very little)
SPR_TARGET_DAYS = 90                            # International standard (IEA)


def compute_all_metrics(
    supplier_shares: Optional[List[float]] = None,
    spr_volume_bbl: Optional[float] = None,
    in_transit_bbl: Optional[float] = None,
    contracted_30d_bbl: Optional[float] = None,
    num_active_routes: Optional[int] = None,
    total_possible_routes: Optional[int] = None,
    hormuz_import_fraction: Optional[float] = None,
    brent_price: Optional[float] = None,
    hedge_ratio: Optional[float] = None
) -> Dict[str, Any]:
    """
    Compute all MIRSAD metrics with explicit formulas and transparent inputs.
    
    Returns a dict with each metric, its value, formula string, and interpretation.
    """

    # Use defaults calibrated from existing data if not provided
    if supplier_shares is None:
        supplier_shares = [0.225, 0.185, 0.168, 0.072, 0.068, 0.055, 0.045, 0.038, 0.035, 0.109]  # Iraq, Russia, Saudi, UAE, Kuwait, Nigeria, US, Angola, Guyana, others
    if spr_volume_bbl is None:
        spr_volume_bbl = 55_000_000  # ~55M bbl current fill (from SPR data)
    if in_transit_bbl is None:
        in_transit_bbl = 32_000_000  # ~32M bbl estimated in-transit
    if contracted_30d_bbl is None:
        contracted_30d_bbl = 95_000_000  # ~95M bbl contracted for next 30 days
    if num_active_routes is None:
        num_active_routes = 8
    if total_possible_routes is None:
        total_possible_routes = 10
    if hormuz_import_fraction is None:
        hormuz_import_fraction = INDIA_HORMUZ_EXPOSURE
    if brent_price is None:
        brent_price = None  # Will be flagged as "unavailable" in output
    if hedge_ratio is None:
        hedge_ratio = NATIONAL_HEDGE_RATIO

    hhi = compute_hhi(supplier_shares)
    ssi = compute_ssi(spr_volume_bbl, hhi, num_active_routes, total_possible_routes, hormuz_import_fraction)
    doa = compute_days_of_autonomy(spr_volume_bbl, in_transit_bbl, contracted_30d_bbl)
    psi = compute_price_sensitivity_index(hedge_ratio)

    return {
        "supply_security_index": ssi,
        "hhi_concentration": hhi,
        "days_of_autonomy": doa,
        "price_sensitivity_index": psi,
        "inputs_used": {
            "supplier_shares": supplier_shares,
            "spr_volume_bbl": spr_volume_bbl,
            "in_transit_bbl": in_transit_bbl,
            "contracted_30d_bbl": contracted_30d_bbl,
            "num_active_routes": num_active_routes,
            "total_possible_routes": total_possible_routes,
            "hormuz_import_fraction": hormuz_import_fraction,
            "brent_price_usd": brent_price,
            "hedge_ratio": hedge_ratio,
            "daily_consumption_bpd": INDIA_DAILY_CONSUMPTION_BPD
        }
    }


def compute_hhi(supplier_shares: List[float]) -> Dict[str, Any]:
    """
    Herfindahl-Hirschman Index for supplier concentration.
    
    Formula: HHI = Σ(share_i²)
    Range: [1/N, 1.0] where N = number of suppliers
    Interpretation: < 0.15 = diversified, 0.15-0.25 = moderate, > 0.25 = concentrated
    """
    hhi = sum(s ** 2 for s in supplier_shares)
    
    if hhi < 0.15:
        level = "diversified"
        color = "green"
    elif hhi < 0.25:
        level = "moderate"
        color = "amber"
    else:
        level = "concentrated"
        color = "red"

    return {
        "value": round(hhi, 4),
        "level": level,
        "color": color,
        "formula": "HHI = Σ(share_i²)",
        "interpretation": f"Supplier concentration is {level} (HHI={hhi:.4f}). {'Below 0.15 indicates healthy diversification.' if hhi < 0.15 else 'India depends heavily on a few large suppliers.' if hhi > 0.25 else 'Moderate concentration — some diversification risk.'}",
        "num_suppliers": len(supplier_shares),
        "top_3_share": round(sum(sorted(supplier_shares, reverse=True)[:3]), 4)
    }


def compute_ssi(
    spr_volume_bbl: float,
    hhi: Dict[str, Any],
    num_active_routes: int,
    total_possible_routes: int,
    hormuz_fraction: float
) -> Dict[str, Any]:
    """
    Supply Security Index — composite measure of supply chain resilience.
    
    Formula: SSI = 0.35 × (SPR_days / 90) + 0.30 × (1 - HHI) + 0.20 × route_diversity + 0.15 × (1 - hormuz_dependency)
    Range: 0 to 100
    """
    spr_days = spr_volume_bbl / INDIA_DAILY_CONSUMPTION_BPD
    spr_component = min(1.0, spr_days / SPR_TARGET_DAYS)  # capped at 1.0

    hhi_val = hhi["value"]
    diversification_component = 1 - hhi_val

    route_diversity = num_active_routes / max(total_possible_routes, 1)

    hormuz_independence = 1 - hormuz_fraction

    raw = (0.35 * spr_component +
           0.30 * diversification_component +
           0.20 * route_diversity +
           0.15 * hormuz_independence)

    ssi_score = round(raw * 100, 1)

    if ssi_score >= 70:
        level = "strong"
        color = "green"
    elif ssi_score >= 45:
        level = "moderate"
        color = "amber"
    else:
        level = "vulnerable"
        color = "red"

    return {
        "value": ssi_score,
        "level": level,
        "color": color,
        "formula": "SSI = 0.35 × (SPR_days/90) + 0.30 × (1-HHI) + 0.20 × route_diversity + 0.15 × (1-hormuz_dep)",
        "components": {
            "spr_cover": round(spr_component * 100, 1),
            "supplier_diversity": round(diversification_component * 100, 1),
            "route_diversity": round(route_diversity * 100, 1),
            "hormuz_independence": round(hormuz_independence * 100, 1)
        },
        "interpretation": f"Supply security is {level} ({ssi_score}/100). SPR provides {spr_days:.1f} days cover."
    }


def compute_days_of_autonomy(
    spr_volume_bbl: float,
    in_transit_bbl: float,
    contracted_30d_bbl: float
) -> Dict[str, Any]:
    """
    Days-of-Autonomy — how many days can India sustain without new procurement.
    
    Formula: DoA = (SPR_volume + in_transit + contracted_30d) / daily_consumption
    """
    total_available = spr_volume_bbl + in_transit_bbl + contracted_30d_bbl
    doa_days = total_available / INDIA_DAILY_CONSUMPTION_BPD

    if doa_days >= 45:
        level = "comfortable"
        color = "green"
    elif doa_days >= 20:
        level = "adequate"
        color = "amber"
    else:
        level = "critical"
        color = "red"

    return {
        "value": round(doa_days, 1),
        "level": level,
        "color": color,
        "formula": "DoA = (SPR + in_transit + contracted_30d) / daily_consumption",
        "breakdown": {
            "spr_days": round(spr_volume_bbl / INDIA_DAILY_CONSUMPTION_BPD, 1),
            "transit_days": round(in_transit_bbl / INDIA_DAILY_CONSUMPTION_BPD, 1),
            "contracted_days": round(contracted_30d_bbl / INDIA_DAILY_CONSUMPTION_BPD, 1)
        },
        "interpretation": f"India has approximately {doa_days:.1f} days of crude supply autonomy. {'Comfortable buffer.' if doa_days >= 45 else 'Adequate but limited margin.' if doa_days >= 20 else 'Critical — immediate procurement action needed.'}"
    }


def compute_price_sensitivity_index(
    hedge_ratio: float = NATIONAL_HEDGE_RATIO
) -> Dict[str, Any]:
    """
    Price Sensitivity Index — exposure of Indian fuel prices to Brent fluctuations.
    
    Formula: PSI = β × import_dependency × (1 - hedge_ratio)
    Where β ≈ 0.42 INR/liter per $1/bbl Brent change (historical calibration)
    
    A PSI of 0.32 means: for every $1/bbl Brent increase, Indian fuel prices
    rise ~₹0.32/liter (unhedged component).
    """
    psi = BRENT_TO_INR_FUEL_ELASTICITY * INDIA_IMPORT_DEPENDENCY * (1 - hedge_ratio)

    if psi >= 0.35:
        level = "high_exposure"
        color = "red"
    elif psi >= 0.25:
        level = "moderate_exposure"
        color = "amber"
    else:
        level = "low_exposure"
        color = "green"

    return {
        "value": round(psi, 4),
        "level": level,
        "color": color,
        "formula": "PSI = β × import_dependency × (1 - hedge_ratio)",
        "parameters": {
            "beta_inr_per_usd_bbl": BRENT_TO_INR_FUEL_ELASTICITY,
            "import_dependency": INDIA_IMPORT_DEPENDENCY,
            "hedge_ratio": hedge_ratio
        },
        "interpretation": f"For every $1/bbl Brent increase, Indian retail fuel prices rise ~₹{psi:.2f}/liter. {'High exposure — limited hedging amplifies price shocks.' if psi >= 0.35 else 'Moderate exposure.' if psi >= 0.25 else 'Well-hedged position.'}"
    }


def compute_risk_trajectory(
    current_risk_score: float,
    recent_event_deltas: List[float],
    vessel_deviation_pct: float = 0.0,
    commodity_change_7d: float = 0.0
) -> Dict[str, Any]:
    """
    7/30-day risk trajectory forecast using EWMA + signal momentum.
    
    Method: Exponential weighted moving average on historical event risk deltas,
    combined with current vessel congestion and commodity price signals.
    """
    # EWMA on recent event deltas (α = 0.3)
    alpha = 0.3
    if recent_event_deltas:
        ewma = recent_event_deltas[0]
        for delta in recent_event_deltas[1:]:
            ewma = alpha * delta + (1 - alpha) * ewma
        momentum = ewma
    else:
        momentum = 0.0

    # Vessel signal contribution (negative deviation = increasing risk)
    vessel_signal = -vessel_deviation_pct * 0.3  # 30% weight

    # Commodity signal contribution (rising prices = increasing risk perception)
    commodity_signal = commodity_change_7d * 0.5  # 50% weight on 7d change

    # Combined signal
    combined_signal = momentum + vessel_signal + commodity_signal

    # 7-day forecast
    forecast_7d_delta = combined_signal * 0.6  # dampened
    forecast_7d_score = max(0, min(100, current_risk_score + forecast_7d_delta))

    # 30-day forecast (more dampened, wider confidence)
    forecast_30d_delta = combined_signal * 0.35
    forecast_30d_score = max(0, min(100, current_risk_score + forecast_30d_delta))

    # Confidence (narrower when signals agree, wider when they diverge)
    signal_agreement = 1 - min(1, abs(momentum - vessel_signal) / max(abs(momentum) + abs(vessel_signal), 1))
    confidence_7d = round(0.4 + 0.4 * signal_agreement, 2)  # range: 0.4 to 0.8
    confidence_30d = round(0.25 + 0.3 * signal_agreement, 2)  # range: 0.25 to 0.55

    direction_7d = "increasing" if forecast_7d_delta > 2 else "decreasing" if forecast_7d_delta < -2 else "stable"
    direction_30d = "increasing" if forecast_30d_delta > 2 else "decreasing" if forecast_30d_delta < -2 else "stable"

    return {
        "current_score": round(current_risk_score, 1),
        "forecast_7d": {
            "predicted_score": round(forecast_7d_score, 1),
            "direction": direction_7d,
            "magnitude": round(abs(forecast_7d_delta), 1),
            "confidence": confidence_7d
        },
        "forecast_30d": {
            "predicted_score": round(forecast_30d_score, 1),
            "direction": direction_30d,
            "magnitude": round(abs(forecast_30d_delta), 1),
            "confidence": confidence_30d
        },
        "signal_components": {
            "event_momentum": round(momentum, 2),
            "vessel_signal": round(vessel_signal, 2),
            "commodity_signal": round(commodity_signal, 2),
            "combined": round(combined_signal, 2)
        },
        "confidence_band_width": round((1 - confidence_7d) * 30, 1),
        "method": "EWMA(α=0.3) + vessel_congestion(w=0.3) + commodity_momentum(w=0.5)"
    }
