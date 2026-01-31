import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";
import "@/styles/jsxgraph.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CodeEditorSettingsProvider } from "@/components/editor/CodeEditorSettingsProvider";
import SupabaseSessionProvider from "@/components/auth/SupabaseSessionProvider";
import { OnboardingProvider } from "@/components/ui/OnboardingProvider";
import { GuidedTourProvider } from "@/components/tour/GuidedTourProvider";
import KognoTour from "@/components/tour/KognoTour";
import { tourConfigs } from "@/components/tour/kognoTourConfig";
import { MathJaxContext } from "better-react-mathjax";
import FeedbackWidget from "@/components/ui/FeedbackWidget";
import TrialNegotiationGate from "@/components/onboarding/TrialNegotiationGate";
import { Analytics } from "@vercel/analytics/react";
import { MultiJsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateSoftwareApplicationSchema } from "@/lib/seo/structured-data";
import { SeedsProvider } from "@/components/seeds/SeedsProvider";
import SeedAnimationOrchestrator from "@/components/seeds/SeedAnimationOrchestrator";


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kogno.ai";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kogno",
    template: "%s | Kogno",
  },
  description: "Learn Smarter, Not Harder. AI-powered courses, practice exams, and study materials that adapt to your learning style.",
  manifest: "/manifest.json",
};

const mathJaxConfig = {
  loader: { load: ["[tex]/html", "[tex]/ams", "[tex]/newcommand"] },
  tex: {
    packages: { "[+]": ["html", "ams", "newcommand"] },
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    macros: {
      rect: "\\operatorname{rect}",
      tri: "\\operatorname{tri}",
      sinc: "\\operatorname{sinc}",
      sha: "\\operatorname{sha}",
      sgn: "\\operatorname{sgn}",
      F: "\\mathcal{F}",
      Laplace: "\\mathcal{L}",
      real: "\\operatorname{Re}",
      imag: "\\operatorname{Im}",
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
      <body className="antialiased">
        <Script id="kogno-client-error-logger" strategy="beforeInteractive">
          {`
(function () {
  if (window.__kognoErrorLogger__) return;
  window.__kognoErrorLogger__ = true;

  function safeLocalStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function getContext() {
    return {
      href: window.location && window.location.href,
      pathname: window.location && window.location.pathname,
      readyState: document && document.readyState,
      buildId: window.__NEXT_DATA__ && window.__NEXT_DATA__.buildId,
      userAgent: navigator && navigator.userAgent,
      tourState: safeLocalStorage("kogno_tour_state"),
      tourStateVersion: safeLocalStorage("kogno_tour_state_version"),
    };
  }

  function logPayload(type, payload) {
    try {
      console.groupCollapsed("[Kogno] Client error:", type);
      console.log(payload);
      console.log("context:", getContext());
      console.groupEnd();
    } catch (e) {
      // ignore logging failures
    }
  }

  window.addEventListener("error", function (event) {
    logPayload("error", {
      message: event && event.message,
      filename: event && event.filename,
      lineno: event && event.lineno,
      colno: event && event.colno,
      stack: event && event.error && event.error.stack,
    });
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason;
    logPayload("unhandledrejection", {
      message: reason && (reason.message || String(reason)),
      stack: reason && reason.stack,
      reason: reason,
    });
  }, true);
})();
          `}
        </Script>
        <MultiJsonLd
          schemas={[
            generateOrganizationSchema(),
            generateSoftwareApplicationSchema(),
          ]}
        />
        <MathJaxContext config={mathJaxConfig}>
          <ThemeProvider>
            <CodeEditorSettingsProvider>
              <SeedsProvider>
                <OnboardingProvider>
                  <GuidedTourProvider tourConfigs={tourConfigs}>
                    <SupabaseSessionProvider />
                    <TrialNegotiationGate />
                    {children}
                    <KognoTour />
                    <FeedbackWidget />
                    <SeedAnimationOrchestrator />
                    <Analytics />
                  </GuidedTourProvider>
                </OnboardingProvider>
              </SeedsProvider>
            </CodeEditorSettingsProvider>
          </ThemeProvider>
        </MathJaxContext>
      </body>
    </html>
  );
}
