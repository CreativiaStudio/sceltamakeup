import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/account", "/checkout", "/app-start", "/app", "/ordini"],
    },
    sitemap: "https://www.sceltamakeup.it/sitemap.xml",
  };
}
