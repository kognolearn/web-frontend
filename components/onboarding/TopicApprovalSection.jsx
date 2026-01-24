'use client';

import { useEffect, useRef, useState } from 'react';
import ChatTopicCard from '@/components/onboarding/ChatTopicCard';

const FAMILIARITY_RATINGS = {
  UNFAMILIAR: 1,
  LEARNING: 2,
  CONFIDENT: 3,
};

export default function TopicApprovalSection({
  topics = [],
  familiarityRatings = {},
  onTopicTitleChange,
  onTopicRemove,
  onTopicRestore,
  onRatingChange,
  onApprove,
  onRetry,
  isSaving = false,
  error = null,
  isApproved = false,
}) {
  const [removedEntry, setRemovedEntry] = useState(null);
  const undoTimerRef = useRef(null);

  const handleMarkAll = (rating) => {
    if (isApproved || !onRatingChange) return;
    topics.forEach((topic) => {
      if (topic?.id) {
        onRatingChange(topic.id, rating);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  const handleRemove = (topic) => {
    if (isApproved) return;
    if (!topic || !topic.id) return;
    const index = topics.findIndex((entry) => entry.id === topic.id);
    if (index < 0) return;
    const rating = familiarityRatings[topic.id];
    onTopicRemove?.(topic, index, rating);
    setRemovedEntry({ topic, index, rating });
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setRemovedEntry(null);
      undoTimerRef.current = null;
    }, 5000);
  };

  const handleUndo = () => {
    if (isApproved) return;
    if (!removedEntry) return;
    onTopicRestore?.(removedEntry.topic, removedEntry.index, removedEntry.rating);
    setRemovedEntry(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  return (
    <div className="w-full sm:min-w-[360px] max-w-[420px]">
      <div className="rounded-2xl border border-white/10 bg-[var(--surface-2)] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">Review your topics</h4>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isApproved
              ? 'Topics locked in.'
              : 'Adjust names, remove topics, and set your familiarity.'}
          </p>
          </div>
          {isSaving && (
            <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
              Saving...
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
            <div className="flex items-center justify-between gap-2">
              <span>{error}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-[10px] font-semibold uppercase tracking-wide text-[var(--danger)] hover:text-[var(--danger)]/80"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {topics.length > 0 && !isApproved && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Mark all:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMarkAll(FAMILIARITY_RATINGS.UNFAMILIAR)}
                disabled={Boolean(error)}
                className="px-2.5 py-1 rounded-md border border-white/10 bg-[var(--surface-1)] text-[10px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Unfamiliar
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll(FAMILIARITY_RATINGS.LEARNING)}
                disabled={Boolean(error)}
                className="px-2.5 py-1 rounded-md border border-white/10 bg-[var(--surface-1)] text-[10px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Learning
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll(FAMILIARITY_RATINGS.CONFIDENT)}
                disabled={Boolean(error)}
                className="px-2.5 py-1 rounded-md border border-white/10 bg-[var(--surface-1)] text-[10px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confident
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {topics.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4 text-center text-xs text-[var(--muted-foreground)]">
              No topics yet.
            </div>
          ) : (
            topics.map((topic) => (
              <ChatTopicCard
                key={topic.id}
                topic={topic}
                rating={familiarityRatings[topic.id]}
                onRatingChange={onRatingChange}
                onRemove={handleRemove}
                onTitleChange={onTopicTitleChange}
                disabled={Boolean(error) || isApproved}
              />
            ))
          )}
        </div>

        {removedEntry && !isApproved && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--foreground)]">
            <span className="truncate">
              Removed "{removedEntry.topic?.title || removedEntry.topic?.name || 'topic'}".
            </span>
            <button
              type="button"
              onClick={handleUndo}
              className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary)]/80"
            >
              Undo
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onApprove}
          disabled={topics.length === 0 || Boolean(error) || isApproved || isSaving}
          className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApproved ? 'Topics approved' : 'Approve Topics'}
        </button>
      </div>
    </div>
  );
}
