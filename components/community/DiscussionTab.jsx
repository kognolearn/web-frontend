"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import PostList from "./PostList";
import PostEditor from "./PostEditor";
import PinnedPostsBanner from "./PinnedPostsBanner";
import SortDropdown from "./SortDropdown";

export default function DiscussionTab({ studyGroupId, currentUserId }) {
  const [posts, setPosts] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      if (!res.ok) throw new Error("Failed to fetch posts");

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
      setPinnedPosts(data.pinnedPosts || []);
    } catch (err) {
      console.error("Error fetching pinned posts:", err);
    }
  }, [studyGroupId]);

  useEffect(() => {
    fetchPosts(1);
    fetchPinnedPosts();
  }, [fetchPosts, fetchPinnedPosts]);

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

  if (!studyGroupId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No one here yet</h3>
        <p className="text-[var(--muted-foreground)] max-w-sm">
          Share this course with friends to start discussions and study together.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Discussion</h2>
        <div className="flex items-center gap-3">
          <SortDropdown
            sortBy={sortBy}
            timeRange={timeRange}
            onChange={handleSortChange}
          />
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </button>
        </div>
      </div>

      {/* Pinned posts */}
      {pinnedPosts.length > 0 && (
        <PinnedPostsBanner
          posts={pinnedPosts}
          studyGroupId={studyGroupId}
          currentUserId={currentUserId}
        />
      )}

      {/* Post editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-2xl w-full p-6">
            <button
              onClick={() => setShowEditor(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Create Post</h3>
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
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
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
      />

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No posts yet</h3>
          <p className="text-[var(--muted-foreground)] mb-4">Be the first to start a discussion!</p>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Create First Post
          </button>
        </div>
      )}
    </div>
  );
}
