import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

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
          },
        },
      }),
    ]
  : [];

export const authOptions: NextAuthOptions = {
  ...(runtimeAuthConfigured
    ? {
        adapter: PrismaAdapter(db),
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
  },
  pages: {
    signIn: "/connections",
  },
};
