'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Settings, Trash2, Plus, GitBranch, Play, Radio,
  Terminal, Cpu, Database, Globe, Activity, ChevronRight,
  Link2, FolderOpen, ArrowUpRight, TrendingUp, Shield,
  Clock, BarChart3, Layers, Bell, Search,
  RefreshCw, Server, Code2, Boxes, ExternalLink, Package,
  CheckCircle2, AlertCircle, LogOut, X, Lock, Star
} from 'lucide-react';
import { api, BASE_URL_DIRECT } from '../../services/api';
import { io } from 'socket.io-client';
import NotificationBell from '../../components/NotificationBell';

/* ── Animated Number Counter ──────────────────── */
function AnimCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    let start = prevValue.current;
    let end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCount(Math.round(start + (end - start) * ease));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{count}</>;
}

/* ── Project card icon set ─────────────────────── */
const ICONS = [Terminal, Cpu, Database, Globe, GitBranch, Activity, Link2, FolderOpen, Code2, Layers, Boxes, Server];
const COLORS = ['#6366f1', '#8b5cf6', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

function getProjectTelemetry(seed: string) {
  let hash = 0;
  const str = seed || 'default';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const pseudoRand = (s: number) => {
    const x = Math.sin(Math.abs(hash) + s * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const count = 10;
  const width = 260;
  const height = 36;
  const padX = 6;
  const padTop = 6;
  const padBottom = 6;
  const step = (width - padX * 2) / (count - 1);

  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const x = padX + i * step;
    const y = padTop + pseudoRand(i + 1) * (height - padTop - padBottom);
    pts.push([Number(x.toFixed(1)), Number(y.toFixed(1))]);
  }

  // Build smooth bezier curve
  let pathD = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cpx = Number(((p0[0] + p1[0]) / 2).toFixed(1));
    pathD += ` C ${cpx} ${p0[1]}, ${cpx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
  }

  const fillD = `${pathD} L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`;
  const lastPt = pts[pts.length - 1];

  return { pathD, fillD, lastPt };
}

/* ── Project Card ──────────────────────────────── */
function ProjectCard({ proj, idx, onDelete, deleting }: any) {
  const Icon = ICONS[idx % ICONS.length];
  const color = COLORS[idx % COLORS.length];
  const wf = proj._count?.workflows ?? proj.workflows?.length ?? 0;
  const [hov, setHov] = useState(false);

  const telemetry = useMemo(() => getProjectTelemetry(proj.id || proj.name || String(idx)), [proj.id, proj.name, idx]);
  const avgLatency = useMemo(() => 16 + (Math.abs(idx * 7 + 11) % 24), [idx]);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--neu-surface)',
        border: `1px solid ${hov ? 'var(--neu-border-bevel)' : 'var(--neu-border)'}`,
        borderRadius: 20, padding: 22, position: 'relative', overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? 'var(--neu-flat-lg)' : 'var(--neu-flat)',
        minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border)',
              boxShadow: 'var(--neu-flat-xs)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', transition: 'box-shadow 0.3s'
            }}>
              <Icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{proj.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>gateway:500{idx}</div>
            </div>
          </div>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(proj.id, proj.name); }}
            disabled={deleting === proj.id}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 5, borderRadius: 6, transition: 'all 0.15s', zIndex: 20, position: 'relative', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.55 }}>
          {proj.description || 'No description provided.'}
        </p>
      </div>

      <div>
        {/* Telemetry Activity Sparkline (Sunken Well) */}
        <div style={{
          background: 'var(--neu-sunken)',
          border: '1px solid var(--neu-border)',
          boxShadow: 'var(--neu-pressed-sm)',
          borderRadius: 10,
          padding: '8px 10px 6px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Latency / Throughput
            </span>
            <span style={{ fontSize: 9.5, color: hov ? '#ffffff' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', transition: 'color 0.2s' }}>
              {avgLatency}ms
            </span>
          </div>
          <svg viewBox="0 0 260 36" width="100%" height={30} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`sg-${proj.id || idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={hov ? 0.22 : 0.1} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <line x1="6" y1="35" x2="254" y2="35" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <path d={telemetry.fillD} fill={`url(#sg-${proj.id || idx})`} />
            <path d={telemetry.pathD} fill="none" stroke={hov ? '#ffffff' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={telemetry.lastPt[0]} cy={telemetry.lastPt[1]} r={2.5} fill="#ffffff" />
            {hov && <circle cx={telemetry.lastPt[0]} cy={telemetry.lastPt[1]} r={5} fill="rgba(255,255,255,0.2)" />}
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-green" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>99.9% uptime</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ffffff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              {wf} WF
            </span>
            <span style={{ color: hov ? '#ffffff' : 'var(--text-faint)', transition: 'color 0.2s', display: 'flex' }}>
              <Activity size={12} />
            </span>
          </div>
        </div>
      </div>
      <Link href={`/projects/${proj.id}/builder`} style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
    </div>
  );
}

/* ── Log Row ──────────────────────────────────── */
function LogRow({ log, flash }: any) {
  const mc: Record<string, string> = { GET: '#34d399', POST: '#818cf8', PUT: '#fbbf24', DELETE: '#f87171', PATCH: '#38bdf8' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '48px 1fr 50px 44px',
      alignItems: 'center', gap: 8, padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      background: flash ? 'rgba(99,102,241,0.07)' : 'transparent',
      transition: 'background 1s',
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: mc[log.method] || '#94a3b8', background: (mc[log.method] || '#94a3b8') + '14', border: `1px solid ${(mc[log.method] || '#94a3b8')}22`, padding: '1px 5px', borderRadius: 4, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
        {log.method}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
        {log.path}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: log.status >= 400 ? '#f87171' : '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>
        {log.status}
      </span>
      <span style={{ fontSize: 9.5, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
        {log.latency}ms
      </span>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [mounted, setMounted] = useState(false);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [latestId, setLatestId] = useState<number>(-1);
  const [search, setSearch] = useState('');
  const [cpu, setCpu] = useState(18);
  const [mem, setMem] = useState(43);
  const [throughput, setThroughput] = useState(78);
  const [cacheHit, setCacheHit] = useState(94);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const isPro = user?.plan === 'PRO_MONTHLY' || user?.plan === 'PRO_YEARLY';

  const handleNewProject = () => {
    /*
    if (!isPro && projects.length >= 5) {
      setShowUpgradeModal(true);
      return;
    }
    */
    setShowCreate(true);
  };

  useEffect(() => {
    const token = localStorage.getItem('ff_token');
    const u = localStorage.getItem('ff_user');
    if (!token) { router.replace('/login'); return; }
    if (u) setUser(JSON.parse(u));
    loadProjects();
    setTimeout(() => setMounted(true), 80);

    api.auth.me().then(res => {
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('ff_user', JSON.stringify(res.user));
        if (res.user.avatar) {
          localStorage.setItem('ff_avatar', res.user.avatar);
          setAvatar(res.user.avatar);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const syncAvatar = () => {
      setAvatar(localStorage.getItem('ff_avatar'));
    };
    window.addEventListener('storage', syncAvatar);
    syncAvatar();
    return () => window.removeEventListener('storage', syncAvatar);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCpu(p => Math.max(5, Math.min(45, p + (Math.random() - 0.5) * 5)));
      setMem(p => Math.max(30, Math.min(75, p + (Math.random() - 0.5) * 3)));
      setThroughput(p => Math.max(20, Math.min(120, Math.round(p + (Math.random() - 0.5) * 8))));
      setCacheHit(p => Math.max(88, Math.min(99, Math.round(p + (Math.random() - 0.5) * 2))));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!projects.length) return;

    // Connect to backend Socket.IO websocket metrics room
    const socket = io(BASE_URL_DIRECT);
    
    socket.on('connect', () => {
      // Register listeners for all project IDs to aggregate active logs
      projects.forEach(p => {
        socket.emit('join-project', p.id);
      });
    });

    socket.on('metrics', (m: any) => {
      const log = {
        id: m.id || Date.now(),
        method: m.method,
        status: m.responseStatus,
        latency: m.latencyMs,
        path: m.path
      };
      // Append real-time logs to local telemetry list
      setLiveLogs(prev => [log, ...prev].slice(0, 25));
      setLatestId(log.id);
    });

    // Fallback simulation: keeps dashboard interactive when there is no gateway traffic
    const simInterval = setInterval(() => {
      const p = projects[Math.floor(Math.random() * projects.length)];
      const methods = ['GET', 'GET', 'POST', 'PUT', 'DELETE'];
      const m = methods[Math.floor(Math.random() * methods.length)];
      const paths = ['/users', '/products', '/auth/token', '/health', '/billing', '/analytics'];
      const path = paths[Math.floor(Math.random() * paths.length)];
      const codes = [200, 200, 200, 201, 204, 400, 404, 500];
      const status = codes[Math.floor(Math.random() * codes.length)];
      const latency = Math.floor(Math.random() * 160) + 8;
      
      const log = { 
        id: Date.now(), 
        method: m, 
        status, 
        latency, 
        path: `/${p.name.toLowerCase().replace(/\s+/g, '-')}${path}` 
      };
      
      setLiveLogs(prev => [log, ...prev].slice(0, 25));
      setLatestId(log.id);
    }, 4500);

    return () => {
      socket.disconnect();
      clearInterval(simInterval);
    };
  }, [projects]);

  const loadProjects = async () => {
    setLoading(true);
    try { setProjects(await api.projects.list()); }
    catch { router.replace('/login'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const p = await api.projects.create(form);
      setProjects(prev => [p, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '' });
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.projects.delete(id);
      setProjects(prev => prev.filter(x => x.id !== id));
    } catch (err: any) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const totalWf = projects.reduce((a, p) => a + (p._count?.workflows ?? 0), 0);
  const published = projects.reduce((a, p) => a + (p.workflows?.filter((w: any) => w.isPublished).length ?? 0), 0);
  const filtered = search ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : projects;
  const errLogs = liveLogs.filter(l => l.status >= 400).length;
  const errRate = liveLogs.length ? Math.round((errLogs / liveLogs.length) * 100) : 0;
  const avgLatency = liveLogs.length 
    ? Math.round(liveLogs.reduce((acc, curr) => acc + curr.latency, 0) / liveLogs.length) 
    : 0;
  const activeWorkers = Math.max(2, Math.min(4, Math.ceil(throughput / 30)));

  const statCards = [
    { label: 'Projects', value: projects.length, icon: <FolderOpen size={15} />, color: '#ffffff', sub: 'Active workspaces' },
    { label: 'Workflows', value: totalWf, icon: <GitBranch size={15} />, color: '#ffffff', sub: 'Total pipelines' },
    { label: 'Published', value: published, icon: <Play size={15} />, color: '#ffffff', sub: 'Live endpoints' },
    { label: 'Gateway', value: 'ONLINE', icon: <Radio size={15} />, color: '#ffffff', sub: 'All systems up', isStatus: true },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Navbar ──────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--neu-surface)',
        borderBottom: '1px solid var(--neu-border)',
        boxShadow: 'var(--neu-flat-xs)',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(-8px)',
        transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <img src="/logo.jpg" alt="JBSnap" width={26} height={26} style={{ objectFit: 'cover', borderRadius: '50%' }} />
            <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              JB<span style={{ background: 'linear-gradient(135deg,#ffffff,#a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Snap</span>
            </span>
          </div>

          <ChevronRight size={13} color="rgba(255,255,255,0.15)" style={{ margin: '0 4px' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Dashboard</span>

          {/* Search (Sunken Neumorphic Well) */}
          <div style={{ position: 'relative', marginLeft: 16 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 30, paddingRight: 12, height: 34, width: 240,
                borderRadius: 10, background: 'var(--neu-sunken)',
                border: '1px solid var(--neu-border)',
                boxShadow: 'var(--neu-pressed-sm)',
                color: 'var(--text-primary)', fontSize: 12.5, outline: 'none',
                fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s, width 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.25)'; e.target.style.boxShadow = 'var(--neu-pressed-sm), 0 0 0 2px rgba(255,255,255,0.08)'; e.target.style.width = '270px'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--neu-border)'; e.target.style.boxShadow = 'var(--neu-pressed-sm)'; e.target.style.width = '240px'; }}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Real-time Notification Bell */}
            <NotificationBell />

            <Link href="/settings" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 10, border: '1px solid var(--neu-border)',
              background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)',
              color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'var(--neu-border-bevel)'; (e.currentTarget as any).style.color = '#ffffff'; (e.currentTarget as any).style.boxShadow = 'var(--neu-flat-sm)'; }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--neu-border)'; (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.boxShadow = 'var(--neu-flat-xs)'; }}>
              <Settings size={12} /> Settings
            </Link>

            {/* Avatar (Tactile circle) */}
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '1px solid var(--neu-border-bevel)',
              boxShadow: 'var(--neu-flat-xs)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12.5, fontWeight: 800, color: '#000000', cursor: 'pointer', transition: 'all 0.2s'
            }}
              onClick={() => router.replace('/settings')}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}>
              {avatar ? (
                <img src={avatar} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#ffffff,#a1a1aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page Content ───────────────────────── */}
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '36px 28px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 28, flexWrap: 'wrap', gap: 14,
          opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-flat-xs)', fontSize: 11, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.05em' }}>
                <span className="pulse-green" style={{ background: '#ffffff', boxShadow: '0 0 5px #ffffff' } as any} />
                WORKSPACE
              </span>
              {/* <Link href="/settings?tab=plan" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99,
                background: isPro ? 'rgba(99,102,241,0.12)' : 'var(--neu-surface)',
                border: `1px solid ${isPro ? 'rgba(99,102,241,0.35)' : 'var(--neu-border)'}`,
                boxShadow: 'var(--neu-flat-xs)',
                fontSize: 10.5, fontWeight: 800, color: isPro ? (user?.plan === 'PRO_YEARLY' ? '#f59e0b' : '#a5b4fc') : '#94a3b8',
                textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>
                {isPro ? (user?.plan === 'PRO_YEARLY' ? 'PRO YEARLY' : 'PRO MONTHLY') : 'FREE TIER'}
                {!isPro && <span style={{ color: '#818cf8', marginLeft: 4 }}>UPGRADE</span>}
              </Link> */}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.7px', color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.15 }}>
              {user?.username ? `Welcome back, ${user.username}` : 'Workspace Console'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 6 }}>
              Manage your API endpoints, workflow pipelines, and gateway configurations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={loadProjects} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
              borderRadius: 12, border: '1px solid var(--neu-border)',
              background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)',
              color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--neu-border-bevel)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={handleNewProject} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px',
              borderRadius: 12, background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
              border: '1px solid rgba(255, 255, 255, 0.45)', color: '#000000',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '4px 4px 14px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.12)',
              transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '6px 6px 18px rgba(0,0,0,0.7), -3px -3px 10px rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 14px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.12)'; }}>
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {/* ── Free Plan Ad Sponsor Banner (Neumorphic Card) (COMMENTED OUT) ───────── */}
        {/* {!isPro && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            padding: '14px 20px', borderRadius: 16, marginBottom: 28,
            background: 'var(--neu-surface)',
            border: '1px solid var(--neu-border)',
            boxShadow: 'var(--neu-flat-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'var(--neu-sunken)', border: '1px solid var(--neu-border)', color: '#94a3b8', letterSpacing: '0.06em' }}>
                SPONSOR
              </span>
              <span style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} style={{ color: '#f59e0b', flexShrink: 0 }} /> Deploy unlimited APIs with <strong>JBSnap Pro</strong>: Unlimited projects, 12 AI generations/month, and 0 ads.
              </span>
            </div>
            <Link href="/settings?tab=plan" style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: '#ffffff', color: '#000000', textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap'
            }}>
              Remove Ads with Pro
            </Link>
          </div>
        )} */}

        {/* ── Stat Cards (Neumorphic Extrusions) ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
          {statCards.map((s, i) => {
            const [hov, setHov] = useState(false);
            return (
              <div key={s.label}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                  padding: '20px 22px', borderRadius: 18, position: 'relative', overflow: 'hidden',
                  background: 'var(--neu-surface)',
                  border: `1px solid ${hov ? 'var(--neu-border-bevel)' : 'var(--neu-border)'}`,
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  transform: hov ? 'translateY(-3px)' : 'none',
                  boxShadow: hov ? 'var(--neu-flat-lg)' : 'var(--neu-flat)',
                  opacity: mounted ? 1 : 0,
                  transitionDelay: `${i * 60 + 200}ms`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--neu-surface)',
                    border: '1px solid var(--neu-border)',
                    boxShadow: 'var(--neu-flat-xs)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', transition: 'box-shadow 0.3s'
                  }}>
                    {s.icon}
                  </div>
                  {s.isStatus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className="pulse-green" />
                      <span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700, letterSpacing: '0.04em' }}>LIVE</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                  {s.isStatus ? s.value : <AnimCounter value={s.value as number} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3, opacity: 0.8 }}>{s.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ── Two-Column Layout ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* LEFT: Projects + Capabilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen size={14} color="#ffffff" />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>Project Workspaces</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '1px 8px', borderRadius: 99 }}>
                  {/* {isPro ? `${filtered.length} (Unlimited)` : `${filtered.length} / 5 Projects`} */}
                  {`${filtered.length} Projects`}
                </span>
              </div>
              {search && <button onClick={() => setSearch('')} style={{ fontSize: 11, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>}
            </div>

            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FolderOpen size={22} color="#ffffff" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{search ? 'No matching projects' : 'No project workspaces'}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>{search ? 'Try a different term.' : 'Create your first API workspace to get started.'}</p>
                {!search && <button onClick={handleNewProject} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ffffff', color: '#000000', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 18px rgba(255,255,255,0.1)' }}>Create First Project</button>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
                {filtered.map((p, i) => <ProjectCard key={p.id} proj={p} idx={i} onDelete={handleDelete} deleting={deleting} />)}
              </div>
            )}

            {/* Platform Capabilities */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <Cpu size={13} color="#f59e0b" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Platform Capabilities</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { icon: <Cpu size={17} />, title: 'VM Sandbox', desc: 'Secure code execution', color: '#6366f1' },
                  { icon: <Shield size={17} />, title: 'JWT Gateway', desc: 'Per-route auth', color: '#10b981' },
                  { icon: <BarChart3 size={17} />, title: 'Analytics', color: '#38bdf8', desc: 'Real-time metrics' },
                  { icon: <Code2 size={17} />, title: 'TS Export', desc: 'Fastify output', color: '#8b5cf6' },
                  { icon: <GitBranch size={17} />, title: 'AI Workflows', desc: 'BharatCode (Qwen 3.8 27B)', color: '#f59e0b' },
                  { icon: <Boxes size={17} />, title: 'Service Mesh', desc: 'Visual graph', color: '#ec4899' },
                ].map((cap, ci) => {
                  const [h, setH] = useState(false);
                  return (
                    <div key={cap.title} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ padding: '14px 16px', borderRadius: 11, background: h ? `${cap.color}06` : 'rgba(255,255,255,0.015)', border: `1px solid ${h ? cap.color + '22' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', transform: h ? 'translateY(-2px)' : 'none' }}>
                      <div style={{ color: cap.color, marginBottom: 7, transition: 'transform 0.2s', transform: h ? 'scale(1.1)' : 'none' }}>{cap.icon}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{cap.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{cap.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 76 }}>

            {/* System Health (Neumorphic Surface) */}
            <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--neu-flat)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Activity size={13} color="#10b981" />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Health</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="pulse-green" />
                  <span style={{ fontSize: 9.5, color: '#10b981', fontWeight: 700 }}>LIVE</span>
                </div>
              </div>

              {[
                { label: 'CPU Usage', val: Math.round(cpu), color: '#6366f1', unit: '%' },
                { label: 'Memory', val: Math.round(mem), color: '#8b5cf6', unit: '%' },
                { label: 'API Throughput', val: Math.round(throughput), color: '#10b981', unit: ' req/s' },
                { label: 'Cache Hit', val: Math.round(cacheHit), color: '#38bdf8', unit: '%' },
              ].map(bar => (
                <div key={bar.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{bar.label}</span>
                    <span style={{ fontSize: 10.5, color: bar.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{bar.val}{bar.unit}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--neu-sunken)', borderRadius: 99, overflow: 'hidden', boxShadow: 'var(--neu-pressed-sm)' }}>
                    <div style={{ height: '100%', width: `${bar.label === 'API Throughput' ? (bar.val / 120) * 100 : bar.val}%`, background: `linear-gradient(90deg,${bar.color}70,${bar.color})`, borderRadius: 99, boxShadow: `0 0 6px ${bar.color}50`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                  </div>
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--neu-border)' }}>
                {[
                  { k: 'Latency', v: avgLatency > 0 ? `${avgLatency}ms` : '<1ms', c: '#10b981' },
                  { k: 'Workers', v: `${activeWorkers}/4`, c: '#38bdf8' },
                  { k: 'Error Rate', v: `${errRate}%`, c: errRate > 10 ? '#ef4444' : '#10b981' },
                  { k: 'Requests', v: `${liveLogs.length}`, c: '#8b5cf6' },
                ].map(m => (
                  <div key={m.k} style={{ background: 'var(--neu-sunken)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-pressed-sm)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.k}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.c, fontFamily: 'JetBrains Mono, monospace' }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>


            {/* Top Projects quick links (Neumorphic Card) */}
            {projects.length > 0 && (
              <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--neu-flat)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <TrendingUp size={13} color="#f59e0b" />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Projects</span>
                </div>
                {projects.slice(0, 4).map((p, i) => {
                  const c = COLORS[i % COLORS.length];
                  const Icon = ICONS[i % ICONS.length];
                  return (
                    <Link key={p.id} href={`/projects/${p.id}/builder`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--neu-border)' : 'none', cursor: 'pointer', transition: 'all 0.15s', borderRadius: 8 }}
                        onMouseEnter={e => e.currentTarget.style.paddingLeft = '4px'}
                        onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--neu-surface)', border: `1px solid ${c}30`, boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, flexShrink: 0 }}>
                          <Icon size={12} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p._count?.workflows ?? 0} workflows</div>
                        </div>
                        <ExternalLink size={11} color="var(--text-faint)" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Modal ────────────────────────── */}
      {showCreate && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#ffffff,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 12px rgba(0,0,0,0.5), -2px -2px 6px rgba(255,255,255,0.2)' }}>
                <Plus size={18} color="#000000" />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>Create New Project</h2>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Set up your API workspace</p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Project Name *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My Awesome API" className="input" autoFocus />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this project do?" rows={3}
                  style={{ width: '100%', background: 'var(--neu-sunken)', border: '1px solid var(--neu-border)', borderRadius: 10, padding: '10px 13px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', boxShadow: 'var(--neu-pressed)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.25)'; e.target.style.boxShadow = 'var(--neu-pressed), 0 0 0 2px rgba(255,255,255,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--neu-border)'; e.target.style.boxShadow = 'var(--neu-pressed)'; }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost" style={{ flex: 1, padding: '10px 14px', borderRadius: 10 }}>Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary" style={{ flex: 2, padding: '10px 14px', borderRadius: 10 }}>
                  {creating ? <><span className="spinner" />Creating...</> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Upgrade Plan Modal (Free Limit Reached) - Commented out as everything is free now ── */}
      {/* showUpgradeModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}>
          <div className="modal" style={{ maxWidth: 480, border: '1px solid rgba(99,102,241,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={18} color="#ef4444" />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#ffffff' }}>Project Limit Reached</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Free Plan allows up to 5 project workspaces</p>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} />
              </button>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                You currently have <strong>{projects.length} / 5</strong> active projects. To build more endpoints and unlock unlimited projects, upgrade your workspace to <strong>JBSnap Pro</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/settings?tab=plan" onClick={() => setShowUpgradeModal(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px',
                  borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  color: '#a5b4fc', textDecoration: 'none', fontWeight: 600, fontSize: 13
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={14} /> Upgrade to Pro Monthly (₹499/mo)
                </span>
              </Link>
              <Link href="/settings?tab=plan" onClick={() => setShowUpgradeModal(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px',
                  borderRadius: 8, background: '#f59e0b', color: '#000000', textDecoration: 'none', fontWeight: 700, fontSize: 13
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={14} fill="#000000" color="#000000" /> Choose Pro Yearly (₹4,999/yr - Save ₹989)
                </span>
              </Link>
              <button onClick={() => setShowUpgradeModal(false)} style={{ padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) */}
    </div>
  );
}
