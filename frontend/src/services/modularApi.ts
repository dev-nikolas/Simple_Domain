/**
 * Simple Domain — Cliente HTTP para Conversaciones y Envíos
 */

import { API_BASE_URL } from '../config/env';
import {
  ArchiveSubmitResponse,
  ChatMessage,
  Conversation,
} from '../types/conversations';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let detail = `Error HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // Fallback
    }
    throw new Error(detail);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export const modularApi = {
  // ==================== Conversaciones ====================
  getConversations: () => request<Conversation[]>('/v1/conversations'),
  createConversation: (title?: string) =>
    request<Conversation>('/v1/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
  getConversation: (id: string) => request<Conversation>(`/v1/conversations/${id}`),
  deleteConversation: (id: string) => request<void>(`/v1/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (convId: string, content: string, role = 'user') =>
    request<ChatMessage>(`/v1/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    }),

  // ==================== Envío de Archivos ====================
  submitArchive: (file: File, conversation_id?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversation_id) formData.append('conversation_id', conversation_id);
    return request<ArchiveSubmitResponse>('/v1/archive/submit', { method: 'POST', body: formData });
  },
};

export default modularApi;
