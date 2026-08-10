'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  CheckSquare, 
  TrendingUp, 
  Download, 
  Search, 
  Calendar,
  Layers,
  Percent,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  taskType: { name: string };
  assigneeEmails: string;
  reminderDaysBefore: number;
  reminderSentAt: string | null;
  userGroup: { name: string } | null;
}

interface KPIValue {
  id: number;
  period: string;
  targetValue: number;
  actualValue: number;
}

interface KPI {
  id: number;
  name: string;
  unit: string;
  target: number;
  frequency: string;
  values: KPIValue[];
}

export default function ReportsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'kpis'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setKpis(data.kpis || []);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    window.open('/api/reports?export=excel', '_blank');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add corporate header banner
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('Helvetica', 'bold');
    doc.text('SGIC IT WORKSPACE', 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text('Sanasa General Insurance - System Audit Report', 14, 25);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);
    
    doc.setTextColor(15, 23, 42); // Reset text to slate 900
    
    if (activeTab === 'tasks') {
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text('Task Reminders Audit Log', 14, 50);
      
      const tableRows = filteredTasks.map((t) => [
        t.id,
        t.title,
        t.taskType.name,
        t.status,
        new Date(t.dueDate).toLocaleDateString(),
        t.userGroup?.name || 'Individual Only',
        `${t.reminderDaysBefore}d before`,
        t.reminderSentAt ? 'Yes' : 'No'
      ]);
      
      (doc as any).autoTable({
        startY: 55,
        head: [['ID', 'Task Title', 'Type', 'Status', 'Due Date', 'Group', 'Schedule', 'Alert Sent']],
        body: tableRows,
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      
      doc.save('sgic_tasks_report.pdf');
    } else {
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text('KPI Performance Audit Log', 14, 50);
      
      const tableRows = filteredKpis.map((k) => {
        const latest = k.values[0];
        const pct = latest && latest.targetValue > 0
          ? `${((latest.actualValue / latest.targetValue) * 100).toFixed(1)}%`
          : 'N/A';
        return [
          k.id,
          k.name,
          k.target,
          k.unit,
          k.frequency,
          latest?.period || 'N/A',
          latest ? latest.targetValue : 'N/A',
          latest ? latest.actualValue : 'N/A',
          pct
        ];
      });
      
      (doc as any).autoTable({
        startY: 55,
        head: [['ID', 'KPI Name', 'Target', 'Unit', 'Freq', 'Period', 'Period Target', 'Period Actual', 'Perf (%)']],
        body: tableRows,
        headStyles: { fillColor: [6, 182, 212] }, // Cyan
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      
      doc.save('sgic_kpis_report.pdf');
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.taskType.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter KPIs
  const filteredKpis = kpis.filter((k) => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header and Export Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Audits</h1>
          <p className="text-sm text-slate-400">Audit system data and download PDF or Excel sheets</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={handleExportPDF} className="glass-btn-secondary shrink-0 cursor-pointer text-xs sm:text-sm">
            <FileText size={18} className="text-indigo-400" />
            <span>Export to PDF</span>
          </button>
          <button onClick={handleExportExcel} className="glass-btn shrink-0 cursor-pointer text-xs sm:text-sm">
            <Download size={18} />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs list & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/5 border border-white/5 p-2 rounded-xl">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('tasks'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-indigo-500/20 border border-indigo-500/30 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckSquare size={16} />
              Tasks Report
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('kpis'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'kpis'
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp size={16} />
              KPI Performance Report
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder={activeTab === 'tasks' ? 'Filter tasks report...' : 'Filter KPIs report...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 glass-input"
          />
        </div>
      </div>

      {/* Grids */}
      {isLoading ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Gathering audit log entries...</p>
        </div>
      ) : activeTab === 'tasks' ? (
        
        /* Tasks Table */
        <div className="glass-panel border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Task ID</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Assignee Group</th>
                  <th className="p-4">Reminder Schedule</th>
                  <th className="p-4">Alert Triggered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-slate-400">#{task.id}</td>
                      <td className="p-4 font-semibold text-white">{task.title}</td>
                      <td className="p-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase">
                          {task.taskType.name}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          task.status === 'COMPLETED' 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        {new Date(task.dueDate).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="p-4 text-slate-300 truncate max-w-[150px]">
                        {task.userGroup?.name || 'Individual Only'}
                      </td>
                      <td className="p-4 text-slate-400">
                        {task.reminderDaysBefore}d before
                      </td>
                      <td className="p-4">
                        {task.reminderSentAt ? (
                          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle size={12} />
                            Sent
                          </span>
                        ) : (
                          <span className="text-amber-400 text-xs font-semibold flex items-center gap-1">
                            <Clock size={12} />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">No tasks match filter criteria</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* KPIs Table */
        <div className="glass-panel border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">KPI ID</th>
                  <th className="p-4">KPI Name</th>
                  <th className="p-4">Base Target</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4">Latest Period</th>
                  <th className="p-4">Period Target</th>
                  <th className="p-4">Period Actual</th>
                  <th className="p-4">Performance (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredKpis.length > 0 ? (
                  filteredKpis.map((kpi) => {
                    const latestVal = kpi.values[0];
                    const performancePct = latestVal && latestVal.targetValue > 0
                      ? (latestVal.actualValue / latestVal.targetValue) * 100
                      : null;

                    return (
                      <tr key={kpi.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-slate-400">#{kpi.id}</td>
                        <td className="p-4 font-semibold text-white">{kpi.name}</td>
                        <td className="p-4 text-slate-300 font-semibold">{kpi.target}</td>
                        <td className="p-4 text-slate-400 font-semibold">{kpi.unit}</td>
                        <td className="p-4 text-slate-300">{kpi.frequency}</td>
                        <td className="p-4 text-indigo-300 font-bold">{latestVal?.period || 'N/A'}</td>
                        <td className="p-4 text-slate-300">{latestVal ? latestVal.targetValue : 'N/A'}</td>
                        <td className="p-4 text-slate-300">{latestVal ? latestVal.actualValue : 'N/A'}</td>
                        <td className="p-4">
                          {performancePct !== null ? (
                            <span className={`text-xs px-2 py-0.5 rounded border font-bold ${
                              performancePct >= 100 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}>
                              {performancePct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 italic">No KPIs match filter criteria</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      )}

    </div>
  );
}
