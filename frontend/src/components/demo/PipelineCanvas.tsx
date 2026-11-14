import React, { useRef, useState, useEffect } from 'react';
import { DemoStageDef, NodeId } from './scenarios';
import { PacketLayer, PIPELINE_PATH_D, NODE_COORDINATES } from './PacketLayer';
import { Globe, Lock, Cpu, Database, CheckCircle, AlertTriangle } from 'lucide-react';

interface PipelineCanvasProps {
  stages: DemoStageDef[];
  activeStageIndex: number;
  completedStageIndices: number[];
  failedStageIndex: number | null;
  selectedStageId: NodeId | null;
  progress: number;
  isRunning: boolean;
  isFinished: boolean;
  onSelectNode: (stageId: NodeId) => void;
  isReducedMotion?: boolean;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  stages,
  activeStageIndex,
  completedStageIndices,
  failedStageIndex,
  selectedStageId,
  progress,
  isRunning,
  isFinished,
  onSelectNode,
  isReducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const [hoveredNodeIdx, setHoveredNodeIdx] = useState<number | null>(null);
  const [nodeTilts, setNodeTilts] = useState<Record<number, { rx: number; ry: number }>>({});

  // Parallax on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseParallax({
      x: nx * 12,
      y: ny * 12,
    });
  };

  const handleNodeMouseMove = (idx: number, e: React.MouseEvent<HTMLElement>) => {
    if (isReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setNodeTilts((prev) => ({
      ...prev,
      [idx]: { rx: -dy * 6, ry: dx * 6 },
    }));
  };

  const handleNodeMouseLeave = (idx: number) => {
    setNodeTilts((prev) => ({
      ...prev,
      [idx]: { rx: 0, ry: 0 },
    }));
    setHoveredNodeIdx(null);
  };

  const getNodeIcon = (icon: string, size = 26) => {
    switch (icon) {
      case 'Globe':
        return <Globe size={size} />;
      case 'Lock':
        return <Lock size={size} />;
      case 'Cpu':
        return <Cpu size={size} />;
      case 'Database':
        return <Database size={size} />;
      default:
        return <CheckCircle size={size} />;
    }
  };

  // Screen shake if failed
  const isErrorState = failedStageIndex !== null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`jb-demo-canvas-viewport ${isErrorState ? 'jb-demo-screen-shake' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--neu-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Volumetric ambient light cone */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '20%',
          width: '60%',
          height: '140%',
          background:
            'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.08) 0%, rgba(34, 211, 238, 0.04) 40%, transparent 75%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          transform: `translate(${mouseParallax.x * -0.5}px, ${mouseParallax.y * -0.5}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />

      {/* Parallax dot grid background */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px), linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)',
          backgroundSize: '32px 32px, 96px 96px, 96px 96px',
          opacity: 0.75,
          pointerEvents: 'none',
          transform: `translate(${mouseParallax.x}px, ${mouseParallax.y}px)`,
          transition: 'transform 0.15s ease-out',
        }}
      />

      {/* Main SVG Coordinate Layer (1000 x 480) */}
      <div
        style={{
          position: 'relative',
          width: 'min(1180px, 94vw)',
          aspectRatio: '1000 / 480',
          maxHeight: '74vh',
        }}
      >
        <svg
          viewBox="0 0 1000 480"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* Surge glow filter */}
            <filter id="jb-glow-surge" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Edge energy gradient */}
            <linearGradient id="jb-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="25%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Dim Base Edge Path */}
          <path
            d={PIPELINE_PATH_D}
            fill="none"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Progressive Energized Edge Stroke */}
          <path
            d={PIPELINE_PATH_D}
            fill="none"
            stroke={isErrorState ? '#ef4444' : isFinished ? '#10b981' : 'url(#jb-edge-gradient)'}
            strokeWidth={isFinished ? '4.5' : '3.5'}
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
            filter={isFinished ? 'url(#jb-glow-surge)' : 'none'}
            style={{
              transition: isFinished ? 'stroke 0.4s ease, stroke-width 0.4s ease' : 'none',
            }}
          />

          {/* End-to-end surge flash on success finale */}
          {isFinished && (
            <path
              d={PIPELINE_PATH_D}
              fill="none"
              stroke="#6ee7b7"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.6"
              className="jb-demo-surge-pulse"
            />
          )}

          {/* Animated Comet Trail & Packet Layer */}
          <PacketLayer
            progress={progress}
            activeStageIndex={activeStageIndex}
            failedStageIndex={failedStageIndex}
            isRunning={isRunning}
            stages={stages}
            isReducedMotion={isReducedMotion}
          />
        </svg>

        {/* Interactive HTML Node Elements (Positioned per NODE_COORDINATES in 1000x480 space) */}
        {stages.map((stage, idx) => {
          const coords = NODE_COORDINATES[idx];
          const leftPct = (coords.x / 1000) * 100;
          const topPct = (coords.y / 480) * 100;

          const isActive = activeStageIndex === idx;
          const isCompleted = completedStageIndices.includes(idx);
          const isFailed = failedStageIndex === idx;
          const isSkipped = stage.status === 'skipped';
          const isSelected = selectedStageId === stage.id;
          const tilt = nodeTilts[idx] || { rx: 0, ry: 0 };

          // Visual theme per state
          let borderColor = 'var(--neu-border)';
          let iconColor = '#64748b';
          let shadow = 'var(--neu-flat)';
          let scale = 1;

          if (isFailed) {
            borderColor = '#ef4444';
            iconColor = '#ef4444';
            shadow = '0 0 32px rgba(239, 68, 68, 0.45), var(--neu-flat-lg)';
            scale = 1.08;
          } else if (isActive) {
            borderColor = stage.color;
            iconColor = stage.color;
            shadow = `0 0 34px ${stage.color}50, var(--neu-flat-lg)`;
            scale = 1.08;
          } else if (isCompleted) {
            borderColor = '#10b98160';
            iconColor = '#10b981';
            shadow = '0 0 20px rgba(16, 185, 129, 0.25), var(--neu-flat-sm)';
          } else if (isSkipped) {
            borderColor = 'rgba(255, 255, 255, 0.04)';
            iconColor = '#334155';
            scale = 0.94;
          }

          if (isSelected) {
            borderColor = '#ffffff';
            shadow = `${shadow}, 0 0 0 2px #ffffff50`;
          }

          return (
            <div
              key={stage.id}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isActive ? 30 : 20,
              }}
            >
              {/* Shockwave expanding ring on active arrival */}
              {isActive && !isReducedMotion && (
                <div
                  className="jb-demo-shockwave"
                  style={{
                    borderColor: stage.color,
                  }}
                />
              )}

              {/* Particle Burst rays on active arrival */}
              {isActive && !isReducedMotion && (
                <div className="jb-demo-particles" style={{ pointerEvents: 'none' }}>
                  {[...Array(12)].map((_, pi) => (
                    <span
                      key={pi}
                      style={{
                        background: stage.color,
                        transform: `rotate(${pi * 30}deg) translateY(-48px)`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Reactor Node Module Button */}
              <button
                type="button"
                onClick={() => onSelectNode(stage.id)}
                onMouseMove={(e) => handleNodeMouseMove(idx, e)}
                onMouseEnter={() => setHoveredNodeIdx(idx)}
                onMouseLeave={() => handleNodeMouseLeave(idx)}
                aria-label={`${stage.name} - ${isFailed ? 'Failed' : isCompleted ? 'Completed' : isActive ? 'Active' : 'Pending'} - Click to inspect`}
                className={`jb-demo-reactor-node ${isFailed ? 'jb-demo-glitch' : ''}`}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  width: 'clamp(84px, 8.5vw, 110px)',
                  height: 'clamp(84px, 8.5vw, 110px)',
                  borderRadius: 24,
                  background: isFailed
                    ? 'linear-gradient(145deg, #2a1114, #190a0c)'
                    : isActive
                    ? 'linear-gradient(145deg, #181a28, #0e101a)'
                    : isCompleted
                    ? 'linear-gradient(145deg, #0e2017, #08140e)'
                    : 'var(--neu-surface)',
                  border: `1.8px solid ${borderColor}`,
                  boxShadow: shadow,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  position: 'relative',
                  overflow: 'hidden',
                  transform: `perspective(600px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${scale})`,
                  transition:
                    'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease, box-shadow 0.4s ease, background 0.4s ease',
                }}
              >
                {/* Conic sweep scan on active */}
                {isActive && !isReducedMotion && (
                  <div
                    className="jb-demo-conic-scan"
                    style={{
                      background: `conic-gradient(from 0deg, transparent 70%, ${stage.color})`,
                    }}
                  />
                )}

                {/* Node Icon */}
                <div
                  style={{
                    color: iconColor,
                    transform: isActive ? 'scale(1.12)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isFailed ? <AlertTriangle size={28} /> : getNodeIcon(stage.icon)}
                </div>

                {/* Node Title */}
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: isActive ? '#ffffff' : isCompleted ? '#34d399' : '#94a3b8',
                    fontFamily: "'JetBrains Mono', monospace",
                    textAlign: 'center',
                    lineHeight: 1.2,
                    padding: '0 4px',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {stage.shortName}
                </span>

                {/* Status indicator pill */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: iconColor,
                    boxShadow: isActive ? `0 0 8px ${iconColor}` : 'none',
                  }}
                />
              </button>

              {/* Hover Tooltip */}
              {hoveredNodeIdx === idx && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 12px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(14, 14, 18, 0.95)',
                    border: '1px solid var(--neu-border-bevel)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    boxShadow: 'var(--neu-flat-sm)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 50,
                    animation: 'jb-demo-fade-in 0.2s ease-out',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ffffff' }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    Latency: <strong style={{ color: '#10b981' }}>{stage.latencyMs}ms</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
