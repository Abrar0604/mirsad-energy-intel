# 🔭 MIRSAD (مرصاد)
**AI-Powered Energy Supply Chain Resilience Platform**

MIRSAD (Watchtower) is a real-time geopolitical risk monitoring and disruption scenario modeling platform designed to safeguard India's crude oil energy security. By utilizing AI and live intelligence, MIRSAD provides adaptive procurement intelligence, threat simulations, and strategic reserve optimization.

---

## 🌟 Key Features

- **📡 Command Center**: A bird's-eye view of global supply chains, live vessel tracking, and critical maritime chokepoints (e.g., Strait of Hormuz, Red Sea) visualized on an interactive map.
- **📊 Risk Intelligence**: Multi-dimensional geopolitical risk scoring using AI. Fetches live news, analyzes threats, and predicts the economic impact (e.g., Brent crude price surges).
- **📉 Scenario Modeller**: Pre-configured disruption war-games. Simulate supply gaps and economic impacts of events like a Hormuz Blockade or a Red Sea crisis.
- **🚢 Procurement Orchestrator**: Alternative source ranking and rerouting strategy engine to mitigate supply shocks.
- **🛢️ Reserve Optimizer**: Strategic Petroleum Reserve (SPR) drawdown strategy and coverage optimization (managing reserves in Visakhapatnam, Mangalore, and Padur).
- **✨ Modern UI/UX**: A fully responsive, soft pastel, human-designed data dashboard powered by CSS Grid, Lucide icons, and fluid micro-animations.

---

## 🛠️ Tech Stack

### Frontend
- **Core**: HTML5, CSS3 (Vanilla design tokens, CSS Grid/Flexbox), JavaScript (ES6+ Modules)
- **Mapping**: Leaflet.js (v1.9.4) for geospatial rendering of supply routes and threat zones
- **Data Visualization**: Chart.js (v4.4.4) for dynamic charting and KPI tracking
- **Icons**: Lucide Icons (SVG)
- **Architecture**: Single Page Application (SPA) driven by a multi-agent modular JavaScript framework

### Backend
- **Core Framework**: FastAPI (v0.110+)
- **Server**: Uvicorn
- **AI Orchestration**: LangGraph, LangChain Core
- **LLM Provider**: Google Gemini (`gemini-2.0-flash`)
- **Data Source**: NewsAPI (newsapi.org) for live geopolitical signals

---

## ⚙️ System Architecture

MIRSAD uses a **hybrid multi-agent architecture**:

1. **Frontend Agents (JS)**:
   - `AgentCoordinator`: The master orchestrator linking intelligence signals to action plans.
   - `RiskIntelligenceAgent`, `ScenarioModeller`, `ProcurementOrchestrator`, `ReserveOptimizer`: Specialized client-side engines that process and visualize data.
2. **Backend Agent Graph (Python)**:
   - A LangGraph workflow processes live risk requests (`POST /api/analyze-risk`).
   - `fetch_news` ➔ `analyze_risk` (LLM) ➔ `assess_economic` (LLM) ➔ `compile_report`.

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js (Optional, for running local dev servers)
- API Keys: 
  - [Google Gemini API Key](https://aistudio.google.com/)
  - [NewsAPI Key](https://newsapi.org/)

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Variables
# Create a .env file in the backend directory and add your keys:
# GEMINI_API_KEY=your_gemini_api_key
# NEWS_API_KEY=your_news_api_key

# Start the FastAPI backend
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# In a new terminal, navigate to the project root
cd MIRSAD

# Serve the static files (using Python's built-in server)
python3 -m http.server 8080
```

### 3. Access the Platform
Open your browser and navigate to: `http://localhost:8080`

---

## 🧪 Usage

1. **Live Scanning**: Click **"Scan Live Threats"** in the top navigation bar to trigger the Python backend. The system will fetch real-world news regarding Middle East shipping routes, analyze the risk using Gemini, and update the dashboard KPIs.
2. **War-Gaming**: Navigate to the **Scenarios** tab to run simulations of geopolitical crises and watch how the Procurement and Reserve agents adapt.

---

## 📝 License
Proprietary - Developed for Energy Intelligence & Supply Chain Resilience.
