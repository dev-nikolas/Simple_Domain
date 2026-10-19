"""
Simple Domain — Benchmark S1
Generador sintético determinista y parametrizable para evaluación experimental.

Escenarios contemplados:
1. normal_known: Distribuciones estándar con relaciones inter-variables coherentes.
2. legit_variation: Variaciones estadísticas extremas dentro del dominio admisible (is_anomaly=False).
3. novelty_regime: Régimen nuevo y persistente con estructura coherente propia (is_anomaly=False).
4. point_anomaly: Valores extremos univariados fuera de rango (is_anomaly=True).
5. contextual_anomaly: Valores univariados plausibles que violan correlaciones cruzadas (is_anomaly=True).
6. incoherent_noise: Muestreo uniforme aleatorio sin estructura relacional (is_anomaly=True).
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple


@dataclass(frozen=True)
class SyntheticObservation:
    """Representa una observación individual del benchmark sintético."""
    obs_id: int
    features: Dict[str, Any]
    scenario: str
    is_anomaly: bool
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BenchmarkDataset:
    """Colección estructurada de conjuntos de datos para ajuste, calibración y evaluación."""
    fit_set: List[SyntheticObservation]
    calibration_set: List[SyntheticObservation]
    evaluation_set: List[SyntheticObservation]
    metadata: Dict[str, Any]


class BenchmarkS1Generator:
    """
    Generador determinista de datos sintéticos Benchmark S1.
    Usa el generador pseudoaleatorio de la biblioteca estándar de Python fijando una semilla.
    """

    FEATURE_NAMES_NUMERIC = ["temperature", "pressure", "vibration", "power_consumption"]
    FEATURE_NAMES_CATEGORICAL = ["operating_mode", "location_zone"]

    MODES_NORMAL = ("eco", "nominal", "boost")
    ZONES_NORMAL = ("zone_A", "zone_B", "zone_C")

    def __init__(self, seed: int = 42):
        self.seed = seed
        self._rng = random.Random(seed)

    def _sample_normal_sample(self, obs_id: int, legit_variation: bool = False) -> SyntheticObservation:
        """Genera una observación del régimen normal o variación legítima."""
        mode = self._rng.choice(self.MODES_NORMAL)
        zone = self._rng.choice(self.ZONES_NORMAL)

        # Base según modo
        if mode == "eco":
            temp_mean, temp_std = 20.0, 1.5
            vib_mean, vib_std = 0.15, 0.03
            power_base = 45.0
            power_coeff = 12.0
        elif mode == "nominal":
            temp_mean, temp_std = 25.0, 2.0
            vib_mean, vib_std = 0.35, 0.06
            power_base = 120.0
            power_coeff = 30.0
        else:  # boost
            temp_mean, temp_std = 32.0, 2.5
            vib_mean, vib_std = 0.70, 0.10
            power_base = 250.0
            power_coeff = 60.0

        if legit_variation:
            # Variaciones en los extremos de la distribución (2 a 2.8 desviaciones típicas)
            sign = self._rng.choice((-1.0, 1.0))
            temp_dev = sign * self._rng.uniform(2.0, 2.8) * temp_std
            vib_dev = sign * self._rng.uniform(2.0, 2.8) * vib_std
            press_dev = sign * self._rng.uniform(2.0, 2.8) * 10.0
            scenario = "legit_variation"
        else:
            temp_dev = self._rng.gauss(0.0, temp_std)
            vib_dev = self._rng.gauss(0.0, vib_std)
            press_dev = self._rng.gauss(0.0, 10.0)
            scenario = "normal_known"

        temp = round(temp_mean + temp_dev, 2)
        vibration = max(0.01, round(vib_mean + vib_dev, 4))
        pressure = round(1013.25 + press_dev, 2)
        power = round(power_base + (power_coeff * vibration) + self._rng.gauss(0.0, 3.0), 2)

        features = {
            "operating_mode": mode,
            "location_zone": zone,
            "temperature": temp,
            "pressure": pressure,
            "vibration": vibration,
            "power_consumption": power,
        }

        return SyntheticObservation(
            obs_id=obs_id,
            features=features,
            scenario=scenario,
            is_anomaly=False,
            metadata={"origin": "normal_distribution", "mode": mode},
        )

    def _sample_novelty_regime(self, obs_id: int) -> SyntheticObservation:
        """
        Genera una observación de un régimen novedoso y persistente.
        Introduce un nuevo modo operativo ('turbo_clean') y una zona especializada ('zone_special')
        con correlaciones físicas coherentes pero no vistas en el entrenamiento inicial.
        """
        temp = round(self._rng.gauss(40.0, 1.8), 2)
        pressure = round(self._rng.gauss(1028.0, 6.0), 2)
        vibration = max(0.05, round(self._rng.gauss(0.50, 0.05), 4))
        power = round(180.0 + (40.0 * vibration) + self._rng.gauss(0.0, 4.0), 2)

        features = {
            "operating_mode": "turbo_clean",
            "location_zone": "zone_special",
            "temperature": temp,
            "pressure": pressure,
            "vibration": vibration,
            "power_consumption": power,
        }

        return SyntheticObservation(
            obs_id=obs_id,
            features=features,
            scenario="novelty_regime",
            is_anomaly=False,
            metadata={"note": "Persistent coherent novel structure"},
        )

    def _sample_point_anomaly(self, obs_id: int) -> SyntheticObservation:
        """
        Anomalía puntual univariada: un valor individual extremo fuera de cualquier rango admisible.
        """
        # Partimos de una base normal y corrompemos un campo numérico severamente
        base_obs = self._sample_normal_sample(obs_id, legit_variation=False)
        features = dict(base_obs.features)

        target_attr = self._rng.choice(["temperature", "pressure", "vibration", "power_consumption"])
        if target_attr == "temperature":
            features["temperature"] = round(self._rng.choice([self._rng.uniform(90.0, 140.0), self._rng.uniform(-40.0, -10.0)]), 2)
        elif target_attr == "pressure":
            features["pressure"] = round(self._rng.choice([self._rng.uniform(400.0, 700.0), self._rng.uniform(1400.0, 1800.0)]), 2)
        elif target_attr == "vibration":
            features["vibration"] = round(self._rng.uniform(3.5, 9.0), 4)
        else:  # power_consumption
            features["power_consumption"] = round(self._rng.uniform(900.0, 2500.0), 2)

        return SyntheticObservation(
            obs_id=obs_id,
            features=features,
            scenario="point_anomaly",
            is_anomaly=True,
            metadata={"corrupted_field": target_attr, "type": "univariate_extreme"},
        )

    def _sample_contextual_anomaly(self, obs_id: int) -> SyntheticObservation:
        """
        Anomalía contextual: cada valor por separado es individualmente plausible en algún régimen,
        pero la combinación simultánea viola la correlación entre variables.
        Ejemplo: operating_mode == 'eco' pero con power_consumption de 'boost' (270.0 W),
        o 'boost' con temperatura de 15.0°C y vibración de 0.05.
        """
        kind = self._rng.choice(["eco_with_boost_power", "boost_with_eco_temp", "mismatched_vibration"])

        if kind == "eco_with_boost_power":
            features = {
                "operating_mode": "eco",
                "location_zone": self._rng.choice(self.ZONES_NORMAL),
                "temperature": round(self._rng.gauss(20.0, 1.2), 2),  # Típico eco
                "pressure": round(self._rng.gauss(1013.0, 8.0), 2),
                "vibration": round(self._rng.gauss(0.15, 0.03), 4),   # Típico eco
                "power_consumption": round(self._rng.gauss(275.0, 10.0), 2),  # Típico boost (imposible en eco)
            }
        elif kind == "boost_with_eco_temp":
            features = {
                "operating_mode": "boost",
                "location_zone": self._rng.choice(self.ZONES_NORMAL),
                "temperature": round(self._rng.gauss(15.0, 1.0), 2),  # Demasiado fría para boost
                "pressure": round(self._rng.gauss(1013.0, 8.0), 2),
                "vibration": round(self._rng.gauss(0.70, 0.10), 4),
                "power_consumption": round(self._rng.gauss(260.0, 12.0), 2),
            }
        else:
            features = {
                "operating_mode": "nominal",
                "location_zone": self._rng.choice(self.ZONES_NORMAL),
                "temperature": round(self._rng.gauss(25.0, 1.5), 2),
                "pressure": round(self._rng.gauss(1013.0, 8.0), 2),
                "vibration": round(self._rng.gauss(0.95, 0.05), 4),  # Vibración de boost extremo en nominal
                "power_consumption": round(self._rng.gauss(42.0, 2.0), 2),  # Consumo ultra bajo de eco en nominal
            }

        return SyntheticObservation(
            obs_id=obs_id,
            features=features,
            scenario="contextual_anomaly",
            is_anomaly=True,
            metadata={"anomaly_type": kind, "note": "Values plausible univariately, conflicting multi-variate"},
        )

    def _sample_incoherent_noise(self, obs_id: int) -> SyntheticObservation:
        """
        Ruido incoherente: cada campo se muestrea de forma aleatoria sin dependencia alguna.
        """
        features = {
            "operating_mode": self._rng.choice(self.MODES_NORMAL + ("unknown_rnd",)),
            "location_zone": self._rng.choice(self.ZONES_NORMAL + ("zone_rnd",)),
            "temperature": round(self._rng.uniform(5.0, 50.0), 2),
            "pressure": round(self._rng.uniform(960.0, 1070.0), 2),
            "vibration": round(self._rng.uniform(0.01, 1.5), 4),
            "power_consumption": round(self._rng.uniform(20.0, 400.0), 2),
        }

        return SyntheticObservation(
            obs_id=obs_id,
            features=features,
            scenario="incoherent_noise",
            is_anomaly=True,
            metadata={"note": "Uniform unstructured noise"},
        )

    def generate(
        self,
        n_fit: int = 1000,
        n_calibration: int = 300,
        n_evaluation: int = 1000,
        eval_proportions: Dict[str, float] | None = None,
    ) -> BenchmarkDataset:
        """
        Genera los conjuntos fit_set, calibration_set y evaluation_set.

        - fit_set: solo normales para ajustar el modelo sin ver etiquetas.
        - calibration_set: solo normales para calibrar umbrales sin contaminar evaluación.
        - evaluation_set: mezcla de escenarios para medir detección y discriminación.
        """
        if eval_proportions is None:
            eval_proportions = {
                "normal_known": 0.40,
                "legit_variation": 0.15,
                "novelty_regime": 0.15,
                "point_anomaly": 0.10,
                "contextual_anomaly": 0.10,
                "incoherent_noise": 0.10,
            }

        curr_id = 1

        # 1. Conjunto de ajuste (exclusivamente normales)
        fit_set: List[SyntheticObservation] = []
        for _ in range(n_fit):
            fit_set.append(self._sample_normal_sample(curr_id, legit_variation=False))
            curr_id += 1

        # 2. Conjunto de calibración (exclusivamente normales independientes)
        calibration_set: List[SyntheticObservation] = []
        for _ in range(n_calibration):
            calibration_set.append(self._sample_normal_sample(curr_id, legit_variation=False))
            curr_id += 1

        # 3. Conjunto de evaluación (escenarios mixtos)
        evaluation_set: List[SyntheticObservation] = []
        counts: Dict[str, int] = {}
        for scenario, prop in eval_proportions.items():
            counts[scenario] = int(round(n_evaluation * prop))

        # Ajuste de redondeo para sumar exactamente n_evaluation
        diff = n_evaluation - sum(counts.values())
        counts["normal_known"] += diff

        scenario_generators = {
            "normal_known": lambda i: self._sample_normal_sample(i, legit_variation=False),
            "legit_variation": lambda i: self._sample_normal_sample(i, legit_variation=True),
            "novelty_regime": self._sample_novelty_regime,
            "point_anomaly": self._sample_point_anomaly,
            "contextual_anomaly": self._sample_contextual_anomaly,
            "incoherent_noise": self._sample_incoherent_noise,
        }

        for scenario, count in counts.items():
            gen_func = scenario_generators[scenario]
            for _ in range(count):
                evaluation_set.append(gen_func(curr_id))
                curr_id += 1

        # Mezclar el conjunto de evaluación para que no vengan en bloques contiguos
        self._rng.shuffle(evaluation_set)

        metadata = {
            "seed": self.seed,
            "n_fit": len(fit_set),
            "n_calibration": len(calibration_set),
            "n_evaluation": len(evaluation_set),
            "evaluation_scenario_counts": counts,
            "numeric_features": list(self.FEATURE_NAMES_NUMERIC),
            "categorical_features": list(self.FEATURE_NAMES_CATEGORICAL),
        }

        return BenchmarkDataset(
            fit_set=fit_set,
            calibration_set=calibration_set,
            evaluation_set=evaluation_set,
            metadata=metadata,
        )


def generate_benchmark_s1(
    seed: int = 42,
    n_fit: int = 1000,
    n_calib: int = 300,
    n_eval: int = 1000,
) -> BenchmarkDataset:
    """Función de conveniencia para instanciar y generar Benchmark S1."""
    generator = BenchmarkS1Generator(seed=seed)
    return generator.generate(n_fit=n_fit, n_calibration=n_calib, n_evaluation=n_eval)
