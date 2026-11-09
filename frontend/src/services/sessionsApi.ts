/**
 * Simple Domain — Cliente API para Gestión de Sesiones Persistentes
 * Conexión hacia el Agentic Gateway con Circuit Breaker y límite de reintentos.
 */

import { API_BASE_URL } from '../config/env';
import { Message } from '../types/relic';

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

let isCircuitOpen = false;
let lastFailureTimestamp = 0;
let consecutiveFailures = 0;
const CIRCUIT_COOLDOWN_MS = 15000; // 15s de espera antes de reintentar
const MAX_FAILURES = 2;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const now = Date.now();
  if (isCircuitOpen) {
    if (now - lastFailureTimestamp < CIRCUIT_COOLDOWN_MS) {
      throw new Error('Gateway desconectado (Circuit breaker activo)');
    }
    // Entrar en modo semi-abierto para probar conexión
    isCircuitOpen = false;
  }

  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) || {}),
      },
    });

    if (!response.ok) {
      let errorMsg = `Error HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    // Éxito: restablecer circuito
    isCircuitOpen = false;
    consecutiveFailures = 0;

    if (response.status === 204) {
      return {} as T;
    }
    return response.json();
  } catch (err: any) {
    consecutiveFailures++;
    lastFailureTimestamp = Date.now();
    if (consecutiveFailures >= MAX_FAILURES) {
      isCircuitOpen = true;
    }
    throw err;
  }
}

export const sessionsApi = {
  resetCircuitBreaker: () => {
    isCircuitOpen = false;
    consecutiveFailures = 0;
    lastFailureTimestamp = 0;
  },

  list: async (): Promise<ChatSessionSummary[]> => {
    return request<ChatSessionSummary[]>('/v1/sessions');
  },

  get: async (id: string, limit?: number, offset?: number): Promise<ChatSessionDetail> => {
    const query = new URLSearchParams();
    if (limit !== undefined) query.set('limit', String(limit));
    if (offset !== undefined) query.set('offset', String(offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ChatSessionDetail>(`/v1/sessions/${id}${qs}`);
  },

  create: async (data?: { id?: string; title?: string; messages?: Message[] }): Promise<ChatSessionDetail> => {
    return request<ChatSessionDetail>('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  rename: async (id: string, title: string): Promise<ChatSessionDetail> => {
    return request<ChatSessionDetail>(`/v1/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request<void>(`/v1/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  addMessage: async (id: string, message: Message): Promise<ChatSessionDetail> => {
    return request<ChatSessionDetail>(`/v1/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
  },

  syncMessages: async (id: string, messages: Message[]): Promise<ChatSessionDetail> => {
    return request<ChatSessionDetail>(`/v1/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  },
};

export default sessionsApi;
