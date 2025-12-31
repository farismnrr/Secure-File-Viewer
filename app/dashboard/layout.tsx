/**
 * Dashboard Layout
 * Wraps all dashboard pages with shell
 */

import { Shell } from '@/components/Shell';

export const metadata = {
  title: 'Dashboard - Secure File Viewer',
  description: 'Dashboard for managing files and documents'
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Shell>
      {children}
    </Shell>
  );
}
