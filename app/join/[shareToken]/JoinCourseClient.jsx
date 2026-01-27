"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { getRedirectDestination } from "@/lib/platform";
import { clearJoinIntent, storeJoinIntent } from "@/lib/join-intent";

export default function JoinCourseClient() {
  const router = useRouter();
  const params = useParams();
  const shareToken = params.shareToken;

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [shareInfo, setShareInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!shareToken || authLoading) return;
    if (!user) {
      storeJoinIntent(shareToken);
      setRedirecting(true);
      router.replace(`/?redirectTo=${encodeURIComponent(`/join/${shareToken}`)}&joinCourse=1`);
      return;
    }
    clearJoinIntent();
    setRedirecting(false);
  }, [authLoading, router, shareToken, user]);

  useEffect(() => {
    if (!shareToken || authLoading || !user) return;
    fetchShareInfo();
  }, [authLoading, shareToken, user]);

  const fetchShareInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`/api/courses/share/${shareToken}`, {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid share link");
      }

      setShareInfo(data);
    } catch (err) {
      console.error("Error fetching share info:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      storeJoinIntent(shareToken);
      router.replace(`/?redirectTo=${encodeURIComponent(`/join/${shareToken}`)}&joinCourse=1`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await authFetch(`/api/courses/join/${shareToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join course");
      }

      router.push(getRedirectDestination(`/courses/${data.courseId}`));
    } catch (err) {
      console.error("Error joining course:", err);
      setError(err.message);
      setJoining(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md w-full bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[var(--primary)] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Create your account to join</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Redirecting you to sign up...
          </p>
          <Link
            href={`/auth/sign-in?redirectTo=${encodeURIComponent(`/join/${shareToken}`)}`}
            className="inline-block px-6 py-3 text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <svg className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-[var(--muted-foreground)]">Loading share info...</p>
        </div>
      </div>
    );
  }

  if (error && !shareInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md w-full bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Invalid Link</h1>
          <p className="text-[var(--muted-foreground)] mb-6">{error}</p>
          <Link
            href="/download"
            className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Download the App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="max-w-md w-full bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[var(--primary)]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Join Study Group</h1>
          <p className="text-[var(--muted-foreground)]">
            You've been invited to join a course and study group
          </p>
        </div>

        {shareInfo?.course && (
          <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-1">{shareInfo.course.title}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Join to study together with your own progress tracking
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center mb-6">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {user ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Joining...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Join Course & Study Group
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In to Join
            </button>
          )}

          <Link
            href="/download"
            className="block w-full py-3 px-4 text-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </Link>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] text-center mt-6">
          By joining, you'll get access to the shared course and can track your own progress while participating in the study group.
        </p>
      </div>

    </div>
  );
}
