import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let secretManagerClient: SecretManagerServiceClient | null = null;

function getSecretManagerClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

/**
 * Access a secret from Google Cloud Secret Manager with graceful fallback to process.env.
 * Never throws an uncaught error if Secret Manager is not provisioned or running in sandbox.
 */
export async function accessSecret(
  secretId: string,
  fallbackEnvVar?: string,
  defaultValue?: string
): Promise<string | undefined> {
  const envKey = fallbackEnvVar || secretId;
  
  // 1. If explicit environment variable exists, prefer or fallback to it
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // 2. Try fetching from GCP Secret Manager if project is configured
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    return defaultValue;
  }

  try {
    const client = getSecretManagerClient();
    const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (payload) {
      return payload.trim();
    }
  } catch (error: any) {
    // Only log brief debug message without logging sensitive tokens
    console.warn(`[SecretManager] Secret '${secretId}' lookup notice:`, error.message);
  }

  return defaultValue;
}

/**
 * Retrieve administrator credentials securely from Secret Manager or environment variables.
 * Credentials are kept strictly on the server and NEVER exposed to the frontend or UI.
 */
export async function getAdminCredentials(): Promise<{
  adminEmail: string;
  adminPassword?: string;
  authorizedEmails: string[];
  isConfigured: boolean;
}> {
  // Check for JSON secret 'ADMIN_CREDENTIALS' first
  const jsonSecret = await accessSecret("ADMIN_CREDENTIALS", "ADMIN_CREDENTIALS");
  if (jsonSecret) {
    try {
      const parsed = JSON.parse(jsonSecret);
      if (parsed.email) {
        const email = parsed.email.toLowerCase().trim();
        return {
          adminEmail: email,
          adminPassword: parsed.password,
          authorizedEmails: [email, ...(parsed.authorizedEmails || []).map((e: string) => e.toLowerCase().trim())],
          isConfigured: true,
        };
      }
    } catch {
      // Non-JSON secret, continue with individual secret lookups
    }
  }

  // Fetch individual secrets from Secret Manager or server environment variables
  const fetchedEmail = await accessSecret("ADMIN_EMAIL", "ADMIN_EMAIL");
  const adminEmail = (fetchedEmail || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const adminPassword = await accessSecret("ADMIN_PASSWORD", "ADMIN_PASSWORD") || process.env.ADMIN_PASSWORD;
  const configuredExtra = (await accessSecret("ADMIN_AUTHORIZED_EMAILS", "ADMIN_AUTHORIZED_EMAILS")) || process.env.ADMIN_AUTHORIZED_EMAILS || "";
  
  const authorizedEmails = [
    adminEmail,
    ...configuredExtra.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  ].filter(Boolean);

  return {
    adminEmail,
    adminPassword,
    authorizedEmails: Array.from(new Set(authorizedEmails)),
    isConfigured: Boolean(adminPassword || jsonSecret),
  };
}
