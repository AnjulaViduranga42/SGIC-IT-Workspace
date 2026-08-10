'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  Trash2, 
  Edit3, 
  BarChart, 
  Percent, 
  Target, 
  Calendar, 
  Layers, 
  X,
  PlusCircle,
  TrendingDown
} from 'lucide-react';

interface KPIValue {
  id: number;
  period: string;
  targetValue: number;
  actualValue: number;
  updatedAt: string;
}

interface KPI {
  id: number;
  name: string;
  description: string;
  target: number;
  unit: string;
  frequency: string;
  values: KPIValue[];
}

export default function KPIsPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);

  // Form State - KPI
  const [editingKpiId, setEditingKpiId] = useState<number | null>(null);
  const [kpiName, setKpiName] = useState('');
  const [kpiDescription, setKpiDescription] = useState('');
  const [kpiTarget, setKpiTarget] = useState('');
  const [kpiUnit, setKpiUnit] = useState('%');
  const [kpiFrequency, setKpiFrequency] = useState('MONTHLY');

  // Form State - KPI Value
  const [selectedKpiForValue, setSelectedKpiForValue] = useState<KPI | null>(null);
  const [valuePeriod, setValuePeriod] = useState('');
  const [valueTarget, setValueTarget] = useState('');
  const [valueActual, setValueActual] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/kpis');
      if (res.ok) {
        setKpis(await res.json());
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open KPI Create Modal
  const handleCreateKpiOpen = () => {
    setEditingKpiId(null);
    setKpiName('');
    setKpiDescription('');
    setKpiTarget('');
    setKpiUnit('%');
    setKpiFrequency('MONTHLY');
    setKpiModalOpen(true);
  };

  // Open KPI Edit Modal
  const handleEditKpiOpen = (kpi: KPI) => {
    setEditingKpiId(kpi.id);
    setKpiName(kpi.name);
    setKpiDescription(kpi.description || '');
    setKpiTarget(kpi.target.toString());
    setKpiUnit(kpi.unit);
    setKpiFrequency(kpi.frequency);
    setKpiModalOpen(true);
  };

  // Save KPI
  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName || kpiTarget === undefined || !kpiUnit) return;

    const payload = {
      name: kpiName,
      description: kpiDescription,
      target: parseFloat(kpiTarget),
      unit: kpiUnit,
      frequency: kpiFrequency,
    };

    try {
      const url = editingKpiId ? `/api/kpis/${editingKpiId}` : '/api/kpis';
      const method = editingKpiId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setKpiModalOpen(false);
        fetchKPIs();
      }
    } catch (error) {
      console.error('Error saving KPI:', error);
    }
  };

  // Delete KPI
  const handleDeleteKpi = async (id: number) => {
    if (!confirm('Are you sure you want to delete this KPI and all of its logged values?')) return;

    try {
      const res = await fetch(`/api/kpis/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchKPIs();
      }
    } catch (error) {
      console.error('Error deleting KPI:', error);
    }
  };

  // Open Record Value Modal
  const handleRecordValueOpen = (kpi: KPI) => {
    setSelectedKpiForValue(kpi);
    // Suggest current period format YYYY-MM based on frequency
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    if (kpi.frequency === 'MONTHLY') {
      setValuePeriod(`${currentYear}-${currentMonth}`);
    } else if (kpi.frequency === 'QUARTERLY') {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      setValuePeriod(`${currentYear}-Q${quarter}`);
    } else {
      setValuePeriod(`${currentYear}`);
    }

    setValueTarget(kpi.target.toString());
    setValueActual('');
    setValueError(null);
    setValueModalOpen(true);
  };

  // Save KPI value
  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpiForValue || !valuePeriod || valueTarget === undefined || valueActual === undefined) return;
    setValueError(null);

    const payload = {
      kpiId: selectedKpiForValue.id,
      period: valuePeriod,
      targetValue: parseFloat(valueTarget),
      actualValue: parseFloat(valueActual),
    };

    try {
      const res = await fetch('/api/kpis/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setValueModalOpen(false);
        fetchKPIs();
      } else {
        const err = await res.json();
        setValueError(err.error || 'Failed to record KPI value');
      }
    } catch (error) {
      setValueError('Connection error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">KPI Dashboard Management</h1>
          <p className="text-sm text-slate-400">Configure corporate targets and record period performance</p>
        </div>
        <button onClick={handleCreateKpiOpen} className="glass-btn shrink-0 cursor-pointer">
          <Plus size={18} />
          <span>Configure New KPI</span>
        </button>
      </div>

      {/* KPI Display List */}
      {isLoading ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Loading KPI metrics...</p>
        </div>
      ) : kpis.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {kpis.map((kpi) => {
            const latestVal = kpi.values[0]; // first item is latest based on API sorting
            const performancePct = latestVal && latestVal.targetValue > 0 
              ? (latestVal.actualValue / latestVal.targetValue) * 100 
              : null;
            
            return (
              <div key={kpi.id} className="glass-panel p-6 border-white/10 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4">
                  {/* KPI Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">{kpi.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{kpi.description || 'No description provided.'}</p>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRecordValueOpen(kpi)}
                        className="glass-btn-secondary p-1.5 rounded-lg text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 cursor-pointer"
                        title="Record Period Value"
                      >
                        <PlusCircle size={15} />
                      </button>
                      <button
                        onClick={() => handleEditKpiOpen(kpi)}
                        className="glass-btn-secondary p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                        title="Edit KPI Settings"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteKpi(kpi.id)}
                        className="glass-btn-secondary p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20 cursor-pointer"
                        title="Delete KPI"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* KPI settings meta */}
                  <div className="flex gap-4 text-xs text-slate-400 bg-white/5 border border-white/5 p-3 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-indigo-400" />
                      Frequency: <strong className="text-slate-300 font-semibold">{kpi.frequency}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target size={13} className="text-cyan-400" />
                      Standard Target: <strong className="text-slate-300 font-semibold">{kpi.target} {kpi.unit}</strong>
                    </span>
                  </div>

                  {/* Performance highlight widget */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    
                    {/* Latest Period Target */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Latest Period ({latestVal?.period || 'N/A'})</p>
                      <h4 className="text-xl font-bold text-white mt-1.5">
                        {latestVal ? `${latestVal.targetValue} ${kpi.unit}` : 'N/A'}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">Target Value</p>
                    </div>

                    {/* Latest Period Actual */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actual Progress</p>
                      <h4 className="text-xl font-bold text-white mt-1.5">
                        {latestVal ? `${latestVal.actualValue} ${kpi.unit}` : 'N/A'}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">Logged Value</p>
                    </div>

                    {/* Performance percentage */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center flex flex-col justify-center items-center">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Performance</p>
                      {performancePct !== null ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className={`text-xl font-bold ${performancePct >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {performancePct.toFixed(1)}%
                          </span>
                          {performancePct >= 100 ? (
                            <TrendingUp size={16} className="text-emerald-400" />
                          ) : (
                            <TrendingDown size={16} className="text-amber-400" />
                          )}
                        </div>
                      ) : (
                        <h4 className="text-xl font-bold text-slate-500 mt-1.5">N/A</h4>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">Completion rate</p>
                    </div>

                  </div>
                </div>

                {/* History list section */}
                <div className="mt-6 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BarChart size={12} />
                    Historical Logs
                  </h4>
                  {kpi.values.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1.5">
                      {kpi.values.map((val) => {
                        const rate = val.targetValue > 0 ? (val.actualValue / val.targetValue) * 100 : 0;
                        return (
                          <div key={val.id} className="flex justify-between items-center text-xs p-2 rounded bg-black/10 border border-white/5 hover:bg-white/5 transition-all">
                            <span className="font-semibold text-slate-300">{val.period}</span>
                            <div className="flex gap-4">
                              <span className="text-slate-400">Target: <strong className="text-slate-300">{val.targetValue}</strong></span>
                              <span className="text-slate-400">Actual: <strong className="text-slate-300">{val.actualValue}</strong></span>
                              <span className={`font-semibold ${rate >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {rate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4">No periodic measurements recorded for this KPI yet.</p>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 glass-panel border-dashed border-white/10">
          <TrendingUp size={40} className="mx-auto text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No KPIs configured</h3>
          <p className="text-sm text-slate-500 mt-1">Configure your performance measures using the button above.</p>
        </div>
      )}

      {/* KPI Settings Modal */}
      {kpiModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 border-white/10 relative text-left">
            <button 
              onClick={() => setKpiModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {editingKpiId ? 'Modify KPI Settings' : 'Configure New KPI'}
            </h3>

            <form onSubmit={handleSaveKpi} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">KPI Name</label>
                <input
                  type="text"
                  placeholder="e.g. Server Uptime Rate"
                  value={kpiName}
                  onChange={(e) => setKpiName(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Description / Purpose</label>
                <textarea
                  placeholder="e.g. Monitors SLA availability across workspace core systems"
                  value={kpiDescription}
                  onChange={(e) => setKpiDescription(e.target.value)}
                  rows={2}
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Standard Target</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 99.9"
                    value={kpiTarget}
                    onChange={(e) => setKpiTarget(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Measurement Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. %, hours, LKR, count"
                    value={kpiUnit}
                    onChange={(e) => setKpiUnit(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Tracking Frequency</label>
                <select
                  value={kpiFrequency}
                  onChange={(e) => setKpiFrequency(e.target.value)}
                  className="w-full glass-input cursor-pointer"
                >
                  <option value="MONTHLY">Monthly (e.g. 2026-07)</option>
                  <option value="QUARTERLY">Quarterly (e.g. 2026-Q1)</option>
                  <option value="YEARLY">Yearly (e.g. 2026)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setKpiModalOpen(false)}
                  className="glass-btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-btn cursor-pointer"
                >
                  {editingKpiId ? 'Save Configuration' : 'Create KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Value Modal */}
      {valueModalOpen && selectedKpiForValue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel p-6 border-white/10 relative text-left">
            <button 
              onClick={() => setValueModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-bold text-white mb-2">Record Period Measurement</h3>
            <p className="text-xs text-indigo-300 font-semibold mb-6 truncate">{selectedKpiForValue.name}</p>

            <form onSubmit={handleSaveValue} className="space-y-4">
              {valueError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{valueError}</p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Period</label>
                <input
                  type="text"
                  placeholder={
                    selectedKpiForValue.frequency === 'MONTHLY' ? 'e.g. 2026-07' :
                    selectedKpiForValue.frequency === 'QUARTERLY' ? 'e.g. 2026-Q1' : 'e.g. 2026'
                  }
                  value={valuePeriod}
                  onChange={(e) => setValuePeriod(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Target Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valueTarget}
                    onChange={(e) => setValueTarget(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Actual Value</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 98.4"
                    value={valueActual}
                    onChange={(e) => setValueActual(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setValueModalOpen(false)}
                  className="glass-btn-secondary cursor-pointer py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-btn cursor-pointer py-1.5 text-xs"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
