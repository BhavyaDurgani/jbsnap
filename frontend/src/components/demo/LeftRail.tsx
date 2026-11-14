import React from 'react';
import { DemoStageDef, NodeId } from './scenarios';

interface LeftRailProps {
  stages: DemoStageDef[];
  activeStageIndex: number;
  completedStageIndices: number[];
  failedStageIndex: number | null;
  selectedStageId: NodeId | null;
  onSelectNode: (stageId: NodeId) => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  stages,
  activeStageIndex,
  completedStageIndices,
  failedStageIndex,
  selectedStageId,
  onSelectNode,
}) => {
  return (
    <nav
      aria-label="Pipeline Stages"
      className="jb-demo-left-rail"
      style={{
        position: 'absolute',
        top: 80,
        left: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 40,
        width: 220,
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 4,
          paddingLeft: 4,
        }}
      >
        Stages Overview
      </div>

      {stages.map((stage, idx) => {
        const isActive = activeStageIndex === idx;
        const isCompleted = completedStageIndices.includes(idx);
        const isFailed = failedStageIndex === idx;
        const isSkipped = stage.status === 'skipped';
        const isSelected = selectedStageId === stage.id;

        let bg = 'rgba(12, 12, 16, 0.7)';
        let border = 'var(--neu-border)';
        let color = '#94a3b8';
        let badgeBg = 'rgba(255, 255, 255, 0.05)';
        let badgeColor = '#64748b';

        if (isFailed) {
          bg = 'rgba(239, 68, 68, 0.12)';
          border = 'rgba(239, 68, 68, 0.4)';
          color = '#f87171';
          badgeBg = '#ef4444';
          badgeColor = '#ffffff';
        } else if (isActive) {
          bg = `${stage.color}15`;
          border = `${stage.color}50`;
          color = '#ffffff';
          badgeBg = stage.color;
          badgeColor = '#ffffff';
        } else if (isCompleted) {
          bg = 'rgba(16, 185, 129, 0.08)';
          border = 'rgba(16, 185, 129, 0.25)';
          color = '#e2e8f0';
          badgeBg = 'rgba(16, 185, 129, 0.2)';
          badgeColor = '#10b981';
        } else if (isSkipped) {
          opacity: 0.4;
          color = '#475569';
        }

        if (isSelected) {
          border = '#ffffff';
        }

        return (
          <button
            key={stage.id}
            onClick={() => onSelectNode(stage.id)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 10,
              background: bg,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.25s ease',
              opacity: isSkipped ? 0.4 : 1,
            }}
          >
            {/* Number badge */}
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: badgeBg,
                color: badgeColor,
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </span>

            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: isActive ? 800 : 600,
                  color,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'color 0.2s',
                }}
              >
                {stage.name.split('. ')[1] || stage.name}
              </div>
            </div>

            {/* Micro latency pill */}
            <span
              style={{
                fontSize: 9.5,
                fontFamily: "'JetBrains Mono', monospace",
                color: isCompleted || isActive ? '#10b981' : '#475569',
              }}
            >
              {stage.latencyMs}ms
            </span>
          </button>
        );
      })}
    </nav>
  );
};
