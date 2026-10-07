import { Capacitor } from '@capacitor/core';
import { setApiBase } from './api';

const STORAGE_KEY = 'kubo.serverUrl';

/** ¿Corremos dentro de la app móvil (Capacitor) o en el navegador? */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Dirección del servidor del negocio guardada en este dispositivo. */
export function getServerUrl(): string | null {
  try {
    const valor = localStorage.getItem(STORAGE_KEY);
    return valor && valor.length > 0 ? valor : null;
  } catch {
    return null;
  }
}

export function saveServerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // Sin almacenamiento disponible: la app pedirá la dirección de nuevo.
  }
}

/** Normaliza la entrada: agrega `https://` si falta y quita barras finales. */
export function normalizeServerUrl(input: string): string {
  const limpia = input.trim();
  if (!limpia) {
    return '';
  }
  const conEsquema = /^https?:\/\//i.test(limpia) ? limpia : `https://${limpia}`;
  return conEsquema.replace(/\/+$/, '');
}

/**
 * Aplica la configuración nativa al cliente del API. En la web no hace nada:
 * la base sigue siendo la ruta relativa `/api/v1` (ADR-0031).
 */
export function applyNativeConfig(): void {
  if (isNativePlatform()) {
    setApiBase(getServerUrl());
  }
}
