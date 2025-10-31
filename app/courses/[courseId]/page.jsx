"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatBot from "@/components/chat/ChatBot";
import TopicRenderer from "@/components/topics/TopicRenderer";

const USE_MOCK_COURSE = process.env.NEXT_PUBLIC_USE_MOCK_COURSE === "true";
const MOCK_SELECTED_TOPIC = process.env.NEXT_PUBLIC_MOCK_TOPIC?.trim() || "";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  if (!value) return false;
  return UUID_REGEX.test(String(value).trim());
}

export default function CoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseData, setCourseData] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatBotWidth, setChatBotWidth] = useState(0);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (USE_MOCK_COURSE) {
      setUserId("mock-user");
      setError("");
      return () => {};
    }

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
    if (!courseId) return;

    if (USE_MOCK_COURSE) {
      let cancelled = false;
      setLoading(true);
      setError("");
      (async () => {
        try {
          const module = await import("@/mock/course-topics-demo.json");
          if (cancelled) return;
          const payload = module?.default ?? module;
          const data = payload?.course_data ?? payload?.courseData ?? null;
          if (!data || typeof data !== "object") {
            throw new Error("Mock course data is missing a course_data object.");
          }
          setCourseData(data);
          const topicKeys = Object.keys(data);
          const preferredTopic = topicKeys.find((topic) => topic === MOCK_SELECTED_TOPIC);
          const defaultTopic = preferredTopic || topicKeys[0] || null;
          if (defaultTopic) {
            setSelectedTopic(defaultTopic);
          }
        } catch (e) {
          if (cancelled) return;
          console.error("[CoursePage] mock course_data error:", e);
          setError(e?.message || "Failed to load mock course data.");
          setCourseData(null);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const normalizedCourseId = String(courseId).trim();

    if (!isValidUuid(normalizedCourseId)) {
      setCourseData(null);
      setSelectedTopic(null);
      setError(
        "Course routes must provide a UUID courseId when loading live data. Update the route parameter or enable NEXT_PUBLIC_USE_MOCK_COURSE to work with the local sample."
      );
      setLoading(false);
      return;
    }

    if (!userId) return;
    let aborted = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const url = `/api/courses/data?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(normalizedCourseId)}`;
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
          const topicKeys = Object.keys(data);
          const preferredTopic = topicKeys.find((topic) => topic === MOCK_SELECTED_TOPIC);
          const defaultTopic = preferredTopic || topicKeys[0];
          if (defaultTopic) {
            setSelectedTopic(defaultTopic);
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

  // Group topics by their header (prefix before " - ")
  const groupedTopics = useMemo(() => {
    const groups = {};
    entries.forEach(([topic, items]) => {
      const separatorIndex = topic.indexOf(" - ");
      if (separatorIndex > 0) {
        const header = topic.substring(0, separatorIndex);
        const title = topic.substring(separatorIndex + 3);
        if (!groups[header]) {
          groups[header] = [];
        }
        groups[header].push({ fullTopic: topic, title, items });
      } else {
        // If no separator, use the whole topic as both header and title
        if (!groups[topic]) {
          groups[topic] = [];
        }
        groups[topic].push({ fullTopic: topic, title: topic, items });
      }
    });
    return Object.entries(groups);
  }, [entries]);

  const selectedTopicMeta = useMemo(() => {
    if (!selectedTopic) return null;
    for (const [, topics] of groupedTopics) {
      const match = topics.find((topic) => topic.fullTopic === selectedTopic);
      if (match) {
        return match;
      }
    }
    const separatorIndex = selectedTopic.indexOf(" - ");
    if (separatorIndex > 0) {
      return {
        fullTopic: selectedTopic,
        title: selectedTopic.substring(separatorIndex + 3),
      };
    }
    return { fullTopic: selectedTopic, title: selectedTopic };
  }, [groupedTopics, selectedTopic]);

  const selectedTopicValue = useMemo(() => {
    if (!selectedTopic || !courseData || typeof courseData !== "object") {
      return null;
    }
    return courseData[selectedTopic] ?? null;
  }, [courseData, selectedTopic]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors flex">
      {/* Left Sidebar - Course Structure (resizable) */}
      {isSidebarOpen && (
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
                      {header}
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
                        title={title}
                      >
                        <span className="block break-words">{title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            )}
          </div>

          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--primary)]/40 active:bg-[var(--primary)]/60 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        </aside>
      )}

      {/* Right Content Area - Topic Display */}
      <main 
        className="flex-1 overflow-y-auto transition-all duration-200"
        style={{ marginRight: `${chatBotWidth}px` }}
      >
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          {/* Toggle sidebar button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="pill-outline text-[10px] flex items-center gap-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
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
              {isSidebarOpen ? "Hide" : "Show"} sidebar
            </button>
          </div>

          {selectedTopic ? (
            <TopicRenderer
              topicKey={selectedTopicMeta?.fullTopic ?? selectedTopic}
              topicLabel={selectedTopicMeta?.title ?? selectedTopic}
              topicValue={selectedTopicValue}
            />
          ) : !loading ? (
            <div className="card rounded-[28px] px-8 py-10 text-center">
              <p className="text-[var(--muted-foreground)]">
                Select a topic from the left sidebar to view its content.
              </p>
            </div>
          ) : null}
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
