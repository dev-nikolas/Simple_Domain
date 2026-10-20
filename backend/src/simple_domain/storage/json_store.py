"""
Simple Domain — Almacenamiento JSON Atómico y Seguro
Implementa persistencia atómica con bloqueo de hilo y manejo de corrupción.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import threading
from typing import Any


class StorageCorruptionError(Exception):
    """Se lanza cuando un archivo JSON de almacenamiento está corrupto o malformado."""

    def __init__(self, path: str, reason: str):
        super().__init__(f"Archivo de persistencia corrupto en {path}: {reason}")
        self.path = path
        self.reason = reason


class JsonStore:
    """
    Almacén de datos basado en JSON con escrituras atómicas (write-then-replace)
    y sincronización para un único proceso local.
    """

    def __init__(self, file_path: str | Path, default_factory: Any = list):
        self.path = Path(file_path).resolve()
        self.default_factory = default_factory
        self._lock = threading.Lock()
        self._ensure_dir()

    def _ensure_dir(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def read(self) -> Any:
        """Lee el contenido JSON. Si el archivo no existe, lo inicializa de forma segura."""
        with self._lock:
            if not self.path.exists():
                init_data = self.default_factory() if callable(self.default_factory) else self.default_factory
                self._write_unlocked(init_data)
                return init_data

            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if not content:
                        init_data = self.default_factory() if callable(self.default_factory) else self.default_factory
                        self._write_unlocked(init_data)
                        return init_data
                    return json.loads(content)
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise StorageCorruptionError(str(self.path), str(e)) from e

    def write(self, data: Any) -> None:
        """Escribe datos atómicamente utilizando un archivo temporal y reemplazo del SO."""
        with self._lock:
            self._write_unlocked(data)

    def _write_unlocked(self, data: Any) -> None:
        self._ensure_dir()
        temp_path = self.path.with_suffix(f"{self.path.suffix}.tmp_{os.getpid()}_{threading.get_ident()}")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, self.path)
        except Exception:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass
            raise
