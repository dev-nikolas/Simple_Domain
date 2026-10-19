# Simple Domain — Informe Experimental EXP-00: Baseline 0

- **Fecha (UTC):** `2026-10-19T16:52:34.259598+00:00`
- **Identificador:** `EXP-00-BASELINE0`
- **Semilla determinista:** `42`

---

## 1. Configuración del Experimento

| Parámetro | Valor | Descripción |
| :--- | :--- | :--- |
| **Muestras de ajuste (fit_set)** | 1000 | Observaciones normales para estimación univariada |
| **Muestras calibración (calib_set)** | 300 | Observaciones normales para fijar umbral empírico |
| **Muestras evaluación (eval_set)** | 1000 | Mezcla de 6 escenarios sintéticos de prueba |
| **Cuantil de calibración** | 0.95 | Percentil de calibración fijado en datos normales |
| **Umbral calibrado ($	au$)** | 2.358 | Umbral estático resultante |
| **Bines de histograma** | 20 | Resolución univariada para variables numéricas |
| **Suavizado de Laplace ($lpha$)** | 1.0 | Parámetro aditivo de regularización |

---

## 2. Métricas Globales de Rendimiento

| Métrica | Valor Obtenido | Interpretación |
| :--- | :---: | :--- |
| **ROC-AUC** | **0.6721** | Capacidad discriminativa global de las puntuaciones continuas |
| **Precision** | **0.4376** | Fracción de alarmas emitidas que correspondían a anomalías reales |
| **Recall (Sensibilidad)** | **0.83** | Fracción de anomalías reales capturadas por el umbral |
| **F1-Score** | **0.5731** | Media armónica entre precision y recall |
| **False Positive Rate (FPR)** | **0.4571** | Tasa de falsa alarma en observaciones normales y novedades |
| **Matriz de Confusión** | TP=249 / FP=320 / TN=380 / FN=51 | Distribución neta de clasificaciones |

---

## 3. Desglose por Escenario Sintético

| Escenario | Muestras | ¿Es Anomalía Real? | Alarmas Emitidas | Tasa Alarma | Score Medio | Score p50 | Score p90 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `normal_known` | 400 | No (Negativo) | 45 | **11.2%** | 2.00 | 1.96 | 2.41 |
| `contextual_anomaly` | 100 | Sí (Positivo) | 54 | **54.0%** | 2.60 | 2.46 | 3.43 |
| `incoherent_noise` | 100 | Sí (Positivo) | 100 | **100.0%** | 4.50 | 4.49 | 5.66 |
| `point_anomaly` | 100 | Sí (Positivo) | 95 | **95.0%** | 2.72 | 2.69 | 3.02 |
| `novelty_regime` | 150 | No (Negativo) | 150 | **100.0%** | 5.69 | 5.73 | 6.01 |
| `legit_variation` | 150 | No (Negativo) | 125 | **83.3%** | 2.75 | 2.70 | 3.36 |

> [!IMPORTANT]
> **Hallazgos clave del desglose:**
> 1. **Anomalías puntuales (`point_anomaly`):** Detección excelente (95.0% de captura) debido a que los valores individuales se sitúan en las colas del histograma.
> 2. **Anomalías contextuales (`contextual_anomaly`):** Captura extremadamente deficiente (54.0% de captura). Como cada variable aislada cae en rangos normales de algún modo operativo, la densidad univariada no percibe la incompatibilidad multivariada.
> 3. **Novedad persistente (`novelty_regime`):** Tasa de falsa alarma masiva (100.0%). Al carecer de plasticidad para incorporar nuevos prototipos estables, Baseline 0 cataloga la novedad como anomalía permanentemente.

---

## 4. Eficiencia Computacional y Memoria

- **Latencia por observación (score_observation en CPU):**
  - Media: `3.36 µs`
  - Mediana (p50): `3.3 µs`
  - Percentil 90 (p90): `3.5 µs`
  - Percentil 99 (p99): `3.8 µs`
  - Rango: `[2.7 µs, 22.4 µs]`
- **Huella de memoria del detector:**
  - Total estimado: `3.93 KB` (4024 bytes)
  - Estimadores numéricos: `2272 bytes`
  - Estimadores categóricos: `1408 bytes`
  - *Metodología:* sys.getsizeof recursivo sobre estructuras internas de estimadores y listas de bines

---

## 5. Casos Representativos Auditados

### A. Aciertos (True Positives en Anomalías Puntuales)
- **Obs #2118** (`contextual_anomaly`): Score = `3.3842` > Umbral `2.358`
  - Atributos: `{'operating_mode': 'boost', 'location_zone': 'zone_A', 'temperature': 14.44, 'pressure': 1025.09, 'vibration': 0.7416, 'power_consumption': 250.82}`
  - Diagnóstico: {'anomaly_type': 'boost_with_eco_temp', 'note': 'Values plausible univariately, conflicting multi-variate'}
- **Obs #2263** (`incoherent_noise`): Score = `6.2108` > Umbral `2.358`
  - Atributos: `{'operating_mode': 'unknown_rnd', 'location_zone': 'zone_rnd', 'temperature': 18.77, 'pressure': 1069.15, 'vibration': 1.1584, 'power_consumption': 312.92}`
  - Diagnóstico: {'note': 'Uniform unstructured noise'}
- **Obs #2031** (`point_anomaly`): Score = `2.61` > Umbral `2.358`
  - Atributos: `{'operating_mode': 'nominal', 'location_zone': 'zone_A', 'temperature': 105.56, 'pressure': 1007.09, 'vibration': 0.3894, 'power_consumption': 131.62}`
  - Diagnóstico: {'corrupted_field': 'temperature', 'type': 'univariate_extreme'}

### B. Falsas Alarmas (False Positives en Novedad o Variaciones)
- **Obs #1868** (`novelty_regime`): Score = `5.6288` > Umbral `2.358` (Ground Truth: Normal)
  - Atributos: `{'operating_mode': 'turbo_clean', 'location_zone': 'zone_special', 'temperature': 40.63, 'pressure': 1020.51, 'vibration': 0.5086, 'power_consumption': 200.3}`
  - Razón del error: Las categorías o valores no observados en el ajuste disparan el surprisal univariado.
- **Obs #1892** (`novelty_regime`): Score = `5.5717` > Umbral `2.358` (Ground Truth: Normal)
  - Atributos: `{'operating_mode': 'turbo_clean', 'location_zone': 'zone_special', 'temperature': 38.94, 'pressure': 1027.58, 'vibration': 0.4392, 'power_consumption': 202.06}`
  - Razón del error: Las categorías o valores no observados en el ajuste disparan el surprisal univariado.
- **Obs #1912** (`novelty_regime`): Score = `5.2218` > Umbral `2.358` (Ground Truth: Normal)
  - Atributos: `{'operating_mode': 'turbo_clean', 'location_zone': 'zone_special', 'temperature': 35.23, 'pressure': 1030.96, 'vibration': 0.4787, 'power_consumption': 197.51}`
  - Razón del error: Las categorías o valores no observados en el ajuste disparan el surprisal univariado.

### C. Falsos Negativos (Anomalías Contextuales no Detectadas)
- **Obs #2171** (`contextual_anomaly`): Score = `2.2097` <= Umbral `2.358` (Ground Truth: Anomalía)
  - Atributos: `{'operating_mode': 'eco', 'location_zone': 'zone_C', 'temperature': 21.96, 'pressure': 1026.91, 'vibration': 0.1519, 'power_consumption': 279.09}`
  - Razón del fallo: Values plausible univariately, conflicting multi-variate
- **Obs #2172** (`contextual_anomaly`): Score = `2.1283` <= Umbral `2.358` (Ground Truth: Anomalía)
  - Atributos: `{'operating_mode': 'eco', 'location_zone': 'zone_C', 'temperature': 17.94, 'pressure': 1022.49, 'vibration': 0.167, 'power_consumption': 279.4}`
  - Razón del fallo: Values plausible univariately, conflicting multi-variate
- **Obs #2159** (`contextual_anomaly`): Score = `1.9492` <= Umbral `2.358` (Ground Truth: Anomalía)
  - Atributos: `{'operating_mode': 'eco', 'location_zone': 'zone_A', 'temperature': 20.07, 'pressure': 1013.98, 'vibration': 0.1336, 'power_consumption': 274.36}`
  - Razón del fallo: Values plausible univariately, conflicting multi-variate

---

## 6. Limitaciones Demostradas de Baseline 0

1. **Ceguera ante anomalías relacionales / contextuales:** La agregación aditiva univariada es incapaz de detectar inconsistencias cruzadas cuando cada variable se mantiene en sus márgenes marginales.
2. **Incapacidad de adaptación:** Confunde sistemáticamente la novedad estructural persistente con anomalías destructivas.
3. **Utilidad como cota inferior:** Define con absoluta precisión el rendimiento mínimo que cualquier arquitectura adaptativa (GNG, ART o Predictive Coding) deberá superar demostrablemente en EXP-01.