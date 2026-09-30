import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zoro Hub · Personal Secretary",
    short_name: "Zoro Hub",
    description: "Personal Chief of Staff with voice mode, Gmail and Calendar intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070a",
    theme_color: "#071018",
    orientation: "portrait",
    icons: [
      {
        src: "/zoro-nexus-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
