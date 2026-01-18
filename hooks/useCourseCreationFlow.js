import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import { getRedirectDestination } from "@/lib/platform";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";
import { upsertCourseCreateJob } from "@/utils/courseJobs";
import { getAsyncDisabledMessage } from "@/utils/asyncJobs";
import {
  defaultTopicRating,
  manualOverviewId,
  manualOverviewTitle,
  moduleConfidencePresets,
  scoreToFamiliarityBand,
} from "@/app/courses/create/utils";

const syllabusFileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic";
const acceptedAttachmentExtensions = new Set(
  syllabusFileTypes
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean)
);
const nestedPayloadKeys = ["data", "result", "payload", "response", "content"];

// Helper functions
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

function formatExamStructure({ hasExamMaterials, examNotes }) {
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

async function buildFilePayload(files, { contentKey = "base64", includeSize = true, useOpenRouterFormat = false } = {}) {
  const payloads = await Promise.all(
    files.map(async (file) => {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || "application/octet-stream";

      // OpenRouter format for file uploads
      if (useOpenRouterFormat) {
        return {
          type: "file",
          file: {
            filename: file.name,
            file_data: `data:${mimeType};base64,${base64}`,
          },
        };
      }

      // Legacy format
      const payload = {
        name: file.name,
        type: mimeType,
        [contentKey]: base64,
      };
      if (includeSize) {
        payload.size = file.size;
      }
      return payload;
    })
  );
  return payloads;
}

function resolveRagSessionId(payloadCandidates) {
  for (const payload of payloadCandidates) {
    if (!payload || typeof payload !== "object") continue;
    const candidates = [
      payload.rag_session_id,
      payload.ragSessionId,
      payload.data?.rag_session_id,
      payload.result?.rag_session_id,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return null;
}

function createSubtopic({
  title,
  overviewId,
  familiarity = defaultTopicRating,
  source = "generated",
  bloomLevel = "Understand",
  examRelevanceReasoning = "",
  id = null,
}) {
  return {
    id: id || `subtopic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    overviewId,
    title,
    description: "",
    difficulty: "beginner",
    likelyOnExam: true,
    familiarity,
    source,
    bloomLevel,
    examRelevanceReasoning,
  };
}

function buildOverviewFromModules(modules) {
  return modules.map((mod, i) => ({
    id: mod.id || `overview-${i}`,
    title: mod.title || mod.name || `Module ${i + 1}`,
    description: mod.description || "",
    likelyOnExam: true,
    subtopics: (mod.lessons || mod.topics || mod.subtopics || []).map((lesson, j) =>
      createSubtopic({
        id: lesson.id || `topic-${i}-${j}`,
        title: lesson.title || lesson.name || `Topic ${j + 1}`,
        overviewId: mod.id || `overview-${i}`,
        familiarity: lesson.familiarity ?? defaultTopicRating,
        source: lesson.source || "generated",
        bloomLevel: lesson.bloomLevel || lesson.bloom_level || "Understand",
        examRelevanceReasoning: lesson.examRelevanceReasoning || lesson.exam_relevance_reasoning || "",
      })
    ),
  }));
}

function buildOverviewFromTopics(topics, groupId, groupTitle) {
  return [
    {
      id: groupId,
      title: groupTitle,
      description: "",
      likelyOnExam: true,
      subtopics: topics.map((topic, i) =>
        createSubtopic({
          id: topic.id || `topic-${i}`,
          title: topic.title || topic.name || `Topic ${i + 1}`,
          overviewId: groupId,
          familiarity: topic.familiarity ?? defaultTopicRating,
          source: topic.source || "generated",
          bloomLevel: topic.bloomLevel || topic.bloom_level || "Understand",
          examRelevanceReasoning: topic.examRelevanceReasoning || topic.exam_relevance_reasoning || "",
        })
      ),
    },
  ];
}

function parseTopicPayload(result) {
  let payload = result;
  for (const key of nestedPayloadKeys) {
    if (payload?.[key] && typeof payload[key] === "object") {
      payload = payload[key];
    }
  }

  const payloadCandidates = [result, payload];

  let hydrated = [];
  let extractedGrokDraft = null;

  if (Array.isArray(payload?.modules) && payload.modules.length) {
    hydrated = buildOverviewFromModules(payload.modules);
    extractedGrokDraft = payload.grok_draft || payload.grokDraft || null;
  } else if (Array.isArray(payload?.overviewTopics) && payload.overviewTopics.length) {
    hydrated = buildOverviewFromModules(payload.overviewTopics);
    extractedGrokDraft = payload.grok_draft || payload.grokDraft || null;
  } else if (Array.isArray(payload?.topics) && payload.topics.length) {
    hydrated = buildOverviewFromTopics(payload.topics, "generated-overview", "Generated Topics");
    extractedGrokDraft = payload.grok_draft || payload.grokDraft || null;
  } else if (Array.isArray(payload) && payload.length) {
    if (payload[0]?.lessons || payload[0]?.topics || payload[0]?.subtopics) {
      hydrated = buildOverviewFromModules(payload);
    } else {
      hydrated = buildOverviewFromTopics(payload, "generated-overview", "Generated Topics");
    }
  }

  return {
    hydrated,
    extractedGrokDraft,
    ragSessionId: resolveRagSessionId(payloadCandidates),
  };
}

function buildGrokDraftPayload(overviewTopics) {
  const topics = overviewTopics.flatMap((overview) =>
    overview.subtopics.map((subtopic) => ({
      id: subtopic.id,
      title: subtopic.title,
      bloomLevel: subtopic.bloomLevel || "Understand",
      examRelevanceReasoning: subtopic.examRelevanceReasoning || "",
    }))
  );
  return { topics };
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

/**
 * Custom hook that encapsulates all course creation logic.
 * Extracts state and handlers from the original page.jsx for reuse
 * in both wizard and conversational UI modes.
 */
export function useCourseCreationFlow({ onComplete, onError } = {}) {
  const router = useRouter();

  // Auth state
  const [authStatus, setAuthStatus] = useState("checking");
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCheckedAdmin, setHasCheckedAdmin] = useState(false);
  const [contentVersion, setContentVersion] = useState(1);

  // Course metadata
  const [courseTitle, setCourseTitle] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [courseId, setCourseId] = useState(null);

  // Study mode
  const [studyMode, setStudyModeState] = useState("deep");
  const setStudyMode = useCallback((mode) => {
    setStudyModeState(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kogno_study_mode", mode);
      } catch (error) {
        console.warn("[CourseCreation] Unable to persist study mode:", error);
      }
    }
  }, []);
  const [studyHours, setStudyHours] = useState(5);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [studyTimeError, setStudyTimeError] = useState(false);

  // Syllabus
  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusFiles, setSyllabusFiles] = useState([]);

  // Exam materials
  const [hasExamMaterials, setHasExamMaterials] = useState(false);
  const [examNotes, setExamNotes] = useState("");
  const [examFiles, setExamFiles] = useState([]);

  // Topics
  const [overviewTopics, setOverviewTopics] = useState([]);
  const [moduleConfidenceState, setModuleConfidenceState] = useState({});
  const [openAccordions, setOpenAccordions] = useState({});
  const [generatedGrokDraft, setGeneratedGrokDraft] = useState(null);
  const [deletedSubtopics, setDeletedSubtopics] = useState([]);
  const [ragSessionId, setRagSessionId] = useState(null);

  // Topic modification
  const [topicModifyPrompt, setTopicModifyPrompt] = useState("");
  const [isModifyingTopics, setIsModifyingTopics] = useState(false);
  const [topicModifyError, setTopicModifyError] = useState("");

  // Loading and error states
  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState(null);
  const [courseGenerating, setCourseGenerating] = useState(false);
  const [courseGenerationError, setCourseGenerationError] = useState("");
  const [courseGenerationMessage, setCourseGenerationMessage] = useState("Preparing your personalized course plan…");

  // Manual topic input (for cram mode)
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicRating, setNewTopicRating] = useState(defaultTopicRating);
  const [cramTopicStrategy, setCramTopicStrategy] = useState("generate");
  const [manualTopicsInput, setManualTopicsInput] = useState("");

  const isCramMode = studyMode === "cram";

  // Computed values
  const totalSubtopics = useMemo(
    () => overviewTopics.reduce((sum, overview) => sum + overview.subtopics.length, 0),
    [overviewTopics]
  );

  const hasStudyTime = studyHours > 0 || studyMinutes > 0;
  const canProceedFromStep1 = courseTitle.trim() && collegeName.trim();
  const examDetailsProvided = hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim());
  const canProceedFromStep2 = true;
  const canProceedFromStep3 = totalSubtopics > 0;
  const canModifyTopics = Boolean(
    userId &&
      topicModifyPrompt.trim() &&
      overviewTopics.length > 0 &&
      !isModifyingTopics &&
      !isTopicsLoading
  );
  const canGenerateTopics = Boolean(userId && courseTitle.trim() && collegeName.trim() && !isTopicsLoading);
  const canCreateCourse = Boolean(userId && totalSubtopics > 0 && !courseGenerating);

  // Effects
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
    if (hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim())) {
      // Clear any "no exam details" confirmation if user adds exam materials
    }
  }, [hasExamMaterials, examFiles, examNotes]);

  useEffect(() => {
    if (!isCramMode && cramTopicStrategy !== "generate") {
      setCramTopicStrategy("generate");
      setManualTopicsInput("");
    }
  }, [isCramMode, cramTopicStrategy]);

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

        const savedSchool = user.user_metadata?.school;
        if (savedSchool && !collegeName) {
          setCollegeName(savedSchool);
        }
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

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;

    (async () => {
      try {
        const res = await authFetch("/api/admin/status");
        if (!res.ok) {
          throw new Error(`Failed to verify admin (${res.status})`);
        }
        const body = await res.json().catch(() => ({}));
        if (!cancelled) {
          const admin = body?.isAdmin === true;
          setIsAdmin(admin);
          if (!admin) {
            setContentVersion(1);
          }
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        if (!cancelled) {
          setIsAdmin(false);
          setContentVersion(1);
        }
      } finally {
        if (!cancelled) setHasCheckedAdmin(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Sync moduleConfidenceState with overviewTopics
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

  // Sync openAccordions with overviewTopics
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

  // File handling
  const filterAcceptedFiles = useCallback((files) => {
    return files.filter((file) => {
      const name = typeof file?.name === "string" ? file.name : "";
      if (!name.includes(".")) return true;
      const extension = `.${name.split(".").pop().toLowerCase()}`;
      return acceptedAttachmentExtensions.has(extension);
    });
  }, []);

  const handleSyllabusFileChange = useCallback(
    (files) => {
      const accepted = filterAcceptedFiles(Array.isArray(files) ? files : [files]);
      if (accepted.length) {
        setSyllabusFiles((prev) => [...prev, ...accepted]);
      }
    },
    [filterAcceptedFiles]
  );

  const handleRemoveSyllabusFile = useCallback((name) => {
    setSyllabusFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  const handleExamFileChange = useCallback(
    (files) => {
      const accepted = filterAcceptedFiles(Array.isArray(files) ? files : [files]);
      if (accepted.length) {
        setExamFiles((prev) => [...prev, ...accepted]);
      }
    },
    [filterAcceptedFiles]
  );

  const handleRemoveExamFile = useCallback((name) => {
    setExamFiles((prev) => prev.filter((file) => file.name !== name));
  }, []);

  // Clear topics state
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

  // Confidence handlers
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

  // Topic handlers
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
      if (!match) return prev;
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
    (title, rating = defaultTopicRating) => {
      const trimmed = (title || newTopicTitle).trim();
      if (!trimmed) return;
      const manualSubtopic = createSubtopic({
        title: trimmed,
        overviewId: manualOverviewId,
        familiarity: rating || newTopicRating,
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

  // Generate topics
  const handleGenerateTopics = useCallback(async () => {
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
      payload.syllabusFiles = await buildFilePayload(syllabusFiles, { useOpenRouterFormat: true });
    }

    if (examFiles.length > 0) {
      payload.examFiles = await buildFilePayload(examFiles, { useOpenRouterFormat: true });
    }

    const MAX_RETRIES = 3;
    let lastError = null;
    const payloadStr = JSON.stringify(payload);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await authFetch(`/api/courses/topics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store",
          },
          body: payloadStr,
        });

        const { result } = await resolveAsyncJobResponse(res, { errorLabel: "build topics" });

        if (!result) {
          throw new Error("Topic generation completed but no result was returned.");
        }

        const parsed = parseTopicPayload(result);
        const maybeCourseId = resolveCourseId(result);
        if (maybeCourseId && !courseId) {
          setCourseId(maybeCourseId);
        }

        if (parsed.ragSessionId) {
          setRagSessionId(parsed.ragSessionId);
        }

        setGeneratedGrokDraft(parsed.extractedGrokDraft || buildGrokDraftPayload(parsed.hydrated));
        setOverviewTopics(parsed.hydrated);
        setTopicsError(null);
        setIsTopicsLoading(false);
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES) {
          continue;
        }
      }
    }

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
    examDetailsProvided,
    syllabusFiles,
    syllabusText,
    userId,
    studyMode,
    studyHours,
    studyMinutes,
    clearTopicsState,
  ]);

  // Modify topics
  const handleModifyTopics = useCallback(async (prompt) => {
    const trimmedPrompt = (prompt || topicModifyPrompt).trim();
    if (!trimmedPrompt) {
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
      const response = await authFetch(`/api/courses/modify-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
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

  // Generate course
  const handleGenerateCourse = useCallback(async () => {
    const allSubtopics = overviewTopics.flatMap((overview) => overview.subtopics);
    if (allSubtopics.length === 0) {
      setCourseGenerationError("Add at least one topic before creating the course.");
      return;
    }

    if (!userId) {
      setCourseGenerationError("You need to be signed in to create your course.");
      return;
    }

    const className = courseTitle.trim();

    if (!className) {
      setCourseGenerationError("Provide a course title before creating the course.");
      return;
    }

    const cleanTopics = allSubtopics
      .map((subtopic) => (typeof subtopic.title === "string" ? subtopic.title.trim() : ""))
      .filter(Boolean);

    if (cleanTopics.length === 0) {
      setCourseGenerationError("Your topic list is empty. Please add topics before creating the course.");
      return;
    }

    const cleanTopicSet = new Set(cleanTopics);

    const topicFamiliarityMap = allSubtopics.reduce((acc, subtopic) => {
      const title = typeof subtopic.title === "string" ? subtopic.title.trim() : "";
      if (!title || !cleanTopicSet.has(title)) return acc;
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
      setCourseGenerationError("Unable to map topic confidence. Please rebuild your topics.");
      return;
    }

    let navigationTriggered = false;
    const redirectToDashboard = () => {
      if (navigationTriggered) return;
      navigationTriggered = true;

      // Desktop app users go to dashboard, web users go to download
      router.push(getRedirectDestination("/dashboard"));

      const dispatchRefreshEvent = () => {
        try {
          window.dispatchEvent(new Event("courses:updated"));
        } catch {}
      };

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

    setCourseGenerating(true);
    setCourseGenerationError("");
    safeSetCourseGenerationMessage("Locking in your topic roadmap…");

    try {
      const finishByIso = new Date(Date.now() + (studyHours * 60 * 60 * 1000) + (studyMinutes * 60 * 1000)).toISOString();
      const trimmedSyllabusText = syllabusText.trim();
      const syllabusTextPayload = trimmedSyllabusText || "Not provided.";
      const examDetailsPayload = examDetailsProvided
        ? {
            type: examFiles.length > 0 ? "files" : "notes",
            notes: examNotes?.trim() || "Not provided.",
            has_exam_materials: examFiles.length > 0,
            sample_exam_file_names: examFiles.map((file) => file.name),
          }
        : { notes: "Not provided.", has_exam_materials: false };

      const payload = {
        userId,
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
        courseMetadata: {
          title: className,
          syllabus_text: syllabusTextPayload,
          exam_details: examDetailsPayload,
        },
        ...(ragSessionId && { rag_session_id: ragSessionId }),
      };

      if (Object.keys(topicFamiliarityMap).length === 0) {
        delete payload.topicFamiliarity;
      }

      payload.exam_details = examDetailsPayload;

      if (syllabusFiles.length > 0) {
        safeSetCourseGenerationMessage("Encoding syllabus materials…");
        const syllabusPayload = await buildFilePayload(syllabusFiles, { useOpenRouterFormat: true });
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
        const examPayload = await buildFilePayload(examFiles, { useOpenRouterFormat: true });
        if (examPayload.length > 0) {
          payload.examFiles = examPayload;
        }
      }

      safeSetCourseGenerationMessage("Creating course…");

      const secondsToComplete = (studyHours * 3600) + (studyMinutes * 60);
      payload.seconds_to_complete = secondsToComplete;

      const resolvedContentVersion = hasCheckedAdmin && isAdmin ? contentVersion : 1;
      payload.content_version = resolvedContentVersion;

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";
      const response = await authFetch(`${baseUrl}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
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

      redirectToDashboard();

      const dispatchRefreshEvent = () => {
        try {
          window.dispatchEvent(new Event("courses:updated"));
        } catch {}
      };

      dispatchRefreshEvent();
      setTimeout(dispatchRefreshEvent, 1000);
      setTimeout(dispatchRefreshEvent, 2000);
      setTimeout(dispatchRefreshEvent, 3000);
      setTimeout(dispatchRefreshEvent, 4000);

      if (onComplete) {
        onComplete({ courseId: resolveCourseId(body), jobId });
      }
    } catch (error) {
      if (!navigationTriggered) {
        setCourseGenerationError(error.message || "Unexpected error creating course.");
        setCourseGenerating(false);
        if (onError) {
          onError(error);
        }
      }
    }
  }, [
    overviewTopics,
    userId,
    courseTitle,
    collegeName,
    syllabusText,
    syllabusFiles,
    examNotes,
    examFiles,
    examDetailsProvided,
    generatedGrokDraft,
    ragSessionId,
    resolveSubtopicConfidence,
    router,
    contentVersion,
    hasCheckedAdmin,
    isAdmin,
    studyMode,
    studyHours,
    studyMinutes,
    onComplete,
    onError,
  ]);

  return {
    // Auth
    authStatus,
    userId,
    isAdmin,

    // Course metadata
    courseTitle,
    setCourseTitle,
    collegeName,
    setCollegeName,
    courseId,

    // Study mode
    studyMode,
    setStudyMode,
    studyHours,
    setStudyHours,
    studyMinutes,
    setStudyMinutes,
    studyTimeError,
    isCramMode,

    // Syllabus
    syllabusText,
    setSyllabusText,
    syllabusFiles,
    handleSyllabusFileChange,
    handleRemoveSyllabusFile,

    // Exam
    hasExamMaterials,
    setHasExamMaterials,
    examNotes,
    setExamNotes,
    examFiles,
    handleExamFileChange,
    handleRemoveExamFile,
    examDetailsProvided,

    // Topics
    overviewTopics,
    setOverviewTopics,
    moduleConfidenceState,
    openAccordions,
    deletedSubtopics,
    totalSubtopics,
    generatedGrokDraft,

    // Topic modification
    topicModifyPrompt,
    setTopicModifyPrompt,
    isModifyingTopics,
    topicModifyError,

    // Loading/error
    isTopicsLoading,
    topicsError,
    courseGenerating,
    courseGenerationError,
    courseGenerationMessage,

    // Manual topics
    newTopicTitle,
    setNewTopicTitle,
    newTopicRating,
    setNewTopicRating,
    cramTopicStrategy,
    setCramTopicStrategy,
    manualTopicsInput,
    setManualTopicsInput,

    // Computed
    canProceedFromStep1,
    canProceedFromStep2,
    canProceedFromStep3,
    canModifyTopics,
    canGenerateTopics,
    canCreateCourse,
    hasStudyTime,

    // Handlers
    handleModuleModeChange,
    handleAccordionToggle,
    handleDeleteSubtopic,
    handleDeleteAllSubtopics,
    handleRestoreSubtopic,
    handleRestoreAll,
    handleAddTopic,
    handleGenerateTopics,
    handleModifyTopics,
    handleGenerateCourse,
    resolveSubtopicConfidence,
    clearTopicsState,
    filterAcceptedFiles,

    // File types
    syllabusFileTypes,

    // Branching support - state snapshots
    getStateSnapshot: useCallback(() => ({
      courseTitle,
      collegeName,
      studyMode,
      studyHours,
      studyMinutes,
      syllabusText,
      examNotes,
      overviewTopics,
      moduleConfidenceState,
      // Note: File objects (syllabusFiles, examFiles) cannot be serialized
      // Files are treated as "committed" - not branch-able
    }), [
      courseTitle,
      collegeName,
      studyMode,
      studyHours,
      studyMinutes,
      syllabusText,
      examNotes,
      overviewTopics,
      moduleConfidenceState,
    ]),

    restoreStateSnapshot: useCallback((snapshot) => {
      if (!snapshot) return;
      setCourseTitle(snapshot.courseTitle ?? '');
      setCollegeName(snapshot.collegeName ?? '');
      setStudyMode(snapshot.studyMode ?? 'deep');
      setStudyHours(snapshot.studyHours ?? 5);
      setStudyMinutes(snapshot.studyMinutes ?? 0);
      setSyllabusText(snapshot.syllabusText ?? '');
      setExamNotes(snapshot.examNotes ?? '');
      setOverviewTopics(snapshot.overviewTopics ?? []);
      setModuleConfidenceState(snapshot.moduleConfidenceState ?? {});
    }, []),
  };
}

export default useCourseCreationFlow;
