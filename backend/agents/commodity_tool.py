"""
MIRSAD — Commodity Price Feed
==============================
Live Brent/WTI price data via yfinance with realistic mock fallback.
Provides current prices, changes, volatility, and historical time series.

Usage:
    from agents.commodity_tool import fetch_commodity_prices
    data = fetch_commodity_prices()
"""

import logging
import random
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List

logger = logging.getLogger("mirsad.commodity")


def fetch_commodity_prices() -> Dict[str, Any]:
    """
    Fetch current Brent and WTI crude oil prices.
    
    Tries yfinance first; falls back to realistic mock if unavailable.
    
    Returns:
        {
            "brent": { "current_price", "change_1d_pct", "change_7d_pct", "change_30d_pct", "volatility_30d", "price_history": [...] },
            "wti": { ... },
            "brent_wti_spread": float,
            "source": "yfinance" | "mock",
            "timestamp": str
        }
    """
    try:
        return _fetch_live()
    except Exception as e:
        logger.warning(f"[Commodity] yfinance failed: {e}. Using realistic mock data.")
        return _generate_mock()


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


def _generate_mock() -> Dict[str, Any]:
    """Generate realistic mock commodity price data calibrated to real ranges."""
    base_brent = 82.50
    base_wti = 78.20

    # Add some daily jitter
    jitter_brent = random.uniform(-2.0, 2.0)
    jitter_wti = random.uniform(-1.8, 1.8)
    current_brent = base_brent + jitter_brent
    current_wti = base_wti + jitter_wti

    result = {"source": "mock", "timestamp": datetime.utcnow().isoformat()}

    for label, base, current in [("brent", base_brent, current_brent), ("wti", base_wti, current_wti)]:
        # Generate 60-day synthetic history with realistic brownian motion
        history = _generate_price_history(base, 60)
        history[-1]["close"] = round(current, 2)  # pin last day to current

        past_1d = history[-2]["close"] if len(history) >= 2 else current
        past_7d = history[-6]["close"] if len(history) >= 6 else current
        past_30d = history[-23]["close"] if len(history) >= 23 else current

        # Realized volatility from history
        closes = [h["close"] for h in history[-23:]]
        if len(closes) >= 2:
            returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
            vol = (sum(r**2 for r in returns) / len(returns)) ** 0.5 * (252 ** 0.5) * 100
        else:
            vol = 25.0

        result[label] = {
            "current_price": round(current, 2),
            "change_1d_pct": round(((current - past_1d) / past_1d) * 100, 2),
            "change_7d_pct": round(((current - past_7d) / past_7d) * 100, 2),
            "change_30d_pct": round(((current - past_30d) / past_30d) * 100, 2),
            "volatility_30d": round(vol, 2),
            "price_history": history
        }

    result["brent_wti_spread"] = round(current_brent - current_wti, 2)
    return result


def _generate_price_history(base: float, days: int) -> List[Dict[str, str]]:
    """Generate synthetic daily OHLC-like price history with geometric Brownian motion."""
    prices = []
    price = base - random.uniform(3, 8)  # start slightly lower
    daily_vol = 0.015  # 1.5% daily vol

    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=days - i)).strftime("%Y-%m-%d")
        # GBM step
        shock = random.gauss(0.0002, daily_vol)  # slight upward drift
        price *= math.exp(shock)
        price = max(price, 50.0)  # floor at $50
        price = min(price, 130.0)  # cap at $130
        prices.append({"date": date, "close": round(price, 2)})

    return prices
