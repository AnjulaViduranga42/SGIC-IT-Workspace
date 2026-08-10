import { CheckCircle2, CircleDashed, Clock3, TrendingUp } from 'lucide-react';
import AppDashboardSelector from '@/components/app-dashboard-selector';

interface AppProgressPageProps {
  title: string;
  description: string;
}

const summaryCards = [
  { label: 'Overall Progress', value: '0%', icon: TrendingUp, color: 'text-indigo-400' },
  { label: 'Completed', value: '0', icon: CheckCircle2, color: 'text-emerald-400' },
  { label: 'In Progress', value: '0', icon: Clock3, color: 'text-amber-400' },
  { label: 'Pending', value: '0', icon: CircleDashed, color: 'text-sky-400' },
];

export default function AppProgressPage({ title, description }: AppProgressPageProps) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
            App Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
        </div>
        <AppDashboardSelector />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="glass-panel p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{card.label}</p>
                <Icon size={19} className={card.color} />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{card.value}</p>
            </article>
          );
        })}
      </section>

      <section className="glass-panel rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white">Project milestones</h2>
        <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
          <CircleDashed size={30} className="text-indigo-400" />
          <p className="mt-4 font-medium text-white">No milestones added yet</p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Progress items, owners, due dates, and delivery status will appear here.
          </p>
        </div>
      </section>
    </div>
  );
}
