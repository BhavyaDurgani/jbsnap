import React, { useRef, useEffect, useState } from 'react';
import { DemoStageDef } from './scenarios';

export const PIPELINE_PATH_D =
  'M 110 240 C 205 240, 205 190, 300 190 C 400 190, 400 270, 500 270 C 600 270, 600 200, 700 200 C 795 200, 795 240, 890 240';

export const NODE_COORDINATES: Array<{ x: number; y: number }> = [
  { x: 110, y: 240 },
  { x: 300, y: 190 },
  { x: 500, y: 270 },
  { x: 700, y: 200 },
  { x: 890, y: 240 },
];

interface Point {
  x: number;
  y: number;
  color: string;
}

interface ShatterParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface PacketLayerProps {
  progress: number; // 0 to 1
  activeStageIndex: number;
  failedStageIndex: number | null;
  isRunning: boolean;
  stages: DemoStageDef[];
  isReducedMotion?: boolean;
}

export const PacketLayer: React.FC<PacketLayerProps> = ({
  progress,
  activeStageIndex,
  failedStageIndex,
  isRunning,
  stages,
  isReducedMotion = false,
}) => {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [trail, setTrail] = useState<Point[]>([]);
  const [shatter, setShatter] = useState<ShatterParticle[]>([]);

  // Current color based on active stage
  const currentColor =
    failedStageIndex !== null
      ? '#ef4444'
      : activeStageIndex >= 0 && stages[activeStageIndex]
      ? stages[activeStageIndex].color
      : '#6366f1';

  // Compute point on path
  useEffect(() => {
    if (!pathRef.current) return;
    if (progress <= 0) {
      setCurrentPos(null);
      setTrail([]);
      setShatter([]);
      return;
    }

    try {
      const totalLen = pathRef.current.getTotalLength();
      const dist = Math.min(progress, 1) * totalLen;
      const pt = pathRef.current.getPointAtLength(dist);

      setCurrentPos({ x: pt.x, y: pt.y });

      if (!isReducedMotion && isRunning) {
        setTrail((prev) => {
          const next = [{ x: pt.x, y: pt.y, color: currentColor }, ...prev.slice(0, 10)];
          return next;
        });
      }
    } catch {
      // SVG path calculation fallback
    }
  }, [progress, isRunning, isReducedMotion, currentColor]);

  // Handle shatter effect when failed
  useEffect(() => {
    if (failedStageIndex !== null && currentPos) {
      const particles: ShatterParticle[] = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const speed = 1.5 + Math.random() * 3.5;
        particles.push({
          id: i,
          x: currentPos.x,
          y: currentPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 3,
          opacity: 1,
        });
      }
      setShatter(particles);

      let frame = 0;
      const anim = () => {
        frame++;
        setShatter((prev) =>
          prev.map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            opacity: Math.max(0, p.opacity - 0.04),
          }))
        );
        if (frame < 30) {
          requestAnimationFrame(anim);
        }
      };
      requestAnimationFrame(anim);
    }
  }, [failedStageIndex]);

  return (
    <>
      {/* Hidden path used for measurement */}
      <path
        ref={pathRef}
        d={PIPELINE_PATH_D}
        fill="none"
        stroke="none"
        style={{ pointerEvents: 'none' }}
      />

      {/* Comet Trail */}
      {!isReducedMotion &&
        trail.map((pt, idx) => {
          const ratio = (trail.length - idx) / trail.length;
          const radius = 6 * ratio;
          const op = 0.45 * ratio;
          return (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={radius}
              fill={pt.color}
              opacity={op}
              filter="blur(1.5px)"
              pointerEvents="none"
            />
          );
        })}

      {/* Main Packet Orb */}
      {currentPos && failedStageIndex === null && (
        <g transform={`translate(${currentPos.x}, ${currentPos.y})`} pointerEvents="none">
          {/* Outer Ambient Glow */}
          <circle r="18" fill={currentColor} opacity="0.22" filter="blur(6px)" />
          {/* Mid Glow */}
          <circle r="10" fill={currentColor} opacity="0.5" filter="blur(2px)" />
          {/* Core Orb */}
          <circle r="5.5" fill="#ffffff" />
          <circle r="4" fill={currentColor} />
        </g>
      )}

      {/* Shattered Particles on Error */}
      {shatter.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.size}
          fill="#ef4444"
          opacity={p.opacity}
          filter="blur(1px)"
          pointerEvents="none"
        />
      ))}
    </>
  );
};
