import type { Metadata } from "next";
import "./globals.css";
import "./hub.css";
import "./nexus.css";
import "./house-five-skin.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Zoro Nexus · Personal Operating System",
  description: "Private personal chief of staff with voice, Gmail, Calendar and local intelligence.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/zoro-nexus-icon.png", sizes: "180x180", type: "image/png" }],
    apple: [{ url: "/zoro-nexus-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/zoro-nexus-icon.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zoro Nexus",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="normal">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
