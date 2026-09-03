import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FbUser,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// import localFirebaseConfig from "../firebase-applet-config.json";

// Dynamic Firebase configuration: Sensitive API key and project settings are retrieved from Secret Manager / Environment Variables
const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();
const analytics = getAnalytics(app);

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

// Scopes configured for Google Workspace & Gmail API
export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
];

// In-memory cache for Google OAuth access token (never stored in localStorage)
let cachedGoogleAccessToken: string | null = null;

export function getGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export function setGoogleAccessToken(token: string | null): void {
  cachedGoogleAccessToken = token;
}

// Google Auth Provider configured with select_account and Gmail send scope
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
  access_type: "online",
});
SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});

/**
 * Sign in with Google Popup and obtain Gmail OAuth token
 */
export async function signInWithGoogle(): Promise<FbUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (error: any) {
    if (
      error?.code === "auth/popup-closed-by-user" || 
      error?.code === "auth/cancelled-popup-request"
    ) {
      console.info("Google Sign-In popup was closed or cancelled by user.");
    } else {
      console.error("Firebase Google Sign-In Error:", error);
    }
    throw error;
  }
}

/**
 * Authorize or Refresh Google Workspace Gmail Access
 */
export async function authorizeGmailAccess(): Promise<string> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google OAuth access token for Gmail.");
    }
    cachedGoogleAccessToken = credential.accessToken;
    return cachedGoogleAccessToken;
  } catch (error: any) {
    console.error("Gmail OAuth Authorization Error:", error);
    throw error;
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return result.user;
  } catch (error: any) {
    if (error?.code === "auth/operation-not-allowed") {
      const friendlyErr = new Error("Email/Password sign-in is not enabled for this Firebase project. Please use 'Continue with Google' to sign in with one click.");
      (friendlyErr as any).code = error.code;
      throw friendlyErr;
    }
    console.error("Firebase Email Sign-In Error:", error);
    throw error;
  }
}

/**
 * Register a new user with Email and Password
 */
export async function signUpWithEmail(email: string, pass: string, displayName?: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && displayName.trim() && result.user) {
      await updateProfile(result.user, {
        displayName: displayName.trim(),
      });
    }
    return result.user;
  } catch (error: any) {
    if (error?.code === "auth/operation-not-allowed") {
      const friendlyErr = new Error("Email/Password account creation is not enabled for this Firebase project. Please use 'Continue with Google' to create or access your account.");
      (friendlyErr as any).code = error.code;
      throw friendlyErr;
    }
    console.error("Firebase Email Sign-Up Error:", error);
    throw error;
  }
}

/**
 * Update authenticated user's profile display name or photo
 */
export async function updateUserProfile(data: { displayName?: string; photoURL?: string }) {
  if (!auth.currentUser) {
    throw new Error("No active authenticated user to update.");
  }
  await updateProfile(auth.currentUser, data);
  return auth.currentUser;
}

/**
 * Sign out current authenticated user
 */
export async function signOutUser() {
  try {
    cachedGoogleAccessToken = null;
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
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedGoogleAccessToken = null;
    }
    callback(user);
  });
}

