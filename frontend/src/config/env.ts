/**
 * Simple Domain — Configuración de Entorno (Vite)
 * Centraliza la URL base del servicio y constantes de ejecución local.
 */

const rawApiUrl = import.meta.env.VITE_SIMPLE_DOMAIN_API_URL as string | undefined;

export const API_BASE_URL: string = (rawApiUrl || 'http://127.0.0.1:4000').replace(/\/+$/, '');

export const UI_VERSION = 'v1.0.0';
export const APP_NAME = 'SIMPLE DOMAIN';
export const APP_SUBTITLE = 'ADAPTIVE PATTERN SYSTEM';
export const POLL_INTERVAL_MS = 5000;
