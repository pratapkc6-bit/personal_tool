import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pratap Personal Secretary · Zoro",
    short_name: "Zoro",
    description: "Personal Chief of Staff with voice mode, Gmail and Calendar intelligence.",
    start_url: "/assistant",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#0f172a",
    orientation: "portrait",
  };
}
