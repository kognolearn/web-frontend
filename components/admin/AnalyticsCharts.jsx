"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const COLORS = ['#7ba37a', '#8B5CF6', '#34D399', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

// Hook to get theme-aware colors
function useChartColors() {
    const [colors, setColors] = useState({
        foreground: '#e8e8e8',
        muted: '#a0a0a0',
        border: '#4a4a4a',
        surface: '#2a2a2a',
        primary: '#7ba37a',
    });

    useEffect(() => {
        const updateColors = () => {
            const styles = getComputedStyle(document.documentElement);
            setColors({
                foreground: styles.getPropertyValue('--foreground').trim() || '#e8e8e8',
                muted: styles.getPropertyValue('--muted-foreground').trim() || '#a0a0a0',
                border: styles.getPropertyValue('--border').trim() || '#4a4a4a',
                surface: styles.getPropertyValue('--surface-1').trim() || '#2a2a2a',
                primary: styles.getPropertyValue('--primary').trim() || '#7ba37a',
            });
        };

        updateColors();
        
        // Listen for theme changes
        const observer = new MutationObserver(updateColors);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);

    return colors;
}

// Custom tooltip component for theme support
function CustomTooltip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null;
    
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-lg">
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="text-sm text-[var(--muted-foreground)]">
                    <span style={{ color: entry.color }}>●</span>{' '}
                    {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value}
                </p>
            ))}
        </div>
    );
}

export function DailyActiveUsersChart({ data }) {
    const colors = useChartColors();
    
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis
                        dataKey="date"
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        content={<CustomTooltip />}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        name="Active Users"
                        stroke={colors.primary}
                        strokeWidth={3}
                        dot={{ r: 4, fill: colors.primary, strokeWidth: 2, stroke: colors.surface }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// DAU, WAU, MAU combined chart
export function ActiveUsersChart({ data }) {
    const colors = useChartColors();
    
    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis
                        dataKey="date"
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        content={<CustomTooltip />}
                    />
                    <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                    />
                    <Line
                        type="monotone"
                        dataKey="dau"
                        name="DAU (Daily)"
                        stroke={colors.primary}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="wau"
                        name="WAU (Weekly)"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="mau"
                        name="MAU (Monthly)"
                        stroke="#34D399"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function TokenUsageChart({ data }) {
    const colors = useChartColors();
    
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis
                        dataKey="date"
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        content={<CustomTooltip formatter={(value) => value.toLocaleString()} />}
                        cursor={{ fill: 'rgba(123, 163, 122, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="prompt_tokens" name="Prompt Tokens" stackId="a" fill="#8B5CF6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="completion_tokens" name="Completion Tokens" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function CostChart({ data }) {
    const colors = useChartColors();
    
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis
                        dataKey="date"
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                        content={<CustomTooltip formatter={(value) => `$${Number(value).toFixed(4)}`} />}
                    />
                    <Line
                        type="monotone"
                        dataKey="cost"
                        name="Cost (USD)"
                        stroke="#EF4444"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#EF4444", strokeWidth: 2, stroke: colors.surface }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function UsageBySourceChart({ data }) {
    const colors = useChartColors();
    
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{
                        top: 5,
                        right: 30,
                        left: 80,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={colors.border} />
                    <XAxis type="number" stroke={colors.muted} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                        type="category" 
                        dataKey="source" 
                        stroke={colors.muted} 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        width={70}
                    />
                    <Tooltip
                        content={<CustomTooltip formatter={(value, name) => {
                            if (name === 'cost') return `$${Number(value).toFixed(4)}`;
                            return value.toLocaleString();
                        }} />}
                        cursor={{ fill: 'rgba(123, 163, 122, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="calls" name="API Calls" fill={colors.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function CostBySourcePieChart({ data }) {
    const colors = useChartColors();
    
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="cost"
                        nameKey="source"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={<CustomTooltip formatter={(value) => `$${Number(value).toFixed(4)}`} />}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ModelCostBarChart({ data }) {
    const colors = useChartColors();
    
    // Format model names to be shorter for display
    const formattedData = data.map(item => ({
        ...item,
        shortModel: item.model.split('/').pop() || item.model,
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={formattedData}
                    layout="vertical"
                    margin={{
                        top: 5,
                        right: 30,
                        left: 120,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={colors.border} />
                    <XAxis 
                        type="number" 
                        stroke={colors.muted} 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <YAxis 
                        type="category" 
                        dataKey="shortModel" 
                        stroke={colors.muted} 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        width={110}
                    />
                    <Tooltip
                        content={<CustomTooltip formatter={(value, name) => {
                            if (name === 'cost') return `$${Number(value).toFixed(4)}`;
                            return value.toLocaleString();
                        }} />}
                        cursor={{ fill: 'rgba(123, 163, 122, 0.1)' }}
                    />
                    <Bar dataKey="cost" name="Cost (USD)" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ModelTokensBarChart({ data }) {
    const colors = useChartColors();
    
    // Format model names to be shorter for display
    const formattedData = data.map(item => ({
        ...item,
        shortModel: item.model.split('/').pop() || item.model,
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={formattedData}
                    layout="vertical"
                    margin={{
                        top: 5,
                        right: 30,
                        left: 120,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={colors.border} />
                    <XAxis 
                        type="number" 
                        stroke={colors.muted} 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    />
                    <YAxis 
                        type="category" 
                        dataKey="shortModel" 
                        stroke={colors.muted} 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        width={110}
                    />
                    <Tooltip
                        content={<CustomTooltip formatter={(value) => value.toLocaleString()} />}
                        cursor={{ fill: 'rgba(123, 163, 122, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="prompt_tokens" name="Prompt" stackId="a" fill={colors.primary} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="completion_tokens" name="Completion" stackId="a" fill="#34D399" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ModelCallsPieChart({ data }) {
    const colors = useChartColors();
    
    // Format model names to be shorter for display
    const formattedData = data.map(item => ({
        ...item,
        shortModel: item.model.split('/').pop() || item.model,
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={formattedData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ shortModel, percent }) => `${shortModel} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="calls"
                        nameKey="shortModel"
                    >
                        {formattedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={<CustomTooltip formatter={(value) => value.toLocaleString()} />}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function EventsChart({ data }) {
    const colors = useChartColors();
    
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center text-[var(--muted-foreground)]">
                No event data available
            </div>
        );
    }
    
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis
                        dataKey="date"
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={colors.muted}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        content={<CustomTooltip formatter={(value) => value.toLocaleString()} />}
                        cursor={{ fill: 'rgba(123, 163, 122, 0.1)' }}
                    />
                    <Bar 
                        dataKey="count" 
                        name="Events" 
                        fill="#3B82F6" 
                        radius={[4, 4, 0, 0]} 
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function EventTypePieChart({ data }) {
    const colors = useChartColors();
    
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center text-[var(--muted-foreground)]">
                No event data available
            </div>
        );
    }

    // Format event type names for display
    const formattedData = data.map(item => ({
        ...item,
        displayType: item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={formattedData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ displayType, percent }) => percent > 0.05 ? `${displayType} (${(percent * 100).toFixed(0)}%)` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="displayType"
                    >
                        {formattedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={<CustomTooltip formatter={(value) => value.toLocaleString()} />}
                    />
                    <Legend 
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value, entry) => (
                            <span style={{ color: colors.foreground, fontSize: '12px' }}>{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ModelUsageTable({ data }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-2)]">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Model
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Calls
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Prompt Tokens
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Completion Tokens
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Total Tokens
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Cost (USD)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Avg Cost/Call
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-1)]">
                    {data.map((row, index) => (
                        <tr key={index} className="hover:bg-[var(--surface-2)] transition-colors">
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                                {row.model}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.calls.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.prompt_tokens.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.completion_tokens.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.total_tokens.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-[var(--primary)]">
                                ${row.cost.toFixed(4)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                ${row.avgCostPerCall.toFixed(6)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SourceUsageTable({ data }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-2)]">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Source/Stage
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Calls
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Total Tokens
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            Cost (USD)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            % of Total Cost
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-1)]">
                    {data.map((row, index) => (
                        <tr key={index} className="hover:bg-[var(--surface-2)] transition-colors">
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                                <span 
                                    className="inline-block h-3 w-3 rounded-full mr-2" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                {row.source}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.calls.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.total_tokens.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-[var(--primary)]">
                                ${row.cost.toFixed(4)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                                {row.percentage.toFixed(1)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
