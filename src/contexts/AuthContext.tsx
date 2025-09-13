import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, getUserProfile, updateUserProfile } from '../lib/auth';

// Generate URL-friendly handle from display name
const generateHandle = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => null
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      try {
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
        return userProfile;
      } catch (error) {
        console.log('Error refreshing profile:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Fetch user profile from Firestore
          let userProfile = await getUserProfile(user.uid);
          
          // If profile exists but doesn't have a handle, add one
          if (userProfile && !userProfile.handle) {
            console.log('Profile missing handle, adding one...');
            const displayNameToUse = userProfile.displayName || user.displayName || user.email?.split('@')[0] || 'user';
            console.log('Using display name for handle:', displayNameToUse);
            const handle = generateHandle(displayNameToUse);
            console.log('Generated handle:', handle);
            
            try {
              await updateUserProfile(user.uid, { handle });
              console.log('Handle updated successfully');
              
              // Fetch the updated profile
              userProfile = await getUserProfile(user.uid);
              console.log('Updated profile:', userProfile);
            } catch (error) {
              console.error('Error updating handle:', error);
            }
          }
          
          setProfile(userProfile);
        } catch (error) {
          console.log('Profile not found or insufficient permissions, user may need to complete signup');
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    profile,
    loading,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
