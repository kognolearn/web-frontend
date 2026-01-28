"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
    ActiveUsersChart,
    TokenUsageChart,
    CostChart,
    UsageBySourceChart,
    CostBySourcePieChart,
    ModelUsageTable,
    SourceUsageTable,
    ModelCostBarChart,
    ModelTokensBarChart,
    ModelCallsPieChart,
    EventsChart,
    EventTypePieChart,
    DurationTrendChart,
    RetentionD1Chart,
    RetentionCurveChart,
} from "@/components/admin/AnalyticsCharts";
import FeedbackTable from "@/components/admin/FeedbackTable";
import AdminModerationPanel from "@/components/admin/AdminModerationPanel";
import ReleasesPanel from "@/components/admin/ReleasesPanel";
<<<<<<< HEAD
import JobsPanel from "@/components/admin/JobsPanel";
=======
>>>>>>> origin/main
import {
    DEFAULT_ADMIN_SECTION,
    isValidAdminSection,
} from "@/components/admin/adminSections";

// Date range presets
const DATE_PRESETS = [
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "All", days: null },
];

function StatCard({ title, value, subtitle, icon, trend, trendDirection, color = "primary", borderColor }) {
    const colorClasses = {
        primary: "text-[var(--primary)]",
        purple: "text-[#8B5CF6]",
        green: "text-[#34D399]",
        red: "text-[#EF4444]",
        blue: "text-[#3B82F6]",
        orange: "text-[#F59E0B]",
    };

    return (
        <div className={`card p-5 ${borderColor ? `border-l-4 ${borderColor}` : ''}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">{title}</p>
                    <p className={`mt-2 text-2xl font-bold ${colorClasses[color] || colorClasses.primary}`}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">{subtitle}</p>
                    )}
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                            trendDirection === 'up' ? 'text-[#34D399]' : trendDirection === 'down' ? 'text-[#EF4444]' : 'text-[var(--muted-foreground)]'
                        }`}>
                            {trendDirection === 'up' && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            )}
                            {trendDirection === 'down' && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            )}
                            {trend}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`p-2 rounded-lg bg-[var(--surface-2)] ${colorClasses[color]}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}

function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onPresetSelect, activePreset }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Preset buttons */}
            <div className="flex gap-1">
                {DATE_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => onPresetSelect(preset.days)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            activePreset === preset.days
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            
            {/* Divider */}
            <div className="h-4 w-px bg-[var(--border)]" />
            
            {/* Custom date range */}
            <div className="flex items-center gap-1.5">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartChange(e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <span className="text-[var(--muted-foreground)] text-xs">to</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndChange(e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
            </div>
        </div>
    );
}

function CourseExportTab({ usageByCourseData, dateRangeLoading }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [exportingCourseId, setExportingCourseId] = useState(null);
    const [copiedCourseId, setCopiedCourseId] = useState(null);
    const [exportError, setExportError] = useState(null);

    const filteredCourses = useMemo(() => {
        if (!searchQuery.trim()) return usageByCourseData;
        const query = searchQuery.toLowerCase();
        return usageByCourseData.filter(
            (course) =>
                (course.courseName || "").toLowerCase().includes(query) ||
                (course.courseId || "").toLowerCase().includes(query)
        );
    }, [usageByCourseData, searchQuery]);

    const handleExportCourse = async (courseId) => {
        setExportingCourseId(courseId);
        setExportError(null);
        setCopiedCourseId(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {};

            const response = await fetch(`/api/courses/${courseId}/export`, { headers });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to export course");
            }

            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopiedCourseId(courseId);
            setTimeout(() => setCopiedCourseId(null), 2000);
        } catch (err) {
            console.error("Export error:", err);
            setExportError(err.message);
        } finally {
            setExportingCourseId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Header */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <label htmlFor="course-search" className="block text-sm font-medium mb-1">
                            Search Courses
                        </label>
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <input
                                id="course-search"
                                type="text"
                                placeholder="Search by course name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                        {filteredCourses.length} of {usageByCourseData.length} courses
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {exportError && (
                <div className="p-4 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20">
                    <div className="flex items-center gap-2 text-[#EF4444]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">Export Error:</span>
                        <span>{exportError}</span>
                    </div>
                </div>
            )}

            {/* Course List */}
            <div className="card">
                <div className="p-4 border-b border-[var(--border)]">
                    <h3 className="font-semibold">Course Export</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Select a course to copy its full JSON export to clipboard
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Course</th>
                                <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">API Calls</th>
                                <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Total Tokens</th>
                                <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Total Cost</th>
                                <th className="text-center py-3 px-4 font-medium text-[var(--muted-foreground)]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCourses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                                        {dateRangeLoading
                                            ? "Loading..."
                                            : searchQuery
                                            ? "No courses match your search"
                                            : "No course data available"}
                                    </td>
                                </tr>
                            ) : (
                                filteredCourses
                                    .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
                                    .map((course, idx) => (
                                        <tr
                                            key={course.courseId || idx}
                                            className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-[var(--foreground)]">
                                                        {course.courseName || "Untitled Course"}
                                                    </span>
                                                    <span className="text-xs text-[var(--muted-foreground)] font-mono">
                                                        {course.courseId}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium">
                                                {(course.requestCount || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {(course.totalTokens || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium text-[#EF4444]">
                                                ${(course.totalCost || 0).toFixed(4)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => handleExportCourse(course.courseId)}
                                                    disabled={exportingCourseId === course.courseId}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                        copiedCourseId === course.courseId
                                                            ? "bg-[#34D399] text-white"
                                                            : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    {exportingCourseId === course.courseId ? (
                                                        <>
                                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            Exporting...
                                                        </>
                                                    ) : copiedCourseId === course.courseId ? (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            Copy JSON
                                                        </>
                                                    )}
                                                </button>
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

export default function AdminClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sectionParam = searchParams.get("section");
    const activeSection = isValidAdminSection(sectionParam)
        ? sectionParam
        : DEFAULT_ADMIN_SECTION;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [rawUsageData, setRawUsageData] = useState([]);
    const [feedbackData, setFeedbackData] = useState([]);
    const [eventsData, setEventsData] = useState([]);
    const [usageByUserData, setUsageByUserData] = useState([]);
    const [usageByCourseData, setUsageByCourseData] = useState([]);
    const [studySessionStats, setStudySessionStats] = useState(null);
    const [courseTimeseriesData, setCourseTimeseriesData] = useState([]);
    const [activeUsersSeries, setActiveUsersSeries] = useState([]);
    const [activeUsersStats, setActiveUsersStats] = useState({
        currentDAU: 0,
        currentWAU: 0,
        currentMAU: 0,
        uniqueUsersInRange: 0,
    });
    const [failureAnalytics, setFailureAnalytics] = useState(null);
    const [timingAnalytics, setTimingAnalytics] = useState(null);
    const [retentionAnalytics, setRetentionAnalytics] = useState(null);
    const [retentionGrain, setRetentionGrain] = useState("day");

    useEffect(() => {
        if (!sectionParam || !isValidAdminSection(sectionParam)) {
            router.replace(`/admin?section=${DEFAULT_ADMIN_SECTION}`, { scroll: false });
        }
    }, [sectionParam, router]);

    // Course sorting state
    const [courseSortField, setCourseSortField] = useState("totalCost");
    const [courseSortDirection, setCourseSortDirection] = useState("desc");

    // Date range state
    const [activePreset, setActivePreset] = useState(30); // Default to last 30 days
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Initialize date range on mount
    useEffect(() => {
        const end = new Date();
        // Default end date is 1 day after current date
        end.setDate(end.getDate() + 1);
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setEndDate(end.toISOString().split("T")[0]);
        setStartDate(start.toISOString().split("T")[0]);
    }, []);

    const handlePresetSelect = (days) => {
        setActivePreset(days);
        const end = new Date();
        // Set end date to 1 day after current date for presets as well
        end.setDate(end.getDate() + 1);
        setEndDate(end.toISOString().split("T")[0]);
        
        if (days === null) {
            // All time - set start to a very old date
            setStartDate("2020-01-01");
        } else {
            const start = new Date();
            start.setDate(start.getDate() - days);
            setStartDate(start.toISOString().split("T")[0]);
        }
    };

    const handleCustomDateChange = (type, value) => {
        setActivePreset(null); // Clear preset when using custom dates
        if (type === "start") {
            setStartDate(value);
        } else {
            setEndDate(value);
        }
    };

    const adjustEndDateForAnalytics = useCallback((endKey) => {
        if (!endKey) return endKey;
        const todayKey = new Date().toISOString().split("T")[0];
        if (endKey <= todayKey) return endKey;
        const date = new Date(`${endKey}T00:00:00.000Z`);
        date.setUTCDate(date.getUTCDate() - 1);
        return date.toISOString().split("T")[0];
    }, []);

    // Filter and process data based on date range
    const data = useMemo(() => {
        if (!startDate || !endDate) {
            return {
                activeUsers: [],
                tokenUsage: [],
                cost: [],
                feedback: feedbackData,
                bySource: [],
                byModel: [],
                events: [],
                eventsByType: [],
                stats: {
                    totalUsers: 0,
                    totalCost: 0,
                    totalTokens: 0,
                    totalCalls: 0,
                    avgCostPerCall: 0,
                    avgTokensPerCall: 0,
                    currentDAU: 0,
                    currentWAU: 0,
                    currentMAU: 0,
                    totalEvents: 0,
                    feedbackCount: 0,
                    bugCount: 0,
                    featureCount: 0,
                    otherCount: 0,
                    distractionResolutionRate: null,
                    distractionsDetected: 0,
                    distractionsResolved: 0,
                },
            };
        }

        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

        // Filter usage records by date range
        const filteredRecords = rawUsageData.filter((stat) => {
            const recordDate = new Date(stat.created_at);
            return recordDate >= startDateObj && recordDate <= endDateObj;
        });

        // Process filtered data
        const usageMap = {};
        const uniqueUsers = new Set();
        let totalCost = 0;
        let totalTokens = 0;

        filteredRecords.forEach((stat) => {
            const date = new Date(stat.created_at).toLocaleDateString();
            if (!usageMap[date]) {
                usageMap[date] = {
                    date,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    cost: 0,
                };
            }
            usageMap[date].prompt_tokens += stat.prompt_tokens;
            usageMap[date].completion_tokens += stat.completion_tokens;
            usageMap[date].cost += stat.cost_usd;

            uniqueUsers.add(stat.user_id);
            totalCost += stat.cost_usd;
            totalTokens += stat.total_tokens;
        });

        const usageChartData = Object.values(usageMap).sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        const activeUsersData = Array.isArray(activeUsersSeries)
            ? [...activeUsersSeries].sort((a, b) => new Date(a.date) - new Date(b.date))
            : [];

        const currentDAU = activeUsersStats?.currentDAU ?? 0;
        const currentWAU = activeUsersStats?.currentWAU ?? 0;
        const currentMAU = activeUsersStats?.currentMAU ?? 0;

        // Aggregate by source
        const sourceMap = {};
        filteredRecords.forEach((stat) => {
            const source = stat.source || "UNKNOWN";
            if (!sourceMap[source]) {
                sourceMap[source] = {
                    source,
                    calls: 0,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                    cost: 0,
                };
            }
            sourceMap[source].calls += 1;
            sourceMap[source].prompt_tokens += stat.prompt_tokens;
            sourceMap[source].completion_tokens += stat.completion_tokens;
            sourceMap[source].total_tokens += stat.total_tokens;
            sourceMap[source].cost += stat.cost_usd;
        });

        const bySourceData = Object.values(sourceMap)
            .map((item) => ({
                ...item,
                percentage: totalCost > 0 ? (item.cost / totalCost) * 100 : 0,
            }))
            .sort((a, b) => b.cost - a.cost);

        // Aggregate by model
        const modelMap = {};
        filteredRecords.forEach((stat) => {
            const model = stat.model || "UNKNOWN";
            if (!modelMap[model]) {
                modelMap[model] = {
                    model,
                    calls: 0,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                    cost: 0,
                };
            }
            modelMap[model].calls += 1;
            modelMap[model].prompt_tokens += stat.prompt_tokens;
            modelMap[model].completion_tokens += stat.completion_tokens;
            modelMap[model].total_tokens += stat.total_tokens;
            modelMap[model].cost += stat.cost_usd;
        });

        const byModelData = Object.values(modelMap)
            .map((item) => ({
                ...item,
                avgCostPerCall: item.calls > 0 ? item.cost / item.calls : 0,
            }))
            .sort((a, b) => b.cost - a.cost);

        // Filter feedback by date range
        const filteredFeedback = feedbackData.filter((item) => {
            const itemDate = new Date(item.created_at);
            return itemDate >= startDateObj && itemDate <= endDateObj;
        });

        // Feedback stats
        const bugCount = filteredFeedback.filter(f => f.type === 'bug').length;
        const featureCount = filteredFeedback.filter(f => f.type === 'feature').length;
        const otherCount = filteredFeedback.filter(f => f.type === 'other').length;

        // Filter and process events data
        const filteredEvents = eventsData.filter((event) => {
            const eventDate = new Date(event.created_at);
            return eventDate >= startDateObj && eventDate <= endDateObj;
        });

        // Group events by date for chart
        const eventsMap = {};
        filteredEvents.forEach((event) => {
            const date = new Date(event.created_at).toLocaleDateString();
            if (!eventsMap[date]) {
                eventsMap[date] = { date, count: 0 };
            }
            eventsMap[date].count += 1;
        });

        const eventsChartData = Object.values(eventsMap).sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        // Group events by type
        const eventTypeMap = {};
        filteredEvents.forEach((event) => {
            const type = event.event_type || 'unknown';
            if (!eventTypeMap[type]) {
                eventTypeMap[type] = { type, count: 0 };
            }
            eventTypeMap[type].count += 1;
        });

        const eventsByTypeData = Object.values(eventTypeMap).sort((a, b) => b.count - a.count);

        const totalCalls = filteredRecords.length;
        const totalUsers = activeUsersStats?.uniqueUsersInRange > 0
            ? activeUsersStats.uniqueUsersInRange
            : uniqueUsers.size;
        const stats = {
            totalUsers,
            totalCost,
            totalTokens,
            totalCalls,
            avgCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
            avgTokensPerCall: totalCalls > 0 ? totalTokens / totalCalls : 0,
            currentDAU,
            currentWAU,
            currentMAU,
            totalEvents: filteredEvents.length,
            feedbackCount: filteredFeedback.length,
            bugCount,
            featureCount,
            otherCount,
            distractionResolutionRate: studySessionStats?.resolutionRate ?? null,
            distractionsDetected: studySessionStats?.totals?.distractionsDetected ?? 0,
            distractionsResolved: studySessionStats?.totals?.distractionsResolved ?? 0,
        };

        return {
            activeUsers: activeUsersData,
            tokenUsage: usageChartData,
            cost: usageChartData,
            feedback: filteredFeedback,
            bySource: bySourceData,
            byModel: byModelData,
            events: eventsChartData,
            eventsByType: eventsByTypeData,
            stats,
        };
    }, [
        rawUsageData,
        feedbackData,
        eventsData,
        studySessionStats,
        startDate,
        endDate,
        activeUsersSeries,
        activeUsersStats,
    ]);

    // Separate loading state for date-range data
    const [dateRangeLoading, setDateRangeLoading] = useState(false);
    const [twoWeekDealEnabled, setTwoWeekDealEnabled] = useState(false);
    const [twoWeekDealLoading, setTwoWeekDealLoading] = useState(false);
    const [workerDrainEnabled, setWorkerDrainEnabled] = useState(false);
    const [workerDrainLoading, setWorkerDrainLoading] = useState(false);
    const [workerDrainRefreshing, setWorkerDrainRefreshing] = useState(false);
    const [workerDrainInfo, setWorkerDrainInfo] = useState({ activeJobs: 0, activeByQueue: {} });
    const [stripePrices, setStripePrices] = useState(null);

    // Fetch all data (used for initial load and refresh)
    const fetchAllData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {};

            // Fetch data that doesn't depend on date range
            const [usageRes, feedbackRes, eventsRes] = await Promise.all([
                fetch("/api/admin/analytics/usage", { headers }),
                fetch("/api/admin/feedback", { headers }),
                fetch("/api/admin/analytics/events", { headers }),
            ]);

            const [usageData, feedbackResult, eventsResult] = await Promise.all([
                usageRes.json(),
                feedbackRes.json(),
                eventsRes.json(),
            ]);

            const usageRecords = usageData.success ? (usageData.usage || usageData.data || []) : [];
            setRawUsageData(usageRecords);
            setFeedbackData(feedbackResult.success ? feedbackResult.feedback : []);
            setEventsData(eventsResult.success ? (eventsResult.events || eventsResult.data || []) : []);

            // Also fetch date-range dependent data on refresh
            if (isRefresh && startDate && endDate) {
                const dateParams = `startDate=${startDate}&endDate=${endDate}`;
                const analyticsEndDate = adjustEndDateForAnalytics(endDate) || endDate;
                const analyticsDateParams = `startDate=${startDate}&endDate=${analyticsEndDate}`;
                const [
                    usageByUserRes,
                    usageByCourseRes,
                    studySessionRes,
                    timeseriesRes,
                    activeUsersRes,
                    failuresRes,
                    timingsRes,
                    retentionRes,
                ] = await Promise.all([
                    fetch(`/api/admin/analytics/usage-by-user?includeEmail=true&${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/usage-by-course?includeCourseName=true&${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/study-sessions?${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/course-generation-timeseries?${dateParams}&groupBy=day`, { headers }),
                    fetch(`/api/admin/analytics/active-users?${analyticsDateParams}`, { headers }),
                    fetch(`/api/admin/analytics/failures?${analyticsDateParams}`, { headers }),
                    fetch(`/api/admin/analytics/timings?${analyticsDateParams}`, { headers }),
                    fetch(`/api/admin/analytics/retention?${analyticsDateParams}`, { headers }),
                ]);

                const [
                    usageByUserResult,
                    usageByCourseResult,
                    studySessionResult,
                    timeseriesResult,
                    activeUsersResult,
                    failuresResult,
                    timingsResult,
                    retentionResult,
                ] = await Promise.all([
                    usageByUserRes.json(),
                    usageByCourseRes.json(),
                    studySessionRes.json(),
                    timeseriesRes.json(),
                    activeUsersRes.json(),
                    failuresRes.json(),
                    timingsRes.json(),
                    retentionRes.json(),
                ]);

                setUsageByUserData(usageByUserResult.success ? (usageByUserResult.users || usageByUserResult.data || []) : []);
                setUsageByCourseData(usageByCourseResult.success ? (usageByCourseResult.courses || usageByCourseResult.data || []) : []);
                setStudySessionStats(studySessionResult.success ? studySessionResult : null);
                setCourseTimeseriesData(timeseriesResult.success ? (timeseriesResult.timeseries || []) : []);
                setActiveUsersSeries(activeUsersResult.success ? (activeUsersResult.timeseries || []) : []);
                setActiveUsersStats(activeUsersResult.success ? (activeUsersResult.stats || {}) : {
                    currentDAU: 0,
                    currentWAU: 0,
                    currentMAU: 0,
                    uniqueUsersInRange: 0,
                });
                setFailureAnalytics(failuresResult.success ? failuresResult : null);
                setTimingAnalytics(timingsResult.success ? timingsResult : null);
                setRetentionAnalytics(retentionResult.success ? retentionResult : null);
            }
        } catch (err) {
            console.error("Error fetching admin data:", err);
            setError("Failed to load admin data. Please try again.");
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    // Fetch date-independent data once on mount
    useEffect(() => {
        fetchAllData(false);
    }, []);

    // Fetch date-range dependent data when dates change
    useEffect(() => {
        if (!startDate || !endDate) return;

        const fetchDateRangeData = async () => {
            setDateRangeLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers = session?.access_token
                    ? { Authorization: `Bearer ${session.access_token}` }
                    : {};

                const dateParams = `startDate=${startDate}&endDate=${endDate}`;
                const analyticsEndDate = adjustEndDateForAnalytics(endDate) || endDate;
                const analyticsDateParams = `startDate=${startDate}&endDate=${analyticsEndDate}`;
                const [
                    usageByUserRes,
                    usageByCourseRes,
                    studySessionRes,
                    timeseriesRes,
                    activeUsersRes,
                    failuresRes,
                    timingsRes,
                    retentionRes,
                ] = await Promise.all([
                    fetch(`/api/admin/analytics/usage-by-user?includeEmail=true&${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/usage-by-course?includeCourseName=true&${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/study-sessions?${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/course-generation-timeseries?${dateParams}&groupBy=day`, { headers }),
                    fetch(`/api/admin/analytics/active-users?${analyticsDateParams}`, { headers }),
                    fetch(`/api/admin/analytics/failures?${analyticsDateParams}`, { headers }),
                    fetch(`/api/admin/analytics/timings?${analyticsDateParams}`, { headers }),
                    fetch(`/api/admin/analytics/retention?${analyticsDateParams}`, { headers }),
                ]);

                const [
                    usageByUserResult,
                    usageByCourseResult,
                    studySessionResult,
                    timeseriesResult,
                    activeUsersResult,
                    failuresResult,
                    timingsResult,
                    retentionResult,
                ] = await Promise.all([
                    usageByUserRes.json(),
                    usageByCourseRes.json(),
                    studySessionRes.json(),
                    timeseriesRes.json(),
                    activeUsersRes.json(),
                    failuresRes.json(),
                    timingsRes.json(),
                    retentionRes.json(),
                ]);

                setUsageByUserData(usageByUserResult.success ? (usageByUserResult.users || usageByUserResult.data || []) : []);
                setUsageByCourseData(usageByCourseResult.success ? (usageByCourseResult.courses || usageByCourseResult.data || []) : []);
                setStudySessionStats(studySessionResult.success ? studySessionResult : null);
                setCourseTimeseriesData(timeseriesResult.success ? (timeseriesResult.timeseries || []) : []);
                setActiveUsersSeries(activeUsersResult.success ? (activeUsersResult.timeseries || []) : []);
                setActiveUsersStats(activeUsersResult.success ? (activeUsersResult.stats || {}) : {
                    currentDAU: 0,
                    currentWAU: 0,
                    currentMAU: 0,
                    uniqueUsersInRange: 0,
                });
                setFailureAnalytics(failuresResult.success ? failuresResult : null);
                setTimingAnalytics(timingsResult.success ? timingsResult : null);
                setRetentionAnalytics(retentionResult.success ? retentionResult : null);
            } catch (err) {
                console.error("Error fetching date-range data:", err);
            } finally {
                setDateRangeLoading(false);
            }
        };

        fetchDateRangeData();
    }, [startDate, endDate, adjustEndDateForAnalytics]);

    useEffect(() => {
        const grains = retentionAnalytics?.retentionByGrain
            ? Object.keys(retentionAnalytics.retentionByGrain)
            : [];
        if (grains.length === 0) return;
        if (!retentionAnalytics.retentionByGrain[retentionGrain]) {
            setRetentionGrain(grains[0]);
        }
    }, [retentionAnalytics, retentionGrain]);

    const fetchTwoWeekDealStatus = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {};
            const res = await fetch('/api/admin/settings/two-week-deal', { headers });
            if (res.ok) {
                const data = await res.json();
                setTwoWeekDealEnabled(data.enabled);
            }
        } catch (err) {
            console.error("Error fetching two-week deal status:", err);
        }
    }, []);

    // Fetch two-week deal status on mount
    useEffect(() => {
        fetchTwoWeekDealStatus();
    }, [fetchTwoWeekDealStatus]);

    const fetchWorkerDrainStatus = useCallback(async () => {
        setWorkerDrainRefreshing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {};
            const res = await fetch('/api/admin/settings/worker-drain', { headers });
            if (res.ok) {
                const data = await res.json();
                setWorkerDrainEnabled(Boolean(data.enabled));
                setWorkerDrainInfo({
                    activeJobs: data.activeJobs ?? 0,
                    activeByQueue: data.activeByQueue ?? {},
                });
            }
        } catch (err) {
            console.error("Error fetching worker drain status:", err);
        } finally {
            setWorkerDrainRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkerDrainStatus();
    }, [fetchWorkerDrainStatus]);

    useEffect(() => {
        if (activeSection !== "settings") return;
        const interval = setInterval(fetchWorkerDrainStatus, 5000);
        return () => clearInterval(interval);
    }, [activeSection, fetchWorkerDrainStatus]);

    // Fetch Stripe prices on mount
    useEffect(() => {
        const fetchStripePrices = async () => {
            try {
                const res = await fetch('/api/stripe?endpoint=prices');
                if (res.ok) {
                    const data = await res.json();
                    setStripePrices(data);
                }
            } catch (err) {
                console.error("Error fetching Stripe prices:", err);
            }
        };
        fetchStripePrices();
    }, []);

    // Toggle two-week deal
    const toggleTwoWeekDeal = async () => {
        setTwoWeekDealLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            };
            const res = await fetch('/api/admin/settings/two-week-deal', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ enabled: !twoWeekDealEnabled }),
            });
            if (res.ok) {
                const data = await res.json();
                setTwoWeekDealEnabled(data.enabled);
            }
        } catch (err) {
            console.error("Error toggling two-week deal:", err);
        } finally {
            setTwoWeekDealLoading(false);
        }
    };

    const toggleWorkerDrain = async () => {
        setWorkerDrainLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            };
            const res = await fetch('/api/admin/settings/worker-drain', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ enabled: !workerDrainEnabled }),
            });
            if (res.ok) {
                const data = await res.json();
                setWorkerDrainEnabled(Boolean(data.enabled));
                fetchWorkerDrainStatus();
            }
        } catch (err) {
            console.error("Error toggling worker drain:", err);
        } finally {
            setWorkerDrainLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]"></div>
                    <p className="text-sm text-[var(--muted-foreground)]">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-96 w-full flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-[#EF4444]/10 p-4">
                    <svg className="w-8 h-8 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-[var(--danger)] font-medium">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn btn-primary"
                >
                    Retry
                </button>
            </div>
        );
    }

    const reliabilitySummary = failureAnalytics?.summary || {};
    const reliabilityBreakdowns = failureAnalytics?.breakdowns || {};
    const reliabilityRecentEvents = failureAnalytics?.recentEvents || [];
    const reliabilitySuccessRate = reliabilitySummary.successRate;
    const successRateLabel = reliabilitySuccessRate == null
        ? "N/A"
        : `${(reliabilitySuccessRate * 100).toFixed(1)}%`;
    const displayEndDate = adjustEndDateForAnalytics(endDate) || endDate;
    const stageItems = Array.isArray(reliabilityBreakdowns.byStage)
        ? reliabilityBreakdowns.byStage.slice(0, 10)
        : [];
    const stageMax = stageItems.reduce((max, item) => Math.max(max, item.count || 0), 0);
    const issueItems = Array.isArray(reliabilityBreakdowns.byIssueType)
        ? reliabilityBreakdowns.byIssueType.slice(0, 10)
        : [];
    const issueMax = issueItems.reduce((max, item) => Math.max(max, item.count || 0), 0);

    const timingSummary = timingAnalytics?.summary || {};
    const timingCourses = timingSummary.courses || {};
    const timingTimeToFirst = timingSummary.timeToFirstModule || {};
    const timingModules = timingSummary.modules || {};
    const timingTimeseries = timingAnalytics?.timeseries || {};
    const timingCourseSeries = Array.isArray(timingTimeseries.courseDuration)
        ? timingTimeseries.courseDuration
        : [];
    const timingFirstModuleSeries = Array.isArray(timingTimeseries.timeToFirstModule)
        ? timingTimeseries.timeToFirstModule
        : [];
    const timingContentTypes = Array.isArray(timingAnalytics?.contentTypeBreakdown)
        ? timingAnalytics.contentTypeBreakdown
        : [];
    const timingContentTypeItems = timingContentTypes.slice(0, 12);
    const timingContentTypeMax = timingContentTypeItems.reduce(
        (max, item) => Math.max(max, item?.stats?.avgMs || 0),
        0
    );

    const retentionSummary = retentionAnalytics?.summary || {};
    const retentionByGrain = retentionAnalytics?.retentionByGrain || {};
    const retentionAvailableGrains = Object.keys(retentionByGrain);
    const retentionSelected = retentionByGrain[retentionGrain] || null;
    const retentionCurveData = Array.isArray(retentionSelected?.aggregatedCurve)
        ? retentionSelected.aggregatedCurve
            .filter(
                (point) =>
                    (point?.eligibleUsers ?? 0) > 0 && point.retentionRate != null
            )
            .map((point) => ({
                ...point,
                label: point.label ?? String(point.offset ?? ""),
                retentionPercent: point.retentionRate * 100,
            }))
        : [];
    const d1Summary = retentionSummary.d1 || {};
    const d1Rate = d1Summary.rate ?? null;
    const d1TimeseriesRaw = Array.isArray(retentionAnalytics?.d1Timeseries)
        ? retentionAnalytics.d1Timeseries
        : [];
    const d1ChartData = d1TimeseriesRaw
        .filter((item) => item.eligible && item.rate != null)
        .map((item) => ({
            ...item,
            ratePercent: item.rate * 100,
        }));

    const formatDuration = (ms) => {
        if (ms == null || !Number.isFinite(ms)) return "—";
        if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
        return `${(ms / 3_600_000).toFixed(1)}h`;
    };

    const formatPercent = (value) => {
        if (value == null || !Number.isFinite(value)) return "—";
        return `${(value * 100).toFixed(1)}%`;
    };

    const formatDateTime = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    };

    const severityBadge = (severity) => {
        const tone = severity || "info";
        const classes =
            tone === "error"
                ? "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]"
                : tone === "warning"
                    ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted-foreground)]";
        return (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>
                {tone}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Header with Date Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                        {startDate && endDate && (
                            <span>{new Date(startDate).toLocaleDateString()} – {new Date(displayEndDate).toLocaleDateString()}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        onStartChange={(value) => handleCustomDateChange("start", value)}
                        onEndChange={(value) => handleCustomDateChange("end", value)}
                        onPresetSelect={handlePresetSelect}
                        activePreset={activePreset}
                    />
                    <button
                        onClick={() => fetchAllData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 rounded-md bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh data"
                    >
                        <svg 
                            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeSection === "overview" && (
                <div className="space-y-6">
                    {/* Key Metrics Grid */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Monthly Active Users"
                            value={data.stats.currentMAU ?? 0}
                            subtitle="Last 30 days"
                            color="green"
                            borderColor="border-l-[#34D399]"
                            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                        <StatCard
                            title="Total Cost"
                            value={`$${(data.stats.totalCost ?? 0).toFixed(2)}`}
                            subtitle="In selected range"
                            color="red"
                            borderColor="border-l-[#EF4444]"
                            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <StatCard
                            title="API Calls"
                            value={(data.stats.totalCalls ?? 0).toLocaleString()}
                            subtitle="In selected range"
                            color="blue"
                            borderColor="border-l-[#3B82F6]"
                            icon="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                        <StatCard
                            title="Feedback"
                            value={data.stats.feedbackCount ?? 0}
                            subtitle={`${data.stats.bugCount} bugs, ${data.stats.featureCount} features`}
                            color="orange"
                            borderColor="border-l-[#F59E0B]"
                            icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </div>

                    {/* Active Users + Cost Side by Side */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Active Users Trend</h3>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>DAU</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>WAU</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#34D399]"></span>MAU</span>
                                </div>
                            </div>
                            <ActiveUsersChart data={data.activeUsers} />
                        </div>
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Daily Cost</h3>
                            <CostChart data={data.cost} />
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                        <div className="card p-4 text-center">
                            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">DAU Today</p>
                            <p className="text-xl font-bold mt-1 text-[var(--primary)]">{data.stats.currentDAU ?? 0}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">WAU</p>
                            <p className="text-xl font-bold mt-1" style={{ color: '#8B5CF6' }}>{data.stats.currentWAU ?? 0}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Avg Cost/Call</p>
                            <p className="text-xl font-bold mt-1">${(data.stats.avgCostPerCall ?? 0).toFixed(4)}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Avg Tokens/Call</p>
                            <p className="text-xl font-bold mt-1">{Math.round(data.stats.avgTokensPerCall ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Distraction Recovery</p>
                            <p className="text-xl font-bold mt-1">
                                {data.stats.distractionResolutionRate !== null && data.stats.distractionResolutionRate !== undefined
                                    ? `${data.stats.distractionResolutionRate.toFixed(1)}%`
                                    : "N/A"}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">
                                {data.stats.distractionsResolved ?? 0}/{data.stats.distractionsDetected ?? 0} resolved
                            </p>
                        </div>
                    </div>

                    {/* Token Usage + Model Distribution */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Token Usage by Day</h3>
                            <TokenUsageChart data={data.tokenUsage} />
                        </div>
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">API Calls by Model</h3>
                            <ModelCallsPieChart data={data.byModel} />
                        </div>
                    </div>
                </div>
            )}

            {activeSection === "reliability" && (
                <div className="space-y-6">
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Success Rate"
                            value={successRateLabel}
                            subtitle={
                                (reliabilitySummary.completedRuns ?? 0) > 0
                                    ? `${reliabilitySummary.readyRuns ?? 0}/${reliabilitySummary.completedRuns ?? 0} ready`
                                    : "No completed runs"
                            }
                            color="green"
                            borderColor="border-l-[#34D399]"
                        />
                        <StatCard
                            title="Completed Runs"
                            value={(reliabilitySummary.completedRuns ?? 0).toLocaleString()}
                            subtitle="In selected range"
                            color="blue"
                            borderColor="border-l-[#3B82F6]"
                        />
                        <StatCard
                            title="Course Failures"
                            value={(reliabilitySummary.courseFailures ?? 0).toLocaleString()}
                            subtitle="Generation failures"
                            color="red"
                            borderColor="border-l-[#EF4444]"
                        />
                        <StatCard
                            title="Course Issues"
                            value={(reliabilitySummary.courseIssues ?? 0).toLocaleString()}
                            subtitle="Warnings & skips"
                            color="orange"
                            borderColor="border-l-[#F59E0B]"
                        />
                        <StatCard
                            title="Fallbacks"
                            value={(reliabilitySummary.courseFallbacks ?? 0).toLocaleString()}
                            subtitle="Repair paths used"
                            color="purple"
                            borderColor="border-l-[#8B5CF6]"
                        />
                        <StatCard
                            title="Blocked Runs"
                            value={(reliabilitySummary.blockedRuns ?? 0).toLocaleString()}
                            subtitle="Course status blocked"
                            color="red"
                            borderColor="border-l-[#EF4444]"
                        />
                        <StatCard
                            title="Avg Course Time"
                            value={formatDuration(timingCourses.avgMs)}
                            subtitle={`P95 ${formatDuration(timingCourses.p95Ms)}`}
                            color="blue"
                            borderColor="border-l-[#3B82F6]"
                        />
                        <StatCard
                            title="Time To 1st Module"
                            value={formatDuration(timingTimeToFirst.avgMs)}
                            subtitle={`P95 ${formatDuration(timingTimeToFirst.p95Ms)}`}
                            color="purple"
                            borderColor="border-l-[#8B5CF6]"
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Failures By Stage</h3>
                                <span className="text-xs text-[var(--muted-foreground)]">
                                    {(reliabilitySummary.totalEvents ?? 0).toLocaleString()} events
                                </span>
                            </div>
                            {dateRangeLoading ? (
                                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading stage data...</p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {stageItems.length > 0 ? (
                                        stageItems.map((item) => {
                                            const pct = stageMax > 0 ? ((item.count || 0) / stageMax) * 100 : 0;
                                            return (
                                                <div key={`stage-${item.key}`} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                                                        <span className="truncate pr-2 text-[var(--foreground)]">{item.key}</span>
                                                        <span className="font-medium text-[var(--foreground)]">{item.count}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-[var(--surface-2)]">
                                                        <div
                                                            className="h-2 rounded-full bg-[var(--primary)]"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-[var(--muted-foreground)]">No stage failures found.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="card p-6">
                            <h3 className="font-semibold">Failures By Issue Type</h3>
                            {dateRangeLoading ? (
                                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading issue types...</p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {issueItems.length > 0 ? (
                                        issueItems.map((item) => {
                                            const pct = issueMax > 0 ? ((item.count || 0) / issueMax) * 100 : 0;
                                            return (
                                                <div key={`issue-${item.key}`} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                                                        <span className="truncate pr-2 text-[var(--foreground)]">{item.key}</span>
                                                        <span className="font-medium text-[var(--foreground)]">{item.count}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-[var(--surface-2)]">
                                                        <div
                                                            className="h-2 rounded-full bg-[#8B5CF6]"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-[var(--muted-foreground)]">No issue types found.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Course Duration Trend</h3>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                        Average time per course run
                                    </p>
                                </div>
                                <div className="text-xs text-[var(--muted-foreground)]">
                                    {timingCourses.count ?? 0} runs
                                </div>
                            </div>
                            {dateRangeLoading ? (
                                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading timing data...</p>
                            ) : (
                                <div className="mt-4">
                                    <DurationTrendChart
                                        data={timingCourseSeries}
                                        dataKey="avgMs"
                                        name="Avg Course Duration"
                                        color="#3B82F6"
                                        height={260}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Time To First Module</h3>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                        How quickly learners see progress
                                    </p>
                                </div>
                                <div className="text-xs text-[var(--muted-foreground)]">
                                    {timingTimeToFirst.count ?? 0} runs
                                </div>
                            </div>
                            {dateRangeLoading ? (
                                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading timing data...</p>
                            ) : (
                                <div className="mt-4">
                                    <DurationTrendChart
                                        data={timingFirstModuleSeries}
                                        dataKey="avgMs"
                                        name="Avg Time To First Module"
                                        color="#8B5CF6"
                                        height={260}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">Content Type Durations</h3>
                                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                    Average generation time by content type
                                </p>
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                                {timingSummary.contentTypeCount ?? 0} events
                            </div>
                        </div>
                        {dateRangeLoading ? (
                            <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading content timings...</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {timingContentTypeItems.length > 0 ? (
                                    timingContentTypeItems.map((item) => {
                                        const avgMs = item?.stats?.avgMs || 0;
                                        const pct = timingContentTypeMax > 0 ? (avgMs / timingContentTypeMax) * 100 : 0;
                                        return (
                                            <div key={`content-type-${item.contentType}`} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                                                    <span className="truncate pr-2 text-[var(--foreground)]">
                                                        {item.contentType}
                                                    </span>
                                                    <span className="font-medium text-[var(--foreground)]">
                                                        {formatDuration(avgMs)}
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full bg-[var(--surface-2)]">
                                                    <div
                                                        className="h-2 rounded-full bg-[#34D399]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="text-[11px] text-[var(--muted-foreground)]/80">
                                                    {item?.stats?.count ?? 0} samples • Avg lessons {item.avgLessonCount?.toFixed?.(1) ?? "—"}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-[var(--muted-foreground)]">No content timing data found.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
                            <div>
                                <h3 className="font-semibold">Recent Reliability Events</h3>
                                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                    Latest issues, failures, and fallbacks
                                </p>
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                                {(reliabilityRecentEvents.length || 0).toLocaleString()} events shown
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Time</th>
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Severity</th>
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Stage</th>
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Issue Type</th>
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Course</th>
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Module</th>
                                        <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Event</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dateRangeLoading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                                                Loading reliability events...
                                            </td>
                                        </tr>
                                    ) : reliabilityRecentEvents.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                                                No reliability events found for this range.
                                            </td>
                                        </tr>
                                    ) : (
                                        reliabilityRecentEvents.map((event) => (
                                            <tr key={event.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                                                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                                                    {formatDateTime(event.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {severityBadge(event.severity)}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                                                    {event.stage || "unknown"}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                                                    {event.issueType || "unspecified"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                                                        {event.courseId || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                                                    {event.moduleName || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                                                    {event.event_type}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === "users" && (
                <div className="space-y-6">
                    {/* User Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Daily Active Users"
                            value={data.stats.currentDAU ?? 0}
                            subtitle="Today"
                            color="primary"
                            borderColor="border-l-[var(--primary)]"
                        />
                        <StatCard
                            title="Weekly Active Users"
                            value={data.stats.currentWAU ?? 0}
                            subtitle="Last 7 days"
                            color="purple"
                            borderColor="border-l-[#8B5CF6]"
                        />
                        <StatCard
                            title="Monthly Active Users"
                            value={data.stats.currentMAU ?? 0}
                            subtitle="Last 30 days"
                            color="green"
                            borderColor="border-l-[#34D399]"
                        />
                        <StatCard
                            title="Unique Users"
                            value={data.stats.totalUsers ?? 0}
                            subtitle="In selected range"
                            color="blue"
                        />
                    </div>

                    {/* Active Users Chart - Full Width */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Active Users Over Time</h3>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 bg-[var(--primary)]"></span>
                                    DAU (Daily)
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 bg-[#8B5CF6]"></span>
                                    WAU (Weekly)
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 bg-[#34D399]"></span>
                                    MAU (Monthly)
                                </span>
                            </div>
                        </div>
                        <ActiveUsersChart data={data.activeUsers} />
                    </div>

                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="D1 Retention"
                            value={formatPercent(d1Rate)}
                            subtitle={`${(d1Summary.retainedUsers ?? 0).toLocaleString()} of ${(d1Summary.eligibleUsers ?? 0).toLocaleString()} eligible`}
                            color="green"
                            borderColor="border-l-[#34D399]"
                        />
                        <StatCard
                            title="D1 Eligible Users"
                            value={(d1Summary.eligibleUsers ?? 0).toLocaleString()}
                            subtitle="Have 1 full day to return"
                            color="blue"
                            borderColor="border-l-[#3B82F6]"
                        />
                        <StatCard
                            title="D1 Retained Users"
                            value={(d1Summary.retainedUsers ?? 0).toLocaleString()}
                            subtitle="Active on day 1"
                            color="purple"
                            borderColor="border-l-[#8B5CF6]"
                        />
                        <StatCard
                            title="Signups"
                            value={(retentionSummary.totalSignups ?? 0).toLocaleString()}
                            subtitle="In selected range"
                            color="primary"
                            borderColor="border-l-[var(--primary)]"
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">D1 Retention By Cohort</h3>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                        Day 1 return rate for each signup day
                                    </p>
                                </div>
                                <div className="text-xs text-[var(--muted-foreground)]">
                                    {d1ChartData.length} cohorts
                                </div>
                            </div>
                            {dateRangeLoading ? (
                                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading retention data...</p>
                            ) : d1ChartData.length === 0 ? (
                                <p className="mt-6 text-sm text-[var(--muted-foreground)]">
                                    No eligible D1 cohorts in this range yet.
                                </p>
                            ) : (
                                <div className="mt-4">
                                    <RetentionD1Chart data={d1ChartData} />
                                </div>
                            )}
                        </div>

                        <div className="card p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold">Retention Curve</h3>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                        Aggregate retention over time since signup
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {["day", "week", "month"].map((grain) => {
                                        const available = retentionAvailableGrains.includes(grain);
                                        const isActive = retentionGrain === grain;
                                        return (
                                            <button
                                                key={`retention-grain-${grain}`}
                                                type="button"
                                                onClick={() => available && setRetentionGrain(grain)}
                                                disabled={!available}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                                    isActive
                                                        ? "bg-[var(--primary)] text-white"
                                                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
                                                } ${!available ? "opacity-40 cursor-not-allowed" : ""}`}
                                            >
                                                {grain}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {dateRangeLoading ? (
                                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading retention data...</p>
                            ) : retentionCurveData.length === 0 ? (
                                <p className="mt-6 text-sm text-[var(--muted-foreground)]">
                                    Not enough retention data yet for this grain.
                                </p>
                            ) : (
                                <div className="mt-4">
                                    <RetentionCurveChart data={retentionCurveData} grain={retentionGrain} />
                                </div>
                            )}
                            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                                Day-by-day retention will show dips when users skip days. Week and month grains
                                only track whether a user returned during that period, so they smooth over gaps.
                            </p>
                        </div>
                    </div>

                    {/* Events Section */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">User Events Over Time</h3>
                                <span className="text-xs text-[var(--muted-foreground)]">
                                    {(data.stats.totalEvents ?? 0).toLocaleString()} total events
                                </span>
                            </div>
                            <EventsChart data={data.events} />
                        </div>
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Events by Type</h3>
                            <EventTypePieChart data={data.eventsByType} />
                        </div>
                    </div>
                </div>
            )}

            {activeSection === "users" && (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Users"
                            value={usageByUserData.length}
                            subtitle="With API usage"
                            color="primary"
                            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                        <StatCard
                            title="Total Cost (All Users)"
                            value={`$${usageByUserData.reduce((sum, u) => sum + (u.totalCost || 0), 0).toFixed(2)}`}
                            color="red"
                            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <StatCard
                            title="Avg Cost per User"
                            value={`$${usageByUserData.length > 0 ? (usageByUserData.reduce((sum, u) => sum + (u.totalCost || 0), 0) / usageByUserData.length).toFixed(2) : '0.00'}`}
                            color="orange"
                        />
                        <StatCard
                            title="Avg Tokens per User"
                            value={usageByUserData.length > 0 ? Math.round(usageByUserData.reduce((sum, u) => sum + (u.totalTokens || 0), 0) / usageByUserData.length).toLocaleString() : '0'}
                            color="blue"
                        />
                    </div>

                    {/* User Breakdown Table */}
                    <div className="card">
                        <div className="p-4 border-b border-[var(--border)]">
                            <h3 className="font-semibold">User-by-User Breakdown</h3>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">Detailed API usage, cost, and token metrics per user</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                        <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">User</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">API Calls</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Total Tokens</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Prompt Tokens</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Completion Tokens</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Total Cost</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Avg Cost/Call</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Courses</th>
                                        <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Sources</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usageByUserData.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-[var(--muted-foreground)]">
                                                {dateRangeLoading ? "Loading..." : "No user data available"}
                                            </td>
                                        </tr>
                                    ) : (
                                        usageByUserData
                                            .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
                                            .map((user, idx) => (
                                                <tr key={user.userId || idx} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-[var(--foreground)]">
                                                                {user.email || 'Unknown'}
                                                            </span>
                                                            <span className="text-xs text-[var(--muted-foreground)] font-mono">
                                                                {user.userId?.substring(0, 8)}...
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium">
                                                        {(user.requestCount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        {(user.totalTokens || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        {(user.totalPromptTokens || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        {(user.totalCompletionTokens || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium text-[#EF4444]">
                                                        ${(user.totalCost || 0).toFixed(4)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        ${user.requestCount > 0 ? ((user.totalCost || 0) / user.requestCount).toFixed(4) : '0.0000'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                                                            {user.courses?.length || 0}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-left max-w-[200px]">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(user.sources || []).slice(0, 5).map((source, i) => (
                                                                <span key={i} className="inline-flex items-center rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]">
                                                                    {source}
                                                                </span>
                                                            ))}
                                                            {(user.sources?.length || 0) > 5 && (
                                                                <span className="text-xs text-[var(--muted-foreground)]">
                                                                    +{user.sources.length - 5} more
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
                    </div>
                </div>
            )}

            {activeSection === "users" && (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Courses"
                            value={usageByCourseData.length}
                            subtitle="With API usage"
                            color="primary"
                            icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                        <StatCard
                            title="Total Cost (All Courses)"
                            value={`$${usageByCourseData.reduce((sum, c) => sum + (c.totalCost || 0), 0).toFixed(2)}`}
                            color="red"
                            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <StatCard
                            title="Avg Cost per Course"
                            value={`$${usageByCourseData.length > 0 ? (usageByCourseData.reduce((sum, c) => sum + (c.totalCost || 0), 0) / usageByCourseData.length).toFixed(2) : '0.00'}`}
                            color="orange"
                        />
                        <StatCard
                            title="Avg Tokens per Course"
                            value={usageByCourseData.length > 0 ? Math.round(usageByCourseData.reduce((sum, c) => sum + (c.totalTokens || 0), 0) / usageByCourseData.length).toLocaleString() : '0'}
                            color="blue"
                        />
                    </div>

                    {/* Course Breakdown Table */}
                    <div className="card">
                        <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold">Course-by-Course Breakdown</h3>
                                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                    {usageByCourseData.length} courses • Sorted by {courseSortField.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-[var(--muted-foreground)]">Sort by:</label>
                                <select
                                    value={courseSortField}
                                    onChange={(e) => setCourseSortField(e.target.value)}
                                    className="text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)]"
                                >
                                    <option value="totalCost">Cost (Total)</option>
                                    <option value="totalTokens">Tokens (Total)</option>
                                    <option value="requestCount">API Calls</option>
                                    <option value="lastApiCall">Most Recent</option>
                                    <option value="firstApiCall">Oldest First</option>
                                    <option value="courseName">Name (A-Z)</option>
                                </select>
                                <button
                                    onClick={() => setCourseSortDirection(d => d === "asc" ? "desc" : "asc")}
                                    className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                                    title={courseSortDirection === "asc" ? "Ascending" : "Descending"}
                                >
                                    <svg className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${courseSortDirection === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                        <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Course</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">API Calls</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Total Tokens</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Prompt Tokens</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Completion Tokens</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Total Cost</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Avg Cost/Call</th>
                                        <th className="text-right py-3 px-4 font-medium text-[var(--muted-foreground)]">Avg Tokens/Call</th>
                                        <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Last Activity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usageByCourseData.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-[var(--muted-foreground)]">
                                                {dateRangeLoading ? "Loading..." : "No course data available"}
                                            </td>
                                        </tr>
                                    ) : (
                                        [...usageByCourseData]
                                            .sort((a, b) => {
                                                let aVal, bVal;
                                                if (courseSortField === "courseName") {
                                                    aVal = (a.courseName || "").toLowerCase();
                                                    bVal = (b.courseName || "").toLowerCase();
                                                    return courseSortDirection === "asc"
                                                        ? aVal.localeCompare(bVal)
                                                        : bVal.localeCompare(aVal);
                                                } else if (courseSortField === "lastApiCall" || courseSortField === "firstApiCall") {
                                                    aVal = new Date(a[courseSortField] || 0).getTime();
                                                    bVal = new Date(b[courseSortField] || 0).getTime();
                                                } else {
                                                    aVal = a[courseSortField] || 0;
                                                    bVal = b[courseSortField] || 0;
                                                }
                                                return courseSortDirection === "asc" ? aVal - bVal : bVal - aVal;
                                            })
                                            .map((course, idx) => (
                                                <tr key={course.courseId || idx} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-[var(--foreground)]">
                                                                {course.courseName || 'Untitled Course'}
                                                            </span>
                                                            <span className="text-xs text-[var(--muted-foreground)] font-mono">
                                                                {course.courseId?.substring(0, 8)}...
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium">
                                                        {(course.requestCount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        {(course.totalTokens || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        {(course.totalPromptTokens || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        {(course.totalCompletionTokens || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium text-[#EF4444]">
                                                        ${(course.totalCost || 0).toFixed(4)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        ${course.requestCount > 0 ? ((course.totalCost || 0) / course.requestCount).toFixed(4) : '0.0000'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                                                        {course.requestCount > 0 ? Math.round((course.totalTokens || 0) / course.requestCount).toLocaleString() : '0'}
                                                    </td>
                                                    <td className="py-3 px-4 text-left text-xs text-[var(--muted-foreground)]">
                                                        {course.lastApiCall ? (
                                                            <div className="flex flex-col">
                                                                <span>{new Date(course.lastApiCall).toLocaleDateString()}</span>
                                                                <span className="text-[10px]">{new Date(course.lastApiCall).toLocaleTimeString()}</span>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Courses by Cost */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Top 10 Courses by Cost</h3>
                            <div className="space-y-3">
                                {usageByCourseData
                                    .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
                                    .slice(0, 10)
                                    .map((course, idx) => {
                                        const maxCost = Math.max(...usageByCourseData.map(c => c.totalCost || 0));
                                        const percentage = maxCost > 0 ? ((course.totalCost || 0) / maxCost) * 100 : 0;
                                        return (
                                            <div key={course.courseId || idx} className="flex items-center gap-3">
                                                <span className="text-xs text-[var(--muted-foreground)] w-4">{idx + 1}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium truncate max-w-[200px]">
                                                            {course.courseName || 'Untitled'}
                                                        </span>
                                                        <span className="text-sm font-medium text-[#EF4444]">
                                                            ${(course.totalCost || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[#EF4444] rounded-full transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {usageByCourseData.length === 0 && (
                                    <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No course data available</p>
                                )}
                            </div>
                        </div>

                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Top 10 Courses by Token Usage</h3>
                            <div className="space-y-3">
                                {usageByCourseData
                                    .sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0))
                                    .slice(0, 10)
                                    .map((course, idx) => {
                                        const maxTokens = Math.max(...usageByCourseData.map(c => c.totalTokens || 0));
                                        const percentage = maxTokens > 0 ? ((course.totalTokens || 0) / maxTokens) * 100 : 0;
                                        return (
                                            <div key={course.courseId || idx} className="flex items-center gap-3">
                                                <span className="text-xs text-[var(--muted-foreground)] w-4">{idx + 1}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium truncate max-w-[200px]">
                                                            {course.courseName || 'Untitled'}
                                                        </span>
                                                        <span className="text-sm font-medium text-[var(--primary)]">
                                                            {(course.totalTokens || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[var(--primary)] rounded-full transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {usageByCourseData.length === 0 && (
                                    <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No course data available</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Course Generation Trends Over Time */}
                    <div className="card p-6">
                        <h3 className="font-semibold mb-4">Course Generation Trends Over Time</h3>
                        <p className="text-xs text-[var(--muted-foreground)] mb-4">
                            Daily averages for cost, tokens, and API calls per course
                        </p>
                        {courseTimeseriesData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-[var(--muted-foreground)]">
                                {dateRangeLoading ? "Loading..." : "No timeseries data available"}
                            </div>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-3">
                                {/* Avg Cost per Course */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Avg Cost per Course</h4>
                                    <div className="h-48 flex items-end gap-1">
                                        {courseTimeseriesData.slice(-30).map((d, i) => {
                                            const maxVal = Math.max(...courseTimeseriesData.slice(-30).map(x => x.avgCostPerCourse || 0));
                                            const height = maxVal > 0 ? ((d.avgCostPerCourse || 0) / maxVal) * 100 : 0;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center group relative">
                                                    <div
                                                        className="w-full bg-[#EF4444] rounded-t transition-all hover:bg-[#DC2626]"
                                                        style={{ height: `${Math.max(height, 2)}%` }}
                                                    />
                                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                                        <div className="font-medium">${(d.avgCostPerCourse || 0).toFixed(2)}</div>
                                                        <div className="text-[var(--muted-foreground)]">{d.period}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
                                        <span>{courseTimeseriesData.slice(-30)[0]?.period || ''}</span>
                                        <span>{courseTimeseriesData.slice(-30).slice(-1)[0]?.period || ''}</span>
                                    </div>
                                </div>

                                {/* Avg Tokens per Course */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Avg Tokens per Course</h4>
                                    <div className="h-48 flex items-end gap-1">
                                        {courseTimeseriesData.slice(-30).map((d, i) => {
                                            const maxVal = Math.max(...courseTimeseriesData.slice(-30).map(x => x.avgTokensPerCourse || 0));
                                            const height = maxVal > 0 ? ((d.avgTokensPerCourse || 0) / maxVal) * 100 : 0;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center group relative">
                                                    <div
                                                        className="w-full bg-[var(--primary)] rounded-t transition-all hover:opacity-80"
                                                        style={{ height: `${Math.max(height, 2)}%` }}
                                                    />
                                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                                        <div className="font-medium">{(d.avgTokensPerCourse || 0).toLocaleString()}</div>
                                                        <div className="text-[var(--muted-foreground)]">{d.period}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
                                        <span>{courseTimeseriesData.slice(-30)[0]?.period || ''}</span>
                                        <span>{courseTimeseriesData.slice(-30).slice(-1)[0]?.period || ''}</span>
                                    </div>
                                </div>

                                {/* Courses Generated per Day */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Courses per Day</h4>
                                    <div className="h-48 flex items-end gap-1">
                                        {courseTimeseriesData.slice(-30).map((d, i) => {
                                            const maxVal = Math.max(...courseTimeseriesData.slice(-30).map(x => x.courseCount || 0));
                                            const height = maxVal > 0 ? ((d.courseCount || 0) / maxVal) * 100 : 0;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center group relative">
                                                    <div
                                                        className="w-full bg-[#3B82F6] rounded-t transition-all hover:bg-[#2563EB]"
                                                        style={{ height: `${Math.max(height, 2)}%` }}
                                                    />
                                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                                        <div className="font-medium">{d.courseCount} courses</div>
                                                        <div className="text-[var(--muted-foreground)]">{d.period}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
                                        <span>{courseTimeseriesData.slice(-30)[0]?.period || ''}</span>
                                        <span>{courseTimeseriesData.slice(-30).slice(-1)[0]?.period || ''}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Summary Stats */}
                        {courseTimeseriesData.length > 0 && (
                            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mt-6 pt-6 border-t border-[var(--border)]">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#EF4444]">
                                        ${(courseTimeseriesData.reduce((sum, d) => sum + (d.avgCostPerCourse || 0), 0) / courseTimeseriesData.length).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-[var(--muted-foreground)]">Avg Cost/Course (period)</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[var(--primary)]">
                                        {Math.round(courseTimeseriesData.reduce((sum, d) => sum + (d.avgTokensPerCourse || 0), 0) / courseTimeseriesData.length).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-[var(--muted-foreground)]">Avg Tokens/Course (period)</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#3B82F6]">
                                        {courseTimeseriesData.reduce((sum, d) => sum + (d.courseCount || 0), 0)}
                                    </p>
                                    <p className="text-xs text-[var(--muted-foreground)]">Total Courses (period)</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[var(--foreground)]">
                                        {courseTimeseriesData.reduce((sum, d) => sum + (d.apiCalls || 0), 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-[var(--muted-foreground)]">Total API Calls (period)</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeSection === "usage" && (
                <div className="space-y-6">
                    {/* Cost Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                        <StatCard
                            title="Total Cost"
                            value={`$${(data.stats.totalCost ?? 0).toFixed(2)}`}
                            color="red"
                        />
                        <StatCard
                            title="Total Tokens"
                            value={(data.stats.totalTokens ?? 0).toLocaleString()}
                            color="primary"
                        />
                        <StatCard
                            title="API Calls"
                            value={(data.stats.totalCalls ?? 0).toLocaleString()}
                            color="blue"
                        />
                        <StatCard
                            title="Avg Cost/Call"
                            value={`$${(data.stats.avgCostPerCall ?? 0).toFixed(4)}`}
                        />
                        <StatCard
                            title="Avg Tokens/Call"
                            value={Math.round(data.stats.avgTokensPerCall ?? 0).toLocaleString()}
                        />
                    </div>

                    {/* Cost & Token Charts */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Cost Over Time</h3>
                            <CostChart data={data.cost} />
                        </div>
                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Token Usage Over Time</h3>
                            <TokenUsageChart data={data.tokenUsage} />
                        </div>
                    </div>

                    {/* Model Analysis */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">By Model</h3>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="card p-6">
                                <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">Cost by Model</h4>
                                <ModelCostBarChart data={data.byModel} />
                            </div>
                            <div className="card p-6">
                                <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">Calls Distribution</h4>
                                <ModelCallsPieChart data={data.byModel} />
                            </div>
                        </div>
                        <div className="card p-6">
                            <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">Token Usage by Model</h4>
                            <ModelTokensBarChart data={data.byModel} />
                        </div>
                        <div className="card p-6">
                            <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">Detailed Model Breakdown</h4>
                            <ModelUsageTable data={data.byModel} />
                        </div>
                    </div>

                    {/* Source Analysis */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">By Source / Stage</h3>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="card p-6">
                                <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">API Calls by Source</h4>
                                <UsageBySourceChart data={data.bySource} />
                            </div>
                            <div className="card p-6">
                                <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">Cost Distribution</h4>
                                <CostBySourcePieChart data={data.bySource} />
                            </div>
                        </div>
                        <div className="card p-6">
                            <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">Detailed Source Breakdown</h4>
                            <SourceUsageTable data={data.bySource} />
                        </div>
                    </div>
                </div>
            )}

            {activeSection === "feedback" && (
                <div className="space-y-6">
                    {/* Feedback Summary */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Feedback"
                            value={data.stats.feedbackCount ?? 0}
                            subtitle="In selected range"
                            color="primary"
                        />
                        <StatCard
                            title="Bug Reports"
                            value={data.stats.bugCount ?? 0}
                            color="red"
                            icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                        <StatCard
                            title="Feature Requests"
                            value={data.stats.featureCount ?? 0}
                            color="blue"
                            icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                        <StatCard
                            title="Other Feedback"
                            value={data.stats.otherCount ?? 0}
                            color="green"
                        />
                    </div>

                    {/* Feedback Table */}
                    <FeedbackTable feedback={data.feedback} />
                </div>
            )}

            {activeSection === "settings" && (
                <CourseExportTab usageByCourseData={usageByCourseData} dateRangeLoading={dateRangeLoading} />
            )}

            {activeSection === "moderation" && (
                <AdminModerationPanel />
            )}

<<<<<<< HEAD
            {activeSection === "jobs" && (
                <JobsPanel />
            )}

=======
>>>>>>> origin/main
            {activeSection === "releases" && (
                <ReleasesPanel />
            )}

            {activeSection === "settings" && (
                <div className="space-y-6">
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Worker Drain Mode</h3>
                            <button
                                onClick={fetchWorkerDrainStatus}
                                disabled={workerDrainRefreshing}
                                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {workerDrainRefreshing ? (
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                                ) : (
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7M19 5a9 9 0 00-14 7" />
                                    </svg>
                                )}
                                Refresh
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg">
                            <div>
                                <h4 className="font-medium text-[var(--foreground)]">
                                    {workerDrainEnabled ? "Draining enabled" : "Normal operation"}
                                </h4>
                                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                    When enabled, the worker skips jobs &gt; 5 credits, lets in-flight jobs finish, and then you can deploy safely.
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                                    <span>Active jobs: {workerDrainInfo.activeJobs ?? 0}</span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 border ${
                                            workerDrainEnabled && (workerDrainInfo.activeJobs ?? 0) === 0
                                                ? "border-emerald-400/60 text-emerald-500 bg-emerald-500/10"
                                                : "border-amber-400/60 text-amber-500 bg-amber-500/10"
                                        }`}
                                    >
                                        {workerDrainEnabled && (workerDrainInfo.activeJobs ?? 0) === 0
                                            ? "Safe to merge"
                                            : "Not safe to merge"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={toggleWorkerDrain}
                                disabled={workerDrainLoading}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                                    workerDrainEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                                } ${workerDrainLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        workerDrainEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        {workerDrainInfo?.activeByQueue && Object.keys(workerDrainInfo.activeByQueue).length > 0 && (
                            <div className="mt-4 text-xs text-[var(--muted-foreground)]">
                                <p className="font-medium text-[var(--foreground)] mb-2">Active jobs by queue</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(workerDrainInfo.activeByQueue).map(([queue, count]) => (
                                        <span key={queue} className="rounded-full bg-[var(--surface-1)] px-2 py-1 border border-[var(--border)]">
                                            {queue}: {count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Payment Settings</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg">
                                <div>
                                    <h4 className="font-medium text-[var(--foreground)]">2-Week Deal</h4>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                        Enable or disable the {stripePrices?.['2week_deal']?.unitAmount ? `$${(stripePrices['2week_deal'].unitAmount / 100).toFixed(2)}` : ''} two-week trial offer for new users.
                                    </p>
                                </div>
                                <button
                                    onClick={toggleTwoWeekDeal}
                                    disabled={twoWeekDealLoading}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                                        twoWeekDealEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                                    } ${twoWeekDealLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            twoWeekDealEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-[var(--muted-foreground)]">
                                            When enabled, new users who have never had a subscription will see the 2-week deal option in the pricing negotiation flow.
                                            This is a one-time offer - users who have previously subscribed will not see it.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Subscription Tiers</h3>
                        {stripePrices ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="p-4 bg-[var(--surface-2)] rounded-lg">
                                    <h4 className="font-medium text-[var(--foreground)]">
                                        {stripePrices.monthly?.productName || 'Monthly'}
                                    </h4>
                                    <p className="text-2xl font-bold text-[var(--primary)] mt-2">
                                        {stripePrices.monthly?.unitAmount
                                            ? `$${(stripePrices.monthly.unitAmount / 100).toFixed(2)}/mo`
                                            : 'N/A'}
                                    </p>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                        {stripePrices.monthly?.productDescription || 'Recurring subscription'}
                                    </p>
                                </div>
                                <div className="p-4 bg-[var(--surface-2)] rounded-lg border-2 border-[var(--primary)]">
                                    <h4 className="font-medium text-[var(--foreground)]">
                                        {stripePrices['3month']?.productName || '3 Month'}
                                    </h4>
                                    <p className="text-2xl font-bold text-[var(--primary)] mt-2">
                                        {stripePrices['3month']?.unitAmount
                                            ? `$${(stripePrices['3month'].unitAmount / 100).toFixed(2)}`
                                            : 'N/A'}
                                    </p>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                        {stripePrices['3month']?.productDescription || 'Save with 3-month plan'}
                                    </p>
                                </div>
                                <div className="p-4 bg-[var(--surface-2)] rounded-lg">
                                    <h4 className="font-medium text-[var(--foreground)]">
                                        {stripePrices['2week_deal']?.productName || '2 Week Deal'}
                                    </h4>
                                    <p className="text-2xl font-bold text-[var(--primary)] mt-2">
                                        {stripePrices['2week_deal']?.unitAmount
                                            ? `$${(stripePrices['2week_deal'].unitAmount / 100).toFixed(2)}`
                                            : 'N/A'}
                                    </p>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                        {stripePrices['2week_deal']?.productDescription || 'One-time, new users only'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"></div>
                                <span className="ml-2 text-sm text-[var(--muted-foreground)]">Loading prices...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
