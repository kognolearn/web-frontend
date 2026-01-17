import { Nunito } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import "@/styles/jsxgraph.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CodeEditorSettingsProvider } from "@/components/editor/CodeEditorSettingsProvider";
import SupabaseSessionProvider from "@/components/auth/SupabaseSessionProvider";
import { OnboardingProvider } from "@/components/ui/OnboardingProvider";
import { MathJaxContext } from "better-react-mathjax";
import FeedbackWidget from "@/components/ui/FeedbackWidget";
import TrialNegotiationGate from "@/components/onboarding/TrialNegotiationGate";
import { Analytics } from "@vercel/analytics/react";
import { defaultMetadata } from "@/lib/seo/config";
import { JsonLd, MultiJsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateSoftwareApplicationSchema } from "@/lib/seo/structured-data";


const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  ...defaultMetadata,
};

const mathJaxConfig = {
  loader: { load: ["[tex]/html", "[tex]/ams", "[tex]/newcommand"] },
  tex: {
    packages: { "[+]": ["html", "ams", "newcommand"] },
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    // Process escapes to handle \{ and \} properly
    processEscapes: true,
    macros: {
      // Signal processing functions
      rect: "\\operatorname{rect}",
      tri: "\\operatorname{tri}",
      sinc: "\\operatorname{sinc}",
      sha: "\\operatorname{sha}",
      sgn: "\\operatorname{sgn}",
      // Fourier transform notation
      F: "\\mathcal{F}",
      Laplace: "\\mathcal{L}",
      // Common operators
      real: "\\operatorname{Re}",
      imag: "\\operatorname{Im}",
      // Probability/stats
      Var: "\\operatorname{Var}",
      Cov: "\\operatorname{Cov}",
      E: "\\operatorname{E}",
      Prob: "\\operatorname{P}",
    }
  },
  options: {
    enableMenu: false,
    enableExplorer: false,
    enableAssistiveMml: false,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="theme-light">
      <body className={`${nunito.variable} antialiased`}>
        <MultiJsonLd
          schemas={[
            generateOrganizationSchema(),
            generateSoftwareApplicationSchema(),
          ]}
        />
        <MathJaxContext config={mathJaxConfig}>
          <ThemeProvider>
            <CodeEditorSettingsProvider>
              <OnboardingProvider>
                <SupabaseSessionProvider />
                <TrialNegotiationGate />
                {children}
                <FeedbackWidget />
                <Analytics />
              </OnboardingProvider>
            </CodeEditorSettingsProvider>
          </ThemeProvider>
        </MathJaxContext>
      </body>
    </html>
  );
}
