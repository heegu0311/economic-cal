import type { Metadata } from 'next';
import './globals.css';
import EconomicTheoriesSheet from '@/components/EconomicTheoriesSheet';

export const metadata: Metadata = {
  title: 'Expectation - Stock Market Insight',
  description: 'Track economic events and analyze daily global news impacts for better trading decisions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="container animate-fade-in">
          <nav style={{ padding: '2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-primary)' }}>✦</span>
              Expectation
            </div>
            <EconomicTheoriesSheet />
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
