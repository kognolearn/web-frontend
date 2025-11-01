"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatBot from "@/components/chat/ChatBot";

export default function CoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseData, setCourseData] = useState(null);
  const [open, setOpen] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [contentCache, setContentCache] = useState({}); // key: format:id -> { status, data, error }
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatBotWidth, setChatBotWidth] = useState(0);
  const sidebarRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // Track viewport for responsive adjustments
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // On mobile, hide the sidebar by default
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [isMobile]);

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
        const data = json?.course_data || null;
        setCourseData(data);
        
        // Set the first topic as selected by default
        if (data && typeof data === "object") {
          const firstTopic = Object.keys(data)[0];
          if (firstTopic) {
            setSelectedTopic(firstTopic);
          }
        }
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

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const entries = useMemo(() => {
    if (!courseData || typeof courseData !== "object") return [];
    return Object.entries(courseData);
  }, [courseData]);

  // Group topics by their header using "/" as the hierarchy separator
  // Example key: "category/subtopic" => header: "category", title: "subtopic"
  const groupedTopics = useMemo(() => {
    const groups = {};
    entries.forEach(([topic, items]) => {
      const parts = String(topic).split("/").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        const header = parts[0];
        const title = parts.slice(1).join(" / "); // support deeper nesting gracefully
        if (!groups[header]) groups[header] = [];
        groups[header].push({ fullTopic: topic, title, items });
      } else {
        // If no separator, use the whole topic as both header and title
        const header = parts[0] || topic;
        if (!groups[header]) groups[header] = [];
        groups[header].push({ fullTopic: topic, title: header, items });
      }
    });
    return Object.entries(groups);
  }, [entries]);

  const normalizeFormat = (fmt) => {
    if (!fmt) return "";
    const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
    // map known aliases
    if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
    if (f === "practiceexam" || f === "practice_exam") return "practice_exam";
    // pass through supported: video, reading, flashcards
    return f;
  };

  const prettyFormat = (fmt) => {
    const base = String(fmt || "").toLowerCase().replace(/[_-]+/g, " ");
    return base.replace(/\b\w/g, (m) => m.toUpperCase());
  };

  // Smart title casing for headers and titles
  const SMALL_WORDS = new Set([
    "a","an","the","and","but","or","nor","for","so","yet",
    "as","at","by","in","of","on","to","via","vs","vs.","per","with","from","into","over","under"
  ]);
  const ACRONYMS = new Set([
    "API","CPU","GPU","SQL","HTML","CSS","JS","HTTP","HTTPS","URL","ID","OOP","BST","DFS","BFS","UI","UX"
  ]);
  const capWord = (w, isFirst, isLast) => {
    if (!w) return w;
    const clean = w; // preserve punctuation minimalistically
    const upper = clean.toUpperCase();
    if (ACRONYMS.has(upper)) return upper;
    // hyphenated words: title-case each part
    if (clean.includes("-")) {
      return clean
        .split("-")
        .map((part, idx) => capWord(part, isFirst && idx === 0, isLast && idx === clean.split("-").length - 1))
        .join("-");
    }
    const lower = clean.toLowerCase();
    // keep small words lower unless at boundaries
    if (!isFirst && !isLast && SMALL_WORDS.has(lower)) return lower;
    // default: capitalize first letter
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };
  const smartTitleCase = (str) => {
    if (!str) return "";
    // Support slash-delimited subsegments
    return String(str)
      .split("/")
      .map((seg) => {
        const words = seg.trim().split(/\s+/);
        return words
          .map((w, i) => capWord(w, i === 0, i === words.length - 1))
          .join(" ");
      })
      .join(" / ");
  };

  const displaySelectedTopic = useMemo(() => {
    if (!selectedTopic) return "";
    const parts = String(selectedTopic).split("/").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return "";
    const header = smartTitleCase(parts[0]);
    const tail = parts.slice(1).map(smartTitleCase).join(" / ");
    return tail ? `${header} / ${tail}` : header;
  }, [selectedTopic]);

  function ItemContent({ fmt, id }) {
    const normFmt = normalizeFormat(fmt);
    const key = `${normFmt}:${id}:${userId || ''}:${courseId || ''}`;
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
          const params = new URLSearchParams({ format: normFmt, id: String(id) });
          if (userId) params.set("userId", String(userId));
          if (courseId) params.set("courseId", String(courseId));
          const url = `/api/content?${params.toString()}`;
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
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors flex">
      {/* Left Sidebar - Course Structure (resizable) */}
      {!isMobile && isSidebarOpen && (
        <aside
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          className="relative border-r border-[var(--border)] overflow-y-auto flex-shrink-0 bg-[var(--surface-1)]"
        >
          <div className="p-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors mb-6 font-medium"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="break-words">Back to Dashboard</span>
            </button>
            
            {loading && (
              <div className="card rounded-2xl px-4 py-3 text-xs text-[var(--muted-foreground)]">
                Loading...
              </div>
            )}

            {!loading && error && (
              <div className="card rounded-2xl px-4 py-3 text-xs text-[var(--danger)] border-[var(--danger)]">
                {error}
              </div>
            )}

            {!loading && !error && !entries.length && (
              <div className="card rounded-2xl px-4 py-3 text-xs text-[var(--muted-foreground)]">
                No content available.
              </div>
            )}

            {!loading && !error && entries.length > 0 && (
              <nav className="space-y-6">
                {groupedTopics.map(([header, topics]) => (
                  <div key={header} className="space-y-1.5">
                    <h3 className="px-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.12em] mb-3 break-words">
                      {smartTitleCase(header)}
                    </h3>
                    {topics.map(({ fullTopic, title }) => (
                      <button
                        key={fullTopic}
                        type="button"
                        onClick={() => setSelectedTopic(fullTopic)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          selectedTopic === fullTopic
                            ? "bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold shadow-md"
                            : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                        }`}
                        title={smartTitleCase(title)}
                      >
                        <span className="block break-words">{smartTitleCase(title)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            )}
          </div>

          {/* Resize handle (desktop only) */}
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--primary)]/40 active:bg-[var(--primary)]/60 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        </aside>
      )}

      {/* Mobile drawer for topics */}
      {isMobile && isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-0 top-0 bottom-0 z-[60] w-[85vw] max-w-sm bg-[var(--surface-1)] border-r border-[var(--border)] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Topics</h2>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-colors"
                  aria-label="Close topics"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {loading && (
                <div className="card rounded-2xl px-4 py-3 text-xs text-[var(--muted-foreground)]">Loading...</div>
              )}
              {!loading && error && (
                <div className="card rounded-2xl px-4 py-3 text-xs text-[var(--danger)] border-[var(--danger)]">{error}</div>
              )}
              {!loading && !error && !entries.length && (
                <div className="card rounded-2xl px-4 py-3 text-xs text-[var(--muted-foreground)]">No content available.</div>
              )}
              {!loading && !error && entries.length > 0 && (
                <nav className="space-y-6">
                  {groupedTopics.map(([header, topics]) => (
                    <div key={header} className="space-y-1.5">
                      <h3 className="px-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.12em] mb-3 break-words">
                        {smartTitleCase(header)}
                      </h3>
                      {topics.map(({ fullTopic, title }) => (
                        <button
                          key={fullTopic}
                          type="button"
                          onClick={() => { setSelectedTopic(fullTopic); setIsSidebarOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            selectedTopic === fullTopic
                              ? "bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold shadow-md"
                              : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                          }`}
                          title={smartTitleCase(title)}
                        >
                          <span className="block break-words">{smartTitleCase(title)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </>
      )}

      {/* Right Content Area - Topic Display */}
      <main 
        className="flex-1 overflow-y-auto transition-all duration-200"
        style={{ marginRight: isMobile ? 0 : `${chatBotWidth}px` }}
      >
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          {/* Toggle sidebar button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="pill-outline text-[10px] flex items-center gap-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              title={isSidebarOpen ? (isMobile ? "Hide topics" : "Hide sidebar") : (isMobile ? "Show topics" : "Show sidebar")}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                )}
              </svg>
              {isSidebarOpen ? "Hide" : "Show"} {isMobile ? "topics" : "sidebar"}
            </button>
          </div>

          {selectedTopic && (
            <>
              <header className="card rounded-[32px] px-8 py-8 sm:px-10">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl text-[var(--foreground)]">
                  {displaySelectedTopic}
                </h1>
                <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base">
                  Dive into the content below
                </p>
              </header>

              <section className="space-y-6">
                {Array.isArray(courseData?.[selectedTopic]) && courseData[selectedTopic].length > 0 ? (
                  courseData[selectedTopic].map((item) => (
                    <article key={item.id} className="card rounded-[28px] px-6 py-6 sm:px-8 sm:py-8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">
                          {prettyFormat(item?.Format)}
                        </h2>
                        <span className="pill-outline text-[10px]">
                          ID: {item?.id}
                        </span>
                      </div>
                      {item?.content && (
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                          {item.content}
                        </p>
                      )}
                      <div className="mt-4">
                        <ItemContent fmt={item?.Format} id={item?.id} />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No items available for “{selectedTopic}”.
                  </div>
                )}
              </section>
            </>
          )}

          {!selectedTopic && !loading && (
            <div className="card rounded-[28px] px-8 py-10 text-center">
              <p className="text-[var(--muted-foreground)]">
                Select a topic from the left sidebar to view its content.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ChatBot Component */}
      <ChatBot 
        pageContext={{
          courseId,
          selectedTopic,
          courseData,
        }}
        onWidthChange={setChatBotWidth}
      />
    </div>
  );
}
