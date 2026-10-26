/**
 * Simple Domain — Tipos TypeScript para los módulos v1.0
 * Investigación, Fuentes de Datos, Patrones, Configuración y Brain Analysis.
 */

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'archived';

export interface Experiment {
  id: string;
  title: string;
  description?: string | null;
  hypothesis?: string | null;
  status: ExperimentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface ExperimentCreate {
  title: string;
  description?: string;
  hypothesis?: string;
  status?: ExperimentStatus;
  notes?: string;
}

export type DataSourceFormat = 'csv' | 'json' | 'jsonl' | 'xlsx' | 'sandbox_run' | string;
export type DataSourceStatus = 'registered' | 'available' | 'unavailable' | 'error';

export interface DataSource {
  id: string;
  name: string;
  format: DataSourceFormat;
  description?: string | null;
  location?: string | null;
  status: DataSourceStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface DataSourceCreate {
  name: string;
  format: DataSourceFormat;
  description?: string;
  location?: string;
}

export type PatternType =
  | 'relational_bivariate'
  | 'univariate_frequency'
  | 'cluster'
  | 'sequence'
  | 'custom';

export type PatternStatus = 'registered' | 'active' | 'archived';
export type PatternOrigin = 'manual' | 'engine';

export interface Pattern {
  id: string;
  name: string;
  description?: string | null;
  pattern_type: PatternType;
  source_id?: string | null;
  status: PatternStatus;
  origin: PatternOrigin;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface PatternCreate {
  name: string;
  description?: string;
  pattern_type: PatternType;
  source_id?: string;
  status?: PatternStatus;
  origin?: PatternOrigin;
}

export interface SystemPreferences {
  system_name: string;
  enable_relational_default: boolean;
  default_quantile: number;
  telemetry_poll_interval_ms: number;
  auto_refresh_ui: boolean;
  audit_strict_mode: boolean;
  theme_contrast: 'normal' | 'high';
  active_mode?: 'chat' | 'sandbox';
  [key: string]: unknown;
}

export interface SettingsResponse {
  version: string;
  updated_at: string;
  preferences: SystemPreferences;
}

// ==================== Brain Analysis ====================
export interface SeriesStatistics {
  count: number;
  min_value: number | null;
  max_value: number | null;
  mean: number | null;
  std_dev: number | null;
  consecutive_diffs: number[];
}

export interface PatternMatch {
  series_name: string;
  pattern_type: 'constant' | 'arithmetic_progression' | 'irregular_variation' | 'insufficient_data';
  description: string;
  parameters: Record<string, unknown>;
  evidence: Record<string, unknown>;
  statistics: SeriesStatistics;
  warnings: string[];
}

export interface BrainAnalysisResult {
  engine_version: string;
  analysis_type: string;
  dataset_name: string;
  total_series_analyzed: number;
  patterns: PatternMatch[];
  summary: {
    dataset_name: string;
    format_type: string;
    total_rows: number;
    total_columns: number;
    numeric_series_count: number;
    pattern_distribution: Record<string, number>;
    has_warnings: boolean;
  };
  global_warnings: string[];
}

export interface AnalysisRecord {
  id: string;
  filename: string;
  format: 'csv' | 'json';
  status: 'completed' | 'failed';
  created_at: string;
  summary: Record<string, unknown>;
  result: BrainAnalysisResult;
  warnings: string[];
}
