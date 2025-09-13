import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, getUserProfile } from '../lib/auth';

const FILM_ROLES = [
  'Cinematographer',
  'Director',
  'Producer',
  'Editor',
  'Gaffer',
  '1st Assistant Camera',
  '2nd Assistant Camera',
  'Script Supervisor',
  'Sound Recordist',
  'Production Designer',
  'Other'
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  // Handle redirects on client side only
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!user) {
      router.push('/signin');
      return;
    }

    if (profile?.onboarded) {
      router.push(`/profile/${profile.handle}`);
      return;
    }
  }, [user, profile, authLoading, router]);

  // Show loading while auth is loading or redirecting
  if (authLoading || !user || profile?.onboarded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const handleNext = () => {
    if (step === 1 && !role) {
      setError('Please select your primary role');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleComplete = async () => {
    if (!headline.trim()) {
      setError('Please add a headline');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUserProfile(user.uid, {
        headline: headline.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        skills: role ? [role] : [],
        onboarded: true
      });

      // First, make sure the profile has a handle
      const currentProfile = profile || await getUserProfile(user.uid);
      console.log('Current profile before handle check:', currentProfile);
      
      if (!currentProfile?.handle) {
        console.log('Adding missing handle during onboarding completion...');
        const displayNameToUse = user.displayName || user.email?.split('@')[0] || 'user';
        console.log('Display name to use for handle:', displayNameToUse);
        
        const generatedHandle = displayNameToUse
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        console.log('Generated handle:', generatedHandle);
        await updateUserProfile(user.uid, { handle: generatedHandle });
        console.log('Handle saved to profile');
      }

      const updatedProfile = await refreshProfile();
      console.log('Updated profile after refresh:', updatedProfile);
      
      // Redirect to their new profile page
      if (updatedProfile?.handle) {
        console.log('Redirecting to profile with handle:', updatedProfile.handle);
        router.push(`/profile/${updatedProfile.handle}`);
      } else {
        console.log('No handle found, redirecting to profile index');
        // Final fallback - redirect to profile index which will handle it
        router.push('/profile');
      }
    } catch (error: any) {
      setError('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Welcome to Folio</title>
        <meta name="description" content="Set up your professional profile and start showcasing your work." />
      </Head>
      
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px' }}>
        <div className="container" style={{ maxWidth: '600px', paddingTop: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ marginBottom: '16px' }}>Welcome to Folio, {user.displayName}!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
              Let's set up your professional profile
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <div style={{ 
                width: '40px', 
                height: '4px', 
                borderRadius: '2px',
                background: step >= 1 ? 'var(--interactive)' : 'var(--border-subtle)'
              }} />
              <div style={{ 
                width: '40px', 
                height: '4px', 
                borderRadius: '2px',
                background: step >= 2 ? 'var(--interactive)' : 'var(--border-subtle)'
              }} />
            </div>
          </div>

          {error && (
            <div style={{ 
              background: 'color-mix(in srgb, var(--danger), transparent 90%)', 
              border: '1px solid color-mix(in srgb, var(--danger), #000 10%)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              color: 'var(--danger)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="card">
              <h2 style={{ marginBottom: '24px' }}>What's your primary role?</h2>
              <p style={{ marginBottom: '32px', color: 'var(--text-secondary)' }}>
                This helps us customize your experience and make you discoverable to the right people.
              </p>
              
              <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
                {FILM_ROLES.map((filmRole) => (
                  <label 
                    key={filmRole}
                    className="role-option"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: 'var(--space-4)',
                      border: `1px solid ${role === filmRole ? 'var(--interactive)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: role === filmRole ? 'color-mix(in srgb, var(--interactive), transparent 95%)' : 'var(--surface-default)',
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast) var(--ease-standard)',
                      boxShadow: role === filmRole ? 'var(--shadow-1)' : 'var(--shadow-0)'
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={filmRole}
                      checked={role === filmRole}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: 'var(--space-3)' }}
                    />
                    <span style={{ 
                      fontWeight: role === filmRole ? 600 : 400,
                      color: role === filmRole ? 'var(--interactive)' : 'var(--text-primary)',
                      fontSize: 'var(--text-body-size)'
                    }}>
                      {filmRole}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleNext} className="btn btn--primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <h2 style={{ marginBottom: '24px' }}>Tell us about yourself</h2>
              <p style={{ marginBottom: '32px', color: 'var(--text-secondary)' }}>
                This information will appear on your public profile and help others understand your expertise.
              </p>

              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label htmlFor="headline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Professional Headline *
                </label>
                <input
                  id="headline"
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="input"
                  placeholder="Award-winning Cinematographer specializing in narrative films"
                  maxLength={100}
                />
                <div className="char-counter">
                  {headline.length}/100 characters
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label htmlFor="location" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                  placeholder="Los Angeles, CA"
                />
              </div>

              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label htmlFor="website" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="input"
                  placeholder="https://alexrodriguez.com"
                />
              </div>

              <div style={{ marginBottom: 'var(--space-8)' }}>
                <label htmlFor="bio" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input"
                  rows={4}
                  placeholder="Tell your story... What drives your work? What are you passionate about?"
                  maxLength={500}
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
                <div className="char-counter">
                  {bio.length}/500 characters
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} className="btn btn--ghost">
                  Back
                </button>
                <button 
                  onClick={handleComplete} 
                  disabled={loading}
                  className="btn btn--primary"
                >
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
