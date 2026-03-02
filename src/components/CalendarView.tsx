'use client';

import { useState, useEffect } from 'react';

type TrackedEvent = {
    id: string;
    keyword: string;
    description: string;
    eventDate: string;
    endDate: string;
    startSeverity: number;
    endSeverity: number;
};

type DailyImpact = {
    event: TrackedEvent;
    severity: number;
};

// Generates an array of day numbers for the current month
function generateCalendarDays(year: number, month: number) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }
    return days;
}

export default function CalendarView() {
    // Current viewed month (defaults to today)
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const days = generateCalendarDays(currentDate.year, currentDate.month);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [events, setEvents] = useState<TrackedEvent[]>([]);
    const [draftRange, setDraftRange] = useState<{ startDate: string, endDate: string, step: number } | null>(null);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchEvents();
        const handleDraftDate = (e: Event) => {
            const ce = e as CustomEvent;
            setDraftRange(ce.detail);
        };
        // Listen for updates from EventManager
        window.addEventListener('eventsUpdated', fetchEvents);
        window.addEventListener('draftDateChanged', handleDraftDate);
        return () => {
            window.removeEventListener('eventsUpdated', fetchEvents);
            window.removeEventListener('draftDateChanged', handleDraftDate);
        };
    }, []);

    // 1. Calculate daily impacts mapping
    const dailyMap: Record<number, DailyImpact[]> = {};

    events.forEach(event => {
        const evTimestamp = new Date(event.eventDate);

        // Extract the original user-selected YYYY-MM-DD from the UTC representation
        const evYear = evTimestamp.getUTCFullYear();
        const evMonth = evTimestamp.getUTCMonth();
        const evDate = evTimestamp.getUTCDate();
        const localEvStartDate = new Date(evYear, evMonth, evDate);

        // Extract original user-selected end date
        const edTimestamp = new Date(event.endDate);
        const edYear = edTimestamp.getUTCFullYear();
        const edMonth = edTimestamp.getUTCMonth();
        const edDate = edTimestamp.getUTCDate();
        const localEvEndDate = new Date(edYear, edMonth, edDate);

        // For simplicity, we calculate the absolute offset days from the 1st of the current month
        const firstOfMonth = new Date(currentDate.year, currentDate.month, 1);

        // Difference in days between event start and 1st of current month
        const diffTime = localEvStartDate.getTime() - firstOfMonth.getTime();
        // Use Math.round to account for daylight saving boundaries, since both dates are midnight
        const startOffsetDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because day 1 is offset 0

        // Calculate duration days dynamically
        const durationDiffTime = localEvEndDate.getTime() - localEvStartDate.getTime();
        const durationDays = Math.max(1, Math.round(durationDiffTime / (1000 * 60 * 60 * 24)) + 1);

        for (let i = 0; i < durationDays; i++) {
            const currentCalendarDay = startOffsetDays + i;

            // Only aggregate if this day is actually in the current viewed month
            if (currentCalendarDay >= 1 && currentCalendarDay <= 31) {
                let severity = event.startSeverity;
                if (durationDays > 1) {
                    const ratio = i / (durationDays - 1);
                    severity = event.startSeverity + ((event.endSeverity - event.startSeverity) * ratio);
                }

                if (!dailyMap[currentCalendarDay]) dailyMap[currentCalendarDay] = [];
                // Round severity for visual and summation purposes to 1 decimal
                dailyMap[currentCalendarDay].push({ event, severity: Number(severity.toFixed(1)) });
            }
        }
    });

    // 2. Aggregate total risk scores per day
    let highestMonthRisk = 0;
    const aggregatedRisks: Record<number, number> = {};

    for (let day = 1; day <= 31; day++) {
        if (dailyMap[day]) {
            const totalScore = dailyMap[day].reduce((sum, item) => sum + item.severity, 0);
            aggregatedRisks[day] = Number(totalScore.toFixed(1));
            if (totalScore > highestMonthRisk) {
                highestMonthRisk = totalScore;
            }
        } else {
            aggregatedRisks[day] = 0;
        }
    }

    // Dynamic color scale based on the aggregated score. 
    // Uses the 1-10 CSS variables defined earlier. If score > 10, it maxes at 10.
    const getRiskColor = (totalScore: number) => {
        if (totalScore <= 0) return 'transparent';
        const tier = Math.min(10, Math.max(1, Math.ceil(totalScore)));
        return `var(--impact-${tier})`;
    };

    const monthName = new Date(currentDate.year, currentDate.month).toLocaleString('default', { month: 'long' });

    return (
        <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Total Risk Calendar</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => setCurrentDate(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 })}
                        style={{ color: 'var(--text-secondary)', padding: '4px 8px' }}
                    >&larr;</button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{monthName} {currentDate.year}</span>
                    <button
                        onClick={() => setCurrentDate(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 })}
                        style={{ color: 'var(--text-secondary)', padding: '4px 8px' }}
                    >&rarr;</button>
                </div>
            </div>

            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                {days.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;

                    const totalRisk = aggregatedRisks[day];
                    const isSelected = selectedDay === day;
                    const impacts = dailyMap[day] || [];

                    // Highlight logic: Days that are within 10% of the highest risk of the month get extra glow
                    const isPeakRisk = highestMonthRisk > 0 && totalRisk >= highestMonthRisk * 0.9;
                    const tileColor = getRiskColor(totalRisk);

                    const currentCalendarDateStr = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    let isInDraftRange = false;
                    let isDraftStart = false;
                    let isDraftEnd = false;
                    let isDrafting = false;

                    if (draftRange) {
                        if (currentCalendarDateStr >= draftRange.startDate && currentCalendarDateStr <= draftRange.endDate) {
                            isInDraftRange = true;
                        }
                        if (currentCalendarDateStr === draftRange.startDate) isDraftStart = true;
                        if (currentCalendarDateStr === draftRange.endDate) isDraftEnd = true;
                        if (draftRange.step === 1) isDrafting = true;
                    }

                    const isPulsing = isDrafting && isDraftStart && isDraftEnd;

                    return (
                        <div
                            key={day}
                            onClick={() => {
                                setSelectedDay(day);
                                const selectedDateStr = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                window.dispatchEvent(new CustomEvent('calendarDateSelected', { detail: { date: selectedDateStr } }));
                            }}
                            style={{
                                aspectRatio: '1',
                                borderRadius: '12px',
                                background: isDraftStart || isDraftEnd ? 'rgba(255,255,255,0.2)' : (isInDraftRange ? 'rgba(255,255,255,0.08)' : (totalRisk > 0 ? `${tileColor}22` : 'rgba(255,255,255,0.02)')),
                                border: `1px solid ${(isDraftStart || isDraftEnd) ? 'var(--accent-primary)' : (isInDraftRange ? 'rgba(255,255,255,0.3)' : (totalRisk > 0 ? tileColor : 'var(--border-color)'))}`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 4px',
                                cursor: 'pointer',
                                transition: 'var(--trans-fast)',
                                transform: isSelected ? 'scale(1.05)' : (isPeakRisk ? 'scale(1.02)' : 'scale(1)'),
                                boxShadow: isPulsing ? '0 0 15px var(--accent-primary)' : ((isSelected || isPeakRisk) && totalRisk > 0 ? `0 0 ${isPeakRisk ? '20px' : '10px'} ${tileColor}${isPeakRisk ? 'aa' : '66'}` : (isInDraftRange ? '0 0 5px rgba(255,255,255,0.1)' : 'none')),
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = isSelected ? 'scale(1.05)' : (isPeakRisk ? 'scale(1.02)' : 'scale(1)')}
                        >
                            <div style={{ fontSize: '1.25rem', fontWeight: isPeakRisk ? 800 : 600, color: totalRisk > 0 ? tileColor : 'var(--text-primary)', zIndex: 1 }}>
                                {day}
                            </div>

                            {/* Visual impact indicator for daily events */}
                            {totalRisk > 0 && (
                                <div style={{ zIndex: 1, fontSize: '0.8rem', fontWeight: 700, color: tileColor, textAlign: 'center' }}>
                                    {totalRisk}
                                    <div style={{ display: 'flex', gap: '2px', width: '100%', justifyContent: 'center', marginTop: '2px' }}>
                                        {impacts.slice(0, 4).map((_, i) => (
                                            <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: tileColor }} />
                                        ))}
                                        {impacts.length > 4 && <span style={{ fontSize: '0.6rem', lineHeight: '4px' }}>+</span>}
                                    </div>
                                </div>
                            )}

                            {totalRisk > 0 && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(to top, ${tileColor}44, transparent)`, zIndex: 0 }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Detail Panel */}
            {selectedDay && dailyMap[selectedDay] && dailyMap[selectedDay].length > 0 && (
                <div className="animate-fade-in" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>
                            Risk Breakdown: {monthName} {selectedDay}, {currentDate.year}
                        </h3>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getRiskColor(aggregatedRisks[selectedDay]) }}>
                            Total Risk: {aggregatedRisks[selectedDay]}
                        </div>
                    </div>

                    {dailyMap[selectedDay].map((impact, i) => (
                        <div key={i} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${getRiskColor(impact.severity)}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <h4 style={{ color: getRiskColor(impact.severity) }}>{impact.event.keyword}</h4>
                                <span style={{ fontWeight: 700, padding: '2px 10px', background: `${getRiskColor(impact.severity)}33`, borderRadius: '12px', color: getRiskColor(impact.severity), fontSize: '0.9rem' }}>
                                    +{impact.severity} points
                                </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {impact.event.description || 'No description provided.'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty Detail Panel */}
            {selectedDay && (!dailyMap[selectedDay] || dailyMap[selectedDay].length === 0) && (
                <div className="animate-fade-in" style={{ marginTop: '32px', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No active events impacting {monthName} {selectedDay}.</p>
                </div>
            )}
        </div>
    );
}

