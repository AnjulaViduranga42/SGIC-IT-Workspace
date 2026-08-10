'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  User, 
  Key, 
  ShieldCheck, 
  Calendar,
  X,
  Loader2,
  Contact
} from 'lucide-react';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PersonRecord {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export default function AdminsAndStaffPage() {
  const [activeTab, setActiveTab] = useState<'admins' | 'staff'>('admins');
  const [admins, setAdmins] = useState<UserRecord[]>([]);
  const [staff, setStaff] = useState<PersonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchAdmins(), fetchStaff()]);
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setAdmins(await res.json());
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        setStaff(await res.json());
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const handleCreateOpen = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (activeTab === 'admins' && !formPassword) {
      setFormError('Password is required for administrator accounts.');
      return;
    }

    if (activeTab === 'admins' && formPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const isCreatingAdmin = activeTab === 'admins';
    const endpoint = isCreatingAdmin ? '/api/users' : '/api/people';
    const payload = isCreatingAdmin 
      ? { name: formName, email: formEmail, password: formPassword }
      : { name: formName, email: formEmail };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setModalOpen(false);
        if (isCreatingAdmin) {
          fetchAdmins();
        } else {
          fetchStaff();
        }
      } else {
        setFormError(data.error || `Failed to create ${isCreatingAdmin ? 'administrator' : 'staff member'}`);
      }
    } catch (error) {
      setFormError('Connection error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">People Directory</h1>
          <p className="text-sm text-slate-400">View and manage administrators and assignee staff members</p>
        </div>
        <button onClick={handleCreateOpen} className="glass-btn shrink-0 cursor-pointer">
          <Plus size={18} />
          <span>{activeTab === 'admins' ? 'Provision Admin' : 'Add Staff Member'}</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all duration-200 ${
            activeTab === 'admins'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Administrators ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all duration-200 ${
            activeTab === 'staff'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Assignee Staff ({staff.length})
        </button>
      </div>

      {/* Grid displays */}
      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="animate-spin text-indigo-400 mx-auto mb-4" size={32} />
          <p className="text-slate-400">Loading directory registry...</p>
        </div>
      ) : activeTab === 'admins' ? (
        admins.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((admin) => (
              <div key={admin.id} className="glass-panel p-6 border-white/10 flex items-start gap-4 relative overflow-hidden">
                {/* Avatar circle */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldCheck size={22} />
                </div>

                {/* Identity details */}
                <div className="space-y-2 overflow-hidden w-full">
                  <div>
                    <h3 className="text-base font-bold text-white truncate">{admin.name}</h3>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} className="text-slate-500" />
                      {admin.email}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Added: {new Date(admin.createdAt).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase">
                      {admin.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass-panel border-dashed border-white/10">
            <Users size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No administrators</h3>
          </div>
        )
      ) : (
        staff.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((person) => (
              <div key={person.id} className="glass-panel p-6 border-white/10 flex items-start gap-4 relative overflow-hidden">
                {/* Avatar circle */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-lg">
                  <Contact size={22} className="text-indigo-400" />
                </div>

                {/* Identity details */}
                <div className="space-y-2 overflow-hidden w-full">
                  <div>
                    <h3 className="text-base font-bold text-white truncate">{person.name}</h3>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} className="text-slate-500" />
                      {person.email}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Added: {new Date(person.createdAt).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold uppercase">
                      ASSIGNEE
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass-panel border-dashed border-white/10">
            <Users size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No Assignee Staff</h3>
            <p className="text-xs text-slate-500 mt-1">Add staff members to select them during task creation</p>
          </div>
        )
      )}

      {/* Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 border-white/10 relative text-left">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {activeTab === 'admins' ? 'Provision Admin Account' : 'Add Assignee Staff'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded border border-red-500/20">{formError}</p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={formSubmitting}
                    className="w-full glass-input glass-input-icon"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="email"
                    placeholder="e.g. john@sgic.lk"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    disabled={formSubmitting}
                    className="w-full glass-input glass-input-icon"
                    required
                  />
                </div>
              </div>

              {activeTab === 'admins' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Account Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      disabled={formSubmitting}
                      className="w-full glass-input glass-input-icon"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Must be at least 6 characters long.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                  className="glass-btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="glass-btn cursor-pointer"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="animate-spin text-white" size={16} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save {activeTab === 'admins' ? 'Admin' : 'Staff'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
