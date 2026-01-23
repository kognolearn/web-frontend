import { generatePageMetadata } from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateSoftwareApplicationSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import DownloadClient from "./DownloadClient";

export const metadata = generatePageMetadata({
  title: "Download Kogno",
  description: "Download the Kogno desktop app for Windows, macOS, or Linux. AI-powered learning that adapts to your style - practice exams, cheatsheets, and smart study materials.",
  path: "/download",
  image: "/images/og-download.png",
});

export default function DownloadPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Download", url: "/download" },
  ];

  return (
    <>
      <JsonLd schema={generateSoftwareApplicationSchema()} />
      <JsonLd schema={generateBreadcrumbSchema(breadcrumbs)} />
      <DownloadClient />
    </>
  );
}
