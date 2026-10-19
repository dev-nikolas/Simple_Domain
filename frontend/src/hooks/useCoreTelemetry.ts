/**
 * Simple Domain — Hook useCoreTelemetry
 * Gestiona el ciclo de vida de la telemetría en vivo con sondeo moderado.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS } from '../config/env';
import { ApiError, fetchHealth, fetchInfo } from '../services/simpleDomainApi';
import { ConnectionStatus, TelemetryState } from '../types/api';

const INITIAL_STATE: TelemetryState = {
  connectionStatus: 'CONNECTING',
  health: null,
  info: null,
  lastUpdated: null,
  healthError: null,
  infoError: null,
  isStale: false,
  isLoading: true,
};

export function useCoreTelemetry(): TelemetryState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<TelemetryState>(INITIAL_STATE);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const stateRef = useRef<TelemetryState>(state);
  stateRef.current = state;

  const performPoll = useCallback(async () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    setState((prev) => ({ ...prev, isLoading: true }));

    const [healthRes, infoRes] = await Promise.allSettled([
      fetchHealth(ctrl.signal),
      fetchInfo(ctrl.signal),
    ]);

    if (ctrl.signal.aborted) return;

    const prev = stateRef.current;
    let nextHealth = prev.health;
    let nextInfo = prev.info;
    let healthErr: string | null = null;
    let infoErr: string | null = null;

    if (healthRes.status === 'fulfilled') {
      nextHealth = healthRes.value;
    } else {
      healthErr = healthRes.reason instanceof Error ? healthRes.reason.message : 'Error en /health';
    }

    if (infoRes.status === 'fulfilled') {
      nextInfo = infoRes.value;
    } else {
      infoErr = infoRes.reason instanceof Error ? infoRes.reason.message : 'Error en /v1/info';
    }

    let status: ConnectionStatus = 'ONLINE';
    if (healthRes.status === 'rejected' && infoRes.status === 'rejected') {
      const isUnreachable =
        (healthRes.reason instanceof ApiError && !healthRes.reason.statusCode) ||
        (infoRes.reason instanceof ApiError && !infoRes.reason.statusCode);
      status = isUnreachable ? 'OFFLINE' : 'ERROR';
    } else if (healthRes.status === 'rejected' || infoRes.status === 'rejected') {
      status = 'ERROR';
    }

    const hadPriorData = Boolean(prev.health || prev.info);
    const pollFailed = Boolean(healthErr || infoErr);

    setState({
      connectionStatus: status,
      health: nextHealth,
      info: nextInfo,
      lastUpdated: pollFailed && hadPriorData ? prev.lastUpdated : new Date(),
      healthError: healthErr,
      infoError: infoErr,
      isStale: pollFailed && hadPriorData,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    performPoll();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        performPoll();
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performPoll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
    };
  }, [performPoll]);

  return { ...state, refresh: performPoll };
}
