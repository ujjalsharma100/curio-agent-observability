import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Play,
  MessageSquare,
  Users,
  Cpu,
  Search,
  Activity
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import RunsList from './pages/RunsList';
import RunDetail from './pages/RunDetail';
import LLMCallsList from './pages/LLMCallsList';
import LLMCallDetail from './pages/LLMCallDetail';
import AgentsList from './pages/AgentsList';

function NavLink({ to, icon: Icon, children }) {
  const location = useLocation();
  const isActive = location.pathname === to ||
    (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      <Icon />
      {children}
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>
          <Activity size={20} />
          Curio
        </h1>
        <span>Observability</span>
      </div>

      <nav className="nav-section">
        <div className="nav-section-title">Overview</div>
        <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
      </nav>

      <nav className="nav-section">
        <div className="nav-section-title">Explore</div>
        <NavLink to="/runs" icon={Play}>Runs</NavLink>
        <NavLink to="/llm-calls" icon={MessageSquare}>LLM Calls</NavLink>
        <NavLink to="/agents" icon={Users}>Agents</NavLink>
      </nav>

      <nav className="nav-section">
        <div className="nav-section-title">Analytics</div>
        <NavLink to="/models" icon={Cpu}>Models</NavLink>
      </nav>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runs" element={<RunsList />} />
            <Route path="/runs/:runId" element={<RunDetail />} />
            <Route path="/llm-calls" element={<LLMCallsList />} />
            <Route path="/llm-calls/:callId" element={<LLMCallDetail />} />
            <Route path="/agents" element={<AgentsList />} />
            <Route path="/models" element={<ModelsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Simple Models page
function ModelsPage() {
  const [models, setModels] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/llm-calls/models')
      .then(res => res.json())
      .then(data => {
        setModels(data.models || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>Model Usage</h1>
        <p>Analytics for LLM models used across all runs</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Calls</th>
                <th>Input Tokens</th>
                <th>Output Tokens</th>
                <th>Avg Latency</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="badge badge-info">{model.provider}</span>
                  </td>
                  <td className="mono">{model.model}</td>
                  <td>{model.call_count.toLocaleString()}</td>
                  <td>{model.total_input_tokens.toLocaleString()}</td>
                  <td>{model.total_output_tokens.toLocaleString()}</td>
                  <td>{model.avg_latency_ms?.toLocaleString() || 0}ms</td>
                  <td>
                    {model.error_count > 0 ? (
                      <span className="badge badge-error">{model.error_count}</span>
                    ) : (
                      <span className="badge badge-success">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default App;
