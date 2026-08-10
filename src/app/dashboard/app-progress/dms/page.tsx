'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Database, Loader2, Maximize2, Minimize2, Search, Upload, UserRoundCheck, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppDashboardSelector from '@/components/app-dashboard-selector';

interface DmsUser { id: number; externalUserId: string | null; userName: string | null; email: string | null; status: string; }
interface MonthSummary { month: string; _sum: { documentCount: number | null }; _count: { _all: number }; }
interface UserSummary { userId: string; _sum: { documentCount: number | null }; _count: { _all: number }; }
interface DmsData { users: DmsUser[]; indexByMonth: MonthSummary[]; indexByUser: UserSummary[]; }

const STORAGE_KEY = 'sgic-dms-month-filter';
const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const tooltipStyle = { backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 12, color: 'var(--text-title)' };

function MonthFilter({ months, selected, onChange }: { months: string[]; selected: string[]; onChange: (months: string[]) => void }) {
  const active = selected.length ? selected : months;
  const toggle = (month: string) => {
    const next = active.includes(month) ? active.filter((item) => item !== month) : [...active, month];
    if (next.length) onChange(next);
  };
  return <details className="relative">
    <summary className="dashboard-control flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"><CalendarDays size={16} />{active.length === months.length ? 'All months' : `${active.length} months`}</summary>
    <div className="chart-filter-menu absolute right-0 z-30 mt-2 w-52 rounded-xl border border-white/10 p-3 shadow-2xl">
      <div className="mb-2 flex justify-between text-xs font-semibold"><span>Select months</span><button type="button" className="text-indigo-500" onClick={() => onChange([])}>All</button></div>
      {months.map((month) => <label key={month} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5"><input type="checkbox" className="accent-indigo-500" checked={active.includes(month)} onChange={() => toggle(month)} />{month}</label>)}
    </div>
  </details>;
}

export default function DmsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DmsData>({ users: [], indexByMonth: [], indexByUser: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dms');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load DMS data.' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(saved)) setSelectedMonths(saved); } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedMonths)); }, [selectedMonths]);
  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement?.id === 'dashboard-content');
    const timer = window.setTimeout(updateFullscreen, 0);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => { window.clearTimeout(timer); document.removeEventListener('fullscreenchange', updateFullscreen); };
  }, []);

  const months = useMemo(() => data.indexByMonth.map((item) => item.month).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)), [data.indexByMonth]);
  const activeMonths = selectedMonths.length ? selectedMonths.filter((month) => months.includes(month)) : months;
  const chartData = useMemo(() => activeMonths.map((month) => {
    const item = data.indexByMonth.find((entry) => entry.month === month);
    return { month: month.slice(0, 3), documents: item?._sum.documentCount || 0 };
  }), [activeMonths, data.indexByMonth]);
  const totalDocuments = chartData.reduce((sum, item) => sum + item.documents, 0);
  const activeUsers = data.users.filter((user) => user.status === 'Active').length;
  const inactiveUsers = data.users.filter((user) => user.status === 'In Active').length;
  const pieData = [{ name: 'Active', value: activeUsers, color: '#22c55e' }, { name: 'In Active', value: inactiveUsers, color: '#60a5fa' }];
  const topUsers = useMemo(() => [...data.indexByUser].sort((a, b) => (b._sum.documentCount || 0) - (a._sum.documentCount || 0)).slice(0, 8).map((item) => ({ name: item.userId, documents: item._sum.documentCount || 0 })), [data.indexByUser]);
  const visibleUsers = useMemo(() => data.users.filter((user) => {
    const term = search.toLowerCase();
    return (status === 'ALL' || user.status === status) && [user.externalUserId, user.userName, user.email].some((value) => value?.toLowerCase().includes(term));
  }), [data.users, search, status]);
  const tiles: { label: string; value: number; Icon: LucideIcon; color: string }[] = [
    { label: 'Total Users', value: data.users.length, Icon: UsersRound, color: 'text-sky-400' },
    { label: 'Active Users', value: activeUsers, Icon: UserRoundCheck, color: 'text-emerald-400' },
    { label: 'In Active Users', value: inactiveUsers, Icon: CheckCircle2, color: 'text-orange-400' },
    { label: 'Indexed Documents', value: totalDocuments, Icon: Database, color: 'text-indigo-400' },
  ];

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length !== 2) { setMessage({ type: 'error', text: 'Please select both DMS Excel reports together.' }); return; }
    setUploading(true); setMessage(null);
    try {
      const form = new FormData(); files.forEach((file) => form.append('files', file));
      const response = await fetch('/api/dms', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage({ type: 'success', text: `Loaded ${result.users.toLocaleString()} users and ${result.documents.toLocaleString()} indexed documents.` });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed.' }); }
    finally { setUploading(false); }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.getElementById('dashboard-content')?.requestFullscreen();
    } catch {
      setMessage({ type: 'error', text: 'Fullscreen mode is not supported by this browser.' });
    }
  };

  return <div className="min-w-0 space-y-7 transition-opacity duration-300 ease-out">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">App Dashboard</p><h1 className="mt-2 text-3xl font-bold text-white">DMS</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Monitor DMS users and monthly indexing activity from the two source reports.</p></div>
      <div className="flex flex-wrap gap-3"><AppDashboardSelector /><button type="button" onClick={toggleFullscreen} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/10 active:scale-[0.98]">{isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{isFullscreen ? 'Exit Fullscreen' : 'Present'}</button><input ref={inputRef} hidden type="file" multiple accept=".xlsx" onChange={upload} /><button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="dashboard-primary-button flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60">{uploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}{uploading ? 'Importing…' : 'Upload DMS Reports'}</button></div>
    </header>
    {message && <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}>{message.text}</div>}
    <section>
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Summary</p><MonthFilter months={months} selected={selectedMonths} onChange={setSelectedMonths} /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map(({ label, value, Icon, color }) => <article key={label} className="glass-panel rounded-2xl border border-white/10 p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon size={19} className={color} /></div><p className="mt-4 text-3xl font-bold text-white">{value.toLocaleString()}</p></article>)}
      </div>
    </section>
    {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div> : <section className="grid gap-5 xl:grid-cols-3">
      <article className="glass-panel rounded-2xl border border-white/10 p-5 xl:col-span-2"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Monthly index count</h2><p className="mt-1 text-xs text-slate-400">Total indexed documents by selected month</p></div><MonthFilter months={months} selected={selectedMonths} onChange={setSelectedMonths} /></div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} /><YAxis tick={{ fill: 'var(--chart-text)', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="documents" fill="#6366f1" radius={[4,4,0,0]}><LabelList dataKey="documents" position="top" fill="var(--chart-value)" fontSize={10} formatter={(value: unknown) => Number(value).toLocaleString()} /></Bar></BarChart></ResponsiveContainer></div></article>
      <article className="glass-panel rounded-2xl border border-white/10 p-5"><h2 className="font-semibold text-white">User status</h2><p className="mt-1 text-xs text-slate-400">Active versus in active users</p><div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>{pieData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div></article>
      <article className="glass-panel rounded-2xl border border-white/10 p-5 xl:col-span-3"><h2 className="font-semibold text-white">Top indexing users</h2><p className="mt-1 text-xs text-slate-400">Users with the highest document indexing totals</p><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={topUsers} layout="vertical" margin={{ left: 20, right: 55 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" /><XAxis type="number" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="documents" fill="#6366f1" radius={[0,4,4,0]}><LabelList dataKey="documents" position="right" fill="var(--chart-value)" fontSize={11} formatter={(value: unknown) => Number(value).toLocaleString()} /></Bar></BarChart></ResponsiveContainer></div></article>
    </section>}
    <section className="glass-panel overflow-hidden rounded-2xl border border-white/10"><div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold text-white">DMS user details</h2><p className="mt-1 text-xs text-slate-400">Showing {visibleUsers.length.toLocaleString()} of {data.users.length.toLocaleString()} users</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="dashboard-control flex items-center gap-2 rounded-lg border border-white/10 px-3"><Search size={16} className="text-slate-500" /><input className="min-w-0 bg-transparent py-2.5 text-sm outline-none" placeholder="Search users..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="dashboard-control rounded-lg border border-white/10 px-3 py-2.5 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option><option>Active</option><option>In Active</option></select></div></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase text-[var(--text-muted)]"><tr><th className="px-5 py-4">User ID</th><th className="px-5 py-4">User name</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Status</th></tr></thead><tbody>{visibleUsers.map((user) => <tr key={user.id} className="border-t border-white/10 text-[var(--text-body)]"><td className="px-5 py-4">{user.externalUserId || '—'}</td><td className="px-5 py-4 font-medium">{user.userName || '—'}</td><td className="px-5 py-4">{user.email || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${user.status === 'Active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-sky-500/15 text-sky-600'}`}>{user.status}</span></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-white/10 md:hidden">{visibleUsers.map((user) => <article key={user.id} className="space-y-2 p-4 text-sm"><div className="flex justify-between gap-3"><strong className="break-all text-[var(--text-title)]">{user.userName || user.externalUserId || 'Unknown user'}</strong><span className="shrink-0 text-xs text-indigo-500">{user.status}</span></div><p className="break-all text-[var(--text-muted)]">{user.email || 'No email'}</p><p className="text-xs text-[var(--text-muted)]">ID: {user.externalUserId || '—'}</p></article>)}</div>
    </section>
  </div>;
}
