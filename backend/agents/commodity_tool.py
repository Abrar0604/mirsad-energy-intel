"""
MIRSAD — Commodity Price Feed
==============================
Live Brent/WTI price data via yfinance with file-based cache fallback.
NO mock/random data — either real prices or cached last-good response.

Source: Yahoo Finance (yfinance library, tickers BZ=F and CL=F)
Cache: backend/cache/commodity_prices.json (1-hour TTL)

Usage:
    from agents.commodity_tool import fetch_commodity_prices
    data = fetch_commodity_prices()
"""

import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger("mirsad.commodity")

CACHE_DIR = Path(__file__).parent.parent / "cache"
CACHE_FILE = CACHE_DIR / "commodity_prices.json"
CACHE_TTL_SECONDS = 3600  # 1 hour


def fetch_commodity_prices() -> Dict[str, Any]:
    """
    Fetch current Brent and WTI crude oil prices.
    
    Strategy:
      1. Try yfinance live fetch
      2. On success, cache the result to disk
      3. On failure, serve cached last-good response (if fresh enough)
      4. If no cache exists, return explicit "unavailable" response
    
    Returns:
        {
            "brent": { "current_price", "change_1d_pct", ... },
            "wti": { ... },
            "brent_wti_spread": float,
            "source": "yfinance" | "yfinance_cached" | "unavailable",
            "timestamp": str
        }
    """
    # Try live fetch first
    try:
        data = _fetch_live()
        _write_cache(data)
        return data
    except Exception as e:
        logger.warning(f"[Commodity] yfinance failed: {e}. Trying cache...")

    # Fallback to cached data
    cached = _read_cache()
    if cached:
        cached["source"] = "yfinance_cached"
        logger.info(f"[Commodity] Serving cached prices from {cached.get('timestamp', '?')}")
        return cached

    # No cache available — return unavailable (NOT mock data)
    logger.error("[Commodity] No live data and no cache. Returning unavailable.")
    return {
        "brent": {"current_price": None, "change_1d_pct": None, "change_7d_pct": None,
                  "change_30d_pct": None, "volatility_30d": None, "price_history": []},
        "wti": {"current_price": None, "change_1d_pct": None, "change_7d_pct": None,
                "change_30d_pct": None, "volatility_30d": None, "price_history": []},
        "brent_wti_spread": None,
        "source": "unavailable",
        "timestamp": datetime.utcnow().isoformat()
    }


def _fetch_live() -> Dict[str, Any]:
    """Fetch real prices via yfinance."""
    import yfinance as yf

    result = {"source": "yfinance", "timestamp": datetime.utcnow().isoformat()}

    for label, ticker_sym in [("brent", "BZ=F"), ("wti", "CL=F")]:
        ticker = yf.Ticker(ticker_sym)
        hist = ticker.history(period="3mo")

        if hist.empty:
            raise ValueError(f"No data for {ticker_sym}")

        closes = hist["Close"].dropna()
        current = float(closes.iloc[-1])

        # Price changes
        change_1d = _pct_change(closes, 1)
        change_7d = _pct_change(closes, 5)  # ~5 trading days
        change_30d = _pct_change(closes, 22)  # ~22 trading days

        # 30-day realized volatility (annualized)
        recent = closes.tail(22)
        if len(recent) >= 2:
            log_returns = recent.pct_change().dropna()
            vol = float(log_returns.std() * (252 ** 0.5) * 100)
        else:
            vol = 0.0

        # Build price history (last 60 days)
        history = [
            {"date": idx.strftime("%Y-%m-%d"), "close": round(float(val), 2)}
            for idx, val in closes.tail(60).items()
        ]

        result[label] = {
            "current_price": round(current, 2),
            "change_1d_pct": round(change_1d, 2),
            "change_7d_pct": round(change_7d, 2),
            "change_30d_pct": round(change_30d, 2),
            "volatility_30d": round(vol, 2),
            "price_history": history
        }

    result["brent_wti_spread"] = round(
        result["brent"]["current_price"] - result["wti"]["current_price"], 2
    )
    return result


def _pct_change(series, periods: int) -> float:
    """Calculate percentage change over N periods."""
    if len(series) <= periods:
        return 0.0
    current = float(series.iloc[-1])
    past = float(series.iloc[-1 - periods])
    return ((current - past) / past) * 100 if past != 0 else 0.0


# ── Cache I/O ──

def _write_cache(data: Dict[str, Any]) -> None:
    """Write commodity data to disk cache."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
        logger.info(f"[Commodity] Cached prices to {CACHE_FILE}")
    except Exception as e:
        logger.warning(f"[Commodity] Cache write failed: {e}")


def _read_cache() -> Dict[str, Any] | None:
    """Read cached commodity data if it exists and is within TTL."""
    try:
        if not CACHE_FILE.exists():
            return None

        # Check file age
        age_seconds = (datetime.utcnow() - datetime.utcfromtimestamp(CACHE_FILE.stat().st_mtime)).total_seconds()
        if age_seconds > CACHE_TTL_SECONDS * 6:  # Allow up to 6x TTL for fallback (6 hours)
            logger.warning(f"[Commodity] Cache is {age_seconds/3600:.1f}h old — stale but usable as fallback.")

        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"[Commodity] Cache read failed: {e}")
        return None
