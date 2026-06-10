import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-');
  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-white/10 bg-surface-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${className}`}
        {...props}
      />
    </label>
  );
}
