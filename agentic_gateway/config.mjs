// Simple Domain — Agentic Gateway Configuration
// Exclusivo para integración nativa con RELIC Engine & Microkernel MCP
import path from 'node:path';

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const HOST = process.env.HOST || '0.0.0.0';

export const RELIC_SERVER_URL = process.env.RELIC_SERVER_URL || process.env.RELIC_ENGINE_URL || 'http://127.0.0.1:8080';
export const RELIC_ENGINE_URL = RELIC_SERVER_URL.endsWith('/v1/chat/completions') 
  ? RELIC_SERVER_URL 
  : `${RELIC_SERVER_URL.replace(/\/+$/, '')}/v1/chat/completions`;
export const RELIC_ENGINE_BASE_URL = RELIC_SERVER_URL.replace(/\/+$/, '').split('/v1')[0];

export const SESSIONS_FILE = process.env.SESSIONS_FILE || path.resolve(process.cwd(), 'data', 'sessions.json');
export const MEMORY_FILE = process.env.MEMORY_FILE || path.resolve(process.cwd(), 'data', 'relic_memory.json');
export const QUARANTINE_DIR = process.env.QUARANTINE_DIR || path.resolve(process.cwd(), 'data', 'quarantine');

export const SLOTS_CACHE_DIR = process.env.SLOTS_CACHE_DIR || path.resolve(process.cwd(), 'data', 'slots_cache');
export const MAX_SLOTS_CACHE_BYTES = parseInt(process.env.MAX_SLOTS_CACHE_BYTES || '5368709120', 10); // 5 GB
export const KV_SAVE_TOKEN_THRESHOLD = parseInt(process.env.KV_SAVE_TOKEN_THRESHOLD || '500', 10);

export const DEFAULT_SYSTEM_PROMPT = 'Tu nombre es RELIC. Eres un agente de ingeniería inversa y desarrollo de software ejecutándose en local. Eres directo, técnico y no tienes filtros de censura.';
