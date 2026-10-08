import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Verdes y rojos de la referencia (no esmeralda/rosa).
const toneStyles: Record<ToastTone, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-white text-slate-700'
};

const toneIcons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />,
  error: <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />,
  info: <Info className="h-5 w-5 text-slate-500" aria-hidden />
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo<ToastApi>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
              toneStyles[toast.tone]
            )}
          >
            {toneIcons[toast.tone]}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
}
