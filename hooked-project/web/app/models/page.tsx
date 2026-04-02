import type { Metadata } from "next";
import { knownModelSlugs } from "@/lib/profile-assets";
import { Suspense } from "react";
import { ModelsDirectoryClient } from "./models-directory-client";

export const metadata: Metadata = {
  title: "Models Directory | Hook'd",
  description:
    "Browse model profiles, compare rates, and filter by city, availability, and pricing in Hook'd.",
  alternates: {
    canonical: "/models",
  },
  openGraph: {
    title: "Models Directory | Hook'd",
    description:
      "Browse model profiles, compare rates, and filter by city, availability, and pricing in Hook'd.",
    url: "/models",
    type: "website",
    images: [
      {
        url: "/cover-default.svg",
        width: 640,
        height: 360,
        alt: "Models directory cover",
      },
    ],
  },
};

export default function ModelsDirectoryPage() {
  const slugs = knownModelSlugs();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Hook'd Models Directory",
    description: "Browse model profiles, rates, and availability.",
    url: "http://localhost:3000/models",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: slugs.map((slug, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `http://localhost:3000/models/${slug}`,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="min-h-screen" />}>
        <ModelsDirectoryClient />
      </Suspense>
    </>
  );
}
