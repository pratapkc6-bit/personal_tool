"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton({ connected }: { connected: boolean }) {
  return connected ? (
    <button onClick={() => signOut()} className="rounded-xl border border-slate-300 px-4 py-2 font-medium">
      Disconnect session
    </button>
  ) : (
    <button onClick={() => signIn("google", { callbackUrl: "/" })} className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white">
      Connect Google
    </button>
  );
}
