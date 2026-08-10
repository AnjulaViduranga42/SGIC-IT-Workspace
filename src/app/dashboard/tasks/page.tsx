'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  User, 
  Users, 
  Clock, 
  Tag, 
  FileText,
  AlertCircle,
  X,
  CheckCircle,
  HelpCircle,
  BellRing,
  Send,
  LayoutGrid,
  List as ListIcon,
  Trash
} from 'lucide-react';

interface TaskType {
  id: number;
  name: string;
}

interface UserGroup {
  id: number;
  name: string;
  emails: string;
}

interface PersonRecord {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  taskTypeId: number;
  taskType: TaskType;
  reminderDaysBefore: number;
  reminderSentAt: string | null;
  assigneeEmails: string;
  userGroupId: number | null;
  userGroup: UserGroup | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Form State - Task
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [taskReminderDays, setTaskReminderDays] = useState('1');
  const [taskAssignees, setTaskAssignees] = useState('');
  const [taskGroupId, setTaskGroupId] = useState('');
  const [taskStatus, setTaskStatus] = useState('PENDING');

  // Form State - Staff Picker inside task modal
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [inlinePersonOpen, setInlinePersonOpen] = useState(false);
  const [inlinePersonName, setInlinePersonName] = useState('');
  const [inlinePersonEmail, setInlinePersonEmail] = useState('');
  const [inlinePersonError, setInlinePersonError] = useState<string | null>(null);
  const [inlinePersonSaving, setInlinePersonSaving] = useState(false);

  // Form State - New Type
  const [newTypeName, setNewTypeName] = useState('');
  const [typeError, setTypeError] = useState<string | null>(null);

  // Form State - New Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  // Form error
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, typesRes, groupsRes, peopleRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/tasks/types'),
        fetch('/api/tasks/groups'),
        fetch('/api/people'),
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (typesRes.ok) {
        const types = await typesRes.json();
        setTaskTypes(types);
        if (types.length > 0 && !taskTypeId) {
          setTaskTypeId(types[0].id.toString());
        }
      }
      if (groupsRes.ok) setUserGroups(await groupsRes.json());
      if (peopleRes.ok) setPeople(await peopleRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open task modal for CREATE
  const handleCreateTaskOpen = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    
    // set due date default to 2 days from now at 9:00 AM
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 2);
    defaultDate.setHours(9, 0, 0, 0);
    const tzoffset = defaultDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(defaultDate.getTime() - tzoffset)).toISOString().slice(0, 16);
    
    setTaskDueDate(localISOTime);
    if (taskTypes.length > 0) {
      setTaskTypeId(taskTypes[0].id.toString());
    } else {
      setTaskTypeId('');
    }
    setTaskReminderDays('1');
    setTaskAssignees('');
    setTaskGroupId('');
    setTaskStatus('PENDING');
    setSelectedPersonIds([]);
    setInlinePersonOpen(false);
    setFormError(null);
    setTaskModalOpen(true);
  };

  // Open task modal for EDIT
  const handleEditTaskOpen = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    
    const d = new Date(task.dueDate);
    const tzoffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    
    setTaskDueDate(localISOTime);
    setTaskTypeId(task.taskTypeId.toString());
    setTaskReminderDays(task.reminderDaysBefore.toString());
    setTaskAssignees(task.assigneeEmails || '');
    setTaskGroupId(task.userGroupId?.toString() || '');
    setTaskStatus(task.status);

    // Sync assignee people checkbox selection
    if (task.assigneeEmails) {
      const taskEmails = task.assigneeEmails.split(',').map(e => e.trim().toLowerCase());
      const matchedIds = people
        .filter(p => taskEmails.includes(p.email.toLowerCase()))
        .map(p => p.id);
      setSelectedPersonIds(matchedIds);
    } else {
      setSelectedPersonIds([]);
    }

    setInlinePersonOpen(false);
    setFormError(null);
    setTaskModalOpen(true);
  };

  // Toggle checkbox for assignee person
  const handleTogglePerson = (person: PersonRecord) => {
    let updatedIds;
    if (selectedPersonIds.includes(person.id)) {
      updatedIds = selectedPersonIds.filter(id => id !== person.id);
    } else {
      updatedIds = [...selectedPersonIds, person.id];
    }
    setSelectedPersonIds(updatedIds);

    // Recalculate individual emails input field content
    const currentEmails = taskAssignees
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
    
    const peopleEmails = people.map(p => p.email.toLowerCase());
    const customEmails = currentEmails.filter(email => !peopleEmails.includes(email));
    
    const selectedEmails = people
      .filter(p => updatedIds.includes(p.id))
      .map(p => p.email.toLowerCase());

    const finalEmails = [...selectedEmails, ...customEmails];
    setTaskAssignees(finalEmails.join(', '));
  };

  // Add staff person inline
  const handleCreateInlinePerson = async () => {
    if (!inlinePersonName.trim() || !inlinePersonEmail.trim()) {
      setInlinePersonError('Name and email are required');
      return;
    }
    setInlinePersonSaving(true);
    setInlinePersonError(null);
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlinePersonName, email: inlinePersonEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save staff member');
      }

      const newPerson = data;
      setPeople(prev => [...prev, newPerson].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Auto-check this person
      const updatedIds = [...selectedPersonIds, newPerson.id];
      setSelectedPersonIds(updatedIds);

      // Append email to comma-separated list
      const currentEmails = taskAssignees
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0);
      if (!currentEmails.includes(newPerson.email.toLowerCase())) {
        currentEmails.push(newPerson.email.toLowerCase());
      }
      setTaskAssignees(currentEmails.join(', '));

      setInlinePersonName('');
      setInlinePersonEmail('');
      setInlinePersonOpen(false);
    } catch (err: any) {
      setInlinePersonError(err.message || 'Something went wrong');
    } finally {
      setInlinePersonSaving(false);
    }
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate || !taskTypeId) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const payload = {
      title: taskTitle,
      description: taskDescription,
      dueDate: new Date(taskDueDate).toISOString(),
      taskTypeId: parseInt(taskTypeId),
      reminderDaysBefore: parseInt(taskReminderDays),
      assigneeEmails: taskAssignees,
      userGroupId: taskGroupId ? parseInt(taskGroupId) : null,
      status: taskStatus,
    };

    try {
      const url = editingTaskId ? `/api/tasks/${editingTaskId}` : '/api/tasks';
      const method = editingTaskId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setTaskModalOpen(false);
        fetchInitialData();
      } else {
        setFormError(data.error || 'Failed to save task configuration');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      setFormError('Connection error. Please try again.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Toggle Task Status
  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  // Create new task type
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setTypeError(null);

    try {
      const res = await fetch('/api/tasks/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewTypeName('');
        setTypeModalOpen(false);
        const typesRes = await fetch('/api/tasks/types');
        if (typesRes.ok) {
          const types = await typesRes.json();
          setTaskTypes(types);
          // Set selection to new type
          const added = types.find((t: any) => t.name === data.name);
          if (added) setTaskTypeId(added.id.toString());
        }
      } else {
        setTypeError(data.error || 'Failed to create type');
      }
    } catch (error) {
      setTypeError('Connection error');
    }
  };

  // Create user group
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupEmails.trim()) {
      setGroupError('Name and emails are required.');
      return;
    }
    setGroupError(null);

    try {
      const res = await fetch('/api/tasks/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, emails: newGroupEmails }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewGroupName('');
        setNewGroupEmails('');
        setGroupModalOpen(false);
        const groupsRes = await fetch('/api/tasks/groups');
        if (groupsRes.ok) {
          const groups = await groupsRes.json();
          setUserGroups(groups);
          const added = groups.find((g: any) => g.name === data.name);
          if (added) setTaskGroupId(added.id.toString());
        }
      } else {
        setGroupError(data.error || 'Failed to create group');
      }
    } catch (error) {
      setGroupError('Connection error');
    }
  };

  // Filtering Logic
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || task.taskTypeId.toString() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Add Button with View Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tasks Repository</h1>
          <p className="text-sm text-slate-400">Deploy, edit, and organize scheduled task alerts</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Grid vs List View toggles */}
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('card')}
              type="button"
              className={`p-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'card'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              className={`p-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tabular List View"
            >
              <ListIcon size={13} />
              <span>List</span>
            </button>
          </div>

          <button onClick={handleCreateTaskOpen} className="glass-btn shrink-0 cursor-pointer text-xs sm:text-sm">
            <Plus size={18} />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search by task title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input glass-input-icon"
          />
        </div>
        
        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full glass-input cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="COMPLETED">Completed Only</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full glass-input cursor-pointer"
          >
            <option value="ALL">All Types</option>
            {taskTypes.map((type) => (
              <option key={type.id} value={type.id.toString()}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Content Outlet */}
      {isLoading ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Syncing task records...</p>
        </div>
      ) : filteredTasks.length > 0 ? (
        viewMode === 'card' ? (
          // CARD GRID VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTasks.map((task) => {
              const isCompleted = task.status === 'COMPLETED';
              return (
                <div 
                  key={task.id} 
                  className={`glass-panel p-6 border-white/10 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    isCompleted ? 'opacity-70 bg-black/10 border-white/5 shadow-inner' : 'glass-panel-hover'
                  }`}
                >
                  <div>
                    {/* Task Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider">
                        {task.taskType.name}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                          isCompleted 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {isCompleted ? 'Completed' : 'Pending'}
                      </button>
                    </div>

                    {/* Title & Description */}
                    <h3 className={`text-base font-bold text-white tracking-wide truncate ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-3 mt-2">
                      {task.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className="mt-6 pt-4 border-t border-white/5 space-y-3.5">
                    
                    {/* Date details */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} />
                        Due Date
                      </span>
                      <span className="font-semibold text-slate-300">
                        {new Date(task.dueDate).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Reminders details */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <BellRing size={13} />
                        Reminder Schedule
                      </span>
                      <span className="font-semibold text-slate-300">
                        {task.reminderDaysBefore} {task.reminderDaysBefore === 1 ? 'day' : 'days'} prior
                      </span>
                    </div>

                    {/* Email Target Details */}
                    <div className="space-y-1.5 pt-1">
                      {task.userGroup && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-300 truncate">
                          <Users size={12} />
                          <span>Group: {task.userGroup.name}</span>
                        </div>
                      )}
                      {task.assigneeEmails && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                          <User size={12} />
                          <span className="truncate">Assignees: {task.assigneeEmails}</span>
                        </div>
                      )}
                    </div>

                    {/* Reminder alert status */}
                    <div className="flex items-center justify-between text-[10px] bg-white/5 border border-white/5 rounded px-2.5 py-1.5 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Alert State:
                      </span>
                      {task.reminderSentAt ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle size={10} />
                          Alert Sent
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Send size={10} className="animate-pulse" />
                          Queued ({task.reminderDaysBefore}d before)
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleEditTaskOpen(task)}
                        className="p-2 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 rounded bg-red-500/5 border border-red-500/10 text-red-300 hover:text-red-200 hover:bg-red-500/15 cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // TABULAR LIST VIEW
          <div className="glass-panel overflow-x-auto border-white/10 shadow-lg">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Task Details</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6">Recipients / Staff</th>
                  <th className="py-4 px-6">Alert State</th>
                  <th className="py-4 px-6">Task Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  return (
                    <tr key={task.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className={`font-semibold text-white ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {task.description || 'No description.'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase">
                          {task.taskType.name}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-300">
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 max-w-[200px] truncate">
                        {task.userGroup && (
                          <div className="text-indigo-300 font-semibold mb-0.5">Group: {task.userGroup.name}</div>
                        )}
                        {task.assigneeEmails && <div>{task.assigneeEmails}</div>}
                      </td>
                      <td className="py-4 px-6 text-xs">
                        {task.reminderSentAt ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle size={10} />
                            Alert Sent
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Send size={10} />
                            Queued ({task.reminderDaysBefore}d)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer font-medium ${
                            isCompleted 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {isCompleted ? 'Completed' : 'Pending'}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditTaskOpen(task)}
                            className="p-1.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 rounded bg-red-500/5 border border-red-500/10 text-red-300 hover:text-red-200 hover:bg-red-500/15 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-24 glass-panel border-dashed border-white/10">
          <AlertCircle size={40} className="mx-auto text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No tasks matching filters</h3>
          <p className="text-xs text-slate-500 mt-1">Adjust search parameters or create a new reminder task alert.</p>
        </div>
      )}

      {/* Task Form Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl glass-panel p-6 border-white/10 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setTaskModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {editingTaskId ? 'Modify Scheduled Task' : 'Deploy New Task'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4 text-left">
              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded border border-red-500/20">{formError}</p>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Server Software Upgrade"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Task Description</label>
                <textarea
                  placeholder="Provide explicit steps or details of the task..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full glass-input"
                />
              </div>

              {/* Task Type and Add Type button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Task Type</label>
                  <div className="flex gap-2">
                    <select
                      value={taskTypeId}
                      onChange={(e) => setTaskTypeId(e.target.value)}
                      className="w-full glass-input cursor-pointer"
                      required
                    >
                      {taskTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setTypeModalOpen(true)}
                      className="glass-btn-secondary px-3 cursor-pointer"
                      title="Add Custom Task Type"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Status (Edit mode only) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Current Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="w-full glass-input cursor-pointer"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Reminder Lead Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Email Reminder Schedule</label>
                  <select
                    value={taskReminderDays}
                    onChange={(e) => setTaskReminderDays(e.target.value)}
                    className="w-full glass-input cursor-pointer"
                  >
                    <option value="1">1 Day Before Due Date</option>
                    <option value="2">2 Days Before Due Date</option>
                    <option value="3">3 Days Before Due Date</option>
                    <option value="5">5 Days Before Due Date</option>
                    <option value="7">7 Days Before Due Date</option>
                  </select>
                </div>
              </div>

              {/* Assignee Email Group */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Assignee Email Group (User Groups)</label>
                <div className="flex gap-2">
                  <select
                    value={taskGroupId}
                    onChange={(e) => setTaskGroupId(e.target.value)}
                    className="w-full glass-input cursor-pointer"
                  >
                    <option value="">None (Individual Assignees Only)</option>
                    {userGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name} ({group.emails.split(',').length} users)</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setGroupModalOpen(true)}
                    className="glass-btn-secondary px-3 cursor-pointer"
                    title="Add Custom Email Group"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Staff Person Selector (Checkboxes) */}
              <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">Select Staff Assignee(s)</label>
                  <button
                    type="button"
                    onClick={() => setInlinePersonOpen(!inlinePersonOpen)}
                    className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={10} />
                    <span>Add Staff Person</span>
                  </button>
                </div>

                {/* Inline form to create person */}
                {inlinePersonOpen && (
                  <div className="mt-2 p-3 rounded bg-black/20 border border-white/5 space-y-2">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Quick Add New Staff</h4>
                    {inlinePersonError && (
                      <p className="text-[10px] text-red-400">{inlinePersonError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={inlinePersonName}
                        onChange={(e) => setInlinePersonName(e.target.value)}
                        className="w-full text-xs glass-input py-1.5"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={inlinePersonEmail}
                        onChange={(e) => setInlinePersonEmail(e.target.value)}
                        className="w-full text-xs glass-input py-1.5"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setInlinePersonOpen(false)}
                        className="text-[10px] glass-btn-secondary px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateInlinePerson}
                        disabled={inlinePersonSaving}
                        className="text-[10px] glass-btn px-2 py-1"
                      >
                        {inlinePersonSaving ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Checkbox list of existing directory people */}
                {people.length > 0 ? (
                  <div className="max-h-24 overflow-y-auto mt-2 space-y-1.5 pr-2">
                    {people.map((person) => {
                      const isChecked = selectedPersonIds.includes(person.id);
                      return (
                        <label key={person.id} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePerson(person)}
                            className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-medium">{person.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({person.email})</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">No staff members in directory. Create one using "Add Staff Person" above.</p>
                )}
              </div>

              {/* Individual Emails Input Field (Kept synced automatically) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Individual Assignee Emails (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. dev1@sgic.lk, developer@sgic.lk"
                  value={taskAssignees}
                  onChange={(e) => setTaskAssignees(e.target.value)}
                  className="w-full glass-input"
                />
                <p className="text-[9px] text-slate-500">Emails in this list will receive notifications. Checking staff above appends them automatically.</p>
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="glass-btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-btn cursor-pointer"
                >
                  {editingTaskId ? 'Save Modifications' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Type Modal */}
      {typeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel p-6 border-white/10 relative">
            <button 
              onClick={() => setTypeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-4">Add Custom Task Type</h3>

            <form onSubmit={handleSaveType} className="space-y-4">
              {typeError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{typeError}</p>
              )}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 block text-left">Task Type Name</label>
                <input
                  type="text"
                  placeholder="e.g. Security Audit"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="glass-btn-secondary py-1.5 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-btn py-1.5 text-xs cursor-pointer"
                >
                  Create Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Group Modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 border-white/10 relative">
            <button 
              onClick={() => setGroupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-4">Add Custom User Group</h3>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-left">
              {groupError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{groupError}</p>
              )}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 block">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Network Administrators"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300 block">Member Emails (Comma-separated)</label>
                <textarea
                  placeholder="e.g. admin1@sgic.lk, admin2@sgic.lk"
                  value={newGroupEmails}
                  onChange={(e) => setNewGroupEmails(e.target.value)}
                  rows={3}
                  className="w-full glass-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="glass-btn-secondary py-1.5 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-btn py-1.5 text-xs cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
