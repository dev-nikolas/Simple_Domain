/**
 * Simple Domain — Cliente HTTP para Módulos v1.0, Brain, Archive y Conversaciones
 */

import { API_BASE_URL } from '../config/env';
import {
  AnalysisRecord,
  DataSource,
  DataSourceCreate,
  Experiment,
  ExperimentCreate,
  Pattern,
  PatternCreate,
  SettingsResponse,
} from '../types/modular';
import {
  ArchiveManifest,
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
  // ==================== Research ====================
  getExperiments: () => request<Experiment[]>('/v1/research/experiments'),
  createExperiment: (data: ExperimentCreate) =>
    request<Experiment>('/v1/research/experiments', { method: 'POST', body: JSON.stringify(data) }),
  deleteExperiment: (id: string) =>
    request<void>(`/v1/research/experiments/${id}`, { method: 'DELETE' }),

  // ==================== Data Sources ====================
  getDataSources: () => request<DataSource[]>('/v1/data-sources'),
  createDataSource: (data: DataSourceCreate) =>
    request<DataSource>('/v1/data-sources', { method: 'POST', body: JSON.stringify(data) }),
  deleteDataSource: (id: string) =>
    request<void>(`/v1/data-sources/${id}`, { method: 'DELETE' }),

  // ==================== Patterns ====================
  getPatterns: () => request<Pattern[]>('/v1/patterns'),
  createPattern: (data: PatternCreate) =>
    request<Pattern>('/v1/patterns', { method: 'POST', body: JSON.stringify(data) }),
  deletePattern: (id: string) =>
    request<void>(`/v1/patterns/${id}`, { method: 'DELETE' }),

  // ==================== Settings ====================
  getSettings: () => request<SettingsResponse>('/v1/settings'),
  updateSettings: (preferences: Record<string, unknown>) =>
    request<SettingsResponse>('/v1/settings', { method: 'PATCH', body: JSON.stringify({ preferences }) }),
  resetSettings: () => request<SettingsResponse>('/v1/settings/reset', { method: 'POST' }),

  // ==================== Archive & Async Jobs ====================
  submitArchive: (file: File, conversation_id?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversation_id) formData.append('conversation_id', conversation_id);
    return request<ArchiveSubmitResponse>('/v1/archive/submit', { method: 'POST', body: formData });
  },
  getArchive: (id: string) => request<ArchiveManifest>(`/v1/archive/${id}`),
  getArchiveResult: (id: string) => request<any>(`/v1/archive/${id}/result`),
  getArchives: () => request<ArchiveManifest[]>('/v1/archive'),

  // ==================== Conversaciones ====================
  getConversations: () => request<Conversation[]>('/v1/conversations'),
  createConversation: (title?: string) =>
    request<Conversation>('/v1/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
  getConversation: (id: string) => request<Conversation>(`/v1/conversations/${id}`),
  sendMessage: (convId: string, content: string, role = 'user') =>
    request<ChatMessage>(`/v1/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    }),

  // ==================== Fase 1 Compat ====================
  uploadAndAnalyze: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<AnalysisRecord>('/v1/analysis', { method: 'POST', body: formData });
  },
  getAnalyses: () => request<AnalysisRecord[]>('/v1/analysis'),
  getAnalysis: (id: string) => request<AnalysisRecord>(`/v1/analysis/${id}`),
};
