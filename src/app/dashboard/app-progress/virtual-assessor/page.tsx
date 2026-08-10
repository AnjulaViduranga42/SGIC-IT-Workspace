'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Database,
  FileSpreadsheet,
  Loader2,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface VirtualAssessorJob {
  id: number;
  referenceNo: string;
  description: string | null;
  customerName: string | null;
  customerMobile: string | null;
  product: string | null;
  agentId: string;
  agentName: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  jobDate: string;
  cancelReason: string | null;
  sourceFile: string | null;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  rejected: number;
  totalRows: number;
}

const PAGE_SIZE = 20;
const chartTooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: '#f8fafc',
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

function isCompleted(status: string) {
  return status.toLowerCase().includes('complete');
}

function isCancelled(status: string) {
  return status.toLowerCase().includes('cancel');
}

export default function VirtualAssessorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<VirtualAssessorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/virtual-assessor/jobs', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load jobs.');
      setJobs(data.jobs || []);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load jobs.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const agents = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.agentId))).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const months = useMemo(
    () => Array.from(new Set(jobs.map((job) => monthKey(job.jobDate)))).sort().reverse(),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch = !query || [
        job.referenceNo,
        job.description,
        job.customerName,
        job.customerMobile,
        job.agentId,
        job.agentName,
        job.product,
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'COMPLETED' && isCompleted(job.status))
        || (statusFilter === 'CANCELLED' && isCancelled(job.status));
      const matchesAgent = agentFilter === 'ALL' || job.agentId === agentFilter;
      const matchesMonth = monthFilter === 'ALL' || monthKey(job.jobDate) === monthFilter;
      return matchesSearch && matchesStatus && matchesAgent && matchesMonth;
    });
  }, [jobs, search, statusFilter, agentFilter, monthFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, agentFilter, monthFilter]);

  const completedCount = jobs.filter((job) => isCompleted(job.status)).length;
  const cancelledCount = jobs.filter((job) => isCancelled(job.status)).length;
  const completionRate = jobs.length ? Math.round((completedCount / jobs.length) * 100) : 0;

  const monthlyData = useMemo(() => {
    const grouped = new Map<string, { month: string; total: number; completed: number; cancelled: number }>();
    jobs.forEach((job) => {
      const key = monthKey(job.jobDate);
      const item = grouped.get(key) ?? { month: key, total: 0, completed: 0, cancelled: 0 };
      item.total += 1;
      if (isCompleted(job.status)) item.completed += 1;
      if (isCancelled(job.status)) item.cancelled += 1;
      grouped.set(key, item);
    });
    return Array.from(grouped.values()).sort((a, b) => a.month.localeCompare(b.month)).map((item) => ({
      ...item,
      month: monthLabel(item.month),
    }));
  }, [jobs]);

  const agentData = useMemo(() => {
    const grouped = new Map<string, { agent: string; completed: number; cancelled: number }>();
    jobs.forEach((job) => {
      const label = job.agentName || job.agentId;
      const item = grouped.get(job.agentId) ?? { agent: label, completed: 0, cancelled: 0 };
      if (isCompleted(job.status)) item.completed += 1;
      if (isCancelled(job.status)) item.cancelled += 1;
      grouped.set(job.agentId, item);
    });
    return Array.from(grouped.values()).sort(
      (a, b) => (b.completed + b.cancelled) - (a.completed + a.cancelled)
    );
  }, [jobs]);

  const pieData = [
    { name: 'Completed', value: completedCount, color: '#6366f1' },
    { name: 'Cancelled', value: cancelledCount, color: '#f97316' },
  ].filter((item) => item.value > 0);

  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const visibleJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/virtual-assessor/jobs', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import failed.');

      const summary = result as ImportResult;
      setMessage({
        type: 'success',
        text: `Imported ${summary.imported} records. ${summary.duplicates} duplicates skipped${summary.rejected ? ` and ${summary.rejected} rows rejected` : ''}.`,
      });
      await fetchJobs();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Import failed.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteRecord = async (id: number) => {
    if (!window.confirm('Delete this Virtual Assessor record?')) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/virtual-assessor/jobs?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Delete failed.');
      setJobs((current) => current.filter((job) => job.id !== id));
      setMessage({ type: 'success', text: 'Record deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Delete failed.' });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllRecords = async () => {
    if (!jobs.length || !window.confirm(`Delete all ${jobs.length} Virtual Assessor records? This cannot be undone.`)) return;
    setDeletingId(-1);
    try {
      const response = await fetch('/api/virtual-assessor/jobs?all=true', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Delete failed.');
      setJobs([]);
      setMessage({ type: 'success', text: `${result.deleted} records deleted.` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Delete failed.' });
    } finally {
      setDeletingId(null);
    }
  };

  const summaryCards = [
    { label: 'Total Jobs', value: jobs.length, icon: Database, color: 'text-sky-400' },
    { label: 'Completed Jobs', value: completedCount, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Cancelled Jobs', value: cancelledCount, icon: CircleX, color: 'text-orange-400' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, color: 'text-indigo-400' },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">App Progress Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Virtual Assessor</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Upload job reports and monitor monthly volume, completion, cancellation, and agent performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx,.html"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
            {uploading ? 'Importing…' : 'Upload Excel Report'}
          </button>
          <button
            type="button"
            onClick={deleteAllRecords}
            disabled={!jobs.length || deletingId === -1}
            className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
          >
            {deletingId === -1 ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
            Delete All
          </button>
        </div>
      </header>

      {message ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-red-500/25 bg-red-500/10 text-red-200'}`}>
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="glass-panel rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{card.label}</p>
                <Icon size={19} className={card.color} />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
            </article>
          );
        })}
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
      ) : jobs.length ? (
        <>
          <section className="grid gap-5 xl:grid-cols-3">
            <article className="glass-panel rounded-2xl border border-white/10 p-5 xl:col-span-2">
              <h2 className="font-semibold text-white">Monthly job performance</h2>
              <p className="mt-1 text-xs text-slate-400">Total, completed, and cancelled jobs by month</p>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" name="Total" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelled" name="Cancelled" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="glass-panel rounded-2xl border border-white/10 p-5">
              <h2 className="font-semibold text-white">Job status split</h2>
              <p className="mt-1 text-xs text-slate-400">Completed versus cancelled records</p>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                      {pieData.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="glass-panel rounded-2xl border border-white/10 p-5">
            <h2 className="font-semibold text-white">Completed and cancelled by agent</h2>
            <p className="mt-1 text-xs text-slate-400">Agent-level job outcome comparison</p>
            <div className="mt-5 h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="agent" width={90} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-2xl border border-white/10">
            <div className="border-b border-white/10 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="font-semibold text-white">Full job data</h2>
                  <p className="mt-1 text-xs text-slate-400">Showing {filteredJobs.length.toLocaleString()} of {jobs.length.toLocaleString()} records</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="relative min-w-56 flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records…" className="w-full rounded-lg border border-white/10 bg-slate-950/40 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500/50" />
                  </label>
                  <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none">
                    <option value="ALL">All months</option>
                    {months.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
                  </select>
                  <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none">
                    <option value="ALL">All agents</option>
                    {agents.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none">
                    <option value="ALL">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-slate-400">
                  <tr>
                    {['Job Date', 'Ref. No', 'Customer', 'Mobile', 'Product', 'Agent', 'Status', 'Cancel Reason', 'Source', ''].map((header) => (
                      <th key={header} className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-wider">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleJobs.map((job) => (
                    <tr key={job.id} className="text-slate-300 transition hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-4 py-3">{new Date(job.jobDate).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{job.referenceNo}</td>
                      <td className="max-w-48 truncate px-4 py-3" title={job.customerName || ''}>{job.customerName || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{job.customerMobile || '—'}</td>
                      <td className="max-w-56 truncate px-4 py-3" title={job.product || ''}>{job.product || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{job.agentName || job.agentId}<span className="ml-1 text-slate-500">({job.agentId})</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 font-medium ${isCancelled(job.status) ? 'bg-orange-500/15 text-orange-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{job.status}</span></td>
                      <td className="max-w-52 truncate px-4 py-3" title={job.cancelReason || ''}>{job.cancelReason || '—'}</td>
                      <td className="max-w-40 truncate px-4 py-3 text-slate-500" title={job.sourceFile || ''}>{job.sourceFile || '—'}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => deleteRecord(job.id)} disabled={deletingId === job.id} aria-label={`Delete ${job.referenceNo}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50">
                          {deletingId === job.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleJobs.length ? <div className="p-10 text-center text-sm text-slate-500">No records match the selected filters.</div> : null}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-xs text-slate-400">
              <span>Page {page} of {pageCount}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-white/10 p-2 transition hover:bg-white/5 disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-lg border border-white/10 p-2 transition hover:bg-white/5 disabled:opacity-30" aria-label="Next page"><ChevronRight size={16} /></button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="glass-panel flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <FileSpreadsheet size={38} className="text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold text-white">Upload your first Virtual Assessor report</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-400">Supported formats are the supplied HTML-based `.xls` report and standard `.xlsx` workbooks. Duplicate jobs are skipped automatically.</p>
        </section>
      )}
    </div>
  );
}
