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

    const examFormatDetails = hasExamMaterials
      ? formatExamStructure({ hasExamMaterials, examFormat, examNotes })
      : undefined;
    if (examFormatDetails) {
      payload.examFormatDetails = examFormatDetails;
    }

    if (syllabusFiles.length > 0) {
      payload.syllabusFiles = await buildFilePayload(syllabusFiles);
    }

    if (hasExamMaterials && examFiles.length > 0) {
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

      const examFormatDetails = formatExamStructure({ hasExamMaterials, examFormat, examNotes });
      if (examFormatDetails) {
        payload.examFormatDetails = examFormatDetails;
      }

      if (hasExamMaterials && examFiles.length > 0) {
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
    router,
  ]);

  if (authStatus === "checking") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--muted-foreground)]">
        <div className="create-veil" aria-hidden="true" />
        <div className="card-shell glass-panel panel-accent-sky rounded-3xl px-10 py-8 text-sm">
          Checking your session…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] py-12 text-[var(--foreground)] transition-colors">
      {courseGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/90 px-4 backdrop-blur-sm">
          <div className="card max-w-md w-full rounded-[28px] px-8 py-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-[var(--surface-muted)] border-t-[var(--primary)] animate-spin" aria-hidden="true" />
            <h2 className="mt-6 text-xl font-semibold text-[var(--foreground)]">Generating your course</h2>
            <p className="mt-3 text-sm text-[var(--muted-foreground)] animate-pulse">{courseGenerationMessage}</p>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              We&rsquo;re orchestrating modules, formats, and learning arcs tailored to your needs. Hang tight.
            </p>
          </div>
        </div>
      )}
      <div className="create-veil" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="card-shell glass-panel panel-accent-rose relative overflow-hidden rounded-[32px] px-8 py-10 sm:px-10">
              <div className="pointer-events-none absolute -top-24 left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/dashboard"
                      className="btn btn-outline btn-xs uppercase tracking-[0.24em] text-[10px]"
                    >
                      Back to dashboard
                    </Link>
                  </div>
                  <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
                    Build Study Topics
                  </h1>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base">
                    Feed us context, goals, and any supporting material. We&rsquo;ll fabricate a topic map designed for momentum and confidence.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-muted)]/80 bg-[var(--surface-2)]/80 px-6 py-5 text-xs text-[var(--muted-foreground)] shadow-sm backdrop-blur">
                  <p className="text-[var(--muted-foreground-strong)]">Workflow tips</p>
                  <ul className="mt-3 space-y-2">
                    <li>Start with the course context or upload the syllabus.</li>
                    <li>Use exam calibration to tailor difficulty.</li>
                    <li>Rate topics to guide what we reinforce first.</li>
                  </ul>
                </div>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[3fr,2fr]">
          <form onSubmit={handleGenerateTopics} className="space-y-8">
            <section className="rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-7 sm:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium">Course timeline</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Set your starting point and when you&rsquo;d like to wrap this course.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Start date</label>
                    <div className="mt-3">
                      <div className="group flex items-center gap-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 shadow-inner transition focus-within:border-primary focus-within:outline-none focus-within:ring-4 focus-within:ring-primary/20">
                        <span className="text-[var(--muted-foreground)]">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
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
                          className="w-full border-0 bg-transparent p-0 text-[var(--foreground)] outline-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Finish by</label>
                    <div className="mt-3">
                      <div className="group flex items-center gap-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 shadow-inner transition focus-within:border-primary focus-within:outline-none focus-within:ring-4 focus-within:ring-primary/20">
                        <span className="text-[var(--muted-foreground)]">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <input
                          type="date"
                          value={finishDate}
                          onChange={(event) => setFinishDate(event.target.value)}
                          min={startDate || today}
                          className="w-full border-0 bg-transparent p-0 text-[var(--foreground)] outline-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sky rounded-[28px] px-6 py-7 sm:px-8">
                <h2 className="text-lg font-medium">Course title</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Enter your university and the course name.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">College / University</label>
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder={'e.g., "University of Washington" or "MIT"'}
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Course name</label>
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder={'e.g., "Introduction to Algorithms"'}
                        value={courseTitle}
                        onChange={handleCourseInputChange}
                        className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-rose rounded-[28px] px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium">Syllabus details</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Drop in outline notes or upload supporting files.</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                      className="btn btn-outline btn-xs uppercase tracking-[0.24em] text-[10px] cursor-pointer"
                    >
                      Upload files
                    </label>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={syllabusText}
                  onChange={(event) => setSyllabusText(event.target.value)}
                  placeholder="Share objectives, weekly structure, assessments, or anything else that should inform the plan."
                  className="mt-5 w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
                {syllabusFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Uploaded files (not yet sent)</p>
                    <ul className="flex flex-wrap gap-2">
                      {syllabusFiles.map((file) => (
                        <li key={file.name} className="flex items-center gap-2 rounded-full border border-[var(--border-muted)] bg-[var(--surface-2)] px-3 py-1 text-xs">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSyllabusFile(file.name)}
                            className="btn btn-link btn-xs text-[var(--muted-foreground)] hover:text-red-400"
                            aria-label={`Remove ${file.name}`}
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px]">
              <div className="card-shell glass-panel panel-accent-sky rounded-[28px] px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium">Exam calibration</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Optional: share formats or examples so we can match difficulty.</p>
                  </div>
                  <label className="btn btn-outline btn-xs uppercase tracking-[0.24em] text-[10px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasExamMaterials}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setHasExamMaterials(checked);
                        if (!checked) {
                          setExamNotes("");
                          setExamFiles([]);
                        }
                      }}
                      className="sr-only"
                    />
                    <span>{hasExamMaterials ? "Included" : "Include exam details"}</span>
                  </label>
                </div>

                {hasExamMaterials && (
                  <div className="mt-6 space-y-5 rounded-2xl border border-dashed border-[var(--border-muted)] bg-[var(--surface-2)]/80 p-6">
                    <label className="block text-sm text-[var(--muted-foreground)]">
                      <span className="mb-2 block text-[var(--foreground)]">Preferred exam format</span>
                      <select
                        value={examFormat}
                        onChange={(event) => setExamFormat(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      >
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                        <option value="slides">Slides</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <div>
                      <label className="text-sm text-[var(--muted-foreground)]">
                        <span className="mb-2 block text-[var(--foreground)]">Upload sample exams (optional)</span>
                        <input
                          id={examInputId}
                          type="file"
                          multiple
                          accept={syllabusFileTypes}
                          onChange={handleExamFileChange}
                          className="w-full cursor-pointer rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--muted-foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                        />
                      </label>
                      {examFiles.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                          {examFiles.map((file) => (
                            <li key={file.name} className="flex items-center gap-2 rounded-full border border-[var(--border-muted)] bg-[var(--surface-muted)] px-3 py-1">
                              <span>{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExamFile(file.name)}
                                className="btn btn-link btn-xs text-[var(--muted-foreground)] hover:text-red-400"
                                aria-label={`Remove ${file.name}`}
                              >
                                &times;
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <label className="block text-sm text-[var(--muted-foreground)]">
                      <span className="mb-2 block text-[var(--foreground)]">Additional notes</span>
                      <textarea
                        rows={4}
                        value={examNotes}
                        onChange={(event) => setExamNotes(event.target.value)}
                        placeholder="Share timing, scoring, or question style preferences."
                        className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-4 py-2 text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="btn btn-outline btn-xs uppercase tracking-[0.24em] text-[10px]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isTopicsLoading}
                className="btn btn-primary btn-lg"
              >
                {isTopicsLoading ? "Generating topics…" : "Generate study topics"}
              </button>
            </div>
            {topicsError && (
              <div className="card-shell rounded-[24px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                {topicsError}
              </div>
            )}
          </form>

          <aside className="space-y-6 lg:sticky lg:top-20">
            <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-7 sm:px-8">
              <h2 className="text-lg font-medium">Topics &amp; confidence</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Rate how confident you are in each topic. Adjust, remove, or add topics as needed.
              </p>
              <div className="mt-5 grid gap-3 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                {Object.entries(ratingDescriptions).map(([rating, description]) => (
                  <div key={rating} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)] px-4 py-3">
                    <div className="mb-1 flex items-center gap-1 text-[var(--foreground)]">
                      {Array.from({ length: Number(rating) }).map((_, index) => (
                        <svg key={index} className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <p>{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-shell glass-panel panel-accent-rose rounded-[28px] px-6 py-6 sm:px-7">
              <form onSubmit={handleAddTopic} className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--foreground)]">Add a custom topic</h3>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(event) => setNewTopicTitle(event.target.value)}
                  placeholder="Topic name"
                  className="w-full rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {familiarityLevels.map((rating) => (
                      <button
                        type="button"
                        key={rating}
                        onClick={() => setNewTopicRating(rating)}
                        className={`btn btn-circle btn-sm ${rating <= newTopicRating ? "btn-primary" : "btn-muted"}`}
                        aria-pressed={rating <= newTopicRating}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                  >
                    Add topic
                  </button>
                </div>
              </form>
            </div>

            <div className="card-shell glass-panel panel-accent-sky rounded-[28px] px-6 py-6 sm:px-7">
              {isTopicsLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                    <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8" />
                    </svg>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">Crafting your study roadmap…</p>
                      <p>We&rsquo;re ranking what to learn first and how deep to go.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="space-y-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)]/80 p-4">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--surface-muted)]" />
                        <div className="flex gap-2">
                          {Array.from({ length: 3 }).map((__, starIndex) => (
                            <div key={starIndex} className="h-9 w-9 animate-pulse rounded-full border border-[var(--border-muted)] bg-[var(--surface-muted)]" />
                          ))}
                        </div>
                        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : totalSubtopics === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-muted)]/60 bg-[var(--surface-2)]/70 px-4 py-6 text-sm text-[var(--muted-foreground)]">
                  Generated topics will appear here once you run the creator.
                </div>
              ) : (
                <div className="space-y-5">
                  {overviewTopics.map((overview) => (
                    <div key={overview.id} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-2)]/70 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">{overview.title}</h3>
                          {overview.description && (
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{overview.description}</p>
                          )}
                        </div>
                        {overview.likelyOnExam && (
                          <span className="self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-wide text-emerald-300">
                            Likely on exam
                          </span>
                        )}
                      </div>
                      <div className="mt-4 space-y-4">
                        {overview.subtopics.map((subtopic) => (
                          <div key={subtopic.id} className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)]/80 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[var(--foreground)]">{subtopic.title}</p>
                                {subtopic.source === "manual" && (
                                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                                    Added by you
                                  </span>
                                )}
                                {subtopic.description && (
                                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{subtopic.description}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubtopic(overview.id, subtopic.id)}
                                className="text-xs text-[var(--muted-foreground)] transition hover:text-red-400"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              {familiarityLevels.map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  onClick={() => handleFamiliarityChange(overview.id, subtopic.id, rating)}
                                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                    rating <= subtopic.familiarity
                                      ? "border-primary bg-primary/20 text-primary"
                                      : "border-[var(--border-muted)] bg-[var(--surface-1)] text-[var(--muted-foreground)]"
                                  }`}
                                  aria-label={`Set familiarity ${rating}`}
                                >
                                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill={rating <= subtopic.familiarity ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {ratingDescriptions[subtopic.familiarity]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-6 sm:px-7">
              <h2 className="text-lg font-medium text-[var(--foreground)]">Finalize your plan</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Lock in your topic selection, then generate a complete course structure tailored to you.
              </p>

              {topicsApproved ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border-muted)] bg-green-500/10 px-4 py-3 text-xs text-[var(--success)]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Topics approved and ready for generation.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-muted)] bg-[var(--surface-2)]/70 px-4 py-3 text-xs text-[var(--muted-foreground)]">
                  Review your topics and their confidence ratings. You can still edit them after approval—just remember to approve again if you make changes.
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleApproveTopics}
                  disabled={totalSubtopics === 0 || courseGenerating || topicsApproved}
                  className={`btn btn-outline w-full justify-center ${topicsApproved ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {topicsApproved ? "Topics approved" : "Approve topics"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCourse}
                  disabled={!topicsApproved || courseGenerating}
                  className="btn btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {courseGenerating ? "Generating course…" : "Generate Course"}
                </button>
              </div>

              {courseGenerationError && (
                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {courseGenerationError}
                </div>
              )}

              <p className="mt-4 text-[11px] text-[var(--muted-foreground)]">
                We&rsquo;ll send your context, attachments, and topics to the backend to craft a full course structure. You&rsquo;ll be redirected to the dashboard once it&rsquo;s ready.
              </p>
            </div>

            {deletedSubtopics.length > 0 && (
              <div className="card-shell glass-panel panel-accent-sun rounded-[28px] px-6 py-5 text-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[var(--foreground)]">Recently removed</h3>
                  <button
                    type="button"
                    onClick={handleRestoreAll}
                    className="btn btn-link btn-xs"
                  >
                    Restore all
                  </button>
                </div>
                <ul className="mt-3 space-y-2 text-[var(--muted-foreground)]">
                  {deletedSubtopics.map((entry) => (
                    <li key={entry.subtopic.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        {entry.subtopic.title}
                        {entry.overviewTitle ? ` · ${entry.overviewTitle}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestoreTopic(topic.id)}
                        className="btn btn-link btn-xs"
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
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
