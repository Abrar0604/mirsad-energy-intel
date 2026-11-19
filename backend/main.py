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
DEFAULT_SCAN_FILE = Path(__file__).parent / "data" / "default_scan.json"

# Concurrency lock to prevent concurrent heavy graph invocations on Render's 512MB RAM
analysis_lock = threading.Lock()

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


def load_cached_scan():
    """Load the last scan result from disk on startup."""
    target_file = None
    if LATEST_SCAN_FILE.exists():
        target_file = LATEST_SCAN_FILE
    elif DEFAULT_SCAN_FILE.exists():
        target_file = DEFAULT_SCAN_FILE

    if target_file:
        try:
            with open(target_file) as f:
                data = json.load(f)
            now = data.get("_scanned_at") or data.get("timestamp") or datetime.now(timezone.utc).isoformat()
            data["_scanned_at"] = now
            latest_scan_data["result"] = data
            latest_scan_data["scanned_at"] = now
            latest_scan_data["status"] = "success"
            latest_scan_data["scan_count"] = 1
            # Ensure latest_scan.json is created
            if not LATEST_SCAN_FILE.exists():
                with open(LATEST_SCAN_FILE, "w") as f:
                    json.dump(data, f)
            logger.info(f"[AutoScan] Restored cached scan from {now} (source: {target_file.name})")
        except Exception as e:
            logger.warning(f"[AutoScan] Failed to load cached scan: {e}")


@app.on_event("startup")
def startup_event():
    # 1. Instantly load cached scan so frontend gets data in < 1ms
    load_cached_scan()

    # 2. Fast synchronous BM25 index initialization (< 2ms)
    logger.info("Initializing FactStore BM25 index...")
    fact_store.initialize()


class AnalyzeRequest(BaseModel):
    topic: str = Field(..., description="The topic to analyze for geopolitical risk")


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the MIRSAD AI Backend API",
        "version": "2.0.0",
        "status": "healthy",
        "features": [
            "Multi-LLM key rotation pool",
            "BM25 high-performance fact retrieval (0-dep)",
            "Multi-source intelligence (news + commodity + AIS)",
            "Predictive risk trajectory (7/30-day forecast)",
            "Quantitative metrics (SSI, HHI, DoA, PSI)",
            "Render Free Tier optimized (low RAM, thread-safe)"
        ]
    }


@app.get("/api/latest-scan")
def get_latest_scan():
    """Returns the most recent scan result with metadata instantly."""
    if latest_scan_data["result"] is None:
        load_cached_scan()
    return {
        "scanned_at": latest_scan_data["scanned_at"],
        "status": latest_scan_data["status"],
        "scan_count": latest_scan_data["scan_count"],
        "data": latest_scan_data["result"]
    }


@app.post("/api/analyze-risk")
def analyze_risk(request: AnalyzeRequest):
    """
    Triggers the 9-node LangGraph agent pipeline:
    fetch_news → fetch_commodity_prices → fetch_vessel_signals →
    retrieve_facts → analyze_risk → predict_trajectory →
    compute_metrics → assess_economic → compile_report

    Note: Defined as a standard synchronous `def` so FastAPI dispatches it
    to a worker thread in Starlette's threadpool. This prevents event loop starvation
    and allows health checks and concurrent read requests to respond immediately.
    """
    logger.info(f"Analysis requested for topic: {request.topic}")

    # Concurrency guard: Only one pipeline execution at a time on Render Free Tier
    # (prevents OOM on 512MB RAM and 0.1 vCPU)
    acquired = analysis_lock.acquire(blocking=False)
    if not acquired:
        logger.warning("Analysis already in progress; returning current cached intelligence")
        if latest_scan_data["result"]:
            res = dict(latest_scan_data["result"])
            res["_in_progress_notice"] = "Another analysis is currently being processed. Serving latest intelligence."
            return res
        raise HTTPException(
            status_code=429,
            detail="An analysis is currently being processed. Please retry in a few seconds."
        )

    try:
        log_scan("started", f"Analysis initiated for '{request.topic}'")
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

        final_state = graph_app.invoke(initial_state)
        report = final_state.get("final_report")

        if report:
            now = datetime.now(timezone.utc).isoformat()
            report["_scanned_at"] = now
            report["_scan_type"] = "manual"
            latest_scan_data["result"] = report
            latest_scan_data["scanned_at"] = now
            latest_scan_data["status"] = "success"
            latest_scan_data["scan_count"] += 1

            try:
                with open(LATEST_SCAN_FILE, "w") as f:
                    json.dump(report, f)
            except Exception as fe:
                logger.warning(f"Could not write latest scan to disk: {fe}")

            log_scan("success", f"Manual scan. Risk: {report.get('risk_score')}/100", report.get("risk_score"))
            logger.info(f"Analysis complete. Risk: {report.get('risk_score')}/100, Sources: {report.get('sources_consulted')}")
            return report

        logger.error("Pipeline finished without producing a report")
        log_scan("error", "Pipeline returned no report")
        # Return last good scan if pipeline fails
        if latest_scan_data["result"]:
            return latest_scan_data["result"]
        return {"error": "Failed to generate report"}

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        log_scan("error", str(e))
        # Fall back gracefully to cached scan if available
        if latest_scan_data["result"]:
            logger.info("Serving last-known-good cached scan after pipeline exception")
            fallback_res = dict(latest_scan_data["result"])
            fallback_res["_fallback_notice"] = f"Real-time pipeline exception: {str(e)[:100]}. Serving last known good intelligence."
            return fallback_res
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        analysis_lock.release()


@app.get("/api/scan-log")
def get_scan_log():
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
def system_status():
    """
    Returns current system health including LLM pool status,
    fact store stats, and pipeline capabilities.
    """
    if not fact_store._initialized:
        fact_store.initialize()
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
            "data_sources": ["GDELT/NewsAPI", "Brent/WTI (yfinance)", "AIS vessel signals", "BM25 Knowledge Base"]
        },
        "auto_scan": {
            "frequency": "On-demand + persistent cache",
            "last_scan": latest_scan_data["scanned_at"],
            "scan_count": latest_scan_data["scan_count"],
            "status": latest_scan_data["status"]
        },
        "version": "2.0.0"
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
