/**
 * Simple Domain — Tipos del Laboratorio Sandbox Curricular RELIC
 */

export interface TraceStage {
  stage: string;
  latency_ms: number;
  output: string;
}

export interface SandboxEpisode {
  episode: number;
  prompt: string;
  status: string;
  is_em: boolean;
  reward: number;
  trace: TraceStage[];
  gold: string;
  text: string;
}

export interface SandboxMetrics {
  exact_match_count: number;
  exact_match_rate: number;
  wilson_95: [number, number];
  false_acceptance_count: number;
  false_acceptance_rate: number;
  correct_abstention_count: number;
  unnecessary_abstention_count: number;
  mean_reward: number;
}

export interface SandboxRun {
  id: string;
  level: string;
  seed: number;
  system: string;
  penalty_lambda: number;
  commit: string;
  dataset_hash: string;
  weights_hash: string;
  total_episodes: number;
  status: string;
  created_at: string;
  completed_at?: string | null;
  metrics: SandboxMetrics;
  episodes: SandboxEpisode[];
}

export interface SandboxRunCreate {
  level: string;
  seed: number;
  system: string;
  penalty_lambda: number;
  max_episodes: number;
}
