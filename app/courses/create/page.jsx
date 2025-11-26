"use client";

import { Suspense, useCallback, useEffect, useId, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme/ThemeToggle";

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
  scoreToFamiliarityBand,
  importanceScoreToTag,
  formatStudyTime
} from "./utils";
import TopicExplorer from "@/components/courses/TopicExplorer";
import { motion } from "framer-motion";

const searchDebounceMs = 350;
const syllabusFileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
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
  focus,
  bloomLevel,
  estimatedStudyTimeMinutes,
  importanceScore,
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
    focus,
    bloomLevel,
    estimatedStudyTimeMinutes,
    importanceScore,
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
          focus: subtopic?.focus,
          bloomLevel: subtopic?.bloomLevel,
          estimatedStudyTimeMinutes: subtopic?.estimatedStudyTimeMinutes,
          importanceScore: subtopic?.importanceScore,
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
        focus: topic?.focus,
        bloomLevel: topic?.bloom_level || topic?.bloomLevel,
        estimatedStudyTimeMinutes: Number.isFinite(topic?.estimatedStudyTimeMinutes)
          ? topic.estimatedStudyTimeMinutes
          : Number.isFinite(topic?.estimated_study_time_minutes)
          ? topic.estimated_study_time_minutes
          : undefined,
        importanceScore: Number.isFinite(topic?.importanceScore)
          ? topic.importanceScore
          : Number.isFinite(topic?.importance_score)
          ? topic.importance_score
          : undefined,
        examRelevanceReasoning:
          topic?.exam_relevance_reasoning || topic?.examRelevanceReasoning || "",
      };
    })
    .filter(Boolean);
  if (!normalized.length) return null;
  return { topics: normalized };
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
  const [studyHours, setStudyHours] = useState(50);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const syllabusInputId = useId();
  const examInputId = useId();

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
  const [moduleConfidenceState, setModuleConfidenceState] = useState({});
  const [openAccordions, setOpenAccordions] = useState({});
  const [generatedGrokDraft, setGeneratedGrokDraft] = useState(null);
  const [deletedSubtopics, setDeletedSubtopics] = useState([]);
  // Approval step removed; rely on topic count checks instead

  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicRating, setNewTopicRating] = useState(defaultTopicRating);

  const [courseGenerating, setCourseGenerating] = useState(false);
  const [courseGenerationError, setCourseGenerationError] = useState("");
  const [courseGenerationMessage, setCourseGenerationMessage] = useState("Preparing your personalized course plan…");

  const totalSubtopics = useMemo(
    () => overviewTopics.reduce((sum, overview) => sum + overview.subtopics.length, 0),
    [overviewTopics]
  );

  const canProceedFromStep1 = courseTitle.trim() && collegeName.trim() && studyHours >= 0 && studyMinutes >= 0;
  const examDetailsProvided = hasExamMaterials || examFiles.length > 0 || (examNotes && examNotes.trim());
  const canProceedFromStep2 = true; // Always allow proceeding from step 2
  const canProceedFromStep3 = totalSubtopics > 0;

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
    setCourseGenerationError("");
    setOverviewTopics([]);
    setDeletedSubtopics([]);
    setGeneratedGrokDraft(null);
    setModuleConfidenceState({});
    setOpenAccordions({});

    const finishByIso = new Date(Date.now() + (studyHours * 60 * 60 * 1000) + (studyMinutes * 60 * 1000)).toISOString();
    const payload = {
      userId,
      courseTitle: trimmedTitle,
      university: collegeName.trim() || undefined,
      finishByDate: finishByIso || undefined,
      syllabusText: syllabusText.trim() || "Not provided.",
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
                // new metadata from backend
                focus: subtopic?.focus || subtopic?.focus || subtopic?.category || undefined,
                bloomLevel: subtopic?.bloom_level || subtopic?.bloomLevel || undefined,
                estimatedStudyTimeMinutes: Number.isFinite(subtopic?.estimated_study_time_minutes)
                  ? subtopic.estimated_study_time_minutes
                  : Number.isFinite(subtopic?.estimatedStudyTimeMinutes)
                  ? subtopic.estimatedStudyTimeMinutes
                  : undefined,
                importanceScore:
                  Number.isFinite(subtopic?.importance_score) || Number.isFinite(subtopic?.importanceScore)
                    ? Number(subtopic?.importance_score ?? subtopic?.importanceScore)
                    : undefined,
                examRelevanceReasoning: subtopic?.exam_relevance_reasoning || subtopic?.examRelevanceReasoning || "",
            })
          ),
        };
      });

      const totalSubtopics = hydrated.reduce((sum, ot) => sum + ot.subtopics.length, 0);
      console.log("Total subtopics after hydration:", totalSubtopics);
      if (totalSubtopics === 0) {
        throw new Error("The model did not return any topics. Please try again.");
      }

      setGeneratedGrokDraft(extractedGrokDraft || buildGrokDraftPayload(hydrated));
      setOverviewTopics(hydrated);
      setTopicsError(null);
    } catch (error) {
      console.error(error);
      setOverviewTopics([]);
      setDeletedSubtopics([]);
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
    hasExamMaterials,
    syllabusFiles,
    syllabusText,
    userId,
    confirmedNoExamDetails,
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
        focus: "Manual",
        bloomLevel: "Understand",
        estimatedStudyTimeMinutes: 20,
        importanceScore: 5,
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
    console.debug("[CreateCourse] handleGenerateCourse called", {
      totalSubtopics: overviewTopics.flatMap((overview) => overview.subtopics).length,
      userId,
      courseTitle,
      courseId,
      courseGenerating,
    });
    const allSubtopics = overviewTopics.flatMap((overview) => overview.subtopics);
    if (allSubtopics.length === 0) {
      setCourseGenerationError("Generate or add at least one topic before generating the course.");
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
      setCourseGenerationError("Topics are missing identifiers. Please regenerate and try again.");
      return;
    }

    const userConfidenceMap = allSubtopics.reduce((acc, subtopic) => {
      const id = typeof subtopic.id === "string" ? subtopic.id.trim() : "";
      if (!id) return acc;
      acc[id] = resolveSubtopicConfidence(subtopic.overviewId, subtopic.id);
      return acc;
    }, {});

    if (Object.keys(userConfidenceMap).length === 0) {
      setCourseGenerationError("Unable to map topic confidence. Please regenerate your topics.");
      return;
    }

    setCourseGenerating(true);
    setCourseGenerationError("");
    setCourseGenerationMessage("Locking in your topic roadmap…");

    try {
      const finishByIso = new Date(Date.now() + (studyHours * 60 * 60 * 1000) + (studyMinutes * 60 * 1000)).toISOString();
      const trimmedSyllabusText = syllabusText.trim();
      const syllabusTextPayload = trimmedSyllabusText || "Not provided.";
      const examDetailsPayload = examDetailsProvided
        ? {
            type: examFormat,
            notes: examNotes?.trim() || "Not provided.",
            has_exam_materials: true,
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
        // Course metadata for downstream workers and DB. Keep top-level keys for backwards compatibility.
        courseMetadata: {
          title: className,
          syllabus_text: syllabusTextPayload,
          exam_details: examDetailsPayload,
          startDate: toIsoDate(startDate) || undefined,
          endDate: finishByIso || undefined,
        },
      };

      if (Object.keys(topicFamiliarityMap).length === 0) {
        delete payload.topicFamiliarity;
      }

      payload.exam_details = examDetailsPayload;

      if (syllabusFiles.length > 0) {
        setCourseGenerationMessage("Encoding syllabus materials…");
        const syllabusPayload = await buildFilePayload(syllabusFiles);
        if (syllabusPayload.length > 0) {
          payload.syllabusFiles = syllabusPayload;
        }
      }

      const examFormatDetails = formatExamStructure({ hasExamMaterials: examDetailsProvided, examFormat, examNotes: examNotes?.trim() || "Not provided." });
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
      
      // Calculate seconds_to_complete from studyHours and studyMinutes
      const secondsToComplete = (studyHours * 3600) + (studyMinutes * 60);
      payload.seconds_to_complete = secondsToComplete;
      
      // Server will enforce a 30 minute timeout for long-running course generation
      // Client-side AbortController to cancel request after 30 minutes
      const controller = new AbortController();
      const timeoutMs = 30 * 60 * 1000; // 30 minutes
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
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
        setCourseGenerationError("Course generation timed out after 30 minutes. Please try again.");
      } else {
        setCourseGenerationError(error.message || "Unexpected error generating course.");
      }
    } finally {
      try {
        clearTimeout(timeoutHandle);
      } catch {}
      setCourseGenerating(false);
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
    examFormat,
    examNotes,
    examFiles,
    examDetailsProvided,
    confirmedNoExamDetails,
    generatedGrokDraft,
    resolveSubtopicConfidence,
    router,
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
    { number: 3, title: "Generate Topics", description: "AI-powered topics" },
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
          <div className="card max-w-md w-full rounded-2xl px-6 py-8 text-center shadow-2xl">
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-[var(--surface-muted)] border-t-[var(--primary)] animate-spin" aria-hidden="true" />
            <h2 className="mt-5 text-lg font-bold text-[var(--foreground)]">Generating your course</h2>
            <p className="mt-2 text-xs text-[var(--muted-foreground)] animate-pulse">{courseGenerationMessage}</p>
            <p className="mt-3 text-[10px] text-[var(--muted-foreground)]">
              Creating a personalized learning plan tailored to your goals.
            </p>
          </div>
        </div>
      )}

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
                    <label className="block text-sm font-semibold mb-1.5">University / Institution *</label>
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
                    <label className="block text-sm font-semibold mb-1.5">Course Name *</label>
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

                {/* Study Time */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Study Hours *</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={studyHours}
                      onChange={(e) => setStudyHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Study Minutes *</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={studyMinutes}
                      onChange={(e) => setStudyMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20"
                      required
                    />
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
                  onClick={() => setCurrentStep(2)}
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
                    <h3 className="font-semibold text-sm mb-0.5">Syllabus</h3>
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
                      className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-1)] px-4 py-6 cursor-pointer transition hover:border-[var(--primary)] hover:bg-[var(--surface-2)]/50"
                    >
                      <svg className="h-8 w-8 text-[var(--muted-foreground)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-[var(--muted-foreground)]">PDF, DOC, DOCX, PPT, PPTX, or TXT</p>
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

                {/* Exam Materials Section */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm">Exam Details</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--info)]/20 font-semibold" style={{color: 'var(--info)'}}>Recommended</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">Share exam details to create better practice problems and study material</p>
                  </div>

                  <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-2">Upload Sample Exams</label>
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
                          className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-1)] px-4 py-6 cursor-pointer transition hover:border-[var(--primary)] hover:bg-[var(--surface-2)]/50"
                        >
                          <svg className="h-8 w-8 text-[var(--muted-foreground)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm font-medium text-[var(--foreground)] mb-1">Click to upload or drag and drop</p>
                          <p className="text-xs text-[var(--muted-foreground)]">Past Exams, Practice Tests, or Study Guides</p>
                        </label>
                        
                        {examFiles.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">{examFiles.length} file{examFiles.length !== 1 ? 's' : ''} uploaded</p>
                            <div className="space-y-2">
                              {examFiles.map((file) => (
                                <div key={file.name} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <svg className="h-4 w-4 text-[var(--info)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

                      <div>
                        <label className="block text-xs font-semibold mb-1.5">Additional Notes</label>
                        <textarea
                          rows={3}
                          value={examNotes}
                          onChange={(event) => setExamNotes(event.target.value)}
                          placeholder="Share timing, scoring, or question style preferences..."
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20 resize-none overflow-y-auto"
                          style={{ minHeight: '4.5rem', maxHeight: '10rem' }}
                          onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                          }}
                        />
                      </div>
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
                      <h2 className="text-xl font-bold mb-1">Generate Study Topics</h2>
                      <p className="text-sm text-[var(--muted-foreground)]">Let AI create a personalized topic list for your course</p>
                    </div>
                    {/* Top buttons removed */}
                  </div>
                </div>

              {!isTopicsLoading && totalSubtopics === 0 && (
                <div className="text-center py-10 px-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <svg className="h-7 w-7 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold mb-1.5">Ready to Generate Topics</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mb-5 max-w-md mx-auto">
                    AI will analyze your course details and create a comprehensive topic list
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
                    Generate Topics
                  </button>
                </div>
              )}

              {isTopicsLoading && (
                <div className="space-y-5 py-6 px-5">
                  {/* Animated pulse header */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] animate-pulse"></div>
                      <h3 className="text-base font-semibold">Analyzing your course materials...</h3>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--info)]/10 border border-[var(--info)]/30">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--info)] animate-pulse"></div>
                      <span className="text-xs text-[var(--muted-foreground)]">30-60 seconds</span>
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
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div>
                      <h3 className="text-lg font-bold">{totalSubtopics} Topics Generated</h3>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Review and customize your learning path
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateTopics}
                      className="btn btn-outline btn-sm"
                      disabled={isTopicsLoading}
                    >
                      Regenerate
                    </button>
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
                </motion.div>
              )}

              {/* Navigation - Sticky Bottom */}
              <div ref={bottomNavCallback} className={`flex items-center justify-between pt-5 border-t border-[var(--border)] ${totalSubtopics > 0 ? "sticky bottom-0 z-10 pb-2" : "mt-6"}`}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-outline btn-sm"
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
                  className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {courseGenerating ? "Creating..." : "Create Course"}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
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
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--muted-foreground)] shadow-lg transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
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
            {isOnFinalStep ? (
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
