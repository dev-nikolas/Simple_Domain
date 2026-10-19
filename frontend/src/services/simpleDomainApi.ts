/**
 * Simple Domain — Cliente HTTP para el Servicio Local
 * Separado de la capa de presentación visual con timeout y control de aborto.
 */

import { buildApiUrl, ENDPOINTS } from '../config/endpoints';
import { HealthResponse, InfoResponse } from '../types/api';

const REQUEST_TIMEOUT_MS = 4000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = buildApiUrl(path);
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(new Error('Timeout de red')), REQUEST_TIMEOUT_MS);

  const onAbort = () => timeoutCtrl.abort(signal?.reason);
  if (signal) signal.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timeoutCtrl.signal,
    });

    if (!res.ok) {
      throw new ApiError(`HTTP ${res.status} al consultar ${path}`, path, res.status);
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError(`Respuesta JSON inválida desde ${path}`, path, res.status);
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      throw signal.reason || new DOMException('Aborted', 'AbortError');
    }
    const detail = err instanceof Error ? err.message : 'Error desconocido';
    throw new ApiError(`Error al conectar con ${path}: ${detail}`, path);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>(ENDPOINTS.HEALTH, signal);
}

export async function fetchInfo(signal?: AbortSignal): Promise<InfoResponse> {
  return requestJson<InfoResponse>(ENDPOINTS.INFO, signal);
}
