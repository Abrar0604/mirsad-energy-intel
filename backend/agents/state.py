from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    State for the LangGraph workflow.
    Extended with multi-source data, RAG facts, trajectory forecasts, and metrics.
    """
    topic: str
    articles: List[Dict[str, Any]]
    commodity_prices: Optional[Dict[str, Any]]      # Brent/WTI price feed
    vessel_signals: Optional[List[Dict[str, Any]]]   # AIS chokepoint congestion
    retrieved_facts: Optional[List[Dict[str, Any]]]  # RAG retrieved facts
    risk_assessment: Optional[Dict[str, Any]]
    economic_impact: Optional[Dict[str, Any]]
    trajectory_forecast: Optional[Dict[str, Any]]    # 7/30-day risk forecast
    computed_metrics: Optional[Dict[str, Any]]        # SSI, HHI, DoA, PSI
    llm_usage: Optional[List[Dict[str, Any]]]        # LLM rotation log
    final_report: Optional[Dict[str, Any]]
    error: Optional[str]
