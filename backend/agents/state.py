from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    State for the LangGraph workflow.
    """
    topic: str
    articles: List[Dict[str, Any]]
    risk_assessment: Optional[Dict[str, Any]]
    economic_impact: Optional[Dict[str, Any]]
    final_report: Optional[Dict[str, Any]]
    error: Optional[str]
