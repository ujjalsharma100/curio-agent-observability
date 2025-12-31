# Curio Agent Observability

A standalone observability dashboard for monitoring and debugging your Curio Agent SDK runs. View agent executions, LLM calls, token usage, latencies, and more.

> **Note**: This is a separate tool from the Curio Agent SDK. Install the SDK separately to use it with your agents.

## Features

- **Dashboard**: Overview of all agent activity, token usage, and recent runs
- **Runs Explorer**: Browse all agent runs with filtering by status and agent
- **Run Detail View**: Timeline of events, LLM calls, and execution history for each run
- **LLM Calls Browser**: Search and filter all LLM API calls with full prompt/response details
- **Agents View**: Per-agent statistics and run history
- **Model Analytics**: Usage statistics broken down by provider and model

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- An existing Curio Agent SDK database (SQLite or PostgreSQL)

### Step 1: Install Curio Agent SDK

**This tool requires the Curio Agent SDK to be installed first.** The observability tool imports from the SDK to access the database persistence layer.

#### Option A: Install from PyPI (when published)

```bash
pip install curio-agent-sdk
```

#### Option B: Install from Source

If you have the SDK source code in the same repository:

```bash
# Navigate to SDK directory
cd ../curio_agent_sdk

# Install in development mode
pip install -e .

# Or install normally
pip install .
```

#### Option C: Install from Local Path

If the SDK is in a different location:

```bash
pip install /path/to/curio_agent_sdk
```

#### Verify Installation

Verify the SDK is installed correctly:

```bash
python -c "import curio_agent_sdk; print('SDK installed successfully')"
```

If you see an import error, the SDK is not installed or not in your Python path.

### Step 2: Configure Database

Set up your environment variables to point to the same database your agents use:

```bash
# For SQLite
export DB_TYPE=sqlite
export DB_PATH=/path/to/your/agent_sdk.db

# For PostgreSQL
export DB_TYPE=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=agent_sdk
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_SCHEMA=agent_sdk
```

You can also create a `.env` file in the `curio_agent_observability` directory with these variables.

### Step 3: Run the Observability Tool

#### Option 1: Using the Run Script

```bash
# Navigate to observability directory
cd curio_agent_observability

# Run both backend and frontend
./run.sh
```

The script will:
- Check if the SDK is installed
- Install backend Python dependencies
- Install frontend Node.js dependencies
- Start the Flask backend (port 5050)
- Start the React frontend (port 3000)

#### Option 2: Manual Setup

**1. Install Backend Dependencies**

```bash
cd curio_agent_observability/backend
pip install -r requirements.txt
```

**2. Start the Backend**

```bash
# Make sure environment variables are set (see Step 2 above)
python app.py
```

The backend will start on port 5050 (or `OBSERVABILITY_PORT` if set).

**3. Install Frontend Dependencies**

In a new terminal:

```bash
cd curio_agent_observability/frontend
npm install
```

**4. Start the Frontend**

```bash
npm start
```

The frontend will start on port 3000.

**5. Open the Dashboard**

Navigate to `http://localhost:3000` in your browser.

## Environment Variables

### Backend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OBSERVABILITY_PORT` | Backend API port | `5050` |
| `OBSERVABILITY_DEBUG` | Enable debug mode | `true` |

### Database Configuration

**SQLite (Development)**
```bash
DB_TYPE=sqlite
DB_PATH=/path/to/agent_sdk.db
```

**PostgreSQL (Production)**
```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agent_sdk
DB_USER=postgres
DB_PASSWORD=your_password
DB_SCHEMA=agent_sdk
```

## Using with the SDK

When you run agents using the Curio Agent SDK, all data is automatically persisted to the database. The observability tool simply reads from this database.

### Example: Running an Agent with Persistence

```python
from curio_agent_sdk import BaseAgent, AgentConfig

# Configure with database persistence
config = AgentConfig.from_env()

# Create your agent
class MyAgent(BaseAgent):
    def get_system_prompt(self):
        return "You are a helpful assistant."

# Run the agent
agent = MyAgent(config=config)
result = agent.run(objective="Complete some task")

# All runs, events, and LLM calls are now visible in the observability dashboard!
```

### Required Environment Variables for SDK

```bash
# Database (same as observability)
DB_TYPE=sqlite
DB_PATH=/path/to/agent_sdk.db

# LLM Providers
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

## API Endpoints

The Flask backend exposes the following REST API:

### Health & Stats
- `GET /api/health` - API and database health check
- `GET /api/stats` - Overall statistics

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id/stats` - Get agent statistics

### Runs
- `GET /api/runs` - List runs (supports filtering)
- `GET /api/runs/:id` - Get run details
- `GET /api/runs/:id/events` - Get run events
- `GET /api/runs/:id/llm-calls` - Get run LLM calls
- `GET /api/runs/:id/timeline` - Get run timeline view

### LLM Calls
- `GET /api/llm-calls` - List LLM calls (supports filtering)
- `GET /api/llm-calls/:id` - Get LLM call details
- `GET /api/llm-calls/models` - Get model usage statistics

### Events
- `GET /api/events` - List events
- `GET /api/events/types` - List event types

### Search
- `GET /api/search?q=query` - Search across runs and LLM calls

## Screenshots

### Dashboard
The main dashboard shows:
- Total runs, LLM calls, and token usage
- Recent agent runs with status
- Recent LLM calls with model info

### Run Detail
Each run shows:
- Execution timeline with events and LLM calls
- Token usage breakdown
- Full execution history in JSON format
- Direct links to individual LLM calls

### LLM Call Detail
Each LLM call shows:
- Full prompt and response text
- Token counts and latency
- Copy-to-clipboard for prompts/responses
- Input parameters and usage metrics

## Development

### Backend

The Flask backend is in `backend/app.py`. It uses the SDK's persistence layer directly:

```python
from curio_agent_sdk.config.settings import AgentConfig

config = AgentConfig.from_env()
persistence = config.get_persistence()

# Query runs
runs = persistence.get_agent_runs(limit=50)

# Query LLM calls
llm_calls = persistence.get_llm_usage(run_id="...")
```

### Frontend

The React frontend uses:
- React Router for navigation
- Lucide React for icons
- date-fns for date formatting
- CSS custom properties for theming

To modify the UI, edit files in `frontend/src/`:
- `pages/` - Page components
- `components/` - Reusable components
- `index.css` - Global styles

## Troubleshooting

### "ModuleNotFoundError: No module named 'curio_agent_sdk'"

This means the Curio Agent SDK is not installed. Follow **Step 1** in the Quick Start section above to install it.

**Common causes:**
- SDK not installed: Run `pip install curio-agent-sdk` or install from source
- Wrong Python environment: Make sure you're using the same Python environment where the SDK is installed
- Virtual environment: Activate the virtual environment where the SDK is installed

**Verify installation:**
```bash
python -c "import curio_agent_sdk; print(curio_agent_sdk.__file__)"
```

This should print the path to the SDK installation. If it errors, the SDK is not installed.

### "No runs found"
- Ensure your `DB_PATH` or PostgreSQL connection points to a database with existing agent runs
- Run some agents first to populate data
- Verify the database connection settings match your SDK configuration

### Backend won't start
- Check that the port isn't already in use
- Verify database credentials are correct
- Check Python dependencies are installed: `pip install -r backend/requirements.txt`
- Ensure the SDK is installed (see above)
- Check backend logs for specific error messages

### Frontend shows empty data
- Ensure the backend is running on port 5050
- Check browser console for API errors
- Verify the proxy setting in `package.json` points to the correct backend URL
- Check that the backend API is responding: `curl http://localhost:5050/api/health`

## Troubleshooting

### "ModuleNotFoundError: No module named 'curio_agent_sdk'"

This means the Curio Agent SDK is not installed. Follow **Step 1** in the Quick Start section above to install it.

**Common causes:**
- SDK not installed: Run `pip install curio-agent-sdk` or install from source
- Wrong Python environment: Make sure you're using the same Python environment where the SDK is installed
- Virtual environment: Activate the virtual environment where the SDK is installed

**Verify installation:**
```bash
python -c "import curio_agent_sdk; print(curio_agent_sdk.__file__)"
```

This should print the path to the SDK installation. If it errors, the SDK is not installed.

## License

Part of the Curio Agent SDK project.
