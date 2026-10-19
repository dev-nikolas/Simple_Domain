/**
 * Simple Domain — Catálogo de Endpoints de la API
 * Rutas relativas del backend local y constructor de URLs.
 */

import { API_BASE_URL } from './env';

export const ENDPOINTS = {
  HEALTH: '/health',
  INFO: '/v1/info',
  SCORE: '/v1/score',
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}
