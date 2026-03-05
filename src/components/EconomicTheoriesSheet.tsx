'use client';

import React, { useState, useEffect } from 'react';

type Theory = {
    id: string;
    title: string;
    description: string;
    order: number;
};

export default function EconomicTheoriesSheet() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [theories, setTheories] = useState<Theory[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [order, setOrder] = useState(0);

    const fetchTheories = async () => {
        try {
            const res = await fetch('/api/theories');
            if (res.ok) {
                const data = await res.json();
                setTheories(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        fetchTheories();
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Prevent background scroll when opened
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchTheories(); // refetch on open
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setOrder(0);
        setEditId(null);
        setShowForm(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editId ? `/api/theories/${editId}` : '/api/theories';
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, order })
            });

            if (res.ok) {
                await fetchTheories();
                resetForm();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (t: Theory) => {
        setTitle(t.title);
        setDescription(t.description);
        setOrder(t.order);
        setEditId(t.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/theories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchTheories();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (!mounted) return null;

    return (
        <>
            {/* Subtle icon button that's mostly invisible until hovered */}
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    color: 'var(--text-secondary)',
                    opacity: 0.3,
                    transition: 'var(--trans-normal)',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.opacity = '0.3';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                aria-label="Open Economic Theories Sheet"
                title="핵심 경제 이론 (Economic Theories)"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
            </button>

            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    opacity: isOpen ? 1 : 0,
                    visibility: isOpen ? 'visible' : 'hidden',
                    transition: 'all 0.3s ease-in-out',
                    zIndex: 9998,
                }}
                onClick={() => setIsOpen(false)}
            />

            {/* Slide-out Sheet */}
            <div
                className="glass-panel"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    height: '100vh',
                    width: '100%',
                    maxWidth: '450px',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px 0 0 20px',
                    borderRight: 'none',
                    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
                    background: 'rgba(23, 27, 33, 0.85)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '32px 24px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>늘 기억해야 할 경제 이론</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            시장 변동성 속에서도 중심을 잡기 위한 핵심 원칙들
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        style={{
                            padding: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            transition: 'var(--trans-fast)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 10000
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    >
                        <svg style={{ pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    {/* Form for Create/Update */}
                    {(showForm || theories.length === 0) ? (
                        <form onSubmit={handleSave} style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
                                {editId ? '이론 수정' : '새 이론 추가'}
                            </h3>
                            <div style={{ marginBottom: '12px' }}>
                                <input
                                    className="input-base"
                                    placeholder="이름 (예: 금리와 주식 시장)"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    style={{ padding: '10px 14px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <textarea
                                    className="input-base"
                                    placeholder="상세 설명..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    required
                                    rows={3}
                                    style={{ padding: '10px 14px', resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                {theories.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
                                        onMouseOver={e => e.currentTarget.style.color = '#fff'}
                                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    >
                                        취소
                                    </button>
                                )}
                                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                                    {editId ? '저장' : '추가'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => { resetForm(); setEditId(null); setShowForm(true); }}
                            style={{
                                padding: '10px',
                                textAlign: 'center',
                                border: '1px dashed var(--border-color)',
                                borderRadius: '12px',
                                color: 'var(--text-secondary)',
                                transition: 'var(--trans-fast)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                            + 새 이론 추가하기
                        </button>
                    )}

                    {theories.map((theory) => (
                        <div
                            key={theory.id}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '16px',
                                padding: '20px',
                                transition: 'var(--trans-normal)',
                                position: 'relative'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            }}
                        >
                            {/* Actions overlay */}
                            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEdit(theory)} style={{ color: 'var(--text-secondary)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onClick={() => handleDelete(theory.id)} style={{ color: 'var(--impact-10)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>

                            <h3 style={{
                                fontSize: '1.2rem',
                                color: 'var(--text-primary)',
                                marginBottom: '12px',
                                paddingRight: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ color: 'var(--accent-primary)', fontSize: '1.4rem' }}>•</span>
                                {theory.title}
                            </h3>
                            <p style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.95rem',
                                lineHeight: 1.7,
                                whiteSpace: 'pre-wrap'
                            }}>
                                {theory.description}
                            </p>
                        </div>
                    ))}

                    <div style={{ paddingBottom: '32px' }} />
                </div>
            </div>
        </>
    );
}
