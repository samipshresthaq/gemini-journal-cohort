import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FbUser,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import localFirebaseConfig from "../firebase-applet-config.json";

// Dynamic Firebase configuration: Sensitive API key and project settings are retrieved from Secret Manager / Environment Variables
const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localFirebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || localFirebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
// Ensure persistent authentication
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not enable persistence:", err);
});

// Initialize Firestore with configured databaseId
const databaseId = resolvedFirebaseConfig.firestoreDatabaseId;
export const db = databaseId && databaseId !== "(default)"
  ? getFirestore(app, databaseId)
  : getFirestore(app);

// Google Auth Provider configured with select_account
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Google Sign-In Error:", error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function signOutUser() {
  try {
    await fbSignOut(auth);
  } catch (error: any) {
    console.error("Firebase Sign-Out Error:", error);
    throw error;
  }
}

/**
 * Auth state listener helper
 */
export function subscribeToAuth(callback: (user: FbUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

