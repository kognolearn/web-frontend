"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import RichBlock from "@/components/content/RichBlock";
import VideoBlock from "@/components/content/VideoBlock";
import { hasRichContent, toRichBlock } from "@/utils/richText";

const FORMAT_METADATA = {
  reading: { label: "Reading" },
  notes: { label: "Reading" },
  text: { label: "Reading" },
  article: { label: "Reading" },
  overview: { label: "Reading" },
  lesson: { label: "Reading" },
  video: { label: "Video" },
  lecture_video: { label: "Video" },
  flashcards: { label: "Flashcards" },
  flashcard: { label: "Flashcards" },
  mini_quiz: { label: "Mini Quiz" },
  quiz: { label: "Quiz" },
  practice_quiz: { label: "Practice Quiz" },
  practice_exam: { label: "Practice Exam" },
  assessment: { label: "Assessment" },
};

function formatLabelForKey(fmt) {
  if (!fmt) return "Content";
  const entry = FORMAT_METADATA[fmt];
  if (entry?.label) return entry.label;
  return fmt
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Content";
}

function pickRichBlock(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    const block = toRichBlock(value);
    if (hasRichContent(block)) {
      return block;
    }
  }
  return { content: [] };
}

function extractItemsForTopic(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "object") return [];

  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.sections)) return raw.sections;
  if (Array.isArray(raw.entries)) return raw.entries;
  if (Array.isArray(raw.modules)) return raw.modules;

  const derived = [];
  Object.entries(raw).forEach(([, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      if (
        value.every(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            (entry.format || entry.type || entry.id || entry.content_id || entry.contentId)
        )
      ) {
        derived.push(...value);
      }
      return;
    }
    if (
      typeof value === "object" &&
      (value.format || value.type || value.id || value.content_id || value.contentId)
    ) {
      derived.push(value);
    }
  });
  return derived;
}

function deriveItemId(item, index) {
  if (!item || typeof item !== "object") {
    return index !== undefined ? `idx-${index}` : "";
  }
  return (
    item.id ??
    item.content_id ??
    item.contentId ??
    item.resource_id ??
    item.resourceId ??
    item.slug ??
    item.uid ??
    item.uuid ??
    (item.format ? `${item.format}-${index}` : undefined) ??
    (index !== undefined ? `idx-${index}` : "")
  );
}

function normalizeFlashcardEntry(entry) {
  if (Array.isArray(entry)) {
    const [question, answer, explanation] = entry;
    return [question ?? "", answer ?? "", explanation ?? ""];
  }
  if (entry && typeof entry === "object") {
    const question = entry.question ?? entry.prompt ?? entry.front ?? entry.q ?? entry[0];
    const answer = entry.answer ?? entry.response ?? entry.back ?? entry.a ?? entry[1];
    const explanation =
      entry.explanation ?? entry.detail ?? entry.notes ?? entry.explain ?? entry.rationale ?? entry[2] ?? "";
    return [question ?? "", answer ?? "", explanation ?? ""];
  }
  return [entry ?? "", "", ""];
}

function normalizeFlashcardDeck(payload) {
  if (!payload) return {};
  const base =
    (payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.cards ?? payload.deck ?? payload.flashcards ?? payload.entries ?? payload.data
      : null) ?? payload;

  const deck = {};
  if (Array.isArray(base)) {
    base.forEach((entry, idx) => {
      deck[String(idx + 1)] = normalizeFlashcardEntry(entry);
    });
    return deck;
  }

  if (base && typeof base === "object") {
    Object.entries(base).forEach(([key, value], idx) => {
      if (value === null || value === undefined) return;
      const cardKey = /^[0-9]+$/.test(key) ? key : String(idx + 1);
      deck[cardKey] = normalizeFlashcardEntry(value);
    });
    return deck;
  }

  if (typeof base === "string") {
    deck["1"] = normalizeFlashcardEntry(base);
    return deck;
  }

  return deck;
}

function renderContentForFormat(format, item, data) {
  const fmt = format || "";
  const dataObj = data && typeof data === "object" ? data : {};

  switch (fmt) {
    case "reading":
    case "notes":
    case "text":
    case "article":
    case "overview":
    case "lesson": {
      const bodyBlock = pickRichBlock(
        dataObj.body,
        dataObj.content,
        dataObj.text,
        dataObj.reading,
        dataObj.article,
        dataObj.notes,
        dataObj.sections,
        dataObj.paragraphs,
        typeof data === "string" ? data : null,
        item?.body,
        item?.content,
        item?.text
      );

      if (hasRichContent(bodyBlock)) {
        return <RichBlock block={bodyBlock} maxWidth="100%" />;
      }

      return (
        <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
          No reading content available yet.
        </div>
      );
    }

    case "video":
    case "lecture_video": {
      const url =
        item?.url ??
        item?.video_url ??
        item?.link ??
        dataObj.url ??
        dataObj.video_url ??
        dataObj.link ??
        dataObj.source ??
        "";

      const descriptionBlock = pickRichBlock(
        item?.notes,
        item?.description,
        dataObj.summary,
        dataObj.description,
        dataObj.notes
      );

      return (
        <div className="space-y-6">
          {url ? (
            <VideoBlock url={url} title={dataObj.title ?? item?.title ?? undefined} />
          ) : (
            <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
              Video link unavailable.
            </div>
          )}

          {hasRichContent(descriptionBlock) ? (
            <div className="text-sm text-[var(--muted-foreground)]">
              <RichBlock block={descriptionBlock} maxWidth="100%" />
            </div>
          ) : null}
        </div>
      );
    }

    case "flashcards":
    case "flashcard": {
      const deck = normalizeFlashcardDeck(
        dataObj.deck ??
          dataObj.cards ??
          dataObj.flashcards ??
          dataObj.data ??
          dataObj.contents ??
          item?.deck ??
          item?.cards ??
          item?.flashcards ??
          data
      );

      if (Object.keys(deck).length === 0) {
        return (
          <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
            No flashcards available.
          </div>
        );
      }

      return <FlashcardDeck data={deck} />;
    }

    case "mini_quiz":
    case "quiz":
    case "practice_quiz":
    case "practice_exam":
    case "assessment": {
      const questionsSource =
        dataObj.questions ??
        dataObj.items ??
        dataObj.quiz ??
        dataObj.problems ??
        dataObj.assessment ??
        item?.questions ??
        item?.items ??
        item?.quiz ??
        data;

      const instructionsBlock = pickRichBlock(
        item?.instructions,
        item?.summary,
        dataObj.instructions,
        dataObj.summary,
        dataObj.description,
        dataObj.overview
      );

      return (
        <div className="space-y-6">
          {hasRichContent(instructionsBlock) ? (
            <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-4 text-sm text-[var(--muted-foreground)]">
              <RichBlock block={instructionsBlock} maxWidth="100%" />
            </div>
          ) : null}
          <Quiz questions={questionsSource} />
        </div>
      );
    }

    default: {
      if (!data) {
        return (
          <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
            No content available for this item.
          </div>
        );
      }

      return (
        <pre className="overflow-auto rounded-2xl bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    }
  }
}

function normalizeFormat(fmt) {
  if (!fmt) return "";
  const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
  if (f === "practiceexam" || f === "practice_exam") return "practice_exam";
  return f;
}

function ItemContent({ item, index, topicKey, contentCache, setContentCache }) {
  const formatSource =
    item?.format ?? item?.type ?? item?.content_type ?? item?.contentType ?? item?.kind ?? item?.category;
  const normFmt = normalizeFormat(formatSource);
  const rawId = deriveItemId(item, index);
  const hasFetchId = Boolean(rawId);
  const cacheKey = normFmt ? `${topicKey}:${normFmt}:${hasFetchId ? rawId : `idx-${index}`}` : `${topicKey}:item-${index}`;
  const cached = contentCache[cacheKey];
  const fetchInitiatedRef = useRef(new Set());

  const initialData =
    item && typeof item === "object"
      ? item.data ?? item.payload ?? item.details ?? item.resource ?? item.contentData ?? item.bodyData ?? null
      : null;

  const shouldFetch = !initialData && normFmt && hasFetchId;

  useEffect(() => {
    if (!shouldFetch) return;
    if (fetchInitiatedRef.current.has(cacheKey)) return;
    if (cached && (cached.status === "loaded" || cached.status === "loading")) return;

    fetchInitiatedRef.current.add(cacheKey);
    setContentCache((prev) => ({ ...prev, [cacheKey]: { status: "loading" } }));

    (async () => {
      try {
        const url = `/api/content?format=${encodeURIComponent(normFmt)}&id=${encodeURIComponent(rawId)}`;
        console.log("[TopicRenderer] Fetching content:", { url, normFmt, id: rawId });
        const res = await fetch(url);
        let data;
        try {
          data = await res.json();
        } catch (_) {
          const raw = await res.text().catch(() => "");
          data = raw ? { raw } : {};
        }
        console.log("[TopicRenderer] Response:", res.status, data);
        if (!res.ok) {
          throw new Error((data && data.error) || `Failed (${res.status})`);
        }
        setContentCache((prev) => ({ ...prev, [cacheKey]: { status: "loaded", data } }));
      } catch (e) {
        console.error("[TopicRenderer] Error:", e);
        setContentCache((prev) => ({
          ...prev,
          [cacheKey]: { status: "error", error: String(e?.message || e) },
        }));
      }
    })();

    return () => {};
  }, [shouldFetch, normFmt, rawId, cacheKey, cached, setContentCache]);

  const status = initialData ? "loaded" : cached?.status;
  const data = initialData ?? (cached?.status === "loaded" ? cached.data : null);
  const errorMessage = cached?.error || "Failed to load content.";

  const formatLabel = formatLabelForKey(normFmt);
  const dataObj = data && typeof data === "object" ? data : {};
  const headerTitle =
    item?.title ?? dataObj.title ?? dataObj.heading ?? dataObj.name ?? dataObj.label ?? formatLabel;
  const estimated =
    item?.estimated_time ?? dataObj.estimated_time ?? dataObj.estimatedTime ?? dataObj.duration ?? null;
  const difficulty = item?.difficulty ?? dataObj.difficulty ?? null;
  const metaPieces = [];
  if (estimated) metaPieces.push(typeof estimated === "string" ? estimated : String(estimated));
  if (difficulty) {
    const diff = String(difficulty);
    metaPieces.push(diff.charAt(0).toUpperCase() + diff.slice(1));
  }
  const metadataLine = metaPieces.join(" • ");

  const descriptionBlock = pickRichBlock(
    item?.summary,
    item?.description,
    dataObj.summary,
    dataObj.overview,
    dataObj.description
  );

  const contentBody =
    status === "error"
      ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        )
      : status === "loaded"
      ? renderContentForFormat(normFmt, item, data)
      : shouldFetch
      ? <div className="text-sm text-[var(--muted-foreground)]">Loading {formatLabel.toLowerCase()}…</div>
      : renderContentForFormat(normFmt, item, data);

  return (
    <article className="card rounded-[28px] px-8 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {formatLabel}
          </span>
          {headerTitle ? (
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{headerTitle}</h2>
          ) : null}
          {metadataLine ? (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{metadataLine}</div>
          ) : null}
        </div>
      </div>

      {hasRichContent(descriptionBlock) ? (
        <div className="mt-4 text-sm text-[var(--muted-foreground)]">
          <RichBlock block={descriptionBlock} maxWidth="100%" />
        </div>
      ) : null}

      <div className="mt-6">{contentBody}</div>
    </article>
  );
}

export default function TopicRenderer({ topicKey, topicLabel, topicValue }) {
  const [contentCache, setContentCache] = useState({});

  useEffect(() => {
    setContentCache({});
  }, [topicKey]);

  const { items, container } = useMemo(() => {
    if (!topicValue) return { items: [], container: null };
    if (Array.isArray(topicValue)) {
      return { items: topicValue, container: null };
    }
    if (typeof topicValue === "object") {
      return { items: extractItemsForTopic(topicValue), container: topicValue };
    }
    return { items: [], container: null };
  }, [topicValue]);

  const topicIntroBlock = useMemo(() => {
    if (!container) return null;
    const block = pickRichBlock(
      container.summary,
      container.overview,
      container.description,
      container.introduction
    );
    return hasRichContent(block) ? block : null;
  }, [container]);

  return (
    <>
      <header className="card rounded-[32px] px-8 py-8 sm:px-10">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl text-[var(--foreground)]">
          {topicLabel ?? topicKey}
        </h1>
        {topicIntroBlock ? (
          <div className="mt-4 text-sm text-[var(--muted-foreground)] sm:text-base">
            <RichBlock block={topicIntroBlock} maxWidth="100%" />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base">
            Dive into the content below.
          </p>
        )}
      </header>

      <section className="space-y-6">
        {items.length > 0 ? (
          items.map((item, index) => {
            const key = `${topicKey}-${deriveItemId(item, index)}-${index}`;
            return (
              <ItemContent
                key={key}
                item={item}
                index={index}
                topicKey={topicKey}
                contentCache={contentCache}
                setContentCache={setContentCache}
              />
            );
          })
        ) : (
          <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
            No structured content is available for this topic yet.
          </div>
        )}
      </section>
    </>
  );
}
