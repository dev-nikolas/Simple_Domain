"""
Simple Domain — Pipeline Principal de Detección de Anomalías

Este módulo integra los componentes validados en EXP-00 (univariado) y EXP-01 (relacional)
en una interfaz unificada, modular y auditable para su uso general en el sistema.

Características principales:
- Desglose transparente de puntuaciones: univariate_score, relational_score y combined_score.
- Modos configurables: Permite operar en modo exclusivamente univariado (equivalente exacto a EXP-00)
  o en modo univariado + compatibilidad relacional (equivalente exacto a EXP-01).
- Separación de responsabilidades: Ajuste sin supervisión, calibración de umbrales sobre datos normales
  y decisión de alarma binaria.
- Idempotencia estricta: Las operaciones de inferencia (score/predict) no mutan el estado interno.
- Desacoplado de datos sintéticos: Acepta cualquier secuencia de diccionarios u objetos con atributo .features.
"""

from __future__ import annotations

import copy
import math
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Sequence, Union

from simple_domain.experiments.relational import RelationalDetector


@dataclass(frozen=True)
class ScoreBreakdown:
    """Resultado desglosado de la evaluación de anomalía para una observación."""
    univariate_score: float
    relational_score: float
    combined_score: float
    threshold: Optional[float]
    is_anomaly: Optional[bool]
    is_calibrated: bool
    features_evaluated: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Serializa el resultado a diccionario estándar."""
        return asdict(self)


class SimpleDomainPipeline:
    """
    Pipeline principal de Simple Domain para aprendizaje estadístico y detección de anomalías.

    Permite:
    1. Ajustar el sistema sobre observaciones normales de entrenamiento (fit).
    2. Calibrar un umbral de decisión sobre observaciones normales independientes (calibrate).
    3. Obtener puntuaciones univariadas, relacionales y combinadas para nuevas observaciones (score).
    4. Emitir decisiones binarias basadas en el umbral calibrado (predict).
    """

    def __init__(
        self,
        enable_relational: bool = True,
        relational_weight: float = 1.0,
        n_bins: int = 20,
        smoothing_alpha: float = 1.0,
        numeric_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None,
    ):
        self.enable_relational = bool(enable_relational)
        self.relational_weight = float(relational_weight)
        self.n_bins = int(n_bins)
        self.smoothing_alpha = float(smoothing_alpha)
        self.numeric_features = list(numeric_features) if numeric_features is not None else None
        self.categorical_features = list(categorical_features) if categorical_features is not None else None

        self._detector = RelationalDetector(
            numeric_features=self.numeric_features,
            categorical_features=self.categorical_features,
            n_bins=self.n_bins,
            smoothing_alpha=self.smoothing_alpha,
            enable_relational=self.enable_relational,
            relational_weight=self.relational_weight,
        )

        self._is_fitted: bool = False
        self._calibrated_threshold: Optional[float] = None
        self._calibrated_quantile: Optional[float] = None

    @property
    def is_fitted(self) -> bool:
        """Indica si el pipeline ha completado el ajuste de sus estimadores."""
        return self._is_fitted

    @property
    def is_calibrated(self) -> bool:
        """Indica si el pipeline ha fijado un umbral mediante calibrate()."""
        return self._calibrated_threshold is not None

    @property
    def threshold(self) -> Optional[float]:
        """Retorna el umbral de calibración actual o None si no se ha calibrado."""
        return self._calibrated_threshold

    @property
    def calibrated_quantile(self) -> Optional[float]:
        """Retorna el cuantil utilizado en la calibración."""
        return self._calibrated_quantile

    @property
    def feature_schema(self) -> Dict[str, List[str]]:
        """
        Nombres de atributos aprendidos durante fit(), separados por tipo.
        Devuelve copias (solo lectura). Antes de fit() ambas listas están vacías.
        Nota: el tipo de cada atributo se infiere de la primera observación de entrenamiento
        cuando no se especifica explícitamente en el constructor.
        """
        if not self._is_fitted:
            return {"numeric": [], "categorical": []}
        univ = self._detector.univariate_detector
        return {
            "numeric": list(univ.numeric_features),
            "categorical": list(univ.categorical_features),
        }

    def fit(self, observations: Sequence[Any]) -> SimpleDomainPipeline:
        """
        Ajusta los estimadores univariados y los modelos de compatibilidad relacional
        a partir de observaciones normales de entrenamiento.
        No requiere ni utiliza etiquetas de anomalía.
        """
        if not observations:
            raise ValueError("No se puede ajustar SimpleDomainPipeline con una secuencia vacía de observaciones.")

        self._detector.fit(observations)
        self._is_fitted = True
        return self

    def calibrate(self, calibration_observations: Sequence[Any], quantile: float = 0.95) -> float:
        """
        Fija el umbral de decisión a partir de las puntuaciones de datos normales de calibración.
        No utiliza etiquetas de anomalía.
        """
        if not self._is_fitted:
            raise RuntimeError("SimpleDomainPipeline debe ser ajustado mediante fit() antes de ser calibrado.")

        if not (0.0 < quantile < 1.0):
            raise ValueError(f"El cuantil de calibración debe estar estrictamente en (0, 1), recibido {quantile}")

        if not calibration_observations:
            raise ValueError("No se puede calibrar SimpleDomainPipeline con observaciones vacías.")

        th = self._detector.calibrate(calibration_observations, quantile=quantile)
        self._calibrated_threshold = th
        self._calibrated_quantile = quantile
        return th

    def score(self, observation: Any) -> ScoreBreakdown:
        """
        Calcula y desglosa las puntuaciones de anomalía para una observación individual.
        Operación estrictamente idempotente (no modifica el estado del modelo).
        """
        if not self._is_fitted:
            raise RuntimeError("SimpleDomainPipeline debe ser ajustado mediante fit() antes de calcular puntuaciones.")

        feats = observation.features if hasattr(observation, "features") else observation
        if not isinstance(feats, dict):
            raise TypeError(f"La observación debe ser un diccionario o poseer un atributo .features de tipo dict. Recibido: {type(feats)}")

        # 1. Puntuación univariada
        univ_score = float(self._detector.univariate_detector.score_observation(observation))

        # 2. Puntuación relacional
        if self.enable_relational and self.relational_weight > 0.0 and self._detector.relational_model.is_fitted:
            rel_score = float(self._detector.relational_model.score_relations(observation))
        else:
            rel_score = 0.0

        # 3. Puntuación combinada
        combined_score = univ_score + (self.relational_weight * rel_score if self.enable_relational else 0.0)

        # 4. Decisión de alarma
        is_anom: Optional[bool] = None
        if self._calibrated_threshold is not None:
            is_anom = combined_score > self._calibrated_threshold

        return ScoreBreakdown(
            univariate_score=round(univ_score, 6),
            relational_score=round(rel_score, 6),
            combined_score=round(combined_score, 6),
            threshold=round(self._calibrated_threshold, 6) if self._calibrated_threshold is not None else None,
            is_anomaly=is_anom,
            is_calibrated=self.is_calibrated,
            features_evaluated=dict(feats),
        )

    def score_many(self, observations: Sequence[Any]) -> List[ScoreBreakdown]:
        """Calcula el desglose de puntuaciones para una secuencia de observaciones."""
        return [self.score(obs) for obs in observations]

    def predict(self, observation: Any) -> bool:
        """
        Emite una decisión binaria de alarma (True si combined_score > threshold).
        Requiere calibración previa mediante calibrate().
        """
        if not self.is_calibrated:
            raise RuntimeError("SimpleDomainPipeline requiere calibración previa mediante calibrate() antes de predict().")

        breakdown = self.score(observation)
        return bool(breakdown.is_anomaly)

    def predict_many(self, observations: Sequence[Any]) -> List[bool]:
        """Emite decisiones binarias de alarma para una secuencia de observaciones."""
        return [self.predict(obs) for obs in observations]

    def get_config(self) -> Dict[str, Any]:
        """Retorna la configuración actual del pipeline de forma auditable."""
        return {
            "enable_relational": self.enable_relational,
            "relational_weight": self.relational_weight,
            "n_bins": self.n_bins,
            "smoothing_alpha": self.smoothing_alpha,
            "numeric_features": copy.deepcopy(self.numeric_features),
            "categorical_features": copy.deepcopy(self.categorical_features),
            "is_fitted": self.is_fitted,
            "is_calibrated": self.is_calibrated,
            "threshold": self.threshold,
            "calibrated_quantile": self.calibrated_quantile,
        }

    def to_dict(self) -> Dict[str, Any]:
        """Alias para get_config()."""
        return self.get_config()


# Alias conveniente
AnomalyDetectionPipeline = SimpleDomainPipeline
