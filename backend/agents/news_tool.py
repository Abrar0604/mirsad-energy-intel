import os
import requests
from typing import List, Dict, Any
from langchain_core.tools import tool

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

def get_mock_news(query: str) -> List[Dict[str, Any]]:
    """Returns mock news for development when no API key is present."""
    return [
        {
            "title": "Tensions Escalate in the Red Sea",
            "description": "Shipping routes through the Red Sea face new threats as geopolitical tensions rise.",
            "source": {"name": "Mock Global News"},
            "url": "https://example.com/news/1"
        },
        {
            "title": "Oil Prices Surge Amid Middle East Instability",
            "description": "Brent crude spiked by 4% today following reports of disruptions near the Strait of Hormuz.",
            "source": {"name": "Mock Financial Times"},
            "url": "https://example.com/news/2"
        }
    ]

@tool("fetch_geopolitical_news")
def fetch_geopolitical_news(query: str) -> List[Dict[str, Any]]:
    """
    Fetches recent news articles related to geopolitical events, shipping routes, or oil prices.
    Uses NewsAPI if NEWS_API_KEY is configured in the environment.
    """
    if not NEWS_API_KEY:
        print("WARNING: NEWS_API_KEY not found. Using mock news data.")
        return get_mock_news(query)

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 5,
        "apiKey": NEWS_API_KEY
    }

    try:
        response = requests.get(url, params=params)
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
                "url": article.get("url")
            })
        return results
    except Exception as e:
        print(f"Error fetching news: {e}")
        return get_mock_news(query) # Fallback to mock on error
