import { generatePageMetadata } from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import Link from "next/link";

export const metadata = generatePageMetadata({
  title: "Privacy Policy",
  description: "Learn how Kogno collects, uses, and protects your personal information. Our privacy policy explains your rights and our data practices.",
  path: "/legal/privacy",
});

export default function PrivacyPolicyPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Privacy Policy", url: "/legal/privacy" },
  ];

  const lastUpdated = "January 27, 2026";

  return (
    <>
      <JsonLd schema={generateBreadcrumbSchema(breadcrumbs)} />
      <div className="min-h-screen bg-[var(--background)] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-8">
            Last updated: {lastUpdated}
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                1. Introduction
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Kogno (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered study platform and related services (collectively, the &quot;Service&quot;). Please read this policy carefully. By using the Service, you consent to the practices described in this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li><strong className="text-[var(--foreground)]">Account Information:</strong> When you create an account, we collect your email address, name, and password. We may also collect your educational institution if you register with a .edu email address.</li>
                <li><strong className="text-[var(--foreground)]">Course Content:</strong> Syllabi, course materials, study notes, and other educational content you upload to the Service.</li>
                <li><strong className="text-[var(--foreground)]">User-Generated Content:</strong> Flashcards, practice exams, cheatsheets, and other study materials you create using the Service.</li>
                <li><strong className="text-[var(--foreground)]">Communications:</strong> Messages you send through our platform, including interactions with our AI tutor and support requests.</li>
                <li><strong className="text-[var(--foreground)]">Payment Information:</strong> When you subscribe to premium features, our payment processor (Stripe) collects payment card details. We do not store your full payment card information on our servers.</li>
              </ul>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                2.2 Information Collected Automatically
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li><strong className="text-[var(--foreground)]">Usage Data:</strong> Information about how you interact with the Service, including features used, study sessions, and learning progress.</li>
                <li><strong className="text-[var(--foreground)]">Device Information:</strong> Device type, operating system, browser type, and unique device identifiers.</li>
                <li><strong className="text-[var(--foreground)]">Log Data:</strong> IP address, access times, pages viewed, and referring URLs.</li>
                <li><strong className="text-[var(--foreground)]">Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li>Provide, maintain, and improve the Service</li>
                <li>Generate personalized study plans, practice exams, and learning materials using AI</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, security alerts, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                <li>Personalize and improve your experience</li>
                <li>Develop new products, services, and features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                4. AI and Machine Learning
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Our Service uses artificial intelligence and machine learning to provide personalized study experiences. Your uploaded content and interactions may be processed by AI systems to generate study materials, provide tutoring assistance, and improve our algorithms. We implement appropriate safeguards to protect your data in these processes. We do not use your personal content to train our AI models without your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                5. Information Sharing and Disclosure
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li><strong className="text-[var(--foreground)]">Service Providers:</strong> With third-party vendors who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting, and customer service.</li>
                <li><strong className="text-[var(--foreground)]">Legal Requirements:</strong> If required by law or in response to valid requests by public authorities.</li>
                <li><strong className="text-[var(--foreground)]">Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business.</li>
                <li><strong className="text-[var(--foreground)]">With Your Consent:</strong> When you direct us to share your information with others, such as when sharing study materials with classmates.</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                6. Data Retention
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide you with the Service. We may also retain and use your information to comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                7. Data Security
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data in transit and at rest, regular security assessments, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                8. Your Rights and Choices
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li><strong className="text-[var(--foreground)]">Access:</strong> Request access to your personal information.</li>
                <li><strong className="text-[var(--foreground)]">Correction:</strong> Request correction of inaccurate or incomplete information.</li>
                <li><strong className="text-[var(--foreground)]">Deletion:</strong> Request deletion of your personal information.</li>
                <li><strong className="text-[var(--foreground)]">Portability:</strong> Request a copy of your data in a portable format.</li>
                <li><strong className="text-[var(--foreground)]">Opt-Out:</strong> Opt out of marketing communications at any time.</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                To exercise these rights, please contact us at{" "}
                <a href="mailto:team@kognolearn.com" className="text-[var(--primary)] hover:underline">
                  team@kognolearn.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                9. California Privacy Rights (CCPA)
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete your information, and the right to opt-out of the sale of personal information. As noted above, we do not sell personal information. To exercise your CCPA rights, please contact us using the information provided below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We take appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                11. Children&apos;s Privacy
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                The Service is intended for users who are at least 13 years old. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will take steps to delete that information promptly. If you believe we have collected information from a child under 13, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                12. Changes to This Privacy Policy
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes. Your continued use of the Service after any modifications indicates your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                13. Contact Us
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                <p className="text-[var(--foreground)] font-medium">Kogno</p>
                <p className="text-[var(--muted-foreground)]">
                  Email:{" "}
                  <a href="mailto:team@kognolearn.com" className="text-[var(--primary)] hover:underline">
                    team@kognolearn.com
                  </a>
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)]">
              See also:{" "}
              <Link href="/legal/terms" className="text-[var(--primary)] hover:underline">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
