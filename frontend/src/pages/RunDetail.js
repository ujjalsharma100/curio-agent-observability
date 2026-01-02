import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, CheckCircle, AlertCircle, Clock, Play, MessageSquare,
  Repeat, ChevronDown, ChevronRight, Zap, FileText, Code, Hash, Copy
} from 'lucide-react';
import JsonViewer from '../components/JsonViewer';

function RunDetail() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [expandedEvents, setExpandedEvents] = useState({});
  const [selectedLLMCall, setSelectedLLMCall] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/runs/${runId}`).then(r => r.json()),
      fetch(`/api/runs/${runId}/timeline`).then(r => r.json())
    ])
      .then(([runData, timelineData]) => {
        setRun(runData);
        setTimeline(timelineData.timeline || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [runId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'HH:mm:ss.SSS');
    } catch {
      return timestamp;
    }
  };

  const formatFullTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const toggleEvent = (idx) => {
    setExpandedEvents(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getEventIcon = (eventType) => {
    if (eventType?.includes('started')) return <Play size={14} />;
    if (eventType?.includes('completed')) return <CheckCircle size={14} />;
    if (eventType?.includes('error')) return <AlertCircle size={14} />;
    return <Zap size={14} />;
  };

  const getEventColor = (eventType) => {
    if (eventType?.includes('error')) return 'var(--accent-red)';
    if (eventType?.includes('completed')) return 'var(--accent-green)';
    if (eventType?.includes('started')) return 'var(--accent-blue)';
    return 'var(--accent-purple)';
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading run details...</div>;
  }

  if (!run || run.error) {
    return (
      <div className="empty-state">
        <AlertCircle />
        <h3>Run not found</h3>
        <p>{run?.error || 'The requested run could not be found'}</p>
        <Link to="/runs" className="btn btn-secondary" style={{ marginTop: 16 }}>
          <ArrowLeft size={16} /> Back to Runs
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/runs" className="btn btn-ghost" style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} /> Back to Runs
        </Link>
      </div>

      <div className="detail-header">
        <div style={{ width: '100%' }}>
          <h1 className="detail-title">{run.agent_name || 'Agent Run'}</h1>

          {/* IDs Section */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            padding: '12px 16px',
            background: 'var(--bg-hover)',
            borderRadius: 8
          }}>
            {/* Run ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>RUN ID:</span>
              <code style={{ fontSize: 12, color: 'var(--accent-blue)' }}>{run.run_id}</code>
              <button
                onClick={() => copyToClipboard(run.run_id, 'run_id')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: copiedId === 'run_id' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
                title="Copy Run ID"
              >
                <Copy size={12} />
              </button>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-color)', height: 20 }} />

            {/* Agent ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AGENT ID:</span>
              <Link
                to={`/agents?agent_id=${run.agent_id}`}
                style={{ fontSize: 12, color: 'var(--accent-purple)', fontFamily: 'monospace' }}
                title="View agent details"
              >
                {run.agent_id}
              </Link>
              <button
                onClick={() => copyToClipboard(run.agent_id, 'agent_id')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: copiedId === 'agent_id' ? 'var(--accent-green)' : 'var(--text-muted)'
                }}
                title="Copy Agent ID"
              >
                <Copy size={12} />
              </button>
              <Link
                to={`/runs?agent_id=${run.agent_id}`}
                className="btn btn-ghost"
                style={{ padding: '2px 8px', fontSize: 10 }}
              >
                All runs
              </Link>
              <Link
                to={`/llm-calls?agent_id=${run.agent_id}`}
                className="btn btn-ghost"
                style={{ padding: '2px 8px', fontSize: 10 }}
              >
                All LLM calls
              </Link>
            </div>
          </div>

          <div className="detail-meta">
            <div className="detail-meta-item">
              {run.status === 'completed' ? (
                <span className="badge badge-success"><CheckCircle size={12} /> Completed</span>
              ) : run.status === 'error' ? (
                <span className="badge badge-error"><AlertCircle size={12} /> Error</span>
              ) : (
                <span className="badge badge-warning"><Clock size={12} /> {run.status}</span>
              )}
            </div>
            <div className="detail-meta-item">
              <Repeat size={14} />
              {run.total_iterations || 0} iterations
            </div>
            <div className="detail-meta-item">
              <MessageSquare size={14} />
              {run.llm_call_count || 0} LLM calls
            </div>
            <div className="detail-meta-item">
              <Clock size={14} />
              {formatFullTime(run.started_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Objective */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Objective</div>
        <p style={{ color: 'var(--text-secondary)' }}>{run.objective || 'No objective specified'}</p>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Tokens</div>
          <div className="stat-value">{(run.total_tokens || 0).toLocaleString()}</div>
          <div className="stat-subtext">
            {(run.total_input_tokens || 0).toLocaleString()} in / {(run.total_output_tokens || 0).toLocaleString()} out
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Latency</div>
          <div className="stat-value">{((run.total_latency_ms || 0) / 1000).toFixed(1)}s</div>
          <div className="stat-subtext">LLM response time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Events</div>
          <div className="stat-value">{run.event_count || 0}</div>
          <div className="stat-subtext">Logged events</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
          Timeline
        </div>
        <div className={`tab ${activeTab === 'llm-calls' ? 'active' : ''}`} onClick={() => setActiveTab('llm-calls')}>
          LLM Calls ({run.llm_call_count || 0})
        </div>
        <div className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          Events ({run.event_count || 0})
        </div>
        <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          Execution History
        </div>
      </div>

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="card">
          <div className="timeline">
            {timeline.map((item, idx) => (
              <div
                key={idx}
                className={`timeline-item ${item.type}`}
                style={{ cursor: item.type === 'llm_call' ? 'pointer' : 'default' }}
                onClick={() => item.type === 'llm_call' && setSelectedLLMCall(item)}
              >
                <div className="timeline-time">{formatTime(item.timestamp)}</div>
                <div className="timeline-content">
                  {item.type === 'event' ? (
                    <div>
                      <span style={{ color: getEventColor(item.event_type), display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getEventIcon(item.event_type)}
                        <strong>{item.event_type?.replace(/_/g, ' ')}</strong>
                      </span>
                      {item.data && Object.keys(item.data).length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={(e) => { e.stopPropagation(); toggleEvent(idx); }}
                          >
                            {expandedEvents[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {expandedEvents[idx] ? 'Hide' : 'Show'} data
                          </button>
                          {expandedEvents[idx] && (
                            <div style={{ marginTop: 8 }}>
                              <JsonViewer
                                data={item.data}
                                maxHeight={300}
                                maxInitialDepth={3}
                                showExpandAll={false}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span className="badge badge-purple">LLM Call</span>
                      <span className="badge badge-info">{item.provider}</span>
                      <span className="mono" style={{ fontSize: 13 }}>{item.model}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {item.input_tokens}+{item.output_tokens} tokens
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {item.latency_ms}ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LLM Calls Tab */}
      {activeTab === 'llm-calls' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Input Tokens</th>
                  <th>Output Tokens</th>
                  <th>Latency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(run.llm_calls || []).map((call, idx) => (
                  <tr key={idx} className="clickable-row" onClick={() => window.location.href = `/llm-calls/${call.id}`}>
                    <td><span className="badge badge-info">{call.provider}</span></td>
                    <td className="mono">{call.model}</td>
                    <td>{(call.input_tokens || 0).toLocaleString()}</td>
                    <td>{(call.output_tokens || 0).toLocaleString()}</td>
                    <td>{(call.latency_ms || 0).toLocaleString()}ms</td>
                    <td>
                      {call.status === 'success' ? (
                        <span className="badge badge-success">Success</span>
                      ) : (
                        <span className="badge badge-error">Error</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event Type</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {(run.events || []).map((event, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatTime(event.timestamp)}
                    </td>
                    <td>
                      <span style={{ color: getEventColor(event.event_type) }}>
                        {event.event_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        onClick={() => toggleEvent(`event-${idx}`)}
                      >
                        {expandedEvents[`event-${idx}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        View data
                      </button>
                      {expandedEvents[`event-${idx}`] && (
                        <div style={{ marginTop: 8 }}>
                          <JsonViewer
                            data={event.data || {}}
                            maxHeight={250}
                            maxInitialDepth={3}
                            showExpandAll={false}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Execution History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <JsonViewer
            data={run.execution_history || []}
            title="Execution History"
            maxHeight={600}
            maxInitialDepth={3}
            showSearch={true}
          />
        </div>
      )}

      {/* LLM Call Modal */}
      {selectedLLMCall && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setSelectedLLMCall(null)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: 24
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>LLM Call Details</h3>
            <div style={{ marginBottom: 12 }}>
              <span className="badge badge-info" style={{ marginRight: 8 }}>{selectedLLMCall.provider}</span>
              <span className="mono">{selectedLLMCall.model}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>{selectedLLMCall.input_tokens} input tokens</span>
              <span>{selectedLLMCall.output_tokens} output tokens</span>
              <span>{selectedLLMCall.latency_ms}ms latency</span>
            </div>
            <Link
              to={`/llm-calls/${selectedLLMCall.id}`}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              View Full Details
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default RunDetail;
