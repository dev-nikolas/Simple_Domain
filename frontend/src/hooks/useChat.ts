// src/hooks/useChat.ts
import { useState, useRef, useCallback } from 'react';
import { streamChatCompletion, Message } from '../services/llmClient';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Eres un asistente de programación experto en Rust y TypeScript. Respondes de forma concisa.' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;

    // 1. Agregar mensaje del usuario a la UI
    const newUserMessage: Message = { role: 'user', content };
    
    // 2. Preparar el mensaje vacío del asistente que se irá llenando
    const assistantMessagePlaceholder: Message = { role: 'assistant', content: '' };
    
    setMessages(prev => [...prev, newUserMessage, assistantMessagePlaceholder]);
    setIsGenerating(true);

    abortControllerRef.current = new AbortController();

    let accumulatedResponse = '';

    try {
      await streamChatCompletion({
        // Pasamos el historial completo (incluyendo el nuevo del usuario, pero sin el placeholder vacío)
        messages: [...messages, newUserMessage],
        signal: abortControllerRef.current.signal,
        onUpdate: (token) => {
          accumulatedResponse += token;
          
          // Actualizamos SOLO el contenido del último mensaje (el del asistente)
          setMessages(currentMessages => {
            const newArray = [...currentMessages];
            newArray[newArray.length - 1] = { 
              ...newArray[newArray.length - 1], 
              content: accumulatedResponse 
            };
            return newArray;
          });
        }
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error en inferencia:", error);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [messages, isGenerating]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  return {
    messages: messages.filter(m => m.role !== 'system'), // Ocultamos el system prompt de la UI
    rawMessages: messages,
    isGenerating,
    sendMessage,
    stopGeneration
  };
}

