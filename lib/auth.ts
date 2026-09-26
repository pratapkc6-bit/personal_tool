import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

const PRODUCTION_URL = "https://pratap-personal-secretary-ksuyanpks-projects.vercel.app";
const GOOGLE_CALLBACK_URL = `${PRODUCTION_URL}/api/auth/callback/google`;

if (process.env.VERCEL_ENV === "production") {
  process.env.NEXTAUTH_URL = PRODUCTION_URL;
}

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export const runtimeAuthConfigured = Boolean(
  process.env.DATABASE_URL &&
  process.env.NEXTAUTH_SECRET &&
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);

const baseAdapter = PrismaAdapter(db);

const safeAdapter: NonNullable<NextAuthOptions["adapter"]> = {
  ...baseAdapter,
  async linkAccount(account) {
    const {
      userId,
      type,
      provider,
      providerAccountId,
      refresh_token,
      access_token,
      expires_at,
      token_type,
      scope,
      id_token,
      session_state,
    } = account;

    return baseAdapter.linkAccount!({
      userId,
      type,
      provider,
      providerAccountId,
      refresh_token,
      access_token,
      expires_at,
      token_type,
      scope,
      id_token,
      session_state,
    });
  },
};

const providers = runtimeAuthConfigured
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: googleScopes,
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
            redirect_uri:
              process.env.VERCEL_ENV === "production"
                ? GOOGLE_CALLBACK_URL
                : undefined,
          },
        },
        token:
          process.env.VERCEL_ENV === "production"
            ? {
                params: {
                  redirect_uri: GOOGLE_CALLBACK_URL,
                },
              }
            : undefined,
      }),
    ]
  : [];

export const authOptions: NextAuthOptions = {
  ...(runtimeAuthConfigured
    ? {
        adapter: safeAdapter,
        session: { strategy: "database" as const },
      }
    : {
        session: { strategy: "jwt" as const },
      }),
  secret: runtimeAuthConfigured
    ? process.env.NEXTAUTH_SECRET
    : "personal-secretary-auth-disabled-until-configured",
  providers,
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) session.user.id = user?.id ?? token?.sub ?? "";
      return session;
    },
    async redirect({ url }) {
      if (process.env.VERCEL_ENV === "production") {
        if (url.startsWith("/")) return `${PRODUCTION_URL}${url}`;
        try {
          if (new URL(url).origin === PRODUCTION_URL) return url;
        } catch {}
        return PRODUCTION_URL;
      }
      return url;
    },
  },
  pages: {
    signIn: "/connections",
  },
};
