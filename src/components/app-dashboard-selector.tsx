'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PanelsTopLeft } from 'lucide-react';

const appDashboards = [
  { label: 'Virtual Assessor', href: '/dashboard/app-progress/virtual-assessor' },
  { label: 'DMS', href: '/dashboard/app-progress/dms' },
  { label: 'Salvage Management', href: '/dashboard/app-progress/salvage-management' },
];

export default function AppDashboardSelector() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <PanelsTopLeft size={17} className="text-indigo-400" />
      <span className="sr-only">Select app dashboard</span>
      <select
        value={pathname}
        onChange={(event) => router.push(event.target.value)}
        className="app-dashboard-select bg-transparent text-sm font-medium text-slate-200 outline-none"
        aria-label="Select app dashboard"
      >
        {appDashboards.map((app) => <option key={app.href} value={app.href}>{app.label}</option>)}
      </select>
    </label>
  );
}
