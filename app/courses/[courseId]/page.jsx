"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function CoursePage() {
  const { courseId } = useParams();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseData, setCourseData] = useState(null);
  const [open, setOpen] = useState({});
  const [contentCache, setContentCache] = useState({}); // key: format:id -> { status, data, error }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setError("No user session found.");
          setLoading(false);
          return;
        }
        setUserId(user.id);
      } catch (e) {
        if (!mounted) return;
        setError("Failed to load user.");
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || !courseId) return;
    let aborted = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const url = `/api/courses/data?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(
          String(courseId)
        )}`;
        console.log("[CoursePage] Fetching course_data:", url);
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          console.log("[CoursePage] course_data non-OK:", res.status, text);
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        console.log("[CoursePage] course_data OK: keys=", Object.keys(json || {}));
        if (aborted) return;
        setCourseData(json?.course_data || null);
      } catch (e) {
        if (aborted) return;
        console.error("[CoursePage] course_data error:", e);
        setError(e?.message || "Failed to load course data.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [userId, courseId]);

  const entries = useMemo(() => {
    if (!courseData || typeof courseData !== "object") return [];
    return Object.entries(courseData);
  }, [courseData]);

  const toggle = (key) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  const normalizeFormat = (fmt) => {
    if (!fmt) return "";
    const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
    // map known aliases
    if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
    if (f === "practiceexam" || f === "practice_exam") return "practice_exam";
    // pass through supported: video, reading, flashcards
    return f;
  };

  function ItemContent({ fmt, id }) {
    const normFmt = normalizeFormat(fmt);
    const key = `${normFmt}:${id}`;
    const cached = contentCache[key];
    const fetchInitiatedRef = useRef(new Set());

    useEffect(() => {
      if (!normFmt || !id) return;
      
      // Check if we've already initiated a fetch for this key
      if (fetchInitiatedRef.current.has(key)) {
        return;
      }
      
      // Check if already loaded or loading
      const existing = contentCache[key];
      if (existing && (existing.status === "loaded" || existing.status === "loading")) {
        return;
      }
      
      // Mark that we're initiating a fetch
      fetchInitiatedRef.current.add(key);
      
  const ac = new AbortController();
      
      setContentCache((prev) => ({ ...prev, [key]: { status: "loading" } }));
      
      (async () => {
        try {
          const url = `/api/content?format=${encodeURIComponent(normFmt)}&id=${encodeURIComponent(id)}`;
          console.log("[ItemContent] Fetching content:", { url, normFmt, id });
          const res = await fetch(url, { signal: ac.signal });
          let data;
          try {
            data = await res.json();
          } catch (_) {
            const raw = await res.text().catch(() => "");
            data = raw ? { raw } : {};
          }
          console.log("[ItemContent] Response:", res.status, data);
          if (!res.ok) {
            throw new Error((data && data.error) || `Failed (${res.status})`);
          }
          setContentCache((prev) => ({ ...prev, [key]: { status: "loaded", data } }));
        } catch (e) {
          console.error("[ItemContent] Error:", e);
          setContentCache((prev) => ({ ...prev, [key]: { status: "error", error: String(e?.message || e) } }));
        }
      })();
      
      return () => {
        // Do not abort the fetch here. In React Strict Mode (dev), effects are mounted,
        // cleaned up, and re-mounted, which would abort in-flight requests and leave
        // the UI stuck in a loading state. We rely on the `cancelled` flag to avoid
        // setting state after unmount.
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normFmt, id, key]);

    if (!normFmt || !id) {
      return <div className="text-xs text-red-600">Missing format or id.</div>;
    }
    if (!cached || cached.status === "loading") {
      return <div className="text-xs text-[var(--muted-foreground)]">Loading {normFmt}…</div>;
    }
    if (cached.status === "error") {
      return <div className="text-xs text-red-600">{cached.error}</div>;
    }
    return (
      <pre className="overflow-auto rounded-md bg-[var(--muted)]/30 p-3 text-xs leading-relaxed">
{JSON.stringify(cached.data, null, 2)}
      </pre>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold mb-2">Course Content</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">Course ID: {String(courseId)}</p>

        {loading && (
          <div className="card rounded-2xl p-6 text-sm text-[var(--muted-foreground)]">
            Loading course data…
          </div>
        )}

        {!loading && error && (
          <div className="card rounded-2xl p-6 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && !entries.length && (
          <div className="card rounded-2xl p-6 text-sm text-[var(--muted-foreground)]">
            No course structure available.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map(([topic, items]) => {
              const isOpen = !!open[topic];
              const safeItems = Array.isArray(items) ? items : [];
              return (
                <div key={topic} className="card rounded-2xl">
                  <button
                    type="button"
                    onClick={() => toggle(topic)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="font-medium">{topic}</span>
                    <svg
                      className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[var(--border)] px-5 py-4 space-y-4">
                      {safeItems.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="text-sm font-medium text-[var(--muted-foreground-strong)]">
                            Format: {normalizeFormat(item?.Format || item?.format || "unknown")} · ID: {item?.id || "n/a"}
                          </div>
                          <ItemContent fmt={item?.Format || item?.format} id={item?.id} />
                        </div>
                      ))}
                      {!safeItems.length && (
                        <div className="text-sm text-[var(--muted-foreground)]">No items in this topic.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
