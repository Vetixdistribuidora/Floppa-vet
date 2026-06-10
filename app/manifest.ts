import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Floppa",
    short_name: "Floppa",
    description: "Sistema de gestión para distribuidoras",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0f1a",
    theme_color: "#1e40af",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/api/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
    screenshots: [],
  }
}
