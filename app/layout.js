import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";
import SupabaseSessionProvider from "@/components/auth/SupabaseSessionProvider";
import { OnboardingProvider } from "@/components/ui/OnboardingProvider";
import { MathJaxContext } from "better-react-mathjax";


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
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]]
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
              {/* Persistent theme toggle (shown only when logged in) */}
              <ThemeToggle />
              {children}
            </OnboardingProvider>
          </ThemeProvider>
        </MathJaxContext>
      </body>
    </html>
  );
}
