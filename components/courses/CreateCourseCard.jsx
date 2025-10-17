"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const searchDebounceMs = 300;
const maxResults = 12;

export default function CreateCourseCard() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [creatingId, setCreatingId] = useState(null);
  const [createError, setCreateError] = useState("");
  const [posting, setPosting] = useState(false);
  const [genError, setGenError] = useState("");

  const searchConfigs = useMemo(
    () => [
      {
        select: "id, code, title",
        columns: ["code", "title"],
        orderBy: "code",
      },
      {
        select: "id, course_code, course_title",
        columns: ["course_code", "course_title"],
        orderBy: "course_code",
      },
    ],
    []
  );

  const resetState = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearchError("");
    setCreateError("");
    setCreatingId(null);
    setSearching(false);
    setSelectedId(null);
    setPosting(false);
    setGenError("");
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    if (!expanded) return;
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    setSearching(true);
    setSearchError("");

    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog-search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) {
          setResults([]);
          setSearchError("Unable to search catalog. Please try again.");
        } else {
          const body = await res.json();
          setResults(body.results || []);
          setSearchError("");
        }
      } catch (err) {
        setResults([]);
        setSearchError("Unable to search catalog. Please try again.");
        if (process.env.NODE_ENV !== "production") {
          console.error("Course catalog search failed", err);
        }
      } finally {
        setSearching(false);
      }
    }, searchDebounceMs);

    return () => clearTimeout(handler);
  }, [expanded, query, searchConfigs]);

  const handleSelectCourse = useCallback((course) => {
    setCreateError("");
    setSelectedId((prev) => (prev === course.id ? null : course.id));
  }, []);

  const handleSkip = useCallback(async () => {
    setCreateError("");
    setGenError("");
    setPosting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setCreateError("You need to be signed in to continue.");
        setPosting(false);
        return;
      }
      // Generate a course without selection (backend spec only needs userId)
      const resp = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authData.user.id }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setGenError(body?.error || "Failed to generate course.");
        setPosting(false);
        return;
      }
  // Success: close and notify dashboard to refresh list
  handleClose();
  try { window.dispatchEvent(new Event("courses:updated")); } catch {}
  router.refresh();
      setPosting(false);
    } catch (err) {
      setGenError("Unexpected error. Please try again.");
      setPosting(false);
    }
  }, [handleClose, router]);

  const handleNext = useCallback(async () => {
    if (!selectedId) return;
    setCreateError("");
    setGenError("");
    setPosting(true);
    try {
      const selected = results.find((r) => r.id === selectedId);
      if (!selected) {
        setCreateError("Please select a course.");
        setPosting(false);
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setCreateError("You need to be signed in to continue.");
        setPosting(false);
        return;
      }

      // Backend POST only requires userId per spec
      const resp = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authData.user.id }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setGenError(body?.error || "Failed to generate course.");
        setPosting(false);
        return;
      }
  // Success: close and notify dashboard to refresh list
  handleClose();
  try { window.dispatchEvent(new Event("courses:updated")); } catch {}
  router.refresh();
      setPosting(false);
    } catch (err) {
      setGenError("Unexpected error. Please try again.");
      setPosting(false);
    }
  }, [results, selectedId, handleClose, router]);

  const containerClasses = useMemo(
    () =>
      `transition-all duration-300 ease-in-out rounded-xl border-2 ${
        expanded
          ? "bg-white border-primary shadow-sm col-span-1"
          : "bg-gray-50 border-dashed border-gray-300 hover:border-primary hover:bg-gray-100 cursor-pointer"
      } ${expanded ? "p-6" : "p-6 h-40 flex flex-col items-center justify-center group"}`,
    [expanded]
  );

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={containerClasses}
      >
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <svg
            className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
          Create New Course
        </span>
      </button>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add from Course Catalog</h3>
          <p className="text-sm text-gray-500">
            Search by course code or title to add it to your dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close course catalog search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative mt-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder={'Try "CSE 351" or "Hardware"'}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {searching ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
      </div>

      {searchError && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {searchError}
        </div>
      )}

      {createError && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {createError}
        </div>
      )}

      <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {query.trim() === "" && !searching ? (
          <EmptyHint />
        ) : results.length === 0 && !searching ? (
          <NoResults query={query} />
        ) : (
          results.map((course) => {
            const isCreating = creatingId === course.id;
            const isSelected = selectedId === course.id;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => handleSelectCourse(course)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  isSelected ? "bg-primary/10" : "hover:bg-primary/10"
                }`}
                disabled={isCreating}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {course.code || "Unknown Code"}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {course.title || "Untitled Course"}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
                    </svg>
                  )}
                  {isCreating && (
                    <svg className="w-5 h-5 text-primary animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Actions: Next / Skip */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleSkip}
          disabled={posting}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedId || posting}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            selectedId ? "bg-primary text-gray-900 hover:bg-primary-hover" : "bg-gray-200 text-gray-600"
          }`}
        >
          {posting ? "Processing..." : "Next"}
        </button>
      </div>

      {/* Generation errors */}
      {genError && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {genError}
        </div>
      )}


      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>Powered by course catalog</span>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="px-4 py-6 text-sm text-gray-500">
      Start typing to search the catalog. Try a course code like <span className="font-medium text-gray-700">CSE 351</span> or a title keyword like <span className="font-medium text-gray-700">Hardware</span>.
    </div>
  );
}

function NoResults({ query }) {
  return (
    <div className="px-4 py-6 text-sm text-gray-500">
      No courses found matching <span className="font-medium text-gray-700">"{query}"</span>. Try another code or title.
    </div>
  );
}
