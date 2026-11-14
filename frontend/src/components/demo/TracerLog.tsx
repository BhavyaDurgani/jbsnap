import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface TracerLogProps {
  logs: string[];
  activeStageIndex: number;
}

export const TracerLog: React.FC<TracerLogProps> = ({ logs, activeStageIndex }) => {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new log entry
  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, collapsed]);

  const getLogColor = (line: string) => {
    if (line.includes('ERROR') || line.includes('401') || line.includes('429') || line.includes('504')) {
      return '#f87171'; // Red
    }
    if (line.startsWith('[Gateway]')) return '#818cf8'; // Indigo
    if (line.startsWith('[Auth]')) return '#c4b5fd'; // Violet
    if (line.startsWith('[Sandbox]')) return '#fbbf24'; // Amber
    if (line.startsWith('[Prisma]')) return '#38bdf8'; // Cyan
    if (line.startsWith('[Response]')) return '#34d399'; // Emerald
    return '#cbd5e1';
  };

  return (
    <div
      className="jb-demo-tracer-hud"
      style={{
        position: 'absolute',
        bottom: 110,
        left: 24,
        width: 'min(380px, calc(100vw - 48px))',
        background: 'rgba(8, 8, 12, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--neu-border-bevel)',
        borderRadius: 14,
        boxShadow: 'var(--neu-flat-sm), 0 16px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        zIndex: 40,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Terminal Title Bar */}
      <div
        style={{
          padding: '8px 14px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#febc2e' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Terminal size={11} color="#6366f1" /> Edge Tracer
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: '#64748b',
              background: 'rgba(255,255,255,0.04)',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            {logs.length}
          </span>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Log' : 'Collapse Log'}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: 3,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Terminal Output Body */}
      {!collapsed && (
        <div
          ref={scrollRef}
          aria-live="polite"
          style={{
            maxHeight: 160,
            overflowY: 'auto',
            padding: '12px 14px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#475569', fontStyle: 'italic', padding: '6px 0' }}>
              $ gateway tracer listening on edge socket...
            </div>
          ) : (
            logs.map((log, i) => {
              const isLatest = i === logs.length - 1;
              const color = getLogColor(log);
              return (
                <div
                  key={i}
                  style={{
                    color: isLatest ? '#ffffff' : color,
                    opacity: isLatest ? 1 : 0.72,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    animation: isLatest ? 'jb-demo-typewriter 0.25s ease-out' : 'none',
                    background: isLatest ? 'rgba(255,255,255,0.03)' : 'transparent',
                    padding: isLatest ? '2px 4px' : '0',
                    borderRadius: 4,
                  }}
                >
                  <span style={{ color: '#475569', userSelect: 'none', flexShrink: 0 }}>›</span>
                  <span style={{ wordBreak: 'break-all' }}>{log}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
