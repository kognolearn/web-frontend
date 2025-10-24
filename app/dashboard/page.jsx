"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import CreateCourseCard from "@/components/courses/CreateCourseCard";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import RichBlock from "@/components/content/RichBlock";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme, mounted } = useTheme();
  
  // data (richblock-per-slot)
  /* const cards = {
    "1": [
      {
        content: [
          { text: "State Ohm’s law." }
        ]
      },
      {
        content: [
          { text: "Ohm’s law relates voltage, current, and resistance: " },
          { "inline-math": "V = IR" }
        ]
      },
      {
        content: [
          { text: "A fundamental electrical relationship where voltage (V) equals current (I) times resistance (R)." }
        ]
      }
    ],

    "2": [
      {
        content: [
          { text: "Write the equation for Newton’s second law." }
        ]
      },
      {
        content: [
          { text: "The net force on an object is given by: " },
          { "inline-math": "F = ma" }
        ]
      },
      {
        content: [
          { text: "It defines the relationship between force, mass, and acceleration — the foundation of classical mechanics." }
        ]
      }
    ],

    "3": [
      {
        content: [
          { text: "Express the quadratic formula." }
        ]
      },
      {
        content: [
          { "block-math": "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" }
        ]
      },
      {
        content: [
          { text: "Gives the roots of a quadratic equation " },
          { "inline-math": "ax^2 + bx + c = 0" },
          { text: ", derived from completing the square." }
        ]
      }
    ],

    "4": [
      {
        content: [
          { text: "What is the equation for kinetic energy?" }
        ]
      },
      {
        content: [
          { "inline-math": "E_k = \\tfrac{1}{2}mv^2" }
        ]
      },
      {
        content: [
          { text: "Represents the energy of motion proportional to the square of velocity." }
        ]
      }
    ],

    "5": [
      {
        content: [
          { text: "State the ideal gas law." }
        ]
      },
      {
        content: [
          { "inline-math": "PV = nRT" }
        ]
      },
      {
        content: [
          { text: "Relates pressure (P), volume (V), temperature (T), and number of moles (n) through the gas constant R." }
        ]
      }
    ],

    "6": [
      {
        content: [
          { text: "Write the differential form of Maxwell’s equation for Gauss’s law for electricity." }
        ]
      },
      {
        content: [
          { "block-math": "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}" }
        ]
      },
      {
        content: [
          { text: "The divergence of the electric field equals charge density divided by permittivity of free space." }
        ]
      }
    ],

    "7": [
      {
        content: [
          { text: "Express the time-dependent Schrödinger equation." }
        ]
      },
      {
        content: [
          { "block-math": "i\\hbar \\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r}, t) = \\hat{H}\\Psi(\\mathbf{r}, t)" }
        ]
      },
      {
        content: [
          { text: "Describes how a quantum state " },
          { "inline-math": "\\Psi" },
          { text: " evolves over time under Hamiltonian " },
          { "inline-math": "\\hat{H}" },
          { text: "." }
        ]
      }
    ],

    "8": [
      // Question
      {
        content: [
          { text: "Derive the Black–Scholes PDE from a delta-hedged portfolio." }
        ]
      },
      // Answer (intentionally long)
      {
        content: [
          { text: "Start with a portfolio Π = V - ΔS. Apply Itô to " },
          { "inline-math": "V(S,t)" },
          { text: " and choose " },
          { "inline-math": "Δ = \\frac{\\partial V}{\\partial S}" },
          { text: " to cancel the dW term.\n" },
          { text: "No-arbitrage implies the drift of Π must be " },
          { "inline-math": "rΠ" },
          { text: ", leading to the PDE below.\n\n" }, // extra newline to extend height
          { text: "Assume constant volatility " },
          { "inline-math": "\\sigma" },
          { text: " and risk-free rate r; for a non-dividend-paying stock:" },
          { "block-math": "\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} + rS\\frac{\\partial V}{\\partial S} - rV = 0" },
          { text: "\nBoundary conditions depend on the payoff; for a European call with strike K and maturity T:\n" },
          { "inline-math": "V(S,T) = \\max(S - K, 0)" },
          { text: ".\n\n" }, // more lines to force overflow
          { text: "Notes:\n• Hedging removes diffusion risk.\n• Drift becomes r under risk-neutral measure.\n• PDE solved via transformation to heat equation or closed-form with d1/d2.\n• Real markets: discrete hedging, jumps, and stochastic vol break assumptions." }
        ]
      },
      // Explanation (also a bit long)
      {
        content: [
          { text: "Key mechanism: pick Δ so that stochastic term vanishes; remaining drift must equal risk-free growth or else arbitrage exists. The resulting condition yields the PDE. Practical deviations (transaction costs, stochastic vol) introduce model risk." }
        ]
      }
    ]
  }; */




  const loadCourses = useCallback(async (userId) => {
    try {
      const res = await fetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        console.error("Failed to fetch courses from API", res.status);
        setCourses([]);
      } else {
        const body = await res.json();
        const items = Array.isArray(body?.courses) ? body.courses : [];
        setCourses(items);
      }
    } catch (err) {
      console.error("Error fetching courses from API:", err);
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    const loadUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/signup");
        return;
      }

      setUser(user);
      await loadCourses(user.id);

      setLoading(false);
    };

    loadUserAndCourses();
  }, [router, loadCourses]);

  // Listen for course updates triggered elsewhere (e.g., CreateCourseCard/Modal)
  useEffect(() => {
    if (!user?.id) return;
    const handler = () => {
      setLoading(true);
      loadCourses(user.id).finally(() => setLoading(false));
    };
    window.addEventListener("courses:updated", handler);
    return () => window.removeEventListener("courses:updated", handler);
  }, [user, loadCourses]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const hasCourses = courses.length > 0;

  if (loading || !mounted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--muted-foreground)]">
        <div className="card rounded-[24px] px-10 py-8 text-center text-sm">
          Calibrating your workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            aria-label="Toggle color mode"
            className="pill-outline text-[10px]"
          >
            <span className="flex items-center gap-2 text-[var(--muted-foreground-strong)]">
              {theme === "dark" ? (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05 4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              )}
              {theme === "dark" ? "Dark" : "Light"} mode
            </span>
          </button>
          <button
            onClick={handleSignOut}
            className="pill-outline text-[10px] text-[var(--muted-foreground-strong)] hover:text-[var(--foreground)]"
          >
            Sign out
          </button>
        </div>

        <header>
          <div className="card relative rounded-[32px] px-8 py-10 sm:px-10">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[var(--muted-foreground)] sm:text-base">
              Dip into your study library or spark a brand-new plan. Everything stays clean and focused.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/courses/create"
                className="btn btn-primary"
              >
                Create course
              </Link>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          <h2 className="text-lg font-semibold sm:text-xl">Your courses</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => {
              const created = course.created_at ? new Date(course.created_at) : null;
              const when = created
                ? new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  }).format(created)
                : "Unknown";
              const courseTitle =
                course?.title ||
                course?.course_title ||
                course?.name ||
                course?.courseName ||
                "Generated course";
              const courseCodeLabel = course?.code || course?.course_code || courseTitle;
              const description = `${courseTitle}${courseTitle ? " · " : ""}Created ${when}`;
              return (
                <CourseCard
                  key={course.id}
                  courseCode={courseCodeLabel}
                  courseName={description}
                  courseId={course.id}
                />
              );
            })}
            <CreateCourseCard />
          </div>

          {!hasCourses && (
            <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
              No courses yet—spin up your first plan and we&rsquo;ll list it here.
            </div>
          )}
        </main>
      </div>

      {/* <div className="p-6">
        <FlashcardDeck data={cards} />
      </div> */} 

    </div>
  );
}
