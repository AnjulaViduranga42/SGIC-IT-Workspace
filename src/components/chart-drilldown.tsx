'use client';

import { X } from 'lucide-react';

export interface DrilldownColumn { key: string; label: string; }
export type DrilldownRow = Record<string, string | number | null | undefined>;

export default function ChartDrilldown({ title, subtitle, columns, rows, onClose }: { title: string; subtitle?: string; columns: DrilldownColumn[]; rows: DrilldownRow[]; onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="glass-panel-heavy flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-white/10 sm:rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5"><div><h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-400">{subtitle || `${rows.length.toLocaleString()} underlying records`}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Close drill-down"><X size={18} /></button></header>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block"><table className="min-w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-[var(--sidebar-bg)] text-slate-400"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-wider">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{rows.map((row, index) => <tr key={index} className="text-slate-300 hover:bg-white/[0.03]">{columns.map((column) => <td key={column.key} className="max-w-80 whitespace-normal break-words px-4 py-3">{row[column.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>
      <div className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto md:hidden">{rows.map((row, index) => <article key={index} className="grid grid-cols-2 gap-3 p-4 text-xs">{columns.map((column) => <div key={column.key} className="min-w-0"><p className="text-slate-500">{column.label}</p><p className="mt-1 break-words text-slate-200">{row[column.key] ?? '—'}</p></div>)}</article>)}</div>
      {!rows.length && <div className="p-12 text-center text-sm text-slate-400">No records match this chart selection.</div>}
    </section>
  </div>;
}
