import { motion } from 'framer-motion';
import { ArrowLeft, GripVertical, Loader2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Task, TaskPriority, TaskStatus } from '../types';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'border-slate-500' },
  { status: 'in_progress', label: 'In Progress', color: 'border-amber-500' },
  { status: 'done', label: 'Done', color: 'border-emerald-500' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

export function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!session || !projectId) return;
    setLoading(true);
    try {
      const res = await api.getTasks(session, projectId);
      setTasks(res.tasks);
    } finally {
      setLoading(false);
    }
  }, [session, projectId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!session || !projectId) return;
    setCreating(true);
    try {
      await api.createTask(session, projectId, { title, priority });
      setShowModal(false);
      setTitle('');
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function moveTask(task: Task, newStatus: TaskStatus) {
    if (!session || !projectId || task.status === newStatus) return;
    await api.updateTask(session, projectId, task.id, { status: newStatus });
    await load();
  }

  async function deleteTask(taskId: string) {
    if (!session || !projectId) return;
    await api.deleteTask(session, projectId, taskId);
    await load();
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-surface-900/90 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-semibold">Project Board</h1>
              <p className="text-sm text-slate-500">Kanban view</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-6 p-6 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="flex flex-col">
                <div className={`mb-4 flex items-center gap-2 border-l-4 pl-3 ${col.color}`}>
                  <h2 className="font-semibold">{col.label}</h2>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 rounded-xl bg-surface-800/50 p-3 min-h-[400px]">
                  {colTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="group glass rounded-xl p-4 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                          <div>
                            <p className="font-medium text-white">{task.title}</p>
                            <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${PRIORITY_COLORS[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="rounded p-1 text-slate-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {COLUMNS.filter((c) => c.status !== task.status).map((c) => (
                          <button
                            key={c.status}
                            onClick={() => moveTask(task, c.status)}
                            className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400 transition hover:bg-brand-500/20 hover:text-brand-400"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass w-full max-w-md rounded-2xl p-6"
          >
            <h2 className="font-display text-xl font-bold">New task</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-300">Priority</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-lg border border-white/10 bg-surface-800 px-4 py-2.5 text-slate-100 outline-none focus:border-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add task'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
