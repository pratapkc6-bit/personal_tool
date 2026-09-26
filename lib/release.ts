import pkg from "@/package.json";

export const APP_VERSION = pkg.version;
export const PRODUCTION_URL = "https://pratap-personal-secretary-ksuyanpks-projects.vercel.app";
export const GOOGLE_CALLBACK_URL = `${PRODUCTION_URL}/api/auth/callback/google`;

export function deploymentMetadata() {
  return {
    version: APP_VERSION,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    branch: process.env.VERCEL_GIT_COMMIT_REF || "unavailable",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "unavailable",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "unavailable",
    deploymentUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : PRODUCTION_URL,
  };
}
