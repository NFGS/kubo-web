import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { decidirAnteError } from './queue-policy';

describe('politica de la cola ante errores de sincronizacion', () => {
  it('una sesion vencida (401) detiene la cola sin perder la venta', () => {
    expect(decidirAnteError(new ApiError(401, 'SESSION_EXPIRED', 'expiro'))).toBe('detener');
  });

  it('un 403 tambien detiene la cola', () => {
    expect(decidirAnteError(new ApiError(403, 'FORBIDDEN', 'sin permiso'))).toBe('detener');
  });

  it('un conflicto de negocio (409 por stock) se descarta', () => {
    expect(decidirAnteError(new ApiError(409, 'INSUFFICIENT_STOCK', 'sin stock'))).toBe(
      'descartar'
    );
  });

  it('un 400 se descarta y un 500 se reintenta', () => {
    expect(decidirAnteError(new ApiError(400, 'VALIDATION_ERROR', 'malo'))).toBe('descartar');
    expect(decidirAnteError(new ApiError(500, 'INTERNAL', 'fallo'))).toBe('detener');
  });

  it('un fallo de red (sin respuesta) se reintenta', () => {
    expect(decidirAnteError(new TypeError('Failed to fetch'))).toBe('detener');
  });
});
