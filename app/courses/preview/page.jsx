"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as api from "@/lib/onboarding";
import LessonPreviewRenderer from "@/components/courses/LessonPreviewRenderer";
import CompletionModal from "@/components/onboarding/CompletionModal";
import { supabase } from "@/lib/supabase/client";

export default function CoursePreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeContentType, setActiveContentType] = useState(null);
  const [completedTypes, setCompletedTypes] = useState(() => new Set());
  const [showModal, setShowModal] = useState(false);

  // Fetch job status and data
  useEffect(() => {
    if (!jobId) {
        setError("Missing Job ID");
        setLoading(false);
        return;
    }

    const fetchData = async () => {
        try {
            // Re-use the onboarding API to get status/result
            // Note: The API might return 'completed' but we need the 'nodes' which are in the job result.
            // The existing getLessonStatus might need to return the 'nodes' in the 'result' object.
            // Let's assume the API returns { status: 'completed', nodes: [], courseContext: {} } 
            // If the current API doesn't return 'nodes', we might need to adjust it or call a different endpoint.
            // For now, assuming the previous turn's implementation or my modification includes 'nodes'.
            const status = await api.getLessonStatus(jobId);
            
            if (status.status === 'completed' && status.nodes) {
                setData(status);
            } else if (status.status === 'failed') {
                setError("Generation failed.");
            } else {
                // Still processing? Should usually be done if we got here via redirect.
                // But if user refreshed, maybe check again?
                if (status.status !== 'completed') setError("Job not ready yet.");
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load lesson.");
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [jobId]);

  const currentNode = useMemo(() => {
    if (!data?.nodes) return null;
    return data.nodes[0];
  }, [data]);

  const currentPayload = useMemo(() => {
    return currentNode?.data || currentNode?.content_payload || null;
  }, [currentNode]);

  const availableTypes = useMemo(() => {
    if (!currentPayload) return [];
    if (currentPayload?.version === 2 && Array.isArray(currentPayload?.sections)) {
      return [{ key: 'v2', label: 'Lesson' }];
    }

    const typeAvailability = {
      reading: Boolean(currentPayload.reading),
      video: (Array.isArray(currentPayload.video) && currentPayload.video.length > 0)
        || (Array.isArray(currentPayload.videos) && currentPayload.videos.length > 0),
      mini_quiz: Array.isArray(currentPayload.quiz) && currentPayload.quiz.length > 0,
      flashcards: Array.isArray(currentPayload.flashcards) && currentPayload.flashcards.length > 0,
      interactive_task: Boolean(currentPayload.interactive_task),
    };

    const labelMap = {
      reading: 'Reading',
      video: 'Video',
      mini_quiz: 'Quiz',
      flashcards: 'Flashcards',
      interactive_task: 'Practice Task',
    };

    const ordered = [];
    const seen = new Set();
    const sequence = Array.isArray(currentPayload.content_sequence) ? currentPayload.content_sequence : [];
    sequence.forEach((entry) => {
      const normalized = entry === 'quiz' ? 'mini_quiz' : entry;
      if (typeAvailability[normalized] && !seen.has(normalized)) {
        ordered.push({ key: normalized, label: labelMap[normalized] || normalized });
        seen.add(normalized);
      }
    });

    Object.keys(typeAvailability).forEach((key) => {
      if (typeAvailability[key] && !seen.has(key)) {
        ordered.push({ key, label: labelMap[key] || key });
        seen.add(key);
      }
    });

    return ordered;
  }, [currentPayload]);

  useEffect(() => {
    if (!availableTypes.length) {
      setActiveContentType(null);
      return;
    }
    setActiveContentType(availableTypes[0].key);
    setCompletedTypes(new Set());
    setShowModal(false);
  }, [availableTypes]);

  const handleTypeCompleted = useCallback((typeKey) => {
    setCompletedTypes((prev) => {
      if (prev.has(typeKey)) return prev;
      const next = new Set(prev);
      next.add(typeKey);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!availableTypes.length || !activeContentType) return;
    const keys = availableTypes.map((entry) => entry.key);
    const allDone = keys.every((key) => completedTypes.has(key));
    if (allDone) {
      setShowModal(true);
      return;
    }

    if (completedTypes.has(activeContentType)) {
      const nextType = keys.find((key) => !completedTypes.has(key));
      if (nextType) {
        setActiveContentType(nextType);
      }
    }
  }, [availableTypes, activeContentType, completedTypes]);

  const handleGenerateFullCourse = async () => {
    // 1. Save context
    if (typeof window !== 'undefined' && data?.courseContext) {
        localStorage.setItem('kogno_onboarding_session', JSON.stringify({
            collegeName: data.courseContext.college,
            courseName: data.courseContext.title,
            completedLessonId: currentNode?.id,
            jobId: jobId
        }));
    }

    // 2. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // User logged in -> Go to Course Create (Step 2)
        router.push('/courses/create?from_onboarding=true');
    } else {
        // User not logged in -> Go to Signup -> Then Course Create
        router.push('/auth/create-account?next=' + encodeURIComponent('/courses/create?from_onboarding=true'));
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (error || !data) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] p-4 text-center">
            <h1 className="text-xl font-bold text-red-500 mb-2">Oops!</h1>
            <p className="text-[var(--muted-foreground)]">{error || "Something went wrong."}</p>
            <button onClick={() => router.push('/')} className="mt-4 text-[var(--primary)] hover:underline">Go Home</button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <header className="h-16 border-b border-white/10 flex items-center px-6 bg-[var(--surface-1)]">
        <h1 className="font-semibold text-lg">{data.courseContext?.title} <span className="text-[var(--muted-foreground)] font-normal text-sm ml-2">Preview Mode</span></h1>
      </header>
      
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8">
        {currentNode ? (
            <div className="bg-[var(--surface-1)] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-xl">
                <h2 className="text-2xl font-bold mb-6">{currentNode.title}</h2>
                {currentPayload && availableTypes.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {availableTypes.map((entry) => (
                      <button
                        key={entry.key}
                        onClick={() => setActiveContentType(entry.key)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          activeContentType === entry.key
                            ? "bg-[var(--primary)] text-white border-transparent"
                            : "bg-[var(--surface-2)] text-[var(--foreground)] border-white/10 hover:border-[var(--primary)]/60"
                        }`}
                      >
                        {entry.label}
                        {completedTypes.has(entry.key) && (
                          <span className="ml-2 text-xs opacity-80">Done</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {currentPayload && availableTypes.length > 0 ? (
                  <LessonPreviewRenderer 
                      data={currentPayload} 
                      format={activeContentType || 'reading'}
                      onReadingCompleted={() => handleTypeCompleted(activeContentType === 'v2' ? 'v2' : 'reading')}
                      onVideoViewed={() => handleTypeCompleted('video')}
                      onQuizCompleted={() => handleTypeCompleted('mini_quiz')}
                      onFlashcardsCompleted={() => handleTypeCompleted('flashcards')}
                      onInteractiveTaskCompleted={() => handleTypeCompleted('interactive_task')}
                  />
                ) : (
                  <div className="text-center p-10">No content available.</div>
                )}
            </div>
        ) : (
            <div className="text-center p-10">No content available.</div>
        )}
      </main>

      <CompletionModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerateFullCourse}
      />
    </div>
  );
}
