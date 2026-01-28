"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "@/lib/api";

const QUEUE_LABELS = {
    'course-create': 'Course Create',
    'course-topics': 'Course Topics',
    'course-unified-plan': 'Unified Plan',
    'course-review-modules': 'Review Modules',
    'course-restructure': 'Restructure',
    'course-modify-topics': 'Modify Topics',
    'onboarding-anon-topics': 'Onboarding Topics',
    'exam-generate': 'Exam Generate',
    'exam-modify': 'Exam Modify',
    'exam-grade': 'Exam Grade',
    'exam-grade-ad-hoc': 'Exam Grade Ad-hoc',
    'cheatsheet-generate': 'Cheatsheet Generate',
    'cheatsheet-modify': 'Cheatsheet Modify',
    'section-grade': 'Section Grade',
    'admin-batch': 'Admin Batch',
};

function StateIndicator({ state }) {
    const config = {
        active: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Running' },
        created: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Queued' },
        retry: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Retry' },
    };

    const { bg, text, label } = config[state] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: state };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
            {state === 'active' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            )}
            {label}
        </span>
    );
}

function formatDuration(startedAt) {
    if (!startedAt) return '-';
    const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function JobsPanel() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [bulkCancelling, setBulkCancelling] = useState(null);
    const [filterQueue, setFilterQueue] = useState('all');
    const [filterState, setFilterState] = useState('all');

    const fetchJobs = useCallback(async () => {
        try {
            setError(null);
            const response = await authFetch("/api/admin/jobs");
            const data = await response.json();

            if (data.success) {
                setJobs(data.jobs || []);
            } else {
                setError(data.error || "Failed to fetch jobs");
            }
        } catch (err) {
            console.error("Error fetching jobs:", err);
            setError("Failed to fetch jobs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, [fetchJobs]);

    const cancelJob = async (jobId) => {
        if (!confirm('Are you sure you want to cancel this job?')) return;

        try {
            setCancelling(jobId);
            const response = await authFetch(`/api/admin/jobs/${jobId}/cancel`, {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success) {
                // Remove the cancelled job from the list
                setJobs((prev) => prev.filter((job) => job.id !== jobId));
            } else {
                alert(data.error || 'Failed to cancel job');
            }
        } catch (err) {
            console.error('Error cancelling job:', err);
            alert('Failed to cancel job');
        } finally {
            setCancelling(null);
        }
    };

    const cancelByQueue = async (queueName) => {
        const count = jobs.filter((j) => j.queueName === queueName).length;
        if (!confirm(`Are you sure you want to cancel all ${count} jobs in queue "${QUEUE_LABELS[queueName] || queueName}"?`)) return;

        try {
            setBulkCancelling(queueName);
            const response = await authFetch('/api/admin/jobs/cancel-by-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueName }),
            });
            const data = await response.json();

            if (data.success) {
                // Remove cancelled jobs from the list
                setJobs((prev) => prev.filter((job) => job.queueName !== queueName));
            } else {
                alert(data.error || 'Failed to cancel jobs');
            }
        } catch (err) {
            console.error('Error cancelling jobs:', err);
            alert('Failed to cancel jobs');
        } finally {
            setBulkCancelling(null);
        }
    };

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            if (filterQueue !== 'all' && job.queueName !== filterQueue) return false;
            if (filterState !== 'all' && job.state !== filterState) return false;
            return true;
        });
    }, [jobs, filterQueue, filterState]);

    const queueCounts = useMemo(() => {
        const counts = {};
        jobs.forEach((job) => {
            counts[job.queueName] = (counts[job.queueName] || 0) + 1;
        });
        return counts;
    }, [jobs]);

    const stateCounts = useMemo(() => {
        const counts = { active: 0, created: 0, retry: 0 };
        jobs.forEach((job) => {
            if (counts[job.state] !== undefined) counts[job.state]++;
        });
        return counts;
    }, [jobs]);

    const activeQueues = useMemo(() => {
        return Object.keys(queueCounts).sort();
    }, [queueCounts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Job Queue</h2>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Manage and monitor background jobs
                    </p>
                </div>
                <button
                    onClick={fetchJobs}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7M19 5a9 9 0 00-14 7" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="card p-4 border-l-4 border-l-[var(--primary)]">
                    <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Total Jobs</p>
                    <p className="text-2xl font-bold mt-1">{jobs.length}</p>
                </div>
                <div className="card p-4 border-l-4 border-l-blue-500">
                    <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Running</p>
                    <p className="text-2xl font-bold mt-1 text-blue-400">{stateCounts.active}</p>
                </div>
                <div className="card p-4 border-l-4 border-l-amber-500">
                    <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Queued</p>
                    <p className="text-2xl font-bold mt-1 text-amber-400">{stateCounts.created}</p>
                </div>
                <div className="card p-4 border-l-4 border-l-orange-500">
                    <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Retry</p>
                    <p className="text-2xl font-bold mt-1 text-orange-400">{stateCounts.retry}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--muted-foreground)]">Queue:</label>
                    <select
                        value={filterQueue}
                        onChange={(e) => setFilterQueue(e.target.value)}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm"
                    >
                        <option value="all">All Queues ({jobs.length})</option>
                        {activeQueues.map((queue) => (
                            <option key={queue} value={queue}>
                                {QUEUE_LABELS[queue] || queue} ({queueCounts[queue]})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--muted-foreground)]">State:</label>
                    <select
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm"
                    >
                        <option value="all">All States</option>
                        <option value="active">Running ({stateCounts.active})</option>
                        <option value="created">Queued ({stateCounts.created})</option>
                        <option value="retry">Retry ({stateCounts.retry})</option>
                    </select>
                </div>

                {filterQueue !== 'all' && queueCounts[filterQueue] > 0 && (
                    <button
                        onClick={() => cancelByQueue(filterQueue)}
                        disabled={bulkCancelling === filterQueue}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                        {bulkCancelling === filterQueue ? (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                        ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        Cancel All in Queue
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 text-red-400">
                    {error}
                </div>
            )}

            {/* Jobs Table */}
            {filteredJobs.length === 0 ? (
                <div className="card p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium">No active jobs</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        The job queue is empty or all jobs have completed.
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Queue</th>
                                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">State</th>
                                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Job Type</th>
                                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filteredJobs.map((job) => (
                                <tr key={job.id} className="hover:bg-[var(--surface-1)]">
                                    <td className="px-4 py-3">
                                        <span className="font-medium">{QUEUE_LABELS[job.queueName] || job.queueName}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StateIndicator state={job.state} />
                                    </td>
                                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                                        {job.jobType || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => cancelJob(job.id)}
                                            disabled={cancelling === job.id}
                                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                        >
                                            {cancelling === job.id ? (
                                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                                            ) : (
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
