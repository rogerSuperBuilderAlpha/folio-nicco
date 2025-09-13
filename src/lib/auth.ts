import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Generate URL-friendly handle from display name
const generateHandle = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// User profile type based on docs/Data-Model.md
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  handle: string; // URL-friendly username like 'alex-rodriguez'
  headline?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  website?: string;
  skills?: string[];
  links?: { label: string; url: string }[];
  visibility: 'public' | 'private' | 'unlisted';
  role: 'user' | 'companyAdmin' | 'admin';
  onboarded: boolean;
  createdAt: any;
  updatedAt: any;
}

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name
    await updateProfile(user, { displayName });
    
    // Create user profile in Firestore (folio-nicco database)
    const handle = generateHandle(displayName);
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName,
      handle,
      visibility: 'public',
      role: 'user',
      onboarded: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
      onboarded: false,
      role: 'user'
    });
    
    await setDoc(doc(db, 'profiles', user.uid), userProfile);
    
    return { user, profile: userProfile };
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user profile exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create new user profile
      const handle = generateHandle(user.displayName || user.email?.split('@')[0] || 'user');
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || '',
        handle,
        avatarUrl: user.photoURL || undefined,
        visibility: 'public',
        role: 'user',
        onboarded: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        onboarded: false,
        role: 'user'
      });
      
      await setDoc(doc(db, 'profiles', user.uid), userProfile);
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const profileDoc = await getDoc(doc(db, 'profiles', uid));
    if (profileDoc.exists()) {
      return profileDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, 'profiles', uid), {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    throw error;
  }
};
