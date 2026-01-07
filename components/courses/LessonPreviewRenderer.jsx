"use client";

import { useMemo } from "react";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import VideoBlock from "@/components/content/VideoBlock";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import TaskRenderer from "@/components/content/TaskRenderer";
import { V2ContentRenderer, isV2Content } from "@/components/content/v2";

const normalizeFormat = (fmt) => {
  if (!fmt) return "";
  const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
  return f;
};

export default function LessonPreviewRenderer({
  data,
  format = "reading",
  onReadingCompleted,
  onVideoViewed,
  onQuizCompleted,
  onFlashcardsCompleted,
  onInteractiveTaskCompleted,
}) {
  const normFmt = normalizeFormat(format);

  // V2 Content Support
  if (isV2Content(data)) {
    // Extract section index if present
    let sectionIndex = 0;
    if (normFmt && normFmt.startsWith('v2_section_')) {
      const parsed = parseInt(normFmt.replace('v2_section_', ''), 10);
      if (!isNaN(parsed)) sectionIndex = parsed;
    }
    return (
      <div className="space-y-6">
        <V2ContentRenderer
          content={data}
          // Mock IDs for preview
          courseId="preview-course"
          nodeId="preview-node"
          activeSectionIndex={sectionIndex}
        />
        {onReadingCompleted && (
          <div className="flex justify-end">
            <button
              onClick={onReadingCompleted}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90"
            >
              Mark lesson complete
            </button>
          </div>
        )}
      </div>
    );
  }

  // Flashcards Data Preparation
  const cardsArray = data?.cards || data?.flashcards;
  const videoList = Array.isArray(data?.videos)
    ? data.videos
    : Array.isArray(data?.video)
      ? data.video
      : [];
  const flashcardData = useMemo(() => {
    if (!Array.isArray(cardsArray)) return {};
    return cardsArray.reduce((acc, card, idx) => {
      acc[String(idx + 1)] = card;
      return acc;
    }, {});
  }, [cardsArray]);

  switch (normFmt) {
    case "video":
      return (
        <div className="space-y-4">
          {videoList.map((vid, idx) => {
            const url = vid.url || (vid.videoId ? `https://www.youtube.com/watch?v=${vid.videoId}` : "");
            const description = vid.summary || vid.description || "";
            return (
            <VideoBlock
              key={idx}
              url={url}
              title={vid.title}
              description={description}
              // Mock IDs
              courseId="preview-course"
              lessonId="preview-node"
              videoCompleted={false}
              onVideoViewed={onVideoViewed}
              isPreview={true}
            />
            );
          })}
        </div>
      );

    case "reading":
      const latexContent = data?.body || data?.reading || "";
      return (
        <div className="space-y-6">
          <ReadingRenderer
            content={latexContent}
            courseId="preview-course"
            lessonId="preview-node"
            inlineQuestionSelections={{}}
            readingCompleted={false}
            onReadingCompleted={onReadingCompleted}
            isPreview={true}
          />
          {onReadingCompleted && (
            <div className="flex justify-end">
              <button
                onClick={onReadingCompleted}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90"
              >
                Mark reading complete
              </button>
            </div>
          )}
        </div>
      );

    case "flashcards":
      return (
        <FlashcardDeck
          data={flashcardData}
          courseId="preview-course"
          lessonId="preview-node"
          onFlashcardsCompleted={onFlashcardsCompleted}
          isPreview={true}
        />
      );

    case "mini_quiz":
      return (
        <Quiz
          questions={data?.questions || data?.quiz || []}
          onQuizCompleted={onQuizCompleted}
          // Mock IDs
          userId="guest"
          courseId="preview-course"
          lessonId="preview-node"
          isPreview={true}
        />
      );

    case "interactive_task":
      return (
        <div className="space-y-6">
          <TaskRenderer taskData={data?.interactive_task || {}} isPreview={true} />
          {onInteractiveTaskCompleted && (
            <div className="flex justify-end">
              <button
                onClick={onInteractiveTaskCompleted}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90"
              >
                Mark task complete
              </button>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="p-4 text-center text-[var(--muted-foreground)]">
          Unsupported content format: {format}
        </div>
      );
  }
}
