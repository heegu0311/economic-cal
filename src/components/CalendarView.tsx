'use client';

import { useState, useEffect, useRef } from 'react';

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
    // Current viewed starting month
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const [events, setEvents] = useState<TrackedEvent[]>([]);
    const [draftRange, setDraftRange] = useState<{ startDate: string, endDate: string, step: number } | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollAccumulator = useRef(0);
    const lastScrollTime = useRef(Date.now());
    const isThrottled = useRef(false);

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
        // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
        fetchEvents();
        const handleDraftDate = (e: Event) => {
            const ce = e as CustomEvent;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDraftRange(ce.detail);
        };
        // Listen for updates from EventManager
        window.addEventListener('eventsUpdated', fetchEvents);
        window.addEventListener('draftDateChanged', handleDraftDate);

        let touchStartY = 0;

        const handleScrollAction = (deltaY: number) => {
            if (isThrottled.current) return;

            const now = Date.now();
            if (now - lastScrollTime.current > 300) {
                scrollAccumulator.current = 0;
            }
            lastScrollTime.current = now;

            scrollAccumulator.current += deltaY;
            const threshold = 150; // threshold stringency 

            if (scrollAccumulator.current > threshold) {
                setCurrentDate(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 });
                scrollAccumulator.current = 0;
                isThrottled.current = true;
                setTimeout(() => { isThrottled.current = false; }, 600);
            } else if (scrollAccumulator.current < -threshold) {
                setCurrentDate(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 });
                scrollAccumulator.current = 0;
                isThrottled.current = true;
                setTimeout(() => { isThrottled.current = false; }, 600);
            }
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            handleScrollAction(e.deltaY);
        };

        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
            scrollAccumulator.current = 0;
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const currentY = e.touches[0].clientY;
            const deltaY = touchStartY - currentY; // positive = swipe up = scroll down
            touchStartY = currentY;
            handleScrollAction(deltaY);
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            container.addEventListener('touchstart', handleTouchStart, { passive: false });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
        }

        return () => {
            window.removeEventListener('eventsUpdated', fetchEvents);
            window.removeEventListener('draftDateChanged', handleDraftDate);
            if (container) {
                container.removeEventListener('wheel', handleWheel);
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchmove', handleTouchMove);
            }
        };
    }, []);

    // 1. Calculate events and severity per absolute date string (YYYY-MM-DD)
    const eventsByDate: Record<string, DailyImpact[]> = {};

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

        // Calculate duration days dynamically
        const durationDiffTime = localEvEndDate.getTime() - localEvStartDate.getTime();
        const durationDays = Math.max(1, Math.round(durationDiffTime / (1000 * 60 * 60 * 24)) + 1);

        for (let i = 0; i < durationDays; i++) {
            const currentDay = new Date(localEvStartDate.getFullYear(), localEvStartDate.getMonth(), localEvStartDate.getDate() + i);
            const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;

            let severity = event.startSeverity;
            if (durationDays > 1) {
                const ratio = i / (durationDays - 1);
                severity = event.startSeverity + ((event.endSeverity - event.startSeverity) * ratio);
            }

            if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
            eventsByDate[dateStr].push({ event, severity: Number(severity.toFixed(1)) });
        }
    });

    const aggregatedRisks: Record<string, number> = {};
    Object.keys(eventsByDate).forEach(dateStr => {
        const totalScore = eventsByDate[dateStr].reduce((sum, item) => sum + item.severity, 0);
        aggregatedRisks[dateStr] = Number(totalScore.toFixed(1));
    });

    const getRiskColor = (totalScore: number) => {
        if (totalScore <= 0) return 'transparent';
        const tier = Math.min(10, Math.max(1, Math.ceil(totalScore)));
        return `var(--impact-${tier})`;
    };

    // Calculate months to show (Current and Next Month)
    const monthsToRender = [
        { year: currentDate.year, month: currentDate.month },
        currentDate.month === 11 ? { year: currentDate.year + 1, month: 0 } : { year: currentDate.year, month: currentDate.month + 1 }
    ];

    const firstMonthName = new Date(currentDate.year, currentDate.month).toLocaleString('default', { month: 'long' });

    return (
        <div ref={scrollContainerRef} className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Total Risk Calendar</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => setCurrentDate(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 })}
                        style={{ color: 'var(--text-secondary)', padding: '4px 8px' }}
                    >&larr;</button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{firstMonthName} {currentDate.year}</span>
                    <button
                        onClick={() => setCurrentDate(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 })}
                        style={{ color: 'var(--text-secondary)', padding: '4px 8px' }}
                    >&rarr;</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {monthsToRender.map((monthData, monthIndex) => {
                    const days = generateCalendarDays(monthData.year, monthData.month);
                    const monthName = new Date(monthData.year, monthData.month).toLocaleString('default', { month: 'long' });

                    // Highest risk specifically for this month to calculate peak dates local to the month
                    let highestMonthRisk = 0;
                    days.forEach(day => {
                        if (day) {
                            const dateStr = `${monthData.year}-${String(monthData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            if (aggregatedRisks[dateStr] > highestMonthRisk) {
                                highestMonthRisk = aggregatedRisks[dateStr];
                            }
                        }
                    });

                    return (
                        <div key={`${monthData.year}-${monthData.month}`}>
                            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', textAlign: 'center' }}>
                                {monthName} {monthData.year}
                            </h3>
                            {/* Days of Week Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                            </div>

                            {/* Calendar Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                                {days.map((day, idx) => {
                                    if (day === null) return <div key={`empty-${idx}`} />;

                                    const dateStr = `${monthData.year}-${String(monthData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const totalRisk = aggregatedRisks[dateStr] || 0;
                                    const isSelected = selectedDateStr === dateStr;
                                    const impacts = eventsByDate[dateStr] || [];

                                    const isPeakRisk = highestMonthRisk > 0 && totalRisk >= highestMonthRisk * 0.9;
                                    const tileColor = getRiskColor(totalRisk);

                                    let isInDraftRange = false;
                                    let isDraftStart = false;
                                    let isDraftEnd = false;
                                    let isDrafting = false;

                                    if (draftRange) {
                                        if (dateStr >= draftRange.startDate && dateStr <= draftRange.endDate) {
                                            isInDraftRange = true;
                                        }
                                        if (dateStr === draftRange.startDate) isDraftStart = true;
                                        if (dateStr === draftRange.endDate) isDraftEnd = true;
                                        if (draftRange.step === 1) isDrafting = true;
                                    }

                                    const isPulsing = isDrafting && isDraftStart && isDraftEnd;

                                    return (
                                        <div
                                            key={day}
                                            onClick={() => {
                                                setSelectedDateStr(dateStr);
                                                window.dispatchEvent(new CustomEvent('calendarDateSelected', { detail: { date: dateStr } }));
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
                        </div>
                    );
                })}
            </div>

            {/* Detail Panel */}
            {selectedDateStr && eventsByDate[selectedDateStr] && eventsByDate[selectedDateStr].length > 0 && (
                <div className="animate-fade-in" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>
                            Risk Breakdown: {new Date(selectedDateStr).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getRiskColor(aggregatedRisks[selectedDateStr]) }}>
                            Total Risk: {aggregatedRisks[selectedDateStr]}
                        </div>
                    </div>

                    {eventsByDate[selectedDateStr].map((impact, i) => (
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
            {selectedDateStr && (!eventsByDate[selectedDateStr] || eventsByDate[selectedDateStr].length === 0) && (
                <div className="animate-fade-in" style={{ marginTop: '32px', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        No active events impacting {new Date(selectedDateStr).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}.
                    </p>
                </div>
            )}
        </div>
    );
}


