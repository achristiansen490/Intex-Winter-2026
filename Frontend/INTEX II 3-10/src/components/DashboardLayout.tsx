import type { ReactNode } from 'react';

/**
 * Shared shell for donor, staff, resident, and admin dashboards:
 * full-height row, shared Sidebar behavior, one scrollable content column.
 */
export function DashboardLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <main id="main-content" style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebar}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
        }}
      >
        {children}
      </div>
    </main>
  );
}
