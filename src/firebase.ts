import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FbUser,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
// Ensure persistent authentication
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not enable persistence:", err);
});

// Initialize Firestore with configured databaseId
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
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
