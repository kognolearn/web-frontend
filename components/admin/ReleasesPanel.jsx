"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";

function StatCard({ title, value, subtitle, color = "primary" }) {
    const colorClasses = {
        primary: "border-l-[var(--primary)]",
        green: "border-l-green-500",
        orange: "border-l-orange-500",
        blue: "border-l-blue-500",
    };

    return (
        <div className={`card p-4 border-l-4 ${colorClasses[color]}`}>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
        </div>
    );
}

function RolloutSlider({ value, onChange, disabled }) {
    const presets = [0, 10, 25, 50, 100];

    return (
        <div className="flex items-center gap-3">
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                disabled={disabled}
                className="w-32 h-2 bg-[var(--surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
            />
            <span className="text-sm font-medium w-12">{value}%</span>
            <div className="flex gap-1">
                {presets.map((preset) => (
                    <button
                        key={preset}
                        onClick={() => onChange(preset)}
                        disabled={disabled}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                            value === preset
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)]"
                        } disabled:opacity-50`}
                    >
                        {preset}%
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function ReleasesPanel() {
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(null); // Track which release is being updated
    const [pendingChanges, setPendingChanges] = useState({}); // Track pending rollout changes

    const fetchReleases = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await authFetch("/api/admin/releases");
            const data = await response.json();

            if (data.success) {
                setReleases(data.releases || []);
            } else {
                setError(data.error || "Failed to fetch releases");
            }
        } catch (err) {
            console.error("Error fetching releases:", err);
            setError("Failed to fetch releases");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReleases();
    }, [fetchReleases]);

    const updateRollout = async (releaseId, rolloutPercentage) => {
        try {
            setUpdating(releaseId);
            const response = await authFetch(`/api/admin/releases/${releaseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rollout_percentage: rolloutPercentage }),
            });

            const data = await response.json();

            if (data.success) {
                // Update local state
                setReleases((prev) =>
                    prev.map((r) => (r.id === releaseId ? data.release : r))
                );
                // Clear pending change
                setPendingChanges((prev) => {
                    const next = { ...prev };
                    delete next[releaseId];
                    return next;
                });
            } else {
                alert(`Failed to update: ${data.error}`);
            }
        } catch (err) {
            console.error("Error updating rollout:", err);
            alert("Failed to update rollout percentage");
        } finally {
            setUpdating(null);
        }
    };

    const deleteRelease = async (releaseId, version) => {
        if (!confirm(`Are you sure you want to delete release ${version}?`)) {
            return;
        }

        try {
            setUpdating(releaseId);
            const response = await authFetch(`/api/admin/releases/${releaseId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                setReleases((prev) => prev.filter((r) => r.id !== releaseId));
            } else {
                alert(`Failed to delete: ${data.error}`);
            }
        } catch (err) {
            console.error("Error deleting release:", err);
            alert("Failed to delete release");
        } finally {
            setUpdating(null);
        }
    };

    const handleRolloutChange = (releaseId, value) => {
        setPendingChanges((prev) => ({
            ...prev,
            [releaseId]: value,
        }));
    };

    const saveRolloutChange = (releaseId) => {
        const value = pendingChanges[releaseId];
        if (value !== undefined) {
            updateRollout(releaseId, value);
        }
    };

    const latestRelease = releases[0];
    const totalReleases = releases.length;
    const activeRollouts = releases.filter((r) => r.rollout_percentage > 0 && r.rollout_percentage < 100).length;

    const formatDate = (dateString) => {
        if (!dateString) return "Not published";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const getPlatformCount = (assets) => {
        if (!assets || typeof assets !== "object") return 0;
        return Object.keys(assets).length;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
                    <p className="text-sm text-[var(--muted-foreground)]">Loading releases...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={fetchReleases} className="btn btn-primary">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Latest Version"
                    value={latestRelease ? `v${latestRelease.version}` : "None"}
                    subtitle={latestRelease ? formatDate(latestRelease.published_at) : undefined}
                    color="primary"
                />
                <StatCard
                    title="Current Rollout"
                    value={latestRelease ? `${latestRelease.rollout_percentage}%` : "0%"}
                    subtitle={latestRelease?.is_mandatory ? "Mandatory update" : "Optional update"}
                    color={latestRelease?.rollout_percentage === 100 ? "green" : "orange"}
                />
                <StatCard
                    title="Total Releases"
                    value={totalReleases}
                    color="blue"
                />
                <StatCard
                    title="Active Rollouts"
                    value={activeRollouts}
                    subtitle="Partially rolled out"
                    color="orange"
                />
            </div>

            {/* Quick Rollout Control for Latest */}
            {latestRelease && (
                <div className="card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-medium">v{latestRelease.version} Rollout Control</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">
                                Adjust how many users receive this update
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <RolloutSlider
                                value={pendingChanges[latestRelease.id] ?? latestRelease.rollout_percentage}
                                onChange={(value) => handleRolloutChange(latestRelease.id, value)}
                                disabled={updating === latestRelease.id}
                            />
                            {pendingChanges[latestRelease.id] !== undefined && (
                                <button
                                    onClick={() => saveRolloutChange(latestRelease.id)}
                                    disabled={updating === latestRelease.id}
                                    className="btn btn-primary btn-sm"
                                >
                                    {updating === latestRelease.id ? "Saving..." : "Save"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Releases Table */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-2)]">
                    <h3 className="font-medium">All Releases</h3>
                    <button onClick={fetchReleases} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--surface-1)] text-xs uppercase text-[var(--muted-foreground)]">
                            <tr>
                                <th className="px-4 py-3 font-medium">Version</th>
                                <th className="px-4 py-3 font-medium">Rollout</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Platforms</th>
                                <th className="px-4 py-3 font-medium">Created</th>
                                <th className="px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {releases.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <p className="text-[var(--muted-foreground)]">No releases found</p>
                                            <p className="text-xs text-[var(--muted-foreground)]">
                                                Releases are created automatically when you promote a dev build
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                releases.map((release) => (
                                    <tr key={release.id} className="hover:bg-[var(--surface-2)] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">v{release.version}</span>
                                                {release.is_mandatory && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-500 rounded">
                                                        REQUIRED
                                                    </span>
                                                )}
                                            </div>
                                            {release.github_tag && (
                                                <p className="text-xs text-[var(--muted-foreground)]">{release.github_tag}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--primary)] transition-all"
                                                        style={{ width: `${release.rollout_percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm">{release.rollout_percentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {release.rollout_percentage === 100 ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-500 rounded-full">
                                                    Fully Rolled Out
                                                </span>
                                            ) : release.rollout_percentage > 0 ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-500 rounded-full">
                                                    Rolling Out
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-[var(--surface-2)] text-[var(--muted-foreground)] rounded-full">
                                                    Staged
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                                            {getPlatformCount(release.assets)} platforms
                                        </td>
                                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                                            {formatDate(release.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const newValue = prompt(
                                                            `Set rollout percentage for v${release.version} (0-100):`,
                                                            release.rollout_percentage
                                                        );
                                                        if (newValue !== null) {
                                                            const parsed = parseInt(newValue);
                                                            if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                                                                updateRollout(release.id, parsed);
                                                            } else {
                                                                alert("Please enter a number between 0 and 100");
                                                            }
                                                        }
                                                    }}
                                                    disabled={updating === release.id}
                                                    className="text-xs text-[var(--primary)] hover:underline disabled:opacity-50"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteRelease(release.id, release.version)}
                                                    disabled={updating === release.id}
                                                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
