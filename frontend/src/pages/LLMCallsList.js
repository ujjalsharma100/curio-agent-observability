import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, MessageSquare, CheckCircle, AlertCircle, Zap, Hash, ExternalLink, Copy, User } from 'lucide-react';

function LLMCallsList() {
  const [searchParams] = useSearchParams();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [agents, setAgents] = useState([]);
  const [filter, setFilter] = useState({
    provider: '',
    model: '',
    status: '',
    agent_id: searchParams.get('agent_id') || ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [runIdFilter, setRunIdFilter] = useState(searchParams.get('run_id') || '');
  const [agentIdFilter, setAgentIdFilter] = useState(searchParams.get('agent_id') || '');
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/llm-calls/models').then(r => r.json()),
      fetch('/api/agents').then(r => r.json())
    ]).then(([modelsData, agentsData]) => {
      setModels(modelsData.models || []);
      setAgents(agentsData.agents || []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.provider) params.set('provider', filter.provider);
    if (filter.model) params.set('model', filter.model);
    if (filter.status) params.set('status', filter.status);
    if (filter.agent_id) params.set('agent_id', filter.agent_id);
    if (runIdFilter) params.set('run_id', runIdFilter);
    params.set('limit', '100');

    fetch(`/api/llm-calls?${params}`)
      .then(r => r.json())
      .then(data => {
        setCalls(data.llm_calls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter, runIdFilter]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const uniqueProviders = [...new Set(models.map(m => m.provider))];

  // Get agent name from agent_id
  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.agent_id === agentId);
    return agent?.agent_name || null;
  };

  const filteredCalls = calls.filter(call => {
    // Agent ID text filter
    if (agentIdFilter && !(call.agent_id || '').toLowerCase().includes(agentIdFilter.toLowerCase())) {
      return false;
    }
    // Search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (call.prompt_preview || '').toLowerCase().includes(q) ||
      (call.response_preview || '').toLowerCase().includes(q) ||
      (call.model || '').toLowerCase().includes(q) ||
      (call.agent_id || '').toLowerCase().includes(q)
    );
  });

  const hasFilters = searchQuery || runIdFilter || agentIdFilter || filter.provider || filter.model || filter.status || filter.agent_id;

  // Calculate metrics from filtered calls
  const metrics = React.useMemo(() => {
    if (filteredCalls.length === 0) {
      return {
        total: 0,
        success: 0,
        error: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalLatency: 0,
        avgLatency: 0,
        uniqueModels: 0,
        uniqueProviders: 0,
        uniqueAgents: 0,
        uniqueRuns: 0,
      };
    }

    const success = filteredCalls.filter(c => c.status === 'success').length;
    const error = filteredCalls.filter(c => c.status === 'error').length;

    const totalInputTokens = filteredCalls.reduce((sum, c) => sum + (c.input_tokens || 0), 0);
    const totalOutputTokens = filteredCalls.reduce((sum, c) => sum + (c.output_tokens || 0), 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalLatency = filteredCalls.reduce((sum, c) => sum + (c.latency_ms || 0), 0);
    const avgLatency = totalLatency / filteredCalls.length;

    const uniqueModels = new Set(filteredCalls.map(c => `${c.provider}:${c.model}`)).size;
    const uniqueProviders = new Set(filteredCalls.map(c => c.provider)).size;
    const uniqueAgents = new Set(filteredCalls.filter(c => c.agent_id).map(c => c.agent_id)).size;
    const uniqueRuns = new Set(filteredCalls.filter(c => c.run_id).map(c => c.run_id)).size;

    return {
      total: filteredCalls.length,
      success,
      error,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalLatency,
      avgLatency,
      uniqueModels,
      uniqueProviders,
      uniqueAgents,
      uniqueRuns,
    };
  }, [filteredCalls]);

  return (
    <>
      <div className="page-header">
        <h1>LLM Calls</h1>
        <p>Browse all LLM API calls with full prompt and response details</p>
      </div>

      {/* Filters */}
      <div className="filters" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="search-input" style={{ maxWidth: 200 }}>
          <Search size={16} />
          <input
            type="text"
            className="input"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>

        <div className="search-input" style={{ maxWidth: 160 }}>
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

        <div className="search-input" style={{ maxWidth: 160 }}>
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

        <select
          className="filter-select"
          value={filter.agent_id}
          onChange={e => { setFilter({ ...filter, agent_id: e.target.value }); setAgentIdFilter(''); }}
        >
          <option value="">All Agents</option>
          {agents.map(agent => (
            <option key={agent.agent_id} value={agent.agent_id}>
              {agent.agent_name ? `${agent.agent_name} (${agent.agent_id.slice(0, 12)}...)` : agent.agent_id}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filter.provider}
          onChange={e => setFilter({ ...filter, provider: e.target.value, model: '' })}
        >
          <option value="">All Providers</option>
          {uniqueProviders.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filter.model}
          onChange={e => setFilter({ ...filter, model: e.target.value })}
        >
          <option value="">All Models</option>
          {models
            .filter(m => !filter.provider || m.provider === filter.provider)
            .map(m => (
              <option key={`${m.provider}:${m.model}`} value={m.model}>{m.model}</option>
            ))}
        </select>

        <select
          className="filter-select"
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>

        {hasFilters && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSearchQuery('');
              setRunIdFilter('');
              setAgentIdFilter('');
              setFilter({ provider: '', model: '', status: '', agent_id: '' });
            }}
            style={{ fontSize: 12 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Metrics Overview */}
      {!loading && filteredCalls.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Calls</div>
            <div className="stat-value">{metrics.total.toLocaleString()}</div>
            <div className="stat-subtext">
              <span style={{ color: 'var(--accent-green)' }}>{metrics.success} success</span>
              {metrics.error > 0 && (
                <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>{metrics.error} errors</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Tokens</div>
            <div className="stat-value">{metrics.totalTokens.toLocaleString()}</div>
            <div className="stat-subtext">
              <span style={{ color: 'var(--accent-blue)' }}>
                {metrics.totalInputTokens.toLocaleString()} in
              </span>
              <span style={{ color: 'var(--text-muted)' }}> / </span>
              <span style={{ color: 'var(--accent-green)' }}>
                {metrics.totalOutputTokens.toLocaleString()} out
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Avg Latency</div>
            <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>
              {metrics.avgLatency > 0 ? (
                metrics.avgLatency < 1000 ? (
                  `${Math.round(metrics.avgLatency)}ms`
                ) : (
                  `${(metrics.avgLatency / 1000).toFixed(1)}s`
                )
              ) : (
                '-'
              )}
            </div>
            <div className="stat-subtext">
              {metrics.totalLatency > 0 && (
                <span>Total: {metrics.totalLatency < 1000 ? `${Math.round(metrics.totalLatency)}ms` : `${(metrics.totalLatency / 1000).toFixed(1)}s`}</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Unique Models</div>
            <div className="stat-value">{metrics.uniqueModels}</div>
            <div className="stat-subtext">
              {metrics.uniqueProviders > 0 && (
                <span>{metrics.uniqueProviders} providers</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Unique Agents</div>
            <div className="stat-value">{metrics.uniqueAgents}</div>
            <div className="stat-subtext">
              {metrics.uniqueRuns > 0 && (
                <span>{metrics.uniqueRuns} runs</span>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Avg Tokens/Call</div>
            <div className="stat-value">
              {metrics.total > 0 ? Math.round(metrics.totalTokens / metrics.total).toLocaleString() : 0}
            </div>
            <div className="stat-subtext">
              <span style={{ color: 'var(--accent-blue)' }}>
                {metrics.total > 0 ? Math.round(metrics.totalInputTokens / metrics.total).toLocaleString() : 0} in
              </span>
              <span style={{ color: 'var(--text-muted)' }}> / </span>
              <span style={{ color: 'var(--accent-green)' }}>
                {metrics.total > 0 ? Math.round(metrics.totalOutputTokens / metrics.total).toLocaleString() : 0} out
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Calls Table */}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div>Loading LLM calls...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="empty-state">
            <MessageSquare />
            <h3>No LLM calls found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Run ID</th>
                  <th>Agent ID</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Prompt Preview</th>
                  <th>Tokens</th>
                  <th>Latency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map(call => (
                  <tr key={call.id} className="clickable-row">
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatTime(call.created_at)}
                    </td>
                    <td>
                      {call.run_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Link
                            to={`/runs/${call.run_id}`}
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: 'var(--accent-blue)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title={`View run: ${call.run_id}`}
                          >
                            <ExternalLink size={10} />
                            {call.run_id?.slice(0, 8)}...
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(call.run_id, `run-${call.id}`); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                              color: copiedId === `run-${call.id}` ? 'var(--accent-green)' : 'var(--text-muted)'
                            }}
                            title="Copy Run ID"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {call.agent_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Link
                            to={`/agents?agent_id=${call.agent_id}`}
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: 'var(--accent-purple)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title={`View agent: ${call.agent_id}\n${getAgentName(call.agent_id) || ''}`}
                          >
                            {call.agent_id?.slice(0, 10)}...
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(call.agent_id, `agent-${call.id}`); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                              color: copiedId === `agent-${call.id}` ? 'var(--accent-green)' : 'var(--text-muted)'
                            }}
                            title="Copy Agent ID"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>{call.provider}</span>
                    </td>
                    <td>
                      <Link to={`/llm-calls/${call.id}`} className="mono" style={{ fontSize: 12 }}>
                        {call.model}
                      </Link>
                    </td>
                    <td>
                      <div className="truncate" style={{ maxWidth: 180, fontSize: 12 }} title={call.prompt_preview}>
                        {call.prompt_preview || '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 11 }}>
                        <span style={{ color: 'var(--accent-blue)' }}>{(call.input_tokens || 0).toLocaleString()}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: 'var(--accent-green)' }}>{(call.output_tokens || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Zap size={12} style={{ color: 'var(--accent-orange)' }} />
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
    </>
  );
}

export default LLMCallsList;
