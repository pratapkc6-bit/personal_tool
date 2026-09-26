import type { Metadata } from "next";
import "./globals.css";
import "./hub.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Zoro Hub · Personal Secretary",
  description: "Private personal chief of staff with Zoro voice mode.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zoro",
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

