import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

/**
 * Authentication Service
 * Handles all Firebase Auth operations and user profile management
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  subscriptionStatus: 'free' | 'active' | 'cancelled' | 'expired';
  subscriptionTier: 'monthly' | 'annual' | null;
  stripeCustomerId?: string;
  subscriptionEndDate?: Date;
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Create user profile in Firestore after signup
 */
const createUserProfile = async (user: User, displayName?: string): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);

  // Check if profile already exists
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    // Just update lastLoginAt
    await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    return;
  }

  // Create new profile
  const profile: Omit<UserProfile, 'createdAt' | 'lastLoginAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    lastLoginAt: ReturnType<typeof serverTimestamp>;
  } = {
    uid: user.uid,
    email: user.email || '',
    displayName: displayName || user.displayName || 'User',
    subscriptionStatus: 'free',
    subscriptionTier: null,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);
};

/**
 * Update last login timestamp
 */
const updateLastLogin = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name in Firebase Auth
    await updateProfile(userCredential.user, { displayName });

    // Create user profile in Firestore
    await createUserProfile(userCredential.user, displayName);

    return userCredential;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Update last login
    await updateLastLogin(userCredential.user.uid);

    return userCredential;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with Google OAuth
 * Note: For React Native, you'll need to use expo-auth-session or react-native-google-signin
 * This is a placeholder that accepts a Google ID token
 */
export const signInWithGoogle = async (idToken: string): Promise<UserCredential> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);

    // Create or update user profile
    await createUserProfile(userCredential.user);
    await updateLastLogin(userCredential.user.uid);

    return userCredential;
  } catch (error: any) {
    console.error('Google sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
      lastLoginAt: data.lastLoginAt?.toDate(),
      subscriptionEndDate: data.subscriptionEndDate?.toDate(),
    } as UserProfile;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
};

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};
