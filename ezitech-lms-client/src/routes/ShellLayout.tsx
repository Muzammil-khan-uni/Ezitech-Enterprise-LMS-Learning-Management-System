import { Outlet } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { PageTransition } from '@/components/ui';

export default function ShellLayout() {
  return (
    <AppShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
