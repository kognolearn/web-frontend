"use client";

import { Suspense, useCallback, useEffect, useId, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme/ThemeToggle";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import DurationInput from "@/components/ui/DurationInput";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";
import { upsertCourseCreateJob } from "@/utils/courseJobs";
import { getAsyncDisabledMessage } from "@/utils/asyncJobs";

import {
  defaultTopicRating,
  familiarityLevels,
  manualOverviewId,
  manualOverviewTitle,
  NEW_EXCEPTION_SCORE,
  CONFIDENT_EXCEPTION_SCORE,
  SOMEWHAT_KNOW_SCORE,
  SOMEWHAT_GAP_SCORE,
  moduleConfidenceOptions,
  moduleConfidencePresets,
  scoreToFamiliarityBand
} from "./utils";
import TopicExplorer from "@/components/courses/TopicExplorer";
import { motion } from "framer-motion";

const searchDebounceMs = 350;
const syllabusFileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic";
const nestedPayloadKeys = ["data", "result", "payload", "response", "content"];
const acceptedAttachmentExtensions = new Set(
  syllabusFileTypes
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean)
);

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

function resolveJobId(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.jobId,
    payload.job_id,
    payload.job?.id,
    payload.job?.job_id,
    payload.data?.jobId,
    payload.data?.job_id,
    payload.result?.jobId,
    payload.result?.job_id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function resolveJobStatusUrl(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.statusUrl,
    payload.status_url,
    payload.job?.statusUrl,
    payload.job?.status_url,
    payload.data?.statusUrl,
    payload.data?.status_url,
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

function formatExamStructure({ hasExamMaterials, examNotes }) {
  // Build a content-focused summary to describe what is likely to be on the exam.
  // If the user has uploaded practice tests, include a small marker so downstream systems know files were attached.
  if (!hasExamMaterials && !(examNotes && examNotes.trim())) return undefined;
  const segments = [];
  if (examNotes?.trim()) segments.push(`Topics likely on the exam:\n\n${examNotes.trim()}`);
  if (hasExamMaterials) segments.push("User uploaded practice exams or past tests.");
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

async function buildFilePayload(files, { contentKey = "base64", includeSize = true } = {}) {
  if (!files?.length) return [];
  return Promise.all(
    files.map(async (file) => {
      const encoded = await fileToBase64(file);
      const payload = {
        name: file.name,
        type: file.type || "application/octet-stream",
        [contentKey]: encoded,
      };
      if (includeSize && typeof file.size === "number") {
        payload.size = file.size;
      }
      return payload;
    })
  );
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
  bloomLevel,
  examRelevanceReasoning,
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
    bloomLevel,
    examRelevanceReasoning,
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

function buildOverviewFromModules(modules) {
  if (!Array.isArray(modules)) return [];
  return modules.map((module, index) => {
    const overviewId = String(
      module?.id ?? module?.module_id ?? `overview_${index + 1}`
    );
    const lessons = Array.isArray(module?.lessons)
      ? module.lessons
      : Array.isArray(module?.topics)
      ? module.topics
      : [];
    return {
      id: overviewId,
      title: String(module?.title ?? module?.name ?? `Module ${index + 1}`),
      description: module?.description ? String(module.description) : "",
      likelyOnExam: Boolean(module?.likelyOnExam ?? module?.likely_on_exam ?? true),
      subtopics: lessons.map((lesson, subIndex) => ({
        id: lesson?.id ?? `subtopic_${index + 1}_${subIndex + 1}`,
        overviewId,
        title: lesson?.title ?? lesson?.name ?? `Topic ${subIndex + 1}`,
        description: lesson?.description || "",
        difficulty: lesson?.difficulty || "intermediate",
        likelyOnExam: lesson?.likelyOnExam ?? lesson?.likely_on_exam ?? true,
        familiarity: Number.isFinite(lesson?.familiarity)
          ? lesson.familiarity
          : defaultTopicRating,
        source: lesson?.source || "generated",
        bloomLevel: lesson?.bloom_level || lesson?.bloomLevel || undefined,
        examRelevanceReasoning:
          lesson?.exam_relevance_reasoning || lesson?.examRelevanceReasoning || "",
      })),
    };
  });
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

function buildGrokDraftPayload(overviewTopics) {
  const flatTopics = overviewTopics.flatMap((overview) => {
    const overviewId = String(overview?.id ?? "");
    const overviewTitle = String(overview?.title ?? "");
    const subtopics = Array.isArray(overview?.subtopics) ? overview.subtopics : [];
    return subtopics
      .map((subtopic) => {
        const id = typeof subtopic?.id === "string" ? subtopic.id.trim() : "";
        if (!id) return null;
        return {
          id,
          title: typeof subtopic?.title === "string" ? subtopic.title : "Untitled topic",
          overviewId,
          overviewTitle,
          source: subtopic?.source || "generated",
          bloomLevel: subtopic?.bloomLevel,
          examRelevanceReasoning: subtopic?.examRelevanceReasoning,
        };
      })
      .filter(Boolean);
  });

  return { topics: flatTopics };
}

function normalizeGrokDraftPayload(rawDraft) {
  if (!rawDraft || typeof rawDraft !== "object") return null;
  const topics = Array.isArray(rawDraft.topics) ? rawDraft.topics : [];
  const normalized = topics
    .map((topic, index) => {
      const id = typeof topic?.id === "string" ? topic.id.trim() : "";
      if (!id) return null;
      return {
        id,
        title: typeof topic?.title === "string" ? topic.title : `Topic ${index + 1}`,
        overviewId: typeof topic?.overviewId === "string" ? topic.overviewId : undefined,
        overviewTitle: typeof topic?.overviewTitle === "string" ? topic.overviewTitle : undefined,
        source: typeof topic?.source === "string" ? topic.source : "generated",
        bloomLevel: topic?.bloom_level || topic?.bloomLevel,
        examRelevanceReasoning:
          topic?.exam_relevance_reasoning || topic?.examRelevanceReasoning || "",
      };
    })
    .filter(Boolean);
  if (!normalized.length) return null;
  return { topics: normalized };
}

function resolveRagSessionId(payloadCandidates) {
  for (const candidate of payloadCandidates) {
    const ragId = candidate?.rag_session_id || candidate?.ragSessionId;
    if (typeof ragId === "string" && ragId.trim()) {
      return ragId.trim();
    }
  }
  return null;
}

function parseTopicPayload(payload) {
  const payloadCandidates = collectPayloadCandidates(payload);
  let extractedGrokDraft = null;
  for (const candidate of payloadCandidates) {
    const normalizedDraft = normalizeGrokDraftPayload(
      candidate?.grok_draft || candidate?.grokDraft || candidate?.grokDraftPayload
    );
    if (normalizedDraft) {
      extractedGrokDraft = normalizedDraft;
      break;
    }
  }

  let rawOverview = [];
  for (const candidate of payloadCandidates) {
    const overviewArray = candidate?.overviewTopics || candidate?.overview_topics;
    if (Array.isArray(overviewArray) && overviewArray.length) {
      rawOverview = overviewArray;
      break;
    }
  }

  if (!rawOverview.length) {
    for (const candidate of payloadCandidates) {
      const modules =
        candidate?.modules ||
        candidate?.moduleList ||
        candidate?.module_list;
      if (Array.isArray(modules) && modules.length) {
        rawOverview = buildOverviewFromModules(modules);
        break;
      }
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
    throw new Error("The model did not return any topics. Please try again.");
  }

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
      likelyOnExam: Boolean(overview?.likelyOnExam ?? overview?.likely_on_exam ?? true),
      subtopics: subtopics.map((subtopic, subIndex) =>
        createSubtopic({
          id: subtopic?.id ?? `subtopic_${index + 1}_${subIndex + 1}`,
          overviewId: subtopic?.overviewId ? String(subtopic.overviewId) : overviewId,
          title: subtopic?.title ?? `Subtopic ${subIndex + 1}`,
          description: subtopic?.description || "",
          difficulty: subtopic?.difficulty || "intermediate",
          likelyOnExam: subtopic?.likelyOnExam ?? subtopic?.likely_on_exam ?? true,
          familiarity: Number.isFinite(subtopic?.familiarity)
            ? subtopic.familiarity
            : defaultTopicRating,
          bloomLevel: subtopic?.bloom_level || subtopic?.bloomLevel || undefined,
          examRelevanceReasoning:
            subtopic?.exam_relevance_reasoning || subtopic?.examRelevanceReasoning || "",
        })
      ),
    };
  });

  const totalSubtopics = hydrated.reduce((sum, ot) => sum + ot.subtopics.length, 0);
  if (totalSubtopics === 0) {
    throw new Error("The model did not return any topics. Please try again.");
  }

  return {
    hydrated,
    extractedGrokDraft,
    ragSessionId: resolveRagSessionId(payloadCandidates),
  };
}

function buildCurrentModulesPayload(overviewTopics) {
  if (!Array.isArray(overviewTopics)) return [];
  return overviewTopics.map((overview, index) => ({
    id: overview?.id ?? `module_${index + 1}`,
    title: overview?.title ?? `Module ${index + 1}`,
    lessons: (overview?.subtopics || []).map((subtopic, subIndex) => ({
      id: subtopic?.id ?? `lesson_${index + 1}_${subIndex + 1}`,
      title: subtopic?.title ?? `Topic ${subIndex + 1}`,
    })),
  }));
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
  const [studyHours, setStudyHours] = useState(5);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [studyTimeError, setStudyTimeError] = useState(false);
  const syllabusInputId = useId();
  const examInputId = useId();
  const [isSyllabusDragActive, setIsSyllabusDragActive] = useState(false);
  const [isExamDragActive, setIsExamDragActive] = useState(false);

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Course title and optional university
  const [courseTitle, setCourseTitle] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [courseId, setCourseId] = useState(null);

  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusFiles, setSyllabusFiles] = useState([]);

  const [hasExamMaterials, setHasExamMaterials] = useState(false);
  const [examNotes, setExamNotes] = useState("");
  const [examFiles, setExamFiles] = useState([]);
  const [confirmedNoExamDetails, setConfirmedNoExamDetails] = useState(false);
  const [showConfirmNoExamModal, setShowConfirmNoExamModal] = useState(false);
  
  // Study mode: "deep" (thorough understanding) or "cram" (high-yield exam focus)
  const [studyMode, setStudyMode] = useState("deep");
  // For cram mode, let users pick between auto-generating topics or supplying their own list
  const [cramTopicStrategy, setCramTopicStrategy] = useState("generate"); // "generate" | "manual"
  const [manualTopicsInput, setManualTopicsInput] = useState("");
  const isCramMode = studyMode === "cram";
  const isCramManual = isCramMode && cramTopicStrategy === "manual";

  useEffect(() => {
    if (studyMode === "deep") {
      setStudyHours(999);
      setStudyMinutes(0);
      setStudyTimeError(false);
    } else if (studyMode === "cram") {
      setStudyHours(5);
      setStudyMinutes(0);
      setStudyTimeError(false);
    }
  }, [studyMode]);
  
  useEffect(() => {
    // If the user adds any exam details, clear the 'no exam details' confirmation
    if (hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim())) {
      setConfirmedNoExamDetails(false);
    }
  }, [hasExamMaterials, examFiles, examNotes]);

  useEffect(() => {
    if (!isCramMode && cramTopicStrategy !== "generate") {
      setCramTopicStrategy("generate");
      setManualTopicsInput("");
    }
  }, [isCramMode, cramTopicStrategy]);

  const [authStatus, setAuthStatus] = useState("checking");
  const [userId, setUserId] = useState(null);

  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState(null);
  const [overviewTopics, setOverviewTopics] = useState([]);
  const [moduleConfidenceState, setModuleConfidenceState] = useState({});
  const [openAccordions, setOpenAccordions] = useState({});
  const [generatedGrokDraft, setGeneratedGrokDraft] = useState(null);
  const [deletedSubtopics, setDeletedSubtopics] = useState([]);
  // Approval step removed; rely on topic count checks instead

  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicRating, setNewTopicRating] = useState(defaultTopicRating);
  
  // RAG session ID returned from /courses/topics for context continuity
  const [ragSessionId, setRagSessionId] = useState(null);

  const [topicModifyPrompt, setTopicModifyPrompt] = useState("");
  const [isModifyingTopics, setIsModifyingTopics] = useState(false);
  const [topicModifyError, setTopicModifyError] = useState("");

  const [courseGenerating, setCourseGenerating] = useState(false);
  const [courseGenerationError, setCourseGenerationError] = useState("");
  const [courseGenerationMessage, setCourseGenerationMessage] = useState("Preparing your personalized course plan…");

  const totalSubtopics = useMemo(
    () => overviewTopics.reduce((sum, overview) => sum + overview.subtopics.length, 0),
    [overviewTopics]
  );

  const hasStudyTime = studyHours > 0 || studyMinutes > 0;
  const canProceedFromStep1 = courseTitle.trim() && collegeName.trim();
  const examDetailsProvided = hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim());
  const canProceedFromStep2 = true; // Always allow proceeding from step 2
  const canProceedFromStep3 = totalSubtopics > 0;
  const canModifyTopics = Boolean(
    userId &&
      topicModifyPrompt.trim() &&
      overviewTopics.length > 0 &&
      !isModifyingTopics &&
      !isTopicsLoading
  );

  useEffect(() => {
    if (!overviewTopics.length) {
      setModuleConfidenceState((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    setModuleConfidenceState((prev) => {
      let changed = false;
      const next = {};
      overviewTopics.forEach((overview) => {
        const existing = prev[overview.id];
        const validSubtopicIds = new Set(overview.subtopics.map((subtopic) => subtopic.id));
        const overrides = existing?.overrides
          ? Object.entries(existing.overrides).reduce((acc, [subtopicId, value]) => {
              if (validSubtopicIds.has(subtopicId)) {
                acc[subtopicId] = value;
              } else {
                changed = true;
              }
              return acc;
            }, {})
          : {};
        const mode = existing?.mode || "somewhat";
        next[overview.id] = { mode, overrides };
        if (!existing || existing.mode !== mode || Object.keys(overrides).length !== Object.keys(existing?.overrides || {}).length) {
          changed = true;
        }
      });
      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [overviewTopics]);

  useEffect(() => {
    if (!overviewTopics.length) {
      setOpenAccordions((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    setOpenAccordions((prev) => {
      let changed = false;
      const next = { ...prev };
      const validIds = new Set(overviewTopics.map((overview) => overview.id));
      for (const key of Object.keys(next)) {
        if (!validIds.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      overviewTopics.forEach((overview) => {
        if (next[overview.id] === undefined) {
          const mode = moduleConfidenceState[overview.id]?.mode || "somewhat";
          next[overview.id] = mode === "somewhat";
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [overviewTopics, moduleConfidenceState]);

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
          router.replace("/auth/sign-in?redirectTo=/courses/create");
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

  const filterAcceptedFiles = useCallback((files) => {
    return files.filter((file) => {
      const name = typeof file?.name === "string" ? file.name : "";
      if (!name.includes(".")) return true;
      const extension = `.${name.split(".").pop().toLowerCase()}`;
      return acceptedAttachmentExtensions.has(extension);
    });
  }, []);

  const handleSyllabusFileChange = useCallback(
    (event) => {
      if (!event.target.files) return;
      const files = filterAcceptedFiles(Array.from(event.target.files));
      if (files.length) {
        setSyllabusFiles((prev) => [...prev, ...files]);
      }
      event.target.value = "";
    },
    [filterAcceptedFiles]
  );

  const handleRemoveSyllabusFile = useCallback((name) => {
    setSyllabusFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleSyllabusDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSyllabusDragActive(true);
  }, []);

  const handleSyllabusDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      if (!isSyllabusDragActive) {
        setIsSyllabusDragActive(true);
      }
    },
    [isSyllabusDragActive]
  );

  const handleSyllabusDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget;
    if (
      typeof Node !== "undefined" &&
      related instanceof Node &&
      event.currentTarget.contains(related)
    ) {
      return;
    }
    setIsSyllabusDragActive(false);
  }, []);

  const handleSyllabusDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsSyllabusDragActive(false);
      const droppedFiles = filterAcceptedFiles(Array.from(event.dataTransfer?.files || []));
      if (!droppedFiles.length) return;
      setSyllabusFiles((prev) => [...prev, ...droppedFiles]);
    },
    [filterAcceptedFiles]
  );

  const handleExamFileChange = useCallback(
    (event) => {
      if (!event.target.files) return;
      const files = filterAcceptedFiles(Array.from(event.target.files));
      if (files.length) {
        setExamFiles((prev) => [...prev, ...files]);
      }
      event.target.value = "";
    },
    [filterAcceptedFiles]
  );

  const handleRemoveExamFile = useCallback((name) => {
    setExamFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleExamDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExamDragActive(true);
  }, []);

  const handleExamDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      if (!isExamDragActive) {
        setIsExamDragActive(true);
      }
    },
    [isExamDragActive]
  );

  const handleExamDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget;
    if (
      typeof Node !== "undefined" &&
      related instanceof Node &&
      event.currentTarget.contains(related)
    ) {
      return;
    }
    setIsExamDragActive(false);
  }, []);

  const handleExamDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsExamDragActive(false);
      const droppedFiles = filterAcceptedFiles(Array.from(event.dataTransfer?.files || []));
      if (!droppedFiles.length) return;
      setExamFiles((prev) => [...prev, ...droppedFiles]);
    },
    [filterAcceptedFiles]
  );

  const clearTopicsState = useCallback(() => {
    setOverviewTopics([]);
    setDeletedSubtopics([]);
    setGeneratedGrokDraft(null);
    setRagSessionId(null);
    setModuleConfidenceState({});
    setOpenAccordions({});
    setTopicsError(null);
    setTopicModifyPrompt("");
    setTopicModifyError("");
    setIsModifyingTopics(false);
  }, []);

  const handleCramTopicStrategyChange = useCallback(
    (strategy) => {
      if (strategy === cramTopicStrategy) return;
      const currentTopicsAsText = overviewTopics
        .flatMap((overview) =>
          overview.subtopics.map((subtopic) =>
            typeof subtopic.title === "string" ? subtopic.title.trim() : ""
          )
        )
        .filter(Boolean)
        .join("\n");

      setCramTopicStrategy(strategy);
      setIsTopicsLoading(false);
      setCourseGenerationError("");
      setManualTopicsInput(strategy === "manual" ? currentTopicsAsText : "");
      clearTopicsState();
    },
    [clearTopicsState, cramTopicStrategy, overviewTopics]
  );

  const handleApplyManualTopics = useCallback(() => {
    const topics = manualTopicsInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (topics.length === 0) {
      setTopicsError("Add at least one topic to continue.");
      return;
    }

    const manualSubtopics = topics.map((title) =>
      createSubtopic({
        title,
        overviewId: manualOverviewId,
        familiarity: defaultTopicRating,
        source: "manual",
        bloomLevel: "Understand",
        examRelevanceReasoning: "",
      })
    );

    const manualOverview = [
      {
        id: manualOverviewId,
        title: manualOverviewTitle,
        description: "",
        likelyOnExam: true,
        subtopics: manualSubtopics,
      },
    ];

    setOverviewTopics(manualOverview);
    setGeneratedGrokDraft(buildGrokDraftPayload(manualOverview));
    setDeletedSubtopics([]);
    setModuleConfidenceState({});
    setOpenAccordions({});
    setTopicsError(null);
    setCourseGenerationError("");
    setIsTopicsLoading(false);
    setRagSessionId(null);
  }, [manualTopicsInput]);

  const handleModifyTopics = useCallback(async () => {
    const prompt = topicModifyPrompt.trim();
    if (!prompt) {
      setTopicModifyError("Enter a prompt to refine your topics.");
      return;
    }
    if (!userId) {
      setTopicModifyError("You need to be signed in to update topics.");
      return;
    }
    if (!overviewTopics.length) {
      setTopicModifyError("Generate topics before requesting updates.");
      return;
    }

    setTopicModifyError("");
    setIsModifyingTopics(true);
    setCourseGenerationError("");

    try {
      // Use the new endpoint that doesn't require courseId (for pre-course topic modification)
      // userId is derived from JWT token in the backend
      const response = await authFetch(`/api/courses/modify-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentModules: buildCurrentModulesPayload(overviewTopics),
        }),
      });

      const { result } = await resolveAsyncJobResponse(response, {
        errorLabel: "modify topics",
      });

      if (!result) {
        throw new Error("Topic update completed but no result was returned.");
      }

      const parsed = parseTopicPayload(result);
      setGeneratedGrokDraft(parsed.extractedGrokDraft || buildGrokDraftPayload(parsed.hydrated));
      setOverviewTopics(parsed.hydrated);
      setDeletedSubtopics([]);
      if (parsed.ragSessionId) {
        setRagSessionId(parsed.ragSessionId);
      }
      setTopicModifyPrompt("");
    } catch (error) {
      console.error("Modify topics failed:", error);
      setTopicModifyError(error.message || "Unable to update topics.");
    } finally {
      setIsModifyingTopics(false);
    }
  }, [overviewTopics, topicModifyPrompt, userId]);

  const handleGenerateTopics = useCallback(async (event) => {
    event.preventDefault();
    if (!userId) {
      setTopicsError("You need to be signed in to build topics.");
      return;
    }

    const trimmedTitle = courseTitle.trim();
    if (!trimmedTitle) {
      setTopicsError("Provide a course title before building topics.");
      return;
    }

    setTopicsError(null);
    setIsTopicsLoading(true);
    setCourseGenerationError("");
    clearTopicsState();

    const finishByIso = new Date(Date.now() + (studyHours * 60 * 60 * 1000) + (studyMinutes * 60 * 1000)).toISOString();
    const trimmedUniversity = collegeName.trim();
    const payload = {
      userId,
      courseTitle: trimmedTitle,
      university: trimmedUniversity || null,
      finishByDate: finishByIso || null,
      syllabusText: syllabusText.trim() || "Not provided.",
      mode: studyMode,
    };

    const examFormatDetails = formatExamStructure({ hasExamMaterials: examDetailsProvided, examNotes });
    if (examFormatDetails) {
      payload.examFormatDetails = examFormatDetails;
    }

    if (syllabusFiles.length > 0) {
      payload.syllabusFiles = await buildFilePayload(syllabusFiles);
    }

    if (examFiles.length > 0) {
      payload.examFiles = await buildFilePayload(examFiles);
    }

    const MAX_RETRIES = 3;
    let lastError = null;
    
    // Store a deep copy of the payload to ensure it's not mutated between retries
    const payloadStr = JSON.stringify(payload);
    console.log("Full payload being sent (will be reused for all retries):", payloadStr.slice(0, 500));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Topic generation attempt ${attempt} of ${MAX_RETRIES}`);
        console.log(`Attempt ${attempt} - courseTitle: "${payload.courseTitle}", university: "${payload.university}"`);
        console.log(`Attempt ${attempt} - payload body length: ${payloadStr.length} chars`);

        const res = await authFetch(`/api/courses/topics`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store",
          },
          body: payloadStr,
        });

        const { result } = await resolveAsyncJobResponse(res, { errorLabel: "build topics" });
        console.log(`Attempt ${attempt} - response status: ${res.status}`);
        console.log("Backend response:", JSON.stringify(result, null, 2));

        if (!result) {
          throw new Error("Topic generation completed but no result was returned.");
        }

        const parsed = parseTopicPayload(result);
        const maybeCourseId = resolveCourseId(result);
        if (maybeCourseId && !courseId) {
          setCourseId(maybeCourseId);
        }

        if (parsed.ragSessionId) {
          console.log("Stored rag_session_id:", parsed.ragSessionId);
          setRagSessionId(parsed.ragSessionId);
        }

        // Success - update state and exit the retry loop
        setGeneratedGrokDraft(parsed.extractedGrokDraft || buildGrokDraftPayload(parsed.hydrated));
        setOverviewTopics(parsed.hydrated);
        setTopicsError(null);
        setIsTopicsLoading(false);
        return; // Exit the function on success
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;

        // If this wasn't the last attempt, continue to retry
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying... (${attempt + 1}/${MAX_RETRIES})`);
          continue;
        }
      }
    }

    // All retries exhausted - show error to user
    console.error("All retry attempts exhausted");
    setOverviewTopics([]);
    setDeletedSubtopics([]);
    setTopicsError(lastError?.message || "The model did not return any topics. Please try again.");
    setIsTopicsLoading(false);
  }, [
    collegeName,
    courseId,
    courseTitle,
    examFiles,
    examNotes,
    hasExamMaterials,
    syllabusFiles,
    syllabusText,
    userId,
    confirmedNoExamDetails,
    studyMode,
    studyHours,
    studyMinutes,
    examDetailsProvided,
    clearTopicsState,
  ]);

  const handleModuleModeChange = useCallback((overviewId, mode) => {
    setModuleConfidenceState((prev) => {
      const current = prev[overviewId];
      if (current && current.mode === mode && Object.keys(current.overrides || {}).length === 0) {
        return prev;
      }
      return {
        ...prev,
        [overviewId]: { mode, overrides: {} },
      };
    });
    setOpenAccordions((prev) => ({
      ...prev,
      [overviewId]: mode === "somewhat",
    }));
  }, []);

  const handleAccordionToggle = useCallback((overviewId, open) => {
    setOpenAccordions((prev) => ({ ...prev, [overviewId]: open }));
  }, []);

  const handleExceptionToggle = useCallback((overviewId, subtopicId, isActive, overrideValue) => {
    setModuleConfidenceState((prev) => {
      const existing = prev[overviewId] || { mode: "somewhat", overrides: {} };
      const overrides = { ...existing.overrides };
      if (isActive) {
        overrides[subtopicId] = overrideValue;
      } else {
        delete overrides[subtopicId];
      }
      return {
        ...prev,
        [overviewId]: { ...existing, overrides },
      };
    });
  }, []);

  const handleSomewhatToggle = useCallback((overviewId, subtopicId, selection) => {
    setModuleConfidenceState((prev) => {
      const existing = prev[overviewId] || { mode: "somewhat", overrides: {} };
      const overrides = { ...existing.overrides };
      if (selection === "known") {
        overrides[subtopicId] = SOMEWHAT_KNOW_SCORE;
      } else if (selection === "gap") {
        overrides[subtopicId] = SOMEWHAT_GAP_SCORE;
      } else {
        delete overrides[subtopicId];
      }
      return {
        ...prev,
        [overviewId]: { ...existing, overrides },
      };
    });
  }, []);

  const resolveSubtopicConfidence = useCallback(
    (overviewId, subtopicId) => {
      const moduleState = moduleConfidenceState[overviewId];
      const mode = moduleState?.mode || "somewhat";
      const baseScore = moduleConfidencePresets[mode]?.baseScore ?? moduleConfidencePresets.somewhat.baseScore;
      const overrideValue = moduleState?.overrides?.[subtopicId];
      const resolved = Number.isFinite(overrideValue) ? overrideValue : baseScore;
      return Number(resolved.toFixed(2));
    },
    [moduleConfidenceState]
  );

  const handleDeleteSubtopic = useCallback((overviewId, subtopicId) => {
    let removedSubtopic = null;
    let overviewTitle = "";
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

  const handleDeleteAllSubtopics = useCallback((overviewId) => {
    const targetOverview = overviewTopics.find((overview) => overview.id === overviewId);
    if (!targetOverview) return;

    const removedSubtopics = targetOverview.subtopics.map((subtopic) => ({
      overviewId,
      overviewTitle: targetOverview.title,
      subtopic,
    }));

    setOverviewTopics((prev) => prev.filter((overview) => overview.id !== overviewId));
    setDeletedSubtopics((prev) => [...removedSubtopics, ...prev]);
  }, [overviewTopics]);

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
      const manualSubtopic = createSubtopic({
        title: trimmed,
        overviewId: manualOverviewId,
        familiarity: newTopicRating,
        source: "manual",
        bloomLevel: "Understand",
        examRelevanceReasoning: "",
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

  const handleGenerateCourse = useCallback(async () => {
    console.log("[CreateCourse] handleGenerateCourse called");
    console.debug("[CreateCourse] handleGenerateCourse called", {
      totalSubtopics: overviewTopics.flatMap((overview) => overview.subtopics).length,
      userId,
      courseTitle,
      courseId,
      courseGenerating,
    });
    const allSubtopics = overviewTopics.flatMap((overview) => overview.subtopics);
    if (allSubtopics.length === 0) {
      console.log("[CreateCourse] EARLY RETURN: no subtopics");
      setCourseGenerationError("Add at least one topic before creating the course.");
      return;
    }

    if (!userId) {
      console.log("[CreateCourse] EARLY RETURN: no userId");
      setCourseGenerationError("You need to be signed in to create your course.");
      return;
    }

    const className = courseTitle.trim();

    if (!className) {
      console.log("[CreateCourse] EARLY RETURN: no className");
      setCourseGenerationError("Provide a course title before creating the course.");
      return;
    }

    const cleanTopics = allSubtopics
      .map((subtopic) => (typeof subtopic.title === "string" ? subtopic.title.trim() : ""))
      .filter(Boolean);

    if (cleanTopics.length === 0) {
      console.log("[CreateCourse] EARLY RETURN: cleanTopics empty");
      setCourseGenerationError("Your topic list is empty. Please add topics before creating the course.");
      return;
    }

    const cleanTopicSet = new Set(cleanTopics);

    const topicFamiliarityMap = allSubtopics.reduce((acc, subtopic) => {
      const title = typeof subtopic.title === "string" ? subtopic.title.trim() : "";
      if (!title || !cleanTopicSet.has(title)) {
        return acc;
      }
      const score = resolveSubtopicConfidence(subtopic.overviewId, subtopic.id);
      acc[title] = scoreToFamiliarityBand(score);
      return acc;
    }, {});

    const fallbackGrokDraft = buildGrokDraftPayload(overviewTopics);
    let grokDraft = fallbackGrokDraft;
    if (generatedGrokDraft?.topics?.length) {
      const currentTopicIds = new Set(
        allSubtopics
          .map((subtopic) => (typeof subtopic.id === "string" ? subtopic.id.trim() : ""))
          .filter(Boolean)
      );
      const backendTopics = generatedGrokDraft.topics.filter((topic) => currentTopicIds.has(topic.id));
      const backendIds = new Set(backendTopics.map((topic) => topic.id));
      const fallbackLookup = new Map(
        (fallbackGrokDraft?.topics || []).map((topic) => [topic.id, topic])
      );
      const supplementalTopics = Array.from(currentTopicIds)
        .map((id) => fallbackLookup.get(id))
        .filter((topic) => topic && !backendIds.has(topic.id));
      const combined = [...backendTopics, ...supplementalTopics];
      grokDraft = { topics: combined };
    }

    if (!grokDraft.topics.length) {
      console.log("[CreateCourse] EARLY RETURN: grokDraft.topics empty");
      setCourseGenerationError("Topics are missing identifiers. Please rebuild and try again.");
      return;
    }

    const userConfidenceMap = allSubtopics.reduce((acc, subtopic) => {
      const id = typeof subtopic.id === "string" ? subtopic.id.trim() : "";
      if (!id) return acc;
      acc[id] = resolveSubtopicConfidence(subtopic.overviewId, subtopic.id);
      return acc;
    }, {});

    if (Object.keys(userConfidenceMap).length === 0) {
      console.log("[CreateCourse] EARLY RETURN: userConfidenceMap empty");
      setCourseGenerationError("Unable to map topic confidence. Please rebuild your topics.");
      return;
    }

    let navigationTriggered = false;
    const redirectToDashboard = () => {
      if (navigationTriggered) return;
      navigationTriggered = true;
      
      // Navigate to dashboard first
      router.push("/dashboard");
      
      // Dispatch multiple refresh events spaced 1 second apart to ensure the dashboard picks up the new course
      // This is needed because on production, the initial event may fire before the dashboard is ready
      const dispatchRefreshEvent = () => {
        try {
          window.dispatchEvent(new Event("courses:updated"));
        } catch {}
      };
      
      // Dispatch 5 refresh events, each 1 second apart
      dispatchRefreshEvent();
      setTimeout(dispatchRefreshEvent, 1000);
      setTimeout(dispatchRefreshEvent, 2000);
      setTimeout(dispatchRefreshEvent, 3000);
      setTimeout(dispatchRefreshEvent, 4000);
      setTimeout(dispatchRefreshEvent, 5000);
    };

    const safeSetCourseGenerationMessage = (message) => {
      if (navigationTriggered) return;
      setCourseGenerationMessage(message);
    };

    console.log("[CreateCourse] All checks passed, setting courseGenerating=true");
    setCourseGenerating(true);
    setCourseGenerationError("");
    safeSetCourseGenerationMessage("Locking in your topic roadmap…");

    try {
      const finishByIso = new Date(Date.now() + (studyHours * 60 * 60 * 1000) + (studyMinutes * 60 * 1000)).toISOString();
      const trimmedSyllabusText = syllabusText.trim();
      const syllabusTextPayload = trimmedSyllabusText || "Not provided.";
      const examDetailsPayload = examDetailsProvided
        ? {
            // Indicate whether user provided files or just textual topics
            type: examFiles.length > 0 ? "files" : "notes",
            notes: examNotes?.trim() || "Not provided.",
            has_exam_materials: examFiles.length > 0,
            sample_exam_file_names: examFiles.map((file) => file.name),
          }
        : { notes: "Not provided.", has_exam_materials: false };
      const payload = {
        userId,
        // backend creates the course; don't send courseId
        className,
        courseTitle: className,
        university: collegeName.trim() || undefined,
        finishByDate: finishByIso || undefined,
        topics: cleanTopics,
        topicFamiliarity: topicFamiliarityMap,
        syllabusText: trimmedSyllabusText || "Not provided.",
        syllabus_text: syllabusTextPayload,
        grok_draft: grokDraft,
        user_confidence_map: userConfidenceMap,
        mode: studyMode,
        // Course metadata for downstream workers and DB. Keep top-level keys for backwards compatibility.
        courseMetadata: {
          title: className,
          syllabus_text: syllabusTextPayload,
          exam_details: examDetailsPayload,
        },
        // Pass rag_session_id if available from topics generation for RAG context continuity
        ...(ragSessionId && { rag_session_id: ragSessionId }),
      };

      if (Object.keys(topicFamiliarityMap).length === 0) {
        delete payload.topicFamiliarity;
      }

      payload.exam_details = examDetailsPayload;

      redirectToDashboard();

      if (syllabusFiles.length > 0) {
        safeSetCourseGenerationMessage("Encoding syllabus materials…");
        const syllabusPayload = await buildFilePayload(syllabusFiles);
        if (syllabusPayload.length > 0) {
          payload.syllabusFiles = syllabusPayload;
        }
      }

      const examFormatDetails = formatExamStructure({ hasExamMaterials: examDetailsProvided, examNotes: examNotes?.trim() || "Not provided." });
      if (examFormatDetails) {
        payload.examFormatDetails = examFormatDetails;
      }

      if (examFiles.length > 0) {
        safeSetCourseGenerationMessage("Packaging exam references…");
        const examPayload = await buildFilePayload(examFiles, { contentKey: "content", includeSize: false });
        if (examPayload.length > 0) {
          payload.examFiles = examPayload;
        }
      }

      safeSetCourseGenerationMessage("Creating course…");
      
      // Calculate seconds_to_complete from studyHours and studyMinutes
      const secondsToComplete = (studyHours * 3600) + (studyMinutes * 60);
      payload.seconds_to_complete = secondsToComplete;
      
      console.log("[CreateCourse] About to fetch /api/courses");
      const baseUrl = process.env.BACKEND_API_URL || "https://api.kognolearn.com";
      const response = await authFetch(`${baseUrl}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("[CreateCourse] Fetch completed, response.ok:", response.ok);

      const body = await response.json().catch(() => ({}));
      console.log("[CreateCourse] Response body:", body);
      if (!response.ok) {
        const asyncDisabled = getAsyncDisabledMessage(response.status, body);
        throw new Error(asyncDisabled || body?.error || "Failed to create course. Please try again.");
      }

      const jobId = resolveJobId(body);
      if (jobId) {
        upsertCourseCreateJob(userId, {
          jobId,
          statusUrl: resolveJobStatusUrl(body),
          courseTitle: className,
        });
        try {
          window.dispatchEvent(new Event("courses:updated"));
        } catch {}
      }

      // Course created successfully - dispatch additional refresh events
      // The redirect already happened earlier, but send more events to ensure dashboard refreshes
      const dispatchRefreshEvent = () => {
        try {
          window.dispatchEvent(new Event("courses:updated"));
        } catch {}
      };
      
      // Dispatch 5 more refresh events after course creation completes
      dispatchRefreshEvent();
      setTimeout(dispatchRefreshEvent, 1000);
      setTimeout(dispatchRefreshEvent, 2000);
      setTimeout(dispatchRefreshEvent, 3000);
      setTimeout(dispatchRefreshEvent, 4000);
    } catch (error) {
      console.log("[CreateCourse] ERROR:", error);
      if (!navigationTriggered) {
        setCourseGenerationError(error.message || "Unexpected error creating course.");
        setCourseGenerating(false);
      }
    }
  }, [
    overviewTopics,
    userId,
    courseId,
    courseTitle,
    collegeName,
    syllabusText,
    syllabusFiles,
    hasExamMaterials,
    examNotes,
    examFiles,
    examDetailsProvided,
    confirmedNoExamDetails,
    generatedGrokDraft,
    ragSessionId,
    resolveSubtopicConfidence,
    router,
    studyMode,
    studyHours,
    studyMinutes,
  ]);

  // Floating Navigation Logic
  const [navVisibility, setNavVisibility] = useState({ top: true, bottom: true });
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      setNavVisibility(prev => {
        let next = { ...prev };
        let changed = false;
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-nav-id');
          if (id === 'top') { next.top = entry.isIntersecting; changed = true; }
          if (id === 'bottom') { next.bottom = entry.isIntersecting; changed = true; }
        });
        return changed ? next : prev;
      });
    }, { threshold: 0.1 });
    
    return () => observerRef.current?.disconnect();
  }, []);

  const topNavCallback = useCallback((node) => {
    if (node) {
      node.setAttribute('data-nav-id', 'top');
      observerRef.current?.observe(node);
    }
  }, []);

  const bottomNavCallback = useCallback((node) => {
    if (node) {
      node.setAttribute('data-nav-id', 'bottom');
      observerRef.current?.observe(node);
    }
  }, []);

  const showFloatingNav = !navVisibility.top && !navVisibility.bottom;

  const handleFloatingBack = () => {
    if (currentStep === 1) router.push("/dashboard");
    else setCurrentStep(prev => prev - 1);
  };

  const handleFloatingNext = () => {
    if (currentStep === 1 && canProceedFromStep1) setCurrentStep(2);
    else if (currentStep === 2 && canProceedFromStep2) setCurrentStep(3);
    else if (currentStep === 3 && canProceedFromStep3) handleGenerateCourse();
  };

  const isFloatingNextDisabled = useMemo(() => {
    if (currentStep === 1) return !canProceedFromStep1;
    if (currentStep === 2) return !canProceedFromStep2;
    if (currentStep === 3) return !canProceedFromStep3 || courseGenerating;
    return true;
  }, [currentStep, canProceedFromStep1, canProceedFromStep2, canProceedFromStep3, courseGenerating]);

  const isOnFinalStep = currentStep === 3;

  if (authStatus === "checking") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--muted-foreground)]">
        <div className="card rounded-2xl px-8 py-6 text-xs">
          Checking your session…
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Course Details", description: "Basic information" },
    { number: 2, title: "Course Materials", description: "Syllabus & resources" },
    { number: 3, title: "Build Topics", description: "Custom topic list" },
  ];

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] py-8 text-[var(--foreground)] transition-colors">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
      </div>

      <div className={`relative mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 ${totalSubtopics > 0 && currentStep === 3 ? "max-w-[90rem]" : "max-w-5xl"}`}>
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl mb-1">Create New Course</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Build your personalized learning plan in 3 simple steps</p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-start justify-center gap-2 sm:gap-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold text-sm transition-all ${
                      currentStep > step.number
                        ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30"
                        : currentStep === step.number
                        ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 scale-110"
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
                  <div className="mt-2 text-center max-w-[80px] sm:max-w-none">
                    <p className={`text-[10px] sm:text-xs font-semibold leading-tight ${currentStep >= step.number ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-12 sm:w-32 h-0.5 mx-1 sm:mx-2 mb-6 sm:mb-8">
                    <div className={`h-full transition-all duration-500 ${currentStep > step.number ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card rounded-2xl p-5 sm:p-7 shadow-lg">
          {/* Step 1: Course Details */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              {/* Top Navigation */}
              <div ref={topNavCallback} className="pb-5 border-b border-[var(--border)]">
                <h2 className="text-xl font-bold mb-1">Course Details</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Let's start with the basics about your course</p>
              </div>

              <div className="space-y-4">
                {/* Course Title & University */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      University / Institution <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="MIT"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      Course Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Introduction to Machine Learning"
                      value={courseTitle}
                      onChange={handleCourseInputChange}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                </div>

                {/* Study Time (Cram only) */}
                {isCramMode && (
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      Time left to learn <span className="text-rose-500">*</span>
                    </label>
                    <DurationInput
                      hours={studyHours}
                      minutes={studyMinutes}
                      onChange={({ hours, minutes }) => {
                        setStudyHours(hours);
                        setStudyMinutes(minutes);
                        if (hours > 0 || minutes > 0) {
                          setStudyTimeError(false);
                        }
                      }}
                      hideSummary
                      variant="minimal"
                    />
                    {studyTimeError && (
                      <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-300">
                        Please enter more than 0 hours and 0 minutes.
                      </div>
                    )}
                  </div>
                )}

                {/* Study Mode Selector */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Study Mode <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">Choose how you want to approach this course</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Deep Study Option */}
                    <button
                      type="button"
                      onClick={() => setStudyMode("deep")}
                      className={`relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${
                        studyMode === "deep"
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-md shadow-[var(--primary)]/10"
                          : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-2)]/80"
                      }`}
                    >
                      {studyMode === "deep" && (
                        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                        <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Deep Study</h4>
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                        Thorough coverage with detailed explanations, more practice problems, and comprehensive reading materials. Best for mastering concepts.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                          Longer readings
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                          More quizzes
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                          Deep videos
                        </span>
                      </div>
                    </button>

                    {/* Cram Mode Option */}
                    <button
                      type="button"
                      onClick={() => setStudyMode("cram")}
                      className={`relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${
                        studyMode === "cram"
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-md shadow-[var(--primary)]/10"
                          : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-2)]/80"
                      }`}
                    >
                      {studyMode === "cram" && (
                        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Cram Mode</h4>
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                        High-yield, exam-focused content. Prioritizes the most important topics and formats likely to appear on tests. Perfect for limited time.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          High-yield focus
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Exam-style Qs
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Quick review
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {(!collegeName.trim() || !courseTitle.trim()) && (
                <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0" style={{color: 'var(--warning)'}} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span style={{color: 'color-mix(in srgb, var(--warning) 95%, white)'}}>Both university and course name are required to continue</span>
                  </div>
                </div>
              )}

              {/* (moved) Confirmation modal for 'no exam details' is shown near Step 2 */}

              {/* Confirmation modal for 'no exam details' */}
              {showConfirmNoExamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/70 px-4 backdrop-blur-sm">
                  <div className="card max-w-lg w-full rounded-2xl p-5 text-sm bg-[var(--surface-2)] border border-[var(--border)] shadow-2xl">
                    <h3 className="text-base font-semibold mb-2">Are you sure?</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mb-5">Not including exam details will lead to courses with less fit. Only check this if you yourself do not have any indication at all of what will be on the test and we'll try our best to figure it out.</p>
                    <div className="flex items-center justify-end gap-2.5">
                      <button type="button" onClick={() => { setConfirmedNoExamDetails(false); setShowConfirmNoExamModal(false); }} className="btn btn-outline btn-sm">Cancel</button>
                      <button type="button" onClick={() => { setConfirmedNoExamDetails(true); setShowConfirmNoExamModal(false); }} className="btn btn-primary btn-sm">Confirm - proceed without exam details</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div ref={bottomNavCallback} className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--border)]">
                <Link href="/dashboard" className="btn btn-outline btn-sm">Cancel</Link>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasStudyTime) {
                      setStudyTimeError(true);
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  disabled={!canProceedFromStep1}
                  className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="space-y-5 animate-fadeIn">
              {/* Top Navigation */}
              <div ref={topNavCallback} className="pb-5 border-b border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Course Materials</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Upload syllabus and exam materials for better course generation</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn btn-outline btn-sm"
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
                      className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {/* Syllabus Section */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
                  <div className="mb-4">
                    <OnboardingTooltip
                      id="create-syllabus-section"
                      content="Upload your course syllabus or paste the content here. This helps us understand your course structure and create relevant study materials tailored to your curriculum."
                      position="right"
                      pointerPosition="top"
                      delay={800}
                      priority={2}
                    >
                      <h3 className="font-semibold text-sm mb-0.5">Syllabus</h3>
                    </OnboardingTooltip>
                    <p className="text-xs text-[var(--muted-foreground)]">Share course objectives</p>
                  </div>
                  
                  {/* File Upload Section */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-[var(--foreground)] mb-2">Upload Files</h4>
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
                      onDragEnter={handleSyllabusDragEnter}
                      onDragOver={handleSyllabusDragOver}
                      onDragLeave={handleSyllabusDragLeave}
                      onDrop={handleSyllabusDrop}
                      className={`flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition hover:border-[var(--primary)] hover:bg-[var(--surface-2)]/50 ${
                        isSyllabusDragActive
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-[var(--border)] bg-[var(--surface-1)]"
                      }`}
                    >
                      <svg className="h-8 w-8 text-[var(--muted-foreground)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-[var(--muted-foreground)]">PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG, JPEG, GIF, WEBP, or HEIC</p>
                    </label>
                    
                    {syllabusFiles.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">{syllabusFiles.length} file{syllabusFiles.length !== 1 ? 's' : ''} uploaded</p>
                        <div className="space-y-2">
                          {syllabusFiles.map((file) => (
                            <div key={file.name} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <svg className="h-4 w-4 text-[var(--primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{file.name}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSyllabusFile(file.name)}
                                className="flex-shrink-0 p-1 rounded-full transition-colors"
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                                style={{color: 'var(--muted-foreground)'}}
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
                  
                  {/* Text Input Section */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--foreground)] mb-2">Additional Notes</h4>
                    <textarea
                      rows={4}
                      value={syllabusText}
                      onChange={(event) => setSyllabusText(event.target.value)}
                      placeholder="Paste syllabus content, course objectives, or any additional context..."
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20 resize-none overflow-y-auto"
                      style={{ minHeight: '6rem', maxHeight: '12rem' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
                      }}
                    />
                  </div>
                </div>

                {/* Practice Exams Upload Section */}
                <div className="rounded-lg border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                      <OnboardingTooltip
                        id="create-exam-section"
                        content="Upload past exams, practice tests, or describe your exam format. This is highly recommended — it helps us create practice problems that match your actual test style and focus on the right topics."
                        position="right"
                        pointerPosition="top"
                        delay={1000}
                        priority={3}
                      >
                        <h3 className="font-semibold text-sm">Exam Details</h3>
                      </OnboardingTooltip>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--info)]/20 font-semibold" style={{color: 'var(--info)'}}>Recommended</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">Upload practice exams, past tests, or sample questions here. This helps us generate study materials that closely match the topics and question styles on your exam.</p>
                  </div>

                  <div>
                    <input
                      id={examInputId}
                      type="file"
                      multiple
                      accept={syllabusFileTypes}
                      onChange={handleExamFileChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor={examInputId}
                      onDragEnter={handleExamDragEnter}
                      onDragOver={handleExamDragOver}
                      onDragLeave={handleExamDragLeave}
                      onDrop={handleExamDrop}
                      className={`flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 ${
                        isExamDragActive
                          ? "border-[var(--primary)] bg-[var(--primary)]/15"
                          : "border-[var(--primary)]/40 bg-[var(--surface-1)]"
                      }`}
                    >
                      <svg className="h-10 w-10 text-[var(--primary)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">Upload Practice Exams</p>
                      <p className="text-xs text-[var(--muted-foreground)] text-center">Past exams, practice tests, sample questions, or old midterms/finals</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1">PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG, JPEG, GIF, WEBP, or HEIC</p>
                    </label>
                    
                    {examFiles.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-[var(--primary)] mb-2">{examFiles.length} practice exam{examFiles.length !== 1 ? 's' : ''} uploaded</p>
                        <div className="space-y-2">
                          {examFiles.map((file) => (
                            <div key={file.name} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--primary)]/30 bg-[var(--surface-1)] px-3 py-2.5">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <svg className="h-4 w-4 text-[var(--primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{file.name}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExamFile(file.name)}
                                className="flex-shrink-0 p-1 rounded-full transition-colors"
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                                style={{color: 'var(--muted-foreground)'}}
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
                </div>

                {/* Exam Details Section (Notes Only) */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm">Exam Content & Topics</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--info)]/20 font-semibold" style={{color: 'var(--info)'}}>Optional</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">Describe the topics or chapters likely to be on the exam. <span className="font-medium">You can directly upload posts from your professor here and we'll filter through and figure out what's important</span>.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Notes about your exam</label>
                    <textarea
                      rows={3}
                      value={examNotes}
                      onChange={(event) => setExamNotes(event.target.value)}
                      placeholder="E.g., 'Ch 1-4: probability & statistics; Ch 5: linear regression; hypothesis testing; optimization methods'"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20 resize-none overflow-y-auto"
                      style={{ minHeight: '4.5rem', maxHeight: '10rem' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                      }}
                    />
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5 flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      To upload practice tests or past exams, use the "Practice Exams & Past Tests" section above
                    </p>
                  </div>
                </div>
              </div>


              {/* Navigation */}
              <div ref={bottomNavCallback} className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
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
              </div>
            </div>
          )}

          {/* Step 3: Generate Topics */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <motion.div
                layout
                initial={{ opacity: 0, width: "100%" }}
                animate={{ 
                  opacity: 1, 
                  width: totalSubtopics > 0 ? "100%" : "100%",
                  maxWidth: totalSubtopics > 0 ? "100%" : "100%"
                }}
                className={`space-y-5 ${totalSubtopics > 0 ? "w-full" : ""}`}
              >
                {/* Top Navigation - REMOVED for Step 3 as requested */}
                <div ref={topNavCallback} className="pb-5 border-b border-[var(--border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold mb-1">Build Study Topics</h2>
                      <p className="text-sm text-[var(--muted-foreground)]">Create a personalized topic list for your course</p>
                    </div>
                    {/* Top buttons removed */}
                  </div>
                </div>

              {isCramMode && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Cram mode topic setup</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Pick whether we generate a high-yield list or you paste the exact topics.</p>
                    </div>
                    <div className="inline-flex rounded-lg bg-[var(--surface-1)] p-1 border border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => handleCramTopicStrategyChange("generate")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                          cramTopicStrategy === "generate"
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        Generate for me
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCramTopicStrategyChange("manual")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                          cramTopicStrategy === "manual"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        I'll input topics
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"></div>
                    <span>Switching options resets the current topic list so you can stay focused.</span>
                  </div>
                </div>
              )}

              {isCramManual && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Paste the topics you want to cram</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">One topic per line. We'll keep the same exam-focused format.</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">Manual list</span>
                  </div>
                  <textarea
                    rows={4}
                    value={manualTopicsInput}
                    onChange={(event) => setManualTopicsInput(event.target.value)}
                    placeholder="Derivatives
Integrals
Series & convergence"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20 resize-none"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-[10px] text-[var(--muted-foreground)]">We'll store these just like generated topics so course creation works the same.</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setManualTopicsInput("");
                          clearTopicsState();
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyManualTopics}
                        disabled={!manualTopicsInput.trim()}
                        className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Use these topics
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isTopicsLoading && totalSubtopics === 0 && !isCramManual && (
                <div className="text-center py-10 px-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <svg className="h-7 w-7 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold mb-1.5">Ready to Build Topics</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mb-5 max-w-md mx-auto">
                    We'll analyze your course details and create a comprehensive topic list
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTopics}
                    disabled={!canProceedFromStep1 || isTopicsLoading}
                    className="btn btn-primary"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Build Topics
                  </button>
                </div>
              )}

              {isTopicsLoading && (
                <div className="space-y-5 py-6 px-5">
                  {/* Animated pulse header */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] animate-pulse"></div>
                      <h3 className="text-base font-semibold">
                        Analyzing your course materials...
                      </h3>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--info)]/10 border border-[var(--info)]/30">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--info)] animate-pulse"></div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        30-60 seconds
                      </span>
                    </div>
                  </div>

                  {/* Skeleton loading cards */}
                  <div className="space-y-3">
                    {[1].map((index) => (
                      <div key={index} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 animate-pulse" style={{ animationDelay: `${index * 100}ms` }}>
                        {/* Header skeleton */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[var(--surface-muted)] rounded-md w-3/4"></div>
                            <div className="h-3 bg-[var(--surface-muted)] rounded-md w-1/2"></div>
                          </div>
                          <div className="h-5 w-20 bg-[var(--surface-muted)] rounded-full"></div>
                        </div>

                        {/* Subtopics skeleton */}
                        <div className="space-y-2.5 mt-3">
                          {[1, 2, 3].map((subIndex) => (
                            <div key={subIndex} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
                              <div className="space-y-1.5">
                                <div className="h-3.5 bg-[var(--surface-muted)] rounded-md w-5/6"></div>
                                <div className="h-3 bg-[var(--surface-muted)] rounded-md w-full"></div>
                                <div className="flex gap-2 mt-2">
                                  <div className="h-4 w-14 bg-[var(--surface-muted)] rounded-full"></div>
                                  <div className="h-4 w-16 bg-[var(--surface-muted)] rounded-full"></div>
                                  <div className="h-4 w-10 bg-[var(--surface-muted)] rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topicsError && (
                <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-xs" style={{color: 'color-mix(in srgb, var(--danger) 90%, white)'}}>
                  {topicsError}
                </div>
              )}

              {/* Topics Explorer Inline */}
              {totalSubtopics > 0 && (
                <div className="flex flex-col">
                
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div>
                      <OnboardingTooltip
                        id="create-topics-step"
                        content="These are your personalized study topics! Use the confidence buttons (Unfamiliar, Still Learning, Confident) to tell us how well you know each module. This helps us prioritize what you need to learn most."
                        position="bottom"
                        pointerPosition="left"
                        delay={500}
                        priority={4}
                      >
                        <h3 className="text-lg font-bold">{totalSubtopics} Topics Generated</h3>
                      </OnboardingTooltip>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Review and customize your learning path
                      </p>
                    </div>
                    {!isCramManual && (
                      <button
                        type="button"
                        onClick={handleGenerateTopics}
                        className="btn btn-outline btn-sm"
                        disabled={isTopicsLoading || isModifyingTopics}
                      >
                        Regenerate
                      </button>
                    )}
                </div>

                <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--foreground)]">Refine topics with a prompt</h4>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Describe the adjustments you want, and we'll rewrite the topic list for you.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleModifyTopics}
                        className="btn btn-primary btn-sm"
                        disabled={!canModifyTopics}
                      >
                        {isModifyingTopics ? "Updating..." : "Apply Prompt"}
                      </button>
                    </div>
                    <textarea
                      value={topicModifyPrompt}
                      onChange={(event) => {
                        setTopicModifyPrompt(event.target.value);
                        if (topicModifyError) setTopicModifyError("");
                      }}
                      placeholder="Example: Emphasize graph algorithms and remove basic sorting topics."
                      className="w-full min-h-[96px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                    />
                    {topicModifyError && (
                      <p className="text-xs text-[var(--danger)]">{topicModifyError}</p>
                    )}
                  </div>
                </div>
                  
                <div className="max-h-[90vh] overflow-y-auto pr-2 -mr-2 border border-[var(--border)] rounded-lg p-4 bg-[var(--surface-1)]">
                  <TopicExplorer
                    overviewTopics={overviewTopics}
                    moduleConfidenceState={moduleConfidenceState}
                      openAccordions={openAccordions}
                      handleModuleModeChange={handleModuleModeChange}
                      handleAccordionToggle={handleAccordionToggle}
                      handleExceptionToggle={handleExceptionToggle}
                      handleSomewhatToggle={handleSomewhatToggle}
                      handleDeleteSubtopic={handleDeleteSubtopic}
                      handleDeleteAllSubtopics={handleDeleteAllSubtopics}
                      handleAddTopic={handleAddTopic}
                      handleRestoreSubtopic={handleRestoreSubtopic}
                      handleRestoreAll={handleRestoreAll}
                      deletedSubtopics={deletedSubtopics}
                      newTopicTitle={newTopicTitle}
                      setNewTopicTitle={setNewTopicTitle}
                      newTopicRating={newTopicRating}
                      setNewTopicRating={setNewTopicRating}
                      resolveSubtopicConfidence={resolveSubtopicConfidence}
                      inline={true}
                    />
                  </div>
                </div>
              )}

              {/* Navigation - Sticky Bottom */}
              <div ref={bottomNavCallback} className={`flex items-center justify-between pt-5 border-t border-[var(--border)] ${totalSubtopics > 0 ? "sticky bottom-0 z-10 pb-2" : "mt-6"}`}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-outline btn-sm"
                  disabled={courseGenerating}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCourse}
                  disabled={!canProceedFromStep3 || courseGenerating}
                  className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {courseGenerating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Course
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
            </div>
          )}


        </div>
      </div>
      {/* Floating Navigation */}
      <div className={`fixed bottom-6 right-6 flex gap-3 transition-opacity duration-300 z-40 ${showFloatingNav ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Back / Cancel Button */}
        <button
            onClick={handleFloatingBack}
            disabled={courseGenerating}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted-foreground)] shadow-lg transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
            aria-label="Back"
        >
            {/* X Icon */}
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Next / Create Button */}
        <button
            onClick={handleFloatingNext}
            disabled={isFloatingNextDisabled}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isOnFinalStep ? "Create Course" : "Next"}
        >
            {courseGenerating ? (
              // Spinner for creating
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isOnFinalStep ? (
              // Check Icon for final step
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              // Arrow Icon for next
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
        </button>
      </div>

      <ThemeToggle />
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
