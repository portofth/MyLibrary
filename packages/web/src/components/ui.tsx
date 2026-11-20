import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-accent-fg hover:opacity-90',
        variant === 'ghost' && 'border border-border hover:bg-surface-2',
        className,
      )}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm',
            o.value === value ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ error }: { error: { message: string } | null }) {
  if (!error) return null;
  return <p className="text-sm text-danger">{error.message}</p>;
}
