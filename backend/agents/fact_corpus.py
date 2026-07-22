"""
MIRSAD — Fact Corpus
====================
Structured fact documents for RAG grounding, ported from the JS data files.
Each fact is a semantically coherent unit with source attribution.
"""

from typing import List, Dict, Any
from datetime import datetime

def get_fact_corpus() -> List[Dict[str, Any]]:
    """Return the full fact corpus for vector store ingestion."""
    facts = []
    facts.extend(_refinery_facts())
    facts.extend(_spr_facts())
    facts.extend(_supplier_facts())
    facts.extend(_route_facts())
    facts.extend(_historical_event_facts())
    return facts


def _refinery_facts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "fact-ref-ril-jam",
            "text": "Jamnagar DTA Refinery (Reliance Industries) in Gujarat has a capacity of 33.0 MMTPA (660,000 bpd) with 95% utilization. It processes Arab Heavy, Arab Light, Basrah Medium, Basrah Heavy, Kuwait Export, and Murban crudes. It has 14 days of crude storage and a complexity index of 14.0. It is 85% dependent on Hormuz corridor via the hormuz-jamnagar route.",
            "source": "MIRSAD Refinery Database",
            "category": "refinery",
            "entity_id": "ref-ril-jam",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-ref-ril-sez",
            "text": "Jamnagar SEZ Refinery (Reliance Industries) in Gujarat has a capacity of 35.2 MMTPA (704,000 bpd) with 92% utilization. It is the world's largest single-location refinery. Hormuz exposure is 70%. It also receives ESPO Blend from the Russia-ESPO route.",
            "source": "MIRSAD Refinery Database",
            "category": "refinery",
            "entity_id": "ref-ril-sez",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-ref-iocl-paradip",
            "text": "Paradip Refinery (Indian Oil Corporation) in Odisha has a capacity of 15.0 MMTPA (300,000 bpd) with 94% utilization. Connected to ESPO and West Africa routes with 40% Hormuz exposure.",
            "source": "MIRSAD Refinery Database",
            "category": "refinery",
            "entity_id": "ref-iocl-paradip",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-ref-total-india",
            "text": "India's total refining capacity across 23 operational refineries is approximately 254 MMTPA (5.08 million bpd). The top 5 refineries (both Jamnagar, Mangalore MRPL, Panipat, Paradip) account for over 50% of national capacity. Average national utilization is ~93%.",
            "source": "MIRSAD Refinery Database (aggregate)",
            "category": "refinery",
            "entity_id": "aggregate",
            "date": "2025-01-01",
            "confidence": 0.90
        }
    ]


def _spr_facts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "fact-spr-vizag",
            "text": "Visakhapatnam SPR site (Phase I, ISPRL) has 1.33 MMT capacity (9.77 million barrels). Currently 86.5% full (1.15 MMT). Stores Arab Light and Basrah Light. Max drawdown rate: 75,000 bpd. Connected to HPCL Vizag and IOCL Paradip refineries via pipeline. Replenishment lead time: 45 days.",
            "source": "MIRSAD SPR Database",
            "category": "spr",
            "entity_id": "spr-vizag",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-spr-mangalore",
            "text": "Mangalore (Padur) SPR site (Phase I, ISPRL) has 1.50 MMT capacity (11.02 million barrels). Currently 85.3% full (1.28 MMT). Stores Abu Dhabi Murban crude. Max drawdown rate: 85,000 bpd. Connected to MRPL and BPCL Kochi refineries.",
            "source": "MIRSAD SPR Database",
            "category": "spr",
            "entity_id": "spr-mangalore",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-spr-aggregate",
            "text": "India's total SPR capacity across Phase I (Vizag, Mangalore, Padur) and Phase II (Chandikhol, Rajkot) is approximately 10.33 MMT (75.9 million barrels). Combined current fill is ~72.5%. Total max drawdown rate across all sites: ~345,000 bpd. At current fill levels, India's SPR provides approximately 9.5 days of national crude consumption cover, with a target of 22 days by 2030.",
            "source": "MIRSAD SPR Database (aggregate)",
            "category": "spr",
            "entity_id": "aggregate",
            "date": "2025-01-01",
            "confidence": 0.90
        }
    ]


def _supplier_facts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "fact-supplier-iraq",
            "text": "Iraq is India's largest crude oil supplier with 22.5% import share (~1,050,000 bpd). Crude grades: Basrah Light, Medium, Heavy. All exports transit Strait of Hormuz via Basrah terminal. 75% on long-term contracts, 25% spot. Reliability score: 78/100. Current risk level: elevated.",
            "source": "MIRSAD Supplier Database",
            "category": "supplier",
            "entity_id": "iraq",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-supplier-saudi",
            "text": "Saudi Arabia supplies 16.8% of India's crude imports (~780,000 bpd). Grades: Arab Light, Heavy, Extra Light, Medium. Hormuz dependent. 85% on contracts. Reliability score: 92/100 (highest). Has spare capacity buffer.",
            "source": "MIRSAD Supplier Database",
            "category": "supplier",
            "entity_id": "saudi",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-supplier-russia",
            "text": "Russia supplies 18.5% of India's crude imports (~860,000 bpd). Grades: ESPO Blend, Sokol, Urals. NOT Hormuz dependent. Deep discount of ~$12/bbl below Brent. Only 40% on contracts, 60% spot — high volume volatility. Reliability score: 65/100 due to sanctions-related shipping complications.",
            "source": "MIRSAD Supplier Database",
            "category": "supplier",
            "entity_id": "russia",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-supplier-uae",
            "text": "UAE supplies 7.2% of India's crude imports (~335,000 bpd). Primary grade: Murban (high quality, API 40+). Hormuz dependent. 80% contracted. Reliability score: 90/100.",
            "source": "MIRSAD Supplier Database",
            "category": "supplier",
            "entity_id": "uae",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-supplier-aggregate",
            "text": "India imports approximately 4.65 million bpd of crude oil, representing 87.3% import dependency. Top 5 suppliers (Iraq 22.5%, Russia 18.5%, Saudi 16.8%, UAE 7.2%, Kuwait 6.8%) account for 71.8% of imports. Hormuz-dependent suppliers account for approximately 58% of total imports. HHI (supplier concentration) is approximately 0.13, indicating moderate diversification.",
            "source": "MIRSAD Supplier Database (aggregate)",
            "category": "supplier",
            "entity_id": "aggregate",
            "date": "2025-01-01",
            "confidence": 0.90
        }
    ]


def _route_facts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "fact-route-hormuz-jamnagar",
            "text": "Persian Gulf → Jamnagar route (hormuz-jamnagar): 1,480 nautical miles, 7-day transit via VLCC. Annual volume 42.5 MMT (18.2% of India's imports). Passes through Strait of Hormuz chokepoint. Current risk score: 72/100.",
            "source": "MIRSAD Route Database",
            "category": "route",
            "entity_id": "hormuz-jamnagar",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-route-hormuz-mangalore",
            "text": "Persian Gulf → Mangalore route (hormuz-mangalore): 1,850 nautical miles, 9-day transit via Suezmax. Annual volume 28.3 MMT (12.1% of imports). Hormuz dependent. Current risk score: 68/100.",
            "source": "MIRSAD Route Database",
            "category": "route",
            "entity_id": "hormuz-mangalore",
            "date": "2025-01-01",
            "confidence": 0.95
        },
        {
            "id": "fact-route-aggregate",
            "text": "India's crude oil arrives via 10+ major maritime corridors. The two Hormuz-dependent routes (to Jamnagar and Mangalore) carry over 30% of total volume. Alternative non-Hormuz routes include Russia ESPO (via Pacific/Indian Ocean), West Africa via Cape of Good Hope, US Gulf via Atlantic/Suez, and Norway via North Sea. Rerouting Hormuz traffic via Cape of Good Hope adds 12-15 transit days and increases freight costs by $2-4/barrel.",
            "source": "MIRSAD Route Database (aggregate)",
            "category": "route",
            "entity_id": "aggregate",
            "date": "2025-01-01",
            "confidence": 0.90
        }
    ]


def _historical_event_facts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "fact-evt-hormuz-exercise-2025",
            "text": "January 2025: IRGC announced a 5-day naval exercise in the Strait of Hormuz, deploying fast-attack craft and anti-ship missile batteries. Commercial shipping received restricted navigation zone warnings. This caused a +3.2% Brent price impact and +15 risk delta. Severity: high.",
            "source": "MIRSAD Event History",
            "category": "historical_event",
            "entity_id": "evt-001",
            "date": "2025-01-15",
            "confidence": 0.95
        },
        {
            "id": "fact-evt-houthi-strike-2025",
            "text": "March 2025: Houthi anti-ship ballistic missile struck a Suezmax tanker carrying 1M barrels near Bab-el-Mandeb strait. Vessel sustained moderate damage, crew evacuated. Major shipping companies suspended Red Sea transit. Brent impact: +5.8%, risk delta: +25. Severity: critical.",
            "source": "MIRSAD Event History",
            "category": "historical_event",
            "entity_id": "evt-003",
            "date": "2025-03-22",
            "confidence": 0.95
        },
        {
            "id": "fact-evt-us-iran-standoff-2025",
            "text": "May 2025: US deployed USS Eisenhower carrier strike group to Persian Gulf after Iranian fast boats harassed commercial vessels. Brent crude surged 8.3% in a single session. Indian refiners forced onto spot markets at steep premiums. Risk delta: +30. Severity: critical.",
            "source": "MIRSAD Event History",
            "category": "historical_event",
            "entity_id": "evt-005",
            "date": "2025-05-03",
            "confidence": 0.95
        },
        {
            "id": "fact-evt-russia-pipeline-2025",
            "text": "July 2025: Russian ESPO pipeline disruption cut flows by 30% for 3 weeks due to maintenance issues. Indian refiners lost ~260,000 bpd, forcing emergency spot purchases from Middle East at premium prices. Brent impact: +2.5%, risk delta: +12.",
            "source": "MIRSAD Event History",
            "category": "historical_event",
            "entity_id": "evt-008",
            "date": "2025-07-14",
            "confidence": 0.95
        },
        {
            "id": "fact-evt-pattern-analysis",
            "text": "Historical pattern analysis from 2025 events: Average of 1.5 significant supply disruption events per month affecting India's crude imports. Hormuz-related events had the highest average risk delta (+22) and price impact (+5.4%). Red Sea/Houthi events averaged risk delta +20 and price impact +4.1%. The median duration of elevated risk following a critical event is 30-45 days before baseline normalization.",
            "source": "MIRSAD Event History (analysis)",
            "category": "historical_event",
            "entity_id": "pattern",
            "date": "2025-12-01",
            "confidence": 0.85
        }
    ]
