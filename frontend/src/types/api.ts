/**
 * Simple Domain — Tipos TypeScript para la API HTTP Local v0.1
 * Basados estrictamente en los esquemas Pydantic de backend.
 */

export interface HealthResponse {
  status: string;
  detector_ready: boolean;
  message: string;
}

export interface ModelConfiguration {
  enable_relational: boolean;
  relational_weight: number;
  n_bins: number;
  smoothing_alpha: number;
  threshold: number | null;
  calibrated_quantile: number | null;
  features_expected?: string[] | null;
}

export interface InfoResponse {
  service_version: string;
  package_version: string;
  schema_version: string;
  model_status: 'unloaded' | 'unfitted' | 'uncalibrated' | 'ready' | string;
  capabilities: string[];
  model_configuration?: ModelConfiguration | null;
}

export type ConnectionStatus = 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

export interface TelemetryState {
  connectionStatus: ConnectionStatus;
  health: HealthResponse | null;
  info: InfoResponse | null;
  lastUpdated: Date | null;
  healthError: string | null;
  infoError: string | null;
  isStale: boolean;
  isLoading: boolean;
}
