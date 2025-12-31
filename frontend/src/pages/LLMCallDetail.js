import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, CheckCircle, AlertCircle, Clock, Copy, Check,
  MessageSquare, Zap, FileText
} from 'lucide-react';

function LLMCallDetail() {
  const { callId } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  useEffect(() => {
    fetch(`/api/llm-calls/${callId}`)
      .then(r => r.json())
      .then(data => {
        setCall(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [callId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss.SSS');
    } catch {
      return timestamp;
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'prompt') {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      } else {
        setCopiedResponse(true);
        setTimeout(() => setCopiedResponse(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading LLM call details...</div>;
  }

  if (!call || call.error) {
    return (
      <div className="empty-state">
        <AlertCircle />
        <h3>LLM call not found</h3>
        <p>{call?.error || 'The requested LLM call could not be found'}</p>
        <Link to="/llm-calls" className="btn btn-secondary" style={{ marginTop: 16 }}>
          <ArrowLeft size={16} /> Back to LLM Calls
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/llm-calls" className="btn btn-ghost" style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} /> Back to LLM Calls
        </Link>
      </div>

      <div className="detail-header">
        <div>
          <h1 className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageSquare size={24} />
            LLM Call Details
          </h1>
          <div className="detail-meta">
            <div className="detail-meta-item">
              <span className="badge badge-info">{call.provider}</span>
            </div>
            <div className="detail-meta-item">
              <span className="mono">{call.model}</span>
            </div>
            <div className="detail-meta-item">
              {call.status === 'success' ? (
                <span className="badge badge-success"><CheckCircle size={12} /> Success</span>
              ) : (
                <span className="badge badge-error"><AlertCircle size={12} /> Error</span>
              )}
            </div>
            <div className="detail-meta-item">
              <Clock size={14} />
              {formatTime(call.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Input Tokens</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            {(call.input_tokens || 0).toLocaleString()}
          </div>
          <div className="stat-subtext">Prompt length: {(call.prompt_length || 0).toLocaleString()} chars</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Output Tokens</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {(call.output_tokens || 0).toLocaleString()}
          </div>
          <div className="stat-subtext">Response length: {(call.response_length || 0).toLocaleString()} chars</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tokens</div>
          <div className="stat-value">
            {((call.input_tokens || 0) + (call.output_tokens || 0)).toLocaleString()}
          </div>
          <div className="stat-subtext">Input + Output</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latency</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={20} style={{ color: 'var(--accent-orange)' }} />
            {(call.latency_ms || 0).toLocaleString()}ms
          </div>
          <div className="stat-subtext">{((call.latency_ms || 0) / 1000).toFixed(2)}s</div>
        </div>
      </div>

      {/* Run Link */}
      {call.run_id && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="card-title" style={{ marginBottom: 4 }}>Associated Run</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {call.run_id}
              </div>
            </div>
            <Link to={`/runs/${call.run_id}`} className="btn btn-secondary">
              View Run
            </Link>
          </div>
        </div>
      )}

      {/* Prompt & Response */}
      <div className="prompt-response-container">
        {/* Prompt Section */}
        <div className="prompt-section">
          <div className="section-header">
            <div className="section-title">
              <FileText size={16} />
              Prompt
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: 12 }}
              onClick={() => copyToClipboard(call.prompt || '', 'prompt')}
            >
              {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
              {copiedPrompt ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="section-content">
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1.6
            }}>
              {call.prompt || 'No prompt available'}
            </pre>
          </div>
        </div>

        {/* Response Section */}
        <div className="response-section">
          <div className="section-header">
            <div className="section-title">
              <MessageSquare size={16} />
              Response
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: 12 }}
              onClick={() => copyToClipboard(call.response_content || '', 'response')}
            >
              {copiedResponse ? <Check size={14} /> : <Copy size={14} />}
              {copiedResponse ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="section-content">
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1.6
            }}>
              {call.response_content || 'No response available'}
            </pre>
          </div>
        </div>
      </div>

      {/* Input Parameters */}
      {call.input_params && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Input Parameters</div>
          <div className="code-block">
            <pre>{typeof call.input_params === 'string' ? call.input_params : JSON.stringify(call.input_params, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Usage Metrics */}
      {call.usage_metrics && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Usage Metrics</div>
          <div className="code-block">
            <pre>{typeof call.usage_metrics === 'string' ? call.usage_metrics : JSON.stringify(call.usage_metrics, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Error Message */}
      {call.status === 'error' && call.error_message && (
        <div className="card" style={{ marginTop: 20, borderColor: 'var(--accent-red)' }}>
          <div className="card-title" style={{ marginBottom: 12, color: 'var(--accent-red)' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} />
            Error Message
          </div>
          <div className="code-block" style={{ borderColor: 'var(--accent-red)' }}>
            <pre style={{ color: 'var(--accent-red)' }}>{call.error_message}</pre>
          </div>
        </div>
      )}
    </>
  );
}

export default LLMCallDetail;
