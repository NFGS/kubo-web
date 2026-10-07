import { useState, type FormEvent } from 'react';
import { Smartphone } from 'lucide-react';
import { Button, Card, ErrorNote, Field, Input } from './ui';
import { normalizeServerUrl, saveServerUrl } from '../lib/native';

const DEMO_URL = 'https://kubo.shares.zrok.io';

/**
 * Primer arranque de la app móvil (ADR-0031): pide la dirección del servidor
 * del negocio, la prueba contra un endpoint público y la guarda en el
 * dispositivo. En la web esta pantalla no se muestra nunca.
 */
export function ServerSetup({ onDone }: { onDone: () => void }) {
  const [direccion, setDireccion] = useState('');
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function conectar(candidata: string) {
    const normalizada = normalizeServerUrl(candidata);
    if (!normalizada) {
      setError('Escribe la dirección del servidor de tu negocio.');
      return;
    }

    setProbando(true);
    setError(null);
    try {
      const respuesta = await fetch(`${normalizada}/api/v1/auth/.well-known/jwks.json`);
      if (!respuesta.ok) {
        throw new Error(`estado ${respuesta.status}`);
      }
      saveServerUrl(normalizada);
      onDone();
    } catch {
      setError('No se pudo conectar con ese servidor. Revisa la dirección e inténtalo de nuevo.');
    } finally {
      setProbando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void conectar(direccion);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-kubo-100 text-kubo-700">
            <Smartphone className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Conecta tu negocio</h1>
            <p className="text-xs text-slate-600">Primer arranque de la app móvil</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Escribe la dirección del servidor donde está instalado Kubo (la misma que usas en el
          navegador). La app la recordará en este dispositivo.
        </p>

        <form onSubmit={enviar} className="space-y-4">
          <Field label="Dirección del servidor" hint="Por ejemplo: kubo-app.duckdns.org">
            <Input
              value={direccion}
              onChange={(evento) => setDireccion(evento.target.value)}
              placeholder="https://kubo-app.duckdns.org"
              autoComplete="off"
              inputMode="url"
            />
          </Field>

          <ErrorNote message={error} />

          <div className="flex flex-col gap-2">
            <Button type="submit" loading={probando}>
              Probar y continuar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={probando}
              onClick={() => void conectar(DEMO_URL)}
            >
              Usar la demo pública
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
