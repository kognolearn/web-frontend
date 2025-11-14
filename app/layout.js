import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Kogno",
  description: "Study for Everything.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="theme-light">
      <body className={`${nunito.variable} antialiased`}>
        <ThemeProvider>
          {/* Persistent theme toggle (shown only when logged in) */}
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
