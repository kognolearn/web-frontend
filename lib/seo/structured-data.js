/**
 * JSON-LD Structured Data Schema Generators
 * @see https://schema.org
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

import { siteConfig } from "./config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kogno.ai";

/**
 * Generate Organization schema for site-wide use
 * @returns {Object} Organization JSON-LD schema
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    description: siteConfig.description,
    sameAs: [
      // Add social media URLs when available
      // "https://twitter.com/kogno_ai",
      // "https://www.linkedin.com/company/kogno",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "team@kognolearn.com",
    },
  };
}

/**
 * Generate SoftwareApplication schema for the Kogno desktop app
 * @returns {Object} SoftwareApplication JSON-LD schema
 */
export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: siteConfig.description,
    url: siteUrl,
    downloadUrl: `${siteUrl}/download`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available with limited courses",
    },
    featureList: [
      "AI-powered course generation",
      "Practice exams with instant feedback",
      "Interactive cheatsheets",
      "Flashcard decks",
      "Progress tracking",
      "Multi-platform support",
    ],
  };
}

/**
 * Generate FAQ schema for help pages
 * @param {Array<{question: string, answer: string}>} faqs - Array of FAQ items
 * @returns {Object} FAQPage JSON-LD schema
 */
export function generateFAQSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate BreadcrumbList schema for navigation context
 * @param {Array<{name: string, url: string}>} items - Array of breadcrumb items
 * @returns {Object} BreadcrumbList JSON-LD schema
 */
export function generateBreadcrumbSchema(items) {
  if (!items || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}

/**
 * Generate WebPage schema for individual pages
 * @param {Object} options - Page options
 * @param {string} options.name - Page name
 * @param {string} options.description - Page description
 * @param {string} options.url - Page URL
 * @returns {Object} WebPage JSON-LD schema
 */
export function generateWebPageSchema({ name, description, url }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: url.startsWith("http") ? url : `${siteUrl}${url}`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteUrl,
    },
  };
}

/**
 * Generate HowTo schema for tutorial content
 * @param {Object} options - HowTo options
 * @param {string} options.name - Tutorial name
 * @param {string} options.description - Tutorial description
 * @param {Array<{name: string, text: string}>} options.steps - Tutorial steps
 * @returns {Object} HowTo JSON-LD schema
 */
export function generateHowToSchema({ name, description, steps }) {
  if (!steps || steps.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
