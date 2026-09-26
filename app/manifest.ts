import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zoro Hub · Personal Secretary",
    short_name: "Zoro Hub",
    description: "Personal Chief of Staff with voice mode, Gmail and Calendar intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#ff9900",
    orientation: "portrait",
  };
}

