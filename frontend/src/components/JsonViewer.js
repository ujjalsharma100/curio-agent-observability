import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Check, Maximize2, Minimize2, Search, X } from 'lucide-react';

// Enhanced syntax highlighting colors with better contrast
const colors = {
  key: '#79c0ff',      // Bright blue for keys
  string: '#a5d6ff',  // Light blue for strings
  number: '#79c0ff',   // Blue for numbers
  boolean: '#ff7b72',  // Red for booleans
  null: '#8b949e',     // Gray for null
  bracket: '#c9d1d9',   // Lighter gray for brackets
  punctuation: '#c9d1d9', // Lighter gray for punctuation
  lineNumber: '#6e7681', // Subtle gray for line numbers
};

// Render a single JSON value with syntax highlighting
function JsonValue({ value, depth = 0, defaultExpanded = true, maxInitialDepth = 2, searchTerm = '' }) {
  const [isExpanded, setIsExpanded] = useState(depth < maxInitialDepth ? defaultExpanded : false);

  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

  const toggleExpand = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Highlight search term
  const highlightText = (text) => {
    if (!searchTerm || typeof text !== 'string') return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} style={{ background: 'rgba(88, 166, 255, 0.3)', color: 'inherit', padding: '0 2px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  // Primitive values
  if (type === 'string') {
    // Check if it's a long string
    const isLong = value.length > 100;
    const displayValue = isLong && !isExpanded ? value.slice(0, 100) + '...' : value;
    return (
      <span>
        <span style={{ color: colors.string }}>"</span>
        <span style={{ color: colors.string }}>{highlightText(displayValue)}</span>
        <span style={{ color: colors.string }}>"</span>
        {isLong && (
          <button
            onClick={toggleExpand}
            style={{
              background: 'rgba(88, 166, 255, 0.1)',
              border: '1px solid rgba(88, 166, 255, 0.3)',
              borderRadius: 4,
              color: colors.punctuation,
              cursor: 'pointer',
              fontSize: 10,
              marginLeft: 6,
              padding: '2px 6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(88, 166, 255, 0.2)';
              e.target.style.color = colors.key;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(88, 166, 255, 0.1)';
              e.target.style.color = colors.punctuation;
            }}
          >
            {isExpanded ? 'less' : `+${value.length - 100} more`}
          </button>
        )}
      </span>
    );
  }

  if (type === 'number') {
    return <span style={{ color: colors.number }}>{value}</span>;
  }

  if (type === 'boolean') {
    return <span style={{ color: colors.boolean }}>{value ? 'true' : 'false'}</span>;
  }

  if (type === 'null') {
    return <span style={{ color: colors.null }}>null</span>;
  }

  // Arrays
  if (type === 'array') {
    if (value.length === 0) {
      return <span style={{ color: colors.bracket }}>[]</span>;
    }

    const preview = `Array(${value.length})`;

    return (
      <span>
        <span
          onClick={toggleExpand}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
        >
          {isExpanded ? (
            <ChevronDown size={12} style={{ color: colors.punctuation }} />
          ) : (
            <ChevronRight size={12} style={{ color: colors.punctuation }} />
          )}
          <span style={{ color: colors.bracket }}>[</span>
          {!isExpanded && (
            <span style={{ color: colors.punctuation, fontSize: 11, marginLeft: 4 }}>
              {preview}
            </span>
          )}
        </span>
        {isExpanded && (
          <>
            <div style={{ 
              marginLeft: 20, 
              borderLeft: '2px solid rgba(88, 166, 255, 0.2)', 
              paddingLeft: 12,
              marginTop: 4,
            }}>
              {value.map((item, index) => (
                <div key={index} style={{ 
                  marginTop: 6,
                  paddingLeft: 4,
                  position: 'relative',
                }}>
                  <span style={{ 
                    color: colors.lineNumber, 
                    fontSize: 11, 
                    marginRight: 10, 
                    opacity: 0.6,
                    fontFamily: 'monospace',
                    userSelect: 'none',
                  }}>
                    {index}:
                  </span>
                  <JsonValue 
                    value={item} 
                    depth={depth + 1} 
                    defaultExpanded={defaultExpanded} 
                    maxInitialDepth={maxInitialDepth}
                    searchTerm={searchTerm}
                  />
                  {index < value.length - 1 && <span style={{ color: colors.punctuation }}>,</span>}
                </div>
              ))}
            </div>
            <span style={{ color: colors.bracket }}>]</span>
          </>
        )}
        {!isExpanded && <span style={{ color: colors.bracket }}>]</span>}
      </span>
    );
  }

  // Objects
  if (type === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return <span style={{ color: colors.bracket }}>{'{}'}</span>;
    }

    const preview = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', ...' : '');

    return (
      <span>
        <span
          onClick={toggleExpand}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
        >
          {isExpanded ? (
            <ChevronDown size={12} style={{ color: colors.punctuation }} />
          ) : (
            <ChevronRight size={12} style={{ color: colors.punctuation }} />
          )}
          <span style={{ color: colors.bracket }}>{'{'}</span>
          {!isExpanded && (
            <span style={{ color: colors.punctuation, fontSize: 11, marginLeft: 4 }}>
              {preview}
            </span>
          )}
        </span>
        {isExpanded && (
          <>
            <div style={{ 
              marginLeft: 20, 
              borderLeft: '2px solid rgba(163, 113, 247, 0.2)', 
              paddingLeft: 12,
              marginTop: 4,
            }}>
              {keys.map((key, index) => {
                const isKeyHighlighted = searchTerm && key.toLowerCase().includes(searchTerm.toLowerCase());
                return (
                  <div key={key} style={{ 
                    marginTop: 6,
                    paddingLeft: 4,
                    position: 'relative',
                    background: isKeyHighlighted ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                    borderRadius: 4,
                    padding: isKeyHighlighted ? '4px 8px' : '0',
                    margin: isKeyHighlighted ? '4px 0' : '6px 0 0 0',
                  }}>
                    <span style={{ 
                      color: colors.key,
                      fontWeight: 500,
                    }}>
                      "{highlightText(key)}"
                    </span>
                    <span style={{ color: colors.punctuation }}>: </span>
                    <JsonValue 
                      value={value[key]} 
                      depth={depth + 1} 
                      defaultExpanded={defaultExpanded} 
                      maxInitialDepth={maxInitialDepth}
                      searchTerm={searchTerm}
                    />
                    {index < keys.length - 1 && <span style={{ color: colors.punctuation }}>,</span>}
                  </div>
                );
              })}
            </div>
            <span style={{ color: colors.bracket }}>{'}'}</span>
          </>
        )}
        {!isExpanded && <span style={{ color: colors.bracket }}>{'}'}</span>}
      </span>
    );
  }

  return <span style={{ color: colors.null }}>{String(value)}</span>;
}

// Main JsonViewer component
function JsonViewer({
  data,
  title = null,
  maxHeight = 400,
  defaultExpanded = true,
  maxInitialDepth = 2,
  showCopy = true,
  showExpandAll = true,
  showSearch = true,
  style = {}
}) {
  const [copied, setCopied] = useState(false);
  const [allExpanded, setAllExpanded] = useState(defaultExpanded);
  const [key, setKey] = useState(0); // Force re-render
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Parse data if it's a string
  let parsedData = data;
  let parseError = null;

  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parseError = e.message;
    }
  }

  const handleCopy = useCallback(() => {
    const textToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  const toggleExpandAll = useCallback(() => {
    setAllExpanded(!allExpanded);
    setKey(k => k + 1); // Force re-render
  }, [allExpanded]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setShowSearchInput(false);
  }, []);

  if (parseError) {
    return (
      <div className="json-viewer" style={{ ...style }}>
        <div className="json-viewer-header">
          {title && <span className="json-viewer-title">{title}</span>}
          <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>Parse Error: {parseError}</span>
        </div>
        <div className="json-viewer-content">
          <pre style={{ color: colors.string, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {data}
          </pre>
        </div>
      </div>
    );
  }

  const isEmpty = parsedData === null || parsedData === undefined ||
    (typeof parsedData === 'object' && Object.keys(parsedData).length === 0);

  return (
    <div className="json-viewer" style={{ ...style }}>
      <div className="json-viewer-header">
        {title && <span className="json-viewer-title">{title}</span>}
        <div className="json-viewer-actions">
          {showSearch && !isEmpty && (
            <>
              {showSearchInput ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  background: 'var(--bg-primary)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  border: '1px solid var(--border-color)',
                }}>
                  <Search size={12} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      width: 120,
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={clearSearch}
                    className="json-viewer-btn"
                    style={{ width: 20, height: 20, padding: 0 }}
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearchInput(true)}
                  className="json-viewer-btn"
                  title="Search JSON"
                >
                  <Search size={14} />
                </button>
              )}
            </>
          )}
          {showExpandAll && !isEmpty && (
            <button
              onClick={toggleExpandAll}
              className="json-viewer-btn"
              title={allExpanded ? 'Collapse all' : 'Expand all'}
            >
              {allExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {showCopy && (
            <button
              onClick={handleCopy}
              className="json-viewer-btn"
              title="Copy JSON"
            >
              {copied ? <Check size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>
      <div className="json-viewer-content" style={{ maxHeight, overflow: 'auto' }}>
        {isEmpty ? (
          <span style={{ color: colors.null, fontStyle: 'italic' }}>Empty</span>
        ) : (
          <JsonValue
            key={key}
            value={parsedData}
            defaultExpanded={allExpanded}
            maxInitialDepth={maxInitialDepth}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </div>
  );
}

export default JsonViewer;
