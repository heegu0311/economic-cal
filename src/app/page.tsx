import EventManager from '@/components/EventManager';
import CalendarView from '@/components/CalendarView';

export default function Home() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '32px', paddingBottom: '64px' }}>

      {/* Left Column: Management */}
      <div>
        <header style={{ marginBottom: '48px' }}>
          <h1 style={{ marginBottom: '16px' }}>Market Radar</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Monitor global events and evaluate their impact on your portfolio through AI-driven severity analysis.
          </p>
        </header>

        <EventManager />
      </div>

      {/* Right Column: Visualization */}
      <div>
        <CalendarView />
      </div>

    </div>
  );
}
