"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * This page targets MathJax (TeX input).
 * Some “full LaTeX” commands/packages are included for when users compile documents.
 */

const LEVEL_META = {
  beginner: { label: "Beginner" },
  intermediate: { label: "Intermediate" },
  advanced: { label: "Advanced" },
};

const FOCUS_META = {
  all: { label: "All" },
  stem: { label: "STEM" },
  humanities: { label: "Humanities" },
};

const CONTEXT_META = {
  mathjax: { label: "MathJax" },
  document: { label: "Full LaTeX" },
  all: { label: "All" },
};

const DEFAULT_OPEN_SECTION_IDS = [
  "quick-start",
  "math-essentials",
  "stem-toolkit",
];

const SECTIONS = [
  {
    id: "quick-start",
    title: "Quick Start",
    description: "Delimiters, alignment, grouping, and the few rules that prevent 90% of issues.",
    items: [
      {
        id: "delimiters",
        title: "Inline vs display math (MathJax delimiters)",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["inline", "display", "delimiters", "mathjax"],
        description:
          "Use inline math inside sentences; use display math for centered work and multi-line steps. Many sites also allow $...$, but \\( ... \\) and \\[ ... \\] are the safest defaults for MathJax.",
        snippets: [
          { label: "Inline", code: String.raw`\(\frac{a}{b}\)` },
          { label: "Display", code: String.raw`\[\frac{a}{b}\]` },
          { label: "$...$ (if enabled)", code: String.raw`$\frac{a}{b}$` },
          { label: "$$...$$ (if enabled)", code: String.raw`$$\frac{a}{b}$$` },
        ],
        notes: [
          "If nothing renders, try switching to \\( \\) / \\[ \\].",
          "In display math, MathJax typically uses larger operators and better spacing.",
        ],
      },
      {
        id: "grouping",
        title: "Grouping with braces {…}",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["superscript", "subscript", "braces", "grouping"],
        description:
          "Use braces to apply ^ or _ to multiple characters and to avoid accidental formatting.",
        snippets: [
          { label: "Subscript", code: String.raw`x_i,\; x_{i+1}` },
          { label: "Superscript", code: String.raw`x^2,\; x^{10}` },
          { label: "Classic identity", code: String.raw`e^{i\pi}+1=0` },
        ],
        notes: [
          "Without braces, x^10 means x¹ then a literal 0 (not x¹⁰).",
        ],
      },
      {
        id: "fractions-roots",
        title: "Fractions, roots, and readable parentheses",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["fraction", "sqrt", "parentheses", "left", "right"],
        description:
          "Fractions and roots are the bread-and-butter of STEM expressions. Use \\left…\\right for auto-sizing delimiters.",
        snippets: [
          { label: "Fraction", code: String.raw`\frac{a}{b}` },
          { label: "Root", code: String.raw`\sqrt{x},\; \sqrt[n]{x}` },
          { label: "Auto-sized ()", code: String.raw`\left(\frac{a}{b}\right)` },
          { label: "Auto-sized []", code: String.raw`\left[\frac{a}{b}\right]` },
        ],
        notes: [
          "Prefer \\left/\\right when the inside is tall (fractions, sums, matrices).",
        ],
      },
      {
        id: "text-spacing",
        title: "Text and spacing inside equations",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["text", "spacing", "mathrm", "operator"],
        description:
          "Math mode italicizes letters by default. Use \\text{…} for words and spacing commands to improve readability.",
        snippets: [
          { label: "Words in math", code: String.raw`x>0 \text{ for all } x\in\mathbb{R}` },
          { label: "Small space", code: String.raw`a\,b,\; dx=\mathrm{d}x` },
          { label: "Bigger space", code: String.raw`a\;b,\; a\quad b,\; a\qquad b` },
          { label: "Negative space", code: String.raw`\!` },
        ],
        notes: [
          "\\mathrm{d}x is a common convention for differentials.",
          "Use \\text{…} for short phrases; keep long prose outside math.",
        ],
      },
      {
        id: "aligned",
        title: "Multi-line work with alignment",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["aligned", "align", "multiline", "ampersand"],
        description:
          "Use & to align on equals signs (or any symbol) and \\\\ to break lines. This is ideal for step-by-step solutions.",
        snippets: [
          {
            label: "Display + aligned",
            code: String.raw`\[
\begin{aligned}
f(x) &= x^2 + 3x + 2 \\
     &= (x+1)(x+2)
\end{aligned}
\]`,
          },
        ],
        notes: [
          "If aligned doesn’t work, your MathJax config may be missing AMS environments.",
          "Keep alignment points consistent (usually align on =).",
        ],
      },
      {
        id: "escape-specials",
        title: "Escaping special characters in text",
        level: "beginner",
        focus: "both",
        context: "document",
        tags: ["escape", "percent", "underscore", "ampersand", "hash"],
        description:
          "In full LaTeX documents, several characters have special meanings and must be escaped to appear literally.",
        snippets: [
          { label: "Escapes", code: String.raw`\% \_ \& \# \{ \} \$` },
        ],
        notes: [
          "In MathJax math mode, underscore _ is used for subscripts; outside math, escape it as \\_.",
        ],
      },
    ],
  },

  {
    id: "math-essentials",
    title: "Math Essentials",
    description: "Common notation building blocks: symbols, operators, cases, matrices, and annotations.",
    items: [
      {
        id: "relations",
        title: "Common relations and arrows",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["relations", "approx", "equiv", "arrows"],
        description: "The “comparison” symbols you’ll use constantly.",
        snippets: [
          { label: "Inequalities", code: String.raw`a\le b,\; a\ge b,\; a\neq b` },
          { label: "Approx / proportional", code: String.raw`a\approx b,\; a\sim b,\; y\propto x` },
          { label: "Equivalence", code: String.raw`a\equiv b \pmod m` },
          { label: "Arrows", code: String.raw`f: X\to Y,\; x\mapsto x^2,\; A\Rightarrow B,\; A\iff B` },
        ],
      },
      {
        id: "big-ops",
        title: "Sums, products, integrals, and limits",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["sum", "prod", "int", "limit"],
        description:
          "Big operators look best in display math, but are fine inline too.",
        snippets: [
          { label: "Sum", code: String.raw`\sum_{i=1}^n i=\frac{n(n+1)}{2}` },
          { label: "Product", code: String.raw`\prod_{k=1}^n k = n!` },
          { label: "Integral", code: String.raw`\int_a^b f(x)\,\mathrm{d}x` },
          { label: "Limit", code: String.raw`\lim_{x\to 0}\frac{\sin x}{x}=1` },
        ],
        notes: ["Use \\, before dx for nicer spacing: \\,\\mathrm{d}x."],
      },
      {
        id: "cases",
        title: "Piecewise functions (cases)",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["cases", "piecewise"],
        description: "Clean piecewise definitions with aligned conditions.",
        snippets: [
          {
            label: "Cases",
            code: String.raw`f(x)=
\begin{cases}
x^2, & x\ge 0 \\
-x,  & x<0
\end{cases}`,
          },
        ],
        notes: ["Use & to align conditions; commas are optional stylistically."],
      },
      {
        id: "matrices",
        title: "Matrices and vectors",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["matrix", "pmatrix", "bmatrix", "vector"],
        description: "Use matrix environments for quick linear algebra notation.",
        snippets: [
          {
            label: "Column vector",
            code: String.raw`\mathbf{v}=\begin{pmatrix}x\\y\\z\end{pmatrix}`,
          },
          {
            label: "Matrix",
            code: String.raw`A=\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
          },
          {
            label: "Bracketed matrix",
            code: String.raw`\begin{bmatrix}1&0\\0&1\end{bmatrix}`,
          },
        ],
        notes: ["Use \\\\ for new rows and & between columns."],
      },
      {
        id: "accents",
        title: "Accents and annotations",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["hat", "bar", "tilde", "dot", "underbrace"],
        description: "Common notation for estimators, averages, time derivatives, and explanations.",
        snippets: [
          { label: "Accents", code: String.raw`\hat{\theta},\; \bar{x},\; \tilde{f},\; \dot{x},\; \ddot{x}` },
          { label: "Underbrace", code: String.raw`\underbrace{a+b+\cdots+b}_{n\text{ terms}}` },
          { label: "Overline", code: String.raw`\overline{z}` },
        ],
      },
      {
        id: "functions-operators",
        title: "Functions and named operators",
        level: "intermediate",
        focus: "both",
        context: "mathjax",
        tags: ["sin", "log", "operatorname", "mathrm"],
        description:
          "Built-in functions like \\sin and \\log render upright and get correct spacing. For your own operators, use \\operatorname{…}.",
        snippets: [
          { label: "Built-ins", code: String.raw`\sin x,\; \cos x,\; \log x,\; \ln x,\; \exp(x)` },
          { label: "Custom operator", code: String.raw`\operatorname{rank}(A),\; \operatorname{diag}(v)` },
        ],
      },
      {
        id: "dots-ellipsis",
        title: "Ellipses and diagonals",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["cdots", "ldots", "vdots", "ddots"],
        description: "Use the right dots for the context.",
        snippets: [
          { label: "Horizontal", code: String.raw`1,2,\ldots,n \quad \text{or} \quad a_1+a_2+\cdots+a_n` },
          { label: "Vertical/Diagonal", code: String.raw`\begin{pmatrix}1&0&\cdots&0\\0&1&\ddots&\vdots\\\vdots&\ddots&\ddots&0\\0&\cdots&0&1\end{pmatrix}` },
        ],
      },
    ],
  },

  {
    id: "stem-toolkit",
    title: "STEM Toolkit",
    description: "Calculus, linear algebra, probability, discrete math, and CS notation for everyday learning tasks.",
    items: [
      {
        id: "derivatives",
        title: "Derivatives (ordinary and partial)",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["derivative", "partial", "gradient", "nabla"],
        description: "Common derivative forms and notations.",
        snippets: [
          { label: "Ordinary", code: String.raw`\frac{d}{dx}x^n = n x^{n-1}` },
          { label: "Second derivative", code: String.raw`\frac{d^2y}{dx^2}` },
          { label: "Partial derivative", code: String.raw`\frac{\partial f}{\partial x}` },
          { label: "Gradient", code: String.raw`\nabla f` },
        ],
        notes: ["If you want upright d, use \\mathrm{d}x in integrals."],
      },
      {
        id: "integrals",
        title: "Integrals (definite, improper, and common forms)",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["integral", "dx", "infty"],
        description: "A few patterns you’ll see constantly.",
        snippets: [
          { label: "Definite", code: String.raw`\int_a^b f(x)\,\mathrm{d}x` },
          { label: "Improper", code: String.raw`\int_0^\infty e^{-x}\,\mathrm{d}x = 1` },
          { label: "Gaussian", code: String.raw`\int_0^\infty e^{-x^2}\,\mathrm{d}x=\frac{\sqrt{\pi}}{2}` },
        ],
      },
      {
        id: "series",
        title: "Series, expansions, and binomials",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["series", "sum", "binom", "taylor"],
        description: "Compact notation for expansions.",
        snippets: [
          { label: "Geometric series", code: String.raw`\sum_{k=0}^{\infty} r^k = \frac{1}{1-r}\quad (|r|<1)` },
          { label: "Exponential series", code: String.raw`e^x=\sum_{n=0}^{\infty}\frac{x^n}{n!}` },
          { label: "Binomial coefficient", code: String.raw`\binom{n}{k}=\frac{n!}{k!(n-k)!}` },
        ],
      },
      {
        id: "inner-products-norms",
        title: "Inner products, norms, transpose",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["norm", "inner product", "transpose"],
        description: "Typical linear algebra notation.",
        snippets: [
          { label: "Inner product", code: String.raw`\langle u,v\rangle = u^\top v` },
          { label: "Norms", code: String.raw`\lVert x\rVert_2,\; \lVert x\rVert_1,\; \lVert x\rVert_\infty` },
          { label: "Unit vector", code: String.raw`\hat{v}=\frac{v}{\lVert v\rVert}` },
        ],
        notes: ["Use \\lVert and \\rVert for true double-bar norms."],
      },
      {
        id: "probability",
        title: "Probability and expectation",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["probability", "expectation", "variance", "conditional"],
        description: "Everyday probability notation.",
        snippets: [
          { label: "Probability", code: String.raw`\mathbb{P}(A),\; \mathbb{P}(A\mid B)` },
          { label: "Expectation", code: String.raw`\mathbb{E}[X],\; \mathbb{E}[X\mid Y]` },
          { label: "Variance", code: String.raw`\mathrm{Var}(X)=\mathbb{E}\!\left[(X-\mathbb{E}[X])^2\right]` },
        ],
        notes: [
          "MathJax usually supports \\mathbb; if not, check extensions/fonts.",
        ],
      },
      {
        id: "distributions",
        title: "Common distribution notation",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["normal", "binomial", "poisson"],
        description: "Compact ways to state distribution assumptions.",
        snippets: [
          { label: "Normal", code: String.raw`X\sim\mathcal{N}(\mu,\sigma^2)` },
          { label: "Binomial", code: String.raw`X\sim\mathrm{Bin}(n,p)` },
          { label: "Poisson", code: String.raw`X\sim\mathrm{Pois}(\lambda)` },
        ],
      },
      {
        id: "floor-ceil",
        title: "Floor, ceiling, and absolute values",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["floor", "ceil", "absolute", "bars"],
        description: "Use dedicated symbols for floors/ceilings; use \\left|…\\right| when needed.",
        snippets: [
          { label: "Floor/ceiling", code: String.raw`\lfloor x\rfloor,\; \lceil x\rceil` },
          { label: "Absolute value", code: String.raw`|x|,\; \left|\frac{a}{b}\right|` },
        ],
      },
      {
        id: "big-o",
        title: "Asymptotic notation (CS / discrete math)",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["big-o", "theta", "omega", "complexity"],
        description: "Complexity and growth rates.",
        snippets: [
          { label: "Big-O family", code: String.raw`O(n\log n),\; \Theta(n),\; \Omega(n)` },
        ],
      },
      {
        id: "mod-congruence",
        title: "Mod and congruence",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["mod", "pmod", "congruence"],
        description: "Standard modular arithmetic formatting.",
        snippets: [
          { label: "Congruence", code: String.raw`a\equiv b \pmod m` },
          { label: "Mod as operator", code: String.raw`a \bmod m` },
        ],
        notes: ["\\pmod formats nicely; \\bmod is useful inline."],
      },
    ],
  },

  {
    id: "logic-sets",
    title: "Logic, Sets, and Proof Notation",
    description: "Common symbols used in math, philosophy, linguistics, and CS theory.",
    items: [
      {
        id: "quantifiers",
        title: "Quantifiers and connectives",
        level: "beginner",
        focus: "humanities",
        context: "mathjax",
        tags: ["forall", "exists", "and", "or", "not", "implies"],
        description: "The core symbols for predicate logic.",
        snippets: [
          { label: "Quantifiers", code: String.raw`\forall x,\; \exists y` },
          { label: "Connectives", code: String.raw`p\land q,\; p\lor q,\; \neg p` },
          { label: "Implication", code: String.raw`p\to q,\; p\Rightarrow q,\; p\iff q` },
        ],
      },
      {
        id: "sets",
        title: "Set membership and operations",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["in", "subset", "union", "intersection", "emptyset"],
        description: "Basic set language.",
        snippets: [
          { label: "Membership", code: String.raw`x\in A,\; x\notin A` },
          { label: "Subset", code: String.raw`A\subseteq B,\; A\subset B` },
          { label: "Union/intersection", code: String.raw`A\cup B,\; A\cap B,\; A\setminus B` },
          { label: "Empty set", code: String.raw`\emptyset` },
        ],
      },
      {
        id: "set-builder",
        title: "Set-builder notation",
        level: "intermediate",
        focus: "both",
        context: "mathjax",
        tags: ["set builder", "mathbb", "colon"],
        description: "A clean, readable style for defining sets.",
        snippets: [
          { label: "Example", code: String.raw`\{x\in\mathbb{R} : x>0\}` },
          { label: "Alternative separator", code: String.raw`\{x\in\mathbb{R} \mid x>0\}` },
        ],
        notes: ["Use : or \\mid; choose one style and be consistent."],
      },
      {
        id: "number-sets",
        title: "Common number sets (blackboard bold)",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["mathbb", "naturals", "integers", "reals", "complex"],
        description: "Shorthand for standard sets.",
        snippets: [
          { label: "Sets", code: String.raw`\mathbb{N},\; \mathbb{Z},\; \mathbb{Q},\; \mathbb{R},\; \mathbb{C}` },
        ],
      },
      {
        id: "proof-symbols",
        title: "Therefore / because / QED",
        level: "intermediate",
        focus: "humanities",
        context: "mathjax",
        tags: ["therefore", "because", "qed", "square"],
        description: "Handy proof markers (stylistic).",
        snippets: [
          { label: "Symbols", code: String.raw`\therefore,\; \because,\; \square,\; \blacksquare` },
        ],
        notes: ["Not every style guide wants these; use sparingly."],
      },
    ],
  },

  {
    id: "science-units",
    title: "Physics, Chemistry, and Units",
    description: "Units, vectors, and a few science-specific notations that show up often in coursework.",
    items: [
      {
        id: "units",
        title: "Units and scientific notation",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["units", "mathrm", "times", "scientific notation"],
        description: "Use upright roman for units and add small spaces between value and unit.",
        snippets: [
          { label: "Acceleration", code: String.raw`9.81\,\mathrm{m\,s^{-2}}` },
          { label: "Scientific notation", code: String.raw`1.23\times 10^{-4}` },
          { label: "Energy", code: String.raw`E=mc^2` },
        ],
        notes: ["In full LaTeX documents, siunitx is the gold standard for units."],
      },
      {
        id: "dot-cross",
        title: "Dot and cross products",
        level: "beginner",
        focus: "stem",
        context: "mathjax",
        tags: ["dot", "cross", "vector"],
        description: "Standard vector calculus notation.",
        snippets: [
          { label: "Dot", code: String.raw`\mathbf{a}\cdot\mathbf{b}` },
          { label: "Cross", code: String.raw`\mathbf{a}\times\mathbf{b}` },
        ],
      },
      {
        id: "dirac",
        title: "Dirac bra–ket notation",
        level: "advanced",
        focus: "stem",
        context: "mathjax",
        tags: ["quantum", "bra", "ket"],
        description: "Common in quantum mechanics and linear operators.",
        snippets: [
          { label: "Inner product", code: String.raw`\langle \psi \mid \phi \rangle` },
          { label: "Ket/bra", code: String.raw`\lvert \psi \rangle,\; \langle \psi \rvert` },
        ],
        notes: ["If your site renders | oddly, prefer \\lvert and \\rvert."],
      },
      {
        id: "chem-mhchem",
        title: "Chemical formulas and reactions (mhchem)",
        level: "intermediate",
        focus: "stem",
        context: "mathjax",
        tags: ["chemistry", "mhchem", "ce"],
        description:
          "MathJax can support mhchem (\\ce{...}) if the mhchem extension is enabled. If not, use \\mathrm with subscripts as a fallback.",
        snippets: [
          { label: "With mhchem", code: String.raw`\ce{H2O},\; \ce{CO2 + C -> 2CO}` },
          { label: "Fallback", code: String.raw`\mathrm{H_2O},\; \mathrm{CO_2 + C \to 2CO}` },
        ],
        notes: ["If \\ce doesn’t work, your MathJax config likely doesn’t include mhchem."],
      },
    ],
  },

  {
    id: "greek-fonts",
    title: "Greek Letters and Math Fonts",
    description: "High-frequency symbols and typography choices (blackboard bold, calligraphic, bold).",
    layout: "grid",
    items: [
      // Greek (common)
      { id: "g-alpha", title: "alpha", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "α", symbol: "α", snippets: [{ label: "\\alpha", code: String.raw`\alpha` }] },
      { id: "g-beta", title: "beta", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "β", symbol: "β", snippets: [{ label: "\\beta", code: String.raw`\beta` }] },
      { id: "g-gamma", title: "gamma", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "γ", symbol: "γ", snippets: [{ label: "\\gamma", code: String.raw`\gamma` }] },
      { id: "g-delta", title: "delta", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "δ", symbol: "δ", snippets: [{ label: "\\delta", code: String.raw`\delta` }] },
      { id: "g-epsilon", title: "epsilon", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "ε", symbol: "ε", snippets: [{ label: "\\epsilon", code: String.raw`\epsilon` }] },
      { id: "g-theta", title: "theta", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "θ", symbol: "θ", snippets: [{ label: "\\theta", code: String.raw`\theta` }] },
      { id: "g-lambda", title: "lambda", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "λ", symbol: "λ", snippets: [{ label: "\\lambda", code: String.raw`\lambda` }] },
      { id: "g-mu", title: "mu", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "μ", symbol: "μ", snippets: [{ label: "\\mu", code: String.raw`\mu` }] },
      { id: "g-pi", title: "pi", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "π", symbol: "π", snippets: [{ label: "\\pi", code: String.raw`\pi` }] },
      { id: "g-sigma", title: "sigma", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "σ", symbol: "σ", snippets: [{ label: "\\sigma", code: String.raw`\sigma` }] },
      { id: "g-phi", title: "phi", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "φ", symbol: "φ", snippets: [{ label: "\\phi", code: String.raw`\phi` }] },
      { id: "g-omega", title: "omega", level: "beginner", focus: "both", context: "mathjax", tags: ["greek"], description: "ω", symbol: "ω", snippets: [{ label: "\\omega", code: String.raw`\omega` }] },

      // Fonts (compact)
      { id: "f-mathbb", title: "blackboard bold", level: "beginner", focus: "both", context: "mathjax", tags: ["fonts", "mathbb"], description: "ℝ", symbol: "ℝ", snippets: [{ label: "\\mathbb{R}", code: String.raw`\mathbb{R}` }] },
      { id: "f-mathcal", title: "calligraphic", level: "beginner", focus: "both", context: "mathjax", tags: ["fonts", "mathcal"], description: "𝒜", symbol: "𝒜", snippets: [{ label: "\\mathcal{A}", code: String.raw`\mathcal{A}` }] },
      { id: "f-mathbf", title: "bold", level: "beginner", focus: "both", context: "mathjax", tags: ["fonts", "mathbf"], description: "𝐯", symbol: "𝐯", snippets: [{ label: "\\mathbf{v}", code: String.raw`\mathbf{v}` }] },
      { id: "f-mathrm", title: "upright roman", level: "beginner", focus: "both", context: "mathjax", tags: ["fonts", "mathrm"], description: "rm", symbol: "rm", snippets: [{ label: "\\mathrm{d}x", code: String.raw`\mathrm{d}x` }] },
    ],
  },

  {
    id: "humanities",
    title: "Humanities Toolkit",
    description: "Notation for linguistics/semantics and practical writing commands for compiled LaTeX documents.",
    items: [
      {
        id: "semantics-types",
        title: "Semantics and type notation (MathJax-friendly)",
        level: "intermediate",
        focus: "humanities",
        context: "mathjax",
        tags: ["semantics", "types", "angle brackets", "mapsto"],
        description: "Common notation used in formal semantics and related fields.",
        snippets: [
          { label: "Types", code: String.raw`\langle e,t\rangle,\; \langle s,\langle e,t\rangle\rangle` },
          { label: "Functions", code: String.raw`f: X\to Y,\; x\mapsto f(x)` },
        ],
        notes: [
          "If you need double-brackets ⟦ ⟧ and \\llbracket is unavailable, use a fallback style like [[p]].",
        ],
      },
      {
        id: "accents-chars",
        title: "Accents and special characters (full LaTeX)",
        level: "beginner",
        focus: "humanities",
        context: "document",
        tags: ["accents", "diacritics", "special characters"],
        description: "Useful for names, foreign languages, and transliteration.",
        snippets: [
          { label: "Accents", code: String.raw`\'{e} \`{a} \^{o} \"{u} \~{n} \c{c}` },
          { label: "Common symbols", code: String.raw`\textemdash{} \textendash{} \textellipsis{}` },
        ],
        notes: [
          "If you compile with XeLaTeX/LuaLaTeX, you can often type Unicode directly (é, ñ, …).",
        ],
      },
      {
        id: "quotes-emphasis",
        title: "Quotes, emphasis, and dashes (full LaTeX)",
        level: "beginner",
        focus: "humanities",
        context: "document",
        tags: ["quotes", "emphasis", "csquotes", "dashes"],
        description: "Clean typography for short writeups and notes.",
        snippets: [
          { label: "Emphasis", code: String.raw`\emph{important}, \textbf{bold}, \textit{italic}` },
          { label: "Quotes (plain)", code: "``like this''" },
          { label: "Quotes (csquotes)", code: String.raw`\enquote{like this}` },
          { label: "Dashes", code: String.raw`en-dash: -- \quad em-dash: ---` },
        ],
        notes: [
          "For \\enquote{…}, add \\usepackage{csquotes}.",
        ],
      },
      {
        id: "footnotes",
        title: "Footnotes (full LaTeX)",
        level: "beginner",
        focus: "humanities",
        context: "document",
        tags: ["footnote"],
        description: "Simple footnotes for short documents.",
        snippets: [{ label: "Footnote", code: String.raw`Some text\footnote{A short note.}` }],
      },
      {
        id: "citations",
        title: "Citations (full LaTeX, minimal)",
        level: "intermediate",
        focus: "humanities",
        context: "document",
        tags: ["cite", "biblatex", "bibliography"],
        description: "A minimal citation setup that scales up when needed.",
        snippets: [
          { label: "In text", code: String.raw`\cite{key}` },
          {
            label: "biblatex setup (preamble)",
            code: String.raw`\usepackage[backend=biber,style=authoryear]{biblatex}
\addbibresource{references.bib}`,
          },
          { label: "Print bibliography", code: String.raw`\printbibliography` },
        ],
        notes: ["If you use biblatex, compile with biber (not bibtex)."],
      },
    ],
  },

  {
    id: "full-latex",
    title: "Full LaTeX Documents",
    description: "A small, practical subset of document features (templates, lists, tables, figures) without turning this into a thesis manual.",
    items: [
      {
        id: "minimal-template",
        title: "Minimal document template",
        level: "beginner",
        focus: "both",
        context: "document",
        tags: ["template", "preamble", "documentclass"],
        description: "A compact starter template that works for quick notes and homework-style writeups.",
        snippets: [
          {
            label: "Template",
            code: String.raw`\documentclass[11pt]{article}

\usepackage{amsmath,amssymb} % math
\usepackage{graphicx}        % images
\usepackage[hidelinks]{hyperref}

\title{Title}
\author{Name}
\date{\today}

\begin{document}
\maketitle

\section{Section}
Inline math: $E=mc^2$. Display:
\[
\int_0^\infty e^{-x^2}\,dx=\frac{\sqrt{\pi}}{2}
\]

\end{document}`,
          },
        ],
      },
      {
        id: "lists",
        title: "Lists (itemize/enumerate)",
        level: "beginner",
        focus: "both",
        context: "document",
        tags: ["itemize", "enumerate", "lists"],
        description: "Fast structured notes.",
        snippets: [
          {
            label: "Itemize",
            code: String.raw`\begin{itemize}
  \item First
  \item Second
\end{itemize}`,
          },
          {
            label: "Enumerate",
            code: String.raw`\begin{enumerate}
  \item Step one
  \item Step two
\end{enumerate}`,
          },
        ],
      },
      {
        id: "tables",
        title: "Tables (tabular, minimal)",
        level: "intermediate",
        focus: "both",
        context: "document",
        tags: ["tabular", "table"],
        description: "Simple tables without extra packages.",
        snippets: [
          {
            label: "Tabular",
            code: String.raw`\begin{tabular}{lcr}
Left & Center & Right \\
\hline
A & B & C \\
1 & 2 & 3 \\
\end{tabular}`,
          },
        ],
        notes: ["For nicer tables, look into booktabs (optional)."],
      },
      {
        id: "figures",
        title: "Figures (includegraphics)",
        level: "intermediate",
        focus: "both",
        context: "document",
        tags: ["figure", "includegraphics", "graphicx"],
        description: "Insert images in compiled documents.",
        snippets: [
          {
            label: "Figure",
            code: String.raw`\begin{figure}[h]
  \centering
  \includegraphics[width=0.8\linewidth]{image.png}
  \caption{Caption}
\end{figure}`,
          },
        ],
        notes: ["Requires \\usepackage{graphicx}."],
      },
      {
        id: "refs",
        title: "Cross-references (label/ref)",
        level: "intermediate",
        focus: "both",
        context: "document",
        tags: ["label", "ref", "eqref"],
        description: "Stable references that don’t break when numbering changes.",
        snippets: [
          { label: "Equation label", code: String.raw`\begin{equation}\label{eq:energy}
E=mc^2
\end{equation}` },
          { label: "Reference", code: String.raw`See Eq.~\eqref{eq:energy}.` },
        ],
        notes: ["Requires amsmath for \\eqref."],
      },
      {
        id: "packages",
        title: "Useful packages (quick picks)",
        level: "advanced",
        focus: "both",
        context: "document",
        tags: ["packages", "amsmath", "siunitx", "mhchem", "tikz"],
        description: "A shortlist (only add what you actually use).",
        snippets: [
          {
            label: "Common STEM",
            code: String.raw`% STEM
\usepackage{amsmath,amssymb,mathtools}
\usepackage{siunitx}  % units
\usepackage[version=4]{mhchem} % chemistry
% \usepackage{tikz}   % diagrams (optional)`,
          },
          {
            label: "Common humanities",
            code: String.raw`% Humanities
\usepackage{csquotes}
\usepackage[backend=biber,style=authoryear]{biblatex}
\addbibresource{references.bib}`,
          },
        ],
      },
    ],
  },

  {
    id: "troubleshooting",
    title: "Troubleshooting and Gotchas",
    description: "Fast fixes when something looks wrong or won’t render.",
    items: [
      {
        id: "unmatched",
        title: "Unmatched braces or missing delimiters",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["error", "braces", "rendering"],
        description: "Most rendering failures come from a missing } or a missing closing delimiter.",
        snippets: [
          { label: "Good", code: String.raw`\left(\frac{a}{b}\right)` },
          { label: "Bad", code: String.raw`\left(\frac{a}{b}\right` },
        ],
        notes: ["Count braces and check that \\left has a matching \\right."],
      },
      {
        id: "italics",
        title: "Why is my text italic inside math?",
        level: "beginner",
        focus: "both",
        context: "mathjax",
        tags: ["text", "italic", "mathrm"],
        description: "Math mode treats letters as variables. Use \\text{…} or \\mathrm{…}.",
        snippets: [
          { label: "Text", code: String.raw`\text{mass } m \text{ in kg}` },
          { label: "Units", code: String.raw`\mathrm{kg\,m\,s^{-2}}` },
        ],
      },
      {
        id: "ampersand",
        title: "Alignment not lining up",
        level: "intermediate",
        focus: "both",
        context: "mathjax",
        tags: ["aligned", "ampersand", "equals"],
        description: "In aligned environments, & marks the alignment column.",
        snippets: [
          {
            label: "Example",
            code: String.raw`\[
\begin{aligned}
a &= b + c \\
  &= d
\end{aligned}
\]`,
          },
        ],
        notes: ["Put & before the symbol you want to align on (commonly =)."],
      },
      {
        id: "missing-extension",
        title: "A command works in LaTeX but not in MathJax",
        level: "intermediate",
        focus: "both",
        context: "mathjax",
        tags: ["mathjax", "extension", "package"],
        description:
          "MathJax supports a large subset of LaTeX, but not everything (and some features require extensions).",
        snippets: [
          { label: "Fallback idea", code: String.raw`\text{Try a simpler equivalent, or write it in plain text.}` },
        ],
        notes: [
          "Examples: \\ce{…} needs mhchem; some bracket symbols need extra extensions.",
          "If you control MathJax config, you can enable needed extensions.",
        ],
      },
    ],
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesQuery(item, q) {
  if (!q) return true;
  const haystack = normalize(
    [
      item.title,
      item.description,
      (item.notes || []).join(" "),
      (item.tags || []).join(" "),
      (item.snippets || []).map((s) => `${s.label} ${s.code}`).join(" "),
      item.symbol || "",
    ].join(" ")
  );
  return haystack.includes(q);
}

function FocusChip({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
        active
          ? "bg-[var(--primary)] text-[var(--primary-contrast)] shadow-sm"
          : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)]"
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, variant = "default" }) {
  return (
    <span className={cn(
      "text-[10px] px-2 py-0.5 rounded-md font-medium",
      variant === "default" && "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
      variant === "primary" && "bg-[var(--primary)]/10 text-[var(--primary)]",
    )}>
      {children}
    </span>
  );
}

function SnippetRow({ label, code, onCopy, copied }) {
  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
      </div>
      <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
        <pre className="text-xs sm:text-sm overflow-x-auto px-4 py-3 font-mono text-[var(--foreground)] pr-20">
{code}
        </pre>
        <button
          type="button"
          onClick={() => onCopy(code)}
          className={cn(
            "absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
            copied
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--surface-1)] hover:bg-[var(--primary)] hover:text-[var(--primary-contrast)] text-[var(--muted-foreground)] border border-[var(--border)] hover:border-transparent"
          )}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function CompactSymbolCard({ item, onCopy, copied }) {
  const primary = item.snippets?.[0]?.code ?? "";
  return (
    <div className="group rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 hover:border-[var(--primary)]/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xl text-[var(--foreground)]">
            {item.symbol || "•"}
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {item.title}
            </div>
            <code className="text-xs text-[var(--muted-foreground)] font-mono">
              {primary}
            </code>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCopy(primary)}
          className={cn(
            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            copied
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-contrast)]"
          )}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ItemCard({ item, onCopy, copiedKey }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          {item.title}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {item.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="primary">{LEVEL_META[item.level]?.label ?? item.level}</Badge>
          <Badge>
            {item.context === "mathjax"
              ? "MathJax"
              : item.context === "document"
                ? "Full LaTeX"
                : "Both"}
          </Badge>
          {(item.tags || []).slice(0, 3).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </div>

      {/* Snippets */}
      <div className="p-4 space-y-4 bg-[var(--background)]">
        {(item.snippets || []).map((snip) => {
          const key = `${item.id}::${snip.label}`;
          return (
            <SnippetRow
              key={key}
              label={snip.label}
              code={snip.code}
              onCopy={(text) => onCopy(text, key)}
              copied={copiedKey === key}
            />
          );
        })}
      </div>

      {/* Notes */}
      {item.notes?.length ? (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]/50">
          <div className="space-y-1.5">
            {item.notes.map((n, idx) => (
              <p key={idx} className="flex gap-2 text-xs text-[var(--muted-foreground)]">
                <span className="text-[var(--primary)] shrink-0">tip</span>
                <span>{n}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LatexHelpPage() {
  const searchRef = useRef(null);

  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("all"); // all | stem | humanities
  const [contextFilter, setContextFilter] = useState("mathjax"); // mathjax | document | all
  const [levels, setLevels] = useState(() => new Set(["beginner", "intermediate"]));
  const [openSections, setOpenSections] = useState(() => new Set(DEFAULT_OPEN_SECTION_IDS));
  const [copiedKey, setCopiedKey] = useState(null);

  // Keyboard shortcuts:
  //  - "/" focuses search (unless you're already typing in an input/textarea)
  //  - "Esc" clears search
  //  - Ctrl/Cmd+K focuses search
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typing =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      if (!typing && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus?.();
      }
      if (e.key === "Escape") {
        if (query) setQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query]);

  const filteredSections = useMemo(() => {
    const q = normalize(query);

    const allowByLevel = (lvl) => levels.has(lvl);

    const allowByFocus = (f) => {
      if (focus === "all") return true;
      if (focus === "stem") return f === "stem" || f === "both";
      return f === "humanities" || f === "both";
    };

    const allowByContext = (c) => {
      if (contextFilter === "all") return true;
      if (contextFilter === "mathjax") return c === "mathjax" || c === "both";
      return c === "document" || c === "both";
    };

    return SECTIONS.map((section) => {
      const items = (section.items || []).filter((item) => {
        return (
          allowByLevel(item.level) &&
          allowByFocus(item.focus) &&
          allowByContext(item.context) &&
          includesQuery(item, q)
        );
      });

      return { ...section, items };
    }).filter((s) => s.items.length > 0);
  }, [query, focus, contextFilter, levels]);

  const totalResults = useMemo(() => {
    return filteredSections.reduce((sum, s) => sum + s.items.length, 0);
  }, [filteredSections]);

  // Auto-open sections when searching; reset when search is cleared.
  useEffect(() => {
    if (normalize(query)) {
      setOpenSections(new Set(filteredSections.map((s) => s.id)));
    } else {
      setOpenSections(new Set(DEFAULT_OPEN_SECTION_IDS));
    }
  }, [query, filteredSections]);

  const toc = filteredSections.map((s) => ({
    id: s.id,
    title: s.title,
    count: s.items.length,
  }));

  async function copyToClipboard(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.clearTimeout(copyToClipboard._t);
      copyToClipboard._t = window.setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      // Fallback (best effort)
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedKey(key);
        window.clearTimeout(copyToClipboard._t);
        copyToClipboard._t = window.setTimeout(() => setCopiedKey(null), 1200);
      } catch {
        // If copy fails, do nothing (avoid noisy alerts).
      }
    }
  }

  function toggleLevel(lvl) {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      // Ensure at least one level is selected.
      if (next.size === 0) next.add("beginner");
      return next;
    });
  }

  function resetFilters() {
    setQuery("");
    setFocus("all");
    setContextFilter("mathjax");
    setLevels(new Set(["beginner", "intermediate"]));
    setOpenSections(new Set(DEFAULT_OPEN_SECTION_IDS));
  }

  function expandAll() {
    setOpenSections(new Set(filteredSections.map((s) => s.id)));
  }

  function collapseAll() {
    setOpenSections(new Set());
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
            LaTeX Quick Reference
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm sm:text-base max-w-2xl">
            Copy-ready snippets for MathJax and LaTeX. Filter by focus area, context, and skill level to find what you need.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 focus-within:ring-2 focus-within:ring-[var(--primary)]/30 focus-within:border-[var(--primary)]/50 transition-all">
            <Search className="w-5 h-5 text-[var(--muted-foreground)] shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands, symbols, or topics..."
              className="flex-1 min-w-0 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none text-base"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="shrink-0 hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] font-mono">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 mb-8">
          <div className="flex flex-col gap-5">
            {/* Filter Groups */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Focus Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Focus
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(FOCUS_META).map((k) => (
                    <FocusChip
                      key={k}
                      active={focus === k}
                      onClick={() => setFocus(k)}
                      title={FOCUS_META[k].label}
                    >
                      {FOCUS_META[k].label}
                    </FocusChip>
                  ))}
                </div>
              </div>

              {/* Context Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Context
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(CONTEXT_META).map((k) => (
                    <FocusChip
                      key={k}
                      active={contextFilter === k}
                      onClick={() => setContextFilter(k)}
                      title={CONTEXT_META[k].label}
                    >
                      {CONTEXT_META[k].label}
                    </FocusChip>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Level
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(LEVEL_META).map((lvl) => (
                    <FocusChip
                      key={lvl}
                      active={levels.has(lvl)}
                      onClick={() => toggleLevel(lvl)}
                      title={LEVEL_META[lvl].label}
                    >
                      {LEVEL_META[lvl].label}
                    </FocusChip>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row: Results count + actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[var(--muted-foreground)]">
                  <span className="text-[var(--foreground)] font-semibold">{totalResults}</span> results
                </span>
                {(query || focus !== "all" || contextFilter !== "mathjax" || !levels.has("beginner") || !levels.has("intermediate") || levels.has("advanced")) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[var(--primary)] hover:underline text-sm font-medium"
                  >
                    Reset filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Collapse all
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / TOC */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-6 space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">
                  Sections
                </div>

                {toc.length === 0 ? (
                  <div className="text-sm text-[var(--muted-foreground)]">
                    No sections match filters.
                  </div>
                ) : (
                  <nav className="space-y-1">
                    {toc.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                        onClick={() => {
                          setOpenSections((prev) => {
                            const next = new Set(prev);
                            next.add(s.id);
                            return next;
                          });
                        }}
                      >
                        <span className="truncate">{s.title}</span>
                        <span className="flex-shrink-0 text-[10px] font-medium bg-[var(--surface-2)] text-[var(--muted-foreground)] rounded-full px-2 py-0.5 min-w-[24px] text-center">
                          {s.count}
                        </span>
                      </a>
                    ))}
                  </nav>
                )}
              </div>

              {/* Quick tips card */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
                  Quick tips
                </div>
                <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                  <p>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px]">/</kbd> to search
                  </p>
                  <p>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px]">Esc</kbd> to clear
                  </p>
                  <p className="pt-2 border-t border-[var(--border)] mt-2">
                    Try: <span className="font-mono text-[var(--foreground)]">frac</span>, <span className="font-mono text-[var(--foreground)]">matrix</span>, <span className="font-mono text-[var(--foreground)]">forall</span>
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-9 space-y-8 order-1 lg:order-2">
            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
                <div className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  No results found
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Try adjusting your filters or search term
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Reset all filters
                </button>
              </div>
            ) : null}

            {filteredSections.map((section) => {
              const isOpen = openSections.has(section.id);
              const isGrid = section.layout === "grid";

              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-6"
                >
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
                    {/* Section Header */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.id)) next.delete(section.id);
                          else next.add(section.id);
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[var(--surface-2)]/50 transition-colors"
                      aria-expanded={isOpen}
                      aria-controls={`${section.id}-content`}
                    >
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">
                          {section.title}
                        </h2>
                        <p className="text-sm text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                          {section.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-[var(--muted-foreground)] bg-[var(--surface-2)] px-2.5 py-1 rounded-full">
                          {section.items.length} {section.items.length === 1 ? "item" : "items"}
                        </span>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                          isOpen ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                        )}>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Section Content */}
                    <div
                      id={`${section.id}-content`}
                      className={cn(!isOpen && "hidden")}
                    >
                      <div className="border-t border-[var(--border)] p-5 bg-[var(--background)]">
                        {isGrid ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {section.items.map((item) => (
                              <CompactSymbolCard
                                key={item.id}
                                item={item}
                                onCopy={(text) => copyToClipboard(text, `${item.id}::compact`)}
                                copied={copiedKey === `${item.id}::compact`}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {section.items.map((item) => (
                              <ItemCard
                                key={item.id}
                                item={item}
                                copiedKey={copiedKey}
                                onCopy={copyToClipboard}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}