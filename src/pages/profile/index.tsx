import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileIndexPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/signin');
      return;
    }

    if (profile?.handle) {
      router.push(`/profile/${profile.handle}`);
    } else {
      // If no handle, show a temporary page or redirect to onboarding
      console.log('No handle found for user, redirecting to onboarding');
      router.push('/onboarding');
    }
  }, [user, profile, loading, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div>Loading your profile...</div>
    </div>
  );
}
