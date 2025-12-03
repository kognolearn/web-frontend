"use client";

import { useState } from "react";

export default function FeedbackTable({ feedback }) {
    const [filter, setFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");

    const filteredFeedback = feedback
        .filter((item) => {
            if (filter === "all") return true;
            return item.type === filter;
        })
        .sort((a, b) => {
            if (sortBy === "date") {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
            }
            return 0;
        });

    const getBadgeColor = (type) => {
        switch (type) {
            case "bug":
                return "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30";
            case "feature":
                return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30";
            case "other":
                return "bg-[var(--muted-foreground)]/20 text-[var(--muted-foreground)] border border-[var(--border)]";
            default:
                return "bg-[var(--muted-foreground)]/20 text-[var(--muted-foreground)] border border-[var(--border)]";
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "bug":
                return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
            case "feature":
                return "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z";
            default:
                return "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";
        }
    };

    return (
        <div className="card overflow-hidden">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-2)]">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--muted-foreground)]">Filter:</span>
                    <div className="flex gap-1">
                        {[
                            { value: "all", label: "All" },
                            { value: "bug", label: "Bugs" },
                            { value: "feature", label: "Features" },
                            { value: "other", label: "Other" },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    filter === option.value
                                        ? "bg-[var(--primary)] text-white"
                                        : "bg-[var(--surface-1)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--muted-foreground)]">{filteredFeedback.length} items</span>
                    <button
                        onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                        className="flex items-center gap-1 rounded-md bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                        <svg className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {sortOrder === "desc" ? "Newest" : "Oldest"}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-1)] text-xs uppercase text-[var(--muted-foreground)]">
                        <tr>
                            <th className="px-4 py-3 font-medium w-28">Date</th>
                            <th className="px-4 py-3 font-medium w-48">User</th>
                            <th className="px-4 py-3 font-medium w-32">Type</th>
                            <th className="px-4 py-3 font-medium">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {filteredFeedback.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="text-[var(--muted-foreground)]">No feedback found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredFeedback.map((item) => (
                                <tr key={item.id} className="hover:bg-[var(--surface-2)] transition-colors">
                                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                                        <div className="flex flex-col">
                                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                            <span className="text-xs opacity-70">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[var(--foreground)] truncate max-w-[180px]">
                                                {item.user_email || "Anonymous"}
                                            </span>
                                            <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[180px]">{item.user_id?.slice(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeColor(item.type)}`}
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTypeIcon(item.type)} />
                                            </svg>
                                            {item.type.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[var(--foreground)] line-clamp-2">{item.message}</p>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
