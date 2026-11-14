import React, { useState } from 'react';
import {
  ScenarioId,
  ChaosOptions,
  ResolvedScenario,
  PlaybackSpeed,
  SCENARIO_META,
} from './scenarios';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Zap,
  Sliders,
  Send,
  CheckCircle,
  AlertTriangle,
  Gauge,
} from 'lucide-react';

interface ControlsDockProps {
  scenario: ResolvedScenario;
  scenarioId: ScenarioId;
  chaos: ChaosOptions;
  speed: PlaybackSpeed;
  progress: number;
  elapsedMs: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  isError: boolean;
  onSendRequest: () => void;
  onTogglePlayPause: () => void;
  onStep: () => void;
  onReplay: () => void;
  onSeek: (progress: number) => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
  onSelectScenario: (id: ScenarioId) => void;
  onToggleChaos: (key: keyof ChaosOptions, value: any) => void;
  activeStageIndex: number;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  scenario,
  scenarioId,
  chaos,
  speed,
  progress,
  elapsedMs,
  isRunning,
  isPaused,
  isFinished,
  isError,
  onSendRequest,
  onTogglePlayPause,
  onStep,
  onReplay,
  onSeek,
  onSetSpeed,
  onSelectScenario,
  onToggleChaos,
  activeStageIndex,
}) => {
  const [showChaos, setShowChaos] = useState(false);

  const activeChaosCount =
    (chaos.jwtStatus === 'expired' ? 1 : 0) +
    (chaos.rateLimit === 'exceeded' ? 1 : 0) +
    (chaos.sandboxTimeout === 'slow' ? 1 : 0) +
    (chaos.dbLatency === 'slow' ? 1 : 0);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio);
  };

  return (
    <>
      {/* Dock Container */}
      <div
        className="jb-demo-controls-dock"
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(860px, 94vw)',
          background: 'rgba(12, 12, 16, 0.92)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--neu-border-bevel)',
          borderRadius: 20,
          boxShadow: 'var(--neu-flat-lg), 0 20px 50px rgba(0,0,0,0.7)',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 50,
        }}
      >
        {/* Row 1: Scrubbable Timeline Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Timeline Track */}
          <div
            onClick={handleTimelineClick}
            role="slider"
            aria-label="Demo Timeline"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            tabIndex={0}
            style={{
              flex: 1,
              height: 22,
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 8,
              border: '1px solid var(--neu-border)',
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {/* 5 Stage Segments */}
            {scenario.stages.map((st, i) => {
              const segPct = (st.durationMs / scenario.totalDurationMs) * 100;
              const isPast = activeStageIndex > i || (isFinished && !isError);
              const isCurr = activeStageIndex === i;
              return (
                <div
                  key={st.id}
                  style={{
                    width: `${segPct}%`,
                    height: '100%',
                    borderRight: i < 4 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                    background: isPast
                      ? `${st.color}25`
                      : isCurr
                      ? `${st.color}40`
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.3s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      color: isPast || isCurr ? '#ffffff' : '#64748b',
                    }}
                  >
                    {st.shortName}
                  </span>
                </div>
              );
            })}

            {/* Glowing Playhead Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${progress * 100}%`,
                width: 3,
                background: '#ffffff',
                boxShadow: '0 0 10px #ffffff, 0 0 20px #6366f1',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                transition: isRunning ? 'none' : 'left 0.1s ease-out',
              }}
            />
          </div>

          {/* Time Counter */}
          <div
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#cbd5e1',
              minWidth: 60,
              textAlign: 'right',
            }}
          >
            {(elapsedMs / 1000).toFixed(1)}s / {(scenario.totalDurationMs / 1000).toFixed(1)}s
          </div>

          {/* Speed Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--neu-surface)',
              borderRadius: 8,
              border: '1px solid var(--neu-border)',
              padding: 2,
            }}
          >
            {([0.5, 1, 2] as PlaybackSpeed[]).map((sp) => (
              <button
                key={sp}
                onClick={() => onSetSpeed(sp)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  background: speed === sp ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: speed === sp ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Scenario Chips + Controls + Send Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: Scenario Selector Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['users', 'orders', 'reports'] as ScenarioId[]).map((sid) => {
              const meta = SCENARIO_META[sid];
              const isSelected = scenarioId === sid;
              return (
                <button
                  key={sid}
                  onClick={() => onSelectScenario(sid)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--neu-elevated)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--neu-border-bevel)' : 'transparent'}`,
                    boxShadow: isSelected ? 'var(--neu-flat-xs)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '2px 5px',
                      borderRadius: 4,
                      background:
                        meta.method === 'POST' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: meta.method === 'POST' ? '#34d399' : '#818cf8',
                    }}
                  >
                    {meta.method}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {meta.path.split('/v1/')[1]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Playback Buttons + Chaos Toggle + Send Request Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Step Button */}
            <button
              onClick={onStep}
              title="Step forward to next node (ArrowRight)"
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--neu-surface)',
                border: '1px solid var(--neu-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                boxShadow: 'var(--neu-flat-xs)',
              }}
            >
              <SkipForward size={14} />
            </button>

            {/* Pause / Play Toggle Button */}
            <button
              onClick={onTogglePlayPause}
              title={isRunning ? 'Pause (Space)' : isPaused ? 'Resume (Space)' : 'Play'}
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--neu-surface)',
                border: '1px solid var(--neu-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                boxShadow: 'var(--neu-flat-xs)',
              }}
            >
              {isRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>

            {/* Replay Button */}
            <button
              onClick={onReplay}
              title="Replay from start (R)"
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--neu-surface)',
                border: '1px solid var(--neu-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                boxShadow: 'var(--neu-flat-xs)',
              }}
            >
              <RotateCcw size={14} />
            </button>

            {/* Chaos Panel Toggle */}
            <button
              onClick={() => setShowChaos(!showChaos)}
              title="Chaos Engineering & Fault Injection"
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '0 12px',
                height: 34,
                borderRadius: 10,
                background: activeChaosCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--neu-surface)',
                border: `1px solid ${activeChaosCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'var(--neu-border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: activeChaosCount > 0 ? '#f87171' : '#cbd5e1',
                fontSize: 11.5,
                fontWeight: 700,
                boxShadow: 'var(--neu-flat-xs)',
              }}
            >
              <Sliders size={13} />
              <span>Chaos</span>
              {activeChaosCount > 0 && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 9.5,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeChaosCount}
                </span>
              )}
            </button>

            {/* Send Request Primary CTA */}
            <button
              onClick={onSendRequest}
              title="Fire Request Packet (Enter)"
              className="jb-demo-send-btn"
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '0 18px',
                height: 36,
                borderRadius: 10,
                background: isRunning
                  ? 'linear-gradient(135deg, #4338ca, #3730a3)'
                  : 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                color: isRunning ? '#ffffff' : '#000000',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                boxShadow:
                  '0 0 20px rgba(99, 102, 241, 0.35), 4px 4px 14px rgba(0, 0, 0, 0.7)',
                fontSize: 12.5,
                fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Send size={13} />
              <span>{isRunning ? 'Streaming...' : 'Send Request'}</span>
              <kbd
                style={{
                  fontSize: 9,
                  background: isRunning ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                  padding: '1px 5px',
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                ↵
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Chaos Panel Drawer Popover */}
      {showChaos && (
        <div
          className="jb-demo-chaos-popover"
          style={{
            position: 'absolute',
            bottom: 124,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(520px, 92vw)',
            background: 'rgba(14, 14, 20, 0.95)',
            backdropFilter: 'blur(28px)',
            border: '1px solid var(--neu-border-bevel)',
            borderRadius: 16,
            boxShadow: 'var(--neu-flat-lg), 0 20px 50px rgba(0,0,0,0.8)',
            padding: '18px 20px',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            animation: 'jb-demo-fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} color="#f59e0b" />
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#ffffff' }}>
                Chaos & Fault Injection Engine
              </h4>
            </div>
            <button
              onClick={() => setShowChaos(false)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 11,
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.5 }}>
            Toggle realistic infrastructure failures to observe how the visual gateway short-circuits, isolates errors, and responds.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* JWT Expired Toggle */}
            <button
              onClick={() =>
                onToggleChaos('jwtStatus', chaos.jwtStatus === 'valid' ? 'expired' : 'valid')
              }
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 10,
                background:
                  chaos.jwtStatus === 'expired' ? 'rgba(239, 68, 68, 0.15)' : 'var(--neu-surface)',
                border: `1px solid ${chaos.jwtStatus === 'expired' ? '#ef4444' : 'var(--neu-border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff' }}>Expired JWT</span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: chaos.jwtStatus === 'expired' ? '#f87171' : '#64748b',
                  }}
                >
                  {chaos.jwtStatus === 'expired' ? '401 UNAUTH' : 'VALID'}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>Rejects at Auth node</span>
            </button>

            {/* Rate Limit Exceeded Toggle */}
            <button
              onClick={() =>
                onToggleChaos('rateLimit', chaos.rateLimit === 'normal' ? 'exceeded' : 'normal')
              }
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 10,
                background:
                  chaos.rateLimit === 'exceeded' ? 'rgba(239, 68, 68, 0.15)' : 'var(--neu-surface)',
                border: `1px solid ${chaos.rateLimit === 'exceeded' ? '#ef4444' : 'var(--neu-border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff' }}>Rate Limiting</span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: chaos.rateLimit === 'exceeded' ? '#f87171' : '#64748b',
                  }}
                >
                  {chaos.rateLimit === 'exceeded' ? '429 LIMIT' : 'NORMAL'}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>Drops at Gateway Trigger</span>
            </button>

            {/* Sandbox Slow / Timeout Toggle */}
            <button
              onClick={() =>
                onToggleChaos(
                  'sandboxTimeout',
                  chaos.sandboxTimeout === 'normal' ? 'slow' : 'normal'
                )
              }
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 10,
                background:
                  chaos.sandboxTimeout === 'slow'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'var(--neu-surface)',
                border: `1px solid ${chaos.sandboxTimeout === 'slow' ? '#ef4444' : 'var(--neu-border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff' }}>
                  Sandbox Timeout
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: chaos.sandboxTimeout === 'slow' ? '#f87171' : '#64748b',
                  }}
                >
                  {chaos.sandboxTimeout === 'slow' ? '504 TIMEOUT' : '200ms MAX'}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>Triggers CPU ceiling kill</span>
            </button>

            {/* Database Slow Latency Toggle */}
            <button
              onClick={() =>
                onToggleChaos('dbLatency', chaos.dbLatency === 'fast' ? 'slow' : 'fast')
              }
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 10,
                background:
                  chaos.dbLatency === 'slow' ? 'rgba(245, 158, 11, 0.15)' : 'var(--neu-surface)',
                border: `1px solid ${chaos.dbLatency === 'slow' ? '#f59e0b' : 'var(--neu-border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff' }}>DB Latency</span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: chaos.dbLatency === 'slow' ? '#fbbf24' : '#64748b',
                  }}
                >
                  {chaos.dbLatency === 'slow' ? '~140ms SLOW' : '~14ms FAST'}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>Simulates pool contention</span>
            </button>
          </div>
        </div>
      )}

      {/* Latency Waterfall HUD (Top Right) */}
      <div
        className="jb-demo-waterfall-hud"
        style={{
          position: 'absolute',
          top: 80,
          right: 24,
          background: 'rgba(10, 10, 14, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--neu-border-bevel)',
          borderRadius: 14,
          padding: '10px 16px',
          boxShadow: 'var(--neu-flat-sm)',
          zIndex: 40,
          minWidth: 220,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Gauge size={11} color="#38bdf8" /> Latency Waterfall
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: '#34d399',
            }}
          >
            {scenario.totalLatencyMs}ms total
          </span>
        </div>

        {/* Stacked latency bar */}
        <div
          style={{
            height: 6,
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 99,
            overflow: 'hidden',
            display: 'flex',
            gap: 1,
          }}
        >
          {scenario.stages.map((st, idx) => {
            const isCompleted = idx <= activeStageIndex || isFinished;
            const widthPct = (st.latencyMs / Math.max(scenario.totalLatencyMs, 1)) * 100;
            return (
              <div
                key={st.id}
                title={`${st.shortName}: ${st.latencyMs}ms`}
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  background: isCompleted ? st.color : 'transparent',
                  transition: 'background 0.3s ease',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Spring-in Final Response Card on Finished / Error */}
      {(isFinished || isError) && (
        <div
          className="jb-demo-response-card"
          style={{
            position: 'absolute',
            top: 146,
            right: 24,
            background: 'rgba(10, 10, 14, 0.94)',
            backdropFilter: 'blur(24px)',
            border: `1.5px solid ${scenario.finalStatus.success ? '#10b98160' : '#ef444460'}`,
            borderRadius: 14,
            padding: '14px 18px',
            boxShadow: 'var(--neu-flat), 0 16px 40px rgba(0,0,0,0.6)',
            zIndex: 45,
            maxWidth: 320,
            animation: 'jb-demo-spring-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {scenario.finalStatus.success ? (
                <CheckCircle size={15} color="#10b981" />
              ) : (
                <AlertTriangle size={15} color="#ef4444" />
              )}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: scenario.finalStatus.success ? '#34d399' : '#f87171',
                }}
              >
                {scenario.finalStatus.code} {scenario.finalStatus.text}
              </span>
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#64748b',
              }}
            >
              {scenario.totalLatencyMs}ms
            </span>
          </div>

          <div
            style={{
              background: '#040406',
              border: '1px solid var(--neu-border)',
              borderRadius: 8,
              padding: '8px 10px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10.5,
              color: '#94a3b8',
              maxHeight: 110,
              overflowY: 'auto',
              lineHeight: 1.5,
            }}
          >
            <pre style={{ margin: 0 }}>
              {JSON.stringify(scenario.finalResponse.body, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
};
