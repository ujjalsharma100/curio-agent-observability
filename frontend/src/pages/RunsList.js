import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, CheckCircle, AlertCircle, Clock, Play, MessageSquare, Repeat } from 'lucide-react';

function RunsList() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', agent_id: '' });
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (run.objective || '').toLowerCase().includes(q) ||
      (run.agent_name || '').toLowerCase().includes(q) ||
      (run.run_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="page-header">
        <h1>Agent Runs</h1>
        <p>Browse and analyze all agent execution runs</p>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-input">
          <Search />
          <input
            type="text"
            className="input"
            placeholder="Search runs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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
          onChange={e => setFilter({ ...filter, agent_id: e.target.value })}
        >
          <option value="">All Agents</option>
          {agents.map(agent => (
            <option key={agent.agent_id} value={agent.agent_id}>
              {agent.agent_name || agent.agent_id}
            </option>
          ))}
        </select>
      </div>

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
                  <th>Agent</th>
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
                      <Link to={`/runs/${run.run_id}`} style={{ fontWeight: 500 }}>
                        {run.agent_name || 'Unknown'}
                      </Link>
                    </td>
                    <td>
                      <div className="truncate" style={{ maxWidth: 250 }} title={run.objective}>
                        {run.objective || '-'}
                      </div>
                    </td>
                    <td>
                      {run.status === 'completed' ? (
                        <span className="badge badge-success"><CheckCircle size={12} /> Completed</span>
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
                    <td className="mono" style={{ fontSize: 13 }}>
                      {(run.total_tokens || 0).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {formatDuration(run.started_at, run.finished_at)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
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
