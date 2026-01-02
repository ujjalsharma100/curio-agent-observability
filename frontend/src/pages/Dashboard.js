import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Play, MessageSquare, AlertCircle, CheckCircle, Clock, ArrowRight, ExternalLink, Hash } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [recentLLMCalls, setRecentLLMCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/runs?limit=5').then(r => r.json()),
      fetch('/api/llm-calls?limit=5').then(r => r.json())
    ])
      .then(([statsData, runsData, llmData]) => {
        setStats(statsData);
        setRecentRuns(runsData.runs || []);
        setRecentLLMCalls(llmData.llm_calls || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, HH:mm');
    } catch {
      return timestamp;
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your agent activity and LLM usage</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{stats?.total_runs?.toLocaleString() || 0}</div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--accent-green)' }}>{stats?.completed_runs || 0} completed</span>
            {stats?.error_runs > 0 && (
              <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>{stats.error_runs} errors</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">LLM Calls</div>
          <div className="stat-value">{stats?.total_llm_calls?.toLocaleString() || 0}</div>
          <div className="stat-subtext">Across all runs</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Input Tokens</div>
          <div className="stat-value">{stats?.total_input_tokens?.toLocaleString() || 0}</div>
          <div className="stat-subtext">Total consumed</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Output Tokens</div>
          <div className="stat-value">{stats?.total_output_tokens?.toLocaleString() || 0}</div>
          <div className="stat-subtext">Total generated</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Avg Iterations</div>
          <div className="stat-value">{stats?.avg_iterations?.toFixed(1) || 0}</div>
          <div className="stat-subtext">Per run</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Runs */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={16} />
              Recent Runs
            </h2>
            <Link to="/runs" className="btn btn-ghost" style={{ fontSize: 13 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <div className="empty-state">
              <Play />
              <h3>No runs yet</h3>
              <p>Agent runs will appear here</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map(run => (
                    <tr key={run.run_id} className="clickable-row">
                      <td>
                        <Link
                          to={`/runs/${run.run_id}`}
                          className="mono"
                          style={{ fontSize: 10, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}
                          title={run.run_id}
                        >
                          <ExternalLink size={10} />
                          {run.run_id?.slice(0, 8)}...
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/agents?agent_id=${run.agent_id}`}
                          style={{ display: 'block' }}
                        >
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{run.agent_name || 'Unknown'}</div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--accent-purple)' }} title={run.agent_id}>
                            {run.agent_id?.slice(0, 12)}...
                          </div>
                        </Link>
                      </td>
                      <td>
                        {run.status === 'completed' ? (
                          <span className="badge badge-success"><CheckCircle size={12} /></span>
                        ) : run.status === 'error' ? (
                          <span className="badge badge-error"><AlertCircle size={12} /></span>
                        ) : (
                          <span className="badge badge-warning"><Clock size={12} /></span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatTime(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent LLM Calls */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} />
              Recent LLM Calls
            </h2>
            <Link to="/llm-calls" className="btn btn-ghost" style={{ fontSize: 13 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recentLLMCalls.length === 0 ? (
            <div className="empty-state">
              <MessageSquare />
              <h3>No LLM calls yet</h3>
              <p>LLM calls will appear here</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Model</th>
                    <th>Tokens</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLLMCalls.map(call => (
                    <tr key={call.id} className="clickable-row">
                      <td>
                        {call.run_id ? (
                          <Link
                            to={`/runs/${call.run_id}`}
                            className="mono"
                            style={{ fontSize: 10, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}
                            title={call.run_id}
                          >
                            <ExternalLink size={10} />
                            {call.run_id?.slice(0, 8)}...
                          </Link>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <Link to={`/llm-calls/${call.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge badge-info" style={{ fontSize: 10 }}>{call.provider}</span>
                          <span className="mono" style={{ fontSize: 11 }}>{call.model}</span>
                        </Link>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {((call.input_tokens || 0) + (call.output_tokens || 0)).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {call.latency_ms?.toLocaleString() || '-'}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
