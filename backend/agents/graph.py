import os
import json
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

from .state import AgentState
from .news_tool import fetch_geopolitical_news

# Use Google Gemini if key exists, otherwise we'll mock the LLM responses
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def get_llm():
    if GOOGLE_API_KEY:
        return ChatGoogleGenerativeAI(temperature=0, model="gemini-2.0-flash", convert_system_message_to_human=True, max_retries=0)
    return None

# Node functions
def fetch_news_node(state: AgentState) -> Dict[str, Any]:
    """Fetches news based on the topic."""
    topic = state.get("topic", "Middle East shipping routes")
    print(f"Fetching news for topic: {topic}")
    
    # Run the tool
    articles = fetch_geopolitical_news.invoke({"query": topic})
    return {"articles": articles}

def analyze_risk_node(state: AgentState) -> Dict[str, Any]:
    """Analyzes the geopolitical risk from the news articles."""
    articles = state.get("articles", [])
    if not articles:
        return {"risk_assessment": {"score": 50, "summary": "No news found."}}

    llm = get_llm()
    if not llm:
        # Mock risk assessment
        print("MOCKING LLM: analyze_risk_node")
        return {
            "risk_assessment": {
                "score": 75,
                "summary": "Mock assessment: High risk detected in the Red Sea due to recent tensions."
            }
        }

    # Prepare prompt
    news_text = "\n".join([f"- {a['title']}: {a['description']}" for a in articles])
    prompt = PromptTemplate.from_template(
        "Analyze the following news articles regarding geopolitical events and shipping routes.\n"
        "Provide a risk score from 0 (safe) to 100 (critical) and a brief summary of the risk.\n"
        "Format output as JSON with keys 'score' and 'summary'.\n\n"
        "Articles:\n{news_text}"
    )
    
    chain = prompt | llm
    
    # We allow exceptions to bubble up intentionally so rate limits are surfaced to the UI
    response = chain.invoke({"news_text": news_text})
    
    # Parse JSON from response
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:-3]
    result = json.loads(content)
    return {"risk_assessment": result}

def assess_economic_node(state: AgentState) -> Dict[str, Any]:
    """Estimates the economic impact (e.g. Brent crude price) based on risk."""
    risk_assessment = state.get("risk_assessment") or {}
    score = risk_assessment.get("score", 50)

    llm = get_llm()
    if not llm:
        # Mock economic impact
        print("MOCKING LLM: assess_economic_node")
        brent_impact = score * 0.1 # simple mock calculation
        return {
            "economic_impact": {
                "brent_price_increase_pct": round(brent_impact, 2),
                "summary": f"Mock economic impact: Expected {brent_impact}% increase in crude prices."
            }
        }

    prompt = PromptTemplate.from_template(
        "Given the geopolitical risk score of {score}/100 and the risk summary: '{summary}', "
        "estimate the potential percentage impact on Brent crude oil prices.\n"
        "Format output as JSON with keys 'brent_price_increase_pct' (number) and 'summary' (string)."
    )
    
    chain = prompt | llm
    
    # We allow exceptions to bubble up intentionally so rate limits are surfaced to the UI
    response = chain.invoke({
        "score": score,
        "summary": risk_assessment.get("summary", "")
    })
    
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:-3]
    result = json.loads(content)
    return {"economic_impact": result}

def compile_report_node(state: AgentState) -> Dict[str, Any]:
    """Compiles the final report."""
    articles = state.get("articles", [])
    risk = state.get("risk_assessment") or {}
    econ = state.get("economic_impact") or {}
    
    report = {
        "topic": state.get("topic"),
        "articles_analyzed": len(articles),
        "risk_score": risk.get("score"),
        "risk_summary": risk.get("summary"),
        "economic_impact": econ,
        "status": "success" if not state.get("error") else "partial_success",
        "error": state.get("error")
    }
    return {"final_report": report}

# Build the Graph
def build_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("fetch_news", fetch_news_node)
    workflow.add_node("analyze_risk", analyze_risk_node)
    workflow.add_node("assess_economic", assess_economic_node)
    workflow.add_node("compile_report", compile_report_node)
    
    # Define edges
    workflow.set_entry_point("fetch_news")
    workflow.add_edge("fetch_news", "analyze_risk")
    workflow.add_edge("analyze_risk", "assess_economic")
    workflow.add_edge("assess_economic", "compile_report")
    workflow.add_edge("compile_report", END)
    
    # Compile
    app = workflow.compile()
    return app

# Singleton graph instance
graph_app = build_graph()
