/**
 * ============================================================================
 * JBSnap Demo Stage Architecture & Engine Documentation
 * ============================================================================
 *
 * 1. STATE MACHINE MODEL (EngineStatus):
 *    [idle]
 *      │ (User launches via button or Hero trigger)
 *      ▼
 *    [launching] ──(1.4s Cinematic Entry: letterbox sweep, canvas zoom, node stagger)──► [ready]
 *                                                                                          │
 *                      ┌───────────────────────────────────────────────────────────────────┘
 *                      ▼
 *    [running] ◄──► [paused]
 *       │               │
 *       │ (Success)     │ (User steps or scrubs)
 *       ▼               ▼
 *    [finished]      [paused / running]
 *       │
 *       ▼ (Chaos Fault Triggered: 401, 429, 504)
 *    [error]
 *       │
 *       ▼ (User exits / Esc)
 *    [closing] ──(0.8s Exit Transition)──► [idle]
 *
 * 2. TIMELINE & SCRUBBING MODEL:
 *    - Normalized timeline progress t ∈ [0.0, 1.0] mapped to total scenario duration.
 *    - All visual components (beziers, packet coords, node glows, typewriter logs,
 *      latency waterfall) derive purely from t.
 *    - Scrubbing the timeline or clicking nodes instantly computes deterministic state
 *      without side-effects or timer leaks.
 * ============================================================================
 */

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine } from './useDemoEngine';
import { PipelineCanvas } from './PipelineCanvas';
import { LeftRail } from './LeftRail';
import { Inspector } from './Inspector';
import { TracerLog } from './TracerLog';
import { ControlsDock } from './ControlsDock';
import { X, Sparkles, Shield } from 'lucide-react';

interface DemoStageProps {
  isOpen: boolean;
  onClose: () => void;
  autoPlayAfterLaunch?: boolean;
}

export const DemoStage: React.FC<DemoStageProps> = ({
  isOpen,
  onClose,
  autoPlayAfterLaunch = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const stageRootRef = useRef<HTMLDivElement | null>(null);

  const {
    state,
    launch,
    close,
    sendRequest,
    togglePlayPause,
    step,
    replay,
    seek,
    setSpeed,
    setScenario,
    toggleChaos,
    selectStage,
    dismissHint,
  } = useDemoEngine(false);

  // Mount safety check for SSR React Portal
  useEffect(() => {
    setMounted(true);
    // Detect prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Track if stage was active to only fire onClose() after completing exit transition
  const wasActiveRef = useRef(false);
  const prevIsOpenRef = useRef(false);

  // Sync external isOpen prop with engine launch/close
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      launch();
    } else if (!isOpen && prevIsOpenRef.current) {
      if (state.status !== 'idle' && state.status !== 'closing') {
        close();
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, state.status, launch, close]);

  // When engine finishes closing, notify parent
  useEffect(() => {
    if (state.status !== 'idle') {
      wasActiveRef.current = true;
    } else if (state.status === 'idle' && wasActiveRef.current) {
      wasActiveRef.current = false;
      onClose();
    }
  }, [state.status, onClose]);

  // Auto-play request once cinematic entry transition completes
  useEffect(() => {
    if (state.status === 'ready' && autoPlayAfterLaunch) {
      sendRequest();
    }
  }, [state.status, autoPlayAfterLaunch]);

  // Lock body scroll and isolate slider event listeners
  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-demo-open', 'true');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.removeAttribute('data-demo-open');
    }
    return () => {
      document.body.removeAttribute('data-demo-open');
    };
  }, [isOpen]);

  // Global keyboard shortcuts inside Stage (Capture phase prevents slide switching)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      // Always stop slide navigation when Stage is open
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
        e.stopPropagation();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (state.selectedStageId !== null) {
          selectStage(null);
        } else {
          close();
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        sendRequest();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        togglePlayPause();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        step();
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        replay();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    return () => window.removeEventListener('keydown', handleKeyDownCapture, true);
  }, [isOpen, state.selectedStageId]);

  if (!mounted || (state.status === 'idle' && !isOpen)) return null;

  const selectedStage =
    state.selectedStageId !== null
      ? state.scenario.stages.find((s) => s.id === state.selectedStageId) || null
      : null;
  const selectedStageIndex = selectedStage
    ? state.scenario.stages.findIndex((s) => s.id === selectedStage.id)
    : -1;

  const portalContent = (
    <div
      ref={stageRootRef}
      id="jb-demo-stage-root"
      role="dialog"
      aria-modal="true"
      aria-label="JBSnap Interactive Control Room"
      onWheel={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#040406',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Scoped CSS Styles */}
      <style>{`
        /* Cinematic Letterbox Bars */
        .jb-demo-letterbox-top, .jb-demo-letterbox-bottom {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
          background: #000000;
          z-index: 9999;
          transition: height 0.65s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        .jb-demo-letterbox-top { top: 0; }
        .jb-demo-letterbox-bottom { bottom: 0; }
        .jb-demo-launching .jb-demo-letterbox-top,
        .jb-demo-launching .jb-demo-letterbox-bottom {
          height: 48px;
        }
        .jb-demo-closing .jb-demo-letterbox-top,
        .jb-demo-closing .jb-demo-letterbox-bottom {
          height: 50vh;
        }

        /* Light Sweep Flare */
        .jb-demo-light-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          transform: translateX(-100%);
          pointer-events: none;
          z-index: 9990;
        }
        .jb-demo-launching .jb-demo-light-sweep {
          animation: jb-demo-sweep 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
        }

        @keyframes jb-demo-sweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }

        /* Assemble Animation for Nodes */
        .jb-demo-launching .jb-demo-reactor-node {
          animation: jb-demo-node-materialize 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }
        @keyframes jb-demo-node-materialize {
          from {
            opacity: 0;
            transform: perspective(600px) scale(0.6);
            filter: blur(12px);
          }
          to {
            opacity: 1;
            transform: perspective(600px) scale(1);
            filter: blur(0);
          }
        }

        /* Shockwave Ring Animation */
        .jb-demo-shockwave {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          border-radius: 30px;
          border: 2px solid;
          pointer-events: none;
          animation: jb-demo-shockwave-expand 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes jb-demo-shockwave-expand {
          0% {
            width: 90px;
            height: 90px;
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            width: 170px;
            height: 170px;
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.4);
          }
        }

        /* Particle Burst Rays */
        .jb-demo-particles {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .jb-demo-particles span {
          position: absolute;
          top: 0;
          left: 0;
          width: 3px;
          height: 10px;
          border-radius: 99px;
          opacity: 0;
          animation: jb-demo-ray-burst 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes jb-demo-ray-burst {
          0% { opacity: 1; transform: scaleY(0.5); }
          100% { opacity: 0; transform: scaleY(2); }
        }

        /* Conic Scan Sweep on Active Node */
        .jb-demo-conic-scan {
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0.6;
          animation: jb-demo-spin 2s linear infinite;
        }
        @keyframes jb-demo-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Screen Shake on Failure */
        .jb-demo-screen-shake {
          animation: jb-demo-shake 0.28s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes jb-demo-shake {
          10%, 90% { transform: translate3d(-3px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
          40%, 60% { transform: translate3d(5px, 0, 0); }
        }

        /* Glitch Chromatic Aberration on Failing Node */
        .jb-demo-glitch {
          position: relative;
          box-shadow: -2px 0 #00ffff, 2px 0 #ff0055, 0 0 24px rgba(239, 68, 68, 0.6) !important;
        }

        /* Success Finale Surge Pulse */
        .jb-demo-surge-pulse {
          animation: jb-demo-surge 1.2s ease-in-out infinite;
        }
        @keyframes jb-demo-surge {
          0%, 100% { opacity: 0.4; stroke-width: 5; }
          50% { opacity: 0.85; stroke-width: 7; filter: drop-shadow(0 0 10px #10b981); }
        }

        /* Slide Left Drawer */
        @keyframes jb-demo-slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        /* Spring-in for Response Card */
        @keyframes jb-demo-spring-in {
          0% { opacity: 0; transform: scale(0.85) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Typewriter line reveal */
        @keyframes jb-demo-typewriter {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes jb-demo-fade-in {
          from { opacity: 0; transform: translate(-50%, -4px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        @keyframes jb-demo-fade-up {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        /* Mobile Adjustments */
        @media (max-width: 900px) {
          .jb-demo-left-rail { display: none !important; }
          .jb-demo-tracer-hud { display: none !important; }
          .jb-demo-waterfall-hud { display: none !important; }
          .jb-demo-controls-dock {
            width: calc(100vw - 20px) !important;
            bottom: 10px !important;
            padding: 10px !important;
          }
        }
      `}</style>

      {/* Cinematic Letterbox Bars */}
      <div className={`jb-demo-letterbox-top ${state.status === 'launching' ? 'jb-demo-launching' : state.status === 'closing' ? 'jb-demo-closing' : ''}`} />
      <div className={`jb-demo-letterbox-bottom ${state.status === 'launching' ? 'jb-demo-launching' : state.status === 'closing' ? 'jb-demo-closing' : ''}`} />

      {/* Light Sweep Flare */}
      <div className={`jb-demo-light-sweep ${state.status === 'launching' ? 'jb-demo-launching' : ''}`} />

      {/* Top Header Bar */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          padding: '0 24px',
          background: 'rgba(7, 7, 10, 0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--neu-border-bevel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 80,
        }}
      >
        {/* Title + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: '-0.3px',
                color: '#ffffff',
              }}
            >
              JBSnap <span style={{ color: '#a1a1aa' }}>Interactive Demo Stage</span>
            </h2>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

          {/* Active Scenario Badge */}
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#a5b4fc',
              fontWeight: 700,
            }}
          >
            {state.scenario.method} {state.scenario.path}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: '#64748b',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Shield size={12} color="#10b981" /> Fastify v5.8 Edge Gateway
          </div>
        </div>

        {/* Exit Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              color: '#64748b',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Press <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: 4, color: '#e2e8f0' }}>Esc</kbd> to exit
          </span>

          <button
            onClick={() => close()}
            aria-label="Exit Demo Stage"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border-bevel)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              boxShadow: 'var(--neu-flat-xs)',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* First-time Guidance Coach-mark */}
      {state.firstTimeHintVisible && (
        <div
          role="note"
          style={{
            position: 'absolute',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 17, 26, 0.94)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: 12,
            padding: '10px 18px',
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.25)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'jb-demo-fade-up 0.4s ease-out forwards',
          }}
        >
          <Sparkles size={15} color="#818cf8" />
          <span style={{ fontSize: 12.5, color: '#ffffff', fontWeight: 600 }}>
            Press <strong style={{ color: '#a5b4fc' }}>Send Request</strong> to fire a packet. Click any node to inspect live payloads.
          </span>
          <button
            onClick={dismissHint}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 11,
              color: '#64748b',
              marginLeft: 6,
              textDecoration: 'underline',
            }}
          >
            Got it
          </button>
        </div>
      )}

      {/* Main Full-Bleed Pipeline Canvas Viewport */}
      <main
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <PipelineCanvas
          stages={state.scenario.stages}
          activeStageIndex={state.activeStageIndex}
          completedStageIndices={state.completedStageIndices}
          failedStageIndex={state.failedStageIndex}
          selectedStageId={state.selectedStageId}
          progress={state.progress}
          isRunning={state.status === 'running'}
          isFinished={state.status === 'finished'}
          onSelectNode={(stageId) => selectStage(stageId)}
          isReducedMotion={isReducedMotion}
        />
      </main>

      {/* Floating HUD Panels */}
      {/* 1. Left Rail: Stage List */}
      <LeftRail
        stages={state.scenario.stages}
        activeStageIndex={state.activeStageIndex}
        completedStageIndices={state.completedStageIndices}
        failedStageIndex={state.failedStageIndex}
        selectedStageId={state.selectedStageId}
        onSelectNode={(stageId) => selectStage(stageId)}
      />

      {/* 2. Tracer Log HUD (Bottom-Left) */}
      <TracerLog
        logs={state.logs}
        activeStageIndex={state.activeStageIndex}
      />

      {/* 3. Controls Dock (Bottom-Center) */}
      <ControlsDock
        scenario={state.scenario}
        scenarioId={state.scenarioId}
        chaos={state.chaos}
        speed={state.speed}
        progress={state.progress}
        elapsedMs={state.elapsedMs}
        isRunning={state.status === 'running'}
        isPaused={state.status === 'paused'}
        isFinished={state.status === 'finished'}
        isError={state.status === 'error'}
        onSendRequest={sendRequest}
        onTogglePlayPause={togglePlayPause}
        onStep={step}
        onReplay={replay}
        onSeek={seek}
        onSetSpeed={setSpeed}
        onSelectScenario={setScenario}
        onToggleChaos={toggleChaos}
        activeStageIndex={state.activeStageIndex}
      />

      {/* 4. Node Inspector Drawer (Right) */}
      <Inspector
        stage={selectedStage}
        isOpen={selectedStage !== null}
        onClose={() => selectStage(null)}
        activeStageIndex={state.activeStageIndex}
        stageIndex={selectedStageIndex}
      />
    </div>
  );

  return createPortal(portalContent, document.body);
};
