/**
 * Centralized SEO configuration for Kogno
 * This module provides default metadata and site configuration for use across all pages.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kogno.ai";

export const siteConfig = {
  name: "Kogno",
  shortName: "Kogno",
  description: "Learn Smarter, Not Harder. AI-powered courses, practice exams, and study materials that adapt to your learning style.",
  url: siteUrl,
  author: "Kogno",
  twitterHandle: "@kogno_ai",
  locale: "en_US",
  themeColor: "#6366f1",
  backgroundColor: "#ffffff",
};

export const defaultMetadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kogno",
    template: "%s | Kogno",
  },
  description: siteConfig.description,
  keywords: [
    "AI learning",
    "study app",
    "practice exams",
    "cheatsheets",
    "flashcards",
    "smart learning",
    "personalized education",
    "exam preparation",
    "course generator",
  ],
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  publisher: siteConfig.author,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: `${siteUrl}/images/og-default.png`,
        width: 1200,
        height: 630,
        alt: "Kogno - Learn Smarter, Not Harder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    images: [`${siteUrl}/images/og-default.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || null,
  },
};

/**
 * Helper to generate page-specific metadata
 * @param {Object} options - Page-specific metadata options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.path - Page path (e.g., "/download")
 * @param {string} options.image - Custom OG image URL
 * @param {boolean} options.noIndex - Whether to noindex the page
 * @returns {Object} Merged metadata object
 */
export function generatePageMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
}) {
  const pageUrl = `${siteUrl}${path}`;
  const pageImage = image || `${siteUrl}/images/og-default.png`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [pageImage],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
