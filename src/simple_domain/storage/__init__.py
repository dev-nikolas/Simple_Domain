"""
Simple Domain — Capa de Almacenamiento Local
"""

from simple_domain.storage.json_store import JsonStore, StorageCorruptionError

__all__ = ["JsonStore", "StorageCorruptionError"]
