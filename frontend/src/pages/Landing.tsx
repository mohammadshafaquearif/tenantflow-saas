import { motion } from 'framer-motion';
import { ArrowRight, Building2, Lock, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const features = [
  { icon: Building2, title: 'Multi-Tenant Isolation', desc: 'Schema-per-tenant PostgreSQL — zero data leakage between companies' },
  { icon: Shield, title: 'JWT + RBAC', desc: 'Role-based access: Admin → Manager → Member → Viewer' },
  { icon: Lock, title: 'Enterprise Security', desc: 'Bcrypt, Helmet, rate limiting, tenant header validation' },
  { icon: Zap, title: 'Serverless Ready', desc: 'Deployed on Vercel with Prisma Postgres' },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-sm font-bold">TF</div>
          <span className="font-display text-xl font-semibold">TenantFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/register"><Button size="sm">Start free <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-sm text-brand-400">
            Enterprise B2B SaaS Platform
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Your company&apos;s workspace,
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
              fully isolated
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Lightweight Jira for modern teams. Register your company, invite members,
            manage projects & tasks — with bank-grade multi-tenant data isolation.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg">Create your workspace <ArrowRight className="h-5 w-5" /></Button>
            </Link>
            <Link to="/login"><Button variant="ghost" size="lg">Sign in to workspace</Button></Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 shadow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 glass rounded-2xl p-8 text-center"
        >
          <p className="text-sm text-slate-500">Architecture</p>
          <p className="mt-2 font-mono text-sm text-brand-400">
            React → Express API → PostgreSQL (schema-per-tenant) → Vercel Serverless
          </p>
        </motion.div>
      </main>
    </div>
  );
}
