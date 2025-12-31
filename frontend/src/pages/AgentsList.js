import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Users, Play, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';

function AgentsList() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentStats, setAgentStats] = useState(null);
  const [agentRuns, setAgentRuns] = useState([]);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      Promise.all([
        fetch(`/api/agents/${selectedAgent.agent_id}/stats`).then(r => r.json()),
        fetch(`/api/runs?agent_id=${selectedAgent.agent_id}&limit=10`).then(r => r.json())
      ])
        .then(([stats, runs]) => {
          setAgentStats(stats);
          setAgentRuns(runs.runs || []);
        });
    }
  }, [selectedAgent]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading agents...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>Agents</h1>
        <p>View all agents and their execution history</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 2fr' : '1fr', gap: 20 }}>
        {/* Agents List */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            All Agents ({agents.length})
          </div>

          {agents.length === 0 ? (
            <div className="empty-state">
              <Users />
              <h3>No agents found</h3>
              <p>Run some agents to see them here</p>
            </div>
          ) : (
            <div>
              {agents.map(agent => (
                <div
                  key={agent.agent_id}
                  onClick={() => setSelectedAgent(agent)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 6,
                    marginBottom: 8,
                    cursor: 'pointer',
                    background: selectedAgent?.agent_id === agent.agent_id
                      ? 'var(--bg-hover)'
                      : 'transparent',
                    border: '1px solid',
                    borderColor: selectedAgent?.agent_id === agent.agent_id
                      ? 'var(--accent-blue)'
                      : 'var(--border-color)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {agent.agent_name || agent.agent_id}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{agent.total_runs} runs</span>
                    <span style={{ color: 'var(--accent-green)' }}>
                      {agent.completed_runs} completed
                    </span>
                    {agent.error_runs > 0 && (
                      <span style={{ color: 'var(--accent-red)' }}>
                        {agent.error_runs} errors
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Last run: {formatTime(agent.last_run)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Details */}
        {selectedAgent && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, marginBottom: 16 }}>
                {selectedAgent.agent_name || selectedAgent.agent_id}
              </h2>

              <div className="stats-grid" style={{ marginBottom: 0 }}>
                <div className="stat-card">
                  <div className="stat-label">Total Runs</div>
                  <div className="stat-value">{agentStats?.total_runs || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Completed</div>
                  <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
                    {agentStats?.completed_runs || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Errors</div>
                  <div className="stat-value" style={{ color: 'var(--accent-red)' }}>
                    {agentStats?.error_runs || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Iterations</div>
                  <div className="stat-value">{agentStats?.avg_iterations?.toFixed(1) || 0}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Runs</h3>
                <Link
                  to={`/runs?agent_id=${selectedAgent.agent_id}`}
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                >
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Objective</th>
                      <th>Status</th>
                      <th>Iterations</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRuns.map(run => (
                      <tr key={run.run_id} className="clickable-row">
                        <td>
                          <Link to={`/runs/${run.run_id}`} className="truncate" style={{ maxWidth: 250, display: 'block' }}>
                            {run.objective || '-'}
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
                        <td>{run.total_iterations || 0}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {formatTime(run.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>LLM Usage</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Calls</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{agentStats?.total_llm_calls || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Input Tokens</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {(agentStats?.total_input_tokens || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Output Tokens</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent-green)' }}>
                    {(agentStats?.total_output_tokens || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AgentsList;
