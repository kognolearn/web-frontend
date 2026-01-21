"use client";

import { useState } from "react";

export default function DeleteCourseModal({ course, isOpen, onClose, onConfirm }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const isSharedWithMe = course?.isSharedWithMe === true;

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error("Error deleting course:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Different messaging for shared courses vs owned courses
    const title = isSharedWithMe ? "Leave Course?" : "Delete Course?";
    const description = isSharedWithMe
        ? <>Are you sure you want to leave <span className="font-medium text-[var(--foreground)]">"{course?.title}"</span>? You'll lose access to this shared course but can rejoin later if invited again.</>
        : <>Are you sure you want to delete <span className="font-medium text-[var(--foreground)]">"{course?.title}"</span>? This action cannot be undone.</>;
    const actionLabel = isSharedWithMe ? "Leave" : "Delete";
    const loadingLabel = isSharedWithMe ? "Leaving..." : "Deleting...";
    const buttonColor = isSharedWithMe ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[var(--surface-1)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[var(--border)] transform transition-all scale-100 opacity-100"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{title}</h3>
                <p className="text-[var(--muted-foreground)] mb-6 text-sm">
                    {description}
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${buttonColor} text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                {loadingLabel}
                            </>
                        ) : (
                            actionLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
