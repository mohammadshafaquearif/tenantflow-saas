import { motion } from 'framer-motion';
import { FolderKanban, Loader2, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Project } from '../types';

export function Dashboard() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await api.getProjects(session);
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setCreating(true);
    setError('');
    try {
      await api.createProject(session, name, description || undefined);
      setShowModal(false);
      setName('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!session || !confirm('Delete this project and all tasks?')) return;
    await api.deleteProject(session, id);
    await load();
  }

  return (
    <AppShell onNewProject={() => setShowModal(true)}>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-slate-600" />
          <h2 className="text-xl font-semibold">No projects yet</h2>
          <p className="mt-2 text-slate-400">Create your first project to start managing tasks</p>
          <Button className="mt-6" onClick={() => setShowModal(true)}>Create project</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group glass relative rounded-2xl p-6 shadow-card transition hover:border-brand-500/30"
            >
              <Link to={`/projects/${p.id}`} className="block">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white group-hover:text-brand-400">{p.name}</h3>
                {p.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{p.description}</p>
                )}
              </Link>
              <button
                onClick={() => handleDelete(p.id)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-600 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass w-full max-w-md rounded-2xl p-6 shadow-card"
          >
            <h2 className="font-display text-xl font-bold">New project</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <Input label="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
