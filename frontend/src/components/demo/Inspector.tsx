import React, { useState } from 'react';
import { DemoStageDef } from './scenarios';
import { X, Copy, Check, Code, Shield, Database, Cpu, Globe, CheckCircle } from 'lucide-react';

interface InspectorProps {
  stage: DemoStageDef | null;
  isOpen: boolean;
  onClose: () => void;
  activeStageIndex: number;
  stageIndex: number;
}

export const Inspector: React.FC<InspectorProps> = ({
  stage,
  isOpen,
  onClose,
  activeStageIndex,
  stageIndex,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !stage) return null;

  const isCurrentActive = activeStageIndex === stageIndex;
  const isFinished = activeStageIndex > stageIndex;
  const isFailed = stage.status === 'error';
  const isSkipped = stage.status === 'skipped';

  const statusLabel = isFailed
    ? 'Failed'
    : isSkipped
    ? 'Skipped'
    : isCurrentActive
    ? 'Executing'
    : isFinished
    ? 'Completed'
    : 'Pending';

  const statusColor = isFailed
    ? '#ef4444'
    : isSkipped
    ? '#64748b'
    : isCurrentActive
    ? stage.color
    : isFinished
    ? '#10b981'
    : '#94a3b8';

  const copyPayload = () => {
    const dataToCopy = {
      stage: stage.name,
      status: stage.status,
      latencyMs: stage.latencyMs,
      payload: stage.payload,
    };
    navigator.clipboard?.writeText(JSON.stringify(dataToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getStageIcon = (name: string) => {
    switch (name) {
      case 'Globe':
        return <Globe size={18} />;
      case 'Lock':
        return <Shield size={18} />;
      case 'Cpu':
        return <Cpu size={18} />;
      case 'Database':
        return <Database size={18} />;
      default:
        return <CheckCircle size={18} />;
    }
  };

  return (
    <aside
      className="jb-demo-inspector-drawer"
      aria-label="Node Inspector"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(440px, 92vw)',
        background: 'rgba(10, 10, 14, 0.94)',
        backdropFilter: 'blur(28px)',
        borderLeft: '1px solid var(--neu-border-bevel)',
        boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.85)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        animation: 'jb-demo-slide-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--neu-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${stage.color}18`,
              border: `1.5px solid ${stage.color}50`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stage.color,
            }}
          >
            {getStageIcon(stage.icon)}
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                margin: 0,
              }}
            >
              {stage.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: statusColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: statusColor,
                    boxShadow: `0 0 8px ${statusColor}`,
                  }}
                />
                {statusLabel}
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>•</span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#94a3b8',
                }}
              >
                {stage.latencyMs}ms latency
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={copyPayload}
            title="Copy Inspector JSON"
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border)',
              color: copied ? '#10b981' : '#94a3b8',
              fontSize: 11.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'JSON'}
          </button>

          <button
            onClick={onClose}
            aria-label="Close Inspector"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Description card */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--neu-sunken)',
            borderRadius: 12,
            border: '1px solid var(--neu-border)',
            fontSize: 13,
            color: '#94a3b8',
            lineHeight: 1.6,
          }}
        >
          {stage.desc}
        </div>

        {/* Code Snippet if applicable */}
        {stage.payload.codeSnippet && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Code size={12} color="#f59e0b" /> Script Sandbox Logic
            </div>
            <pre
              style={{
                margin: 0,
                padding: '14px 16px',
                borderRadius: 12,
                background: '#040406',
                border: '1px solid var(--neu-border)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                lineHeight: 1.65,
                color: '#7dd3fc',
                overflowX: 'auto',
              }}
            >
              {stage.payload.codeSnippet}
            </pre>
          </div>
        )}

        {/* Configuration Section */}
        {stage.payload.config && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Node Configuration
            </div>
            <div
              style={{
                background: 'var(--neu-surface)',
                border: '1px solid var(--neu-border)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {Object.entries(stage.payload.config).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    paddingBottom: 6,
                  }}
                >
                  <span style={{ color: '#64748b' }}>{key}</span>
                  <span
                    style={{
                      color: '#cbd5e1',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11.5,
                    }}
                  >
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input / Request Data */}
        {stage.payload.input && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Inbound Request State
            </div>
            <JsonViewer data={stage.payload.input} />
          </div>
        )}

        {/* Output / Payload Result */}
        {stage.payload.output && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Stage Output / Resolved Context
            </div>
            <JsonViewer data={stage.payload.output} />
          </div>
        )}

        {/* Metrics */}
        {stage.payload.metrics && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Stage Telemetry
            </div>
            <div
              style={{
                background: 'var(--neu-sunken)',
                border: '1px solid var(--neu-border)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {Object.entries(stage.payload.metrics).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span
                    style={{
                      color: '#10b981',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      fontSize: 11.5,
                    }}
                  >
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

function JsonViewer({ data }: { data: any }) {
  const jsonStr = JSON.stringify(data, null, 2);

  return (
    <pre
      style={{
        margin: 0,
        padding: '14px 16px',
        borderRadius: 12,
        background: '#040406',
        border: '1px solid var(--neu-border)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11.5,
        lineHeight: 1.65,
        color: '#e2e8f0',
        overflowX: 'auto',
      }}
    >
      <code>{jsonStr}</code>
    </pre>
  );
}
