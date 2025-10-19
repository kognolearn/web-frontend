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

  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicRating, setNewTopicRating] = useState(defaultTopicRating);

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
    } catch (error) {
      setGenerationError(error.message || "Unexpected error generating topics.");
    } finally {
      setGenerating(false);
    }
  }, [examFormat, examNotes, finishDate, hasExamMaterials, selectedCourse, syllabusText, userId, courseQuery]);

  const handleRatingChange = useCallback((topicId, rating) => {
    setTopics((prev) => prev.map((topic) => (topic.id === topicId ? { ...topic, rating } : topic)));
  }, []);

  const handleDeleteTopic = useCallback((topicId) => {
    let removedTopic = null;
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
      setTopics((existing) => [restoredTopic, ...existing.filter((item) => item.id !== restoredTopic.id)]);
    }
  }, []);

  const handleRestoreAll = useCallback(() => {
    setTopics((prev) => [...deletedTopics, ...prev]);
    setDeletedTopics([]);
  }, [deletedTopics]);

  const handleAddTopic = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = newTopicTitle.trim();
      if (!trimmed) return;
      setTopics((prev) => [createTopicObject(trimmed, newTopicRating, "manual"), ...prev]);
      setNewTopicTitle("");
      setNewTopicRating(defaultTopicRating);
    },
    [newTopicTitle, newTopicRating]
  );

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 text-[var(--foreground)] transition-colors">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Build Study Topics</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Provide context for the course and we&rsquo;ll suggest the key topics to focus on.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-primary/20 hover:text-[var(--foreground)]"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[3fr,2fr]">
          <form onSubmit={handleGenerateTopics} className="space-y-6">
            <section className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">Finish date</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Let us know when you&rsquo;d like to complete the course.</p>
                </div>
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                  Defaulted to today
                </span>
              </div>
              <div className="mt-6">
                <label className="text-sm text-[var(--muted-foreground)]">Finish by</label>
                <div className="relative mt-3">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="date"
                    value={finishDate}
                    onChange={(event) => setFinishDate(event.target.value)}
                    min={today}
                    className="w-full rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 pl-11 text-[var(--foreground)] shadow-inner transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm" ref={dropdownRef}>
              <h2 className="text-lg font-medium">Course title</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Search our catalog or provide your own course name.
              </p>
              <div className="relative mt-5">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder={"Try \"CSE 351\" or \"Hardware Systems\""}
                  value={courseQuery}
                  onChange={handleCourseInputChange}
                  onFocus={() => setCourseDropdownOpen(true)}
                  className="w-full rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 pl-11 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
                {courseDropdownOpen && (
                  <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] shadow-xl">
                    {searching ? (
                      <div className="px-4 py-4 text-sm text-[var(--muted-foreground)]">Searching catalog…</div>
                    ) : searchError ? (
                      <div className="px-4 py-4 text-sm text-red-400">{searchError}</div>
                    ) : courseQuery.trim().length < 2 ? (
                      <div className="px-4 py-4 text-sm text-[var(--muted-foreground)]">Type at least two characters to search the catalog.</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-[var(--muted-foreground)]">No matches found. Continue with your custom title.</div>
                    ) : (
                      <ul className="max-h-56 overflow-y-auto">
                        {searchResults.map((course) => (
                          <li key={course.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCourse(course)}
                              className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-primary/10"
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
            </section>

            <section className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-medium">Syllabus details</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Provide an outline, list of topics, or upload supporting documents.
                  </p>
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
                    className="cursor-pointer rounded-full border border-[var(--border-muted)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted-foreground)] transition hover:bg-primary/10 hover:text-[var(--foreground)]"
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
                className="mt-5 w-full rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
              {syllabusFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Uploaded files (not yet sent)</p>
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
            </section>

            <section className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium">Exam calibration (optional)</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Share preferred formats or example exams so we can match difficulty.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
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
                    className="h-4 w-4 rounded border-[var(--border-muted)] text-primary focus:ring-primary"
                  />
                  Include exam details
                </label>
              </div>

              {hasExamMaterials && (
                <div className="mt-5 space-y-5 rounded-xl border border-dashed border-[var(--border-muted)] bg-[var(--surface-2)] p-5">
                  <label className="block text-sm text-[var(--muted-foreground)]">
                    <span className="mb-2 block text-[var(--foreground)]">Preferred exam format</span>
                    <select
                      value={examFormat}
                      onChange={(event) => setExamFormat(event.target.value)}
                      className="w-full rounded-lg border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
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
                        className="w-full cursor-pointer rounded-lg border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--muted-foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
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
                      className="w-full rounded-lg border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--surface-2)]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={generating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? "Generating topics…" : "Generate study topics"}
              </button>
            </div>
            {generationError && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {generationError}
              </div>
            )}
          </form>

          <aside className="space-y-6 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm">
            <div className="space-y-3">
              <h2 className="text-lg font-medium">Topics &amp; confidence</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Rate how confident you are in each topic. Adjust, remove, or add topics as needed.
              </p>
              <div className="grid gap-3 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                {Object.entries(ratingDescriptions).map(([rating, description]) => (
                  <div key={rating} className="rounded-lg border border-[var(--border-muted)] bg-[var(--surface-2)] px-3 py-2">
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

            <form onSubmit={handleAddTopic} className="rounded-xl border border-dashed border-[var(--border-muted)] bg-[var(--surface-2)] p-4 space-y-3">
              <h3 className="text-sm font-medium text-[var(--foreground)]">Add a custom topic</h3>
              <input
                type="text"
                value={newTopicTitle}
                onChange={(event) => setNewTopicTitle(event.target.value)}
                placeholder="Topic name"
                className="w-full rounded-lg border border-[var(--border-muted)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {([1, 2, 3]).map((rating) => (
                    <button
                      type="button"
                      key={rating}
                      onClick={() => setNewTopicRating(rating)}
                      className={`h-8 w-8 rounded-full border border-[var(--border-muted)] flex items-center justify-center transition ${
                        rating <= newTopicRating ? "bg-primary/20 text-primary" : "bg-[var(--surface-1)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-gray-900 transition hover:bg-primary-hover"
                >
                  Add topic
                </button>
              </div>
            </form>

            {generating ? (
              <div className="space-y-4 rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] p-6">
                <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                  <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8" />
                  </svg>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Crafting your ultimate study roadmap…</p>
                    <p>We're researching, ranking, and polishing the perfect topic list.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-3 rounded-xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-4">
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
              <div className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                Generated topics will appear here once you run the creator.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {topics.map((topic) => (
                  <div key={topic.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] p-4">
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

            {deletedTopics.length > 0 && (
              <div className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] p-4 text-sm">
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
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
