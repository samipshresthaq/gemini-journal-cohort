# Gemini Reflection Journal

A secure, private, user-authenticated personal reflection and journaling application built with **Google GenAI SDK (`@google/genai`)**, **Gemini 3.6 Flash**, **Firebase Authentication**, **Cloud Firestore**, and **Google Cloud Run**.

---

## 🌟 Features

- 🔐 **Firebase Authentication**: Secure Google Sign-In with zero password storage.
- 🛡️ **Zero-Trust Data Isolation**: Cloud Firestore security rules strictly isolate all journal entries and interaction telemetry to `users/{userId}/...`.
- 🤖 **Gemini 3.6 Flash Conversational Engine**: Multi-turn dialogue with prompt injection safeguards and automated model fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`).
- 🧭 **Automated Growth Synthesis**: Real-time extraction of executive overviews, key takeaways, emotional tone, and interactive action items.
- 💾 **Defensive Persistence**: Real-time bidirectional Firestore sync with automatic undefined stripping and transaction recovery.
- 📊 **Reflection History & Markdown Export**: Fast search, filtering by mood or favorites, and one-click export to Markdown (`.md`).

---

## 🏗️ Architecture & Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  - React 19 + Tailwind CSS + Lucide Icons                   │
│  - Firebase Auth (Google Sign-In Popup/Persistence)         │
│  - Cloud Firestore Client (Owner-bound path queries)        │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP POST (/api/gemini/*)    │
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│              Backend Service (Cloud Run / Node)             │
│  - Express Middleware (Top-level body parsing & safety)     │
│  - Google GenAI SDK (@google/genai)                         │
│  - GEMINI_API_KEY loaded securely via Secret Manager / env  │
│  - Resilient Model Fallback Ladder & Error Recovery Matrix  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Deployment & Configuration Guide

### 1. Prerequisites & GCP API Activation

Ensure the `gcloud` CLI and Firebase CLI are installed and authenticated:

```bash
# Set your project ID
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="asia-east1"
gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com
```

---

### 2. Secret Manager Setup (Zero-Hardcoding Hygiene)

Securely store your Gemini API key in Secret Manager:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Identify your Cloud Run service account
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# 3. Grant Secret Accessor role to the Cloud Run runtime service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Database Security Configuration (Cloud Firestore)

Deploy the owner-bound `firestore.rules` to enforce absolute user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Isolated journal entries
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Isolated interactions and telemetry
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

### 4. Build & Deploy to Google Cloud Run

Deploy directly from source using Cloud Build and Cloud Run with the Secret Manager binding:

```bash
gcloud run deploy gemini-reflection-journal \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production
```

---

### 5. Automated Challenge Verification & Campaign Labeling

Apply the mandatory verification resource label to register your Cloud Run service for automated challenge scoring:

```bash
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 🧪 Functional Walkthrough & Verification Steps

| Test ID | Module | Verification Step | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Auth** | Click "Continue with Google" on landing page | Popup signs user in; navbar shows user avatar and email; dashboard opens. |
| **TC-02** | **Reflection** | Choose a reflection starter (e.g. Daily Review) and select a mood | Textarea pre-fills and focus tag updates immediately. |
| **TC-03** | **Gemini AI** | Press Cmd/Ctrl + Enter to send reflection prompt | Gemini 3.6 Flash streams/returns structured, empathetic markdown response. |
| **TC-04** | **Synthesis** | Click "Generate Growth Summary" after 2+ turns | Structured Summary Card renders with Overview, Takeaways, and actionable checklist. |
| **TC-05** | **Firestore** | Verify "Saved to Cloud" pill in navbar | Refresh page; all entries and messages persist safely without loss. |
| **TC-06** | **History** | Open "Past Entries", search, favorite, or export | Realtime filtered list updates; `.md` markdown file downloads on export. |

---

## 📜 License
Apache-2.0
