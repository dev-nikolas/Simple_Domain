/**
 * Simple Domain — Servicio de Memoria Episódica RELIC (episodic_log.relic)
 * Responsabilidad Única (SRP): Operaciones CRUD sobre la memoria persistente del agente.
 */

import { API_BASE_URL } from '../config/env';
import { EpisodicMemoryRule, RelicEngineStatus } from '../types/relic';

export async function getEpisodicMemories(): Promise<EpisodicMemoryRule[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/relic/memory`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function recordEpisodicMemory(
  topic: string,
  conclusion: string
): Promise<EpisodicMemoryRule | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/relic/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, conclusion }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteEpisodicMemory(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/relic/memory/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getRelicStatus(): Promise<RelicEngineStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

