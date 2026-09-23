import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Red de seguridad de la interfaz.
 *
 * Sin esto, un error de renderizado deja la pantalla en blanco y el vendedor no
 * sabe que hacer. Aqui se muestra un mensaje entendible y un boton para
 * recargar, y el error queda registrado en la consola del navegador.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de interfaz en Kubo:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="card max-w-md space-y-4 p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Algo salió mal en la pantalla</h1>
          <p className="text-sm text-slate-600">
            Tus ventas están a salvo: el problema es solo de la interfaz. Recarga para continuar;
            si vuelve a pasar, avisa al soporte con este mensaje:
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-kubo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-kubo-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recargar la aplicación
          </button>
        </div>
      </div>
    );
  }
}
