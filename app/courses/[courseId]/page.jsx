"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatBot from "@/components/chat/ChatBot";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import RichBlock from "@/components/content/RichBlock";
import VideoBlock from "@/components/content/VideoBlock";
import Quiz from "@/components/content/Quiz";
import { hasRichContent, toRichBlock } from "@/utils/richText";

const USE_MOCK_COURSE = process.env.NEXT_PUBLIC_USE_MOCK_COURSE === "true";
const MOCK_SELECTED_TOPIC = process.env.NEXT_PUBLIC_MOCK_TOPIC?.trim() || "";

const FORMAT_METADATA = {
  reading: { label: "Reading" },
  notes: { label: "Reading" },
  text: { label: "Reading" },
  article: { label: "Reading" },
  overview: { label: "Reading" },
  lesson: { label: "Reading" },
  video: { label: "Video" },
  lecture_video: { label: "Video" },
  flashcards: { label: "Flashcards" },
  flashcard: { label: "Flashcards" },
  mini_quiz: { label: "Mini Quiz" },
  quiz: { label: "Quiz" },
  practice_quiz: { label: "Practice Quiz" },
  practice_exam: { label: "Practice Exam" },
  assessment: { label: "Assessment" },
};

function formatLabelForKey(fmt) {
  if (!fmt) return "Content";
  const entry = FORMAT_METADATA[fmt];
  if (entry?.label) return entry.label;
  return fmt
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Content";
}

function pickRichBlock(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    const block = toRichBlock(value);
    if (hasRichContent(block)) {
      return block;
    }
  }
  return { content: [] };
}

function extractItemsForTopic(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "object") return [];

  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.sections)) return raw.sections;
  if (Array.isArray(raw.entries)) return raw.entries;
  if (Array.isArray(raw.modules)) return raw.modules;

  const derived = [];
  Object.entries(raw).forEach(([, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      if (
        value.every(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            (entry.format || entry.type || entry.id || entry.content_id || entry.contentId)
        )
      ) {
        derived.push(...value);
      }
      return;
    }
    if (
      typeof value === "object" &&
      (value.format || value.type || value.id || value.content_id || value.contentId)
    ) {
      derived.push(value);
    }
  });
  return derived;
}

function deriveItemId(item, index) {
  if (!item || typeof item !== "object") {
    return index !== undefined ? `idx-${index}` : "";
  }
  return (
    item.id ??
    item.content_id ??
    item.contentId ??
    item.resource_id ??
    item.resourceId ??
    item.slug ??
    item.uid ??
    item.uuid ??
    (item.format ? `${item.format}-${index}` : undefined) ??
    (index !== undefined ? `idx-${index}` : "")
  );
}

function normalizeFlashcardEntry(entry) {
  if (Array.isArray(entry)) {
    const [question, answer, explanation] = entry;
    return [question ?? "", answer ?? "", explanation ?? ""];
  }
  if (entry && typeof entry === "object") {
    const question = entry.question ?? entry.prompt ?? entry.front ?? entry.q ?? entry[0];
    const answer = entry.answer ?? entry.response ?? entry.back ?? entry.a ?? entry[1];
    const explanation =
      entry.explanation ?? entry.detail ?? entry.notes ?? entry.explain ?? entry.rationale ?? entry[2] ?? "";
    return [question ?? "", answer ?? "", explanation ?? ""];
  }
  return [entry ?? "", "", ""];
}

function normalizeFlashcardDeck(payload) {
  if (!payload) return {};
  const base =
    (payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.cards ?? payload.deck ?? payload.flashcards ?? payload.entries ?? payload.data
      : null) ?? payload;

  const deck = {};
  if (Array.isArray(base)) {
    base.forEach((entry, idx) => {
      deck[String(idx + 1)] = normalizeFlashcardEntry(entry);
    });
    return deck;
  }

  if (base && typeof base === "object") {
    Object.entries(base).forEach(([key, value], idx) => {
      if (value === null || value === undefined) return;
      const cardKey = /^[0-9]+$/.test(key) ? key : String(idx + 1);
      deck[cardKey] = normalizeFlashcardEntry(value);
    });
    return deck;
  }

  if (typeof base === "string") {
    deck["1"] = normalizeFlashcardEntry(base);
    return deck;
  }

  return deck;
}

function renderContentForFormat(format, item, data) {
  const fmt = format || "";
  const dataObj = data && typeof data === "object" ? data : {};

  switch (fmt) {
    case "reading":
    case "notes":
    case "text":
    case "article":
    case "overview":
    case "lesson": {
      const bodyBlock = pickRichBlock(
        dataObj.body,
        dataObj.content,
        dataObj.text,
        dataObj.reading,
        dataObj.article,
        dataObj.notes,
        dataObj.sections,
        dataObj.paragraphs,
        typeof data === "string" ? data : null,
        item?.body,
        item?.content,
        item?.text
      );

      if (hasRichContent(bodyBlock)) {
        return <RichBlock block={bodyBlock} maxWidth="100%" />;
      }

      return (
        <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
          No reading content available yet.
        </div>
      );
    }

    case "video":
    case "lecture_video": {
      const url =
        item?.url ??
        item?.video_url ??
        item?.link ??
        dataObj.url ??
        dataObj.video_url ??
        dataObj.link ??
        dataObj.source ??
        "";

      const descriptionBlock = pickRichBlock(
        item?.notes,
        item?.description,
        dataObj.summary,
        dataObj.description,
        dataObj.notes
      );

      return (
        <div className="space-y-6">
          {url ? (
            <VideoBlock url={url} title={dataObj.title ?? item?.title ?? undefined} />
          ) : (
            <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
              Video link unavailable.
            </div>
          )}

          {hasRichContent(descriptionBlock) ? (
            <div className="text-sm text-[var(--muted-foreground)]">
              <RichBlock block={descriptionBlock} maxWidth="100%" />
            </div>
          ) : null}
        </div>
      );
    }

    case "flashcards":
    case "flashcard": {
      const deck = normalizeFlashcardDeck(
        dataObj.deck ??
          dataObj.cards ??
          dataObj.flashcards ??
          dataObj.data ??
          dataObj.contents ??
          item?.deck ??
          item?.cards ??
          item?.flashcards ??
          data
      );

      if (Object.keys(deck).length === 0) {
        return (
          <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
            No flashcards available.
          </div>
        );
      }

      return <FlashcardDeck data={deck} />;
    }

    case "mini_quiz":
    case "quiz":
    case "practice_quiz":
    case "practice_exam":
    case "assessment": {
      const questionsSource =
        dataObj.questions ??
        dataObj.items ??
        dataObj.quiz ??
        dataObj.problems ??
        dataObj.assessment ??
        item?.questions ??
        item?.items ??
        item?.quiz ??
        data;

      const instructionsBlock = pickRichBlock(
        item?.instructions,
        item?.summary,
        dataObj.instructions,
        dataObj.summary,
        dataObj.description,
        dataObj.overview
      );

      return (
        <div className="space-y-6">
          {hasRichContent(instructionsBlock) ? (
            <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-4 text-sm text-[var(--muted-foreground)]">
              <RichBlock block={instructionsBlock} maxWidth="100%" />
            </div>
          ) : null}
          <Quiz questions={questionsSource} />
        </div>
      );
    }

    default: {
      if (!data) {
        return (
          <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
            No content available for this item.
          </div>
        );
      }

      return (
        <pre className="overflow-auto rounded-2xl bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    }
  }
}

export default function CoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseData, setCourseData] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [contentCache, setContentCache] = useState({}); // key: format:id -> { status, data, error }
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

    if (!userId) return;
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

  const topicContent = useMemo(() => {
    if (!selectedTopic || !courseData || typeof courseData !== "object") {
      return { items: [], container: null };
    }
    const raw = courseData[selectedTopic];
    if (!raw) {
      return { items: [], container: null };
    }
    if (Array.isArray(raw)) {
      return { items: raw, container: null };
    }
    if (typeof raw === "object") {
      return { items: extractItemsForTopic(raw), container: raw };
    }
    return { items: [], container: null };
  }, [courseData, selectedTopic]);

  const selectedTopicItems = topicContent.items;
  const selectedTopicContainer = topicContent.container;

  const topicIntroBlock = useMemo(() => {
    if (!selectedTopicContainer) return null;
    const block = pickRichBlock(
      selectedTopicContainer.summary,
      selectedTopicContainer.overview,
      selectedTopicContainer.description,
      selectedTopicContainer.introduction
    );
    return hasRichContent(block) ? block : null;
  }, [selectedTopicContainer]);

  const normalizeFormat = (fmt) => {
    if (!fmt) return "";
    const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
    // map known aliases
    if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
    if (f === "practiceexam" || f === "practice_exam") return "practice_exam";
    // pass through supported: video, reading, flashcards
    return f;
  };

  function ItemContent({ item, index }) {
    const formatSource =
      item?.format ?? item?.type ?? item?.content_type ?? item?.contentType ?? item?.kind ?? item?.category;
    const normFmt = normalizeFormat(formatSource);
    const rawId = deriveItemId(item, index);
    const hasFetchId = Boolean(rawId);
    const cacheKey = normFmt
      ? `${normFmt}:${hasFetchId ? rawId : `idx-${index}`}`
      : `item-${index}`;
    const cached = contentCache[cacheKey];
    const fetchInitiatedRef = useRef(new Set());

    const initialData =
      item && typeof item === "object"
        ? item.data ?? item.payload ?? item.details ?? item.resource ?? item.contentData ?? item.bodyData ?? null
        : null;

    const shouldFetch = !initialData && normFmt && hasFetchId;

    useEffect(() => {
      if (!shouldFetch) return;
      if (fetchInitiatedRef.current.has(cacheKey)) return;
      if (cached && (cached.status === "loaded" || cached.status === "loading")) return;

      fetchInitiatedRef.current.add(cacheKey);
      setContentCache((prev) => ({ ...prev, [cacheKey]: { status: "loading" } }));

      (async () => {
        try {
          const url = `/api/content?format=${encodeURIComponent(normFmt)}&id=${encodeURIComponent(rawId)}`;
          console.log("[ItemContent] Fetching content:", { url, normFmt, id: rawId });
          const res = await fetch(url);
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
          setContentCache((prev) => ({ ...prev, [cacheKey]: { status: "loaded", data } }));
        } catch (e) {
          console.error("[ItemContent] Error:", e);
          setContentCache((prev) => ({
            ...prev,
            [cacheKey]: { status: "error", error: String(e?.message || e) },
          }));
        }
      })();

      return () => {
        // Avoid aborting the fetch to remain compatible with React Strict Mode double-invocation.
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldFetch, normFmt, rawId, cacheKey, cached]);

    const status = initialData ? "loaded" : cached?.status;
    const data = initialData ?? (cached?.status === "loaded" ? cached.data : null);
    const errorMessage = cached?.error || "Failed to load content.";

    const formatLabel = formatLabelForKey(normFmt);
    const dataObj = data && typeof data === "object" ? data : {};
    const headerTitle =
      item?.title ?? dataObj.title ?? dataObj.heading ?? dataObj.name ?? dataObj.label ?? formatLabel;
    const estimated =
      item?.estimated_time ?? dataObj.estimated_time ?? dataObj.estimatedTime ?? dataObj.duration ?? null;
    const difficulty = item?.difficulty ?? dataObj.difficulty ?? null;
    const metaPieces = [];
    if (estimated) metaPieces.push(typeof estimated === "string" ? estimated : String(estimated));
    if (difficulty) {
      const diff = String(difficulty);
      metaPieces.push(diff.charAt(0).toUpperCase() + diff.slice(1));
    }
    const metadataLine = metaPieces.join(" • ");

    const descriptionBlock = pickRichBlock(
      item?.summary,
      item?.description,
      dataObj.summary,
      dataObj.overview,
      dataObj.description
    );

    const contentBody =
      status === "error"
        ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          )
        : status === "loaded"
        ? renderContentForFormat(normFmt, item, data)
        : shouldFetch
        ? (
            <div className="text-sm text-[var(--muted-foreground)]">Loading {formatLabel.toLowerCase()}…</div>
          )
        : renderContentForFormat(normFmt, item, data);

    return (
      <article className="card rounded-[28px] px-8 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {formatLabel}
            </span>
            {headerTitle ? (
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{headerTitle}</h2>
            ) : null}
            {metadataLine ? (
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{metadataLine}</div>
            ) : null}
          </div>
        </div>

        {hasRichContent(descriptionBlock) ? (
          <div className="mt-4 text-sm text-[var(--muted-foreground)]">
            <RichBlock block={descriptionBlock} maxWidth="100%" />
          </div>
        ) : null}

        <div className="mt-6">{contentBody}</div>
      </article>
    );
  }

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

          {selectedTopic && (
            <>
              <header className="card rounded-[32px] px-8 py-8 sm:px-10">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl text-[var(--foreground)]">
                  {selectedTopicMeta?.title ?? selectedTopic}
                </h1>
                {topicIntroBlock ? (
                  <div className="mt-4 text-sm text-[var(--muted-foreground)] sm:text-base">
                    <RichBlock block={topicIntroBlock} maxWidth="100%" />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base">
                    Dive into the content below.
                  </p>
                )}
              </header>

              <section className="space-y-6">
                {selectedTopicItems.length > 0 ? (
                  selectedTopicItems.map((item, index) => {
                    const key = `${selectedTopicMeta?.fullTopic ?? selectedTopic}-${deriveItemId(item, index)}-${index}`;
                    return <ItemContent key={key} item={item} index={index} />;
                  })
                ) : (
                  <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No structured content is available for this topic yet.
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
