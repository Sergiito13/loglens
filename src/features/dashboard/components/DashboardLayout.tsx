import type { ReactNode } from 'react';

import { AmbientBackground } from '../../../components/ui/AmbientBackground';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <main className="ll-dash-page">
      <AmbientBackground />

      <div className="ll-dash-container">{children}</div>
    </main>
  );
}
