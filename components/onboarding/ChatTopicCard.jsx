'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getFamiliarityColor,
  getFamiliarityIcon,
  getFamiliarityLevel,
} from '@/lib/topicHelpers';

const FAMILIARITY_OPTIONS = [
  { rating: 1, level: 'unfamiliar', label: 'Unfamiliar' },
  { rating: 2, level: 'learning', label: 'Learning' },
  { rating: 3, level: 'confident', label: 'Confident' },
];

const resolveTitle = (topic) =>
  typeof topic?.title === 'string' && topic.title.trim()
    ? topic.title.trim()
    : typeof topic?.name === 'string' && topic.name.trim()
    ? topic.name.trim()
    : 'Untitled topic';

const resolveSubtopicCount = (topic) => {
  const subtopics = Array.isArray(topic?.subtopics)
    ? topic.subtopics
    : Array.isArray(topic?.lessons)
    ? topic.lessons
    : Array.isArray(topic?.topics)
    ? topic.topics
    : [];
  return subtopics.length;
};

const resolveSubtopics = (topic) => {
  if (Array.isArray(topic?.subtopics)) return topic.subtopics;
  if (Array.isArray(topic?.lessons)) return topic.lessons;
  if (Array.isArray(topic?.topics)) return topic.topics;
  return [];
};

export default function ChatTopicCard({
  topic,
  rating,
  onRatingChange,
  onRemove,
  onTitleChange,
  disabled = false,
}) {
  const title = resolveTitle(topic);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(title);
    }
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const familiarityLevel = getFamiliarityLevel(
    Number.isFinite(rating) ? rating : topic?.familiarity
  );
  const subtopicCount = resolveSubtopicCount(topic);
  const subtopics = resolveSubtopics(topic)
    .map((entry) => ({
      id: entry?.id || entry?.slug_id || entry?.title || entry?.name,
      title:
        (typeof entry?.title === 'string' && entry.title.trim())
          ? entry.title.trim()
          : (typeof entry?.name === 'string' && entry.name.trim())
          ? entry.name.trim()
          : 'Untitled lesson',
    }))
    .filter((entry) => entry.title);
  const [isExpanded, setIsExpanded] = useState(false);

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    setIsEditing(false);
    if (!trimmed || trimmed === title) {
      setDraftTitle(title);
      return;
    }
    if (onTitleChange && topic?.id) {
      onTitleChange(topic.id, trimmed);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[var(--surface-1)] px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitTitle();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setIsEditing(false);
                  setDraftTitle(title);
                }
              }}
              disabled={disabled}
              className="w-full bg-transparent text-sm font-semibold text-[var(--foreground)] focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="w-full text-left text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors truncate"
              title="Edit topic name"
            >
              {title}
            </button>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span>{subtopicCount} lessons</span>
            <span className="h-1 w-1 rounded-full bg-[var(--muted-foreground)]/60" />
            <span className="capitalize">{familiarityLevel.replace('-', ' ')}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove?.(topic)}
          disabled={disabled}
          className="p-1.5 rounded-full text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)] transition-colors"
          title="Remove topic"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {FAMILIARITY_OPTIONS.map((option) => {
          const isActive = option.level === familiarityLevel;
          return (
            <button
              key={option.level}
              type="button"
              onClick={() => onRatingChange?.(topic?.id, option.rating)}
              disabled={disabled}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? getFamiliarityColor(option.level)
                  : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] border-white/10 hover:text-[var(--foreground)]'
              }`}
              title={option.label}
            >
              {getFamiliarityIcon(option.level)}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {subtopicCount > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <span
              className={`inline-block transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              ▶
            </span>
            <span>{isExpanded ? 'Hide lessons' : `View lessons (${subtopicCount})`}</span>
          </button>
          {isExpanded && (
            <ul className="mt-2 space-y-1 rounded-lg border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
              {subtopics.map((entry, idx) => (
                <li key={entry.id || `${title}-${idx}`} className="leading-relaxed">
                  {entry.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
