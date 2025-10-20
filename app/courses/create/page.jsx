"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const searchDebounceMs = 350;
const syllabusFileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
const ratingDescriptions = {
  1: "Needs focused attention",
  2: "Developing understanding",
  3: "Confident mastery",
};
const defaultTopicRating = 2;
const ratingToFamiliarity = {
  1: "needs review",
  2: "developing",
  3: "confident",
};

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE?.trim() || "https://edtech-backend-api.onrender.com";
const COURSE_STRUCTURE_ENDPOINT = `${backendBaseUrl.replace(/\/$/, "")}/course-structure`;

function toIsoDate(dateString) {
  if (!dateString) return null;
  return `${dateString}T00:00:00.000Z`;
}

function formatExamStructure({ hasExamMaterials, examFormat, examNotes }) {
  if (!hasExamMaterials) return undefined;
  const segments = [];
  if (examFormat) segments.push(`Preferred exam format: ${examFormat.toUpperCase()}`);
  if (examNotes?.trim()) segments.push(examNotes.trim());
  if (segments.length === 0) return undefined;
  return segments.join("\n\n");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function buildFilePayload(files) {
  if (!files?.length) return [];
  const items = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      content: await fileToBase64(file),
      type: file.type || "application/octet-stream",
    }))
  );
  return items;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCatalogResult(result) {
  return {
    id: result.id,
    code: result.code || result.course_code || "Unknown code",
    title: result.title || result.course_title || "Untitled course",
  };
}

function createTopicObject(title, rating = defaultTopicRating, source = "generated") {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${source}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    rating,
    source,
  };
}

export default function CreateCoursePage() {
  const router = useRouter();
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [startDate, setStartDate] = useState(today);
  const [finishDate, setFinishDate] = useState(today);
  const syllabusInputId = useId();
  const examInputId = useId();

  const [courseQuery, setCourseQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);

  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusFiles, setSyllabusFiles] = useState([]);

  const [hasExamMaterials, setHasExamMaterials] = useState(false);
  const [examFormat, setExamFormat] = useState("pdf");
  const [examNotes, setExamNotes] = useState("");
  const [examFiles, setExamFiles] = useState([]);

  const [authStatus, setAuthStatus] = useState("checking");
  const [userId, setUserId] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [topics, setTopics] = useState([]);
  const [deletedTopics, setDeletedTopics] = useState([]);
  const [rawTopicsText, setRawTopicsText] = useState("");
  const [topicsApproved, setTopicsApproved] = useState(false);

  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicRating, setNewTopicRating] = useState(defaultTopicRating);

  const [courseGenerating, setCourseGenerating] = useState(false);
  const [courseGenerationError, setCourseGenerationError] = useState("");
  const [courseGenerationMessage, setCourseGenerationMessage] = useState("Preparing your personalized course plan…");

  const dropdownRef = useRef(null);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) {
          router.replace("/auth/signin?redirectTo=/courses/create");
          return;
        }
        setUserId(user.id);
        setAuthStatus("ready");
      } catch (error) {
        if (!active) return;
        setGenerationError("Unable to confirm your session. Please try again.");
        setAuthStatus("ready");
      }
    };
    loadUser();
    return () => {
      active = false;
    };
  }, [router]);

  const handleCourseInputChange = useCallback((event) => {
    const value = event.target.value;
    setCourseQuery(value);
    setSelectedCourse(null);
    setCourseDropdownOpen(true);
  }, []);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  useEffect(() => {
    const trimmed = courseQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError("");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog-search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setSearchResults([]);
          setSearchError("Unable to search catalog right now.");
        } else {
          const payload = await res.json();
          const normalized = Array.isArray(payload?.results)
            ? payload.results.map(normalizeCatalogResult)
            : [];
          setSearchResults(normalized);
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        setSearchResults([]);
        setSearchError("Search failed. Please try again.");
      } finally {
        setSearching(false);
      }
    }, searchDebounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [courseQuery]);

  const handleSelectCourse = useCallback((course) => {
    setSelectedCourse(course);
    setCourseQuery(`${course.code} · ${course.title}`);
    setCourseDropdownOpen(false);
  }, []);

  const handleSyllabusFileChange = useCallback((event) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setSyllabusFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }, []);

  const handleRemoveSyllabusFile = useCallback((name) => {
    setSyllabusFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleExamFileChange = useCallback((event) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setExamFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }, []);

  const handleRemoveExamFile = useCallback((name) => {
    setExamFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleGenerateTopics = useCallback(async (event) => {
    event.preventDefault();
    if (!userId) {
      setGenerationError("You need to be signed in to generate topics.");
      return;
    }

    setGenerating(true);
    setGenerationError("");
    setRawTopicsText("");
    setTopicsApproved(false);
    setCourseGenerationError("");

    const payload = {
      userId,
      finishByDate: finishDate ? new Date(finishDate).toISOString() : undefined,
      courseSelection: selectedCourse
        ? { code: selectedCourse.code, title: selectedCourse.title }
        : courseQuery.trim()
        ? { code: "", title: courseQuery.trim() }
        : null,
      syllabusText: syllabusText.trim() || undefined,
      syllabusFiles: [],
      examFormatDetails: hasExamMaterials
        ? [examFormat ? `Preferred exam format: ${examFormat.toUpperCase()}` : null, examNotes ? `Notes: ${examNotes}` : null]
            .filter(Boolean)
            .join(" | ") || undefined
        : undefined,
      examFiles: [],
    };

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate topics. Please try again.");
      }

      const generatedTopics = Array.isArray(data?.topics) ? data.topics : [];
      if (generatedTopics.length === 0) {
        throw new Error("The model did not return any topics. Please try again.");
      }

      setTopics(generatedTopics.map((topic) => createTopicObject(String(topic).trim())));
      setDeletedTopics([]);
      setRawTopicsText(data?.rawTopicsText || "");
      setTopicsApproved(false);
    } catch (error) {
      setGenerationError(error.message || "Unexpected error generating topics.");
    } finally {
      setGenerating(false);
    }
  }, [examFormat, examNotes, finishDate, hasExamMaterials, selectedCourse, syllabusText, userId, courseQuery]);

  const handleRatingChange = useCallback((topicId, rating) => {
    setTopicsApproved(false);
    setTopics((prev) => prev.map((topic) => (topic.id === topicId ? { ...topic, rating } : topic)));
  }, []);

  const handleDeleteTopic = useCallback((topicId) => {
    let removedTopic = null;
    setTopicsApproved(false);
    setTopics((prev) => {
      const topic = prev.find((item) => item.id === topicId);
      if (!topic) return prev;
      removedTopic = topic;
      return prev.filter((item) => item.id !== topicId);
    });
    if (removedTopic) {
      setDeletedTopics((removed) => [removedTopic, ...removed.filter((item) => item.id !== removedTopic.id)]);
    }
  }, []);

  const handleRestoreTopic = useCallback((topicId) => {
    let restoredTopic = null;
    setDeletedTopics((prev) => {
      const topic = prev.find((item) => item.id === topicId);
      if (!topic) return prev;
      restoredTopic = topic;
      return prev.filter((item) => item.id !== topicId);
    });
    if (restoredTopic) {
      setTopicsApproved(false);
      setTopics((existing) => [restoredTopic, ...existing.filter((item) => item.id !== restoredTopic.id)]);
    }
  }, []);

  const handleRestoreAll = useCallback(() => {
    setTopicsApproved(false);
    setTopics((prev) => [...deletedTopics, ...prev]);
    setDeletedTopics([]);
  }, [deletedTopics]);

  const handleAddTopic = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = newTopicTitle.trim();
      if (!trimmed) return;
      setTopicsApproved(false);
      setTopics((prev) => [createTopicObject(trimmed, newTopicRating, "manual"), ...prev]);
      setNewTopicTitle("");
      setNewTopicRating(defaultTopicRating);
    },
    [newTopicTitle, newTopicRating]
  );

  const handleApproveTopics = useCallback(() => {
    if (topics.length === 0) {
      setCourseGenerationError("Generate or add at least one topic before approving.");
      return;
    }
    setCourseGenerationError("");
    setTopicsApproved(true);
  }, [topics]);

  const handleGenerateCourse = useCallback(async () => {
    if (topics.length === 0) {
      setCourseGenerationError("Generate or add at least one topic before generating the course.");
      return;
    }

    if (!topicsApproved) {
      setCourseGenerationError("Please approve your topic list before generating the course.");
      return;
    }

    if (!userId) {
      setCourseGenerationError("You need to be signed in to generate your course.");
      return;
    }

    const className = selectedCourse
      ? [selectedCourse.code, selectedCourse.title].filter(Boolean).join(" · ")
      : courseQuery.trim();

    if (!className) {
      setCourseGenerationError("Provide a course title before generating the course.");
      return;
    }

    if (!startDate || !finishDate) {
      setCourseGenerationError("Select both a start date and an end date for your course.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(finishDate);
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start > end) {
      setCourseGenerationError("The start date must be before the end date.");
      return;
    }

    const cleanTopics = topics
      .map((topic) => (typeof topic.title === "string" ? topic.title.trim() : ""))
      .filter(Boolean);

    if (cleanTopics.length === 0) {
      setCourseGenerationError("Your topic list is empty. Please add topics before generating the course.");
      return;
    }

    const cleanTopicSet = new Set(cleanTopics);

    const topicFamiliarityMap = topics.reduce((acc, topic) => {
      const title = typeof topic.title === "string" ? topic.title.trim() : "";
      if (!title || !cleanTopicSet.has(title)) {
        return acc;
      }
      const familiarity = ratingToFamiliarity[topic.rating] || ratingToFamiliarity[defaultTopicRating];
      acc[title] = familiarity;
      return acc;
    }, {});

    setCourseGenerating(true);
    setCourseGenerationError("");
    setCourseGenerationMessage("Locking in your topic roadmap…");

    try {
      const payload = {
        topics: cleanTopics,
        topicFamiliarity: topicFamiliarityMap,
        className,
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(finishDate),
        userId,
      };

      if (Object.keys(topicFamiliarityMap).length === 0) {
        delete payload.topicFamiliarity;
      }

      const trimmedSyllabus = syllabusText.trim();
      if (trimmedSyllabus) {
        payload.syllabusText = trimmedSyllabus;
      }

      if (syllabusFiles.length > 0) {
        setCourseGenerationMessage("Encoding syllabus materials…");
        const syllabusPayload = await buildFilePayload(syllabusFiles);
        if (syllabusPayload.length > 0) {
          payload.syllabusFiles = syllabusPayload;
        }
      }

      const examStructureText = formatExamStructure({ hasExamMaterials, examFormat, examNotes });
      if (examStructureText) {
        payload.examStructureText = examStructureText;
      }

      if (hasExamMaterials && examFiles.length > 0) {
        setCourseGenerationMessage("Packaging exam references…");
        const examPayload = await buildFilePayload(examFiles);
        if (examPayload.length > 0) {
          payload.examStructureFiles = examPayload;
        }
      }

      setCourseGenerationMessage("Consulting GPT-5 for your learning journey…");
      const response = await fetch(COURSE_STRUCTURE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to generate course. Please try again.";
        if (response.status === 400) {
          message = "The course generator needs a valid schedule, topics, and user ID.";
        } else if (response.status === 502) {
          message = "The model returned an invalid plan. Please regenerate your topics and try again.";
        } else if (response.status === 500) {
          message = "The course generator was unavailable. Please try again shortly.";
        }
        const errorPayload = await response.json().catch(() => ({}));
        if (errorPayload?.error) {
          message = errorPayload.error;
        }
        throw new Error(message);
      }

      const body = await response.json().catch(() => ({}));
      const courseId = body?.courseId;
      setCourseGenerationMessage("Finalizing and saving to your dashboard…");

      try {
        window.dispatchEvent(new Event("courses:updated"));
      } catch {}

      router.push(`/dashboard${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ""}`);
    } catch (error) {
      setCourseGenerationError(error.message || "Unexpected error generating course.");
      setCourseGenerating(false);
    }
  }, [
    topics,
    topicsApproved,
    userId,
    selectedCourse,
    courseQuery,
    startDate,
    finishDate,
    syllabusText,
    syllabusFiles,
    hasExamMaterials,
    examFormat,
    examNotes,
    examFiles,
    router,
  ]);

  if (authStatus === "checking") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--muted-foreground)]">
        <div className="create-veil" aria-hidden="true" />
        <div className="gradient-border rounded-3xl">
          <div className="card-shell glass-panel panel-accent-sky rounded-3xl px-10 py-8 text-sm">
            Checking your session…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] py-12 text-[var(--foreground)] transition-colors">
      {courseGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/90 px-4 backdrop-blur-sm">
          <div className="card max-w-md w-full rounded-[28px] px-8 py-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-[var(--surface-muted)] border-t-[var(--primary)] animate-spin" aria-hidden="true" />
            <h2 className="mt-6 text-xl font-semibold text-[var(--foreground)]">Generating your course</h2>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">{courseGenerationMessage}</p>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              We&rsquo;re orchestrating modules, formats, and learning arcs tailored to your needs. Hang tight.
            </p>
          </div>
        </div>
      )}
      <div className="create-veil" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="gradient-border rounded-[32px]">
            <div className="card-shell glass-panel panel-accent-rose relative overflow-hidden rounded-[32px] px-8 py-10 sm:px-10">
              <div className="pointer-events-none absolute -top-24 left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/dashboard"
                      className="pill-outline text-[10px]"
                    >
                      Back to dashboard
                    </Link>
                  </div>
                  <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
                    Build Study Topics
                  </h1>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base">
                    Feed us context, goals, and any supporting material. We&rsquo;ll fabricate a topic map designed for momentum and confidence.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-muted)]/80 bg-[var(--surface-2)]/80 px-6 py-5 text-xs text-[var(--muted-foreground)] shadow-sm backdrop-blur">
                  <p className="text-[var(--muted-foreground-strong)]">Workflow tips</p>
                  <ul className="mt-3 space-y-2">
                    <li>Start with the course context or upload the syllabus.</li>
                    <li>Use exam calibration to tailor difficulty.</li>
                    <li>Rate topics to guide what we reinforce first.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[3fr,2fr]">
          <form onSubmit={handleGenerateTopics} className="space-y-8">
            <section className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-7 sm:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium">Course timeline</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Set your starting point and when you&rsquo;d like to wrap this course.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Start date</label>
                    <div className="mt-3">
                      <div className="group flex items-center gap-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 shadow-inner transition focus-within:border-primary focus-within:outline-none focus-within:ring-4 focus-within:ring-primary/20">
                        <span className="text-[var(--muted-foreground)]">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(event) => {
                            const value = event.target.value;
                            setStartDate(value);
                            if (value && finishDate && new Date(value) > new Date(finishDate)) {
                              setFinishDate(value);
                            }
                          }}
                          min={today}
                          max={finishDate || undefined}
                          className="w-full border-0 bg-transparent p-0 text-[var(--foreground)] outline-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Finish by</label>
                    <div className="mt-3">
                      <div className="group flex items-center gap-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 shadow-inner transition focus-within:border-primary focus-within:outline-none focus-within:ring-4 focus-within:ring-primary/20">
                        <span className="text-[var(--muted-foreground)]">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <input
                          type="date"
                          value={finishDate}
                          onChange={(event) => setFinishDate(event.target.value)}
                          min={startDate || today}
                          className="w-full border-0 bg-transparent p-0 text-[var(--foreground)] outline-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="gradient-border rounded-[28px]" ref={dropdownRef}>
              <div className="card-shell glass-panel panel-accent-sky rounded-[28px] px-6 py-7 sm:px-8">
                <h2 className="text-lg font-medium">Course title</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Search the catalog or define your own title.</p>
                <div className="relative mt-5">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  </span>
                  <input
                    type="text"
                    placeholder={"Try \"CSE 351\" or \"Hardware Systems\""}
                    value={courseQuery}
                    onChange={handleCourseInputChange}
                    onFocus={() => setCourseDropdownOpen(true)}
                    className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 pl-11 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  />
                  {courseDropdownOpen && (
                    <div className="absolute z-20 mt-3 w-full overflow-hidden rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] shadow-2xl">
                      {searching ? (
                        <div className="px-5 py-4 text-sm text-[var(--muted-foreground)]">Searching catalog…</div>
                      ) : searchError ? (
                        <div className="px-5 py-4 text-sm text-red-400">{searchError}</div>
                      ) : courseQuery.trim().length < 2 ? (
                        <div className="px-5 py-4 text-sm text-[var(--muted-foreground)]">Type at least two characters to search the catalog.</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-[var(--muted-foreground)]">No matches found. Continue with your custom title.</div>
                      ) : (
                        <ul className="max-h-56 overflow-y-auto">
                          {searchResults.map((course) => (
                            <li key={course.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectCourse(course)}
                                className="flex w-full flex-col items-start gap-1 px-5 py-3 text-left text-sm transition hover:bg-primary/10"
                              >
                                <span className="text-xs uppercase tracking-wide text-primary">{course.code}</span>
                                <span className="text-[var(--foreground)]">{course.title}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-rose rounded-[28px] px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium">Syllabus details</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Drop in outline notes or upload supporting files.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={syllabusInputId}
                      type="file"
                      multiple
                      accept={syllabusFileTypes}
                      onChange={handleSyllabusFileChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor={syllabusInputId}
                      className="pill-outline cursor-pointer text-[10px]"
                    >
                      Upload files
                    </label>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={syllabusText}
                  onChange={(event) => setSyllabusText(event.target.value)}
                  placeholder="Share objectives, weekly structure, assessments, or anything else that should inform the plan."
                  className="mt-5 w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
                {syllabusFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Uploaded files (not yet sent)</p>
                    <ul className="flex flex-wrap gap-2">
                      {syllabusFiles.map((file) => (
                        <li key={file.name} className="flex items-center gap-2 rounded-full border border-[var(--border-muted)] bg-[var(--surface-2)] px-3 py-1 text-xs">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSyllabusFile(file.name)}
                            className="text-[var(--muted-foreground)] transition hover:text-red-400"
                            aria-label={`Remove ${file.name}`}
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sky rounded-[28px] px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium">Exam calibration</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Optional: share formats or examples so we can match difficulty.</p>
                  </div>
                  <label className="pill-outline cursor-pointer text-[10px]">
                    <input
                      type="checkbox"
                      checked={hasExamMaterials}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setHasExamMaterials(checked);
                        if (!checked) {
                          setExamNotes("");
                          setExamFiles([]);
                        }
                      }}
                      className="sr-only"
                    />
                    <span>{hasExamMaterials ? "Included" : "Include exam details"}</span>
                  </label>
                </div>

                {hasExamMaterials && (
                  <div className="mt-6 space-y-5 rounded-2xl border border-dashed border-[var(--border-muted)] bg-[var(--surface-2)]/80 p-6">
                    <label className="block text-sm text-[var(--muted-foreground)]">
                      <span className="mb-2 block text-[var(--foreground)]">Preferred exam format</span>
                      <select
                        value={examFormat}
                        onChange={(event) => setExamFormat(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      >
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                        <option value="slides">Slides</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <div>
                      <label className="text-sm text-[var(--muted-foreground)]">
                        <span className="mb-2 block text-[var(--foreground)]">Upload sample exams (optional)</span>
                        <input
                          id={examInputId}
                          type="file"
                          multiple
                          accept={syllabusFileTypes}
                          onChange={handleExamFileChange}
                          className="w-full cursor-pointer rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--muted-foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                        />
                      </label>
                      {examFiles.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                          {examFiles.map((file) => (
                            <li key={file.name} className="flex items-center gap-2 rounded-full border border-[var(--border-muted)] bg-[var(--surface-muted)] px-3 py-1">
                              <span>{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExamFile(file.name)}
                                className="text-[var(--muted-foreground)] transition hover:text-red-400"
                                aria-label={`Remove ${file.name}`}
                              >
                                &times;
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <label className="block text-sm text-[var(--muted-foreground)]">
                      <span className="mb-2 block text-[var(--foreground)]">Additional notes</span>
                      <textarea
                        rows={4}
                        value={examNotes}
                        onChange={(event) => setExamNotes(event.target.value)}
                        placeholder="Share timing, scoring, or question style preferences."
                        className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="pill-outline text-[10px]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={generating}
                className="bg-primary rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? "Generating topics…" : "Generate study topics"}
              </button>
            </div>
            {generationError && (
              <div className="gradient-border rounded-[24px]">
                <div className="card-shell rounded-[24px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                  {generationError}
                </div>
              </div>
            )}
          </form>

          <aside className="space-y-6 lg:sticky lg:top-20">
            <div className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-7 sm:px-8">
                <h2 className="text-lg font-medium">Topics &amp; confidence</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Rate how confident you are in each topic. Adjust, remove, or add topics as needed.
                </p>
                <div className="mt-5 grid gap-3 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                  {Object.entries(ratingDescriptions).map(([rating, description]) => (
                    <div key={rating} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3">
                      <div className="mb-1 flex items-center gap-1 text-[var(--foreground)]">
                        {Array.from({ length: Number(rating) }).map((_, index) => (
                          <svg key={index} className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <p>{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-rose rounded-[28px] px-6 py-6 sm:px-7">
                <form onSubmit={handleAddTopic} className="space-y-4">
                  <h3 className="text-sm font-medium text-[var(--foreground)]">Add a custom topic</h3>
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(event) => setNewTopicTitle(event.target.value)}
                    placeholder="Topic name"
                    className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {([1, 2, 3]).map((rating) => (
                        <button
                          type="button"
                          key={rating}
                          onClick={() => setNewTopicRating(rating)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                            rating <= newTopicRating ? "border-primary bg-primary/20 text-primary" : "border-[var(--border-muted)] bg-[var(--surface-1)] text-[var(--muted-foreground)]"
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="bg-primary rounded-full px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-primary-hover"
                    >
                      Add topic
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sky rounded-[28px] px-6 py-6 sm:px-7">
                {generating ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                      <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8" />
                      </svg>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">Crafting your study roadmap…</p>
                        <p>We&rsquo;re ranking what to learn first and how deep to go.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="space-y-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)]/80 p-4">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--surface-muted)]" />
                          <div className="flex gap-2">
                            {Array.from({ length: 3 }).map((__, starIndex) => (
                              <div key={starIndex} className="h-9 w-9 animate-pulse rounded-full border border-[var(--border-muted)] bg-[var(--surface-muted)]" />
                            ))}
                          </div>
                          <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : topics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-muted)]/60 bg-[var(--surface-2)]/70 px-4 py-6 text-sm text-[var(--muted-foreground)]">
                    Generated topics will appear here once you run the creator.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {topics.map((topic) => (
                      <div key={topic.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)]/85 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">{topic.title}</h3>
                            {topic.source === "manual" && (
                              <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                                Added by you
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(topic.id)}
                            className="text-xs text-[var(--muted-foreground)] transition hover:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {([1, 2, 3]).map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => handleRatingChange(topic.id, rating)}
                              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                rating <= topic.rating
                                  ? "border-primary bg-primary/20 text-primary"
                                  : "border-[var(--border-muted)] bg-[var(--surface-1)] text-[var(--muted-foreground)]"
                              }`}
                              aria-label={`Set rating ${rating}`}
                            >
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill={rating <= topic.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {ratingDescriptions[topic.rating]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="gradient-border rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-6 sm:px-7">
                <h2 className="text-lg font-medium text-[var(--foreground)]">Finalize your plan</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Lock in your topic selection, then generate a complete course structure powered by GPT-5.
                </p>

                {topicsApproved ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border-muted)] bg-green-500/10 px-4 py-3 text-xs text-[var(--success)]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Topics approved and ready for generation.
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-muted)] bg-[var(--surface-2)]/70 px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    Review your topics and their confidence ratings. You can still edit them after approval—just remember to approve again if you make changes.
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleApproveTopics}
                    disabled={topics.length === 0 || courseGenerating || topicsApproved}
                    className={`btn btn-outline w-full justify-center ${topicsApproved ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {topicsApproved ? "Topics approved" : "Approve topics"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateCourse}
                    disabled={!topicsApproved || courseGenerating}
                    className="btn btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {courseGenerating ? "Generating course…" : "Generate Course"}
                  </button>
                </div>

                {courseGenerationError && (
                  <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {courseGenerationError}
                  </div>
                )}

                <p className="mt-4 text-[11px] text-[var(--muted-foreground)]">
                  We&rsquo;ll send your context, attachments, and topics to the backend to craft a full course structure. You&rsquo;ll be redirected to the dashboard once it&rsquo;s ready.
                </p>
              </div>
            </div>

            {deletedTopics.length > 0 && (
              <div className="gradient-border rounded-[28px]">
                <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-5 text-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[var(--foreground)]">Recently removed</h3>
                    <button
                      type="button"
                      onClick={handleRestoreAll}
                      className="text-xs text-primary transition hover:text-primary-hover"
                    >
                      Restore all
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2 text-[var(--muted-foreground)]">
                    {deletedTopics.map((topic) => (
                      <li key={topic.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{topic.title}</span>
                        <button
                          type="button"
                          onClick={() => handleRestoreTopic(topic.id)}
                          className="text-xs text-primary transition hover:text-primary-hover"
                        >
                          Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
