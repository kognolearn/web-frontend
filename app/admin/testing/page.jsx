"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import VideoBlock from "@/components/content/VideoBlock";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import PracticeProblems from "@/components/content/PracticeProblems";
import TaskRenderer from "@/components/content/TaskRenderer";
import DurationInput from "@/components/ui/DurationInput";

const TABS = [
  {
    id: "syllabus",
    label: "Syllabus",
    description: "Synthesize a syllabus draft with raw and parsed output.",
    endpoint: "/api/admin/generation/syllabus",
    kind: "generation",
  },
  {
    id: "topics",
    label: "Topics",
    description: "Generate a hierarchical topic map from syllabus inputs.",
    endpoint: "/api/admin/generation/topics",
    kind: "generation",
  },
  {
    id: "skeleton",
    label: "Skeleton",
    description: "Generate the lesson graph (nodes + edges).",
    endpoint: "/api/admin/generation/skeleton",
    kind: "generation",
  },
  {
    id: "readings",
    label: "Readings + Inline",
    description: "Generate readings with inline questions merged into the content.",
    endpoint: "/api/admin/generation/content/readings-with-inline-questions",
    kind: "content",
    format: "reading",
  },
  {
    id: "quizzes",
    label: "Quizzes",
    description: "Generate batched quizzes for modules or lessons.",
    endpoint: "/api/admin/generation/content/quizzes",
    kind: "content",
    format: "mini_quiz",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Generate batched flashcards for modules or lessons.",
    endpoint: "/api/admin/generation/content/flashcards",
    kind: "content",
    format: "flashcards",
  },
  {
    id: "practice",
    label: "Practice Problems",
    description: "Generate practice problems for module quiz nodes.",
    endpoint: "/api/admin/generation/content/practice-problems",
    kind: "content",
    format: "practice",
  },
  {
    id: "inlineQuestions",
    label: "Inline Questions",
    description: "Generate inline questions and merge them into readings.",
    endpoint: "/api/admin/generation/content/inline-questions",
    kind: "content",
    format: "reading",
  },
  {
    id: "videos",
    label: "Videos",
    description: "Select videos for lessons with video generation plans.",
    endpoint: "/api/admin/generation/content/videos",
    kind: "content",
    format: "video",
  },
];

const TAB_LOOKUP = Object.fromEntries(TABS.map((tab) => [tab.id, tab]));

const baseContentForm = {
  inputMode: "db",
  courseId: "",
  moduleRef: "",
  lessonIdsText: "",
  mode: "deep",
  courseTitle: "",
  moduleName: "",
  prereqMapJson: "",
  lessonsJson: "",
};

const initialForms = {
  syllabus: {
    courseName: "",
    courseTitle: "",
    university: "",
    topicsText: "",
    syllabusText: "",
    examFormatDetails: "",
    syllabusFilesJson: "",
    examFilesJson: "",
    attachmentsJson: "",
  },
  topics: {
    courseTitle: "",
    university: "",
    mode: "deep",
    finishByDate: "",
    syllabusText: "",
    examFormatDetails: "",
    syllabusFilesJson: "",
    examFilesJson: "",
  },
  skeleton: {
    grokDraftJson: "",
    userConfidenceMapJson: "",
    mode: "deep",
    ragSessionId: "",
    hours: 2,
    minutes: 0,
  },
  readings: { ...baseContentForm },
  quizzes: { ...baseContentForm },
  flashcards: { ...baseContentForm },
  practice: { ...baseContentForm },
  inlineQuestions: {
    ...baseContentForm,
    readingSource: "db",
  },
  videos: { ...baseContentForm },
};

const initialResponses = TABS.reduce((acc, tab) => {
  acc[tab.id] = {
    status: "idle",
    data: null,
    error: null,
    payload: null,
  };
  return acc;
}, {});

function normalizeList(value) {
  if (!value) return [];
  return value
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalValue(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : undefined;
}

function parseJsonField(value, label) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function normalizeQuizQuestion(question) {
  if (!question || typeof question !== "object") return null;
  const resolvedCorrectIndex = Number.isInteger(question.correct_index)
    ? question.correct_index
    : Number.isInteger(question.correctIndex)
    ? question.correctIndex
    : null;
  const resolvedAnswer =
    question.correct_answer ??
    question.correctAnswer ??
    question.answer ??
    (resolvedCorrectIndex !== null && Array.isArray(question.options)
      ? question.options[resolvedCorrectIndex]
      : "");

  return {
    ...(question.id && { id: question.id }),
    ...(question.status && { status: question.status }),
    ...(question.selectedAnswer !== undefined && question.selectedAnswer !== null
      ? { selectedAnswer: question.selectedAnswer }
      : {}),
    type: question.type || "mcq",
    question: question.question || question.prompt || "",
    options: question.options || [],
    answer: resolvedAnswer,
    correctAnswer: resolvedAnswer,
    correctIndex: resolvedCorrectIndex,
    explanation: question.explanation || "",
    ...(question.type === "frq" && {
      prompt: question.prompt || question.question || "",
      model_answer: question.model_answer || question.answer || "",
      rubric: question.rubric || "",
    }),
  };
}

function buildContentData(contentPayload = {}) {
  const data = {};

  if (typeof contentPayload.reading === "string") {
    data.body = contentPayload.reading;
  }

  const videos = Array.isArray(contentPayload.video)
    ? contentPayload.video
    : contentPayload.video
    ? [contentPayload.video]
    : [];
  if (videos.length > 0) {
    data.videos = videos.map((video) => ({
      url: video?.videoId
        ? `https://www.youtube.com/watch?v=${video.videoId}`
        : video?.url || video?.link || "",
      title: video?.title || "Lesson video",
      summary: video?.description || video?.summary || "",
      duration_min: video?.duration_min || 0,
    }));
  }

  if (Array.isArray(contentPayload.flashcards)) {
    data.cards = contentPayload.flashcards.map((card) => {
      if (Array.isArray(card)) return card;
      return [
        card?.front || card?.question || "",
        card?.back || card?.answer || "",
        card?.explanation || "",
        card?.difficulty || "medium",
      ];
    });
  }

  if (contentPayload.quiz) {
    const quizArray = Array.isArray(contentPayload.quiz)
      ? contentPayload.quiz
      : [contentPayload.quiz];
    data.questions = quizArray.map(normalizeQuizQuestion).filter(Boolean);
  }

  if (Array.isArray(contentPayload.practice_problems)) {
    data.practice_problems = contentPayload.practice_problems;
  }

  if (contentPayload.interactive_practice) {
    data.interactive_practice = contentPayload.interactive_practice;
  }

  return data;
}

function buildFlashcardData(cardsArray) {
  if (!Array.isArray(cardsArray)) return {};
  return cardsArray.reduce((acc, card, idx) => {
    acc[String(idx + 1)] = card;
    return acc;
  }, {});
}

function ContentRenderer({ format, data }) {
  if (!format) return null;

  switch (format) {
    case "video": {
      const videos = data?.videos || [];
      if (!videos.length) {
        return (
          <div className="card rounded-2xl px-6 py-4 text-sm text-[var(--muted-foreground)]">
            No videos returned.
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {videos.map((vid, idx) => (
            <VideoBlock
              key={`${vid.url}-${idx}`}
              url={vid.url}
              title={vid.title}
              description={vid.summary}
            />
          ))}
        </div>
      );
    }
    case "reading": {
      const readingContent = data?.body || data?.reading || "";
      return <ReadingRenderer content={readingContent} />;
    }
    case "flashcards": {
      const flashcardData = buildFlashcardData(data?.cards);
      return <FlashcardDeck data={flashcardData} />;
    }
    case "mini_quiz": {
      return <Quiz questions={data?.questions || data} />;
    }
    case "practice": {
      return <PracticeProblems problems={data?.practice_problems || []} />;
    }
    case "interactive_practice": {
      return (
        <TaskRenderer taskData={data?.interactive_practice || data || {}} />
      );
    }
    default:
      return (
        <pre className="overflow-auto rounded-xl bg-[var(--surface-2)] p-4 text-xs text-[var(--foreground)]">
          {JSON.stringify(data || {}, null, 2)}
        </pre>
      );
  }
}

function JsonPanel({ title, payload }) {
  const display =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <pre className="max-h-[480px] overflow-auto rounded-xl bg-[var(--surface-2)] p-4 text-xs text-[var(--foreground)]">
        {display || "No data."}
      </pre>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-[var(--muted-foreground)]">{hint}</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ResponseMeta({ data }) {
  if (!data) return null;
  const meta = [];
  if (typeof data.success === "boolean") {
    meta.push({ label: "Success", value: data.success ? "Yes" : "No" });
  }
  if (data.model) meta.push({ label: "Model", value: data.model });
  if (data.models) {
    const models = Object.values(data.models).filter(Boolean).join(", ");
    if (models) meta.push({ label: "Models", value: models });
  }
  if (data.counts) {
    meta.push({
      label: "Counts",
      value: `Nodes ${data.counts.nodes ?? 0}, Edges ${data.counts.edges ?? 0}`,
    });
  }
  if (data.saved?.rag_session_id) {
    meta.push({ label: "RAG session", value: data.saved.rag_session_id });
  }

  if (!meta.length) return null;
  return (
    <div className="card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {meta.map((item) => (
          <div key={item.label}>
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">{item.label}</p>
            <p className="text-sm text-[var(--foreground)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="card p-6 text-sm text-[var(--muted-foreground)]">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      {subtitle && <p className="mt-1">{subtitle}</p>}
    </div>
  );
}

export default function AdminTestingPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [forms, setForms] = useState(initialForms);
  const [responses, setResponses] = useState(initialResponses);

  const activeConfig = TAB_LOOKUP[activeTab];
  const activeForm = forms[activeTab] || {};
  const activeResponse = responses[activeTab] || initialResponses[activeTab];
  const resolvedContentMode =
    activeConfig?.kind === "content" ? activeForm.inputMode || "db" : "db";

  const updateForm = (tabId, field, value) => {
    setForms((prev) => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        [field]: value,
      },
    }));
  };

  const updateResponse = (tabId, patch) => {
    setResponses((prev) => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        ...patch,
      },
    }));
  };

  const buildPayload = (tabId, form) => {
    switch (tabId) {
      case "syllabus": {
        const topics = normalizeList(form.topicsText);
        const syllabusFiles = parseJsonField(form.syllabusFilesJson, "Syllabus files");
        const examFiles = parseJsonField(form.examFilesJson, "Exam files");
        const attachments = parseJsonField(form.attachmentsJson, "Attachments");
        return {
          ...(optionalValue(form.courseName) && { courseName: optionalValue(form.courseName) }),
          ...(optionalValue(form.courseTitle) && { courseTitle: optionalValue(form.courseTitle) }),
          ...(optionalValue(form.university) && { university: optionalValue(form.university) }),
          ...(topics.length ? { topics } : {}),
          ...(optionalValue(form.syllabusText) && { syllabusText: optionalValue(form.syllabusText) }),
          ...(optionalValue(form.examFormatDetails) && {
            examFormatDetails: optionalValue(form.examFormatDetails),
          }),
          ...(Array.isArray(syllabusFiles) ? { syllabusFiles } : {}),
          ...(Array.isArray(examFiles) ? { examFiles } : {}),
          ...(Array.isArray(attachments) ? { attachments } : {}),
        };
      }
      case "topics": {
        if (!optionalValue(form.courseTitle)) {
          throw new Error("courseTitle is required.");
        }
        const syllabusFiles = parseJsonField(form.syllabusFilesJson, "Syllabus files");
        const examFiles = parseJsonField(form.examFilesJson, "Exam files");
        return {
          courseTitle: optionalValue(form.courseTitle),
          ...(optionalValue(form.university) && { university: optionalValue(form.university) }),
          ...(optionalValue(form.mode) && { mode: optionalValue(form.mode) }),
          ...(optionalValue(form.finishByDate) && { finishByDate: optionalValue(form.finishByDate) }),
          ...(optionalValue(form.syllabusText) && { syllabusText: optionalValue(form.syllabusText) }),
          ...(optionalValue(form.examFormatDetails) && {
            examFormatDetails: optionalValue(form.examFormatDetails),
          }),
          ...(Array.isArray(syllabusFiles) ? { syllabusFiles } : {}),
          ...(Array.isArray(examFiles) ? { examFiles } : {}),
        };
      }
      case "skeleton": {
        const grokDraft = parseJsonField(form.grokDraftJson, "grok_draft");
        if (!grokDraft) {
          throw new Error("grok_draft is required.");
        }
        const userConfidence = parseJsonField(
          form.userConfidenceMapJson,
          "user_confidence_map"
        );
        const hours = Number(form.hours) || 0;
        const minutes = Number(form.minutes) || 0;
        const secondsToComplete = hours * 3600 + minutes * 60;
        return {
          grok_draft: grokDraft,
          ...(userConfidence ? { user_confidence_map: userConfidence } : {}),
          ...(optionalValue(form.mode) && { mode: optionalValue(form.mode) }),
          ...(optionalValue(form.ragSessionId) && { rag_session_id: optionalValue(form.ragSessionId) }),
          ...(secondsToComplete ? { seconds_to_complete: secondsToComplete } : {}),
          ...(hours || minutes ? { hours, minutes } : {}),
        };
      }
      default: {
        const inputMode = form.inputMode === "direct" ? "direct" : "db";
        if (inputMode === "direct") {
          const lessons = parseJsonField(form.lessonsJson, "lessons");
          if (!Array.isArray(lessons) || lessons.length === 0) {
            throw new Error("lessons is required for direct mode.");
          }
          const prereqMap = parseJsonField(form.prereqMapJson, "prereqMap");
          const payload = {
            ...(optionalValue(form.courseTitle) && {
              courseTitle: optionalValue(form.courseTitle),
            }),
            ...(optionalValue(form.moduleName) && {
              moduleName: optionalValue(form.moduleName),
            }),
            ...(optionalValue(form.mode) && { mode: optionalValue(form.mode) }),
            ...(prereqMap ? { prereqMap } : {}),
            lessons,
          };
          if (tabId === "inlineQuestions" && optionalValue(form.readingSource)) {
            payload.readingSource = optionalValue(form.readingSource);
          }
          return payload;
        }

        const lessonIds = normalizeList(form.lessonIdsText);
        const moduleRef = optionalValue(form.moduleRef);
        if (!optionalValue(form.courseId)) {
          throw new Error("courseId is required for DB mode.");
        }
        if (!moduleRef && lessonIds.length === 0) {
          throw new Error("Provide moduleRef or lessonIds.");
        }
        const payload = {
          courseId: optionalValue(form.courseId),
          ...(moduleRef && { moduleRef }),
          ...(lessonIds.length ? { lessonIds } : {}),
          ...(optionalValue(form.mode) && { mode: optionalValue(form.mode) }),
        };
        if (tabId === "inlineQuestions" && optionalValue(form.readingSource)) {
          payload.readingSource = optionalValue(form.readingSource);
        }
        return payload;
      }
    }
  };

  const handleSubmit = async () => {
    if (!activeConfig) return;
    updateResponse(activeTab, { status: "loading", error: null, data: null });

    let payload;
    try {
      payload = buildPayload(activeTab, activeForm);
    } catch (err) {
      updateResponse(activeTab, {
        status: "error",
        error: err?.message || "Invalid input.",
        payload: null,
      });
      return;
    }

    updateResponse(activeTab, { payload });

    try {
      const res = await authFetch(activeConfig.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      updateResponse(activeTab, { status: "success", data, error: null });
    } catch (err) {
      updateResponse(activeTab, {
        status: "error",
        error: err?.message || "Request failed.",
        data: null,
      });
    }
  };

  const handleClear = () => {
    updateResponse(activeTab, {
      status: "idle",
      data: null,
      error: null,
      payload: null,
    });
  };

  const previewPayloads = useMemo(() => {
    if (!activeResponse?.data?.saved?.payloads) return [];
    return activeResponse.data.saved.payloads;
  }, [activeResponse]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Admin Testing</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Generate admin-only previews and verify how content renders in a real course view.
          </p>
        </div>
        <Link href="/admin" className="btn btn-ghost btn-sm">
          Back to Admin
        </Link>
      </div>

      <div className="card">
        <div className="border-b border-[var(--border)]">
          <nav className="-mb-px flex flex-wrap gap-1 overflow-x-auto px-2 py-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {activeConfig?.label}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {activeConfig?.description}
              </p>
            </div>

            {activeTab === "syllabus" && (
              <div className="space-y-4">
                <Field label="Course Name (optional)">
                  <TextInput
                    value={activeForm.courseName}
                    onChange={(value) => updateForm(activeTab, "courseName", value)}
                    placeholder="Intro to Physics"
                  />
                </Field>
                <Field label="Course Title (optional)">
                  <TextInput
                    value={activeForm.courseTitle}
                    onChange={(value) => updateForm(activeTab, "courseTitle", value)}
                    placeholder="Intro to Physics"
                  />
                </Field>
                <Field label="University (optional)">
                  <TextInput
                    value={activeForm.university}
                    onChange={(value) => updateForm(activeTab, "university", value)}
                    placeholder="Stanford University"
                  />
                </Field>
                <Field
                  label="Topics (optional)"
                  hint="Comma or newline separated topics."
                >
                  <TextArea
                    value={activeForm.topicsText}
                    onChange={(value) => updateForm(activeTab, "topicsText", value)}
                    placeholder="Kinematics, Newton's Laws, Work and Energy"
                    rows={3}
                  />
                </Field>
                <Field label="Syllabus Text (optional)">
                  <TextArea
                    value={activeForm.syllabusText}
                    onChange={(value) => updateForm(activeTab, "syllabusText", value)}
                    placeholder="Paste syllabus text here"
                    rows={4}
                  />
                </Field>
                <Field label="Exam Format Details (optional)">
                  <TextArea
                    value={activeForm.examFormatDetails}
                    onChange={(value) =>
                      updateForm(activeTab, "examFormatDetails", value)
                    }
                    placeholder="Describe exam format or paste notes"
                    rows={3}
                  />
                </Field>
                <Field
                  label="Syllabus Files (optional)"
                  hint='JSON array of { "name": "...", "type": "...", "url": "..." }.'
                >
                  <TextArea
                    value={activeForm.syllabusFilesJson}
                    onChange={(value) =>
                      updateForm(activeTab, "syllabusFilesJson", value)
                    }
                    placeholder='[{"name":"syllabus.pdf","type":"application/pdf","url":"https://..."}]'
                    rows={3}
                  />
                </Field>
                <Field
                  label="Exam Files (optional)"
                  hint='JSON array of { "name": "...", "type": "...", "url": "..." }.'
                >
                  <TextArea
                    value={activeForm.examFilesJson}
                    onChange={(value) =>
                      updateForm(activeTab, "examFilesJson", value)
                    }
                    placeholder='[{"name":"exam.pdf","type":"application/pdf","url":"https://..."}]'
                    rows={3}
                  />
                </Field>
                <Field
                  label="Attachments (optional)"
                  hint='JSON array of { "name": "...", "mimeType": "...", "url": "..." }.'
                >
                  <TextArea
                    value={activeForm.attachmentsJson}
                    onChange={(value) =>
                      updateForm(activeTab, "attachmentsJson", value)
                    }
                    placeholder='[{"name":"notes.docx","mimeType":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","url":"https://..."}]'
                    rows={3}
                  />
                </Field>
              </div>
            )}

            {activeTab === "topics" && (
              <div className="space-y-4">
                <Field label="Course Title (required)">
                  <TextInput
                    value={activeForm.courseTitle}
                    onChange={(value) => updateForm(activeTab, "courseTitle", value)}
                    placeholder="Intro to Physics"
                  />
                </Field>
                <Field label="University (optional)">
                  <TextInput
                    value={activeForm.university}
                    onChange={(value) => updateForm(activeTab, "university", value)}
                    placeholder="Stanford University"
                  />
                </Field>
                <Field label="Mode (optional)">
                  <SelectInput
                    value={activeForm.mode}
                    onChange={(value) => updateForm(activeTab, "mode", value)}
                    options={[
                      { label: "Deep", value: "deep" },
                      { label: "Cram", value: "cram" },
                    ]}
                  />
                </Field>
                <Field
                  label="Finish By Date (optional)"
                  hint="ISO 8601 datetime string."
                >
                  <TextInput
                    value={activeForm.finishByDate}
                    onChange={(value) => updateForm(activeTab, "finishByDate", value)}
                    placeholder="2025-01-15T08:00:00.000Z"
                  />
                </Field>
                <Field label="Syllabus Text (optional)">
                  <TextArea
                    value={activeForm.syllabusText}
                    onChange={(value) => updateForm(activeTab, "syllabusText", value)}
                    placeholder="Paste syllabus text here"
                    rows={4}
                  />
                </Field>
                <Field label="Exam Format Details (optional)">
                  <TextArea
                    value={activeForm.examFormatDetails}
                    onChange={(value) =>
                      updateForm(activeTab, "examFormatDetails", value)
                    }
                    placeholder="Describe exam format or paste notes"
                    rows={3}
                  />
                </Field>
                <Field
                  label="Syllabus Files (optional)"
                  hint='JSON array of { "name": "...", "type": "...", "url": "..." }.'
                >
                  <TextArea
                    value={activeForm.syllabusFilesJson}
                    onChange={(value) =>
                      updateForm(activeTab, "syllabusFilesJson", value)
                    }
                    placeholder='[{"name":"syllabus.pdf","type":"application/pdf","url":"https://..."}]'
                    rows={3}
                  />
                </Field>
                <Field
                  label="Exam Files (optional)"
                  hint='JSON array of { "name": "...", "type": "...", "url": "..." }.'
                >
                  <TextArea
                    value={activeForm.examFilesJson}
                    onChange={(value) =>
                      updateForm(activeTab, "examFilesJson", value)
                    }
                    placeholder='[{"name":"exam.pdf","type":"application/pdf","url":"https://..."}]'
                    rows={3}
                  />
                </Field>
              </div>
            )}

            {activeTab === "skeleton" && (
              <div className="space-y-4">
                <Field
                  label="grok_draft (required)"
                  hint="Paste the grok draft JSON from topics generation."
                >
                  <TextArea
                    value={activeForm.grokDraftJson}
                    onChange={(value) => updateForm(activeTab, "grokDraftJson", value)}
                    placeholder='{"topics":[{"id":"topic_1","title":"Kinematics"}]}'
                    rows={5}
                  />
                </Field>
                <Field
                  label="user_confidence_map (optional)"
                  hint="JSON object keyed by topic id to confidence values."
                >
                  <TextArea
                    value={activeForm.userConfidenceMapJson}
                    onChange={(value) =>
                      updateForm(activeTab, "userConfidenceMapJson", value)
                    }
                    placeholder='{"topic_1":0.2,"topic_2":0.8}'
                    rows={4}
                  />
                </Field>
                <Field label="Mode (optional)">
                  <SelectInput
                    value={activeForm.mode}
                    onChange={(value) => updateForm(activeTab, "mode", value)}
                    options={[
                      { label: "Deep", value: "deep" },
                      { label: "Cram", value: "cram" },
                    ]}
                  />
                </Field>
                <Field label="RAG Session ID (optional)">
                  <TextInput
                    value={activeForm.ragSessionId}
                    onChange={(value) => updateForm(activeTab, "ragSessionId", value)}
                    placeholder="UUID from topics generation"
                  />
                </Field>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Target duration
                  </p>
                  <div className="mt-2">
                    <DurationInput
                      hours={activeForm.hours}
                      minutes={activeForm.minutes}
                      onChange={({ hours, minutes }) => {
                        updateForm(activeTab, "hours", hours);
                        updateForm(activeTab, "minutes", minutes);
                      }}
                      variant="minimal"
                      hideSummary
                    />
                  </div>
                </div>
              </div>
            )}

            {activeConfig?.kind === "content" && (
              <div className="space-y-4">
                <Field label="Input Mode">
                  <SelectInput
                    value={resolvedContentMode}
                    onChange={(value) => updateForm(activeTab, "inputMode", value)}
                    options={[
                      { label: "DB-backed (course/module)", value: "db" },
                      { label: "Direct lessons JSON", value: "direct" },
                    ]}
                  />
                </Field>

                {resolvedContentMode === "db" ? (
                  <>
                    <Field label="Course ID (required)">
                      <TextInput
                        value={activeForm.courseId}
                        onChange={(value) => updateForm(activeTab, "courseId", value)}
                        placeholder="Course UUID"
                      />
                    </Field>
                    <Field label="Module Ref (optional)">
                      <TextInput
                        value={activeForm.moduleRef}
                        onChange={(value) => updateForm(activeTab, "moduleRef", value)}
                        placeholder="module_1"
                      />
                    </Field>
                    <Field
                      label="Lesson IDs (optional)"
                      hint="Comma or newline separated UUIDs. Provide moduleRef or lessonIds."
                    >
                      <TextArea
                        value={activeForm.lessonIdsText}
                        onChange={(value) => updateForm(activeTab, "lessonIdsText", value)}
                        placeholder="lesson-id-1, lesson-id-2"
                        rows={3}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Course Title (optional)">
                      <TextInput
                        value={activeForm.courseTitle}
                        onChange={(value) => updateForm(activeTab, "courseTitle", value)}
                        placeholder="Intro to Physics"
                      />
                    </Field>
                    <Field label="Module Name (optional)">
                      <TextInput
                        value={activeForm.moduleName}
                        onChange={(value) => updateForm(activeTab, "moduleName", value)}
                        placeholder="Module 1: Kinematics"
                      />
                    </Field>
                    <Field
                      label="Prereq Map (optional)"
                      hint='JSON map of lessonId to prerequisite titles.'
                    >
                      <TextArea
                        value={activeForm.prereqMapJson}
                        onChange={(value) => updateForm(activeTab, "prereqMapJson", value)}
                        placeholder='{"lesson-1":["Vectors"],"lesson-2":["Kinematics"]}'
                        rows={3}
                      />
                    </Field>
                    <Field
                      label="Lessons (required)"
                      hint="JSON array of lessons with content_payload.generation_plans."
                    >
                      <TextArea
                        value={activeForm.lessonsJson}
                        onChange={(value) => updateForm(activeTab, "lessonsJson", value)}
                        placeholder='[{"id":"lesson-1","title":"Kinematics","content_payload":{"generation_plans":{"reading":"Focus on motion equations."}}}]'
                        rows={5}
                      />
                    </Field>
                  </>
                )}

                <Field label="Mode (optional)">
                  <SelectInput
                    value={activeForm.mode}
                    onChange={(value) => updateForm(activeTab, "mode", value)}
                    options={[
                      { label: "Deep", value: "deep" },
                      { label: "Cram", value: "cram" },
                    ]}
                  />
                </Field>
                {activeTab === "inlineQuestions" && (
                  <Field label="Reading Source (optional)">
                    <SelectInput
                      value={activeForm.readingSource}
                      onChange={(value) =>
                        updateForm(activeTab, "readingSource", value)
                      }
                      options={[
                        { label: "DB", value: "db" },
                        { label: "Generate", value: "generate" },
                      ]}
                    />
                  </Field>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={activeResponse.status === "loading"}
                className="btn btn-primary btn-block"
              >
                {activeResponse.status === "loading" ? "Generating..." : "Run Generation"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-ghost btn-block"
              >
                Clear Output
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {activeResponse.error && (
            <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-sm text-[#EF4444]">
              {activeResponse.error}
            </div>
          )}

          {activeResponse.status === "idle" && (
            <EmptyState
              title="Run a generation to preview output."
              subtitle="The response will show raw, parsed, and saved payloads."
            />
          )}

          {activeResponse.status === "loading" && (
            <div className="card p-6">
              <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
                Generating output...
              </div>
            </div>
          )}

          {activeResponse.data && (
            <>
              <ResponseMeta data={activeResponse.data} />

              {activeResponse.payload && (
                <JsonPanel title="Request Payload" payload={activeResponse.payload} />
              )}

              {activeConfig?.kind === "content" && (
                <>
                  {previewPayloads.length ? (
                    <div className="space-y-4">
                      {previewPayloads.map((payload, idx) => {
                        const previewData = buildContentData(payload?.content_payload || {});
                        return (
                          <div key={payload.nodeId || idx} className="card p-6 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                                  Preview {idx + 1}
                                </h3>
                                {payload?.nodeId && (
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    Node ID: {payload.nodeId}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mx-auto w-full max-w-5xl">
                              <ContentRenderer format={activeConfig.format} data={previewData} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="No preview payloads returned."
                      subtitle="The response did not include saved.payloads."
                    />
                  )}
                </>
              )}

              {"raw" in activeResponse.data && (
                <JsonPanel title="Raw Output" payload={activeResponse.data.raw} />
              )}
              {"parsed" in activeResponse.data && (
                <JsonPanel title="Parsed Output" payload={activeResponse.data.parsed} />
              )}
              {"saved" in activeResponse.data && (
                <JsonPanel title="Saved Payloads" payload={activeResponse.data.saved} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
