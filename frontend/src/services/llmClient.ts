// src/services/llmClient.ts

import { API_BASE_URL } from '../config/env';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
}

export interface ChatOptions {
  messages: Message[];
  onUpdate: (token: string) => void;
  signal?: AbortSignal;
}

export async function streamChatCompletion({ messages, onUpdate, signal }: ChatOptions): Promise<void> {
  const url = `${API_BASE_URL}/v1/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      stream: true,
      temperature: 0.1, // Baja temperatura para código determinista
      max_tokens: -1    // Ilimitado hasta encontrar [DONE] o token de parada
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("El cuerpo de la respuesta es nulo");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decodificar el chunk de bytes a texto
      buffer += decoder.decode(value, { stream: true });
      
      // Separar por saltos de línea (Server-Sent Events)
      const lines = buffer.split('\n');
      
      // El último elemento podría ser un JSON incompleto (paquete TCP truncado)
      // Lo guardamos en el buffer para la siguiente iteración
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const dataPayload = line.slice(6).trim();
          
          if (dataPayload === '[DONE]') return; // Fin del stream

          try {
            const parsed = JSON.parse(dataPayload);
            const contentDelta = parsed.choices?.[0]?.delta?.content;
            if (contentDelta) {
              onUpdate(contentDelta);
            }
          } catch (e) {
            console.warn("Fragmento JSON incompleto/malformado, saltando:", dataPayload);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

