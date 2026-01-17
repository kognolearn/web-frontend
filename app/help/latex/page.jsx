import { generatePageMetadata } from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";
import LatexHelpClient from "./LatexHelpClient";

export const metadata = generatePageMetadata({
  title: "LaTeX Quick Reference",
  description: "Copy-ready LaTeX and MathJax snippets for math notation. Find commands for fractions, integrals, matrices, Greek letters, and more with instant clipboard copy.",
  path: "/help/latex",
});

// FAQ schema for common LaTeX questions
const faqItems = [
  {
    question: "How do I write fractions in LaTeX?",
    answer: "Use \\frac{numerator}{denominator}. For example, \\frac{a}{b} creates a/b as a fraction.",
  },
  {
    question: "How do I write inline vs display math in MathJax?",
    answer: "Use \\( ... \\) for inline math and \\[ ... \\] for display math. Some sites also support $...$ and $$...$$.",
  },
  {
    question: "How do I write Greek letters in LaTeX?",
    answer: "Use backslash followed by the letter name: \\alpha for α, \\beta for β, \\gamma for γ, etc.",
  },
  {
    question: "How do I align equations in LaTeX?",
    answer: "Use the aligned environment with & to mark alignment points and \\\\ for line breaks. Example: \\begin{aligned} a &= b \\\\ &= c \\end{aligned}",
  },
  {
    question: "How do I write matrices in LaTeX?",
    answer: "Use pmatrix for parentheses, bmatrix for brackets. Separate columns with & and rows with \\\\. Example: \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
  },
];

export default function LatexHelpPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Help", url: "/help" },
    { name: "LaTeX Reference", url: "/help/latex" },
  ];

  return (
    <>
      <JsonLd schema={generateBreadcrumbSchema(breadcrumbs)} />
      <JsonLd schema={generateFAQSchema(faqItems)} />
      <LatexHelpClient />
    </>
  );
}
