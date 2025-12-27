import { Nunito } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import SupabaseSessionProvider from "@/components/auth/SupabaseSessionProvider";
import { OnboardingProvider } from "@/components/ui/OnboardingProvider";
import { MathJaxContext } from "better-react-mathjax";
import FeedbackWidget from "@/components/ui/FeedbackWidget";


const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Kogno",
  description: "Learn Smarter, Not Harder",
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
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="theme-light">
      <body className={`${nunito.variable} antialiased`}>
        <MathJaxContext config={mathJaxConfig}>
          <ThemeProvider>
            <OnboardingProvider>
              <SupabaseSessionProvider />
              {children}
              <FeedbackWidget />
            </OnboardingProvider>
          </ThemeProvider>
        </MathJaxContext>
      </body>
    </html>
  );
}
