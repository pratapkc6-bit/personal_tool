import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zoro Nexus · Personal Secretary",
    short_name: "Zoro",
    description: "Personal operating system for priorities, Gmail, Calendar, reminders, intelligence and Zoro AI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F1E6",
    theme_color: "#8F1F2A",
    orientation: "portrait",
    icons: [
      { src: "/zoro-nexus-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", description: "Open your prioritized action inbox", url: "/today" },
      { name: "Ask Zoro", short_name: "Zoro", description: "Open the Zoro AI assistant", url: "/assistant" },
      { name: "Missions", short_name: "Tasks", description: "Open tasks and missions", url: "/tasks" },
      { name: "Reminders", short_name: "Remind", description: "Open alerts and reminders", url: "/notifications" },
      { name: "Intel", short_name: "Intel", description: "Open the Intelligence Data Hub", url: "/intelligence" },
    ],
  };
}