import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { PRODUCTION_URL } from "@/lib/release";

if (process.env.VERCEL_ENV === "production") {
  process.env.NEXTAUTH_URL = PRODUCTION_URL;
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
