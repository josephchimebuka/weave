import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weave | Bridge Fiat & Crypto Seamlessly",
    short_name: "Weave",
    description: "Accept global crypto payments and settle instantly in local fiat.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F4EF",
    theme_color: "#0F5D4C",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
