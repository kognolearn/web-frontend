"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";

const searchDebounceMs = 350;
const syllabusFileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt";

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) return "Not set";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeCatalogResult(result) {
  return {
    id: result.id,
    code: result.code || result.course_code || "Unknown code",
    title: result.title || result.course_title || "Untitled course",
  };
}

export default function CreateCoursePage() {
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

  const [showSummary, setShowSummary] = useState(false);

  const dropdownRef = useRef(null);

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

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    setShowSummary(true);
  }, []);

  const displayFinishDate = useMemo(() => formatDisplayDate(finishDate), [finishDate]);

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 text-[var(--foreground)] transition-colors">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Set Up Your Course</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Craft your course by selecting catalog details, picking a finish date, and sharing any material we should consider.
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">Finish date</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Let us know when this course should wrap up.</p>
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
                Search our catalog or type your own working title. Selecting an item will pull in its catalog code.
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
                    Provide an outline, list of topics, or upload supporting documents. You can do both.
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
                placeholder="Share objectives, weekly structure, assessments, or anything else the assistant should consider."
                className="mt-5 w-full rounded-xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
              {syllabusFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Uploaded files</p>
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-primary-hover"
              >
                Preview course outline
              </button>
            </div>
          </form>

          <aside className="space-y-4 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 shadow-sm">
            <h2 className="text-lg font-medium">Summary</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Review what you have entered. You can adjust any field before continuing.
            </p>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-[var(--muted-foreground-strong)]">Finish by</dt>
                <dd>{displayFinishDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground-strong)]">Course title</dt>
                <dd>
                  {selectedCourse ? (
                    <div className="space-y-1">
                      <span className="text-xs uppercase tracking-wide text-primary">{selectedCourse.code}</span>
                      <p>{selectedCourse.title}</p>
                    </div>
                  ) : courseQuery ? (
                    courseQuery
                  ) : (
                    "Not provided"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground-strong)]">Syllabus details</dt>
                <dd className="space-y-2">
                  <p className="whitespace-pre-wrap text-[var(--muted-foreground)]">
                    {syllabusText || "No syllabus details yet."}
                  </p>
                  {syllabusFiles.length > 0 && (
                    <ul className="space-y-1 text-xs text-[var(--muted-foreground)]">
                      {syllabusFiles.map((file) => (
                        <li key={file.name}>{file.name}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground-strong)]">Exam materials</dt>
                <dd>
                  {hasExamMaterials ? (
                    <div className="space-y-2 text-[var(--muted-foreground)]">
                      <p>Format preference: {examFormat.toUpperCase()}</p>
                      {examFiles.length > 0 ? (
                        <ul className="space-y-1 text-xs">
                          {examFiles.map((file) => (
                            <li key={file.name}>{file.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No files uploaded yet.</p>
                      )}
                      <p>{examNotes || "No additional notes."}</p>
                    </div>
                  ) : (
                    "Not included"
                  )}
                </dd>
              </div>
            </dl>
            {showSummary && (
              <div className="rounded-lg border border-primary bg-primary/10 p-4 text-sm text-[var(--foreground)]">
                Inputs saved locally for now. We will wire this up to course generation soon.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
