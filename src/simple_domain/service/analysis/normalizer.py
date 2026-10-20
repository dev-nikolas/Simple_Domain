"""
Simple Domain — Ingesta y Normalización de Datos
Convierte archivos CSV y JSON en NormalizedDataset inmutable para Brain.
"""

from __future__ import annotations
import csv
import io
import json
import math
from typing import Any, Dict, List, Optional
from simple_domain.brain.models import NormalizedDataset, NormalizedSeries

MAX_ALLOWED_ROWS = 50_000
MAX_ALLOWED_COLS = 200


def parse_numeric_value(val: Any) -> Optional[float]:
    """Convierte de forma segura un valor a float excluyendo booleanos, nan e inf."""
    if val is None or isinstance(val, bool):
        return None
    if isinstance(val, (int, float)):
        f = float(val)
        return None if math.isnan(f) or math.isinf(f) else f
    if isinstance(val, str) and val.strip():
        try:
            f = float(val.strip())
            return None if math.isnan(f) or math.isinf(f) else f
        except ValueError:
            return None
    return None


def _build_series_from_columns(
    name: str, fmt: str, cols: List[str], rows: List[Dict[str, Any]], warns: List[str]
) -> NormalizedDataset:
    if len(rows) > MAX_ALLOWED_ROWS:
        raise ValueError(f"El dataset excede el límite permitido de {MAX_ALLOWED_ROWS} filas.")
    if len(cols) > MAX_ALLOWED_COLS:
        raise ValueError(f"El dataset excede el límite permitido de {MAX_ALLOWED_COLS} columnas.")

    col_types: Dict[str, str] = {}
    num_series: List[NormalizedSeries] = []

    for c in cols:
        raw_vals = [r.get(c) for r in rows]
        valid_nums, excluded_count, has_nulls = [], 0, False
        for v in raw_vals:
            if v is None or (isinstance(v, str) and not v.strip()):
                has_nulls, excluded_count = True, excluded_count + 1
            else:
                p = parse_numeric_value(v)
                if p is not None:
                    valid_nums.append(p)
                else:
                    excluded_count += 1

        total = len(raw_vals)
        if len(valid_nums) > 0 and len(valid_nums) >= (total * 0.5):
            col_types[c] = "numeric"
            s_warns = [f"{excluded_count} celdas en '{c}' no fueron numéricas."] if excluded_count > 0 else []
            num_series.append(
                NormalizedSeries(
                    name=c,
                    values=valid_nums,
                    raw_count=total,
                    excluded_count=excluded_count,
                    has_nulls=has_nulls,
                    warnings=s_warns,
                )
            )
        elif total == excluded_count and has_nulls:
            col_types[c] = "empty"
        else:
            col_types[c] = "categorical"

    return NormalizedDataset(
        dataset_name=name,
        format_type=fmt,
        row_count=len(rows),
        column_names=cols,
        column_types=col_types,
        numeric_series=num_series,
        warnings=warns,
    )


def normalize_csv(content: str, filename: str) -> NormalizedDataset:
    """Normaliza un archivo CSV con encabezados."""
    reader = csv.reader(io.StringIO(content))
    try:
        header_row = next(reader, None)
    except Exception as e:
        raise ValueError(f"Error al decodificar formato CSV: {str(e)}")

    if not header_row:
        raise ValueError("El archivo CSV está vacío o no contiene encabezados.")

    headers = [h.strip() or f"col_{i+1}" for i, h in enumerate(header_row)]
    rows, warnings = [], []

    for line_num, r in enumerate(reader, start=2):
        if not r or all(not cell.strip() for cell in r):
            continue
        if len(r) != len(headers):
            warnings.append(f"Fila {line_num} tiene {len(r)} valores (esperados {len(headers)}).")
        rows.append({headers[i]: r[i] if i < len(r) else None for i in range(len(headers))})

    if not rows:
        raise ValueError("El archivo CSV no contiene filas de datos.")

    return _build_series_from_columns(filename, "csv", headers, rows, warnings)


def normalize_json(content: str, filename: str) -> NormalizedDataset:
    """Normaliza datos JSON admitiendo arrays tabulares, secuencias numéricas u objetos envueltos."""
    try:
        parsed = json.loads(content)
    except Exception as e:
        raise ValueError(f"Contenido JSON malformado: {str(e)}")

    if isinstance(parsed, list) and len(parsed) == 0:
        raise ValueError("El archivo JSON contiene un array vacío.")

    # Caso A: Array directo de números
    if isinstance(parsed, list) and len(parsed) > 0 and all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in parsed):
        clean_nums = [float(x) for x in parsed if not math.isnan(float(x)) and not math.isinf(float(x))]
        series = NormalizedSeries(
            name="sequence",
            values=clean_nums,
            raw_count=len(parsed),
            excluded_count=len(parsed) - len(clean_nums),
            has_nulls=False,
        )
        return NormalizedDataset(
            dataset_name=filename,
            format_type="json",
            row_count=len(parsed),
            column_names=["sequence"],
            column_types={"sequence": "numeric"},
            numeric_series=[series],
        )

    # Caso B: Objeto contenedor
    if isinstance(parsed, dict):
        for key in ("data", "records", "items", "series"):
            if key in parsed and isinstance(parsed[key], list):
                parsed = parsed[key]
                break

    # Caso C: Array de objetos (tabular)
    if isinstance(parsed, list):
        if not parsed:
            raise ValueError("El array JSON está vacío.")
        if not all(isinstance(item, dict) for item in parsed):
            raise ValueError("Las filas JSON deben ser objetos clave-valor tabulares o una lista de números.")

        col_set: List[str] = []
        for row in parsed:
            for k in row.keys():
                if k not in col_set:
                    col_set.append(k)

        return _build_series_from_columns(filename, "json", col_set, parsed, [])

    raise ValueError("Estructura JSON no admitida. Se espera array de objetos o lista de números.")
