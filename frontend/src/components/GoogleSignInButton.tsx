'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleSignInButton({
  onSuccess,
  gender,
  text = 'Sign in with Google',
  disabled = false,
}: {
  onSuccess: (res: any) => void;
  gender?: string;
  text?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gsiRendered, setGsiRendered] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Decodes JWT payload without external libraries
  const decodeJwtPayload = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response || !response.credential) return;
    setLoading(true);
    setError('');

    const payload = decodeJwtPayload(response.credential);
    const email = payload?.email;
    const name = payload?.name || payload?.given_name || email?.split('@')[0] || 'Google User';
    const picture = payload?.picture;

    if (!email) {
      setError('Could not retrieve email from Google Account');
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.googleLogin({
        email,
        name,
        picture,
        gender: gender || 'Prefer not to say',
        credential: response.credential,
      });
      onSuccess(res);
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [gender, onSuccess]);

  // Catch OAuth redirect hash tokens (e.g., popup or redirect fallback with #id_token=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.includes('id_token=')) {
      const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
      const idToken = params.get('id_token');
      if (idToken) {
        handleCredentialResponse({ credential: idToken });
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {}
      }
    }
  }, [handleCredentialResponse]);

  // Listen for popup postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_OAUTH_TOKEN' && event.data?.id_token) {
        handleCredentialResponse({ credential: event.data.id_token });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleCredentialResponse]);

  // Load and initialize Google Identity Services (GSI)
  useEffect(() => {
    isMountedRef.current = true;
    if (!GOOGLE_CLIENT_ID) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let renderCheckTimeout: NodeJS.Timeout | null = null;

    const initGsi = () => {
      if (!window.google?.accounts?.id || !buttonContainerRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        // Clear container and render official Google button
        if (buttonContainerRef.current) {
          buttonContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: text.toLowerCase().includes('up') ? 'signup_with' : 'signin_with',
            width: 350,
            logo_alignment: 'left',
          });
        }

        // Check if GSI actually rendered an iframe
        renderCheckTimeout = setTimeout(() => {
          if (buttonContainerRef.current) {
            const hasIframe = buttonContainerRef.current.querySelector('iframe') !== null;
            setGsiRendered(hasIframe);
          }
        }, 500);
      } catch (err) {
        console.warn('Google Identity Services initialization warning:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => initGsi();
        script.onerror = () => {
          setError('Failed to load Google Identity SDK. Use the fallback button below.');
        };
        document.body.appendChild(script);
      }

      // Polling safety check in case the script is already cached or finishes loading
      pollInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          if (pollInterval) clearInterval(pollInterval);
          initGsi();
        }
      }, 100);
    }

    return () => {
      isMountedRef.current = false;
      if (pollInterval) clearInterval(pollInterval);
      if (renderCheckTimeout) clearTimeout(renderCheckTimeout);
    };
  }, [GOOGLE_CLIENT_ID, text, handleCredentialResponse]);

  // Fallback OAuth trigger when clicked directly or if GSI button iframe cannot load
  const triggerOAuthFallback = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local');
      return;
    }

    setLoading(true);
    setError('');

    // Try GSI prompt first if SDK is available
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed() || notification?.isSkippedMoment()) {
            openOAuthPopup();
          }
        });
        setTimeout(() => {
          if (isMountedRef.current) setLoading(false);
        }, 3000);
        return;
      } catch {
        // Fall back to popup
      }
    }

    openOAuthPopup();
  };

  const openOAuthPopup = () => {
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login';
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=openid%20email%20profile&prompt=select_account&nonce=${nonce}`;

    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed) {
      // If popup is blocked by browser, redirect current window
      window.location.href = authUrl;
      return;
    }

    // Monitor popup for URL hash with token
    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          if (isMountedRef.current) setLoading(false);
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.includes('id_token=')) {
          clearInterval(timer);
          const hashIndex = popupUrl.indexOf('#');
          if (hashIndex !== -1) {
            const hash = popupUrl.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const idToken = params.get('id_token');
            if (idToken) {
              popup.close();
              handleCredentialResponse({ credential: idToken });
            }
          }
        }
      } catch {
        // Cross-origin access error while popup is on accounts.google.com - expected until redirect
      }
    }, 400);
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div
        style={{
          color: '#f87171',
          fontSize: 12,
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.08)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(239, 68, 68, 0.2)',
          width: '100%',
          lineHeight: 1.5,
        }}
      >
        <strong>Google Client ID Not Set</strong>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
          Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to <code>frontend/.env.local</code> to enable Google Sign-In.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {error && (
        <div
          style={{
            color: '#f87171',
            fontSize: 12,
            marginBottom: 10,
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(239, 68, 68, 0.25)',
            width: '100%',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            height: 48,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: '#94a3b8',
            fontSize: 13.5,
            background: 'var(--neu-surface)',
            borderRadius: 99,
            border: '1px solid var(--neu-border)',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #818cf8',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Authenticating with Google...
        </div>
      ) : (
        <div style={{ width: '100%', position: 'relative' }}>
          {/* Official Google GSI Render Container */}
          <div
            ref={buttonContainerRef}
            style={{
              minHeight: 44,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          />

          {/* High-Fidelity Fallback Button (rendered when GSI iframe is pending, blocked, or not yet mounted) */}
          {!gsiRendered && (
            <button
              type="button"
              onClick={triggerOAuthFallback}
              disabled={disabled || loading}
              style={{
                width: '100%',
                height: 46,
                background: 'var(--neu-surface)',
                border: '1px solid var(--neu-border)',
                borderRadius: 99,
                color: '#e2e8f0',
                fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                boxShadow: 'var(--neu-flat-xs)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: '0 20px',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !loading) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !loading) {
                  e.currentTarget.style.borderColor = 'var(--neu-border)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)';
                }
              }}
            >
              {/* Official Google 'G' Logo SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{text}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
