/**
 * Analytics Utility Functions
 */

/**
 * Group leads by date for charts
 * Returns array of { date: "Mon", count: 5, fullDate: "2023-10-27" }
 */
export const groupLeadsByDay = (leads, days = 7) => {
    const groups = {};
    const result = [];
    const today = new Date();

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        groups[key] = { date: dayName, count: 0, fullDate: d.toLocaleDateString() };
    }

    // Fill counts
    leads.forEach(lead => {
        if (!lead.createdAt) return;
        const key = new Date(lead.createdAt).toISOString().split('T')[0];
        if (groups[key]) {
            groups[key].count++;
        }
    });

    // Convert to sorted array
    Object.keys(groups).sort().forEach(key => {
        result.push(groups[key]);
    });

    return result;
};

/**
 * Group leads by Source
 */
export const groupLeadsBySource = (leads) => {
    if (!leads || leads.length === 0) return [];

    const counts = {};
    leads.forEach(lead => {
        const source = lead.source || 'Direct';
        counts[source] = (counts[source] || 0) + 1;
    });

    const total = leads.length;

    const palette = [
        { color: 'text-blue-500', bg: 'bg-blue-500', hex: '#3b82f6' },
        { color: 'text-indigo-500', bg: 'bg-indigo-500', hex: '#6366f1' },
        { color: 'text-emerald-500', bg: 'bg-emerald-500', hex: '#10b981' },
        { color: 'text-orange-500', bg: 'bg-orange-500', hex: '#f97316' },
        { color: 'text-purple-500', bg: 'bg-purple-500', hex: '#a855f7' },
        { color: 'text-cyan-500', bg: 'bg-cyan-500', hex: '#06b6d4' },
    ];

    return Object.keys(counts)
        .map((key, index) => ({
            name: key,
            value: counts[key],
            percent: Math.round((counts[key] / total) * 100),
            color: palette[index % palette.length].color,
            bg: palette[index % palette.length].bg,
            hex: palette[index % palette.length].hex,
        }))
        .sort((a, b) => b.value - a.value);
};
