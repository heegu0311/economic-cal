'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries, Time } from 'lightweight-charts';

type TrackedEvent = {
    id: string;
    keyword: string;
    description: string;
    eventDate: string;
    endDate: string;
    startSeverity: number;
    endSeverity: number;
};

export default function RiskChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [events, setEvents] = useState<TrackedEvent[]>([]);

    // We will keep a ref to the chart so we don't recreate it unnecessarily
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchEvents();
        window.addEventListener('eventsUpdated', fetchEvents);
        return () => {
            window.removeEventListener('eventsUpdated', fetchEvents);
        };
    }, []);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Initialize chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.7)',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                rightOffset: 12,
                barSpacing: 30,
                fixLeftEdge: true,
                lockVisibleTimeRangeOnResize: true,
                rightBarStaysOnScroll: true,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            crosshair: {
                mode: 1,
            },
        });

        const series = chart.addSeries(AreaSeries, {
            lineColor: '#3b82f6', // var(--accent-primary)
            topColor: 'rgba(59, 130, 246, 0.4)', // --accent-glow
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineWidth: 2,
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
            const newRect = entries[0].contentRect;
            chart.applyOptions({ width: newRect.width, height: newRect.height });
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (!seriesRef.current || events.length === 0) return;

        // Calculate risks just like in CalendarView
        const aggregatedRisks: Record<string, number> = {};

        events.forEach(event => {
            const evTimestamp = new Date(event.eventDate);
            const evYear = evTimestamp.getUTCFullYear();
            const evMonth = evTimestamp.getUTCMonth();
            const evDate = evTimestamp.getUTCDate();
            const localEvStartDate = new Date(evYear, evMonth, evDate);

            const edTimestamp = new Date(event.endDate);
            const edYear = edTimestamp.getUTCFullYear();
            const edMonth = edTimestamp.getUTCMonth();
            const edDate = edTimestamp.getUTCDate();
            const localEvEndDate = new Date(edYear, edMonth, edDate);

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

                if (!aggregatedRisks[dateStr]) aggregatedRisks[dateStr] = 0;
                aggregatedRisks[dateStr] += Number(severity.toFixed(1));
            }
        });

        // Convert dict to array of { time: 'YYYY-MM-DD', value: totalScore }
        const chartData = Object.keys(aggregatedRisks)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(dateStr => ({
                time: dateStr,
                value: aggregatedRisks[dateStr]
            }));

        // Fill in missing days so the timeline makes sense
        if (chartData.length > 0) {
            const firstDate = new Date(chartData[0].time as string);
            const lastDate = new Date(chartData[chartData.length - 1].time as string);

            // Expand a little bit forward and backward so we can see around it
            firstDate.setDate(firstDate.getDate() - 7);
            lastDate.setDate(lastDate.getDate() + 14);

            const expandedData = [];
            for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                expandedData.push({
                    time: dateStr,
                    value: aggregatedRisks[dateStr] || 0
                });
            }

            // Lightweight charts requires data to be strictly ascending in time, without duplicates
            seriesRef.current.setData(expandedData);

            // Scroll to show today ±30 days so today is always centered
            const today = new Date();
            const toDateStr = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const fromDate = new Date(today);
            fromDate.setDate(today.getDate() - 30);
            const toDate = new Date(today);
            toDate.setDate(today.getDate() + 30);

            chartRef.current?.timeScale().setVisibleRange({
                from: toDateStr(fromDate) as Time,
                to: toDateStr(toDate) as Time,
            });
        } else {
            // If no events, just reset
            seriesRef.current.setData([]);
        }

    }, [events]);

    return (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '24px' }}>Risk Trend Chart</h2>
            <div
                ref={chartContainerRef}
                style={{ width: '100%', height: '300px' }}
            />
        </div>
    );
}
