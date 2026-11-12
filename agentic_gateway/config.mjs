// Simple Domain — Agentic Gateway Configuration
// Exclusivo para integración nativa con RELIC Engine & Microkernel MCP
import path from 'node:path';

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const HOST = process.env.HOST || '0.0.0.0';

export const RELIC_SERVER_URL = process.env.RELIC_SERVER_URL || process.env.RELIC_CORE_URL || process.env.RELIC_ENGINE_URL || 'http://127.0.0.1:8080';
export const RELIC_CORE_URL = process.env.RELIC_CORE_URL || (RELIC_SERVER_URL.endsWith('/v1/chat/completions')
  ? RELIC_SERVER_URL
  : `${RELIC_SERVER_URL.replace(/\/+$/, '')}/v1/chat/completions`);
export const RELIC_ENGINE_URL = RELIC_CORE_URL;
export const RELIC_ENGINE_BASE_URL = RELIC_SERVER_URL.replace(/\/+$/, '').split('/v1')[0];

export const CONVERSATIONAL_SERVER_URL = process.env.CONVERSATIONAL_SERVER_URL || process.env.CONVERSATIONAL_ENGINE_URL || 'http://127.0.0.1:8081';
export const CONVERSATIONAL_ENGINE_URL = CONVERSATIONAL_SERVER_URL.endsWith('/v1/chat/completions')
  ? CONVERSATIONAL_SERVER_URL
  : `${CONVERSATIONAL_SERVER_URL.replace(/\/+$/, '')}/v1/chat/completions`;
export const ENGINE_TIMEOUT_MS = parseInt(process.env.ENGINE_TIMEOUT_MS || '60000', 10);

export const SESSIONS_FILE = process.env.SESSIONS_FILE || path.resolve(process.cwd(), 'data', 'sessions.json');
export const MEMORY_FILE = process.env.MEMORY_FILE || path.resolve(process.cwd(), 'data', 'relic_memory.json');
export const QUARANTINE_DIR = process.env.QUARANTINE_DIR || path.resolve(process.cwd(), 'data', 'quarantine');

export const SLOTS_CACHE_DIR = process.env.SLOTS_CACHE_DIR || path.resolve(process.cwd(), 'data', 'slots_cache');
export const MAX_SLOTS_CACHE_BYTES = parseInt(process.env.MAX_SLOTS_CACHE_BYTES || '5368709120', 10); // 5 GB
export const KV_SAVE_TOKEN_THRESHOLD = parseInt(process.env.KV_SAVE_TOKEN_THRESHOLD || '500', 10);

export const DEFAULT_SYSTEM_PROMPT = process.env.DEFAULT_SYSTEM_PROMPT || '';

export const config = {
  PORT,
  HOST,
  RELIC_CORE_URL,
  RELIC_ENGINE_URL,
  RELIC_ENGINE_BASE_URL,
  CONVERSATIONAL_ENGINE_URL,
  CONVERSATIONAL_SERVER_URL,
  ENGINE_TIMEOUT_MS,
  SESSIONS_FILE,
  MEMORY_FILE,
  QUARANTINE_DIR,
  SLOTS_CACHE_DIR,
  MAX_SLOTS_CACHE_BYTES,
  KV_SAVE_TOKEN_THRESHOLD,
  DEFAULT_SYSTEM_PROMPT,
};
