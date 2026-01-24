"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "@/lib/api";
import PostList from "./PostList";
import PostEditor from "./PostEditor";
import PinnedPostsBanner from "./PinnedPostsBanner";
import SortDropdown from "./SortDropdown";

export default function DiscussionTab({
  studyGroupId,
  currentUserId,
  memberCount = 0,
  onShareRequested,
  initialPostId = null,
}) {
  const [posts, setPosts] = useState([]);
  const [groupPins, setGroupPins] = useState([]);
  const [personalPins, setPersonalPins] = useState([]);
  const [pinVotes, setPinVotes] = useState([]);
  const [pinVotesLoading, setPinVotesLoading] = useState(false);
  const [highlightPostId, setHighlightPostId] = useState(initialPostId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [timeRange, setTimeRange] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [showEditor, setShowEditor] = useState(false);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    if (!studyGroupId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
        sortBy,
        ...(sortBy === "top" && { timeRange }),
      });

      const res = await authFetch(`/api/community/groups/${studyGroupId}/posts?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.error?.toLowerCase().includes('banned')) {
          setIsBanned(true);
          return;
        }
        throw new Error(data.error || "Failed to fetch posts");
      }

      const data = await res.json();

      if (append) {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      } else {
        setPosts(data.posts || []);
      }
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyGroupId, sortBy, timeRange]);

  const fetchPinnedPosts = useCallback(async () => {
    if (!studyGroupId) return;

    try {
      const res = await authFetch(`/api/pins/groups/${studyGroupId}`);
      if (!res.ok) throw new Error("Failed to fetch pinned posts");

      const data = await res.json();
      setGroupPins(data.groupPins || []);
      setPersonalPins(data.personalPins || []);
    } catch (err) {
      console.error("Error fetching pinned posts:", err);
    }
  }, [studyGroupId]);

  const fetchPinVotes = useCallback(async () => {
    if (!studyGroupId) return;

    try {
      setPinVotesLoading(true);
      const res = await authFetch(`/api/pins/groups/${studyGroupId}/votes`);
      if (!res.ok) throw new Error("Failed to fetch pin votes");
      const data = await res.json();
      setPinVotes(data.votes || []);
    } catch (err) {
      console.error("Error fetching pin votes:", err);
    } finally {
      setPinVotesLoading(false);
    }
  }, [studyGroupId]);

  useEffect(() => {
    fetchPosts(1);
    fetchPinnedPosts();
    fetchPinVotes();
  }, [fetchPosts, fetchPinnedPosts, fetchPinVotes]);

  useEffect(() => {
    setHighlightPostId(initialPostId);
  }, [initialPostId]);

  useEffect(() => {
    if (!studyGroupId || !initialPostId) return;

    const fetchHighlightedPost = async () => {
      try {
        const res = await authFetch(`/api/community/groups/${studyGroupId}/posts/${initialPostId}`);
        if (!res.ok) return;
        const data = await res.json();
        const highlightedPost = data.post;
        if (!highlightedPost) return;

        setPosts((prev) => {
          const exists = prev.some((p) => p.id === highlightedPost.id);
          return exists ? prev : [highlightedPost, ...prev];
        });
      } catch (err) {
        console.error("Error fetching highlighted post:", err);
      }
    };

    fetchHighlightedPost();
  }, [studyGroupId, initialPostId]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setTotal(prev => prev + 1);
    setShowEditor(false);
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setTotal(prev => prev - 1);
  };

  const handleVoteUpdate = (postId, newScore, userVote) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, score: newScore, userVote } : p
    ));
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchPosts(page + 1, true);
    }
  };

  const handleSortChange = (newSort, newTimeRange) => {
    setSortBy(newSort);
    if (newTimeRange) setTimeRange(newTimeRange);
    setPage(1);
  };

  const activePinPostIds = useMemo(
    () => new Set((pinVotes || []).map((vote) => vote.postId)),
    [pinVotes]
  );
  const personalPinnedPostIds = useMemo(
    () => new Set((personalPins || []).map((pin) => pin.postId)),
    [personalPins]
  );
  const groupPinnedPostIds = useMemo(
    () => new Set((groupPins || []).map((pin) => pin.postId)),
    [groupPins]
  );

  const handleNominatePin = async (postId) => {
    try {
      const res = await authFetch(`/api/pins/groups/${studyGroupId}/posts/${postId}/nominate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to nominate post");
      }
      await fetchPinVotes();
    } catch (err) {
      console.error("Error nominating post:", err);
      alert(err.message || "Failed to nominate post");
    }
  };

  const handleVoteOnPin = async (postId, pinVoteId, vote) => {
    try {
      const res = await authFetch(`/api/pins/groups/${studyGroupId}/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinVoteId, vote }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to vote on pin");
      }
      await Promise.all([fetchPinVotes(), fetchPinnedPosts()]);
    } catch (err) {
      console.error("Error voting on pin:", err);
      const message = err?.message || "Failed to vote on pin";
      if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("no longer active")) {
        await Promise.all([fetchPinVotes(), fetchPinnedPosts()]);
      }
      alert(message);
    }
  };

  const handlePersonalPinToggle = async (postId, isPinned) => {
    try {
      const res = isPinned
        ? await authFetch(`/api/pins/personal/${postId}?studyGroupId=${studyGroupId}`, {
            method: "DELETE",
          })
        : await authFetch(`/api/pins/personal/${postId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studyGroupId }),
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update pin");
      }
      await fetchPinnedPosts();
    } catch (err) {
      console.error("Error updating personal pin:", err);
      alert(err.message || "Failed to update pin");
    }
  };

  const isSoloGroup = memberCount <= 1;

  // Banned state UI
  if (isBanned) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">Access Restricted</h3>
        <p className="text-[var(--muted-foreground)] max-w-sm mb-6 leading-relaxed">
          You have been restricted from participating in social features for this study group due to a violation of community guidelines.
        </p>
        <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] max-w-sm">
          <p className="text-sm text-[var(--muted-foreground)]">
            If you believe this is a mistake, please contact support at{" "}
            <a href="mailto:team@kognolearn.com" className="text-[var(--primary)] hover:underline">
              team@kognolearn.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (!studyGroupId || isSoloGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No one here yet</h3>
        <p className="text-[var(--muted-foreground)] max-w-sm">
          No one here yet &mdash; share this course with others to work on it together.
        </p>
        {onShareRequested && (
          <button
            onClick={onShareRequested}
            className="mt-4 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Share Course
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Discussion</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{total} post{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown
            sortBy={sortBy}
            timeRange={timeRange}
            onChange={handleSortChange}
          />
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </button>
        </div>
      </div>

      {/* Pinned posts */}
      {(groupPins.length > 0 || personalPins.length > 0) && (
        <PinnedPostsBanner
          groupPins={groupPins}
          personalPins={personalPins}
        />
      )}

      {/* Active pin votes */}
      {pinVotes.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-500/10 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Active Pin Votes</h3>
              </div>
              {pinVotesLoading && (
                <span className="text-xs text-[var(--muted-foreground)] animate-pulse">Updating...</span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {pinVotes.map((vote) => {
              const yesCount = vote.voteCount?.yes || 0;
              const noCount = vote.voteCount?.no || 0;
              const totalVotes = yesCount + noCount;
              const deadline = vote.voteDeadline ? new Date(vote.voteDeadline) : null;
              const hoursLeft = deadline
                ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60)))
                : null;
              const yesPercent = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 50;
              return (
                <div key={vote.id} className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-semibold text-[var(--primary)]">
                          {vote.post?.author?.displayName?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {vote.post?.author?.displayName || "Unknown"}
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            nominated by {vote.nominatedBy?.displayName || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--foreground)] line-clamp-2 mb-3">
                        {vote.post?.content}
                      </p>
                      {/* Vote progress bar */}
                      <div className="space-y-1.5">
                        <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                            style={{ width: `${yesPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                          <span>{yesCount} yes / {noCount} no</span>
                          {hoursLeft !== null && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {hoursLeft}h left
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleVoteOnPin(vote.postId, vote.id, true)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                          vote.userVote === true
                            ? "bg-green-500 text-white shadow-sm"
                            : "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-green-500/20 hover:text-green-600"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleVoteOnPin(vote.postId, vote.id, false)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                          vote.userVote === false
                            ? "bg-red-500 text-white shadow-sm"
                            : "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-red-500/20 hover:text-red-600"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-2xl w-full p-6">
            <button
              onClick={() => setShowEditor(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-1">Create Post</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Share your thoughts with the study group</p>
            <PostEditor
              studyGroupId={studyGroupId}
              onPostCreated={handlePostCreated}
              onCancel={() => setShowEditor(false)}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Posts list */}
      <PostList
        posts={posts}
        loading={loading}
        studyGroupId={studyGroupId}
        currentUserId={currentUserId}
        onPostDeleted={handlePostDeleted}
        onVoteUpdate={handleVoteUpdate}
        onRefresh={() => fetchPosts(1)}
        onNominatePin={handleNominatePin}
        onPersonalPinToggle={handlePersonalPinToggle}
        activePinPostIds={activePinPostIds}
        groupPinnedPostIds={groupPinnedPostIds}
        personalPinnedPostIds={personalPinnedPostIds}
        highlightedPostId={highlightPostId}
      />

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-8 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl transition-all border border-[var(--primary)]/20 hover:border-[var(--primary)]/40 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : "Load More Posts"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-[var(--primary)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No posts yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm">Be the first to start a discussion with your study group!</p>
          <button
            onClick={() => setShowEditor(true)}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create First Post
          </button>
        </div>
      )}
    </div>
  );
}
