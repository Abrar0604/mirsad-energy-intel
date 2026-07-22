import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("mirsad.api")

from agents.graph import graph_app
from agents.llm_pool import llm_pool
from agents.fact_store import fact_store

app = FastAPI(
    title="MIRSAD Backend API",
    version="2.0.0",
    description="Multi-source Intelligence for Risk & Supply Analysis Dashboard"
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    topic: str = Field(..., description="The topic to analyze for geopolitical risk")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the MIRSAD AI Backend API",
        "version": "2.0.0",
        "features": [
            "Multi-LLM key rotation pool",
            "RAG fact-grounded analysis",
            "Multi-source intelligence (news + commodity + AIS)",
            "Predictive risk trajectory (7/30-day forecast)",
            "Quantitative metrics (SSI, HHI, DoA, PSI)"
        ]
    }

@app.post("/api/analyze-risk")
async def analyze_risk(request: AnalyzeRequest):
    """
    Triggers the 9-node LangGraph agent pipeline:
    fetch_news → fetch_commodity_prices → fetch_vessel_signals →
    retrieve_facts → analyze_risk → predict_trajectory →
    compute_metrics → assess_economic → compile_report
    """
    logger.info(f"Starting analysis for topic: {request.topic}")

    # Initialize the state with all new fields
    initial_state = {
        "topic": request.topic,
        "articles": [],
        "commodity_prices": None,
        "vessel_signals": None,
        "retrieved_facts": None,
        "risk_assessment": None,
        "economic_impact": None,
        "trajectory_forecast": None,
        "computed_metrics": None,
        "llm_usage": [],
        "final_report": None,
        "error": None
    }

    # Run the graph
    try:
        final_state = graph_app.invoke(initial_state)
        report = final_state.get("final_report")
        if report:
            logger.info(f"Analysis complete. Risk: {report.get('risk_score')}/100, Sources: {report.get('sources_consulted')}")
            return report
        return {"error": "Failed to generate report"}
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system-status")
async def system_status():
    """
    Returns current system health including LLM pool status,
    fact store stats, and pipeline capabilities.
    """
    return {
        "llm_pool": {
            "pool_size": llm_pool.pool_size,
            "healthy_count": llm_pool.healthy_count,
            "credentials": llm_pool.get_pool_status()
        },
        "fact_store": fact_store.get_stats(),
        "pipeline": {
            "nodes": [
                "fetch_news", "fetch_commodity_prices", "fetch_vessel_signals",
                "retrieve_facts", "analyze_risk", "predict_trajectory",
                "compute_metrics", "assess_economic", "compile_report"
            ],
            "node_count": 9,
            "data_sources": ["GDELT/NewsAPI", "Brent/WTI (yfinance)", "AIS vessel signals", "ChromaDB facts"]
        },
        "version": "2.0.0"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
