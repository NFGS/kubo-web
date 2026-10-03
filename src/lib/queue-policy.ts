import { ApiError } from './api';

export type ErrorDecision = 'descartar' | 'detener';

/**
 * Decide que hacer con una venta encolada cuando su envio falla.
 *
 * - `descartar`: un 4xx de negocio (producto inexistente, stock insuficiente,
 *   conflicto) no se va a resolver reintentando; se descarta para no bloquear
 *   la cola.
 * - `detener`: un 401/403 (sesion vencida o sin permiso) o un fallo de red o
 *   del servidor (5xx) se reintenta despues. La venta **nunca** se pierde por
 *   una sesion vencida: se conserva hasta volver a ingresar.
 */
export function decidirAnteError(error: unknown): ErrorDecision {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return 'detener';
  }

  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return 'descartar';
  }

  return 'detener';
}
