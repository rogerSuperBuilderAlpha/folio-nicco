import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { signUpWithEmail, signInWithGoogle } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Handle redirects on client side only
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (user) {
      router.push('/onboarding');
    }
  }, [user, authLoading, router]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render if user is signed in (will redirect)
  if (user) {
    return null;
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUpWithEmail(email, password, displayName);
      router.push('/onboarding');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      router.push('/onboarding');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up - Folio</title>
        <meta name="description" content="Create your Folio account and start showcasing your work professionally." />
      </Head>
      
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '24px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/" className="logo" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Folio
            </Link>
            <h1 style={{ margin: '16px 0 8px', fontSize: '28px' }}>Create your account</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Start showcasing your work professionally</p>
          </div>

          {error && (
            <div style={{ 
              background: 'color-mix(in srgb, var(--danger), transparent 90%)', 
              border: '1px solid color-mix(in srgb, var(--danger), #000 10%)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              color: 'var(--danger)',
              fontSize: 'var(--text-small-size)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignUp} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="displayName" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Full Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="input"
                placeholder="Alex Rodriguez"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="alex@example.com"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary"
              style={{ width: '100%', marginBottom: '16px' }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-secondary)' }}>
            or
          </div>

          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="btn-google"
            style={{ width: '100%', marginBottom: '24px' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '12px' }}>
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75 4.8 4.8 0 0 1-4.52-3.31H1.83v2.07A8 8 0 0 0 8.98 17Z"/>
              <path fill="#FBBC05" d="M4.46 10.46a4.8 4.8 0 0 1-.25-1.46c0-.51.09-.98.25-1.46V5.47H1.83a8 8 0 0 0 0 7.06l2.63-2.07Z"/>
              <path fill="#EA4335" d="M8.98 4.23c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.15 4.47l2.63 2.07c.61-1.83 2.35-3.31 4.52-3.31Z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ textAlign: 'center', fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/signin" style={{ color: 'var(--interactive)', fontWeight: 500 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
