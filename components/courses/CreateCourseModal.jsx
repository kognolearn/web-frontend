"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function CreateCourseModal({ onClose }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    courseCode: "",
    courseName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to create a course");
        setLoading(false);
        return;
      }

      // Use backend API to generate topics for this user (align payload with backend spec)
      const resp = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          // Provide courseSelection with non-empty code/title to satisfy backend validation
          courseSelection: {
            code: formData.courseCode?.trim() || "CUSTOM",
            title: formData.courseName?.trim() || "Untitled",
          },
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body?.error || "Failed to create course");
        setLoading(false);
        return;
      }

  // Notify dashboard and refresh view
  try { window.dispatchEvent(new Event("courses:updated")); } catch {}
  router.refresh();
  onClose();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">
            Create New Course
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="courseCode" className="block text-sm font-medium mb-2">
              Course Code
            </label>
            <input
              type="text"
              id="courseCode"
              name="courseCode"
              value={formData.courseCode}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="e.g., CSE 351"
              className="input w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="courseName" className="block text-sm font-medium mb-2">
              Course Name
            </label>
            <input
              type="text"
              id="courseName"
              name="courseName"
              value={formData.courseName}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="e.g., Hardware/Software Interface"
              className="input w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Generate Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
