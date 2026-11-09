'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, BASE_URL_DIRECT } from '../services/api';
import { io } from 'socket.io-client';
import {
  Zap, Shield, BarChart3, Globe, Lock, Database, CheckCircle,
  Terminal, Layers, GitBranch, Activity, Code2,
  Cpu, Play, TrendingUp, Server, Clock, Star, Users,
  ArrowUpRight, ChevronRight, Package, Box, Wifi, BarChart2,
  Eye, Sliders, AlertCircle, RefreshCw, Volume2, VolumeX, Brain, Settings, Download, Bell,
  Check, X, Minus
} from 'lucide-react';

/* ─── Logo ──────────────────────────────────── */
function Logo({ size = 28 }: { size?: number }) {
  return <img src="/logo.jpg" alt="JBSnap" width={size} height={size} style={{ objectFit: 'cover', borderRadius: '50%' }} />;
}

/* ─── Intersection Observer Hook ──────────────── */
function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Reveal Wrapper ───────────────────────────── */
type RevealDir = 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';
function Reveal({
  children, delay = 0, direction = 'up', className = '', threshold = 0.12, style = {}
}: {
  children: React.ReactNode; delay?: number; direction?: RevealDir;
  className?: string; threshold?: number; style?: React.CSSProperties;
}) {
  const { ref, visible } = useScrollReveal(threshold);
  const initial: Record<RevealDir, string> = {
    up:    'translateY(32px)',
    down:  'translateY(-32px)',
    left:  'translateX(-32px)',
    right: 'translateX(32px)',
    scale: 'scale(0.93)',
    none:  'none',
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : initial[direction],
        transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
        ...style
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated Counter ─────────────────────────── */
function AnimCounter({ to, suffix = '', duration = 2000 }: { to: number; suffix?: string; duration?: number }) {
  const { ref, visible } = useScrollReveal(0.3);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start: number;
    const run = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setVal(Math.round(to * ease));
      if (prog < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [visible, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Typewriter ────────────────────────────────── */
function Typewriter({ words }: { words: string[] }) {
  const [display, setDisplay] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[idx];
    const timer = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1));
        if (charIdx + 1 === word.length) setTimeout(() => setDeleting(true), 1800);
        else setCharIdx(c => c + 1);
      } else {
        setDisplay(word.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setIdx(i => (i + 1) % words.length);
          setCharIdx(0);
        } else setCharIdx(c => c - 1);
      }
    }, deleting ? 28 : 62);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, words]);

  return (
    <span style={{ color: '#ffffff' }}>
      {display}
      <span style={{ borderRight: '2px solid #ffffff', marginLeft: 1, animation: 'blink 1s step-end infinite' }} />
    </span>
  );
}

/* ─── Section Divider ─────────────────────────── */
function SectionDivider({ color = 'rgba(255,255,255,0.12)' }: { color?: string }) {
  return (
    <div style={{ position: 'relative', height: 1, overflow: 'visible' }}>
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: 1,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        width: '30%', height: 40,
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)',
        top: -20, pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ─── Nav ───────────────────────────────────────── */
function Nav({ activeIdx, setActiveIdx }: { activeIdx: number; setActiveIdx: React.Dispatch<React.SetStateAction<number>> }) {
  const scrolled = activeIdx > 0;

  const scrollTo = (id: string) => {
    const mapping: Record<string, number> = {
      features: 3,
      'how-it-works': 4,
      pricing: 6
    };
    if (id in mapping) {
      const idx = mapping[id];
      setActiveIdx(idx);
      const el = document.getElementById(`slide-inner-${idx}`);
      if (el) el.scrollTop = 0;
    }
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      background: scrolled ? 'rgba(15, 18, 25, 0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px) saturate(200%)' : 'none',
      borderBottom: scrolled ? '1px solid var(--neu-border)' : '1px solid transparent',
      boxShadow: scrolled ? 'var(--neu-flat-sm)' : 'none',
      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setActiveIdx(0)}>
          <Logo size={26} />
          <span style={{ fontSize: 17, fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff' }}>
            JB<span style={{ color: '#a1a1aa' }}>Snap</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 40 }}>
          {[
            { name: 'Features', id: 'features' },
            { name: 'How it Works', id: 'how-it-works' },
            // { name: 'Pricing', id: 'pricing' },
          ].map(l => (
            <button key={l.name} onClick={() => scrollTo(l.id)} style={{
              all: 'unset', padding: '7px 16px', borderRadius: 10, fontSize: 13.5, fontWeight: 500,
              color: 'rgba(148,163,184,0.85)', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'var(--neu-surface)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.85)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            >{l.name}</button>
          ))}
          <a href="/docs" style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 13.5, fontWeight: 500,
            color: 'rgba(148,163,184,0.85)', textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'var(--neu-surface)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.85)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          >Docs</a>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/login" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
            color: '#94a3b8', textDecoration: 'none', transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'var(--neu-surface)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          >Sign in</a>
          <a href="/register" style={{
            padding: '9px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
            color: '#000000', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '4px 4px 12px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.1)',
            transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '6px 6px 18px rgba(0,0,0,0.7), -3px -3px 10px rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 12px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.1)'; }}
          >Get Started Free</a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero Section ──────────────────────────────── */
function Hero({ onWatchDemoClick }: { onWatchDemoClick: (e: React.MouseEvent) => void }) {
  const [mounted, setMounted] = useState(false);
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 60);
  }, []);

  return (
    <section className="hero-redesign">
      {/* Background Layers */}
      <div className="hero-grid-overlay" />
      <div className="hero-grain-overlay" />
      
      {/* Layer 3: Animated mesh gradients */}
      <div className="hero-mesh-overlay">
        <div className="hero-mesh-blue" />
        <div className="hero-mesh-indigo" />
        <div className="hero-mesh-purple" />
      </div>

      {/* Layer 4: Large radial glow behind animation */}
      <div className="hero-glow-behind-animation" />

      {/* Environmental reflection for left side */}
      <div className="hero-left-reflection" />

      <div className="hero-container">
        <div className="hero-grid">
          
          {/* LEFT COLUMN */}
          <div className="hero-left-content" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(44px, 5.5vw, 68px)',
              fontWeight: 900,
              letterSpacing: '-2.5px',
              lineHeight: 1.04,
              marginBottom: 28, // Spacing Headline -> Paragraph: 28px
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#ffffff',
            }}>
              Build APIs at the<br />
              <span style={{ color: '#e4e4e7' }}>
                speed of thought.
              </span>
            </h1>

            {/* Supporting Paragraph */}
            <p style={{
              fontSize: 18,
              color: '#94a3b8',
              maxWidth: 540,
              lineHeight: 1.6,
              marginBottom: 40, // Spacing Paragraph -> CTA: 40px
            }}>
              Drag. Drop. Deploy. No boilerplate, no config files - just production-ready APIs designed visually and exported in type-safe TypeScript.
            </p>

            {/* CTA Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <Link
                href="/register"
                className="hero-btn-primary"
                onMouseEnter={() => setIsPrimaryHovered(true)}
                onMouseLeave={() => setIsPrimaryHovered(false)}
              >
                Start Building Free
              </Link>
              <a
                href="#demo"
                onClick={onWatchDemoClick}
                className="hero-btn-secondary"
                onMouseEnter={() => setIsSecondaryHovered(true)}
                onMouseLeave={() => setIsSecondaryHovered(false)}
              >
                <Play size={13} fill="currentColor" /> Watch Demo
              </a>
            </div>


            {/* Trust Indicators */}
            <div style={{
              marginTop: 32, // Spacing CTA -> Trust Indicators: 32px
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              flexWrap: 'wrap',
            }}>
              {[
                { icon: <Shield size={13} />, text: 'SOC2 Ready' },
                { icon: <Lock size={13} />, text: 'JWT Gateway' },
                { icon: <GitBranch size={13} />, text: 'GitHub Sync' },
                { icon: <Zap size={13} />, text: 'Sub-ms Routing' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#475569' }}>
                  <span style={{ color: '#475569' }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="hero-video-wrapper" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'scale(0.97)',
            transition: 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1) 150ms, transform 1s cubic-bezier(0.16, 1, 0.3, 1) 150ms',
          }}>
            <div className="hero-video-container">
              <video
                className="hero-video-element"
                src="/upscaled-video.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Watch Demo Component ──────────────────────── */
function WatchDemo({ playTrigger = 0 }: { playTrigger?: number }) {
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<any>(null);

  const demoSteps = [
    { name: '1. HTTP Trigger', desc: 'Incoming request on wildcard edge gateway', log: '[Gateway] GET /api/v1/users', color: '#6366f1' },
    { name: '2. Auth Guard', desc: 'Verify JWT signature & encryption key', log: '[Auth] Validated JWT signature for user_id: 981', color: '#a78bfa' },
    { name: '3. JS Sandbox', desc: 'Secure Node.js VM isolated logic', log: '[Sandbox] Executing custom logic mapping block (took 2.4ms)', color: '#f59e0b' },
    { name: '4. Neon DB', desc: 'PostgreSQL database query via Prisma', log: '[Prisma] SELECT * FROM "User" LIMIT 50 (took 14ms)', color: '#38bdf8' },
    { name: '5. Response', desc: 'Fastify returns response JSON schema', log: '[Response] 200 OK returned with payload (240 bytes)', color: '#10b981' }
  ];

  const playDemo = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setActiveStep(0);
    setLogs([demoSteps[0].log]);
    
    let current = 0;
    const runNext = () => {
      if (current >= demoSteps.length - 1) {
        timerRef.current = setTimeout(() => {
          setIsPlaying(false);
          setActiveStep(-1);
        }, 2500);
        return;
      }
      current += 1;
      setActiveStep(current);
      setLogs(prev => [...prev, demoSteps[current].log]);
      timerRef.current = setTimeout(runNext, 1600);
    };
    timerRef.current = setTimeout(runNext, 1600);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playTrigger > 0) {
      const timer = setTimeout(() => {
        playDemo();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [playTrigger]);


  return (
    <section id="demo" style={{ padding: '32px 32px 120px', position: 'relative', background: 'var(--neu-base)' }}>
      <SectionDivider />
      <div style={{ maxWidth: 1280, margin: '24px auto 0', position: 'relative', zIndex: 5 }}>
        <Reveal direction="up">
          <div style={{ marginBottom: 56, textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.8px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1.06, marginBottom: 12 }}>
              Watch Demo
            </h2>
            <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.6, margin: '0 auto', maxWidth: 640 }}>
              See how JBSnap intercepts gateway requests, validates authorization, runs isolated sandboxed scripts, and queries databases visually.
            </p>
          </div>
        </Reveal>

        <div className="watch-demo-grid">
          {/* Left: Steps and Play trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {demoSteps.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div key={idx} style={{
                    display: 'flex', gap: 16, padding: '16px 20px', borderRadius: 16,
                    background: isActive ? 'var(--neu-surface)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--neu-border-bevel)' : 'transparent'}`,
                    boxShadow: isActive ? 'var(--neu-flat-sm)' : 'none',
                    transition: 'all 0.4s ease',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isActive ? `${step.color}20` : 'var(--neu-surface)',
                      border: `1.5px solid ${isActive ? step.color : 'var(--neu-border)'}`,
                      boxShadow: isActive ? `0 0 16px ${step.color}40, var(--neu-flat-xs)` : 'var(--neu-flat-xs)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? step.color : '#64748b', fontSize: 12, fontWeight: 700,
                      transition: 'all 0.4s ease', flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: isActive ? '#ffffff' : '#cbd5e1', margin: '0 0 4px 0', transition: 'color 0.4s' }}>{step.name}</h4>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <button
                onClick={playDemo}
                disabled={isPlaying}
                style={{
                  padding: '16px 36px', borderRadius: 14,
                  background: isPlaying ? 'var(--neu-surface)' : 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                  color: isPlaying ? '#64748b' : '#000000',
                  fontSize: 15, fontWeight: 700,
                  border: isPlaying ? '1px solid var(--neu-border)' : '1px solid rgba(255, 255, 255, 0.45)',
                  cursor: isPlaying ? 'not-allowed' : 'pointer',
                  boxShadow: isPlaying ? 'var(--neu-pressed-sm)' : '6px 6px 16px rgba(0, 0, 0, 0.6), -4px -4px 12px rgba(255, 255, 255, 0.12), 0 0 20px rgba(255, 255, 255, 0.15)',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex', alignItems: 'center', gap: 10
                }}
              >
                {isPlaying ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" /> Play Interactive Demo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Visual Node Graph & Terminal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Visual Canvas Simulator */}
            <div style={{
              background: 'var(--neu-surface)', border: '1px solid var(--neu-border)',
              borderRadius: 20, padding: 32, minHeight: 280, display: 'flex',
              boxShadow: 'var(--neu-flat)',
              flexDirection: 'column', justifyContent: 'center', position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', position: 'absolute', top: 20, left: 24 }}>
                Visual Pipeline Canvas
              </div>

              {/* Grid dots background */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.12,
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
                backgroundSize: '20px 20px', zIndex: 1
              }} />

              {/* Connective path */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                <path d="M 60 140 H 500" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                {activeStep >= 0 && (
                  <path
                    d={`M 60 140 H ${60 + (activeStep * 100)}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.5s ease' }}
                  />
                )}
              </svg>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 3, padding: '0 10px' }}>
                {demoSteps.map((step, idx) => {
                  const isActive = activeStep === idx;
                  const isCompleted = activeStep > idx;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 54, height: 54, borderRadius: 16,
                        background: isActive ? 'linear-gradient(145deg, #202636, #161a25)' : (isCompleted ? 'linear-gradient(145deg, #13241d, #0f1c16)' : 'var(--neu-surface)'),
                        border: `1.5px solid ${isActive ? step.color : (isCompleted ? '#10b98160' : 'var(--neu-border)')}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isActive ? step.color : (isCompleted ? '#10b981' : '#475569'),
                        boxShadow: isActive ? `0 0 20px ${step.color}35, var(--neu-flat-sm)` : 'var(--neu-flat-xs)',
                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: isActive ? 'scale(1.08)' : 'none'
                      }}>
                        {idx === 0 && <Globe size={20} />}
                        {idx === 1 && <Lock size={20} />}
                        {idx === 2 && <Cpu size={20} />}
                        {idx === 3 && <Database size={20} />}
                        {idx === 4 && <CheckCircle size={20} />}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: isActive ? '#ffffff' : (isCompleted ? '#10b981' : '#475569'),
                        transition: 'color 0.5s'
                      }}>
                        {step.name.split('. ')[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Terminal Log Panel */}
            <div style={{
              background: 'var(--neu-sunken)', border: '1px solid var(--neu-border)',
              borderRadius: 16, padding: '18px 24px', minHeight: 150, display: 'flex',
              flexDirection: 'column', gap: 10, fontFamily: 'monospace', fontSize: 13,
              boxShadow: 'var(--neu-pressed-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 10, marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57', boxShadow: '0 0 6px rgba(255,95,87,0.5)' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e', boxShadow: '0 0 6px rgba(254,188,46,0.5)' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840', boxShadow: '0 0 6px rgba(40,200,64,0.5)' }} />
                </div>
                <span style={{ fontSize: 10.5, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Edge Tracer Log</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#64748b' }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#334155', fontStyle: 'italic' }}>Terminal idle. Press Play to stream live traces...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{
                      color: i === logs.length - 1 ? '#cbd5e1' : '#475569',
                      animation: 'fadeIn 0.3s ease forwards',
                      lineHeight: 1.5
                    }}>{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Section: Live Telemetry Dashboard ─── */
function StatsBar() {
  const [realtimeStats, setRealtimeStats] = useState<{
    totalProjects: number;
    totalWorkflows: number;
    totalRequests: number;
    avgLatency: number;
  } | null>(null);

  const [chartData, setChartData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time statistics from backend database
  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const fetchStats = () => {
      fetch(`${BASE_URL}/api/public-stats`)
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then(data => {
          if (data.status === 'success') {
            setRealtimeStats(data);
            setIsLoading(false);
          }
        })
        .catch(() => {
          // Keep loading/blur state if offline
        });
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Update animated SVG chart data points
  useEffect(() => {
    if (isLoading || !realtimeStats) return;
    
    // Initialize chartData on first fetch
    if (chartData.length === 0) {
      setChartData(Array(12).fill(realtimeStats.avgLatency));
      return;
    }

    const interval = setInterval(() => {
      const base = realtimeStats.avgLatency;
      const nextVal = Math.max(2, base + Math.floor(Math.random() * 8) - 4);
      setChartData(prev => [...prev.slice(1), nextVal]);
    }, 2000);
    return () => clearInterval(interval);
  }, [realtimeStats, isLoading, chartData.length]);

  // Map database telemetry to cards
  const stats = [
    {
      value: realtimeStats?.totalProjects ?? 0,
      suffix: '',
      label: 'API Projects',
      micro: 'Configured visual app containers',
      icon: <Box size={18} />,
      color: '#6366f1',
      trend: 'DB ACTIVE',
    },
    {
      value: realtimeStats?.totalWorkflows ?? 0,
      suffix: '',
      label: 'Active Workflows',
      micro: 'Published Visual DAG pipelines',
      icon: <Layers size={18} />,
      color: '#a78bfa',
      trend: 'DB ACTIVE',
    },
    {
      value: realtimeStats?.totalRequests ?? 0,
      suffix: '',
      label: 'Requests Routed',
      micro: 'Traced execution logs processed',
      icon: <Zap size={18} />,
      color: '#38bdf8',
      trend: 'DB ACTIVE',
    },
    {
      value: realtimeStats?.avgLatency ?? 0,
      suffix: 'ms',
      label: 'Avg Response',
      micro: 'Gateway routing performance',
      icon: <Activity size={18} />,
      color: '#10b981',
      trend: 'DB ACTIVE',
    },
  ];

  // Draw animated chart paths (safely scaling dynamically to avoid overflow)
  let areaPath = '';
  let linePath = '';
  if (chartData.length > 0) {
    const maxVal = Math.max(...chartData, 35); // Keep at least 35 as the scale baseline
    const svgPoints = chartData
      .map((val, idx) => `${(idx * 560) / (chartData.length - 1)},${70 - (val / maxVal) * 55}`)
      .join(' L ');
    areaPath = `M 0,80 L ${svgPoints} L 560,80 Z`;
    linePath = `M ${svgPoints}`;
  }

  return (
    <section style={{ padding: '32px 32px 120px', position: 'relative', background: 'var(--neu-base)', overflow: 'hidden' }}>
      <SectionDivider />
      
      {/* Soft background glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.015) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ maxWidth: 1280, margin: '24px auto 0', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center' }}>
          
          {/* LEFT: Spacial Content Block */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Reveal direction="up">
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.8px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1.06, marginBottom: 12 }}>
                Live Telemetry
              </h2>
              <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.6, marginBottom: 36, maxWidth: 500 }}>
                Real-time performance metrics pulled directly from our application database. Monitor active projects, workflows, gateway executions, and routing latencies.
              </p>
            </Reveal>

            {/* Micro feature rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { title: 'Prisma / Database Telemetry', desc: 'Directly aggregates records from your PostgreSQL instance.', color: '#6366f1' },
                { title: 'API Gateway Tracing', desc: 'Registers routed HTTP traffic latency with microsecond precision.', color: '#10b981' },
                { title: 'Zero Cache Guarantees', desc: 'Performance records sync every 10s to reflect true infrastructure load.', color: '#38bdf8' },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 80} direction="up">
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff', marginTop: 8, boxShadow: '0 0 10px rgba(255, 255, 255, 0.6), inset 0 0 2px #ffffff' }} />
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>{f.title}</div>
                      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{f.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* RIGHT: Live Stats Grid + Latency Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>

            {/* Content while loading */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              pointerEvents: isLoading ? 'none' : 'auto',
            }}>
              {/* 2x2 Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {stats.map((s, i) => {
                  const [hov, setHov] = useState(false);
                  return (
                    <Reveal key={s.label} delay={i * 90} direction="up">
                      <div
                        onMouseEnter={() => setHov(true)}
                        onMouseLeave={() => setHov(false)}
                        style={{
                          padding: '24px 20px',
                          background: 'var(--neu-surface)',
                          border: `1px solid ${hov ? 'var(--neu-border-bevel)' : 'var(--neu-border)'}`,
                          borderRadius: 20,
                          position: 'relative',
                          transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                          transform: hov ? 'translateY(-3px)' : 'none',
                          boxShadow: hov ? 'var(--neu-flat-lg)' : 'var(--neu-flat)',
                          minHeight: 140,
                        }}
                      >
                        <div style={{
                          opacity: isLoading ? 0 : 1,
                          filter: isLoading ? 'blur(10px)' : 'none',
                          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), filter 0.6s cubic-bezier(0.16,1,0.3,1)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                              {s.icon}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#ffffff', background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-flat-xs)', padding: '3px 9px', borderRadius: 99, letterSpacing: '0.04em' }}>
                              {s.trend}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1, marginBottom: 4 }}>
                            <AnimCounter to={s.value} suffix={s.suffix} />
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#94a3b8', marginBottom: 2 }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>{s.micro}</div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>

              {/* Latency line chart card */}
              <Reveal direction="up" delay={200}>
                <div style={{
                  padding: '24px 28px',
                  background: 'var(--neu-surface)',
                  border: '1px solid var(--neu-border)',
                  borderRadius: 20,
                  boxShadow: 'var(--neu-flat)',
                  position: 'relative',
                  minHeight: 172,
                }}>
                  <div style={{
                    opacity: isLoading ? 0 : 1,
                    filter: isLoading ? 'blur(10px)' : 'none',
                    transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), filter 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Gateway Latency Tracker</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>Continuous response latency check (P95 global)</div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', padding: '3px 10px', borderRadius: 99 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
                        GATEWAY OPERATIONAL
                      </span>
                    </div>

                    <div style={{ position: 'relative', height: 80, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      {/* SVG Chart */}
                      <svg viewBox="0 0 560 80" width="100%" height="80" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area fill */}
                        {areaPath && <path d={areaPath} fill="url(#chartGlow)" style={{ transition: 'all 0.5s ease' }} />}
                        {/* Glowing Stroke */}
                        {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.5s ease', filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }} />}
                      </svg>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Platform Capabilities ─────────────────────── */
const FEATURES = [
  { icon: <Layers size={22} />, title: 'Visual Workflow Canvas', desc: 'Drag-and-drop 12+ node types: HTTP triggers, DB queries, JWT auth, custom code, conditionals, cron schedulers. Build complex pipelines visually without writing a single config file.', color: '#6366f1', wide: true },
  { icon: <Shield size={22} />, title: 'Enterprise Gateway', desc: 'JWT, API keys, rate limiting, CORS: all configurable per-endpoint, zero config files.', color: '#10b981', wide: false },
  { icon: <Cpu size={22} />, title: 'Secure VM Sandbox', desc: 'Custom JS runs inside isolated Node.js VMs. Hard 200ms CPU timeout. No `process`, no `require`.', color: '#38bdf8', wide: false },
  { icon: <Code2 size={22} />, title: 'TypeScript Export', desc: 'One click compiles your visual pipeline into clean Fastify + Prisma + TypeScript.', color: '#a78bfa', wide: false },
  { icon: <Cpu size={22} />, title: 'AI Workflow Generator', desc: 'Describe your API in plain English. JBSnap AI generates the complete node graph instantly.', color: '#f59e0b', wide: false },
  { icon: <Activity size={22} />, title: 'Real-Time Analytics', desc: 'Live Socket.IO metrics. Monitor latency, throughput, error rates, and per-route heatmaps.', color: '#ec4899', wide: false, fullWidth: true },
];

/* ─── Mini Canvas Demo (for featured card) ─────── */
function MiniCanvasDemo() {
  return (
    <div style={{ width: '100%', marginTop: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ position: 'relative', height: 220, background: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '20px 20px', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <path d="M 84 110 C 92 110 92 50 100 50" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.7" strokeDasharray="4 3" />
          <path d="M 176 50 C 215 50 215 170 255 170" fill="none" stroke="#a5b4fc" strokeWidth="1.5" opacity="0.7" />
          <path d="M 331 170 C 370 170 370 110 410 110" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
          <circle r="3" fill="#6366f1">
            <animateMotion dur="2s" repeatCount="indefinite" path="M 84 110 C 92 110 92 50 100 50" />
          </circle>
          <circle r="3" fill="#10b981">
            <animateMotion dur="2.3s" repeatCount="indefinite" begin="0.6s" path="M 331 170 C 370 170 370 110 410 110" />
          </circle>
        </svg>
        {[
          { l: 'Trigger', c: '#6366f1', x: 8, y: 95 },
          { l: 'Auth', c: '#a5b4fc', x: 100, y: 35 },
          { l: 'DB Query', c: '#38bdf8', x: 255, y: 155 },
          { l: 'Response', c: '#10b981', x: 410, y: 95 },
        ].map((n, i) => (
          <div key={i} style={{
            position: 'absolute', left: n.x, top: n.y,
            width: 76, padding: '5px 0', borderRadius: 7,
            background: 'rgba(6,6,8,0.95)', border: `1px solid ${n.c}30`,
            fontSize: 9.5, fontWeight: 700, color: '#cbd5e1',
            borderTop: `1.5px solid ${n.c}60`, textAlign: 'center'
          }}>
            {n.l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Mini Analytics Demo (for full-width card) ─── */
function MiniAnalyticsDemo() {
  const [data, setData] = useState([40, 65, 30, 85, 45, 95, 60, 75, 50, 90, 35, 70]);
  const [activeSockets, setActiveSockets] = useState(1);
  const lastRealMetricTime = useRef<number>(0);

  useEffect(() => {
    const socket = io(BASE_URL_DIRECT);

    socket.on("global-connections", (d: { count: number }) => {
      if (d && typeof d.count === "number") {
        setActiveSockets(d.count);
      }
    });

    socket.on("global-metrics", (m: any) => {
      lastRealMetricTime.current = Date.now();
      const latency = m.latencyMs || 0;
      const heightPercent = Math.max(15, Math.min(Math.round((latency / 400) * 110) + 15, 95));
      
      setData(prev => {
        const next = [...prev.slice(1)];
        next.push(heightPercent);
        return next;
      });
    });

    // Fallback simulation when no live backend traffic is detected for 8 seconds
    const interval = setInterval(() => {
      const isIdle = Date.now() - lastRealMetricTime.current > 8000;
      if (isIdle) {
        setData(prev => {
          const next = [...prev.slice(1)];
          const val = Math.floor(Math.random() * 85) + 20; // 20% to 105%
          next.push(val);
          return next;
        });
      }
    }, 1000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 12, padding: 18, width: '100%', minHeight: 220,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      flex: 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live Analytics Stream</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>{activeSockets} active sockets</div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 140, paddingBottom: 4 }}>
        {data.map((val, idx) => (
          <div key={idx} style={{
            flex: 1, background: 'linear-gradient(to top, rgba(236,72,153,0.05), rgba(236,72,153,0.35))',
            height: `${val}%`, borderRadius: 2, transition: 'height 0.4s ease',
            borderTop: '1.5px solid #ec4899',
            boxShadow: '0 0 10px rgba(236,72,153,0.1)'
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Interactive Feature Bullet Sets ─────────── */

const BULLET_SETS = [
  // 0. Visual Canvas
  [
    "Drag and drop trigger nodes, database queries, and custom script blocks.",
    "Link nodes with visual edges to establish synchronous execution paths.",
    "Verify node structures in real time to form valid execution trees."
  ],
  // 1. Enterprise Gateway
  [
    "Configure JWT check barriers on HTTP trigger endpoint pathways.",
    "Enforce global rate limiting rules to block client request floods.",
    "Whitelist gateway access with custom cross-origin header rules."
  ],
  // 2. Secure VM Sandbox
  [
    "Execute custom business logic inside isolated Node.js containers.",
    "Prevent memory leaks and CPU hangs with strict 200ms processing timeouts.",
    "Run clean script executions with complete environment isolation."
  ],
  // 3. TypeScript Export
  [
    "Compile visual schemas into modular Fastify router files instantly.",
    "Output type-safe database queries via automated Prisma model schema generation.",
    "Build fully decoupled server packages ready for Fly.io, Railway, or VPS."
  ],
  // 4. AI Workflow Generator
  [
    "Translate raw English instructions into visual workflow structures.",
    "Instantly map query variables, endpoints, and method routes.",
    "Iterate and refine generated pipeline node settings dynamically."
  ],
  // 5. Real-Time Analytics
  [
    "Trace execution latencies, gateway status codes, and trace logs.",
    "Track active WebSocket connections and network throughput spikes.",
    "Pinpoint performance issues and slow database queries dynamically."
  ]
];

/* ─── Interactive Showcase Visualizers ─────────── */

function VisualizerGateway() {
  const [pulseStage, setPulseStage] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseStage(p => (p + 1) % 4);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', height: 160, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 20px', overflow: 'hidden', width: '100%' }}>
      <div style={{ position: 'absolute', left: 40, right: 40, height: 1.5, background: 'rgba(255,255,255,0.06)', zIndex: 1 }} />
      
      <div style={{
        position: 'absolute',
        left: 40,
        width: `${(pulseStage + 1) * 25}%`,
        height: 1.5,
        background: 'linear-gradient(to right, transparent, #10b981)',
        zIndex: 1,
        transition: 'all 0.5s ease-out'
      }} />

      <div style={{
        zIndex: 2,
        padding: '6px 12px',
        background: pulseStage === 0 ? 'rgba(16,185,129,0.15)' : '#050508',
        border: `1px solid ${pulseStage === 0 ? '#10b981' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
        fontSize: 10,
        fontFamily: 'monospace',
        color: pulseStage === 0 ? '#10b981' : '#64748b',
        transition: 'all 0.3s'
      }}>
        GET /products
      </div>

      <div style={{
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 10px',
        background: pulseStage === 1 ? 'rgba(16,185,129,0.1)' : '#050508',
        border: `1px solid ${pulseStage === 1 ? '#10b981' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
        fontSize: 10,
        color: pulseStage === 1 ? '#10b981' : '#94a3b8',
        transition: 'all 0.3s'
      }}>
        <Shield size={14} style={{ color: pulseStage === 1 ? '#10b981' : '#475569' }} />
        <span>Rate Limit OK</span>
      </div>

      <div style={{
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 10px',
        background: pulseStage === 2 ? 'rgba(16,185,129,0.1)' : '#050508',
        border: `1px solid ${pulseStage === 2 ? '#10b981' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
        fontSize: 10,
        color: pulseStage === 2 ? '#10b981' : '#94a3b8',
        transition: 'all 0.3s'
      }}>
        <Lock size={14} style={{ color: pulseStage === 2 ? '#10b981' : '#475569' }} />
        <span>JWT Valid</span>
      </div>

      <div style={{
        zIndex: 2,
        padding: '6px 12px',
        background: pulseStage === 3 ? 'rgba(16,185,129,0.2)' : '#050508',
        border: `1px solid ${pulseStage === 3 ? '#10b981' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
        fontSize: 10,
        fontFamily: 'monospace',
        color: pulseStage === 3 ? '#10b981' : '#64748b',
        fontWeight: 700,
        transition: 'all 0.3s'
      }}>
        200 OK
      </div>
    </div>
  );
}

function VisualizerSandbox() {
  const [logs, setLogs] = useState<string[]>([
    "[System] Spawning isolated NodeVM context...",
    "[Sandbox] CPU limit set to 200ms, Memory 128MB max.",
    "[Sandbox] Sandbox execution initialized."
  ]);
  
  useEffect(() => {
    const logsList = [
      "[Sandbox] Incoming payload parsed successfully.",
      "[Sandbox] Running custom customCodeNode transform functions...",
      "[Sandbox] Filtering sensitive response user metadata fields.",
      "[Sandbox] Garbage collection executed.",
      "[Sandbox] VM session disposed safely (took 2.4ms)."
    ];
    let counter = 0;
    const interval = setInterval(() => {
      if (counter < logsList.length) {
        setLogs(prev => [...prev, logsList[counter]]);
        counter++;
      } else {
        setLogs([
          "[System] Spawning isolated NodeVM context...",
          "[Sandbox] CPU limit set to 200ms, Memory 128MB max.",
          "[Sandbox] Sandbox execution initialized."
        ]);
        counter = 0;
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', background: '#030305', width: '100%' }}>
      <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', fontSize: 9.5, color: '#64748b', fontFamily: 'monospace', textAlign: 'left' }}>
        vm_isolated_worker.js
      </div>
      <pre style={{ margin: 0, padding: 12, fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', lineHeight: 1.4, overflowX: 'auto', textAlign: 'left' }}>
{`// Secure sandbox logic
const payload = context.request.body;
const cleanData = payload.map(u => ({
  id: u.id,
  email: u.email.toLowerCase()
}));
return { count: cleanData.length, cleanData };`}
      </pre>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#020202', padding: 10, maxHeight: 90, overflowY: 'hidden', fontSize: 10, fontFamily: 'monospace', color: '#a78bfa', textAlign: 'left' }}>
        {logs.slice(-3).map((l, idx) => <div key={idx}>{l}</div>)}
      </div>
    </div>
  );
}

function VisualizerExport() {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', background: '#030305', width: '100%' }}>
      <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', fontSize: 9.5, color: '#64748b', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
        <span>src/routes/api.ts</span>
        <span style={{ color: '#10b981', fontWeight: 700 }}>Compiled TS</span>
      </div>
      <pre style={{ margin: 0, padding: 12, fontSize: 10.5, fontFamily: 'monospace', color: '#a78bfa', lineHeight: 1.4, overflowX: 'auto', textAlign: 'left' }}>
{`import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

export async function apiRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  
  fastify.post('/products', async (request, reply) => {
    const data = request.body;
    return await prisma.product.create({ data });
  });
}`}
      </pre>
    </div>
  );
}

function VisualizerAi() {
  const [promptText, setPromptText] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const text = "Create a database API endpoint to retrieve users filtered by country.";
    let timer: any;
    let charIdx = 0;
    
    const runAnimation = () => {
      setStatus("typing");
      setPromptText("");
      charIdx = 0;
      
      const type = () => {
        if (charIdx < text.length) {
          setPromptText(prev => prev + text[charIdx]);
          charIdx++;
          timer = setTimeout(type, 45);
        } else {
          setStatus("compiling");
          timer = setTimeout(() => {
            setStatus("done");
            timer = setTimeout(runAnimation, 4500);
          }, 1500);
        }
      };
      
      timer = setTimeout(type, 500);
    };

    runAnimation();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', background: '#030305', padding: 14, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'monospace', color: '#64748b', marginBottom: 8 }}>
        <Cpu size={11} style={{ color: '#f59e0b' }} /> AI PROMPT INJECTOR
      </div>
      <div style={{
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 6,
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: 11.5,
        color: '#ffffff',
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left'
      }}>
        {promptText}
        {status === 'typing' && <span style={{ width: 1.5, height: 13, background: '#f59e0b', marginLeft: 2, display: 'inline-block', animation: 'pulse 1s infinite' }} />}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'monospace',
          padding: '3px 8px',
          borderRadius: 4,
          background: status === 'typing' ? 'rgba(255,255,255,0.04)' : (status === 'compiling' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'),
          border: `1px solid ${status === 'typing' ? 'rgba(255,255,255,0.08)' : (status === 'compiling' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)')}`,
          color: status === 'typing' ? '#64748b' : (status === 'compiling' ? '#f59e0b' : '#10b981'),
          fontWeight: 700,
          transition: 'all 0.3s'
        }}>
          {status === 'typing' ? 'WAITING FOR PROMPT...' : (status === 'compiling' ? 'SYNTHESIZING DAG...' : 'WORKFLOW SYNTHESIZED')}
        </div>
      </div>
    </div>
  );
}

function Features() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [scale, setScale] = useState(0.76);
  const [cardSize, setCardSize] = useState(400);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 480) {
        setScale(0.5);
        setCardSize(280);
      } else if (window.innerWidth < 640) {
        setScale(0.6);
        setCardSize(320);
      } else if (window.innerWidth < 900) {
        setScale(0.7);
        setCardSize(400);
      } else {
        setScale(0.76);
        setCardSize(400);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section id="features" style={{ padding: '80px 32px 140px', background: 'var(--neu-base)', overflow: 'hidden' }}>
      <SectionDivider />

      <div style={{ maxWidth: 1280, margin: '24px auto 0', textAlign: 'center' }}>
        <Reveal direction="up" threshold={0.1}>
          <div>
            <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.8px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1.06, marginBottom: 16 }}>
              Our Advanced <span style={{ background: 'linear-gradient(135deg, #05ffc4 0%, #00b887 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>features</span>
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 640, lineHeight: 1.6, margin: '0 auto 40px auto' }}>
              Compile pipelines visually, enforce API gateway policies, run custom scripts inside isolated containers, and monitor execution metrics in real-time.
            </p>
          </div>
        </Reveal>

        {/* Tab Bar Header (Top Navigation Capsule) */}
        <Reveal direction="up" delay={50}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <div style={{
              background: 'var(--neu-sunken)',
              border: '1px solid var(--neu-border)',
              padding: '6px',
              borderRadius: '99px',
              display: 'inline-flex',
              gap: '6px',
              maxWidth: '100%',
              overflowX: 'auto',
              boxShadow: 'var(--neu-pressed-sm)',
              scrollbarWidth: 'none',
            }} className="scroll-clean">
              {FEATURES.map((f, idx) => {
                const isActive = activeIdx === idx;
                return (
                  <button
                    key={f.title}
                    onClick={() => setActiveIdx(idx)}
                    style={{
                      all: 'unset',
                      padding: '8px 24px',
                      borderRadius: '99px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      background: isActive ? 'var(--neu-surface)' : 'transparent',
                      border: isActive ? '1px solid var(--neu-border-bevel)' : '1px solid transparent',
                      boxShadow: isActive ? 'var(--neu-flat-xs)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.title}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Split Content Area (Bottom) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 64, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
          
          {/* Left Side: Squircle Gravity Container with Interactive Visualizers */}
          <Reveal direction="left" delay={100}>
            <div style={{
              width: cardSize,
              height: cardSize,
              borderRadius: 48,
              background: '#040406',
              border: `2px solid rgba(255,255,255,0.06)`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.7), inset 0 0 40px ${FEATURES[activeIdx].color}08`,
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.4s ease-out, box-shadow 0.4s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}>
              {/* Colored light glow emanating from top-left */}
              <div style={{
                position: 'absolute',
                top: -30,
                left: -30,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: FEATURES[activeIdx].color,
                opacity: 0.12,
                filter: 'blur(40px)',
                transition: 'background 0.4s',
                pointerEvents: 'none'
              }} />

              {/* Grid dots overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                pointerEvents: 'none'
              }} />

              {/* Interactive Visualizer scaled down to fit */}
              <div style={{
                position: 'absolute',
                width: 500,
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: 'center center',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                zIndex: 2
              }}>
                {activeIdx === 0 && <MiniCanvasDemo />}
                {activeIdx === 1 && <VisualizerGateway />}
                {activeIdx === 2 && <VisualizerSandbox />}
                {activeIdx === 3 && <VisualizerExport />}
                {activeIdx === 4 && <VisualizerAi />}
                {activeIdx === 5 && <MiniAnalyticsDemo />}
              </div>
            </div>
          </Reveal>

          {/* Right Side: Feature Details with custom Check Circle Bullets */}
          <Reveal direction="right" delay={150}>
            <div style={{ flex: '1 1 420px', maxWidth: 480, textAlign: 'left' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: FEATURES[activeIdx].color,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: "'JetBrains Mono', monospace",
                transition: 'color 0.4s'
              }}>
                CAPABILITY OVERVIEW
              </span>
              
              <h3 style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#ffffff',
                margin: '12px 0 20px 0',
                letterSpacing: '-0.8px',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {FEATURES[activeIdx].title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {BULLET_SETS[activeIdx].map((bullet, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1.5px solid rgba(16,185,129,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 3
                    }}>
                      <CheckCircle size={11} style={{ color: '#10b981' }} />
                    </div>
                    <span style={{ fontSize: 14.5, color: '#cbd5e1', lineHeight: 1.6 }}>
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}

/* ─── How It Works: Visual Workflow Stages ──────── */
function HowItWorks() {
  const steps = [
    {
      num: '01', title: 'Design Visually',
      desc: 'Open the canvas. Drag HTTP triggers, database nodes, auth guards, and custom code blocks. Connect them with edges to define your data flow with zero YAML or hand-written routes.',
      color: '#6366f1', icon: <Layers size={24} />,
      visual: <StepVisual1 />,
    },
    {
      num: '02', title: 'Configure & Secure',
      desc: 'Click any node to open its inspector. Add JWT protection, set CORS policies, define rate limits, and write custom transformation logic in a clean GUI with live validation.',
      color: '#8b5cf6', icon: <Shield size={24} />,
      visual: <StepVisual2 />,
    },
    {
      num: '03', title: 'Deploy in One Click',
      desc: 'Hit publish. Your workflow goes live on the JBSnap gateway immediately. No build step, no Dockerfile, no server configuration. From canvas to live URL in under 3 seconds.',
      color: '#38bdf8', icon: <Zap size={24} />,
      visual: <StepVisual3 />,
    },
    {
      num: '04', title: 'Export & Own Everything',
      desc: 'Export clean Fastify + TypeScript code at any time. Push directly to GitHub, run on Railway, Fly.io, or your own bare metal. Zero vendor lock-in. Your code, your infra, always.',
      color: '#10b981', icon: <Code2 size={24} />,
      visual: <StepVisual4 />,
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: '32px 32px 100px', position: 'relative' }}>
      <SectionDivider />
      <div style={{ maxWidth: 1280, margin: '24px auto 0' }}>
        <Reveal direction="up">
          <div style={{ marginBottom: 80 }}>
            <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.8px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1.06, marginBottom: 12 }}>
              How It Works
            </h2>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#94a3b8', letterSpacing: '-0.5px', margin: 0 }}>
              From idea to production in minutes, not days.
            </h3>
          </div>
        </Reveal>

        {/* Alternating rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 80 }}>
          {steps.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <div key={step.num} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
                {/* Text: alternates left/right */}
                <Reveal direction={isEven ? 'left' : 'right'} delay={80} threshold={0.1}>
                  <div style={{ order: isEven ? 1 : 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 15,
                        background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ffffff',
                      }}>
                        {step.icon}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>STEP {step.num}</span>
                    </div>
                    <h3 style={{ fontSize: 'clamp(24px, 2.5vw, 34px)', fontWeight: 900, letterSpacing: '-1.2px', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16, color: '#ffffff' }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
                      {step.desc}
                    </p>
                    <a href="/docs" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 14, fontWeight: 700, color: '#ffffff',
                      textDecoration: 'none', opacity: 0.85,
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    >
                      Learn more <ArrowUpRight size={14} />
                    </a>
                  </div>
                </Reveal>

                {/* Visual: alternates right/left */}
                <Reveal direction={isEven ? 'right' : 'left'} delay={160} threshold={0.1}>
                  <div style={{ order: isEven ? 2 : 1 }}>
                    {step.visual}
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Step Visuals ────────────────────────────── */
function StepVisual1() {
  return (
    <div style={{ background: 'rgba(6,6,10,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Canvas Preview</div>
      <div style={{ position: 'relative', height: 160, background: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '20px 20px', borderRadius: 10, overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M 98 80 C 119 80 119 40 140 40" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
          <path d="M 230 40 C 266 40 266 120 302 120" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" />
          <path d="M 392 120 C 428 120 428 80 464 80" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
          <circle r="3" fill="#6366f1" opacity="0.9">
            <animateMotion dur="2s" repeatCount="indefinite" path="M 98 80 C 119 80 119 40 140 40" />
          </circle>
        </svg>
        {[
          { l: 'POST /login', c: '#6366f1', x: 8, y: 64 },
          { l: 'JWT Auth', c: '#a5b4fc', x: 140, y: 24 },
          { l: 'DB Query', c: '#38bdf8', x: 302, y: 104 },
          { l: '200 OK', c: '#10b981', x: 464, y: 64 },
        ].map((n, i) => (
          <div key={i} style={{
            position: 'absolute', left: n.x, top: n.y, width: 90, padding: '6px 0', borderRadius: 8,
            background: 'rgba(6,6,8,0.95)', border: `1px solid ${n.c}30`,
            fontSize: 10, fontWeight: 700, color: '#cbd5e1', borderTop: `1.5px solid ${n.c}60`,
            textAlign: 'center'
          }}>
            {n.l}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepVisual2() {
  return (
    <div style={{ background: 'rgba(6,6,10,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Node Inspector</div>
      <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><Lock size={13} /></div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' }}>JWT Validator</span>
        </div>
        {[['Algorithm', 'RS256'], ['Token Source', 'Authorization: Bearer'], ['Expiry Check', 'Enabled'], ['Rate Limit', '100 / min']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>{k}</span>
            <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 9, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 11, color: '#10b981', fontWeight: 700, textAlign: 'center' }}>✓ Validated</div>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 9, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11, color: '#818cf8', fontWeight: 700, textAlign: 'center' }}>Save Config</div>
      </div>
    </div>
  );
}

function StepVisual3() {
  return (
    <div style={{ background: 'rgba(6,6,10,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deploy Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981', fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s ease-in-out infinite' }} />
          Live
        </div>
      </div>
      {[
        { step: 'Parsing DAG', done: true },
        { step: 'Validating 4 nodes', done: true },
        { step: 'Generating routes', done: true },
        { step: 'Publishing to gateway', done: true, active: true },
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: 12.5 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: s.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${s.done ? '#10b981' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {s.done && <CheckCircle size={10} color="#10b981" />}
          </div>
          <span style={{ color: s.active ? '#f1f5f9' : '#64748b' }}>{s.step}</span>
          {s.active && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>2.1s</span>}
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
        <span style={{ color: '#475569' }}>$</span> <span style={{ color: '#10b981' }}>https://api.jbsnap.app/u/auth-service</span>
      </div>
    </div>
  );
}

function StepVisual4() {
  return (
    <div style={{ background: '#010101', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.75 }} />)}
        <span style={{ marginLeft: 8, fontSize: 10.5, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>terminal</span>
      </div>
      <div style={{ padding: '16px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.9 }}>
        {[
          { t: '$ jbsnap export auth-service', c: '#475569' },
          { t: '⠋ Compiling visual DAG...', c: '#94a3b8' },
          { t: '✔ Fastify routes generated (4)', c: '#f1f5f9' },
          { t: '✔ Prisma schema included', c: '#f1f5f9' },
          { t: '✔ Dockerfile bundled', c: '#f1f5f9' },
          { t: '✔ OpenAPI spec generated', c: '#38bdf8' },
          { t: '✔ Compiled → dist/ (4.2KB)', c: '#10b981' },
          { t: '✔ Pushed to github.com/you/auth-service', c: '#a78bfa' },
        ].map((l, i) => (
          <div key={i} style={{ color: l.c }}>{l.t}</div>
        ))}
      </div>
    </div>
  );
}

/* ─── API Flow Section ──────────────────────────── */
function APIFlowSection() {
  const { ref, visible } = useScrollReveal(0.15);

  const flowSteps = [
    { label: 'Client', sub: 'Browser / SDK', color: '#64748b', icon: <Globe size={16} /> },
    { label: 'Gateway', sub: 'JBSnap Edge', color: '#6366f1', icon: <Server size={16} /> },
    { label: 'JWT Auth', sub: 'RS256 Verified', color: '#8b5cf6', icon: <Lock size={16} /> },
    { label: 'DB Query', sub: 'Prisma ORM', color: '#38bdf8', icon: <Database size={16} /> },
    { label: 'Response', sub: '200 · 0.4ms', color: '#10b981', icon: <CheckCircle size={16} /> },
  ];

  return (
    <section id="lock-in" style={{ padding: '32px 32px 120px', position: 'relative', background: '#020202' }}>
      <SectionDivider />
      <div style={{ maxWidth: 1280, margin: '24px auto 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          {/* Left: Text */}
          <Reveal direction="left">
            <div>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.8px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1.06, marginBottom: 12 }}>
                Zero Lock-In
              </h2>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#10b981', letterSpacing: '-0.5px', marginBottom: 18 }}>
                Your code, your infrastructure. Always.
              </h3>
              <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
                Every visual pipeline compiles to clean, dependency-free Fastify + TypeScript. Export to GitHub, run on any cloud, with zero runtime dependency.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'OpenAPI / Swagger spec auto-generated',
                  'Prisma schema bundled with migration files',
                  'Production Dockerfile included',
                  'Push directly to GitHub via Octokit',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#94a3b8' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={11} color="#10b981" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Right: Flow diagram + Terminal */}
          <Reveal direction="right" delay={120}>
            <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* API Flow diagram */}
              <div style={{ background: 'rgba(6,6,10,0.65)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>API Request Flow</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {flowSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: `${step.color}12`, border: `1.5px solid ${step.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: step.color,
                          opacity: visible ? 1 : 0,
                          transform: visible ? 'none' : 'translateY(12px)',
                          transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
                        }}>
                          {step.icon}
                        </div>
                        <div style={{ textAlign: 'center', opacity: visible ? 1 : 0, transition: `opacity 0.5s ${i * 100 + 200}ms` }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0' }}>{step.label}</div>
                          <div style={{ fontSize: 9.5, color: '#475569', marginTop: 2 }}>{step.sub}</div>
                        </div>
                      </div>
                      {i < flowSteps.length - 1 && (
                        <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -24, color: '#334155' }}>
                          <svg width="20" height="8" viewBox="0 0 20 8">
                            <path d="M0 4 L14 4 M10 1 L14 4 L10 7" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: visible ? 1 : 0, transition: `opacity 0.4s ${i * 100 + 300}ms` }} />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Latency bar */}
                <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: '#475569' }}>Total roundtrip</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#10b981', fontWeight: 700 }}>0.4ms avg</div>
                </div>
              </div>

              {/* Terminal */}
              <div style={{ background: '#010101', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                  <span style={{ marginLeft: 6, fontSize: 10.5, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>terminal</span>
                </div>
                <div style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.85 }}>
                  {[
                    { t: '$ jbsnap compile auth-service', c: '#475569' },
                    { t: '✔ 4 nodes → Trigger → JWT → Prisma → Response', c: '#f1f5f9' },
                    { t: '✔ Generating Fastify routes...', c: '#f1f5f9' },
                    { t: '✔ Compiled in 18ms → dist/server.ts', c: '#10b981' },
                    { t: 'auth-service.zip  4.2KB  ✓', c: '#818cf8' },
                  ].map((l, i) => (
                    <div key={i} style={{
                      color: l.c, opacity: visible ? 1 : 0,
                      transform: visible ? 'none' : 'translateX(-8px)',
                      transition: `opacity 0.4s ${i * 80}ms, transform 0.4s ${i * 80}ms`,
                    }}>
                      {l.t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing Section ───────────────────────────── */
function PricingSection() {
  const plans = [
    {
      name: 'Free',
      icon: <Box size={20} color="#94a3b8" />,
      price: '₹0',
      period: 'forever',
      effective: '₹0 / mo',
      savings: null,
      desc: 'Perfect for students & beginners exploring visual API creation.',
      popular: false,
      badge: null,
      bestFor: 'Students & beginners',
      btnText: 'Get Started Free',
      btnHref: '/register',
      color: '#94a3b8',
      highlights: [
        '5 Projects maximum',
        '3 AI Workflow Generations / mo',
        'Visual API Builder & Testing',
        'Live Execution & Code Gen',
        'Download & GitHub Export',
        'Basic Templates',
        'Ad-supported experience',
      ],
    },
    {
      name: 'Pro Monthly',
      icon: <Zap size={20} color="#a5b4fc" />,
      price: '₹499',
      period: '/month',
      effective: '₹499 / mo',
      savings: null,
      desc: 'Built for regular developers crafting production-ready APIs.',
      popular: false,
      badge: 'FLEXIBLE',
      bestFor: 'Regular developers',
      btnText: 'Start Pro',
      btnHref: '/register?plan=PRO_MONTHLY',
      color: '#6366f1',
      highlights: [
        'Unlimited Projects',
        '12 AI Generations / mo',
        'Advanced Templates included',
        'Full Execution History',
        'Advanced Workflow Features',
        'Custom Workflows (Full)',
        'Advanced API Documentation',
        'Zero Ads & Priority Support',
      ],
    },
    {
      name: 'Pro Yearly',
      icon: <Star size={20} color="#f59e0b" fill="#f59e0b" />,
      price: '₹4999',
      period: '/year',
      effective: '₹417 / mo',
      savings: 'Save ₹989 annually',
      desc: 'Maximum savings and power for committed engineers & teams.',
      popular: true,
      badge: 'BEST VALUE: SAVE ₹989',
      bestFor: 'Long-term users',
      btnText: 'Choose Yearly',
      btnHref: '/register?plan=PRO_YEARLY',
      color: '#f59e0b',
      highlights: [
        'All Pro Monthly features',
        'Only ₹417 / mo effective price',
        'Unlimited Projects',
        '12 AI Generations / mo',
        'Advanced Templates included',
        'Full Execution History',
        'Zero Ads & Priority Support',
      ],
    },
  ];

  return (
    <section id="pricing" style={{ padding: '32px 32px 120px', position: 'relative', background: 'var(--neu-base)' }}>
      <SectionDivider />
      <div style={{ maxWidth: 1280, margin: '24px auto 0', position: 'relative', zIndex: 5 }}>
        <Reveal direction="up">
          <div style={{ marginBottom: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 99, background: 'var(--neu-surface)', border: '1px solid var(--neu-border)',
              boxShadow: 'var(--neu-flat-xs)',
              fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 16
            }}>
              <Zap size={12} color="#818cf8" /> Transparent Pricing
            </div>
            <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.8px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff', lineHeight: 1.06, marginBottom: 12 }}>
              Built for every developer scale
            </h2>
            <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.6, margin: '0 auto', maxWidth: 680 }}>
              Start for free as a student or beginner, or unlock unlimited workflows, AI synthesis, and ad-free productivity with Pro.
            </p>
          </div>
        </Reveal>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {plans.map((p, i) => {
            const isPro = p.popular;
            const isYearly = p.name === 'Pro Yearly';
            return (
              <Reveal key={p.name} delay={i * 80} direction="up" threshold={0.08}>
                <div style={{
                  padding: '36px 30px', borderRadius: 20, height: '100%',
                  background: 'var(--neu-surface)',
                  border: `1px solid ${isYearly ? 'rgba(245,158,11,0.35)' : isPro ? 'rgba(99,102,241,0.35)' : 'var(--neu-border)'}`,
                  boxShadow: isPro ? 'var(--neu-flat-lg), 0 0 28px rgba(99,102,241,0.15)' : 'var(--neu-flat)',
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                }}
                  className="pricing-card"
                >
                  {p.badge && (
                    <span style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: isYearly ? '#f59e0b' : '#6366f1', color: isYearly ? '#000000' : '#ffffff',
                      fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 99,
                      letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                    }}>{p.badge}</span>
                  )}
                  
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{p.icon}</span>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</h3>
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 18px 0' }}>{p.desc}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1.5px' }}>{p.price}</span>
                      <span style={{ fontSize: 14, color: '#64748b' }}>{p.period}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Effective: {p.effective}</span>
                      {p.savings && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
                          {p.savings}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--neu-border)', paddingTop: 24, marginBottom: 32, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      Included Capabilities:
                    </div>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                      {p.highlights.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
                          <CheckCircle size={14} color={isYearly ? '#f59e0b' : isPro ? '#6366f1' : '#10b981'} style={{ flexShrink: 0 }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Link
                      href={p.btnHref}
                      style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%',
                        padding: '13px 0', borderRadius: 12, fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
                        background: isYearly ? '#f59e0b' : isPro ? '#6366f1' : 'var(--neu-surface)',
                        border: `1px solid ${isYearly ? '#f59e0b' : isPro ? '#6366f1' : 'var(--neu-border)'}`,
                        color: isYearly ? '#000000' : '#ffffff', transition: 'all 0.25s ease',
                      }}
                      className={isYearly ? 'pricing-btn-pro' : isPro ? 'pricing-btn-pro' : 'pricing-btn-standard'}
                    >
                      {p.btnText}
                    </Link>
                    <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#475569' }}>
                      Best for: {p.bestFor}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────── */
interface FooterLink {
  name: string;
  action: 'scroll' | 'route' | 'external';
  target: string | number;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

function Footer({ setActiveIdx }: { setActiveIdx?: React.Dispatch<React.SetStateAction<number>> }) {
  const footerColumns: FooterColumn[] = [
    {
      title: 'Product',
      links: [
        { name: 'Features', action: 'scroll', target: 3 },
        { name: 'How it Works', action: 'scroll', target: 4 },
        // { name: 'Pricing', action: 'scroll', target: 6 },
        { name: 'Changelog', action: 'route', target: '/changelog' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', action: 'route', target: '/docs' },
        { name: 'GitHub', action: 'external', target: 'https://github.com/Jinay-Bhatt/Backend-Api' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', action: 'route', target: '/about' },
        { name: 'Contact', action: 'route', target: '/contact' },
        { name: 'Terms of Service', action: 'route', target: '/terms' },
        { name: 'Privacy Policy', action: 'route', target: '/privacy' },
      ],
    },
  ];

  const renderLink = (link: FooterLink) => {
    const style: React.CSSProperties = {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      textDecoration: 'none',
      transition: 'color 0.15s ease',
      cursor: 'pointer',
    };

    const handleHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.color = '#ffffff';
    };

    const handleLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.color = 'var(--text-muted)';
    };

    if (link.action === 'scroll') {
      return (
        <a
          key={link.name}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (setActiveIdx) {
              const idx = link.target as number;
              setActiveIdx(idx);
              const el = document.getElementById(`slide-inner-${idx}`);
              if (el) el.scrollTop = 0;
            }
          }}
          style={style}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
        >
          {link.name}
        </a>
      );
    }

    if (link.action === 'route') {
      return (
        <Link
          key={link.name}
          href={link.target as string}
          style={style}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
        >
          {link.name}
        </Link>
      );
    }

    return (
      <a
        key={link.name}
        href={link.target as string}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        onMouseEnter={handleHover}
        onMouseLeave={handleLeave}
      >
        {link.name}
      </a>
    );
  };

  return (
    <footer style={{
      borderTop: '1px solid var(--neu-border)',
      background: 'var(--neu-surface)',
      boxShadow: 'var(--neu-flat-xs)',
      padding: '56px 32px 40px'
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--neu-sunken)',
                border: '1px solid var(--neu-border)',
                boxShadow: 'var(--neu-pressed-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <Logo size={20} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff' }}>
                JB<span style={{ color: '#a1a1aa' }}>Snap</span>
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 300 }}>
              The visual API builder for modern teams. Build, deploy, and export production-ready APIs without writing boilerplate.
            </p>
          </div>
          {/* Links */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map((link) => renderLink(link))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--neu-border)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center' }}>
            JBSnap Visual Pipeline Builder & Execution Engine
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Scroll Dot Indicator ────────────────────────── */
const SECTIONS_NAV = [
  { id: 'hero',         label: 'Home' },
  { id: 'demo',         label: 'Demo' },
  { id: 'stats',        label: 'Stats' },
  { id: 'features',     label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'api-flow',     label: 'Zero Lock-in' },
  // { id: 'pricing',      label: 'Pricing' },
  // { id: 'footer',       label: 'Info' },
];

function ScrollDots({ activeIdx, setActiveIdx }: { activeIdx: number; setActiveIdx: React.Dispatch<React.SetStateAction<number>> }) {
  return (
    <div style={{
      position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
      zIndex: 998, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {SECTIONS_NAV.map((s, i) => (
        <button
          key={s.id}
          title={s.label}
          onClick={() => setActiveIdx(i)}
          style={{
            all: 'unset',
            width: activeIdx === i ? 6 : 4,
            height: activeIdx === i ? 20 : 4,
            borderRadius: 8,
            background: activeIdx === i ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: activeIdx === i ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Landing Page Content (shared by /landing route) ─── */
export function LandingPageContent() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playDemoTrigger, setPlayDemoTrigger] = useState(0);
  const lastScrollTime = useRef(0);
  const touchStartY = useRef(0);

  const handleWatchDemoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIdx(1);
    setPlayDemoTrigger(prev => prev + 1);
  };


  // Wheel listener
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 900) return; // Cooldown to let transition animate

    const activeSlideElement = document.getElementById(`slide-inner-${activeIdx}`);
    if (activeSlideElement) {
      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;

      if (isScrollingDown) {
        const isAtBottom = activeSlideElement.scrollHeight - activeSlideElement.scrollTop <= activeSlideElement.clientHeight + 2;
        if (!isAtBottom) return; // Let user scroll internally
      } else if (isScrollingUp) {
        const isAtTop = activeSlideElement.scrollTop <= 0;
        if (!isAtTop) return; // Let user scroll internally
      }
    }

    if (e.deltaY > 15) {
      if (activeIdx < SECTIONS_NAV.length - 1) {
        setActiveIdx(prev => prev + 1);
        lastScrollTime.current = now;
      }
    } else if (e.deltaY < -15) {
      if (activeIdx > 0) {
        setActiveIdx(prev => prev - 1);
        lastScrollTime.current = now;
      }
    }
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 900) return;

      const activeSlideElement = document.getElementById(`slide-inner-${activeIdx}`);

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        if (activeSlideElement) {
          const isAtBottom = activeSlideElement.scrollHeight - activeSlideElement.scrollTop <= activeSlideElement.clientHeight + 2;
          if (!isAtBottom) return;
        }
        if (activeIdx < SECTIONS_NAV.length - 1) {
          e.preventDefault();
          setActiveIdx(prev => prev + 1);
          lastScrollTime.current = now;
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        if (activeSlideElement) {
          const isAtTop = activeSlideElement.scrollTop <= 0;
          if (!isAtTop) return;
        }
        if (activeIdx > 0) {
          e.preventDefault();
          setActiveIdx(prev => prev - 1);
          lastScrollTime.current = now;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx]);

  // Touch listener handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const now = Date.now();
    if (now - lastScrollTime.current < 900) return;

    const activeSlideElement = document.getElementById(`slide-inner-${activeIdx}`);

    if (diffY > 50) { // Swipe Up (Scroll Down)
      if (activeSlideElement) {
        const isAtBottom = activeSlideElement.scrollHeight - activeSlideElement.scrollTop <= activeSlideElement.clientHeight + 2;
        if (!isAtBottom) return;
      }
      if (activeIdx < SECTIONS_NAV.length - 1) {
        setActiveIdx(prev => prev + 1);
        lastScrollTime.current = now;
      }
    } else if (diffY < -50) { // Swipe Down (Scroll Up)
      if (activeSlideElement) {
        const isAtTop = activeSlideElement.scrollTop <= 0;
        if (!isAtTop) return;
      }
      if (activeIdx > 0) {
        setActiveIdx(prev => prev - 1);
        lastScrollTime.current = now;
      }
    }
  };

  // Reset scroll position to top whenever activeIdx changes (ensures starting from section top)
  useEffect(() => {
    const el = document.getElementById(`slide-inner-${activeIdx}`);
    if (el) {
      el.scrollTop = 0;
    }
  }, [activeIdx]);

  const getSlideStyle = (i: number) => {
    const isActive = activeIdx === i;
    const isPast = i < activeIdx;
    return {
      position: 'absolute' as const,
      inset: 0,
      opacity: isActive ? 1 : 0,
      transform: isActive
        ? 'translateY(0) scale(1)'
        : (isPast ? 'translateY(-60px) scale(0.96)' : 'translateY(60px) scale(0.96)'),
      transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
      pointerEvents: isActive ? 'auto' as const : 'none' as const,
      zIndex: isActive ? 5 : 1,
    };
  };

  const renderSlide = (i: number, component: React.ReactNode) => {
    return (
      <div style={getSlideStyle(i)}>
        <div
          id={`slide-inner-${i}`}
          style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: 64, // room for Nav
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {component}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        body, html { overflow: hidden !important; }
        [id^="slide-inner-"]::-webkit-scrollbar { display: none; }
        [id^="slide-inner-"] { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Outer non-scrollable viewport frame */}
      <div
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', inset: 0,
          background: '#020202',
          overflow: 'hidden',
        }}
      >
        <Nav activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
        <ScrollDots activeIdx={activeIdx} setActiveIdx={setActiveIdx} />

        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {renderSlide(0, <Hero onWatchDemoClick={handleWatchDemoClick} />)}
          {renderSlide(1, <WatchDemo playTrigger={playDemoTrigger} />)}
          {renderSlide(2, <StatsBar />)}
          {renderSlide(3, <Features />)}
          {renderSlide(4, <HowItWorks />)}
          {renderSlide(5, (
            <>
              <APIFlowSection />
              <Footer setActiveIdx={setActiveIdx} />
            </>
          ))}
          {/*
          {renderSlide(6, (
            <>
              <PricingSection />
              <Footer setActiveIdx={setActiveIdx} />
            </>
          ))}
          */}
        </div>
      </div>
    </>
  );
}

/* ─── Page Root (/): Landing Page with session check ────────── */
export default function RootPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    // Token exists: verify it
    api.auth.me()
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff_user');
        setCheckingAuth(false);
      });
  }, [router]);

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#020202', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <LandingPageContent />;
}
