"""
Simple Domain — Repositorio de Preferencias y Configuración
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from simple_domain.storage.json_store import JsonStore

DEFAULT_SETTINGS: Dict[str, Any] = {
  "system_name": "Simple Domain",
  "enable_relational_default": True,
  "default_quantile": 0.95,
  "telemetry_poll_interval_ms": 5000,
  "auto_refresh_ui": True,
  "audit_strict_mode": False,
  "theme_contrast": "high",
  "active_mode": "chat",
}


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SettingsRepository:
    """Repositorio para gestionar preferencias editables del sistema."""

    def __init__(self, store: JsonStore | str | Path):
        def _factory():
            return {
                "version": "1.0",
                "updated_at": _utcnow_iso(),
                "preferences": dict(DEFAULT_SETTINGS),
            }

        if isinstance(store, (str, Path)):
            self.store = JsonStore(store, default_factory=_factory)
        else:
            self.store = store

    def get_all(self) -> Dict[str, Any]:
        data = self.store.read()
        if not isinstance(data, dict) or "preferences" not in data:
            data = {
                "version": "1.0",
                "updated_at": _utcnow_iso(),
                "preferences": dict(DEFAULT_SETTINGS),
            }
            self.store.write(data)
        return data

    def get_preferences(self) -> Dict[str, Any]:
        return dict(self.get_all().get("preferences", DEFAULT_SETTINGS))

    def update_preferences(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        data = self.get_all()
        prefs = dict(data.get("preferences", DEFAULT_SETTINGS))

        allowed_keys = set(DEFAULT_SETTINGS.keys())
        unknown = set(updates.keys()) - allowed_keys
        if unknown:
            raise ValueError(f"Claves de configuración no permitidas o desconocidas: {sorted(unknown)}")

        for k, v in updates.items():
            if k == "default_quantile":
                try:
                    q = float(v)
                    if not (0.50 <= q <= 0.999):
                        raise ValueError
                    prefs[k] = q
                except (ValueError, TypeError):
                    raise ValueError("El parámetro 'default_quantile' debe ser un número entre 0.50 y 0.999.")
            elif k == "telemetry_poll_interval_ms":
                try:
                    ms = int(v)
                    if not (1000 <= ms <= 60000):
                        raise ValueError
                    prefs[k] = ms
                except (ValueError, TypeError):
                    raise ValueError("El intervalo debe ser un entero entre 1000 y 60000 ms.")
            elif k in ("enable_relational_default", "auto_refresh_ui", "audit_strict_mode"):
                if not isinstance(v, bool):
                    raise ValueError(f"El campo '{k}' debe ser un valor booleano (True/False).")
                prefs[k] = v
            elif k == "system_name":
                s = str(v).strip()
                if not s or len(s) > 60:
                    raise ValueError("El nombre del sistema no puede estar vacío ni exceder 60 caracteres.")
                prefs[k] = s
            elif k == "theme_contrast":
                if v not in ("normal", "high"):
                    raise ValueError("theme_contrast debe ser 'normal' o 'high'.")
                prefs[k] = v
            elif k == "active_mode":
                if v not in ("chat", "sandbox"):
                    raise ValueError("active_mode debe ser 'chat' o 'sandbox'.")
                prefs[k] = v

        data["preferences"] = prefs
        data["updated_at"] = _utcnow_iso()
        self.store.write(data)
        return prefs

    def reset_to_defaults(self) -> Dict[str, Any]:
        data = {
            "version": "1.0",
            "updated_at": _utcnow_iso(),
            "preferences": dict(DEFAULT_SETTINGS),
        }
        self.store.write(data)
        return dict(DEFAULT_SETTINGS)
