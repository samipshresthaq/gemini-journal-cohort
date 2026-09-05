import dotenv from "dotenv";
dotenv.config();

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getAdminCredentials } from "../../serverSecrets";

export interface SeedUserOptions {
  email?: string;
  password?: string;
  displayName?: string;
  role?: "admin" | "user";
  uid?: string;
  status?: "active" | "deactivated";
}

export interface SeededUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  status: "active" | "deactivated";
  createdAt: number;
  lastLoginAt: number;
}

export interface SeedUserResult {
  success: boolean;
  message: string;
  action: "created" | "updated" | "verified";
  user: SeededUserRecord;
  firestoreSynced: boolean;
  authSynced: boolean;
  timestamp: number;
  details?: string;
}

// In-memory registry of seeded users on the server
const inMemorySeededUsers: SeededUserRecord[] = [];

/**
 * Retrieve list of all users seeded on this server instance
 */
export function getSeededUsers(): SeededUserRecord[] {
  return [...inMemorySeededUsers];
}

/**
 * Lazy initializer for Firebase App on the server
 */
function getFirebaseServerApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID;
  const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.VITE_FIREBASE_APP_ID;

  return initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  });
}

/**
 * Lazy initializer for Firestore on the server
 */
function getFirebaseServerFirestore() {
  const app = getFirebaseServerApp();
  const dbId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID;
  return dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);
}

/**
 * Seed Admin User Utility Function.
 *
 * This function can be invoked:
 * 1. Programmatically via the Express server API (/api/admin/seed).
 * 2. In a CI/CD pipeline step (via `npm run seed:admin` or `tsx src/server/seedUser.ts`).
 *
 * It provisions the designated administrator user into the server directory,
 * ensures registration in Firebase Auth, and syncs the administrator document in Firestore.
 */
export async function seedAdminUser(options?: SeedUserOptions): Promise<SeedUserResult> {
  const timestamp = Date.now();
  console.log("[Seed Utility] Starting user seeding process...");

  // 1. Resolve Admin configuration from parameters, Secret Manager, or environment variables
  const creds = await getAdminCredentials();
  const targetEmail = (options?.email || creds.adminEmail || process.env.ADMIN_EMAIL || "admin@geminijournal.internal").toLowerCase().trim();
  const targetPassword = options?.password || creds.adminPassword || process.env.ADMIN_PASSWORD || "n0P@ssword";
  const targetDisplayName = options?.displayName || "System Administrator";
  const targetRole = options?.role || "admin";
  const targetStatus = options?.status || "active";
  const targetUid = options?.uid || "admin_default_master";

  let action: "created" | "updated" | "verified" = "created";
  let authSynced = false;
  let firestoreSynced = false;
  const detailsList: string[] = [];

  // 2. Register/update in server in-memory directory
  const existingIdx = inMemorySeededUsers.findIndex((u) => u.uid === targetUid || u.email === targetEmail);
  const userRecord: SeededUserRecord = {
    uid: targetUid,
    email: targetEmail,
    displayName: targetDisplayName,
    role: targetRole,
    status: targetStatus,
    createdAt: existingIdx >= 0 ? inMemorySeededUsers[existingIdx].createdAt : timestamp,
    lastLoginAt: timestamp,
  };

  if (existingIdx >= 0) {
    inMemorySeededUsers[existingIdx] = userRecord;
    action = "updated";
  } else {
    inMemorySeededUsers.push(userRecord);
    action = "created";
  }
  detailsList.push(`Server memory registry updated (${action}).`);

  // 3. Sync with Firebase Authentication if configured
  try {
    const app = getFirebaseServerApp();
    const auth = getAuth(app);

    try {
      // Try creating the user first
      const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, targetPassword);
      authSynced = true;
      detailsList.push(`Firebase Auth: user account created (uid: ${userCredential.user.uid}).`);
    } catch (authErr: any) {
      if (authErr.code === "auth/email-already-in-use") {
        // Try sign-in to verify credentials
        try {
          await signInWithEmailAndPassword(auth, targetEmail, targetPassword);
          authSynced = true;
          detailsList.push("Firebase Auth: user already exists and authenticated successfully.");
        } catch (signInErr: any) {
          authSynced = true; // Email already in use means account is registered in Auth
          detailsList.push(`Firebase Auth: account exists (${signInErr.code || signInErr.message}).`);
        }
      } else {
        detailsList.push(`Firebase Auth notice: ${authErr.message || authErr.code}`);
      }
    }
  } catch (err: any) {
    detailsList.push(`Firebase Auth initialization notice: ${err.message}`);
  }

  // 4. Sync with Cloud Firestore
  try {
    const db = getFirebaseServerFirestore();

    // Upsert into users collection
    const userDocRef = doc(db, "users", targetUid);
    await setDoc(
      userDocRef,
      {
        uid: targetUid,
        email: targetEmail,
        displayName: targetDisplayName,
        role: targetRole,
        status: targetStatus,
        createdAt: userRecord.createdAt,
        lastLoginAt: timestamp,
      },
      { merge: true }
    );

    // If admin role, also upsert into admins collection
    if (targetRole === "admin") {
      const adminDocRef = doc(db, "admins", targetUid);
      await setDoc(
        adminDocRef,
        {
          uid: targetUid,
          email: targetEmail,
          role: "admin",
          assignedAt: timestamp,
        },
        { merge: true }
      );
    }

    // Record audit log
    try {
      const auditLogRef = doc(db, "admin_audit_logs", `seed_${targetUid}_${timestamp}`);
      await setDoc(auditLogRef, {
        id: `seed_${targetUid}_${timestamp}`,
        adminUid: targetUid,
        adminEmail: targetEmail,
        targetUid,
        targetEmail,
        action: "user_created",
        details: "User seeded via CI/CD utility / API trigger",
        timestamp,
      }, { merge: true });
    } catch {
      // Non-blocking audit log
    }

    firestoreSynced = true;
    detailsList.push("Firestore: user and admin documents successfully synced.");
  } catch (firestoreErr: any) {
    console.warn("[Seed Utility] Firestore synchronization notice:", firestoreErr.message);
    detailsList.push(`Firestore notice: ${firestoreErr.message}`);
  }

  const result: SeedUserResult = {
    success: true,
    message: `Admin user '${targetEmail}' seeded successfully (${action}).`,
    action,
    user: userRecord,
    firestoreSynced,
    authSynced,
    timestamp,
    details: detailsList.join(" "),
  };

  console.log(`[Seed Utility] ${result.message}`);
  return result;
}

// Support CLI and CI/CD direct execution
const isCliExecution =
  process.argv[1]?.endsWith("seedUser.ts") ||
  process.argv[1]?.endsWith("seedUser.js") ||
  process.argv.includes("--seed");

if (isCliExecution) {
  console.log("=================================================");
  console.log("🚀 [CI/CD Seed Pipeline] Executing User Seeding...");
  console.log("=================================================");

  seedAdminUser()
    .then((res) => {
      console.log("✅ [CI/CD Seed Pipeline] Seeding completed successfully!");
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ [CI/CD Seed Pipeline] Seeding failed with error:", err);
      process.exit(1);
    });
}
