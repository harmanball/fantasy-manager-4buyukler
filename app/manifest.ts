import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fantasy Manager: 4 Büyükler",
    short_name: "Fantasy Manager",
    description:
      "Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor'dan kadronu kur, kaptanını seç, her hafta yarış.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F3D2E",
    theme_color: "#0F3D2E",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/manifest-icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
