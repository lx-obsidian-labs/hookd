import type { MetadataRoute } from "next";
import { knownModelSlugs } from "@/lib/profile-assets";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "http://localhost:3000";
  const now = new Date();

  const staticRoutes = [
    "",
    "/models",
    "/discover",
    "/matches",
    "/chat",
    "/wallet",
    "/calls",
    "/safety",
    "/profile",
    "/favorites",
    "/auth/sign-in",
    "/auth/sign-up",
  ];

  const modelRoutes = knownModelSlugs().map((slug) => `/models/${slug}`);

  return [...staticRoutes, ...modelRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/models/") ? "daily" : "weekly",
    priority: route === "" ? 1 : route.startsWith("/models/") ? 0.8 : 0.7,
  }));
}
