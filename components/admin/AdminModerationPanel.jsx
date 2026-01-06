"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";

export default function AdminModerationPanel() {
  const [activeSubTab, setActiveSubTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingBans, setLoadingBans] = useState(true);
  const [reportsPage, setReportsPage] = useState(1);
  const [bansPage, setBansPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [bansTotalPages, setBansTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");

  const fetchReports = useCallback(async (page = 1) => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await authFetch(`/api/moderation/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports || []);
      setReportsTotalPages(Math.ceil((data.total || 0) / 20));
      setReportsPage(page);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, [statusFilter]);

  const fetchBans = useCallback(async (page = 1) => {
    setLoadingBans(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      const res = await authFetch(`/api/moderation/bans?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bans");
      const data = await res.json();
      setBans(data.bans || []);
      setBansTotalPages(Math.ceil((data.total || 0) / 20));
      setBansPage(page);
    } catch (err) {
      console.error("Error fetching bans:", err);
    } finally {
      setLoadingBans(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === "reports") {
      fetchReports(1);
    } else {
      fetchBans(1);
    }
  }, [activeSubTab, fetchReports, fetchBans]);

  useEffect(() => {
    if (activeSubTab === "reports") {
      fetchReports(1);
    }
  }, [statusFilter, fetchReports]);

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      const res = await authFetch(`/api/moderation/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      fetchReports(reportsPage);
    } catch (err) {
      console.error("Error updating report:", err);
      alert("Failed to update report status");
    }
  };

  const handleDeletePost = async (postId, reportId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await authFetch(`/api/moderation/posts/${postId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete post");
      fetchReports(reportsPage);
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post");
    }
  };

  const handleBanUser = async (userId, studyGroupId) => {
    const reason = prompt("Reason for ban (optional):") || null;
    try {
      const res = await authFetch(`/api/moderation/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, studyGroupId }),
      });
      if (!res.ok) throw new Error("Failed to ban user");
      fetchReports(reportsPage);
      fetchBans(bansPage);
    } catch (err) {
      console.error("Error banning user:", err);
      alert("Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId) => {
    if (!confirm("Are you sure you want to unban this user?")) return;
    try {
      const res = await authFetch(`/api/moderation/users/${userId}/ban`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unban user");
      fetchBans(bansPage);
    } catch (err) {
      console.error("Error unbanning user:", err);
      alert("Failed to unban user");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-500/20 text-amber-600",
      reviewed: "bg-blue-500/20 text-blue-600",
      dismissed: "bg-gray-500/20 text-gray-600",
      actioned: "bg-green-500/20 text-green-600",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "reports"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveSubTab("bans")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "bans"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Bans
        </button>
      </div>

      {/* Reports Tab */}
      {activeSubTab === "reports" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-[var(--muted-foreground)]">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="actioned">Actioned</option>
            </select>
          </div>

          {/* Reports Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Post</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Reporter</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Reported</th>
                    <th className="text-center py-3 px-4 font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReports ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                        Loading...
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                        No reports found
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                        <td className="py-3 px-4 max-w-xs">
                          {report.post ? (
                            <div>
                              <p className="text-sm text-[var(--foreground)] line-clamp-2">
                                {report.post.content}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                by {report.post.author?.displayName || "Unknown"}
                              </p>
                              {report.post.isDeleted && (
                                <span className="text-xs text-red-500">[Deleted]</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--muted-foreground)] italic">Post not found</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-[var(--foreground)]">
                              {report.reporter?.displayName || "Unknown"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {report.reporter?.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[var(--foreground)]">
                            {report.reason || "No reason provided"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {report.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, "dismissed")}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                >
                                  Dismiss
                                </button>
                                {report.post && !report.post.isDeleted && (
                                  <button
                                    onClick={() => handleDeletePost(report.post.id, report.id)}
                                    className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200 transition-colors"
                                  >
                                    Delete Post
                                  </button>
                                )}
                                {report.post?.author?.id && (
                                  <button
                                    onClick={() => handleBanUser(report.post.author.id, report.post.studyGroupId)}
                                    className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition-colors"
                                  >
                                    Ban User
                                  </button>
                                )}
                              </>
                            )}
                            {report.status !== "pending" && (
                              <span className="text-xs text-[var(--muted-foreground)]">
                                Reviewed {formatDate(report.reviewed_at)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {reportsTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <button
                  onClick={() => fetchReports(reportsPage - 1)}
                  disabled={reportsPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface-2)] rounded hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--muted-foreground)]">
                  Page {reportsPage} of {reportsTotalPages}
                </span>
                <button
                  onClick={() => fetchReports(reportsPage + 1)}
                  disabled={reportsPage === reportsTotalPages}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface-2)] rounded hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bans Tab */}
      {activeSubTab === "bans" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">User</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Banned By</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Banned At</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Expires</th>
                    <th className="text-center py-3 px-4 font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBans ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                        Loading...
                      </td>
                    </tr>
                  ) : bans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                        No active bans
                      </td>
                    </tr>
                  ) : (
                    bans.map((ban) => (
                      <tr key={ban.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {ban.user?.displayName || "Unknown"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {ban.user?.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                          {ban.reason || "No reason provided"}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-[var(--foreground)]">
                            {ban.bannedByAdmin?.displayName || "System"}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                          {formatDate(ban.banned_at)}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                          {ban.expires_at ? formatDate(ban.expires_at) : "Never"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleUnbanUser(ban.user_id)}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-100 rounded hover:bg-green-200 transition-colors"
                          >
                            Unban
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {bansTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <button
                  onClick={() => fetchBans(bansPage - 1)}
                  disabled={bansPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface-2)] rounded hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--muted-foreground)]">
                  Page {bansPage} of {bansTotalPages}
                </span>
                <button
                  onClick={() => fetchBans(bansPage + 1)}
                  disabled={bansPage === bansTotalPages}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface-2)] rounded hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
