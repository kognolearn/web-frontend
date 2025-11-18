"use client";

import { Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const searchDebounceMs = 350;
const syllabusFileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
const ratingDescriptions = {
  1: "Needs focused attention",
  2: "Developing understanding",
  3: "Confident mastery",
};
const defaultTopicRating = 2;
const ratingToFamiliarity = {
  1: "needs review",
  2: "developing",
  3: "confident",
};
const familiarityLevels = [1, 2, 3];
const manualOverviewId = "overview_manual";
const manualOverviewTitle = "Custom topics";
const nestedPayloadKeys = ["data", "result", "payload", "response", "content"];

/**
 * @typedef {Object} Subtopic
 * @property {string} id
 * @property {string} overviewId
 * @property {string} title
 * @property {string} description
 * @property {string} difficulty
 * @property {boolean} likelyOnExam
 * @property {number} familiarity
 * @property {string} source
 */

/**
 * @typedef {Object} OverviewTopic
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {boolean} likelyOnExam
 * @property {Subtopic[]} subtopics
 */

function resolveCourseId(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.courseId,
    payload.course_id,
    payload.id,
    payload?.course?.id,
    payload?.course?.courseId,
    payload?.data?.courseId,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function toIsoDate(dateString) {
  if (!dateString) return null;
  return `${dateString}T00:00:00.000Z`;
}

function formatExamStructure({ hasExamMaterials, examFormat, examNotes }) {
  if (!hasExamMaterials) return undefined;
  const segments = [];
  if (examFormat) segments.push(`Preferred exam format: ${examFormat.toUpperCase()}`);
  if (examNotes?.trim()) segments.push(examNotes.trim());
  if (segments.length === 0) return undefined;
  return segments.join("\n\n");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function buildFilePayload(files) {
  if (!files?.length) return [];
  const items = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      base64: await fileToBase64(file),
      type: file.type || "application/octet-stream",
    }))
  );
  return items.map((item, index) => {
    const sourceFile = files[index];
    if (typeof sourceFile?.size === "number") {
      return { ...item, size: sourceFile.size };
    }
    return item;
  });
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createSubtopic({
  title,
  overviewId,
  description = "",
  difficulty = "intermediate",
  likelyOnExam = true,
  familiarity = defaultTopicRating,
  source = "generated",
  id,
}) {
  return {
    id:
      id ||
      globalThis.crypto?.randomUUID?.() ||
      `${source}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    overviewId,
    title: String(title || "Untitled topic"),
    description: description ? String(description) : "",
    difficulty: typeof difficulty === "string" ? difficulty : "intermediate",
    likelyOnExam: Boolean(likelyOnExam ?? true),
    familiarity: familiarity && Number.isFinite(familiarity) ? familiarity : defaultTopicRating,
    source,
  };
}

function collectPayloadCandidates(payload) {
  const queue = [];
  const results = [];
  const seen = new WeakSet();
  if (payload && typeof payload === "object") {
    queue.push(payload);
  }
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    results.push(current);
    for (const key of nestedPayloadKeys) {
      const child = current[key];
      if (child && typeof child === "object") {
        queue.push(child);
      }
    }
  }
  return results;
}

function buildOverviewFromTopics(topics, groupId = "overview_1", groupTitle = "All topics") {
  return [
    {
      id: groupId,
      title: groupTitle,
      description: "",
      likelyOnExam: true,
      subtopics: topics.map((topic, idx) => ({
        id: topic?.id || `topic_${idx + 1}`,
        overviewId: groupId,
        title:
          typeof topic === "string"
            ? topic
            : String(topic?.title || topic?.name || `Topic ${idx + 1}`),
        description: typeof topic === "string" ? "" : topic?.description || "",
        difficulty:
          typeof topic === "string"
            ? "intermediate"
            : topic?.difficulty || "intermediate",
        likelyOnExam: topic?.likelyOnExam ?? true,
      })),
    },
  ];
}

function CreateCoursePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toDateInputValue(d);
  }, []);
  const [startDate, setStartDate] = useState(today);
  const [finishDate, setFinishDate] = useState(nextWeek);
  const syllabusInputId = useId();
  const examInputId = useId();

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Course title and optional university
  const [courseTitle, setCourseTitle] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [courseId, setCourseId] = useState(null);

  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusFiles, setSyllabusFiles] = useState([]);

  const [hasExamMaterials, setHasExamMaterials] = useState(false);
  const [examFormat, setExamFormat] = useState("pdf");
  const [examNotes, setExamNotes] = useState("");
  const [examFiles, setExamFiles] = useState([]);
  const [confirmedNoExamDetails, setConfirmedNoExamDetails] = useState(false);
  const [showConfirmNoExamModal, setShowConfirmNoExamModal] = useState(false);
  
  useEffect(() => {
    // If the user adds any exam details, clear the 'no exam details' confirmation
    if (hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim())) {
      setConfirmedNoExamDetails(false);
    }
  }, [hasExamMaterials, examFiles, examNotes]);

  const [authStatus, setAuthStatus] = useState("checking");
  const [userId, setUserId] = useState(null);

  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState(null);
  const [overviewTopics, setOverviewTopics] = useState([]);
  const [deletedSubtopics, setDeletedSubtopics] = useState([]);
  const [topicsApproved, setTopicsApproved] = useState(false);

  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicRating, setNewTopicRating] = useState(defaultTopicRating);

  const [courseGenerating, setCourseGenerating] = useState(false);
  const [courseGenerationError, setCourseGenerationError] = useState("");
  const [courseGenerationMessage, setCourseGenerationMessage] = useState("Preparing your personalized course plan…");

  const totalSubtopics = useMemo(
    () => overviewTopics.reduce((sum, overview) => sum + overview.subtopics.length, 0),
    [overviewTopics]
  );

  const canProceedFromStep1 = courseTitle.trim() && collegeName.trim() && startDate && finishDate;
  const examDetailsProvided = hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim());
  const canProceedFromStep2 = examDetailsProvided || confirmedNoExamDetails;
  const canProceedFromStep3 = totalSubtopics > 0;

  // no dropdown refs needed for simplified inputs

  useEffect(() => {
    if (!searchParams || prefillApplied) return;
    const titleParam = searchParams.get("title");
    const collegeParam = searchParams.get("college");
    const courseIdParam = searchParams.get("courseId");
    if (!titleParam && !collegeParam && !courseIdParam) return;
    setCourseTitle((prev) => (prev ? prev : titleParam || prev));
    setCollegeName((prev) => (prev ? prev : collegeParam || prev));
    if (courseIdParam) {
      setCourseId(courseIdParam);
    }
    setPrefillApplied(true);
  }, [prefillApplied, searchParams]);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) {
          router.replace("/auth/signin?redirectTo=/courses/create");
          return;
        }
        setUserId(user.id);
        setAuthStatus("ready");
      } catch (error) {
        if (!active) return;
        setTopicsError("Unable to confirm your session. Please try again.");
        setAuthStatus("ready");
      }
    };
    loadUser();
    return () => {
      active = false;
    };
  }, [router]);

  const handleCourseInputChange = useCallback((event) => {
    setCourseTitle(event.target.value);
  }, []);

  // no click-away handling required for simplified inputs

  // removed catalog / subject / course search effects — we only capture the typed university and course name

  // selection handlers removed — user types university and course name directly

  const handleSyllabusFileChange = useCallback((event) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setSyllabusFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }, []);

  const handleRemoveSyllabusFile = useCallback((name) => {
    setSyllabusFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleExamFileChange = useCallback((event) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setExamFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }, []);

  const handleRemoveExamFile = useCallback((name) => {
    setExamFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleGenerateTopics = useCallback(async (event) => {
    event.preventDefault();
    if (!userId) {
      setTopicsError("You need to be signed in to generate topics.");
      return;
    }

    const trimmedTitle = courseTitle.trim();
    if (!trimmedTitle) {
      setTopicsError("Provide a course title before generating topics.");
      return;
    }

    setTopicsError(null);
    // Disallow generating topics unless the user provided exam details or explicitly confirmed they have none
    if (!examDetailsProvided && !confirmedNoExamDetails) {
      setTopicsError("Provide exam details (notes/files) or confirm that you don't have any before generating topics.");
      return;
    }
    setIsTopicsLoading(true);
    setTopicsApproved(false);
    setCourseGenerationError("");
    setOverviewTopics([]);
    setDeletedSubtopics([]);

    const finishByIso = toIsoDate(finishDate);
    const payload = {
      userId,
      courseTitle: trimmedTitle,
      university: collegeName.trim() || undefined,
      finishByDate: finishByIso || undefined,
      syllabusText: syllabusText.trim() || undefined,
    };

    const examFormatDetails = formatExamStructure({ hasExamMaterials: examDetailsProvided, examFormat, examNotes });
    if (examFormatDetails) {
      payload.examFormatDetails = examFormatDetails;
    }

    if (syllabusFiles.length > 0) {
      payload.syllabusFiles = await buildFilePayload(syllabusFiles);
    }

    if (examFiles.length > 0) {
      payload.examFiles = await buildFilePayload(examFiles);
    }

    try {
      const res = await fetch("/api/courses/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to generate topics.");
      }

      console.log("Backend response:", JSON.stringify(data, null, 2));

      const payloadCandidates = collectPayloadCandidates(data);
      let rawOverview = [];
      for (const candidate of payloadCandidates) {
        const overviewArray = candidate?.overviewTopics || candidate?.overview_topics;
        if (Array.isArray(overviewArray) && overviewArray.length) {
          rawOverview = overviewArray;
          console.log("Found overviewTopics with", overviewArray.length, "items");
          break;
        }
      }

      if (!rawOverview.length) {
        for (const candidate of payloadCandidates) {
          if (Array.isArray(candidate?.topicTree) && candidate.topicTree.length) {
            rawOverview = candidate.topicTree;
            break;
          }
          if (Array.isArray(candidate?.topicGroups) && candidate.topicGroups.length) {
            rawOverview = candidate.topicGroups;
            break;
          }
        }
      }

      if (!rawOverview.length) {
        for (const candidate of payloadCandidates) {
          const topicList = Array.isArray(candidate?.topics)
            ? candidate.topics
            : Array.isArray(candidate?.topicList)
            ? candidate.topicList
            : null;
          if (topicList?.length) {
            rawOverview = buildOverviewFromTopics(topicList);
            break;
          }
        }
      }

      if (!rawOverview.length) {
        console.log("rawOverview is still empty, throwing error");
        throw new Error("The model did not return any topics. Please try again.");
      }

      console.log("rawOverview has", rawOverview.length, "overview topics");

      const hydrated = rawOverview.map((overview, index) => {
        const overviewId = String(overview?.id ?? `overview_${index + 1}`);
        const subtopics = Array.isArray(overview?.subtopics)
          ? overview.subtopics
          : Array.isArray(overview?.subTopics)
          ? overview.subTopics
          : [];
        return {
          id: overviewId,
          title: String(overview?.title ?? `Topic group ${index + 1}`),
          description: overview?.description ? String(overview.description) : "",
          likelyOnExam: Boolean(overview?.likelyOnExam ?? true),
          subtopics: subtopics.map((subtopic, subIndex) =>
            createSubtopic({
              id: subtopic?.id ?? `subtopic_${index + 1}_${subIndex + 1}`,
              overviewId: subtopic?.overviewId ? String(subtopic.overviewId) : overviewId,
              title: subtopic?.title ?? `Subtopic ${subIndex + 1}`,
              description: subtopic?.description || "",
              difficulty: subtopic?.difficulty || "intermediate",
              likelyOnExam: subtopic?.likelyOnExam ?? true,
              familiarity: Number.isFinite(subtopic?.familiarity)
                ? subtopic.familiarity
                : defaultTopicRating,
            })
          ),
        };
      });

      const totalSubtopics = hydrated.reduce((sum, ot) => sum + ot.subtopics.length, 0);
      console.log("Total subtopics after hydration:", totalSubtopics);
      if (totalSubtopics === 0) {
        throw new Error("The model did not return any topics. Please try again.");
      }

      setOverviewTopics(hydrated);
      setTopicsApproved(false);
      setTopicsError(null);
    } catch (error) {
      console.error(error);
      setOverviewTopics([]);
      setDeletedSubtopics([]);
      setTopicsApproved(false);
      setTopicsError(error?.message || "The model did not return any topics. Please try again.");
    } finally {
      setIsTopicsLoading(false);
    }
  }, [
    collegeName,
    courseTitle,
    examFiles,
    examFormat,
    examNotes,
    finishDate,
    hasExamMaterials,
    syllabusFiles,
    syllabusText,
    userId,
    confirmedNoExamDetails,
  ]);

  const handleFamiliarityChange = useCallback((overviewId, subtopicId, rating) => {
    setTopicsApproved(false);
    setOverviewTopics((prev) =>
      prev.map((overview) => {
        if (overview.id !== overviewId) return overview;
        return {
          ...overview,
          subtopics: overview.subtopics.map((subtopic) =>
            subtopic.id === subtopicId ? { ...subtopic, familiarity: rating } : subtopic
          ),
        };
      })
    );
  }, []);

  const handleDeleteSubtopic = useCallback((overviewId, subtopicId) => {
    let removedSubtopic = null;
    let overviewTitle = "";
    setTopicsApproved(false);
    setOverviewTopics((prev) =>
      prev
        .map((overview) => {
          if (overview.id !== overviewId) return overview;
          const existing = overview.subtopics.find((subtopic) => subtopic.id === subtopicId);
          if (!existing) return overview;
          removedSubtopic = existing;
          overviewTitle = overview.title;
          return {
            ...overview,
            subtopics: overview.subtopics.filter((subtopic) => subtopic.id !== subtopicId),
          };
        })
        .filter((overview) => overview.subtopics.length > 0)
    );

    if (removedSubtopic) {
      setDeletedSubtopics((prev) => [
        { overviewId, overviewTitle, subtopic: removedSubtopic },
        ...prev.filter((entry) => entry.subtopic.id !== removedSubtopic.id),
      ]);
    }
  }, []);

  const handleRestoreSubtopic = useCallback((subtopicId) => {
    let entryToRestore = null;
    setDeletedSubtopics((prev) => {
      const match = prev.find((entry) => entry.subtopic.id === subtopicId);
      if (!match) {
        return prev;
      }
      entryToRestore = match;
      return prev.filter((entry) => entry.subtopic.id !== subtopicId);
    });

    if (entryToRestore) {
      setTopicsApproved(false);
      setOverviewTopics((prev) => {
        const index = prev.findIndex((overview) => overview.id === entryToRestore.overviewId);
        if (index === -1) {
          return [
            ...prev,
            {
              id: entryToRestore.overviewId,
              title: entryToRestore.overviewTitle || "Restored topics",
              description: "",
              likelyOnExam: true,
              subtopics: [entryToRestore.subtopic],
            },
          ];
        }
        const next = [...prev];
        next[index] = {
          ...next[index],
          subtopics: [entryToRestore.subtopic, ...next[index].subtopics],
        };
        return next;
      });
    }
  }, []);

  const handleRestoreAll = useCallback(() => {
    if (deletedSubtopics.length === 0) return;
    setTopicsApproved(false);
    setOverviewTopics((prev) => {
      const next = [...prev];
      deletedSubtopics.forEach((entry) => {
        const index = next.findIndex((overview) => overview.id === entry.overviewId);
        if (index === -1) {
          next.push({
            id: entry.overviewId,
            title: entry.overviewTitle || "Restored topics",
            description: "",
            likelyOnExam: true,
            subtopics: [entry.subtopic],
          });
        } else {
          next[index] = {
            ...next[index],
            subtopics: [entry.subtopic, ...next[index].subtopics],
          };
        }
      });
      return next;
    });
    setDeletedSubtopics([]);
  }, [deletedSubtopics]);

  const handleAddTopic = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = newTopicTitle.trim();
      if (!trimmed) return;
      setTopicsApproved(false);
      const manualSubtopic = createSubtopic({
        title: trimmed,
        overviewId: manualOverviewId,
        familiarity: newTopicRating,
        source: "manual",
      });
      setOverviewTopics((prev) => {
        const index = prev.findIndex((overview) => overview.id === manualOverviewId);
        if (index === -1) {
          return [
            ...prev,
            {
              id: manualOverviewId,
              title: manualOverviewTitle,
              description: "",
              likelyOnExam: true,
              subtopics: [manualSubtopic],
            },
          ];
        }
        const next = [...prev];
        next[index] = {
          ...next[index],
          subtopics: [manualSubtopic, ...next[index].subtopics],
        };
        return next;
      });
      setNewTopicTitle("");
      setNewTopicRating(defaultTopicRating);
    },
    [newTopicRating, newTopicTitle]
  );

  const handleApproveTopics = useCallback(() => {
    if (totalSubtopics === 0) {
      setCourseGenerationError("Generate or add at least one topic before approving.");
      return;
    }
    setCourseGenerationError("");
    setTopicsApproved(true);
  }, [totalSubtopics]);

  const handleGenerateCourse = useCallback(async () => {
    const allSubtopics = overviewTopics.flatMap((overview) => overview.subtopics);
    if (allSubtopics.length === 0) {
      setCourseGenerationError("Generate or add at least one topic before generating the course.");
      return;
    }

    if (!topicsApproved) {
      setCourseGenerationError("Please approve your topic list before generating the course.");
      return;
    }

    if (!userId) {
      setCourseGenerationError("You need to be signed in to generate your course.");
      return;
    }

    const className = courseTitle.trim();

    if (!className) {
      setCourseGenerationError("Provide a course title before generating the course.");
      return;
    }

    if (!startDate || !finishDate) {
      setCourseGenerationError("Select both a start date and an end date for your course.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(finishDate);
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start > end) {
      setCourseGenerationError("The start date must be before the end date.");
      return;
    }

    const cleanTopics = allSubtopics
      .map((subtopic) => (typeof subtopic.title === "string" ? subtopic.title.trim() : ""))
      .filter(Boolean);

    if (cleanTopics.length === 0) {
      setCourseGenerationError("Your topic list is empty. Please add topics before generating the course.");
      return;
    }

    const cleanTopicSet = new Set(cleanTopics);

    const topicFamiliarityMap = allSubtopics.reduce((acc, subtopic) => {
      const title = typeof subtopic.title === "string" ? subtopic.title.trim() : "";
      if (!title || !cleanTopicSet.has(title)) {
        return acc;
      }
      const familiarity =
        ratingToFamiliarity[subtopic.familiarity] || ratingToFamiliarity[defaultTopicRating];
      acc[title] = familiarity;
      return acc;
    }, {});

    setCourseGenerating(true);
    setCourseGenerationError("");
    setCourseGenerationMessage("Locking in your topic roadmap…");

    try {
      const finishByIso = toIsoDate(finishDate);
      const payload = {
        userId,
        // backend creates the course; don't send courseId
        className,
        courseTitle: className,
        university: collegeName.trim() || undefined,
        finishByDate: finishByIso || undefined,
        topics: cleanTopics,
        topicFamiliarity: topicFamiliarityMap,
        syllabusText: syllabusText.trim() || undefined,
      };

      if (Object.keys(topicFamiliarityMap).length === 0) {
        delete payload.topicFamiliarity;
      }

      if (syllabusFiles.length > 0) {
        setCourseGenerationMessage("Encoding syllabus materials…");
        const syllabusPayload = await buildFilePayload(syllabusFiles);
        if (syllabusPayload.length > 0) {
          payload.syllabusFiles = syllabusPayload;
        }
      }

      const examFormatDetails = formatExamStructure({ hasExamMaterials: examDetailsProvided, examFormat, examNotes });
      if (examFormatDetails) {
        payload.examFormatDetails = examFormatDetails;
      }

      if (examFiles.length > 0) {
        setCourseGenerationMessage("Packaging exam references…");
        const examPayload = await buildFilePayload(examFiles);
        if (examPayload.length > 0) {
          payload.examFiles = examPayload;
        }
      }

      setCourseGenerationMessage("Coordinating your learning journey…");
      // Server will enforce a 10 minute timeout for long-running course generation
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to generate course. Please try again.");
      }

      const resolvedCourseId = resolveCourseId(body) || courseId;
      setCourseGenerationMessage("Finalizing and saving to your dashboard…");

      try {
        window.dispatchEvent(new Event("courses:updated"));
      } catch {}

      if (resolvedCourseId) {
        router.push(`/courses/${encodeURIComponent(resolvedCourseId)}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        setCourseGenerationError("Course generation timed out after 10 minutes. Please try again.");
      } else {
        setCourseGenerationError(error.message || "Unexpected error generating course.");
      }
    } finally {
      setCourseGenerating(false);
    }
  }, [
    overviewTopics,
    topicsApproved,
    userId,
    courseId,
    courseTitle,
    collegeName,
    startDate,
    finishDate,
    syllabusText,
    syllabusFiles,
    hasExamMaterials,
    examFormat,
    examNotes,
    examFiles,
    examDetailsProvided,
    router,
  ]);

  if (authStatus === "checking") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--muted-foreground)]">
        <div className="card rounded-3xl px-10 py-8 text-sm">
          Checking your session…
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Course Details", description: "Basic information" },
    { number: 2, title: "Course Materials", description: "Syllabus & resources" },
    { number: 3, title: "Generate Topics", description: "AI-powered topics" },
    { number: 4, title: "Review & Create", description: "Finalize your course" },
  ];

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] py-8 text-[var(--foreground)] transition-colors">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
      </div>

      {courseGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/95 px-4 backdrop-blur-sm">
          <div className="card max-w-md w-full rounded-[28px] px-8 py-10 text-center shadow-2xl">
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-[var(--surface-muted)] border-t-[var(--primary)] animate-spin" aria-hidden="true" />
            <h2 className="mt-6 text-xl font-bold text-[var(--foreground)]">Generating your course</h2>
            <p className="mt-3 text-sm text-[var(--muted-foreground)] animate-pulse">{courseGenerationMessage}</p>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              Creating a personalized learning plan tailored to your goals.
            </p>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold sm:text-4xl mb-2">Create New Course</h1>
          <p className="text-[var(--muted-foreground)]">Follow the steps below to build your personalized learning plan</p>
        </div>

        {/* Progress Bar */}
        <div className="card rounded-[24px] p-6 sm:p-8 mb-8 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm font-bold text-[var(--primary)]">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-3 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  currentStep === step.number
                    ? "bg-[var(--primary)]/10 border-2 border-[var(--primary)]"
                    : currentStep > step.number
                    ? "bg-[var(--surface-2)] border-2 border-[var(--primary)]/30"
                    : "bg-[var(--surface-2)] border-2 border-transparent"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 font-bold text-sm transition-all ${
                    currentStep > step.number
                      ? "bg-[var(--primary)] text-white"
                      : currentStep === step.number
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {currentStep > step.number ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div className="hidden sm:block flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${currentStep >= step.number ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card rounded-[24px] p-6 sm:p-8 shadow-lg">
          {/* Step 1: Course Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Course Details</h2>
                <p className="text-[var(--muted-foreground)]">Let's start with the basics about your course</p>
              </div>

              <div className="space-y-5">
                {/* Course Title & University */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">University / Institution *</label>
                    <input
                      type="text"
                      placeholder='e.g., "MIT" or "University of Washington"'
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Name *</label>
                    <input
                      type="text"
                      placeholder='e.g., "Introduction to Machine Learning"'
                      value={courseTitle}
                      onChange={handleCourseInputChange}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStartDate(value);
                        if (value && finishDate && new Date(value) > new Date(finishDate)) {
                          setFinishDate(value);
                        }
                      }}
                      min={today}
                      max={finishDate || undefined}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date *</label>
                    <input
                      type="date"
                      value={finishDate}
                      onChange={(event) => setFinishDate(event.target.value)}
                      min={startDate || today}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                </div>
              </div>

              {(!collegeName.trim() || !courseTitle.trim()) && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Both university and course name are required to continue</span>
                  </div>
                </div>
              )}

              {/* (moved) Confirmation modal for 'no exam details' is shown near Step 2 */}

              {/* Confirmation modal for 'no exam details' */}
              {showConfirmNoExamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/70 px-4">
                  <div className="card max-w-lg w-full rounded-xl p-6 text-sm bg-[var(--surface-2)] border border-[var(--border)] shadow-2xl">
                    <h3 className="text-lg font-semibold mb-2">Are you sure?</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-6">Not including exam details will lead to courses with less fit. Only check this if you yourself do not have any indication at all of what will be on the test and we'll try our best to figure it out.</p>
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={() => { setConfirmedNoExamDetails(false); setShowConfirmNoExamModal(false); }} className="btn btn-outline">Cancel</button>
                      <button type="button" onClick={() => { setConfirmedNoExamDetails(true); setShowConfirmNoExamModal(false); }} className="btn btn-primary">Confirm - proceed without exam details</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                <Link href="/dashboard" className="btn btn-outline">Cancel</Link>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedFromStep1}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Course Materials
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Course Materials */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Course Materials</h2>
                <p className="text-[var(--muted-foreground)]">Upload your syllabus and exam materials for better course generation</p>
                <div className="mt-3 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium mb-1">Highly recommended</p>
                      <p className="text-xs">Adding your syllabus and exam materials helps create more accurate, relevant study content tailored to your course</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Syllabus Section */}
                <div className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold mb-1">Syllabus Details</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">Share objectives, weekly structure, or upload files</p>
                    </div>
                    <div>
                      <input
                        id={syllabusInputId}
                        type="file"
                        multiple
                        accept={syllabusFileTypes}
                        onChange={handleSyllabusFileChange}
                        className="sr-only"
                      />
                      <label
                        htmlFor={syllabusInputId}
                        className="btn btn-outline btn-sm cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload files
                      </label>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={syllabusText}
                    onChange={(event) => setSyllabusText(event.target.value)}
                    placeholder="Paste syllabus content, course objectives, or any additional context..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                  />
                  {syllabusFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Uploaded files</p>
                      <div className="flex flex-wrap gap-2">
                        {syllabusFiles.map((file) => (
                          <div key={file.name} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm">
                            <svg className="h-4 w-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSyllabusFile(file.name)}
                              className="text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Exam Materials Section */}
                <div className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 p-6">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">Exam Calibration</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium">Recommended</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">Help us match difficulty and question styles by sharing exam formats</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Exam Format</label>
                        <select
                          value={examFormat}
                          onChange={(event) => setExamFormat(event.target.value)}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                        >
                          <option value="pdf">PDF</option>
                          <option value="docx">DOCX</option>
                          <option value="slides">Slides</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Upload Sample Exams</label>
                        <input
                          id={examInputId}
                          type="file"
                          multiple
                          accept={syllabusFileTypes}
                          onChange={handleExamFileChange}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--muted-foreground)] cursor-pointer transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                        />
                        {examFiles.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {examFiles.map((file) => (
                              <div key={file.name} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs">
                                <span className="truncate max-w-[120px]">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExamFile(file.name)}
                                  className="text-[var(--muted-foreground)] hover:text-red-400"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Additional Notes</label>
                        <textarea
                          rows={3}
                          value={examNotes}
                          onChange={(event) => setExamNotes(event.target.value)}
                          placeholder="Share timing, scoring, or question style preferences..."
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20"
                        />
                      </div>
                      {/* Confirm no exam details checkbox */}
                      {/* no-op: duplicate; checkbox shown in Step 2 */}
                    </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn btn-outline"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => canProceedFromStep2 && setCurrentStep(3)}
                  disabled={!canProceedFromStep2}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Generate Topics
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                {!canProceedFromStep2 && (
                  <div className="text-xs text-amber-400 mt-2">Provide exam notes or sample exams, or check “I don't have any exam details” to proceed.</div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Generate Topics */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Generate Study Topics</h2>
                <p className="text-[var(--muted-foreground)]">Let AI create a personalized topic list for your course</p>
              </div>

              {!isTopicsLoading && totalSubtopics === 0 && (
                <div className="text-center py-12 px-6 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]/50">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <svg className="h-8 w-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Ready to Generate Topics</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                    Click the button below to let our AI analyze your course details and generate a comprehensive topic list
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTopics}
                    disabled={!canProceedFromStep1 || isTopicsLoading}
                    className="btn btn-primary btn-lg"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Topics
                  </button>
                </div>
              )}

              {isTopicsLoading && (
                <div className="text-center py-12 px-6">
                  <div className="mx-auto h-12 w-12 rounded-full border-4 border-[var(--surface-muted)] border-t-[var(--primary)] animate-spin mb-4"></div>
                  <h3 className="text-lg font-semibold mb-2">Crafting your study roadmap...</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Analyzing your course materials and generating topics</p>
                </div>
              )}

              {topicsError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                  {topicsError}
                </div>
              )}

              {totalSubtopics > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      <span className="text-2xl font-bold text-[var(--primary)]">{totalSubtopics}</span> topics generated
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateTopics}
                      className="btn btn-outline btn-sm"
                      disabled={isTopicsLoading}
                    >
                      Regenerate
                    </button>
                  </div>

                  {/* Topics List */}
                  <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                    {overviewTopics.map((overview) => (
                      <div key={overview.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-5">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-bold">{overview.title}</h3>
                          {overview.likelyOnExam && (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase font-semibold tracking-wide text-emerald-300">
                              Likely on exam
                            </span>
                          )}
                        </div>
                        <div className="space-y-3">
                          {overview.subtopics.map((subtopic) => (
                            <div key={subtopic.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <p className="text-sm font-semibold flex-1">{subtopic.title}</p>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubtopic(overview.id, subtopic.id)}
                                  className="text-xs text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                              {subtopic.description && (
                                <p className="text-xs text-[var(--muted-foreground)] mb-3">{subtopic.description}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--muted-foreground)]">Confidence:</span>
                                {familiarityLevels.map((rating) => (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => handleFamiliarityChange(overview.id, subtopic.id, rating)}
                                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                      rating <= subtopic.familiarity
                                        ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted-foreground)]"
                                    }`}
                                  >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill={rating <= subtopic.familiarity ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                  </button>
                                ))}
                                <span className="text-xs text-[var(--muted-foreground)] ml-2">
                                  {ratingDescriptions[subtopic.familiarity]}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Topic */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
                    <h4 className="text-sm font-semibold mb-3">Add Custom Topic</h4>
                    <form onSubmit={handleAddTopic} className="flex gap-3">
                      <input
                        type="text"
                        value={newTopicTitle}
                        onChange={(event) => setNewTopicTitle(event.target.value)}
                        placeholder="Topic name..."
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                      <div className="flex items-center gap-1">
                        {familiarityLevels.map((rating) => (
                          <button
                            type="button"
                            key={rating}
                            onClick={() => setNewTopicRating(rating)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                              rating <= newTopicRating ? "border-[var(--primary)] bg-[var(--primary)]/20" : "border-[var(--border)]"
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm">Add</button>
                    </form>
                  </div>

                  {/* Deleted Topics */}
                  {deletedSubtopics.length > 0 && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Recently Removed ({deletedSubtopics.length})</h4>
                        <button type="button" onClick={handleRestoreAll} className="btn btn-link btn-xs">
                          Restore All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {deletedSubtopics.map((entry) => (
                          <div key={entry.subtopic.id} className="flex items-center justify-between text-sm">
                            <span className="truncate text-[var(--muted-foreground)]">{entry.subtopic.title}</span>
                            <button
                              type="button"
                              onClick={() => handleRestoreSubtopic(entry.subtopic.id)}
                              className="btn btn-link btn-xs"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-outline"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedFromStep3}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Review & Create
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Review & Create</h2>
                <p className="text-[var(--muted-foreground)]">Review your course details and create your personalized learning plan</p>
              </div>

              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Course Info</h4>
                  <div className="space-y-2 text-sm">
                      <div>
                      <span className="text-[var(--muted-foreground)]">Name:</span> <span className="font-medium">{courseTitle || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">University:</span> <span className="font-medium">{collegeName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">Duration:</span> <span className="font-medium">{startDate} to {finishDate}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Materials</h4>
                  <div className="space-y-2 text-sm">
                      <div>
                      <span className="text-[var(--muted-foreground)]">Syllabus files:</span> <span className="font-medium">{syllabusFiles.length}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">Exam files:</span> <span className="font-medium">{examFiles.length}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">Study topics:</span> <span className="font-medium text-[var(--primary)]">{totalSubtopics}</span>
                    </div>
                      {/* summary-only checkbox removed; checkbox is available on Step 2 */}
                  </div>
                </div>
              </div>

              {/* Approve Topics */}
              {!topicsApproved && totalSubtopics > 0 && (
                <div className="rounded-xl border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20">
                    <svg className="h-6 w-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Approve Your Topics</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    Review the generated topics and approve them to proceed with course creation
                  </p>
                  <button
                    type="button"
                    onClick={handleApproveTopics}
                    className="btn btn-primary"
                  >
                    Approve {totalSubtopics} Topics
                  </button>
                </div>
              )}

              {topicsApproved && (
                <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-5 py-4 flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-300">Topics approved and ready for course generation</span>
                </div>
              )}

              {courseGenerationError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                  {courseGenerationError}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn btn-outline"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCourse}
                  disabled={!topicsApproved || courseGenerating}
                  className="btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {courseGenerating ? "Creating..." : "Create Course"}
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateCoursePage() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">
          <span className="text-sm">Loading course creator…</span>
        </div>
      )}
    >
      <CreateCoursePageContent />
    </Suspense>
  );
}
