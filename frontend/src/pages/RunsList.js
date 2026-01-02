import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, CheckCircle, AlertCircle, Clock, Play, MessageSquare, Repeat, Hash, Copy, ExternalLink, User } from 'lucide-react';

function RunsList() {
  const [searchParams] = useSearchParams();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    agent_id: searchParams.get('agent_id') || ''
  });
  const [agents, setAgents] = useState([]);
  const [runIdFilter, setRunIdFilter] = useState('');
  const [agentIdFilter, setAgentIdFilter] = useState(searchParams.get('agent_id') || '');
  const [agentNameFilter, setAgentNameFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => setAgents(data.agents || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.agent_id) params.set('agent_id', filter.agent_id);
    params.set('limit', '100');

    fetch(`/api/runs?${params}`)
      .then(r => r.json())
      .then(data => {
        setRuns(data.runs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss');
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

  const filteredRuns = runs.filter(run => {
    // Run ID filter
    if (runIdFilter && !(run.run_id || '').toLowerCase().includes(runIdFilter.toLowerCase())) {
      return false;
    }
    // Agent ID filter
    if (agentIdFilter && !(run.agent_id || '').toLowerCase().includes(agentIdFilter.toLowerCase())) {
      return false;
    }
    // Agent Name filter
    if (agentNameFilter && !(run.agent_name || '').toLowerCase().includes(agentNameFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate metrics from filtered runs
  const metrics = React.useMemo(() => {
    if (filteredRuns.length === 0) {
      return {
        total: 0,
        completed: 0,
        error: 0,
        running: 0,
        pending: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalLLMCalls: 0,
        totalIterations: 0,
        avgIterations: 0,
        totalDuration: 0,
        avgDuration: 0,
        uniqueAgents: 0,
      };
    }

    const completed = filteredRuns.filter(r => r.status === 'completed').length;
    const error = filteredRuns.filter(r => r.status === 'error').length;
    const running = filteredRuns.filter(r => r.status === 'running').length;
    const pending = filteredRuns.filter(r => r.status === 'pending').length;

    const totalTokens = filteredRuns.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
    const totalLLMCalls = filteredRuns.reduce((sum, r) => sum + (r.llm_call_count || 0), 0);
    const totalIterations = filteredRuns.reduce((sum, r) => sum + (r.total_iterations || 0), 0);
    const avgIterations = totalIterations / filteredRuns.length;

    // Calculate duration
    let totalDurationMs = 0;
    let durationCount = 0;
    filteredRuns.forEach(run => {
      if (run.started_at && run.finished_at) {
        try {
          const ms = new Date(run.finished_at) - new Date(run.started_at);
          if (ms > 0) {
            totalDurationMs += ms;
            durationCount++;
          }
        } catch {}
      }
    });
    const avgDuration = durationCount > 0 ? totalDurationMs / durationCount : 0;

    const uniqueAgents = new Set(filteredRuns.map(r => r.agent_id)).size;

    // Get token breakdown from runs that have it (may not be available in list view)
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let hasTokenBreakdown = false;
    filteredRuns.forEach(run => {
      if (run.total_input_tokens !== undefined) {
        totalInputTokens += run.total_input_tokens;
        hasTokenBreakdown = true;
      }
      if (run.total_output_tokens !== undefined) {
        totalOutputTokens += run.total_output_tokens;
        hasTokenBreakdown = true;
      }
    });

    return {
      total: filteredRuns.length,
      completed,
      error,
      running,
      pending,
      totalTokens,
      totalInputTokens: hasTokenBreakdown ? totalInputTokens : null,
      totalOutputTokens: hasTokenBreakdown ? totalOutputTokens : null,
      totalLLMCalls,
      totalIterations,
      avgIterations,
      totalDuration: totalDurationMs,
      avgDuration,
      uniqueAgents,
    };
  }, [filteredRuns]);

  return (
    <>
      <div className="page-header">
        <h1>Agent Runs</h1>
        <p>Browse and analyze all agent execution runs</p>
      </div>

      {/* Filters */}
      <div className="filters" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="search-input" style={{ maxWidth: 180 }}>
          <Hash size={16} />
          <input
            type="text"
            className="input"
            placeholder="Filter Run ID..."
            value={runIdFilter}
            onChange={e => setRunIdFilter(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <div className="search-input" style={{ maxWidth: 180 }}>
          <Hash size={16} />
          <input
            type="text"
            className="input"
            placeholder="Filter Agent ID..."
            value={agentIdFilter}
            onChange={e => { setAgentIdFilter(e.target.value); setFilter({ ...filter, agent_id: '' }); }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <div className="search-input" style={{ maxWidth: 180 }}>
          <User size={16} />
          <input
            type="text"
            className="input"
            placeholder="Filter Agent Name..."
            value={agentNameFilter}
            onChange={e => setAgentNameFilter(e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>

        <select
          className="filter-select"
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
        </select>

        <select
          className="filter-select"
          value={filter.agent_id}
          onChange={e => { setFilter({ ...filter, agent_id: e.target.value }); setAgentIdFilter(''); }}
        >
          <option value="">All Agents (Dropdown)</option>
          {agents.map(agent => (
            <option key={agent.agent_id} value={agent.agent_id}>
              {agent.agent_name ? `${agent.agent_name} (${agent.agent_id.slice(0, 12)}...)` : agent.agent_id}
            </option>
          ))}
        </select>

        {(runIdFilter || agentIdFilter || agentNameFilter || filter.status || filter.agent_id) && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setRunIdFilter('');
              setAgentIdFilter('');
              setAgentNameFilter('');
              setFilter({ status: '', agent_id: '' });
            }}
            style={{ fontSize: 12 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Metrics Overview */}
      {!loading && filteredRuns.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Runs</div>
            <div className="stat-value">{metrics.total.toLocaleString()}</div>
            <div className="stat-subtext">
              <span style={{ color: 'var(--accent-green)' }}>{metrics.completed} completed</span>
              {metrics.error > 0 && (
                <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>{metrics.error} errors</span>
              )}
              {metrics.running > 0 && (
                <span style={{ color: 'var(--accent-orange)', marginLeft: 8 }}>{metrics.running} running</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Tokens</div>
            <div className="stat-value">{metrics.totalTokens.toLocaleString()}</div>
            <div className="stat-subtext">
              {metrics.totalInputTokens !== null && metrics.totalInputTokens > 0 ? (
                <>
                  <span style={{ color: 'var(--accent-blue)' }}>
                    {metrics.totalInputTokens.toLocaleString()} in
                  </span>
                  {metrics.totalOutputTokens > 0 && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}> / </span>
                      <span style={{ color: 'var(--accent-green)' }}>
                        {metrics.totalOutputTokens.toLocaleString()} out
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span>Across all runs</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">LLM Calls</div>
            <div className="stat-value">{metrics.totalLLMCalls.toLocaleString()}</div>
            <div className="stat-subtext">
              {metrics.total > 0 && (
                <span>{(metrics.totalLLMCalls / metrics.total).toFixed(1)} avg per run</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Iterations</div>
            <div className="stat-value">{metrics.totalIterations.toLocaleString()}</div>
            <div className="stat-subtext">
              {metrics.avgIterations > 0 && (
                <span>{metrics.avgIterations.toFixed(1)} avg per run</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Unique Agents</div>
            <div className="stat-value">{metrics.uniqueAgents}</div>
            <div className="stat-subtext">Active agents</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Avg Duration</div>
            <div className="stat-value">
              {metrics.avgDuration > 0 ? (
                metrics.avgDuration < 1000 ? (
                  `${Math.round(metrics.avgDuration)}ms`
                ) : metrics.avgDuration < 60000 ? (
                  `${(metrics.avgDuration / 1000).toFixed(1)}s`
                ) : (
                  `${(metrics.avgDuration / 60000).toFixed(1)}m`
                )
              ) : (
                '-'
              )}
            </div>
            <div className="stat-subtext">Per run</div>
          </div>
        </div>
      )}

      {/* Runs Table */}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div>Loading runs...</div>
        ) : filteredRuns.length === 0 ? (
          <div className="empty-state">
            <Play />
            <h3>No runs found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Agent ID</th>
                  <th>Agent Name</th>
                  <th>Objective</th>
                  <th>Status</th>
                  <th>Iterations</th>
                  <th>LLM Calls</th>
                  <th>Tokens</th>
                  <th>Duration</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map(run => (
                  <tr key={run.run_id} className="clickable-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link
                          to={`/runs/${run.run_id}`}
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: 'var(--accent-blue)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={`View run: ${run.run_id}`}
                        >
                          <ExternalLink size={10} />
                          {run.run_id?.slice(0, 8)}...
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(run.run_id, run.run_id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                            color: copiedId === run.run_id ? 'var(--accent-green)' : 'var(--text-muted)'
                          }}
                          title="Copy Run ID"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link
                          to={`/agents?agent_id=${run.agent_id}`}
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: 'var(--accent-purple)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={`View agent: ${run.agent_id}`}
                        >
                          {run.agent_id?.slice(0, 12)}...
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(run.agent_id, `agent-${run.run_id}`); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                            color: copiedId === `agent-${run.run_id}` ? 'var(--accent-green)' : 'var(--text-muted)'
                          }}
                          title="Copy Agent ID"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/agents?agent_id=${run.agent_id}`}
                        style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}
                      >
                        {run.agent_name || 'Unknown'}
                      </Link>
                    </td>
                    <td>
                      <div className="truncate" style={{ maxWidth: 180 }} title={run.objective}>
                        {run.objective || '-'}
                      </div>
                    </td>
                    <td>
                      {run.status === 'completed' ? (
                        <span className="badge badge-success"><CheckCircle size={12} /> Done</span>
                      ) : run.status === 'error' ? (
                        <span className="badge badge-error"><AlertCircle size={12} /> Error</span>
                      ) : run.status === 'running' ? (
                        <span className="badge badge-warning"><Clock size={12} /> Running</span>
                      ) : (
                        <span className="badge badge-info">{run.status}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Repeat size={14} style={{ opacity: 0.5 }} />
                        {run.total_iterations || 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MessageSquare size={14} style={{ opacity: 0.5 }} />
                        {run.llm_call_count || 0}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {(run.total_tokens || 0).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {formatDuration(run.started_at, run.finished_at)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {formatTime(run.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default RunsList;
