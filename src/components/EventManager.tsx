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

export default function EventManager() {
    const [events, setEvents] = useState<TrackedEvent[]>([]);
    const [keyword, setKeyword] = useState('');
    const [description, setDescription] = useState('');

    // New state variables with defaults matching the 1-5 scale request
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [startSeverity, setStartSeverity] = useState(3);
    const [endSeverity, setEndSeverity] = useState(3);
    const [dateSelectionStep, setDateSelectionStep] = useState<0 | 1>(0);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        const handleDateSelect = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.date) {
                const selectedDate = customEvent.detail.date;
                if (dateSelectionStep === 0) {
                    setEventDate(selectedDate);
                    setEndDate(selectedDate);
                    setDateSelectionStep(1);
                } else {
                    if (new Date(selectedDate) < new Date(eventDate)) {
                        setEventDate(selectedDate);
                        setEndDate(selectedDate);
                        setDateSelectionStep(1);
                    } else {
                        setEndDate(selectedDate);
                        setDateSelectionStep(0);
                    }
                }
            }
        };
        window.addEventListener('calendarDateSelected', handleDateSelect);
        return () => window.removeEventListener('calendarDateSelected', handleDateSelect);
    }, [dateSelectionStep, eventDate]);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('draftDateChanged', {
            detail: { startDate: eventDate, endDate, step: dateSelectionStep }
        }));
    }, [eventDate, endDate, dateSelectionStep]);

    const dispatchUpdateEvent = () => {
        window.dispatchEvent(new Event('eventsUpdated'));
    };

    const resetForm = () => {
        setKeyword('');
        setDescription('');
        const today = new Date().toISOString().split('T')[0];
        setEventDate(today);
        setEndDate(today);
        setStartSeverity(3);
        setEndSeverity(3);
        setDateSelectionStep(0);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword) return;

        try {
            const url = editingId ? `/api/events/${editingId}` : '/api/events';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword,
                    description,
                    eventDate,
                    endDate,
                    startSeverity,
                    endSeverity
                }),
            });
            if (res.ok) {
                resetForm();
                fetchEvents();
                dispatchUpdateEvent(); // Notify CalendarView
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (ev: TrackedEvent) => {
        setKeyword(ev.keyword);
        setDescription(ev.description || '');
        setEventDate(new Date(ev.eventDate).toISOString().split('T')[0]);
        setEndDate(new Date(ev.endDate).toISOString().split('T')[0]);
        setStartSeverity(ev.startSeverity);
        setEndSeverity(ev.endSeverity);
        setEditingId(ev.id);
        setDateSelectionStep(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setEvents(events.filter(ev => ev.id !== id));
                dispatchUpdateEvent(); // Notify CalendarView
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Tracked Events</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Add economic keywords or events you want to monitor daily.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                <div className="form-grid">
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Keyword / Event Name <span style={{ color: 'var(--impact-5)' }}>*</span></label>
                        <input
                            type="text"
                            className="input-base"
                            placeholder="e.g. Interest Rates"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Description</label>
                        <input
                            type="text"
                            className="input-base"
                            placeholder="Optional context..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Start Date</label>
                        <input
                            type="date"
                            className="input-base"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>End Date</label>
                        <input
                            type="date"
                            className="input-base"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Start Severity (1-5)</label>
                        <input
                            type="number"
                            className="input-base"
                            value={startSeverity}
                            min="1"
                            max="5"
                            onChange={(e) => setStartSeverity(Number(e.target.value))}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>End Severity (1-5)</label>
                        <input
                            type="number"
                            className="input-base"
                            value={endSeverity}
                            min="1"
                            max="5"
                            onChange={(e) => setEndSeverity(Number(e.target.value))}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                    <button type="submit" className="btn-primary">
                        {editingId ? 'Update Tracking Event' : 'Add Tracking Event'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{
                                padding: '0 20px',
                                backgroundColor: 'transparent',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'rgba(255,255,255,0.7)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {loading ? <p>Loading...</p> : events.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No events tracked yet.</p> : events.map(ev => {
                    const d = new Date(ev.eventDate);
                    const formattedDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                    const ed = new Date(ev.endDate);
                    const formattedEndDate = `${ed.getUTCFullYear()}-${String(ed.getUTCMonth() + 1).padStart(2, '0')}-${String(ed.getUTCDate()).padStart(2, '0')}`;
                    return (
                        <div
                            key={ev.id}
                            className="glass-panel"
                            style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
                            onClick={() => handleEdit(ev)}
                        >
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>{ev.keyword}</div>
                                {ev.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{ev.description}</div>}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {formattedDate} to {formattedEndDate} | Trend: {ev.startSeverity}&rarr;{ev.endSeverity}
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}
                                style={{ padding: '8px', color: 'var(--impact-5)', opacity: 0.7, fontSize: '0.9rem', cursor: 'pointer', zIndex: 2, position: 'relative' }}
                                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                            >
                                Remove
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
