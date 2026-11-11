'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import GoogleSignInButton from '../../components/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Focus tracking for premium input micro-interactions
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login(form);
      localStorage.setItem('ff_token', res.token);
      localStorage.setItem('ff_user', JSON.stringify(res.user));
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (res: any) => {
    localStorage.setItem('ff_token', res.token);
    localStorage.setItem('ff_user', JSON.stringify(res.user));
    router.replace('/dashboard');
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--neu-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Back to Landing Page Button */}
      <Link
        href="/"
        style={{
          position: 'absolute', top: 24, left: 24, zIndex: 20,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 99,
          background: 'var(--neu-surface)', border: '1px solid var(--neu-border)',
          boxShadow: 'var(--neu-flat-xs)',
          color: '#94a3b8', fontSize: 12.5, fontWeight: 700,
          textDecoration: 'none', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'var(--neu-border)'; }}
      >
        <ArrowLeft size={14} /> Back to Landing Page
      </Link>

      {/* Subtle ambient lighting */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 320,
          background: 'radial-gradient(ellipse at top, rgba(255, 255, 255, 0.04), transparent 70%)',
        }} />
      </div>

      <div style={{
        width: '100%', maxWidth: 420,
        position: 'relative', zIndex: 10,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        
        {/* Sleek Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Logo Node with neumorphic embossed plate */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              position: 'relative', width: 72, height: 72, borderRadius: 22,
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              boxShadow: 'var(--neu-flat-sm)',
            }}>
              <img src="/logo.jpg" alt="JBSnap Logo" width="40" height="40" style={{ objectFit: 'cover', borderRadius: '50%' }} />
              <div style={{
                position: 'absolute', inset: -4, borderRadius: 26,
                border: '1.5px dashed rgba(255,255,255,0.06)', pointerEvents: 'none'
              }} />
            </div>
          </Link>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px',
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", lineHeight: 1.1
          }}>
            JB<span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Snap</span> Console
          </h1>
          <p style={{
            fontSize: 14, color: '#94a3b8', marginTop: 8, maxWidth: 360, lineHeight: 1.5
          }}>
            Secure visual backend engineering and edge runtime environment.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12,
            padding: '10px 16px',
            width: '100%',
            marginBottom: 24,
            color: '#fca5a5',
            fontSize: 12.5,
            textAlign: 'center',
            boxShadow: 'var(--neu-pressed-sm)'
          }}>
            {error}
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{ width: '100%', position: 'relative' }}>
          {/* Main Card */}
          <div style={{
            width: '100%',
            padding: '36px 32px',
            background: 'var(--neu-surface)',
            border: '1px solid var(--neu-border-bevel)',
            borderRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            boxShadow: 'var(--neu-flat-lg)',
            position: 'relative',
            overflow: 'hidden'
          }}>

              {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                  color: emailFocused ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center',
                  transition: 'color 0.25s ease',
                  zIndex: 2,
                }}>
                  <Mail size={16} />
                </span>
                <input
                  type="email" required autoComplete="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="you@company.com"
                  style={{
                    width: '100%',
                    background: 'var(--neu-sunken)',
                    border: `1px solid ${emailFocused ? 'rgba(255, 255, 255, 0.35)' : 'var(--neu-border)'}`,
                    borderRadius: 12,
                    padding: '12px 16px 12px 46px',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    outline: 'none',
                    height: 48,
                    boxShadow: emailFocused ? 'var(--neu-pressed-sm), 0 0 0 3px rgba(255, 255, 255, 0.08)' : 'var(--neu-pressed-sm)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                  color: passwordFocused ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center',
                  transition: 'color 0.25s ease',
                  zIndex: 2,
                }}>
                  <Lock size={16} />
                </span>
                <input
                  type="password" required autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: 'var(--neu-sunken)',
                    border: `1px solid ${passwordFocused ? 'rgba(255, 255, 255, 0.35)' : 'var(--neu-border)'}`,
                    borderRadius: 12,
                    padding: '12px 16px 12px 46px',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    outline: 'none',
                    height: 48,
                    boxShadow: passwordFocused ? 'var(--neu-pressed-sm), 0 0 0 3px rgba(255, 255, 255, 0.08)' : 'var(--neu-pressed-sm)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Premium Tactile Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 48,
                background: loading ? 'var(--neu-surface)' : 'var(--neu-grad-convex)',
                color: loading ? '#64748b' : '#ffffff',
                border: '1px solid var(--neu-border)',
                borderRadius: 12,
                fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: loading ? 'none' : 'var(--neu-flat-sm)',
                letterSpacing: '-0.01em',
                marginTop: 8
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--neu-flat)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)';
                  e.currentTarget.style.borderColor = 'var(--neu-border)';
                }
              }}
              onMouseDown={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = 'var(--neu-pressed-sm)';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--neu-border)' }} />
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--neu-border)' }} />
            </div>

            {/* 1 Single Google OAuth Sign-In Button */}
            <GoogleSignInButton
              text="Sign in with Google"
              onSuccess={handleGoogleSuccess}
              disabled={loading}
            />
          </div>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: 24, fontSize: 13.5, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Don't have an account?</span>
          <Link
            href="/register"
            style={{ color: '#ffffff', fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Sign up
          </Link>
        </div>

        {/* Terms of Service and Privacy Policy */}
        <div style={{ marginTop: 20, fontSize: 11.5, color: '#475569', textAlign: 'center', lineHeight: 1.6 }}>
          By signing in, you agree to JBSnap's{' '}
          <Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
            Privacy Policy
          </Link>.
        </div>
      </div>
    </main>
  );
}

