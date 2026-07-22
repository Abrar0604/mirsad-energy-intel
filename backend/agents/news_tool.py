"""
MIRSAD — Geopolitical News Feed
================================
Fetches live news via NewsAPI with file-based cache fallback.
NO mock/fabricated articles — either real news or cached last-good response.

Source: NewsAPI.org (requires NEWS_API_KEY env var)
Cache: backend/cache/news_cache.json

Usage:
    from agents.news_tool import fetch_geopolitical_news
    articles = fetch_geopolitical_news.invoke({"query": "crude oil shipping"})
"""

import os
import json
import logging
import requests
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from langchain_core.tools import tool

logger = logging.getLogger("mirsad.news")

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
CACHE_DIR = Path(__file__).parent.parent / "cache"
CACHE_FILE = CACHE_DIR / "news_cache.json"


def _write_cache(query: str, articles: List[Dict[str, Any]]) -> None:
    """Cache successful news response."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_data = {
            "query": query,
            "articles": articles,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "newsapi_cached"
        }
        with open(CACHE_FILE, "w") as f:
            json.dump(cache_data, f)
        logger.info(f"[News] Cached {len(articles)} articles to {CACHE_FILE}")
    except Exception as e:
        logger.warning(f"[News] Cache write failed: {e}")


def _read_cache() -> List[Dict[str, Any]]:
    """Read cached news articles if available."""
    try:
        if not CACHE_FILE.exists():
            return []
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
        articles = data.get("articles", [])
        if articles:
            logger.info(f"[News] Serving {len(articles)} cached articles from {data.get('timestamp', '?')}")
            # Mark each article as cached
            for a in articles:
                a["_cached"] = True
        return articles
    except Exception as e:
        logger.warning(f"[News] Cache read failed: {e}")
        return []


@tool("fetch_geopolitical_news")
def fetch_geopolitical_news(query: str) -> List[Dict[str, Any]]:
    """
    Fetches recent news articles related to geopolitical events, shipping routes, or oil prices.
    Uses NewsAPI if NEWS_API_KEY is configured. Falls back to cached articles (NOT mock data).
    """
    if not NEWS_API_KEY:
        logger.warning("[News] NEWS_API_KEY not found. Trying cache...")
        cached = _read_cache()
        if cached:
            return cached
        logger.error("[News] No API key and no cache. Returning empty.")
        return []

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 5,
        "apiKey": NEWS_API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        articles = data.get("articles", [])
        
        # Extract relevant fields
        results = []
        for article in articles:
            results.append({
                "title": article.get("title"),
                "description": article.get("description"),
                "source": article.get("source", {}).get("name"),
                "url": article.get("url"),
                "publishedAt": article.get("publishedAt")
            })
        
        # Cache successful response
        if results:
            _write_cache(query, results)
        
        return results
    except Exception as e:
        logger.error(f"[News] NewsAPI failed: {e}. Trying cache...")
        cached = _read_cache()
        if cached:
            return cached
        logger.error("[News] NewsAPI failed and no cache available.")
        return []
