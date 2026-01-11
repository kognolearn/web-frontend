"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "@/components/admin/AnalyticsCharts";
import FeedbackTable from "@/components/admin/FeedbackTable";
import AdminModerationPanel from "@/components/admin/AdminModerationPanel";
import ReleasesPanel from "@/components/admin/ReleasesPanel";

// Date range presets
const DATE_PRESETS = [
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "All", days: null },
];

// Tab configuration
const TABS = [
    { id: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "users", label: "Users & Engagement", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { id: "userBreakdown", label: "By User", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { id: "courseBreakdown", label: "By Course", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { id: "usage", label: "API & Costs", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { id: "feedback", label: "Feedback", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { id: "moderation", label: "Moderation", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    { id: "releases", label: "Releases", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
    { id: "exportCourse", label: "Export Course", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
    { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
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

export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [rawUsageData, setRawUsageData] = useState([]);
    const [feedbackData, setFeedbackData] = useState([]);
    const [eventsData, setEventsData] = useState([]);
    const [usageByUserData, setUsageByUserData] = useState([]);
    const [usageByCourseData, setUsageByCourseData] = useState([]);
    
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

        // Calculate DAU
        const dauMap = {};
        filteredRecords.forEach((stat) => {
            const date = new Date(stat.created_at).toLocaleDateString();
            if (!dauMap[date]) dauMap[date] = new Set();
            dauMap[date].add(stat.user_id);
        });

        // Calculate DAU, WAU, MAU for each day (rolling windows)
        const activeUsersData = [];
        const sortedDates = Object.keys(dauMap).sort((a, b) => new Date(a) - new Date(b));
        
        sortedDates.forEach((dateStr) => {
            const currentDate = new Date(dateStr);
            const dau = dauMap[dateStr]?.size || 0;
            
            // Calculate WAU (users active in last 7 days)
            const wauUsers = new Set();
            const weekAgo = new Date(currentDate);
            weekAgo.setDate(weekAgo.getDate() - 6);
            
            rawUsageData.forEach((stat) => {
                const statDate = new Date(stat.created_at);
                if (statDate >= weekAgo && statDate <= currentDate) {
                    wauUsers.add(stat.user_id);
                }
            });
            
            // Calculate MAU (users active in last 30 days)
            const mauUsers = new Set();
            const monthAgo = new Date(currentDate);
            monthAgo.setDate(monthAgo.getDate() - 29);
            
            rawUsageData.forEach((stat) => {
                const statDate = new Date(stat.created_at);
                if (statDate >= monthAgo && statDate <= currentDate) {
                    mauUsers.add(stat.user_id);
                }
            });
            
            activeUsersData.push({
                date: dateStr,
                dau,
                wau: wauUsers.size,
                mau: mauUsers.size,
            });
        });

        // Current period DAU/WAU/MAU (for stats cards)
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const todayUsers = new Set();
        const weekUsers = new Set();
        const monthUsers = new Set();
        
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        
        const monthStart = new Date(today);
        monthStart.setDate(monthStart.getDate() - 29);
        monthStart.setHours(0, 0, 0, 0);
        
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        
        rawUsageData.forEach((stat) => {
            const statDate = new Date(stat.created_at);
            if (statDate >= todayStart && statDate <= today) {
                todayUsers.add(stat.user_id);
            }
            if (statDate >= weekStart && statDate <= today) {
                weekUsers.add(stat.user_id);
            }
            if (statDate >= monthStart && statDate <= today) {
                monthUsers.add(stat.user_id);
            }
        });

        const currentDAU = todayUsers.size;
        const currentWAU = weekUsers.size;
        const currentMAU = monthUsers.size;

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
        const stats = {
            totalUsers: uniqueUsers.size,
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
    }, [rawUsageData, feedbackData, eventsData, startDate, endDate]);

    // Separate loading state for date-range data
    const [dateRangeLoading, setDateRangeLoading] = useState(false);
    const [twoWeekDealEnabled, setTwoWeekDealEnabled] = useState(false);
    const [twoWeekDealLoading, setTwoWeekDealLoading] = useState(false);
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
                const [usageByUserRes, usageByCourseRes] = await Promise.all([
                    fetch(`/api/admin/analytics/usage-by-user?includeEmail=true&${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/usage-by-course?includeCourseName=true&${dateParams}`, { headers }),
                ]);

                const [usageByUserResult, usageByCourseResult] = await Promise.all([
                    usageByUserRes.json(),
                    usageByCourseRes.json(),
                ]);

                setUsageByUserData(usageByUserResult.success ? (usageByUserResult.users || usageByUserResult.data || []) : []);
                setUsageByCourseData(usageByCourseResult.success ? (usageByCourseResult.courses || usageByCourseResult.data || []) : []);
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
                const [usageByUserRes, usageByCourseRes] = await Promise.all([
                    fetch(`/api/admin/analytics/usage-by-user?includeEmail=true&${dateParams}`, { headers }),
                    fetch(`/api/admin/analytics/usage-by-course?includeCourseName=true&${dateParams}`, { headers }),
                ]);

                const [usageByUserResult, usageByCourseResult] = await Promise.all([
                    usageByUserRes.json(),
                    usageByCourseRes.json(),
                ]);

                setUsageByUserData(usageByUserResult.success ? (usageByUserResult.users || usageByUserResult.data || []) : []);
                setUsageByCourseData(usageByCourseResult.success ? (usageByCourseResult.courses || usageByCourseResult.data || []) : []);
            } catch (err) {
                console.error("Error fetching date-range data:", err);
            } finally {
                setDateRangeLoading(false);
            }
        };

        fetchDateRangeData();
    }, [startDate, endDate]);

    // Fetch two-week deal status on mount
    useEffect(() => {
        const fetchTwoWeekDealStatus = async () => {
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
        };
        fetchTwoWeekDealStatus();
    }, []);

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

    return (
        <div className="space-y-6">
            {/* Page Header with Date Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                        {startDate && endDate && (
                            <span>{new Date(startDate).toLocaleDateString()} – {new Date(endDate).toLocaleDateString()}</span>
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

            {/* Tab Navigation */}
            <div className="border-b border-[var(--border)]">
                <nav className="-mb-px flex space-x-1 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                    : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
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
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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

            {activeTab === "users" && (
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

            {activeTab === "userBreakdown" && (
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

            {activeTab === "courseBreakdown" && (
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
                        <div className="p-4 border-b border-[var(--border)]">
                            <h3 className="font-semibold">Course-by-Course Breakdown</h3>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">Average cost, token usage, and other metrics per course</p>
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
                                        <th className="text-left py-3 px-4 font-medium text-[var(--muted-foreground)]">Sources</th>
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
                                        usageByCourseData
                                            .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
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
                                                    <td className="py-3 px-4 text-left max-w-[200px]">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(course.sources || []).slice(0, 5).map((source, i) => (
                                                                <span key={i} className="inline-flex items-center rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]">
                                                                    {source}
                                                                </span>
                                                            ))}
                                                            {(course.sources?.length || 0) > 5 && (
                                                                <span className="text-xs text-[var(--muted-foreground)]">
                                                                    +{course.sources.length - 5} more
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
                </div>
            )}

            {activeTab === "usage" && (
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

            {activeTab === "feedback" && (
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

            {activeTab === "exportCourse" && (
                <CourseExportTab usageByCourseData={usageByCourseData} dateRangeLoading={dateRangeLoading} />
            )}

            {activeTab === "moderation" && (
                <AdminModerationPanel />
            )}

            {activeTab === "releases" && (
                <ReleasesPanel />
            )}

            {activeTab === "settings" && (
                <div className="space-y-6">
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
                                            When enabled, new users who have never had a subscription will see the 2-week deal option on the pricing page.
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
