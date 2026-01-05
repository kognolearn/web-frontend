"use client";

import { useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";

export default function CourseLimitModal({
  isOpen,
  onClose,
  courses = [],
  userId,
  onCourseDeleted,
  limit = 2
}) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLeaveCourse = async () => {
    if (!selectedCourse || !userId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/courses?userId=${userId}&courseId=${selectedCourse}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to leave course");
      }

      onCourseDeleted?.(selectedCourse);
      onClose();
    } catch (err) {
      console.error("Error leaving course:", err);
      setError("Failed to leave course. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
            Course Limit Reached
          </h3>
          <p className="text-[var(--muted-foreground)]">
            You've reached the maximum of {limit} courses on the free plan. Leave an existing course or upgrade to Pro for unlimited courses.
          </p>
        </div>

        {/* Course selection */}
        {courses.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-[var(--foreground)] mb-3">Select a course to leave:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedCourse === course.id
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--muted-foreground)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedCourse === course.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]'
                        : 'border-[var(--muted-foreground)]'
                    }`}>
                      {selectedCourse === course.id && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="6" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {course.title || course.course_title || 'Untitled Course'}
                      </p>
                      {course.is_shared_copy && (
                        <p className="text-xs text-[var(--muted-foreground)]">Shared course</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--surface-1)] px-3 text-sm text-[var(--muted-foreground)]">or</span>
          </div>
        </div>

        {/* Pro features */}
        <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">Upgrade to Pro:</p>
          <ul className="space-y-2">
            {['Unlimited courses', 'Unlimited practice exams', 'Unlimited cheatsheets', 'Priority support'].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {selectedCourse && (
            <button
              onClick={handleLeaveCourse}
              disabled={isDeleting}
              className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Leaving...
                </>
              ) : (
                'Leave Selected Course'
              )}
            </button>
          )}
          <Link
            href="/pricing"
            onClick={onClose}
            className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors text-center"
          >
            Upgrade to Pro
          </Link>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-3)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
