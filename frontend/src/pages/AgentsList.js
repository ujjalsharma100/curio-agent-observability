import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Users, Play, CheckCircle, AlertCircle, Clock, ArrowRight, Search, Copy, Hash, MessageSquare, ExternalLink, Zap } from 'lucide-react';

function AgentsList() {
  const [searchParams] = useSearchParams();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentStats, setAgentStats] = useState(null);
  const [agentRuns, setAgentRuns] = useState([]);
  const [agentLLMCalls, setAgentLLMCalls] = useState([]);
  const [activeTab, setActiveTab] = useState('runs');
  const [agentIdFilter, setAgentIdFilter] = useState('');
  const [agentNameFilter, setAgentNameFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Auto-select agent from URL params
  const urlAgentId = searchParams.get('agent_id');

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        const agentsList = data.agents || [];
        setAgents(agentsList);
        setLoading(false);

        // Auto-select agent if specified in URL
        if (urlAgentId) {
          const agent = agentsList.find(a => a.agent_id === urlAgentId);
          if (agent) {
            setSelectedAgent(agent);
          }
        }
      })
      .catch(() => setLoading(false));
  }, [urlAgentId]);

  useEffect(() => {
    if (selectedAgent) {
      Promise.all([
        fetch(`/api/agents/${selectedAgent.agent_id}/stats`).then(r => r.json()),
        fetch(`/api/runs?agent_id=${selectedAgent.agent_id}&limit=20`).then(r => r.json()),
        fetch(`/api/llm-calls?agent_id=${selectedAgent.agent_id}&limit=20`).then(r => r.json())
      ])
        .then(([stats, runs, llmCalls]) => {
          setAgentStats(stats);
          setAgentRuns(runs.runs || []);
          setAgentLLMCalls(llmCalls.llm_calls || []);
        });
    }
  }, [selectedAgent]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
    } catch {
      return timestamp;
    }
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    try {
      const ms = new Date(end) - new Date(start);
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${(ms / 60000).toFixed(1)}m`;
    } catch {
      return '-';
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (agentIdFilter && !(agent.agent_id || '').toLowerCase().includes(agentIdFilter.toLowerCase())) {
      return false;
    }
    if (agentNameFilter && !(agent.agent_name || '').toLowerCase().includes(agentNameFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const hasFilters = agentIdFilter || agentNameFilter;

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading agents...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>Agents</h1>
        <p>View all agents and their execution history. Click an agent to see details.</p>
      </div>

      {/* Filters */}
      <div className="filters" style={{ marginBottom: 20, gap: 12 }}>
        <div className="search-input" style={{ maxWidth: 220 }}>
          <Hash size={16} />
          <input
            type="text"
            className="input"
            placeholder="Filter by Agent ID..."
            value={agentIdFilter}
            onChange={e => setAgentIdFilter(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <div className="search-input" style={{ maxWidth: 220 }}>
          <Search size={16} />
          <input
            type="text"
            className="input"
            placeholder="Filter by Agent Name..."
            value={agentNameFilter}
            onChange={e => setAgentNameFilter(e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>

        {hasFilters && (
          <button
            className="btn btn-ghost"
            onClick={() => { setAgentIdFilter(''); setAgentNameFilter(''); }}
            style={{ fontSize: 12 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 2fr' : '1fr', gap: 20 }}>
        {/* Agents Table */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            All Agents ({filteredAgents.length}{hasFilters ? ` of ${agents.length}` : ''})
          </div>

          {filteredAgents.length === 0 ? (
            <div className="empty-state">
              <Users />
              <h3>{hasFilters ? 'No matching agents' : 'No agents found'}</h3>
              <p>{hasFilters ? 'Try different filters' : 'Run some agents to see them here'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Agent ID</th>
                    <th>Agent Name</th>
                    <th>Runs</th>
                    <th>Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map(agent => (
                    <tr
                      key={agent.agent_id}
                      className={`clickable-row ${selectedAgent?.agent_id === agent.agent_id ? 'selected' : ''}`}
                      onClick={() => setSelectedAgent(agent)}
                      style={{
                        background: selectedAgent?.agent_id === agent.agent_id ? 'var(--bg-hover)' : undefined,
                        borderLeft: selectedAgent?.agent_id === agent.agent_id ? '3px solid var(--accent-purple)' : '3px solid transparent'
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span
                            className="mono"
                            style={{ fontSize: 11, color: 'var(--accent-purple)' }}
                            title={agent.agent_id}
                          >
                            {agent.agent_id?.slice(0, 16)}...
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(agent.agent_id, agent.agent_id); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                              color: copiedId === agent.agent_id ? 'var(--accent-green)' : 'var(--text-muted)'
                            }}
                            title="Copy Agent ID"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {agent.agent_name || <span style={{ color: 'var(--text-muted)' }}>Unnamed</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                          <span>{agent.total_runs}</span>
                          <span style={{ color: 'var(--accent-green)' }}>{agent.completed_runs}ok</span>
                          {agent.error_runs > 0 && (
                            <span style={{ color: 'var(--accent-red)' }}>{agent.error_runs}err</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatTime(agent.last_run)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Agent Details */}
        {selectedAgent && (
          <div>
            {/* Agent Header */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>
                {selectedAgent.agent_name || 'Unnamed Agent'}
              </h2>

              {/* Agent ID Box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                padding: '10px 14px',
                background: 'var(--bg-hover)',
                borderRadius: 6,
                fontSize: 13
              }}>
                <Hash size={14} style={{ color: 'var(--accent-purple)' }} />
                <code style={{ color: 'var(--accent-purple)', flex: 1, fontSize: 12 }}>{selectedAgent.agent_id}</code>
                <button
                  onClick={() => copyToClipboard(selectedAgent.agent_id, 'selected')}
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  <Copy size={12} />
                  {copiedId === 'selected' ? ' Copied!' : ' Copy'}
                </button>
              </div>

              {/* Stats */}
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
                  <div className="stat-label">LLM Calls</div>
                  <div className="stat-value">{agentStats?.total_llm_calls || 0}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 0 }}>
              <div
                className={`tab ${activeTab === 'runs' ? 'active' : ''}`}
                onClick={() => setActiveTab('runs')}
              >
                <Play size={14} /> Runs ({agentRuns.length})
              </div>
              <div
                className={`tab ${activeTab === 'llm-calls' ? 'active' : ''}`}
                onClick={() => setActiveTab('llm-calls')}
              >
                <MessageSquare size={14} /> LLM Calls ({agentLLMCalls.length})
              </div>
            </div>

            {/* Runs Tab */}
            {activeTab === 'runs' && (
              <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <h3 className="card-title">Agent Runs</h3>
                  <Link
                    to={`/runs?agent_id=${selectedAgent.agent_id}`}
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                  >
                    View all <ArrowRight size={14} />
                  </Link>
                </div>

                {agentRuns.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <Play />
                    <h3>No runs yet</h3>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Run ID</th>
                          <th>Objective</th>
                          <th>Status</th>
                          <th>Iterations</th>
                          <th>Duration</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentRuns.map(run => (
                          <tr key={run.run_id} className="clickable-row">
                            <td>
                              <Link
                                to={`/runs/${run.run_id}`}
                                className="mono"
                                style={{ fontSize: 11, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}
                                title={run.run_id}
                              >
                                <ExternalLink size={10} />
                                {run.run_id?.slice(0, 8)}...
                              </Link>
                            </td>
                            <td>
                              <div className="truncate" style={{ maxWidth: 180, fontSize: 12 }} title={run.objective}>
                                {run.objective || '-'}
                              </div>
                            </td>
                            <td>
                              {run.status === 'completed' ? (
                                <span className="badge badge-success" style={{ fontSize: 10 }}><CheckCircle size={10} /></span>
                              ) : run.status === 'error' ? (
                                <span className="badge badge-error" style={{ fontSize: 10 }}><AlertCircle size={10} /></span>
                              ) : (
                                <span className="badge badge-warning" style={{ fontSize: 10 }}><Clock size={10} /></span>
                              )}
                            </td>
                            <td style={{ fontSize: 12 }}>{run.total_iterations || 0}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {formatDuration(run.started_at, run.finished_at)}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {formatTime(run.started_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* LLM Calls Tab */}
            {activeTab === 'llm-calls' && (
              <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <h3 className="card-title">LLM Calls</h3>
                  <Link
                    to={`/llm-calls?agent_id=${selectedAgent.agent_id}`}
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                  >
                    View all <ArrowRight size={14} />
                  </Link>
                </div>

                {agentLLMCalls.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <MessageSquare />
                    <h3>No LLM calls yet</h3>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Run ID</th>
                          <th>Provider</th>
                          <th>Model</th>
                          <th>Tokens</th>
                          <th>Latency</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentLLMCalls.map(call => (
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
                              <span className="badge badge-info" style={{ fontSize: 10 }}>{call.provider}</span>
                            </td>
                            <td>
                              <Link to={`/llm-calls/${call.id}`} className="mono" style={{ fontSize: 11 }}>
                                {call.model}
                              </Link>
                            </td>
                            <td style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--accent-blue)' }}>{(call.input_tokens || 0).toLocaleString()}</span>
                              <span style={{ color: 'var(--text-muted)' }}>/</span>
                              <span style={{ color: 'var(--accent-green)' }}>{(call.output_tokens || 0).toLocaleString()}</span>
                            </td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                <Zap size={10} style={{ color: 'var(--accent-orange)' }} />
                                {(call.latency_ms || 0).toLocaleString()}ms
                              </span>
                            </td>
                            <td>
                              {call.status === 'success' ? (
                                <span className="badge badge-success" style={{ fontSize: 10 }}><CheckCircle size={10} /></span>
                              ) : (
                                <span className="badge badge-error" style={{ fontSize: 10 }}><AlertCircle size={10} /></span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* LLM Usage Stats */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Token Usage</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Avg Iterations</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {agentStats?.avg_iterations?.toFixed(1) || 0}
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
