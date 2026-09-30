import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zoro Hub · Personal Secretary",
    short_name: "Zoro Hub",
    description: "Personal Chief of Staff with voice mode, Gmail and Calendar intelligence.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#05070a",
    theme_color: "#071018",
    orientation: "portrait",
    icons: [
      { src: "/zoro-nexus-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ask Zoro", short_name: "Ask Zoro", url: "/assistant", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Add reminder", short_name: "Reminder", url: "/notifications", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Today", short_name: "Today", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
