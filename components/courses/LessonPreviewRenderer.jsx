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
      <V2ContentRenderer
        content={data}
        // Mock IDs for preview
        courseId="preview-course"
        nodeId="preview-node"
        activeSectionIndex={sectionIndex}
        isPreview={true}
        onSectionComplete={(idx) => {
            // Simple completion mapping for preview
            if (idx === (data.sections?.length - 1)) {
                onReadingCompleted && onReadingCompleted();
            }
        }}
      />
    );
  }

  // Flashcards Data Preparation
  const cardsArray = data?.cards || data?.flashcards;
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
          {data?.videos?.map((vid, idx) => (
            <VideoBlock
              key={idx}
              url={vid.url}
              title={vid.title}
              description={vid.summary}
              // Mock IDs
              courseId="preview-course"
              lessonId="preview-node"
              videoCompleted={false}
              onVideoViewed={onVideoViewed}
              isPreview={true}
            />
          ))}
        </div>
      );

    case "reading":
      const latexContent = data?.body || data?.reading || "";
      return (
        <ReadingRenderer
          content={latexContent}
          courseId="preview-course"
          lessonId="preview-node"
          inlineQuestionSelections={{}}
          readingCompleted={false}
          onReadingCompleted={onReadingCompleted}
          isPreview={true}
        />
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
      return <TaskRenderer taskData={data?.interactive_task || {}} isPreview={true} />;

    default:
      return (
        <div className="p-4 text-center text-[var(--muted-foreground)]">
          Unsupported content format: {format}
        </div>
      );
  }
}
