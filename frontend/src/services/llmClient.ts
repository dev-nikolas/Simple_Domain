// src/services/llmClient.ts

import { API_BASE_URL } from '../config/env';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
}

export interface ChatOptions {
  messages: Message[];
  sessionId?: string;
  onUpdate: (token: string) => void;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export async function streamChatCompletion({
  messages,
  sessionId,
  onUpdate,
  signal,
  maxTokens = 2048,
  temperature = 0.1,
}: ChatOptions): Promise<void> {
  const url = `${API_BASE_URL}/v1/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      session_id: sessionId,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }),
    signal,
  });

  if (!response.ok) {
    let errorDetail = `${response.status} - ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorDetail = errJson.error;
    } catch {
      // Ignorar fallback
    }
    throw new Error(`Error en API Gateway: ${errorDetail}`);
  }

  if (!response.body) {
    throw new Error('El cuerpo de la respuesta HTTP es nulo.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decodificar bytes recibidos
      buffer += decoder.decode(value, { stream: true });

      // Dividir por líneas según la especificación SSE
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const dataPayload = trimmed.slice(6).trim();

          if (dataPayload === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            const contentDelta = parsed.choices?.[0]?.delta?.content;
            if (contentDelta) {
              onUpdate(contentDelta);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
            // Ignorar paquetes JSON incompletos en tránsito
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
