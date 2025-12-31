import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, MessageSquare, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

function LLMCallsList() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [filter, setFilter] = useState({ provider: '', model: '', status: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/llm-calls/models')
      .then(r => r.json())
      .then(data => setModels(data.models || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.provider) params.set('provider', filter.provider);
    if (filter.model) params.set('model', filter.model);
    if (filter.status) params.set('status', filter.status);
    params.set('limit', '100');

    fetch(`/api/llm-calls?${params}`)
      .then(r => r.json())
      .then(data => {
        setCalls(data.llm_calls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const uniqueProviders = [...new Set(models.map(m => m.provider))];

  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (call.prompt_preview || '').toLowerCase().includes(q) ||
      (call.response_preview || '').toLowerCase().includes(q) ||
      (call.model || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="page-header">
        <h1>LLM Calls</h1>
        <p>Browse all LLM API calls with full prompt and response details</p>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-input">
          <Search />
          <input
            type="text"
            className="input"
            placeholder="Search prompts and responses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

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
      </div>

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
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatTime(call.created_at)}
                    </td>
                    <td>
                      <span className="badge badge-info">{call.provider}</span>
                    </td>
                    <td>
                      <Link to={`/llm-calls/${call.id}`} className="mono" style={{ fontSize: 13 }}>
                        {call.model}
                      </Link>
                    </td>
                    <td>
                      <div className="truncate" style={{ maxWidth: 300, fontSize: 13 }} title={call.prompt_preview}>
                        {call.prompt_preview || '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--accent-blue)' }}>{(call.input_tokens || 0).toLocaleString()}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: 'var(--accent-green)' }}>{(call.output_tokens || 0).toLocaleString()}</span>
                      </div>
                      <div className="token-bar" style={{ marginTop: 4 }}>
                        <div className="token-bar-visual">
                          <div
                            className="token-bar-fill"
                            style={{
                              width: `${Math.min(100, (call.input_tokens || 0) / 40)}%`,
                              background: 'var(--accent-blue)'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <Zap size={14} style={{ color: 'var(--accent-orange)' }} />
                        {(call.latency_ms || 0).toLocaleString()}ms
                      </span>
                    </td>
                    <td>
                      {call.status === 'success' ? (
                        <span className="badge badge-success"><CheckCircle size={12} /> Success</span>
                      ) : (
                        <span className="badge badge-error"><AlertCircle size={12} /> Error</span>
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
