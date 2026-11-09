/**
 * Simple Domain — Tipos de Dominio RELIC Engine
 * Interfaces segregadas para inferencia, cartuchos y memoria episódica.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
}

export interface ChatOptions {
  messages: Message[];
  sessionId?: string;
  cartridge?: string;
  securityLevel?: number;
  onUpdate: (token: string) => void;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export interface EpisodicMemoryRule {
  id: string;
  topic: string;
  conclusion: string;
  timestamp: string;
  verified?: boolean;
  source?: string;
}

export interface CartridgeInfo {
  id: string;
  name: string;
  domain: string;
  loraActive: boolean;
  kbDocs: number;
  description: string;
}

export interface RelicEngineStatus {
  status: string;
  mcp: boolean;
  toolsCount: number;
  sessionsCount: number;
  memoriesCount: number;
  cartridge?: string;
}

