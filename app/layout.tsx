import type { Metadata } from "next";
import "./globals.css";
import "./hub.css";
import "./nexus.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Zoro Nexus · Personal Operating System",
  description: "Private personal chief of staff with voice, Gmail, Calendar and local intelligence.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zoro Nexus",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
