import { google } from "googleapis";
import { db } from "@/lib/db";

export async function getGoogleOAuthClient(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) throw new Error("Google account is not connected.");

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  return oauth2;
}

export async function getGoogleServices(userId: string) {
  const auth = await getGoogleOAuthClient(userId);
  return {
    calendar: google.calendar({ version: "v3", auth }),
    gmail: google.gmail({ version: "v1", auth }),
  };
}
