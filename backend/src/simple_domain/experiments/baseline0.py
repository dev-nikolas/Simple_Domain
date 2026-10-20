"""
Simple Domain — Baseline 0: Detector Estadístico Univariado de Referencia

Este módulo implementa el método de referencia mínimo independiente de cualquier
arquitectura neuronal o de grafo.

Principios de Baseline 0:
- Para variables numéricas: Estimación de densidad basada en histogramas uniformes
  con suavizado aditivo (Laplace) y soporte para valores fuera de rango (colas).
- Para variables categóricas: Estimación de frecuencias relativas empíricas con
  suavizado aditivo para categorías no vistas.
- Agregación: Promedio de surprisal univariado (-log P) asumiendo independencia
  condicional ingenua (Naive).
- Calibración: Umbral fijado exclusivamente mediante percentil empírico sobre
  observaciones normales del conjunto de calibración (sin ver etiquetas).
- Robustez: Sin divisiones por cero ni infinitos ante variables constantes,
  entradas vacías o valores extremos.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence, Union


class UnivariateNumericEstimator:
    """Estimador de densidad univariado para una variable numérica basado en histogramas."""

    def __init__(self, n_bins: int = 20, smoothing_alpha: float = 1.0, eps: float = 1e-12):
        self.n_bins = n_bins
        self.alpha = smoothing_alpha
        self.eps = eps
        self.min_val: float = 0.0
        self.max_val: float = 0.0
        self.bin_width: float = 1.0
        self.is_constant: bool = False
        self.bin_probs: List[float] = []
        self.underflow_prob: float = 0.0
        self.overflow_prob: float = 0.0
        self.total_count: int = 0

    def fit(self, values: Sequence[Optional[float]]) -> None:
        clean_vals = [float(v) for v in values if v is not None and not math.isnan(float(v))]
        self.total_count = len(clean_vals)

        if not clean_vals:
            self.is_constant = True
            self.min_val = 0.0
            self.max_val = 0.0
            self.bin_probs = [1.0]
            self.underflow_prob = 0.5
            self.overflow_prob = 0.5
            return

        self.min_val = min(clean_vals)
        self.max_val = max(clean_vals)

        # Si todos los valores observados son idénticos
        if abs(self.max_val - self.min_val) < 1e-9:
            self.is_constant = True
            self.bin_width = 1.0
            self.bin_probs = [1.0]
            # Probabilidades de suavizado para valores distintos
            denom = self.total_count + (3.0 * self.alpha)
            self.underflow_prob = self.alpha / denom
            self.overflow_prob = self.alpha / denom
            return

        self.is_constant = False
        self.bin_width = (self.max_val - self.min_val) / self.n_bins

        counts = [0] * self.n_bins
        under_count = 0
        over_count = 0

        for val in clean_vals:
            if val < self.min_val:
                under_count += 1
            elif val >= self.max_val:
                # El valor máximo entra en el último bin
                counts[-1] += 1
            else:
                bin_idx = int((val - self.min_val) / self.bin_width)
                bin_idx = min(self.n_bins - 1, max(0, bin_idx))
                counts[bin_idx] += 1

        # Suavizado aditivo de Laplace: n_bins + 2 colas
        denom = self.total_count + (self.alpha * (self.n_bins + 2))
        self.bin_probs = [(c + self.alpha) / denom for c in counts]
        self.underflow_prob = (under_count + self.alpha) / denom
        self.overflow_prob = (over_count + self.alpha) / denom

    def score_rarity(self, val: Optional[float]) -> float:
        """Calcula el surprisal (-log P) del valor. Retorna un float >= 0."""
        if val is None or math.isnan(float(val)):
            # Valor ausente tratado como máxima rareza suavizada
            return -math.log(min(self.underflow_prob, self.overflow_prob) + self.eps)

        val_f = float(val)

        if self.is_constant:
            if abs(val_f - self.min_val) < 1e-9:
                prob = 1.0 - (2.0 * self.underflow_prob)
                return -math.log(max(self.eps, prob))
            elif val_f < self.min_val:
                return -math.log(max(self.eps, self.underflow_prob))
            else:
                return -math.log(max(self.eps, self.overflow_prob))

        if val_f < self.min_val:
            prob = self.underflow_prob
        elif val_f >= self.max_val:
            if val_f == self.max_val:
                prob = self.bin_probs[-1]
            else:
                prob = self.overflow_prob
        else:
            bin_idx = int((val_f - self.min_val) / self.bin_width)
            bin_idx = min(self.n_bins - 1, max(0, bin_idx))
            prob = self.bin_probs[bin_idx]

        return -math.log(max(self.eps, prob))


class UnivariateCategoricalEstimator:
    """Estimador de frecuencias relativas empíricas para una variable categórica."""

    def __init__(self, smoothing_alpha: float = 1.0, eps: float = 1e-12):
        self.alpha = smoothing_alpha
        self.eps = eps
        self.counts: Dict[str, int] = {}
        self.probs: Dict[str, float] = {}
        self.unseen_prob: float = 1.0
        self.total_count: int = 0

    def fit(self, values: Sequence[Any]) -> None:
        self.counts = {}
        clean_vals = [str(v) for v in values if v is not None]
        self.total_count = len(clean_vals)

        for v in clean_vals:
            self.counts[v] = self.counts.get(v, 0) + 1

        num_categories = len(self.counts)
        # Denominador con suavizado Laplace: +1 para la categoría no vista
        denom = self.total_count + (self.alpha * (num_categories + 1))
        self.probs = {cat: (c + self.alpha) / denom for cat, c in self.counts.items()}
        self.unseen_prob = self.alpha / denom

    def score_rarity(self, val: Any) -> float:
        """Calcula el surprisal (-log P) de la categoría. Retorna un float >= 0."""
        if val is None:
            return -math.log(max(self.eps, self.unseen_prob))

        cat_str = str(val)
        prob = self.probs.get(cat_str, self.unseen_prob)
        return -math.log(max(self.eps, prob))


class Baseline0Detector:
    """
    Detector estadístico univariado Baseline 0.

    No modela dependencias entre variables ni utiliza memoria adaptativa.
    """

    def __init__(
        self,
        numeric_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None,
        n_bins: int = 20,
        smoothing_alpha: float = 1.0,
    ):
        self.numeric_features = numeric_features or []
        self.categorical_features = categorical_features or []
        self.n_bins = n_bins
        self.alpha = smoothing_alpha

        self.num_estimators: Dict[str, UnivariateNumericEstimator] = {}
        self.cat_estimators: Dict[str, UnivariateCategoricalEstimator] = {}
        self.threshold: Optional[float] = None
        self.calibrated_quantile: Optional[float] = None
        self.is_fitted: bool = False

    def fit(self, observations: Sequence[Any]) -> Baseline0Detector:
        """
        Ajusta los estimadores univariados a partir de observaciones normales.
        observations puede ser una lista de SyntheticObservation o una lista de dicts.
        No requiere ni inspecciona etiquetas.
        """
        if not observations:
            raise ValueError("No se puede ajustar Baseline0Detector con una lista vacía de observaciones.")

        # Detectar nombres de características si no se proporcionaron
        sample_feat = observations[0].features if hasattr(observations[0], "features") else observations[0]
        if not self.numeric_features and not self.categorical_features:
            for k, v in sample_feat.items():
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    self.numeric_features.append(k)
                else:
                    self.categorical_features.append(k)

        # Ajustar numéricas
        self.num_estimators = {}
        for num_feat in self.numeric_features:
            vals = [
                (obs.features[num_feat] if hasattr(obs, "features") else obs.get(num_feat))
                for obs in observations
            ]
            estimator = UnivariateNumericEstimator(n_bins=self.n_bins, smoothing_alpha=self.alpha)
            estimator.fit(vals)
            self.num_estimators[num_feat] = estimator

        # Ajustar categóricas
        self.cat_estimators = {}
        for cat_feat in self.categorical_features:
            vals = [
                (obs.features[cat_feat] if hasattr(obs, "features") else obs.get(cat_feat))
                for obs in observations
            ]
            estimator = UnivariateCategoricalEstimator(smoothing_alpha=self.alpha)
            estimator.fit(vals)
            self.cat_estimators[cat_feat] = estimator

        self.is_fitted = True
        return self

    def score_observation(self, observation: Any) -> float:
        """
        Calcula la puntuación continua de anomalía de una observación.
        Agregación documentada: Media aritmética de los surprisals de cada característica.
        """
        if not self.is_fitted:
            raise RuntimeError("Baseline0Detector debe ser ajustado mediante fit() antes de puntuar observaciones.")

        feats = observation.features if hasattr(observation, "features") else observation
        rarity_scores: List[float] = []

        for num_feat, estimator in self.num_estimators.items():
            val = feats.get(num_feat)
            rarity_scores.append(estimator.score_rarity(val))

        for cat_feat, estimator in self.cat_estimators.items():
            val = feats.get(cat_feat)
            rarity_scores.append(estimator.score_rarity(val))

        if not rarity_scores:
            return 0.0

        return sum(rarity_scores) / len(rarity_scores)

    def score_many(self, observations: Sequence[Any]) -> List[float]:
        """Calcula las puntuaciones de anomalía para una lista de observaciones."""
        return [self.score_observation(obs) for obs in observations]

    def calibrate(self, calibration_observations: Sequence[Any], quantile: float = 0.95) -> float:
        """
        Fija el umbral de decisión a partir de las puntuaciones de datos normales de calibración.
        No utiliza etiquetas de anomalía.
        """
        if not (0.0 < quantile < 1.0):
            raise ValueError(f"El cuantil de calibración debe estar estrictamente en (0, 1), recibido {quantile}")

        scores = self.score_many(calibration_observations)
        if not scores:
            raise ValueError("No se puede calibrar con una lista vacía de observaciones.")

        sorted_scores = sorted(scores)
        idx = int(math.ceil(quantile * len(sorted_scores))) - 1
        idx = max(0, min(len(sorted_scores) - 1, idx))
        self.threshold = float(sorted_scores[idx])
        self.calibrated_quantile = quantile
        return self.threshold

    def predict(self, observation: Any) -> bool:
        """
        Retorna True si la puntuación supera el umbral calibrado, False en caso contrario.
        Requiere calibración previa.
        """
        if self.threshold is None:
            raise RuntimeError("Baseline0Detector requiere calibración mediante calibrate() antes de predict().")

        score = self.score_observation(observation)
        return score > self.threshold

    def predict_many(self, observations: Sequence[Any]) -> List[bool]:
        """Predicción binaria para una secuencia de observaciones."""
        return [self.predict(obs) for obs in observations]
