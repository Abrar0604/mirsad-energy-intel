import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from agents.graph import graph_app

app = FastAPI(title="MIRSAD Backend API", version="1.0.0")

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
    return {"message": "Welcome to the MIRSAD AI Backend API"}

@app.post("/api/analyze-risk")
async def analyze_risk(request: AnalyzeRequest):
    """
    Triggers the LangGraph agent workflow to fetch news, 
    analyze geopolitical risk, and assess economic impact.
    """
    print(f"Starting analysis for topic: {request.topic}")
    
    # Initialize the state
    initial_state = {
        "topic": request.topic,
        "articles": [],
        "risk_assessment": None,
        "economic_impact": None,
        "final_report": None,
        "error": None
    }
    
    # Run the graph
    try:
        final_state = graph_app.invoke(initial_state)
        report = final_state.get("final_report")
        if report and report.get("error"):
            # We have a report, but it contains an error from a node
            return report
        return report or {"error": "Failed to generate report"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
