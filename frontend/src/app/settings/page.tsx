'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../services/api';
import { Zap, Package, GitBranch, GitFork, User, Settings, Shield, Terminal, Key, Database, Cpu, Layers, Lightbulb, Image as ImageIcon, Trash2, CreditCard, Check, Star, CheckCircle, Clock } from 'lucide-react';

function IntegrationPipeline({ provider, repositoryName }: { provider: string; repositoryName?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '32px 20px', background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '16px', boxShadow: 'var(--neu-flat-sm)', marginBottom: 24, overflow: 'hidden', position: 'relative' }}>
      {/* Node 1: Local Workspace */}
      <div style={{ width: 48, height: 48, borderRadius: '12px', border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <Zap size={18} style={{ color: '#ffffff' }} />
      </div>

      {/* Connector 1 */}
      <div style={{ flex: 1, height: 2, background: 'var(--neu-border)', minWidth: 40 }} />

      {/* Node 2: Compile Engine */}
      <div style={{ width: 48, height: 48, borderRadius: '12px', border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <Package size={18} style={{ color: '#ffffff' }} />
      </div>

      {/* Connector 2 */}
      <div style={{ flex: 1, height: 2, background: 'var(--neu-border)', minWidth: 40 }} />

      {/* Node 3: Git Repo */}
      <div style={{ width: 48, height: 48, borderRadius: '12px', border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        {provider === 'GITLAB' ? <GitFork size={18} style={{ color: '#ffffff' }} /> : <GitBranch size={18} style={{ color: '#ffffff' }} />}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [gitConfig, setGitConfig] = useState<any>(null);
  const [gitForm, setGitForm] = useState({ repositoryName: '', accessToken: '', provider: 'GITHUB' });
  const [savingGit, setSavingGit] = useState(false);
  const [gitSaved, setGitSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'plan' | 'git' | 'export'>('profile');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [planSuccessMsg, setPlanSuccessMsg] = useState('');

  // Profile form state and notifications
  const [profileForm, setProfileForm] = useState({ username: '', email: '', gender: 'Prefer not to say', oldPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ff_token');
    const u = localStorage.getItem('ff_user');
    if (!token) { router.replace('/login'); return; }
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      setProfileForm({
        username: parsed.username || '',
        email: parsed.email || '',
        gender: parsed.gender || 'Prefer not to say',
        oldPassword: '',
        newPassword: '',
      });
    }

    // Fetch fresh user details to populate createdAt and other missing attributes
    api.auth.me()
      .then((res) => {
        if (res.user) {
          setUser(res.user);
          localStorage.setItem('ff_user', JSON.stringify(res.user));
          if (res.user.avatar) {
            setAvatar(res.user.avatar);
            localStorage.setItem('ff_avatar', res.user.avatar);
            window.dispatchEvent(new Event('storage'));
          }
          setProfileForm(f => ({
            ...f,
            username: res.user.username || '',
            email: res.user.email || '',
            gender: res.user.gender || 'Prefer not to say',
          }));
        }
      })
      .catch(() => { });

    loadGitConfig();
  }, []);

  useEffect(() => {
    const syncAvatar = () => {
      setAvatar(localStorage.getItem('ff_avatar'));
    };
    window.addEventListener('storage', syncAvatar);
    syncAvatar();
    return () => window.removeEventListener('storage', syncAvatar);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.username.trim() || !profileForm.email.trim()) return;
    setSavingProfile(true);
    setProfileError('');
    try {
      const updatePayload: any = {
        username: profileForm.username,
        gender: profileForm.gender,
        avatar: avatar,
      };

      if (profileForm.newPassword.trim()) {
        if (!profileForm.oldPassword.trim()) {
          throw new Error('Current password is required to change to a new password.');
        }
        updatePayload.oldPassword = profileForm.oldPassword;
        updatePayload.newPassword = profileForm.newPassword;
      } else if (profileForm.oldPassword.trim()) {
        throw new Error('New password is required when supplying your current password.');
      }

      const res = await api.auth.update(updatePayload);
      setUser(res.user);
      localStorage.setItem('ff_user', JSON.stringify(res.user));
      if (res.user?.avatar !== undefined) {
        if (res.user.avatar) {
          localStorage.setItem('ff_avatar', res.user.avatar);
          setAvatar(res.user.avatar);
        } else {
          localStorage.removeItem('ff_avatar');
          setAvatar(null);
        }
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      setProfileForm(f => ({ ...f, oldPassword: '', newPassword: '' }));
      window.dispatchEvent(new Event('storage')); // Notify layouts
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadGitConfig = async () => {
    try {
      const res = await api.git.getConfig();
      if (res.config) {
        setGitConfig(res.config);
        setGitForm(f => ({ ...f, repositoryName: res.config.repositoryName }));
      }
    } catch { }
  };

  const handleSaveGit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitForm.repositoryName.trim() || !gitForm.accessToken.trim()) return;
    setSavingGit(true);
    try {
      await api.git.saveConfig(gitForm);
      await loadGitConfig();
      setGitSaved(true);
      setTimeout(() => setGitSaved(false), 2500);
      setGitForm(f => ({ ...f, accessToken: '' }));
    } catch (err: any) { alert(err.message); }
    finally { setSavingGit(false); }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      localStorage.setItem('ff_avatar', base64);
      setAvatar(base64);
      window.dispatchEvent(new Event('storage'));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAvatar = () => {
    const url = '/default_avatar.png';
    localStorage.setItem('ff_avatar', url);
    setAvatar(url);
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem('ff_avatar');
    setAvatar(null);
    window.dispatchEvent(new Event('storage'));
  };

  const handleUpgrade = async (planKey: 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY') => {
    if (user?.plan === planKey) return;
    setUpgradingPlan(planKey);
    try {
      const res = await api.auth.upgradePlan(planKey);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('ff_user', JSON.stringify(res.user));
        setPlanSuccessMsg(`Plan successfully updated to ${planKey === 'PRO_YEARLY' ? 'Pro Yearly' : planKey === 'PRO_MONTHLY' ? 'Pro Monthly' : 'Free'}!`);
        setTimeout(() => setPlanSuccessMsg(''), 3500);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const logout = () => { localStorage.clear(); router.replace('/login'); };

  const TABS = [
    { key: 'profile', icon: User, label: 'Profile Settings' },
    // { key: 'plan', icon: CreditCard, label: 'Plan & Billing' },
    { key: 'git', icon: GitBranch, label: 'GitHub / GitLab' },
    { key: 'export', icon: Package, label: 'API Keys & Codebase' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: '#09090b', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-secondary)' }}>
            <img src="/logo.jpg" alt="JBSnap Logo" width="28" height="28" style={{ objectFit: 'cover', borderRadius: '50%' }} />
            <span style={{ fontWeight: 800, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#ffffff' }}>
              JB<span style={{ background: 'linear-gradient(135deg,#ffffff,#a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Snap</span>
            </span>
          </Link>
          <span style={{ color: 'var(--text-faint)' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Settings</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href="/dashboard" style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
            <button onClick={logout} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#fca5a5', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff' }}>
          <Settings size={22} /> Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 14 }}>Configure external repositories, profile preferences, and key exports.</p>

        {/* Dark Neumorphic Tab nav */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'var(--neu-sunken)', padding: 6, borderRadius: 14, boxShadow: 'var(--neu-pressed-sm)', border: '1px solid var(--neu-border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                border: t.key === activeTab ? '1px solid var(--neu-border)' : '1px solid transparent',
                borderRadius: '10px',
                background: t.key === activeTab ? 'var(--neu-surface)' : 'transparent',
                boxShadow: t.key === activeTab ? 'var(--neu-flat-xs)' : 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: t.key === activeTab ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { if (t.key !== activeTab) { e.currentTarget.style.color = '#ffffff'; } }}
              onMouseLeave={e => { if (t.key !== activeTab) { e.currentTarget.style.color = 'var(--text-muted)'; } }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 28, background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '18px', boxShadow: 'var(--neu-flat-lg)' }}>
              {/* Profile Photo Uploader section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid var(--border)', background: '#121214', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                  {avatar ? (
                    <img src={avatar} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>
                      {user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>Profile Picture</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>PNG, JPG or GIF. Maximum size 2MB.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ padding: '6px 12px', background: '#ffffff', color: '#000000', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                    </label>
                    <button onClick={handleGenerateAvatar} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', color: '#ffffff', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ImageIcon size={12} /> Generate AI Avatar
                    </button>
                    {avatar && (
                      <button onClick={handleRemoveAvatar} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {profileError && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 12.5 }}>
                    {profileError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
                  <input
                    required
                    value={profileForm.username}
                    onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="Username"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                  <input
                    disabled
                    type="email"
                    value={profileForm.email}
                    placeholder="email@example.com"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      outline: 'none',
                      cursor: 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Email address cannot be changed.</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender Identity</label>
                  <select
                    value={profileForm.gender}
                    onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#09090b',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  >
                    <option value="Male" style={{ background: '#09090b', color: '#ffffff' }}>Male</option>
                    <option value="Female" style={{ background: '#09090b', color: '#ffffff' }}>Female</option>
                    <option value="Other" style={{ background: '#09090b', color: '#ffffff' }}>Other</option>
                    <option value="Prefer not to say" style={{ background: '#09090b', color: '#ffffff' }}>Prefer not to say</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label>
                  <input
                    type="password"
                    value={profileForm.oldPassword}
                    onChange={e => setProfileForm(f => ({ ...f, oldPassword: e.target.value }))}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Required if you want to change your password.</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Leave blank to keep current password.</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 8 }}>
                  <span style={{ width: 180, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Created</span>
                  <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 500 }}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : '-'}
                  </span>
                </div>

                <button type="submit" disabled={savingProfile}
                  style={{
                    padding: '14px',
                    background: savingProfile ? 'transparent' : profileSaved ? 'rgba(16,185,129,0.1)' : '#ffffff',
                    color: savingProfile ? 'var(--text-muted)' : profileSaved ? '#10b981' : '#000000',
                    border: `1.5px solid ${profileSaved ? '#10b981' : 'transparent'}`,
                    borderRadius: '6px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: savingProfile ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!savingProfile && !profileSaved) e.currentTarget.style.background = '#cbd5e1'; }}
                  onMouseLeave={e => { if (!savingProfile && !profileSaved) e.currentTarget.style.background = '#ffffff'; }}
                >
                  {savingProfile ? 'Saving Profile...' : profileSaved ? 'Profile Saved Successfully' : 'Save Profile Details'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── PLAN & BILLING TAB (COMMENTED OUT) ──
{/ * ── PLAN & BILLING TAB ── * /}
        {activeTab === 'plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {planSuccessMsg && (
              <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} /> {planSuccessMsg}
              </div>
            )}

            {/ * Current Status Card * /}
            <div style={{ padding: 28, background: '#0c0c0e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Active Subscription
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/ * {user?.plan === 'PRO_YEARLY' ? 'Pro Yearly' : user?.plan === 'PRO_MONTHLY' ? 'Pro Monthly' : 'Free Plan'} * /}
                    Free Plan
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 99,
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#10b981',
                      textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>
                      ACTIVE
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {/ * {user?.plan === 'PRO_YEARLY' ? '₹4,999/yr' : user?.plan === 'PRO_MONTHLY' ? '₹499/mo' : '₹0'} * /}
                    ₹0
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {/ * {user?.plan === 'PRO_YEARLY' ? 'Effective ₹417/month' : user?.plan === 'PRO_MONTHLY' ? 'Billed monthly' : 'Free forever'} * /}
                    Free forever
                  </div>
                </div>
              </div>

              {/ * Quotas Breakdown * /}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                {/ * AI Quota * /}
                <div style={{ padding: 14, background: '#121214', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Cpu size={12} /> AI Generations
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                      {user?.aiGenerationsCount || 0} / 3 {/ * user?.plan?.startsWith('PRO') ? 12 : 3 * /}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (((user?.aiGenerationsCount || 0) / 3) * 100))}%`,
                      background: '#6366f1',
                      borderRadius: 99,
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>
                    Monthly reset cycle (30 days)
                  </div>
                </div>

                {/ * Projects Quota * /}
                <div style={{ padding: 14, background: '#121214', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Package size={12} /> Project Containers
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                      Unlimited {/ * user?.plan?.startsWith('PRO') ? 'Unlimited' : '5 Max' * /}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    No restrictions on active projects
                  </div>
                </div>

                {/ * Ads Status * /}
                <div style={{ padding: 14, background: '#121214', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Shield size={12} /> Ads Experience
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff' }}>
                      Standard
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Community supported
                  </div>
                </div>
              </div>
            </div>

            {/ * Plan Switcher Grid - Commented out as everything is free now * /}
            {/ *
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                Switch or Upgrade Subscription
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Select a plan below to immediately update your account capabilities:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div style={{
                  padding: 22, borderRadius: 10, background: '#09090b',
                  border: `1px solid ${(!user?.plan || user?.plan === 'FREE') ? '#ffffff' : 'var(--border)'}`,
                  display: 'flex', flexDirection: 'column', position: 'relative'
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Free</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Students & beginners</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 14 }}>₹0</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                    <li>✓ 5 Projects</li>
                    <li>✓ 3 AI Generations / mo</li>
                    <li>✓ Basic Templates</li>
                    <li>✓ Limited History</li>
                    <li>✓ Ad-supported</li>
                  </ul>
                  <button
                    disabled={(!user?.plan || user?.plan === 'FREE') || upgradingPlan !== null}
                    onClick={() => handleUpgrade('FREE')}
                    style={{
                      padding: '10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: (!user?.plan || user?.plan === 'FREE') ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: '1px solid var(--border)',
                      color: (!user?.plan || user?.plan === 'FREE') ? '#94a3b8' : '#ffffff',
                      cursor: (!user?.plan || user?.plan === 'FREE') ? 'default' : 'pointer'
                    }}
                  >
                    {(!user?.plan || user?.plan === 'FREE') ? 'Current Plan' : upgradingPlan === 'FREE' ? 'Switching...' : 'Switch to Free'}
                  </button>
                </div>

                <div style={{
                  padding: 22, borderRadius: 10, background: '#09090b',
                  border: `1px solid ${user?.plan === 'PRO_MONTHLY' ? '#6366f1' : 'var(--border)'}`,
                  display: 'flex', flexDirection: 'column', position: 'relative'
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Pro Monthly</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Regular developers</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 14 }}>₹499<span style={{ fontSize: 13, color: '#64748b' }}>/mo</span></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                    <li>✓ Unlimited Projects</li>
                    <li>✓ 12 AI Generations / mo</li>
                    <li>✓ Advanced Templates</li>
                    <li>✓ Full Execution History</li>
                    <li>✓ Ad-Free & Priority Support</li>
                  </ul>
                  <button
                    disabled={user?.plan === 'PRO_MONTHLY' || upgradingPlan !== null}
                    onClick={() => handleUpgrade('PRO_MONTHLY')}
                    style={{
                      padding: '10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: user?.plan === 'PRO_MONTHLY' ? 'rgba(99,102,241,0.1)' : '#6366f1',
                      border: `1px solid ${user?.plan === 'PRO_MONTHLY' ? '#6366f1' : 'transparent'}`,
                      color: '#ffffff',
                      cursor: user?.plan === 'PRO_MONTHLY' ? 'default' : 'pointer'
                    }}
                  >
                    {user?.plan === 'PRO_MONTHLY' ? 'Current Plan' : upgradingPlan === 'PRO_MONTHLY' ? 'Upgrading...' : 'Upgrade to Monthly'}
                  </button>
                </div>

                <div style={{
                  padding: 22, borderRadius: 10, background: 'rgba(245,158,11,0.03)',
                  border: `1px solid ${user?.plan === 'PRO_YEARLY' ? '#f59e0b' : 'rgba(245,158,11,0.35)'}`,
                  display: 'flex', flexDirection: 'column', position: 'relative'
                }}>
                  <span style={{ position: 'absolute', top: -10, right: 14, background: '#f59e0b', color: '#000000', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                    SAVE ₹989
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Pro Yearly</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Long-term users</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>₹4,999<span style={{ fontSize: 13, color: '#64748b' }}>/yr</span></div>
                  <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 14 }}>Effective ₹417 / month</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                    <li>✓ All Pro capabilities</li>
                    <li>✓ Save ₹989 vs monthly</li>
                    <li>✓ Unlimited Projects</li>
                    <li>✓ 12 AI Generations / mo</li>
                    <li>✓ Ad-Free & Priority Support</li>
                  </ul>
                  <button
                    disabled={user?.plan === 'PRO_YEARLY' || upgradingPlan !== null}
                    onClick={() => handleUpgrade('PRO_YEARLY')}
                    style={{
                      padding: '10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: user?.plan === 'PRO_YEARLY' ? 'rgba(245,158,11,0.1)' : '#f59e0b',
                      border: `1px solid ${user?.plan === 'PRO_YEARLY' ? '#f59e0b' : 'transparent'}`,
                      color: user?.plan === 'PRO_YEARLY' ? '#f59e0b' : '#000000',
                      cursor: user?.plan === 'PRO_YEARLY' ? 'default' : 'pointer'
                    }}
                  >
                    {user?.plan === 'PRO_YEARLY' ? 'Current Plan' : upgradingPlan === 'PRO_YEARLY' ? 'Upgrading...' : 'Choose Yearly'}
                  </button>
                </div>
              </div>
            </div>
            * /}
          </div>
        )}

        
        */}

        {/* ── GIT TAB ── */}
        {activeTab === 'git' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <IntegrationPipeline provider={gitForm.provider} repositoryName={gitConfig?.repositoryName} />

            {gitConfig && (
              <div style={{ padding: '16px 20px', background: '#09090b', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}>
                  {gitConfig.provider === 'GITHUB' ? <GitBranch size={24} /> : <GitFork size={24} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Sync Active: Connected to {gitConfig.provider}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>{gitConfig.repositoryName} → {gitConfig.repositoryUrl}</div>
                </div>
              </div>
            )}

            <div style={{ padding: 28, background: '#09090b', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#ffffff' }}>Repository Synchronization</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Link a repository to automatically commit and push compiles directly to Git.</div>

              <form onSubmit={handleSaveGit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label className="label" style={{ color: '#ffffff' }}>Git Provider</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    {['GITHUB', 'GITLAB'].map(p => (
                      <button key={p} type="button" onClick={() => setGitForm(f => ({ ...f, provider: p }))}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: gitForm.provider === p ? 'none' : '1px solid var(--border)',
                          borderRadius: '6px',
                          background: gitForm.provider === p ? '#ffffff' : 'transparent',
                          color: gitForm.provider === p ? '#000000' : 'var(--text-muted)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}>
                        {p === 'GITHUB' ? <GitBranch size={14} /> : <GitFork size={14} />} {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="label" style={{ color: '#ffffff' }}>Repository Namespace & Name</label>
                  <input
                    required value={gitForm.repositoryName}
                    onChange={e => setGitForm(f => ({ ...f, repositoryName: e.target.value }))}
                    placeholder="username/my-jbsnap-api"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="label" style={{ color: '#ffffff' }}>Personal Access Token (repo scope)</label>
                  <input
                    required type="password" value={gitForm.accessToken}
                    onChange={e => setGitForm(f => ({ ...f, accessToken: e.target.value }))}
                    placeholder="ghp_••••••••••••••••••••"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <Lightbulb size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Securely encrypted using AES-256-GCM. Create a token with <strong style={{ color: '#ffffff' }}>repo</strong> access scope.
                  </div>
                </div>

                <button type="submit" disabled={savingGit}
                  style={{
                    padding: '14px',
                    background: savingGit ? 'transparent' : gitSaved ? 'rgba(16,185,129,0.1)' : '#ffffff',
                    color: savingGit ? 'var(--text-muted)' : gitSaved ? '#10b981' : '#000000',
                    border: `1.5px solid ${gitSaved ? '#10b981' : 'transparent'}`,
                    borderRadius: '6px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: savingGit ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!savingGit && !gitSaved) e.currentTarget.style.background = '#cbd5e1'; }}
                  onMouseLeave={e => { if (!savingGit && !gitSaved) e.currentTarget.style.background = '#ffffff'; }}
                >
                  {savingGit ? 'Saving Connection...' : gitSaved ? 'Connection Successful' : 'Save Connection'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── EXPORT TAB ── */}
        {activeTab === 'export' && (
          <div>
            <div style={{ padding: 28, background: '#09090b', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>Export Codebase Details</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>When exporting workflows, JBSnap packages a production codebase built on standard enterprise software:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: Cpu, text: 'Fastify Node.js HTTP server routing' },
                  { icon: Database, text: 'Prisma ORM Client models & PostgreSQL adapter' },
                  { icon: Layers, text: 'Docker containment & docker-compose configurations' },
                  { icon: Shield, text: 'Secure env.example configuration templates' },
                  { icon: Terminal, text: 'Dynamic sandbox virtual machine routing scripts' },
                  { icon: Settings, text: 'Comprehensive OpenAPI dynamic documentation charts' }
                ].map(f => (
                  <div key={f.text} style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500 }}>
                    <f.icon size={14} style={{ color: '#ffffff' }} /> {f.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
