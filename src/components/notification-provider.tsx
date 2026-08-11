'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type NotificationKind = 'success' | 'error' | 'info';
interface NotificationItem { id: number; kind: NotificationKind; title: string; message?: string; }
interface NotificationApi {
  show: (kind: NotificationKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationApi | null>(null);
const styles = {
  success: { icon: CheckCircle2, accent: 'text-emerald-400', border: 'border-emerald-500/30' },
  error: { icon: CircleAlert, accent: 'text-red-400', border: 'border-red-500/30' },
  info: { icon: Info, accent: 'text-sky-400', border: 'border-sky-500/30' },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const show = useCallback((kind: NotificationKind, title: string, message?: string) => {
    const id = nextId.current++;
    setItems((current) => [...current.slice(-3), { id, kind, title, message }]);
    window.setTimeout(() => dismiss(id), kind === 'error' ? 6500 : 4500);
  }, [dismiss]);
  const api = useMemo<NotificationApi>(() => ({
    show,
    success: (title, message) => show('success', title, message),
    error: (title, message) => show('error', title, message),
    info: (title, message) => show('info', title, message),
  }), [show]);

  return <NotificationContext.Provider value={api}>{children}<div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-3" aria-live="polite">{items.map((item) => { const style = styles[item.kind]; const Icon = style.icon; return <article key={item.id} className={`pointer-events-auto glass-panel-heavy flex items-start gap-3 rounded-xl border p-4 shadow-2xl ${style.border}`}><Icon size={20} className={`mt-0.5 shrink-0 ${style.accent}`} /><div className="min-w-0 flex-1"><strong className="block text-sm text-white">{item.title}</strong>{item.message && <p className="mt-1 break-words text-xs text-slate-400">{item.message}</p>}</div><button type="button" onClick={() => dismiss(item.id)} className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-white" aria-label="Dismiss notification"><X size={15} /></button></article>; })}</div></NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider.');
  return context;
}
