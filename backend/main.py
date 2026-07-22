import uvicorn
import logging
import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path

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
    allow_origins=["*"],  # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths for cached scan data and scan logs ──
CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
LATEST_SCAN_FILE = CACHE_DIR / "latest_scan.json"
SCAN_LOG_FILE = CACHE_DIR / "scan_log.jsonl"

# ── In-memory store for the latest scan result ──
latest_scan_data = {
    "result": None,
    "scanned_at": None,
    "status": "pending",
    "scan_count": 0
}


def log_scan(status: str, details: str = "", risk_score=None):
    """Append a line to the scan log file."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "details": details,
        "risk_score": risk_score
    }
    try:
        with open(SCAN_LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.warning(f"Failed to write scan log: {e}")


def run_scheduled_scan():
    """Execute a full 9-node pipeline scan and cache the result."""
    logger.info("[AutoScan] Starting scheduled scan...")
    log_scan("started", "Scheduled auto-scan initiated")

    initial_state = {
        "topic": "Middle East shipping routes",
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

    try:
        final_state = graph_app.invoke(initial_state)
        report = final_state.get("final_report")

        if report:
            now = datetime.now(timezone.utc).isoformat()
            report["_scanned_at"] = now
            report["_scan_type"] = "auto"

            latest_scan_data["result"] = report
            latest_scan_data["scanned_at"] = now
            latest_scan_data["status"] = "success"
            latest_scan_data["scan_count"] += 1

            # Persist to disk so it survives restarts
            with open(LATEST_SCAN_FILE, "w") as f:
                json.dump(report, f)

            risk = report.get("risk_score", "?")
            logger.info(f"[AutoScan] Scan complete. Risk: {risk}/100")
            log_scan("success", f"Risk score: {risk}/100, Sources: {report.get('sources_consulted', 0)}", risk)
        else:
            latest_scan_data["status"] = "error"
            log_scan("error", "Pipeline returned no report")
            logger.error("[AutoScan] Pipeline returned no report")

    except Exception as e:
        latest_scan_data["status"] = "error"
        log_scan("error", str(e))
        logger.error(f"[AutoScan] Scan failed: {e}", exc_info=True)


def load_cached_scan():
    """Load the last scan result from disk on startup."""
    if LATEST_SCAN_FILE.exists():
        try:
            with open(LATEST_SCAN_FILE) as f:
                data = json.load(f)
            latest_scan_data["result"] = data
            latest_scan_data["scanned_at"] = data.get("_scanned_at")
            latest_scan_data["status"] = "success"
            logger.info(f"[AutoScan] Restored cached scan from {data.get('_scanned_at')}")
        except Exception as e:
            logger.warning(f"[AutoScan] Failed to load cached scan: {e}")


def schedule_auto_scans():
    """Schedule auto-scans 3 times a day (every 8 hours).
    First scan runs 60 seconds after startup to let models load."""
    import time

    # Wait for FactStore to initialize
    time.sleep(60)

    while True:
        run_scheduled_scan()
        # Sleep 8 hours (3 scans per day)
        time.sleep(8 * 60 * 60)


@app.on_event("startup")
def startup_event():
    # Load cached scan from disk
    load_cached_scan()

    # Initialize FactStore models in background
    logger.info("Initializing FactStore models in background thread...")
    threading.Thread(target=fact_store.initialize, daemon=True).start()

    # Start the auto-scan scheduler in background
    logger.info("[AutoScan] Starting auto-scan scheduler (every 8 hours)...")
    threading.Thread(target=schedule_auto_scans, daemon=True).start()


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
            "Quantitative metrics (SSI, HHI, DoA, PSI)",
            "Automated scan scheduler (3x daily)"
        ]
    }


@app.get("/api/latest-scan")
async def get_latest_scan():
    """Returns the most recent auto-scan result with metadata."""
    return {
        "scanned_at": latest_scan_data["scanned_at"],
        "status": latest_scan_data["status"],
        "scan_count": latest_scan_data["scan_count"],
        "data": latest_scan_data["result"]
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
            # Also cache this as the latest scan
            now = datetime.now(timezone.utc).isoformat()
            report["_scanned_at"] = now
            report["_scan_type"] = "manual"
            latest_scan_data["result"] = report
            latest_scan_data["scanned_at"] = now
            latest_scan_data["status"] = "success"
            latest_scan_data["scan_count"] += 1

            with open(LATEST_SCAN_FILE, "w") as f:
                json.dump(report, f)

            log_scan("success", f"Manual scan. Risk: {report.get('risk_score')}/100", report.get("risk_score"))
            logger.info(f"Analysis complete. Risk: {report.get('risk_score')}/100, Sources: {report.get('sources_consulted')}")
            return report
        return {"error": "Failed to generate report"}
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan-log")
async def get_scan_log():
    """Returns the last 20 scan log entries."""
    entries = []
    if SCAN_LOG_FILE.exists():
        try:
            with open(SCAN_LOG_FILE) as f:
                lines = f.readlines()
            for line in lines[-20:]:
                entries.append(json.loads(line.strip()))
        except Exception as e:
            logger.warning(f"Failed to read scan log: {e}")
    return {"log": entries}


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
        "auto_scan": {
            "frequency": "Every 8 hours (3x daily)",
            "last_scan": latest_scan_data["scanned_at"],
            "scan_count": latest_scan_data["scan_count"],
            "status": latest_scan_data["status"]
        },
        "version": "2.0.0"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
