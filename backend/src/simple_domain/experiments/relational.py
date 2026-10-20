"""
Simple Domain — EXP-01: Componente de Compatibilidad Relacional

Este módulo implementa el evaluador de dependencias relacionales por pares (bivariadas)
para complementar el detector univariado de Baseline 0.

Tipos de relaciones evaluadas:
1. Categórica - Numérica: Modelado condicional de la distribución numérica condicionada a
   la categoría (media, desviación típica regularizada y surprisal gaussiano condicional).
2. Numérica - Numérica: Matriz de covarianza 2D regularizada y distancia de Mahalanobis
   bivariada por par de características numéricas.
3. Categórica - Categórica: Frecuencias empíricas conjuntas 2D con suavizado de Laplace.

Principios de robustez:
- Sin divisiones por cero: Varianzas acotadas con regularización epsilon/lambda.
- Manejo de categorías no vistas: Uso de la distribución marginal global con penalización finita.
- Valores fuera de rango / NaN: Tratados con valores de cota finita calculada.
- Desactivable: Si enable_relational=False o relational_weight=0.0, reproduce exactamente EXP-00.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple


class CategoricalNumericRelation:
    """Modela la compatibilidad condicional P(X_num | C_cat)."""

    def __init__(self, cat_name: str, num_name: str, min_std: float = 1e-4, eps: float = 1e-12):
        self.cat_name = cat_name
        self.num_name = num_name
        self.min_std = min_std
        self.eps = eps

        # Estadísticas condicionales por categoría: cat -> (mean, std, count)
        self.cond_stats: Dict[str, Tuple[float, float, int]] = {}
        # Estadísticas marginales globales de respaldo
        self.global_mean: float = 0.0
        self.global_std: float = 1.0
        self.global_count: int = 0

    def fit(self, records: Sequence[Dict[str, Any]]) -> None:
        cat_groups: Dict[str, List[float]] = {}
        all_vals: List[float] = []

        for r in records:
            cat_val = str(r.get(self.cat_name, "None"))
            num_val = r.get(self.num_name)
            if num_val is not None and not math.isnan(float(num_val)):
                v = float(num_val)
                cat_groups.setdefault(cat_val, []).append(v)
                all_vals.append(v)

        self.global_count = len(all_vals)
        if self.global_count > 0:
            self.global_mean = sum(all_vals) / self.global_count
            variance = sum((x - self.global_mean) ** 2 for x in all_vals) / max(1, self.global_count - 1)
            self.global_std = max(self.min_std, math.sqrt(variance))
        else:
            self.global_mean = 0.0
            self.global_std = 1.0

        self.cond_stats = {}
        for cat, vals in cat_groups.items():
            n = len(vals)
            m = sum(vals) / n
            var = sum((x - m) ** 2 for x in vals) / max(1, n - 1) if n > 1 else 0.0
            std = max(self.min_std, math.sqrt(var))
            self.cond_stats[cat] = (m, std, n)

    def score_rarity(self, cat_val: Any, num_val: Any) -> float:
        """Calcula el surprisal condicional gaussiano acotado: -log P(X | C)."""
        if num_val is None or math.isnan(float(num_val)):
            return 10.0  # Penalización finita para ausentes

        x = float(num_val)
        cat_str = str(cat_val) if cat_val is not None else "None"

        if cat_str in self.cond_stats and self.cond_stats[cat_str][2] >= 2:
            mean, std, _ = self.cond_stats[cat_str]
        else:
            # Categoría no vista o con muestra insuficiente: usar global con recargo
            mean, std = self.global_mean, self.global_std
            # Se añade penalización de 2.0 por categoría desconocida en la relación
            z = abs(x - mean) / std
            z_capped = min(z, 20.0)
            return 2.0 + 0.5 * (z_capped ** 2)

        z = abs(x - mean) / std
        # Acotamos z a 20 sigmas para evitar overflow exponencial
        z_capped = min(z, 20.0)
        # Surprisal gaussiano proporcional al error z normalizado
        return 0.5 * (z_capped ** 2)


class NumericPairRelation:
    """Modela la compatibilidad conjunta entre dos variables numéricas (X1, X2) mediante Mahalanobis 2D."""

    def __init__(self, num_name1: str, num_name2: str, regularization_lambda: float = 1e-3):
        self.num1 = num_name1
        self.num2 = num_name2
        self.reg_lambda = regularization_lambda

        self.mean1: float = 0.0
        self.mean2: float = 0.0
        # Matriz inversa de covarianza 2x2: [[inv_00, inv_01], [inv_10, inv_11]]
        self.inv_cov: Tuple[Tuple[float, float], Tuple[float, float]] = ((1.0, 0.0), (0.0, 1.0))
        self.count: int = 0

    def fit(self, records: Sequence[Dict[str, Any]]) -> None:
        pairs: List[Tuple[float, float]] = []
        for r in records:
            v1, v2 = r.get(self.num1), r.get(self.num2)
            if v1 is not None and v2 is not None and not math.isnan(float(v1)) and not math.isnan(float(v2)):
                pairs.append((float(v1), float(v2)))

        self.count = len(pairs)
        if self.count < 3:
            self.mean1, self.mean2 = 0.0, 0.0
            self.inv_cov = ((1.0, 0.0), (0.0, 1.0))
            return

        m1 = sum(p[0] for p in pairs) / self.count
        m2 = sum(p[1] for p in pairs) / self.count
        self.mean1, self.mean2 = m1, m2

        # Calcular covarianza muestral
        var1 = sum((p[0] - m1) ** 2 for p in pairs) / (self.count - 1)
        var2 = sum((p[1] - m2) ** 2 for p in pairs) / (self.count - 1)
        cov12 = sum((p[0] - m1) * (p[1] - m2) for p in pairs) / (self.count - 1)

        # Regularización de Tikhonov: Sigma + lambda * I
        c00 = var1 + self.reg_lambda
        c11 = var2 + self.reg_lambda
        c01 = cov12

        det = (c00 * c11) - (c01 * c01)
        if abs(det) < 1e-12:
            det = 1e-12

        # Inversa 2x2 analítica: (1/det) * [[c11, -c01], [-c01, c00]]
        inv00 = c11 / det
        inv11 = c00 / det
        inv01 = -c01 / det

        self.inv_cov = ((inv00, inv01), (inv01, inv11))

    def score_rarity(self, val1: Any, val2: Any) -> float:
        """Calcula la distancia de Mahalanobis al cuadrado 2D acotada."""
        if val1 is None or val2 is None or math.isnan(float(val1)) or math.isnan(float(val2)):
            return 10.0

        d1 = float(val1) - self.mean1
        d2 = float(val2) - self.mean2

        (inv00, inv01), (inv10, inv11) = self.inv_cov
        # d^T * Inv * d
        mahal_sq = (d1 * (inv00 * d1 + inv01 * d2)) + (d2 * (inv10 * d1 + inv11 * d2))
        mahal_sq = max(0.0, mahal_sq)
        # Acotar para evitar valores infinitos
        return min(mahal_sq, 400.0)


class CategoricalPairRelation:
    """Modela la compatibilidad conjunta entre dos variables categóricas (C1, C2)."""

    def __init__(self, cat_name1: str, cat_name2: str, alpha: float = 1.0, eps: float = 1e-12):
        self.cat1 = cat_name1
        self.cat2 = cat_name2
        self.alpha = alpha
        self.eps = eps

        self.joint_counts: Dict[Tuple[str, str], int] = {}
        self.total_count: int = 0
        self.distinct_c1: int = 0
        self.distinct_c2: int = 0

    def fit(self, records: Sequence[Dict[str, Any]]) -> None:
        self.joint_counts = {}
        c1_set = set()
        c2_set = set()
        self.total_count = 0

        for r in records:
            v1, v2 = r.get(self.cat1), r.get(self.cat2)
            if v1 is not None and v2 is not None:
                c1_str = str(v1)
                c2_str = str(v2)
                pair = (c1_str, c2_str)
                self.joint_counts[pair] = self.joint_counts.get(pair, 0) + 1
                c1_set.add(c1_str)
                c2_set.add(c2_str)
                self.total_count += 1

        self.distinct_c1 = max(1, len(c1_set))
        self.distinct_c2 = max(1, len(c2_set))

    def score_rarity(self, val1: Any, val2: Any) -> float:
        """Calcula el surprisal conjunto -log P(C1, C2) con suavizado de Laplace."""
        c1_str = str(val1) if val1 is not None else "None"
        c2_str = str(val2) if val2 is not None else "None"
        pair = (c1_str, c2_str)

        count = self.joint_counts.get(pair, 0)
        # Espacio de combinaciones posibles + 1 para pares no vistos
        k_space = (self.distinct_c1 * self.distinct_c2) + 1
        denom = self.total_count + (self.alpha * k_space)
        prob = (count + self.alpha) / denom

        return -math.log(max(self.eps, prob))


class RelationalCompatibilityModel:
    """
    Componente relacional de pares de variables para EXP-01.
    Aprende dependencias bivariadas entre variables del sistema.
    """

    def __init__(
        self,
        numeric_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None,
        enable_cat_num: bool = True,
        enable_num_num: bool = True,
        enable_cat_cat: bool = True,
    ):
        self.num_features = numeric_features or []
        self.cat_features = categorical_features or []

        self.enable_cat_num = enable_cat_num
        self.enable_num_num = enable_num_num
        self.enable_cat_cat = enable_cat_cat

        self.cat_num_relations: List[CategoricalNumericRelation] = []
        self.num_num_relations: List[NumericPairRelation] = []
        self.cat_cat_relations: List[CategoricalPairRelation] = []

        self.is_fitted: bool = False

    def fit(self, observations: Sequence[Any]) -> RelationalCompatibilityModel:
        """Ajusta las relaciones de pares sobre observaciones normales de entrenamiento."""
        records = [
            (obs.features if hasattr(obs, "features") else obs)
            for obs in observations
        ]
        if not records:
            raise ValueError("No se puede ajustar RelationalCompatibilityModel con registros vacíos.")

        # Inferencia de características si no se pasaron
        if not self.num_features and not self.cat_features:
            for k, v in records[0].items():
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    self.num_features.append(k)
                else:
                    self.cat_features.append(k)

        # 1. Relaciones Categórico-Numérico (pares C x N)
        self.cat_num_relations = []
        if self.enable_cat_num:
            for cat_col in self.cat_features:
                for num_col in self.num_features:
                    rel = CategoricalNumericRelation(cat_col, num_col)
                    rel.fit(records)
                    self.cat_num_relations.append(rel)

        # 2. Relaciones Numérico-Numérico (pares únicos N x N)
        self.num_num_relations = []
        if self.enable_num_num:
            n_nums = len(self.num_features)
            for i in range(n_nums):
                for j in range(i + 1, n_nums):
                    col1, col2 = self.num_features[i], self.num_features[j]
                    rel_num = NumericPairRelation(col1, col2)
                    rel_num.fit(records)
                    self.num_num_relations.append(rel_num)

        # 3. Relaciones Categórico-Categórico (pares únicos C x C)
        self.cat_cat_relations = []
        if self.enable_cat_cat:
            n_cats = len(self.cat_features)
            for i in range(n_cats):
                for j in range(i + 1, n_cats):
                    c1, c2 = self.cat_features[i], self.cat_features[j]
                    rel_cat = CategoricalPairRelation(c1, c2)
                    rel_cat.fit(records)
                    self.cat_cat_relations.append(rel_cat)

        self.is_fitted = True
        return self

    def score_relations(self, observation: Any) -> float:
        """
        Calcula la puntuación relacional de incompatibilidad de una observación.
        Agregación documentada: Media aritmética de los scores de todos los pares evaluados.
        """
        if not self.is_fitted:
            raise RuntimeError("RelationalCompatibilityModel debe ajustarse mediante fit() antes de puntuar.")

        feats = observation.features if hasattr(observation, "features") else observation
        scores: List[float] = []

        # Evaluar C x N
        for c_n in self.cat_num_relations:
            cat_v = feats.get(c_n.cat_name)
            num_v = feats.get(c_n.num_name)
            scores.append(c_n.score_rarity(cat_v, num_v))

        # Evaluar N x N
        for n_n in self.num_num_relations:
            v1 = feats.get(n_n.num1)
            v2 = feats.get(n_n.num2)
            scores.append(n_n.score_rarity(v1, v2))

        # Evaluar C x C
        for c_c in self.cat_cat_relations:
            c1_v = feats.get(c_c.cat1)
            c2_v = feats.get(c_c.cat2)
            scores.append(c_c.score_rarity(c1_v, c2_v))

        if not scores:
            return 0.0

        return sum(scores) / len(scores)


class RelationalDetector:
    """
    Detector integrado EXP-01.
    Combina el detector univariado de Baseline 0 con el componente de compatibilidad relacional.

    Fórmula de combinación documentada:
        Score = Score_univariado + relational_weight * Score_relacional

    Si enable_relational=False o relational_weight=0.0:
        Reproduce exactamente el comportamiento y puntuaciones de EXP-00 (Baseline 0).
    """

    def __init__(
        self,
        numeric_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None,
        n_bins: int = 20,
        smoothing_alpha: float = 1.0,
        enable_relational: bool = True,
        relational_weight: float = 1.0,
    ):
        # Importamos el detector univariado original de EXP-00 para garantizar coherencia
        from simple_domain.experiments.baseline0 import Baseline0Detector

        self.enable_relational = enable_relational
        self.relational_weight = relational_weight

        self.univariate_detector = Baseline0Detector(
            numeric_features=numeric_features,
            categorical_features=categorical_features,
            n_bins=n_bins,
            smoothing_alpha=smoothing_alpha,
        )
        self.relational_model = RelationalCompatibilityModel(
            numeric_features=numeric_features,
            categorical_features=categorical_features,
        )

        self.threshold: Optional[float] = None
        self.calibrated_quantile: Optional[float] = None
        self.is_fitted: bool = False

    def fit(self, observations: Sequence[Any]) -> RelationalDetector:
        """Ajusta tanto el modelo univariado como el relacional sobre datos de entrenamiento normales."""
        self.univariate_detector.fit(observations)
        if self.enable_relational and self.relational_weight > 0.0:
            self.relational_model.fit(observations)

        self.is_fitted = True
        return self

    def score_observation(self, observation: Any) -> float:
        """
        Calcula la puntuación continua combinada de anomalía.
        Score = Univariado + (relational_weight * Relacional) si está activado.
        """
        if not self.is_fitted:
            raise RuntimeError("RelationalDetector debe ser ajustado mediante fit() antes de puntuar.")

        univ_score = self.univariate_detector.score_observation(observation)

        if not self.enable_relational or self.relational_weight <= 0.0:
            return univ_score

        rel_score = self.relational_model.score_relations(observation)
        return univ_score + (self.relational_weight * rel_score)

    def score_many(self, observations: Sequence[Any]) -> List[float]:
        return [self.score_observation(obs) for obs in observations]

    def calibrate(self, calibration_observations: Sequence[Any], quantile: float = 0.95) -> float:
        """Fija el umbral sobre las puntuaciones de datos normales de calibración."""
        if not (0.0 < quantile < 1.0):
            raise ValueError(f"El cuantil de calibración debe estar en (0, 1), recibido {quantile}")

        scores = self.score_many(calibration_observations)
        if not scores:
            raise ValueError("No se puede calibrar con una lista vacía.")

        sorted_scores = sorted(scores)
        idx = int(math.ceil(quantile * len(sorted_scores))) - 1
        idx = max(0, min(len(sorted_scores) - 1, idx))
        self.threshold = float(sorted_scores[idx])
        self.calibrated_quantile = quantile
        return self.threshold

    def predict(self, observation: Any) -> bool:
        if self.threshold is None:
            raise RuntimeError("RelationalDetector requiere calibración antes de predict().")
        return self.score_observation(observation) > self.threshold

    def predict_many(self, observations: Sequence[Any]) -> List[bool]:
        return [self.predict(obs) for obs in observations]
