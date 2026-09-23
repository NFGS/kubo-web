import type { TokenResponse } from './types';

const BASE = '/api/v1';
const REFRESH_STORAGE_KEY = 'kubo.refresh';

/**
 * El access token vive solo en memoria (15 minutos): sobrevive a un XSS mucho
 * peor el refresh token, que si se guarda en el navegador para no pedir
 * credenciales en cada recarga. La migracion a cookie httpOnly esta prevista
 * para la fase 2 (ver docs de seguridad).
 */
let accessToken: string | null = null;
let refreshToken: string | null = localStorage.getItem(REFRESH_STORAGE_KEY);
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
  if (refresh) {
    localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
  } else {
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  }
}

export function hasSession(): boolean {
  return refreshToken !== null;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return fetch(`${BASE}${path}`, { ...init, headers });
}

async function parseError(response: Response): Promise<ApiError> {
  let code = 'ERROR';
  let message = `Error ${response.status}`;
  try {
    const body = (await response.json()) as { code?: string; message?: string };
    code = body.code ?? code;
    message = body.message ?? message;
  } catch {
    // respuesta sin cuerpo JSON: se conserva el mensaje generico
  }
  return new ApiError(response.status, code, message);
}

let refreshInFlight: Promise<boolean> | null = null;

/** Refresco de token con vuelo unico: varias peticiones 401 no disparan N refrescos. */
export async function refreshSession(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        if (!response.ok) {
          setTokens(null, null);
          return false;
        }
        const data = (await response.json()) as TokenResponse;
        setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send(path, init);
    } else {
      unauthorizedHandler?.();
      throw new ApiError(401, 'SESSION_EXPIRED', 'La sesión expiró, vuelve a ingresar');
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  const data = (await response.json()) as TokenResponse;
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  if (refreshToken) {
    try {
      await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      // si no hay red, la sesion local se cierra igual
    }
  }
  setTokens(null, null);
}

/** Borra los datos del negocio guardados por el service worker al cerrar sesion. */
export async function purgeCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name.startsWith('kubo')).map((name) => caches.delete(name))
  );
}
