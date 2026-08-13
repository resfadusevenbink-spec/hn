import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const siteTitle = "henne.06 - Réservation henné";
const siteDescription =
  "Choisissez un modèle de henné traditionnel et réservez votre créneau dans le 06.";

async function getMetadataBase() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return new URL(host ? `${protocol}://${host}` : "https://henne-06.site");
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await getMetadataBase();
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: siteTitle,
    description: siteDescription,
    icons: {
      icon: "/og.png",
      shortcut: "/og.png",
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      type: "website",
      url: metadataBase,
      images: [
        {
          url: imageUrl,
          width: 1600,
          height: 900,
          alt: "henne.06 - Réservation henné",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
