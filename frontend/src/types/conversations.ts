/**
 * Simple Domain — Tipos para Espacio Conversacional y Archive
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  archive_id?: string;
  job_id?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  archive_ids: string[];
}

export interface ArchiveSubmitResponse {
  archive_id: string;
  job_id: string;
  conversation_id: string;
  status: string;
  events_url: string;
  status_url: string;
  result_url: string;
}

export interface ArchiveManifest {
  archive_id: string;
  job_id: string;
  filename: string;
  format: string;
  size_bytes: number;
  status: string;
  conversation_id?: string;
  created_at: string;
  updated_at: string;
  error?: string;
  summary?: Record<string, unknown>;
  warnings: string[];
}

export interface ArchiveEvent {
  id: string;
  archive_id: string;
  job_id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}
