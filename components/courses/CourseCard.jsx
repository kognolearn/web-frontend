"use client";

import Link from "next/link";
import { useState } from "react";

export default function CourseCard({ courseCode, courseName, courseId, endDate, userId, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/courses?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(courseId)}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete course");
      }
      
      if (onDelete) {
        onDelete(courseId);
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course. Please try again.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDeadline = (date) => {
    if (!date) return "No deadline set";
    try {
      const d = new Date(date);
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="card relative rounded-2xl p-6 transition-all duration-200 h-40 flex flex-col justify-between group overflow-hidden">
      <div className="relative">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 line-clamp-2">
          {courseCode}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Due: {formatDeadline(endDate)}
        </p>
      </div>
      <div className="relative flex items-center justify-between mt-4 gap-2">
        <Link
          href={`/courses/${courseId}`}
          className="btn btn-primary flex-1 text-center"
        >
          View Course
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`btn btn-sm ${showDeleteConfirm ? "btn-danger" : "btn-muted"}`}
          title={showDeleteConfirm ? "Click again to confirm deletion" : "Delete course"}
        >
          {deleting ? "..." : showDeleteConfirm ? "Confirm?" : "Delete"}
        </button>
      </div>
      {showDeleteConfirm && !deleting && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
          className="absolute top-2 right-2 btn btn-link btn-xs text-[var(--muted-foreground)]"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
