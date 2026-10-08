import clsx from 'clsx';
import { Loader2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Card({
  children,
  className,
  title,
  action
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={clsx('card p-5', className)}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// Botones de la referencia: radio 12px, primario azul royal, peligro rojo.
const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-kubo-600 text-white hover:bg-kubo-700 disabled:bg-kubo-300',
  secondary: 'bg-white text-ink-700 border border-edge hover:bg-slate-50',
  ghost: 'text-ink-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700'
};

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled ?? loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-70',
        buttonStyles[variant],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold tracking-wider text-slate-600 uppercase">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-600">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={clsx(
        'w-full rounded-xl border border-edge bg-white px-3.5 py-2.5 text-sm text-ink-900',
        'placeholder:text-slate-400 focus:border-kubo-500 focus:ring-2 focus:ring-kubo-100 focus:outline-none',
        className
      )}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={clsx(
        'w-full rounded-xl border border-edge bg-white px-3.5 py-2.5 text-sm text-ink-900',
        'focus:border-kubo-500 focus:ring-2 focus:ring-kubo-100 focus:outline-none',
        className
      )}
    >
      {children}
    </select>
  );
}

// Tonos aditivos: violet y pink llegan con la referencia visual (estados
// "Suspendido" y etiquetas tipo "API error"). El texto de cada pastilla usa
// el paso oscuro que sostiene contraste >= 4.5:1 (WCAG AA) sobre el pastel.
type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'pink';

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-kubo-100 text-kubo-700',
  violet: 'bg-violet-100 text-violet-600',
  pink: 'bg-pink-100 text-pink-700'
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', toneStyles[tone])}>
      {children}
    </span>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-slate-600">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-600">{description}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Accesibilidad del dialogo: el foco entra al abrir, Tab no se escapa del
  // panel (focus trap), Escape cierra y al cerrar el foco vuelve a donde estaba.
  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const previo = document.activeElement as HTMLElement | null;
    const enfocables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    (enfocables()[0] ?? panel).focus();

    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const lista = enfocables();
      if (lista.length === 0) {
        event.preventDefault();
        return;
      }

      const actual = document.activeElement as HTMLElement;
      const indice = lista.indexOf(actual);

      if (event.shiftKey) {
        if (indice <= 0) {
          event.preventDefault();
          lista[lista.length - 1].focus();
        }
      } else if (indice === -1 || indice === lista.length - 1) {
        event.preventDefault();
        lista[0].focus();
      }
    };

    document.addEventListener('keydown', alPresionar, true);
    return () => {
      document.removeEventListener('keydown', alPresionar, true);
      previo?.focus?.();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      {message}
    </p>
  );
}
