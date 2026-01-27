import { generatePageMetadata } from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import Link from "next/link";

export const metadata = generatePageMetadata({
  title: "Terms of Service",
  description: "Read the terms and conditions that govern your use of Kogno, an AI-powered study platform for college students.",
  path: "/legal/terms",
});

export default function TermsOfServicePage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Terms of Service", url: "/legal/terms" },
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
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-8">
            Last updated: {lastUpdated}
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Welcome to Kogno. By accessing or using our AI-powered study platform and related services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service. These Terms constitute a legally binding agreement between you and Kogno (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                2. Eligibility
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                You must be at least 13 years old to use the Service. If you are under 18, you represent that you have your parent or guardian&apos;s permission to use the Service. By using the Service, you represent and warrant that you meet these eligibility requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                3. Account Registration
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                To access certain features of the Service, you must create an account. When creating an account, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                We reserve the right to suspend or terminate your account if any information provided is inaccurate, false, or violates these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                4. Description of Service
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                Kogno provides an AI-powered study platform designed to help students learn more effectively. Our Service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li>AI-generated study plans based on your syllabus and course materials</li>
                <li>Practice exams and flashcards</li>
                <li>AI tutoring assistance</li>
                <li>Cheatsheet generation</li>
                <li>Progress tracking and analytics</li>
                <li>Course sharing and collaboration features</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                5. Subscription and Payment
              </h2>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                5.1 Free and Premium Tiers
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We offer both free and premium subscription tiers. The free tier includes limited access to features, while premium subscriptions provide enhanced functionality and higher usage limits. Feature availability and limitations for each tier are described on our website.
              </p>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                5.2 Billing
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                If you subscribe to a premium tier, you agree to pay the applicable subscription fees. Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your selection). Your subscription will automatically renew unless you cancel before the renewal date.
              </p>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                5.3 Cancellation
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                You may cancel your subscription at any time through your account settings. Upon cancellation, you will retain access to premium features until the end of your current billing period. We do not provide refunds for partial subscription periods.
              </p>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                5.4 Price Changes
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We reserve the right to change our subscription prices. Any price changes will be communicated to you in advance and will take effect at the start of your next billing cycle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                6. User Content
              </h2>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                6.1 Your Content
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                You retain ownership of all content you upload, create, or share through the Service (&quot;User Content&quot;), including syllabi, study materials, and user-generated flashcards. By uploading User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display such content solely for the purpose of providing and improving the Service.
              </p>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                6.2 Content Restrictions
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                You agree not to upload, share, or create User Content that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li>Infringes any third-party intellectual property rights</li>
                <li>Contains malware, viruses, or harmful code</li>
                <li>Is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
                <li>Violates any applicable laws or regulations</li>
                <li>Contains personally identifiable information of others without their consent</li>
              </ul>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                6.3 Content Removal
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We reserve the right to remove any User Content that violates these Terms or that we determine, in our sole discretion, is harmful to the Service or other users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                7. Acceptable Use
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Use any automated means to access the Service without our written permission</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Use the Service to generate content for academic dishonesty or cheating</li>
                <li>Share your account credentials with others</li>
                <li>Circumvent any access controls or usage limits</li>
                <li>Resell or redistribute the Service without authorization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                8. Academic Integrity
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Kogno is designed to help you study and learn more effectively. The Service is intended to supplement your education, not replace genuine learning or enable academic dishonesty. You are responsible for using the Service in compliance with your educational institution&apos;s academic integrity policies. We do not condone or support the use of our Service for cheating, plagiarism, or any other form of academic misconduct.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                9. Intellectual Property
              </h2>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                9.1 Our Intellectual Property
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                The Service, including all content, features, and functionality (excluding User Content), is owned by Kogno and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without our prior written consent.
              </p>

              <h3 className="text-lg font-medium text-[var(--foreground)] mb-3 mt-6">
                9.2 AI-Generated Content
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Content generated by our AI systems based on your inputs (such as study plans, practice questions, and summaries) is provided for your personal educational use. You may use such content for your own learning purposes, subject to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                10. Third-Party Services
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                The Service may integrate with or contain links to third-party websites, services, or content. We do not control and are not responsible for any third-party services. Your use of third-party services is at your own risk and subject to the terms and policies of those third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                11. Disclaimers
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-4">
                We do not warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>AI-generated content will be accurate, complete, or suitable for your specific educational needs</li>
                <li>The Service will meet your requirements or expectations</li>
                <li>Any defects in the Service will be corrected</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                AI-generated study materials are intended as learning aids and should not be relied upon as the sole source of information. Always verify important information with authoritative sources.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                12. Limitation of Liability
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, KOGNO AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF (OR INABILITY TO ACCESS OR USE) THE SERVICE. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US, IF ANY, IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                13. Indemnification
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                You agree to indemnify, defend, and hold harmless Kogno and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or in any way connected with your access to or use of the Service, your User Content, or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                14. Termination
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                15. Governing Law and Dispute Resolution
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                16. Changes to Terms
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of any material changes by posting the updated Terms on the Service and updating the &quot;Last updated&quot; date. Your continued use of the Service after any changes constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                17. General Provisions
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[var(--muted-foreground)]">
                <li><strong className="text-[var(--foreground)]">Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Kogno regarding the Service.</li>
                <li><strong className="text-[var(--foreground)]">Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</li>
                <li><strong className="text-[var(--foreground)]">Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</li>
                <li><strong className="text-[var(--foreground)]">Assignment:</strong> You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations under these Terms without restriction.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                18. Contact Us
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                If you have any questions about these Terms, please contact us at:
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
              <Link href="/legal/privacy" className="text-[var(--primary)] hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
