"""
MIRSAD — FX Rate Feed (INR/USD)
================================
Fetches live INR/USD exchange rate from Frankfurter.app (free, no key needed).
File-based cache with 4-hour TTL.

Source: Frankfurter.app (European Central Bank data)
Cache: backend/cache/fx_rate.json

Usage:
    from agents.fx_tool import fetch_inr_usd_rate
    rate = fetch_inr_usd_rate()  # e.g. {"rate": 83.45, "source": "frankfurter.app", ...}
"""

import json
import logging
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger("mirsad.fx")

CACHE_DIR = Path(__file__).parent.parent / "cache"
CACHE_FILE = CACHE_DIR / "fx_rate.json"
CACHE_TTL_SECONDS = 14400  # 4 hours


def fetch_inr_usd_rate() -> Dict[str, Any]:
    """
    Fetch current INR/USD exchange rate.
    
    Strategy: Frankfurter.app → file cache → unavailable
    """
    try:
        data = _fetch_live()
        _write_cache(data)
        return data
    except Exception as e:
        logger.warning(f"[FX] Frankfurter.app failed: {e}. Trying cache...")

    cached = _read_cache()
    if cached:
        cached["source"] = "frankfurter_cached"
        return cached

    logger.error("[FX] No live data and no cache.")
    return {
        "rate": None,
        "base": "USD",
        "target": "INR",
        "source": "unavailable",
        "timestamp": datetime.utcnow().isoformat()
    }


def _fetch_live() -> Dict[str, Any]:
    """Fetch from Frankfurter.app (free, no key)."""
    resp = requests.get(
        "https://api.frankfurter.app/latest",
        params={"from": "USD", "to": "INR"},
        timeout=10
    )
    resp.raise_for_status()
    data = resp.json()
    rate = data.get("rates", {}).get("INR")
    if rate is None:
        raise ValueError("INR rate not in response")

    return {
        "rate": round(float(rate), 2),
        "base": "USD",
        "target": "INR",
        "date": data.get("date"),
        "source": "frankfurter.app",
        "timestamp": datetime.utcnow().isoformat()
    }


def _write_cache(data: Dict[str, Any]) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.warning(f"[FX] Cache write failed: {e}")


def _read_cache() -> Dict[str, Any] | None:
    try:
        if not CACHE_FILE.exists():
            return None
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"[FX] Cache read failed: {e}")
        return None
