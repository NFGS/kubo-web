import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) }
}));

import { Capacitor } from '@capacitor/core';
import { apiBase, setApiBase } from './api';
import {
  applyNativeConfig,
  getServerUrl,
  isNativePlatform,
  normalizeServerUrl,
  saveServerUrl
} from './native';

describe('modo nativo (app móvil, ADR-0031)', () => {
  beforeEach(() => {
    localStorage.clear();
    setApiBase(null);
    vi.clearAllMocks();
  });

  it('normaliza la dirección del servidor', () => {
    expect(normalizeServerUrl('   ')).toBe('');
    expect(normalizeServerUrl('kubo-app.duckdns.org')).toBe('https://kubo-app.duckdns.org');
    expect(normalizeServerUrl('http://192.168.1.10:3080/')).toBe('http://192.168.1.10:3080');
    expect(normalizeServerUrl('https://kubo.shares.zrok.io///')).toBe(
      'https://kubo.shares.zrok.io'
    );
  });

  it('guarda y lee la dirección del servidor', () => {
    expect(getServerUrl()).toBeNull();
    saveServerUrl('https://kubo.shares.zrok.io');
    expect(getServerUrl()).toBe('https://kubo.shares.zrok.io');
  });

  it('en la web la base del API queda relativa y la configuración no aplica', () => {
    saveServerUrl('https://kubo.shares.zrok.io');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    applyNativeConfig();
    expect(isNativePlatform()).toBe(false);
    expect(apiBase()).toBe('/api/v1');
  });

  it('en la app móvil la base del API apunta al servidor configurado', () => {
    saveServerUrl('https://kubo.shares.zrok.io/');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    applyNativeConfig();
    expect(apiBase()).toBe('https://kubo.shares.zrok.io/api/v1');
  });

  it('sin servidor configurado en la app móvil la base queda relativa', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    applyNativeConfig();
    expect(apiBase()).toBe('/api/v1');
  });

  it('sin almacenamiento disponible no falla (modo privado estricto)', () => {
    const leer = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denegado');
    });
    expect(getServerUrl()).toBeNull();
    leer.mockRestore();

    const escribir = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denegado');
    });
    expect(() => saveServerUrl('https://kubo.local')).not.toThrow();
    escribir.mockRestore();
  });
});
