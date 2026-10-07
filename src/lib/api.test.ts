import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
  CapacitorHttp: { request: vi.fn() }
}));

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { apiFetch, setAccessToken, setApiBase } from './api';

describe('cliente del API (web y app móvil)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    setAccessToken(null);
    setApiBase(null);
  });

  it('en la web usa fetch con la base relativa', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await expect(apiFetch<{ ok: boolean }>('/tablero')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tablero',
      expect.objectContaining({ credentials: 'same-origin' })
    );
  });

  it('en la app móvil usa el puente nativo con la base del servidor', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapacitorHttp.request).mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: {},
      url: ''
    });
    setApiBase('https://kubo.shares.zrok.io');

    await expect(apiFetch<{ ok: boolean }>('/tablero')).resolves.toEqual({ ok: true });
    expect(CapacitorHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://kubo.shares.zrok.io/api/v1/tablero',
        method: 'GET'
      })
    );
  });

  it('en la app móvil envía el token y el cuerpo JSON por el puente nativo', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapacitorHttp.request).mockResolvedValue({
      status: 201,
      data: { id: '1' },
      headers: {},
      url: ''
    });
    setApiBase('https://kubo.shares.zrok.io');
    setAccessToken('token-123');

    await apiFetch('/clientes', { method: 'POST', body: JSON.stringify({ nombre: 'Ana' }) });

    const llamada = vi.mocked(CapacitorHttp.request).mock.calls[0][0];
    // `Headers` normaliza los nombres a minusculas (HTTP no distingue mayusculas).
    expect(llamada.headers).toMatchObject({
      authorization: 'Bearer token-123',
      'content-type': 'application/json'
    });
    expect(llamada.data).toEqual({ nombre: 'Ana' });
  });

  it('detecta una respuesta que no es JSON con un error claro', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapacitorHttp.request).mockResolvedValue({
      status: 200,
      data: '<!DOCTYPE html>',
      headers: {},
      url: ''
    });

    await expect(apiFetch('/tablero')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
