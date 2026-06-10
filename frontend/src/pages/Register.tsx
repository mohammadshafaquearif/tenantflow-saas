import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ tenantName, adminEmail, adminPassword, adminFullName });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-64 w-96 rounded-full bg-violet-500/15 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="glass rounded-2xl p-8 shadow-card">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 font-display font-bold">TF</div>
            <h1 className="font-display text-2xl font-bold">Create workspace</h1>
            <p className="mt-1 text-sm text-slate-400">Register your company on TenantFlow</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Company name"
              placeholder="Acme Corp"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
            <Input
              label="Your full name"
              placeholder="Jane Admin"
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              required
            />
            <Input
              label="Work email"
              type="email"
              placeholder="admin@acme.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters"
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />

            {error && (
              <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create workspace'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have one?{' '}
            <Link to="/login" className="text-brand-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
