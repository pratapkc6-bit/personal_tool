import pkg from "@/package.json";

export const APP_VERSION = pkg.version;
export const PRODUCTION_URL = "https://pratap-personal-secretary-ksuyanpks-projects.vercel.app";
export const GOOGLE_CALLBACK_URL = `${PRODUCTION_URL}/api/auth/callback/google`;

export function deploymentMetadata() {
  const effectiveNextAuthUrl = process.env.NEXTAUTH_URL || "not set";
  const clientId = process.env.GOOGLE_CLIENT_ID || "not set";

  return {
    version: APP_VERSION,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    branch: process.env.VERCEL_GIT_COMMIT_REF || "unavailable",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "unavailable",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "unavailable",
    deploymentUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : PRODUCTION_URL,
    effectiveNextAuthUrl,
    effectiveGoogleCallback:
      effectiveNextAuthUrl === "not set"
        ? "not set"
        : `${effectiveNextAuthUrl.replace(/\/$/, "")}/api/auth/callback/google`,
    googleClientIdHint:
      clientId === "not set"
        ? "not set"
        : `…${clientId.slice(-18)}`,
  };
}
