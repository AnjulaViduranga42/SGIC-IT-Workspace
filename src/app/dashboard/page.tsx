'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  Users, 
  Send,
  AlertTriangle,
  CheckCircle,
  Play,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  taskType: { name: string };
  assigneeEmails: string;
  reminderDaysBefore: number;
  reminderSentAt: string | null;
}

interface KPIValue {
  period: string;
  targetValue: number;
  actualValue: number;
}

interface KPI {
  id: number;
  name: string;
  unit: string;
  target: number;
  values: KPIValue[];
}

export default function DashboardOverview() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setKpis(data.kpis || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCron = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron');
      if (res.ok) {
        const result = await res.json();
        setCronResult(result);
        // Refresh task status
        await fetchData();
      } else {
        setCronResult({ error: 'Failed to run cron job' });
      }
    } catch (err) {
      setCronResult({ error: 'Error connecting to cron endpoint' });
    } finally {
      setCronRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-400" size={32} />
          <p className="text-slate-400 text-sm">Gathering workspace metrics...</p>
        </div>
      </div>
    );
  }

  // Compute metrics
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalKpis = kpis.length;

  const upcomingTasks = tasks
    .filter((t) => t.status === 'PENDING')
    .slice(0, 5);

  // Format Recharts data (Aggregate performance data)
  // Let's get the latest period value across KPIs
  const chartData = kpis.map((kpi) => {
    const latestVal = kpi.values[0]; // ordered desc, so first is latest
    return {
      name: kpi.name.substring(0, 15) + (kpi.name.length > 15 ? '...' : ''),
      Target: latestVal ? latestVal.targetValue : kpi.target,
      Actual: latestVal ? latestVal.actualValue : 0,
      unit: kpi.unit,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
            Overview & Metrics
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time KPI visualization and operational summaries</p>
        </div>
        <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={triggerCron}
            disabled={cronRunning}
            className="w-full sm:w-auto glass-btn cursor-pointer"
          >
            {cronRunning ? (
              <>
                <Loader2 className="animate-spin text-white" size={16} />
                <span>Running Scheduler...</span>
              </>
            ) : (
              <>
                <Play size={16} fill="white" />
                <span>Execute Reminder Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {cronResult && (
        <div className="p-4 rounded-xl glass-panel border-indigo-500/20 bg-indigo-500/5 text-sm space-y-2">
          <h4 className="font-semibold text-indigo-300">Scheduler Run Results:</h4>
          {cronResult.error ? (
            <p className="text-red-400">{cronResult.error}</p>
          ) : (
            <p className="text-slate-300">
              Successfully checked <span className="text-white font-semibold">{cronResult.processed || 0}</span> tasks. Sent email alerts for <span className="text-indigo-400 font-semibold">{cronResult.sent || 0}</span> tasks.
            </p>
          )}
        </div>
      )}

      {/* Grid Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-panel p-6 border-white/10 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-slate-500 bg-white/5 p-2.5 rounded-xl border border-white/5">
            <CheckSquare size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
          <h3 className="text-3xl font-bold text-white mt-2">{totalTasks}</h3>
          <p className="text-xs text-slate-500 mt-2">Active in repository</p>
        </div>

        <div className="glass-panel p-6 border-white/10 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-amber-400 bg-amber-400/5 p-2.5 rounded-xl border border-amber-400/10">
            <Clock size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Tasks</p>
          <h3 className="text-3xl font-bold text-amber-400 mt-2">{pendingTasks}</h3>
          <p className="text-xs text-slate-500 mt-2">Awaiting completion</p>
        </div>

        <div className="glass-panel p-6 border-white/10 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-emerald-400 bg-emerald-400/5 p-2.5 rounded-xl border border-emerald-400/10">
            <CheckCircle size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
          <h3 className="text-3xl font-bold text-emerald-400 mt-2">{completedTasks}</h3>
          <p className="text-xs text-slate-500 mt-2">Successfully closed</p>
        </div>

        <div className="glass-panel p-6 border-white/10 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-cyan-400 bg-cyan-400/5 p-2.5 rounded-xl border border-cyan-400/10">
            <TrendingUp size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">KPIs Monitored</p>
          <h3 className="text-3xl font-bold text-cyan-400 mt-2">{totalKpis}</h3>
          <p className="text-xs text-slate-500 mt-2">Performance measures</p>
        </div>

      </div>

      {/* Analytics Charts & Upcoming Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KPI Chart Card */}
        <div className="lg:col-span-2 glass-panel p-6 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-6">KPIs Current Target vs Actual Performance</h3>
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-desc)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-desc)', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--glass-bg)', 
                      borderColor: 'var(--glass-border)', 
                      borderRadius: '8px',
                      color: 'var(--text-title)'
                    }} 
                    itemStyle={{ color: 'var(--text-body)' }}
                    labelStyle={{ color: 'var(--text-title)', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-desc)' }} />
                  <Bar dataKey="Target" fill="rgba(99, 102, 241, 0.6)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="rgba(6, 182, 212, 0.6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                <p className="text-slate-500 text-sm">No KPI data logged yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="glass-panel p-6 border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Upcoming Pending Tasks</h3>
            <div className="space-y-4">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-white truncate max-w-[70%]">{task.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase">
                        {task.taskType.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <Send size={10} />
                        {task.reminderSentAt ? 'Reminded' : 'Alert Pending'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
                  <p className="text-slate-500 text-sm">No pending tasks</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 mt-4">
            <Link href="/dashboard/tasks" className="w-full glass-btn-secondary py-2 text-xs flex justify-center items-center gap-2">
              <span>Manage All Tasks</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
