import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { TokenResponse, TotpChallenge, TotpSetup, User } from './types';

const DEFAULT_BASE = '/api/v1';

/**
 * Base del API. En la web es la ruta relativa (`/api/v1`, proxeada por nginx);
 * en la app móvil (Capacitor) apunta al servidor del negocio configurado en el
 * primer arranque (ADR-0031). El contrato no cambia: solo la base.
 */
let baseUrl = DEFAULT_BASE;

export function setApiBase(serverUrl: string | null): void {
  baseUrl = serverUrl ? `${serverUrl.replace(/\/+$/, '')}/api/v1` : DEFAULT_BASE;
}

export function apiBase(): string {
  return baseUrl;
}

/**
 * El access token vive solo en memoria (15 minutos). El refresh token ya **no**
 * se guarda en el navegador: el gateway (BFF) lo deja en una cookie `httpOnly`
 * + `SameSite=Strict`, de modo que un XSS no puede leerlo. La sesion se
 * restaura pidiendo un refresco: si la cookie es valida, llega un access token
 * nuevo; si no, se muestra el ingreso.
 */
let accessToken: string | null = null;
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

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function cabeceras(init: RequestInit, conToken: boolean): Headers {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (conToken && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}

function base64ABytes(base64: string): Uint8Array<ArrayBuffer> {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

/**
 * Peticion base. En la web usa `fetch` (misma-origen). En la app movil usa el
 * puente nativo de Capacitor (`CapacitorHttp`): no pasa por CORS ni por el
 * proxy del parche de fetch — que resulto fragil en el emulador (2026-10-07) —
 * y conserva las cookies en el WebView. El contrato es identico en ambos.
 */
async function pedir(
  path: string,
  init: RequestInit = {},
  opciones: { conToken?: boolean; binario?: boolean } = {}
): Promise<Response> {
  const conToken = opciones.conToken ?? true;
  const headers = cabeceras(init, conToken);
  const url = `${baseUrl}${path}`;

  if (Capacitor.isNativePlatform()) {
    const respuesta = await CapacitorHttp.request({
      url,
      method: (init.method ?? 'GET').toUpperCase(),
      headers: Object.fromEntries(headers.entries()),
      data: init.body ? JSON.parse(String(init.body)) : undefined,
      responseType: opciones.binario ? 'blob' : undefined
    });
    const cabecerasRespuesta = respuesta.headers as Record<string, string>;

    if (opciones.binario) {
      return new Response(new Blob([base64ABytes(String(respuesta.data ?? ''))]), {
        status: respuesta.status,
        headers: cabecerasRespuesta
      });
    }

    const cuerpo =
      respuesta.data === undefined || respuesta.data === null
        ? null
        : typeof respuesta.data === 'string'
          ? respuesta.data
          : JSON.stringify(respuesta.data);
    return new Response(cuerpo, { status: respuesta.status, headers: cabecerasRespuesta });
  }

  return fetch(url, { ...init, headers, credentials: 'same-origin' });
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
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await pedir('/auth/refresh', { method: 'POST' }, { conToken: false });
        if (!response.ok) {
          setAccessToken(null);
          return false;
        }
        const data = (await response.json()) as TokenResponse;
        setAccessToken(data.accessToken);
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
  let response = await pedir(path, init);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await pedir(path, init);
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

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'El servidor respondió algo que no es JSON');
  }
}

/**
 * Descarga un archivo respetando la sesión (Bearer + refresco) y lo guarda con
 * `filename`. El endpoint exige el token, por eso se usa un blob y no un enlace
 * directo. Sirve para los reportes CSV y para los documentos (XML, PDF).
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  let response = await pedir(path, { method: 'GET' }, { binario: true });

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      unauthorizedHandler?.();
      throw new ApiError(401, 'SESSION_EXPIRED', 'La sesión expiró, vuelve a ingresar');
    }
    response = await pedir(path, { method: 'GET' }, { binario: true });
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revocar de inmediato puede cancelar la descarga en algunos navegadores
  // (Firefox/Safari); se libera despues de que el navegador la haya tomado.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function login(email: string, password: string): Promise<TokenResponse | TotpChallenge> {
  const response = await pedir(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    { conToken: false }
  );
  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as TokenResponse | TotpChallenge;

  // Con segundo factor activo (P-30) la contrasena solo abre el desafio: la
  // sesion se emite cuando el codigo TOTP es valido.
  if ('totpRequired' in data && data.totpRequired) {
    return data;
  }

  setAccessToken((data as TokenResponse).accessToken);
  return data as TokenResponse;
}

/** Segundo paso del acceso: desafio + codigo a cambio de la sesion. */
export async function verifyTotp(challengeToken: string, code: string): Promise<TokenResponse> {
  const response = await pedir(
    '/auth/totp/verify',
    { method: 'POST', body: JSON.stringify({ challengeToken, code }) },
    { conToken: false }
  );
  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as TokenResponse;
  setAccessToken(data.accessToken);
  return data;
}

/** Genera (o regenera) el secreto del segundo factor; queda pendiente de confirmar. */
export function totpSetup(): Promise<TotpSetup> {
  return apiFetch<TotpSetup>('/auth/totp/setup', { method: 'POST' });
}

export function totpEnable(code: string): Promise<User> {
  return apiFetch<User>('/auth/totp/enable', { method: 'POST', body: JSON.stringify({ code }) });
}

export function totpDisable(code: string): Promise<User> {
  return apiFetch<User>('/auth/totp/disable', { method: 'POST', body: JSON.stringify({ code }) });
}

/** Solicita el enlace de recuperacion. La respuesta no revela si el correo existe. */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await pedir(
    '/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
    { conToken: false }
  );
  if (!response.ok) {
    throw await parseError(response);
  }
}

/** Consume el token del enlace y cambia la contrasena. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await pedir(
    '/auth/reset-password',
    { method: 'POST', body: JSON.stringify({ token, newPassword }) },
    { conToken: false }
  );
  if (!response.ok) {
    throw await parseError(response);
  }
}

export async function logout(): Promise<void> {
  try {
    await pedir('/auth/logout', { method: 'POST' }, { conToken: false });
  } catch {
    // si no hay red, la sesion local se cierra igual
  }
  setAccessToken(null);
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
