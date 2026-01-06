"use client";

import { useState, useRef } from "react";
import { authFetch } from "@/lib/api";

export default function PostEditor({
  studyGroupId,
  parentPostId = null,
  postId = null,
  onPostCreated,
  onPostUpdated,
  onCancel,
  isReply = false,
  mode = "create",
  initialContent = "",
}) {
  const [content, setContent] = useState(initialContent);
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const maxLength = 10000;
  const maxImages = 4;
  const allowImages = mode === "create";
  const isReplyPost = Boolean(parentPostId);

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await authFetch(`/api/community/groups/${studyGroupId}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Failed to upload image");
        const data = await res.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...urls]);
    } catch (err) {
      console.error("Error uploading images:", err);
      setError("Failed to upload images");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("Please enter some content");
      return;
    }

    if (content.length > maxLength) {
      setError(`Content must be ${maxLength} characters or less`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isEdit = mode === "edit";
      const endpoint = isEdit
        ? `/api/community/groups/${studyGroupId}/posts/${postId}`
        : isReplyPost
          ? `/api/community/groups/${studyGroupId}/posts/${parentPostId}/reply`
          : `/api/community/groups/${studyGroupId}/posts`;

      const res = await authFetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { content: content.trim() }
            : isReplyPost
              ? {
                  content: content.trim(),
                  imageUrls: images,
                }
              : {
                  content: content.trim(),
                  imageUrls: images,
                  parentPostId,
                }
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        const defaultMessage = isEdit ? "Failed to update post" : "Failed to create post";
        throw new Error(data.error || defaultMessage);
      }

      if (isEdit) {
        const updatedAt = data?.post?.updated_at || data?.post?.updatedAt || new Date().toISOString();
        const updatedContent = data?.post?.content || content.trim();
        onPostUpdated?.({
          content: updatedContent,
          updatedAt,
        });
      } else {
        onPostCreated?.(isReplyPost ? data.reply : data.post);
      }
      setContent("");
      setImages([]);
    } catch (err) {
      console.error(isEdit ? "Error updating post:" : "Error creating post:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Text area */}
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isReply ? "Write a reply..." : "What's on your mind?"}
          rows={isReply ? 3 : 5}
          maxLength={maxLength}
          className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
        />
        <div className="flex justify-end mt-1">
          <span className={`text-xs ${content.length > maxLength * 0.9 ? 'text-amber-500' : 'text-[var(--muted-foreground)]'}`}>
            {content.length}/{maxLength}
          </span>
        </div>
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt=""
                className="w-20 h-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(i)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        {allowImages && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!allowImages || isUploading || images.length >= maxImages}
            className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add images"
          >
            {isUploading ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {mode === "edit" ? "Saving..." : "Posting..."}
              </>
            ) : (
              mode === "edit" ? "Save" : isReply ? "Reply" : "Post"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
