/**
 * Dynamic sitemap configuration for Kogno
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kogno.ai";

export default function sitemap() {
  const now = new Date();

  // Static routes that should be indexed
  const staticRoutes = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/download`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/help/latex`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/auth/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/auth/create-account`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Note: Pricing page is intentionally excluded (negotiation-based pricing)
  // Note: Dynamic routes like /courses/*, /share/*, /join/* are excluded (user-generated content)

  return staticRoutes;
}
