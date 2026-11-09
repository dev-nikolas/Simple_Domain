/**
 * Simple Domain — Facade de Cliente RELIC
 * Principio de Segregación de Interfaces y Fachada (GoF).
 */

export * from '../types/relic';
export { streamChatCompletion } from './relicStreamService';
export {
  getEpisodicMemories,
  recordEpisodicMemory,
  deleteEpisodicMemory,
  getRelicStatus,
} from './relicMemoryService';
