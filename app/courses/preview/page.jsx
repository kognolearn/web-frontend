"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [completedNodes, setCompletedNodes] = useState(new Set());
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
    return data.nodes[activeNodeIndex];
  }, [data, activeNodeIndex]);

  const handleNodeCompletion = () => {
     if (!currentNode) return;
     
     setCompletedNodes(prev => {
         const next = new Set(prev);
         next.add(currentNode.id);
         return next;
     });

     // If this is the last node, show modal
     if (activeNodeIndex === (data.nodes.length - 1)) {
         setTimeout(() => setShowModal(true), 1000);
     } else {
         // Auto-advance or let user click? Let's just mark complete for now.
         // Maybe show a "Next" button?
         // For the MVP, let's assume one big lesson node.
         setTimeout(() => setShowModal(true), 1000);
     }
  };

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
                <LessonPreviewRenderer 
                    data={currentNode.data} 
                    format={currentNode.type || 'reading'}
                    onReadingCompleted={handleNodeCompletion}
                    onVideoViewed={handleNodeCompletion}
                    onQuizCompleted={handleNodeCompletion}
                    onFlashcardsCompleted={handleNodeCompletion}
                />
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
