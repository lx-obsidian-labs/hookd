import type { Metadata } from "next";
import { ModelProfileClient } from "./model-profile-client";

type ModelProfilePageProps = {
  params: Promise<{ slug: string }>;
};

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: ModelProfilePageProps): Promise<Metadata> {
  const resolved = await params;
  const name = titleFromSlug(resolved.slug);
  const canonicalPath = `/models/${resolved.slug}`;
  return {
    title: `${name} | Model Profile | Hook'd`,
    description: `View ${name}'s profile, gallery highlights, and premium interaction rates on Hook'd.`,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${name} | Hook'd`,
      description: `Browse ${name}'s profile and unlock premium interactions on Hook'd.`,
      url: canonicalPath,
      type: "profile",
      images: [
        {
          url: "/cover-default.svg",
          width: 640,
          height: 360,
          alt: `${name} profile cover`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | Hook'd`,
      description: `Browse ${name}'s profile and unlock premium interactions on Hook'd.`,
      images: ["/cover-default.svg"],
    },
  };
}

export default async function ModelProfilePage({ params }: ModelProfilePageProps) {
  const resolved = await params;
  const name = titleFromSlug(resolved.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description: `${name} profile on Hook'd with premium chat media and private call pricing.`,
    url: `http://localhost:3000/models/${resolved.slug}`,
    image: "http://localhost:3000/cover-default.svg",
    mainEntityOfPage: `http://localhost:3000/models/${resolved.slug}`,
    makesOffer: [
      {
        "@type": "Offer",
        name: "Paid image unlock",
        priceCurrency: "TOK",
        price: "15",
      },
      {
        "@type": "Offer",
        name: "Paid video unlock",
        priceCurrency: "TOK",
        price: "40",
      },
      {
        "@type": "Offer",
        name: "Private call per minute",
        priceCurrency: "TOK",
        price: "22",
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ModelProfileClient slug={resolved.slug} />
    </>
  );
}
