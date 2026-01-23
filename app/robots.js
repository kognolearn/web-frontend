/**
 * Dynamic robots.txt configuration for Kogno
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kogno.ai";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/download", "/help/", "/auth/sign-in", "/auth/create-account"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/courses/",
          "/checkout/",
          "/subscription/",
          "/share/",
          "/join/",
          "/_next/",
        ],
      },
      // Block AI crawlers from protected content
      {
        userAgent: "GPTBot",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/courses/",
          "/checkout/",
          "/subscription/",
          "/share/",
          "/join/",
        ],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/courses/",
          "/checkout/",
          "/subscription/",
          "/share/",
          "/join/",
        ],
      },
      {
        userAgent: "Claude-Web",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/courses/",
          "/checkout/",
          "/subscription/",
          "/share/",
          "/join/",
        ],
      },
      {
        userAgent: "Amazonbot",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/courses/",
          "/checkout/",
          "/subscription/",
          "/share/",
          "/join/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
