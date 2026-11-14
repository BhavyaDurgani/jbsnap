'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DemoStage } from './DemoStage';
import {
  Play,
  Shield,
  Cpu,
  Database,
  CheckCircle,
  Globe,
  Sliders,
  Terminal,
  Code2,
  Maximize2,
} from 'lucide-react';

interface WatchDemoProps {
  playTrigger?: number;
}

export function WatchDemo({ playTrigger = 0 }: WatchDemoProps) {
  const [isStageOpen, setIsStageOpen] = useState(false);
  const [autoPlayOnOpen, setAutoPlayOnOpen] = useState(false);

  const prevTriggerRef = useRef(playTrigger);
  useEffect(() => {
    if (playTrigger > 0 && playTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = playTrigger;
      setIsStageOpen(true);
      setAutoPlayOnOpen(true);
    }
  }, [playTrigger]);

  const handleLaunchClick = () => {
    setAutoPlayOnOpen(true);
    setIsStageOpen(true);
  };

  const handleCloseStage = () => {
    setIsStageOpen(false);
    setAutoPlayOnOpen(false);
  };

  return (
    <section
      id="demo"
      style={{
        padding: '32px 32px 80px',
        position: 'relative',
        background: 'var(--neu-base)',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          position: 'relative',
          zIndex: 5,
          width: '100%',
        }}
      >
        {/* Header Block */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 99,
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border)',
              boxShadow: 'var(--neu-flat-xs)',
              fontSize: 11,
              fontWeight: 800,
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#6366f1',
                boxShadow: '0 0 8px #6366f1',
              }}
            />
            Live Interactive Simulator
          </div>

          <h2
            style={{
              fontSize: 'clamp(36px, 4.5vw, 54px)',
              fontWeight: 900,
              letterSpacing: '-1.8px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#ffffff',
              lineHeight: 1.05,
              marginBottom: 14,
            }}
          >
            Watch Demo
          </h2>

          <p
            style={{
              fontSize: 17,
              color: '#94a3b8',
              lineHeight: 1.6,
              margin: '0 auto',
              maxWidth: 640,
            }}
          >
            Step into the control room. Fire live requests through our compiled Fastify + TypeScript gateway, inject chaos faults, and inspect node payloads in real time.
          </p>
        </div>

        {/* Launch Pad Card with Miniature Looping Preview */}
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            background: 'var(--neu-surface)',
            border: '1px solid var(--neu-border-bevel)',
            borderRadius: 24,
            boxShadow: 'var(--neu-flat-lg), 0 24px 60px rgba(0, 0, 0, 0.7)',
            padding: '36px 40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Glow behind preview */}
          <div
            style={{
              position: 'absolute',
              top: '-30%',
              right: '-10%',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          {/* Miniature Canvas Preview (Looping CSS/SVG Node DAG) */}
          <div
            style={{
              background: '#040406',
              border: '1px solid var(--neu-border)',
              borderRadius: 18,
              padding: '24px 28px',
              marginBottom: 32,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Dot Grid */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.15,
                backgroundImage:
                  'radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                pointerEvents: 'none',
              }}
            />

            {/* Connecting Bezier Edge */}
            <svg
              viewBox="0 0 800 120"
              style={{
                width: '100%',
                height: 90,
                display: 'block',
              }}
            >
              <defs>
                <linearGradient id="jb-preview-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="25%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="75%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              <path
                d="M 60 60 C 140 60, 140 35, 220 35 C 310 35, 310 85, 400 85 C 490 85, 490 35, 580 35 C 660 35, 660 60, 740 60"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="2.5"
              />
              <path
                d="M 60 60 C 140 60, 140 35, 220 35 C 310 35, 310 85, 400 85 C 490 85, 490 35, 580 35 C 660 35, 660 60, 740 60"
                fill="none"
                stroke="url(#jb-preview-grad)"
                strokeWidth="2.5"
                strokeDasharray="8 6"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-40"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </path>

              {/* Looping packet */}
              <circle r="4.5" fill="#ffffff" filter="drop-shadow(0 0 6px #6366f1)">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  path="M 60 60 C 140 60, 140 35, 220 35 C 310 35, 310 85, 400 85 C 490 85, 490 35, 580 35 C 660 35, 660 60, 740 60"
                />
              </circle>
            </svg>

            {/* 5 Mini Nodes */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 2,
                marginTop: -40,
                padding: '0 30px',
              }}
            >
              {[
                { name: 'Gateway', icon: <Globe size={14} />, color: '#6366f1' },
                { name: 'JWT Auth', icon: <Shield size={14} />, color: '#a78bfa' },
                { name: 'Sandbox', icon: <Cpu size={14} />, color: '#f59e0b' },
                { name: 'Neon DB', icon: <Database size={14} />, color: '#38bdf8' },
                { name: '200 OK', icon: <CheckCircle size={14} />, color: '#10b981' },
              ].map((node) => (
                <div
                  key={node.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${node.color}18`,
                      border: `1.5px solid ${node.color}55`,
                      color: node.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 14px ${node.color}25`,
                    }}
                  >
                    {node.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      color: '#cbd5e1',
                    }}
                  >
                    {node.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Launch Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            {/* Feature Pills */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  color: '#94a3b8',
                }}
              >
                <Sliders size={14} color="#f59e0b" /> Chaos Fault Injection
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  color: '#94a3b8',
                }}
              >
                <Code2 size={14} color="#38bdf8" /> Live Node Inspector
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  color: '#94a3b8',
                }}
              >
                <Terminal size={14} color="#a78bfa" /> Edge Tracer Terminal
              </div>
            </div>

            {/* Launch Primary CTA Button */}
            <button
              onClick={handleLaunchClick}
              className="jb-demo-launch-btn"
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '16px 36px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                color: '#000000',
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow:
                  '6px 6px 18px rgba(0, 0, 0, 0.7), -3px -3px 10px rgba(255, 255, 255, 0.15), 0 0 28px rgba(99, 102, 241, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '8px 8px 24px rgba(0, 0, 0, 0.8), -4px -4px 12px rgba(255, 255, 255, 0.25), 0 0 36px rgba(99, 102, 241, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow =
                  '6px 6px 18px rgba(0, 0, 0, 0.7), -3px -3px 10px rgba(255, 255, 255, 0.15), 0 0 28px rgba(99, 102, 241, 0.35)';
              }}
            >
              <Play size={16} fill="currentColor" />
              <span>Launch Interactive Demo</span>
              <Maximize2 size={14} style={{ opacity: 0.6 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Full-Viewport Control Room Demo Stage (Mounted via Portal) */}
      <DemoStage
        isOpen={isStageOpen}
        onClose={handleCloseStage}
        autoPlayAfterLaunch={autoPlayOnOpen}
      />
    </section>
  );
}
