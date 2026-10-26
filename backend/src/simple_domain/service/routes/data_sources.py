"""
Simple Domain — Rutas del Módulo de Fuentes de Datos (/v1/data-sources)
Resolución 100% dinámica de archivos locales y sandbox (cero hardcoding). Menos de 180 líneas.
"""

from __future__ import annotations
import csv, json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status

from simple_domain.repositories.data_sources import DataSourceRepository
from simple_domain.service.modular_schemas import DataSourceCreate, DataSourceResponse, DataSourceUpdate

router = APIRouter(prefix="/v1/data-sources", tags=["Data Sources"])


def _get_repo(request: Request) -> DataSourceRepository:
    repo = getattr(request.app.state, "data_source_repo", None) or getattr(request.app.state, "data_sources_repo", None)
    if not repo: raise HTTPException(status_code=503, detail="Repositorio de fuentes de datos no inicializado.")
    return repo


def _resolve_physical_file(loc: str, sid: str) -> Optional[Path]:
    csid = sid.replace("ds_relic_", "").replace("ds_", "")
    cloc = loc.replace("internal://", "").replace("canonical://", "").strip()
    cands = [cloc, sid, csid, f"{cloc}.jsonl", f"{cloc}.csv", f"{cloc}.json", f"{sid}.jsonl", f"{sid}.csv", f"{csid}.json"]
    if "curriculum" in sid.lower() or "curriculum" in loc.lower():
        cands.extend(["curriculum_dataset_v2_20k.jsonl", "curriculum_dataset_v1.jsonl"])
    base_dirs = [
        Path.cwd(), Path(__file__).resolve().parents[5], Path(__file__).resolve().parents[5] / "backend" / "storage",
        Path(__file__).resolve().parents[5] / "storage", Path(__file__).resolve().parents[6] / "RELIC" / "data",
        Path(__file__).resolve().parents[6] / "RELIC" / "data" / "benchmarks", Path(__file__).resolve().parents[6] / "RELIC",
    ]
    for c in cands:
        if not c: continue
        p = Path(c)
        if p.is_absolute() and p.is_file(): return p
        for b in base_dirs:
            cand = b / c
            if cand.is_file(): return cand
    return None


def _load_sandbox_episodes(sid: str) -> Optional[Dict[str, Any]]:
    for b in [Path(__file__).resolve().parents[5] / "backend" / "storage", Path(__file__).resolve().parents[5] / "storage"]:
        p = b / "sandbox_runs.json"
        if p.is_file():
            try:
                runs = json.loads(p.read_text(encoding="utf-8"))
                run = next((r for r in runs if r.get("id") == sid or sid.startswith(r.get("id", "___"))), None)
                if run:
                    eps = run.get("episodes", [])
                    return {
                        "id": sid, "name": f"Sandbox Run: {sid}", "format": "sandbox_run", "location": str(p),
                        "total_rows": len(eps), "columns": ["episode", "prompt", "status", "is_em", "reward"],
                        "rows": eps, "raw_text": json.dumps(run, indent=2, ensure_ascii=False)[:3000],
                        "metadata": {"metrics": run.get("metrics", {}), "level": run.get("level")},
                    }
            except Exception: pass
    return None


def _load_local_content(record: Dict[str, Any]) -> Dict[str, Any]:
    sid, loc = record.get("id", ""), record.get("location", "")
    fmt = (record.get("format") or "").lower()

    if sid.startswith("sb_") or "sandbox://" in loc:
        res = _load_sandbox_episodes(sid)
        if res: return res

    if sid in ("ds_benchmark_s1", "benchmark_s1") or loc.startswith("canonical://benchmark"):
        from simple_domain.experiments.benchmark_s1 import BenchmarkS1Generator
        ds = BenchmarkS1Generator(seed=42).generate(n_fit=20, n_calibration=10, n_evaluation=30)
        cols = ["obs_id", "scenario", "is_anomaly"] + BenchmarkS1Generator.FEATURE_NAMES_CATEGORICAL + BenchmarkS1Generator.FEATURE_NAMES_NUMERIC
        rows = [{"obs_id": s.obs_id, "scenario": s.scenario, "is_anomaly": s.is_anomaly, **s.features} for s in (ds.fit_set + ds.evaluation_set)[:50]]
        return {
            "id": sid, "name": record.get("name"), "format": "csv", "location": "canonical://benchmark/s1",
            "total_rows": len(rows), "columns": cols, "rows": rows,
            "raw_text": json.dumps(rows[:10], indent=2, ensure_ascii=False), "metadata": record.get("metadata", {}),
        }

    file_path = _resolve_physical_file(loc, sid)
    if file_path:
        ext = file_path.suffix.lower()
        if ext == ".jsonl":
            rows, raw_lines = [], []
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    if line.strip():
                        rows.append(json.loads(line))
                        if len(raw_lines) < 8: raw_lines.append(line.strip())
                        if len(rows) >= 50: break
            return {
                "id": sid, "name": record.get("name"), "format": "jsonl", "location": str(file_path),
                "total_rows": len(rows), "columns": list(rows[0].keys()) if rows else ["data"], "rows": rows,
                "raw_text": "\n".join(raw_lines), "metadata": {**record.get("metadata", {}), "file_bytes": file_path.stat().st_size},
            }
        if ext in (".csv", ".tsv"):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f, delimiter="\t" if ext == ".tsv" else ",")
                cols, rows = list(reader.fieldnames or []), [r for _, r in zip(range(50), reader)]
                f.seek(0)
                raw_head = "".join([f.readline() for _ in range(12)])
            return {
                "id": sid, "name": record.get("name"), "format": ext.lstrip("."), "location": str(file_path),
                "total_rows": len(rows), "columns": cols, "rows": rows, "raw_text": raw_head,
                "metadata": {**record.get("metadata", {}), "file_bytes": file_path.stat().st_size},
            }
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(10000)
            try:
                parsed = json.loads(content)
                rows = parsed if isinstance(parsed, list) else (parsed.get("records") or parsed.get("cases") or [parsed])
                cols = list(rows[0].keys()) if rows and isinstance(rows[0], dict) else ["data"]
            except Exception:
                rows, cols = [{"raw": content[:200]}], ["raw"]
        return {
            "id": sid, "name": record.get("name"), "format": ext.lstrip(".") or fmt, "location": str(file_path),
            "total_rows": len(rows), "columns": cols, "rows": rows[:50], "raw_text": content[:2000],
            "metadata": {**record.get("metadata", {}), "file_bytes": file_path.stat().st_size},
        }

    return {
        "id": sid, "name": record.get("name"), "format": fmt or "custom", "location": loc or "local",
        "total_rows": 1, "columns": list(record.get("metadata", {}).keys()) or ["id", "status"],
        "rows": [{"id": sid, "status": record.get("status", "available"), **record.get("metadata", {})}],
        "raw_text": json.dumps(record, indent=2, ensure_ascii=False), "metadata": record.get("metadata", {}),
    }


def _find_or_auto_discover(sid: str, repo: DataSourceRepository) -> Optional[Dict[str, Any]]:
    rec = repo.get_by_id(sid)
    if rec: return rec
    p = _resolve_physical_file("", sid)
    if p: return {"id": sid, "name": p.stem.replace("_", " ").title(), "format": p.suffix.lstrip("."), "location": str(p), "status": "available", "metadata": {}}
    if sid.startswith("sb_"): return {"id": sid, "name": f"Corrida Sandbox {sid}", "format": "sandbox_run", "location": f"sandbox://{sid}", "status": "available", "metadata": {}}
    return None


@router.get("", response_model=List[DataSourceResponse], summary="Listar fuentes de datos")
def list_data_sources(request: Request, format_filter: Optional[str] = Query(None, alias="format")):
    repo = _get_repo(request)
    return [DataSourceResponse(**x) for x in repo.list_all(format_filter=format_filter)]


@router.post("", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED, summary="Registrar fuente")
def create_data_source(payload: DataSourceCreate, request: Request):
    try: return DataSourceResponse(**_get_repo(request).create(payload.model_dump(exclude_unset=True)))
    except ValueError as e: raise HTTPException(status_code=400, detail=str(e))


@router.get("/{source_id}", response_model=DataSourceResponse, summary="Consultar fuente de datos")
def get_data_source(source_id: str, request: Request):
    rec = _find_or_auto_discover(source_id, _get_repo(request))
    if not rec: raise HTTPException(status_code=404, detail=f"Fuente '{source_id}' no encontrada.")
    return DataSourceResponse(**rec)


@router.get("/{source_id}/content", summary="Leer contenido físico y estructura local del dataset")
def get_data_source_content(source_id: str, request: Request):
    rec = _find_or_auto_discover(source_id, _get_repo(request))
    if not rec: raise HTTPException(status_code=404, detail=f"Fuente '{source_id}' no encontrada.")
    return _load_local_content(rec)


@router.patch("/{source_id}", response_model=DataSourceResponse, summary="Actualizar fuente")
def update_data_source(source_id: str, payload: DataSourceUpdate, request: Request):
    repo = _get_repo(request)
    updates = payload.model_dump(exclude_unset=True)
    if not updates: raise HTTPException(status_code=400, detail="Debe proporcionar campos para actualizar.")
    updated = repo.update(source_id, updates)
    if not updated: raise HTTPException(status_code=404, detail=f"Fuente '{source_id}' no encontrada.")
    return DataSourceResponse(**updated)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar fuente")
def delete_data_source(source_id: str, request: Request):
    if not _get_repo(request).delete(source_id): raise HTTPException(status_code=404, detail=f"Fuente '{source_id}' no encontrada.")
    return None
