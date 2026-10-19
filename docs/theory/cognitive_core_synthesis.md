# Líneas de Investigación y Protocolo Experimental

**Documento de Trabajo Provisional — Fase de Fundamentación Conceptual**  
*Proyecto:* Simple Domain  
*Versión:* `0.1.0-research`

---

## 1. Naturaleza y Propósito de este Documento

Este documento establece el marco de análisis crítico sobre cinco líneas teóricas de la literatura neurocomputacional y de inteligencia artificial.

**Premisas de trabajo:**
1. Ninguna de las arquitecturas aquí descritas se asume como solución definitiva para Simple Domain.
2. No se presupone que los cinco mecanismos deban combinarse ni que sus aportes teóricos se agreguen de manera automáticamente positiva.
3. Se pospone la formulación de ecuaciones definitivas hasta contar con la definición operacional de los datos de prueba y un modelo de referencia elemental (*Baseline 0*).
4. El objetivo es delimitar qué hipótesis empíricas pretendemos poner a prueba antes de redactar código.

---

## 2. Análisis Crítico de las Líneas de Investigación

---

### A. Growing Neural Gas (GNG)

#### 1. Problema que podría resolver en Simple Domain
Aprender la topología intrínseca y la conectividad de los datos de forma continua, permitiendo que la memoria incorpore nodos y enlaces según la densidad observada, sin necesidad de fijar a priori el número de clústeres o la dimensionalidad del espacio.

#### 2. Hechos establecidos en la literatura
- Desarrollado por Fritzke (1995), es un algoritmo de cuantización vectorial adaptativa capaz de aprender relaciones de vecindad preservando la topología.
- Introduce dinámicas locales: conexión de Hebb competitiva (enlazar los dos ganadores más cercanos), inserción periódica de unidades en regiones con mayor error acumulado y envejecimiento/poda de conexiones inactivas.
- A diferencia de los Mapas Autoorganizados de Kohonen (SOM), no impone una topología fija predefinida (malla 2D o toroidal).

#### 3. Requisitos de entrada y representación
- Requiere un espacio métrico definido con una función de distancia computable entre vectores de características ($d(x, w)$).
- Para datos tabulares o categóricos (Nivel I), exige mecanismos explícitos de codificación o embeddings numéricos previos.

#### 4. Limitaciones conocidas y riesgos
- **Sensibilidad a hiperparámetros:** Tasa de aprendizaje, período de inserción ($\lambda$) y umbral de edad máxima de aristas ($a_{\max}$) condicionan fuertemente la velocidad de crecimiento o sobrepoblación.
- **Coste de búsqueda:** Encontrar los dos nodos más cercanos en cada paso escala con el número de nodos $N$ si no se emplean estructuras de particionamiento espacial.
- **Riesgo de sobreajuste topológico:** En presencia de ruido disperso continuo, puede generar nodos espurios si la poda de aristas no está bien calibrada.

#### 5. Hipótesis de investigación en Simple Domain
> *Hipótesis H-GNG:* "Un grafo dinámico con inserción local y poda de aristas por envejecimiento representa transiciones entre estados de datos con menor dispersión relacional que un grafo estático de $K$ nodos fijado al inicio."

#### 6. Evidencia experimental requerida para su incorporación
Demostración de que ante un flujo con un número variable de atractores, la red ajusta su topología reduciendo el error de reconstrucción sin superar un presupuesto máximo estricto de nodos y aristas en memoria RAM.

---

### B. Adaptive Resonance Theory (ART)

#### 1. Problema que podría resolver en Simple Domain
Gestionar el compromiso estabilidad-plasticidad: decidir formalmente si una nueva observación es suficientemente afín a un patrón conocido como para actualizarlo (resonancia), o si es lo bastante diferente como para justificar una nueva categoría, evitando el olvido catastrófico.

#### 2. Hechos establecidos en la literatura
- Formulada por Grossberg y Carpenter (1987), introduce el principio de resonancia adaptativa gobernado por un parámetro de vigilancia ($\rho \in [0, 1]$).
- Si la concordancia entre la entrada y la categoría ganadora supera $\rho$, el sistema resuena y adapta sus pesos. Si no, se inhibe la categoría y se ejecuta una búsqueda; si ninguna califica, se crea un nuevo nodo.
- Ofrece estabilidad demostrable ante secuencias de datos arbitrarias sin reentrenamientos iterativos masivos.

#### 3. Requisitos de entrada y representación
- Variantes clásicas (ART1, Fuzzy ART) requieren vectores binarios o normalizados en el hipercubo $[0, 1]^D$, a menudo con codificación por complementos para evitar la proliferación descontrolada de categorías.

#### 4. Limitaciones conocidas y riesgos
- **Proliferação de categorías:** Valores de vigilancia $\rho$ muy elevados con datos ruidosos provocan la creación de una categoría por cada observación ruidosa.
- **Dependencia del orden de presentación:** El orden temporal en que se presentan los datos influye de forma determinante en los límites de las categorías resultantes.
- **Falta de relaciones:** ART categoriza puntos de forma aislada; no modela de forma natural cómo una categoría se relaciona con otra a lo largo del tiempo o el espacio.

#### 5. Hipótesis de investigación en Simple Domain
> *Hipótesis H-ART:* "Un mecanismo de vigilancia de umbral local permite incorporar nuevos tipos de registros sin degradar la precisión de reconocimiento de los tipos consolidados al inicio."

#### 6. Evidencia experimental requerida para su incorporación
Demostración de retención neta: al exponer al sistema a una secuencia de distribución $A$, luego $B$, y volver a evaluar sobre $A$, la exactitud sobre $A$ no debe caer por debajo de un umbral establecido (ausencia de olvido catastrófico medible).

---

### C. Predictive Coding

#### 1. Problema que podría resolver en Simple Domain
Dotar al sistema de una señal intrínseca de sorpresa y validación contextual continua. Al mantener expectativas sobre atributos o transiciones, el error de predicción funciona como un indicador cuantitativo para detectar anomalías y guiar la plasticidad.

#### 2. Hechos establecidos en la literatura
- Desarrollado en neurociencia computacional (Rao y Ballard, 1999; Friston, 2005) como principio organizador del procesamiento cortical.
- El sistema transmite predicciones descendentes (*top-down*) y compara con los estímulos ascendentes (*bottom-up*); sólo la diferencia residual (error de predicción) se propaga para actualizar las representaciones internas.
- El aprendizaje local busca minimizar la energía libre o la magnitud cuadrática del error de predicción.

#### 3. Requisitos de entrada y representación
- Requiere un contexto temporal o relacional explícito: el dato actual debe poder ser predicho condicionado al estado previo o a variables correlacionadas ($p(x_t \mid x_{t-1}, \mathcal{M})$).

#### 4. Limitaciones conocidas y riesgos
- **Inestabilidad de predicción en entornos estocásticos:** Si los datos tienen alta varianza intrínseca legítima, el error de predicción será permanentemente alto sin que ello indique una anomalía real.
- **Complejidad de inferencia:** Mantener estados predictivos simultáneos puede elevar el coste computacional por paso en CPU.

#### 5. Hipótesis de investigación en Simple Domain
> *Hipótesis H-PC:* "El error residual de predicción contextual separa las anomalías puntuales del ruido de fondo con mayor área bajo la curva ROC que una simple prueba de densidad estática o conteo de frecuencias."

#### 6. Evidencia experimental requerida para su incorporación
Demostración de que la métrica de error predictivo detecta violaciones de transición sintéticas con menor tasa de falsas alarmas que el modelo de referencia *Baseline 0*.

---

### D. Memoria Asociativa y Modelos de Hopfield

#### 1. Problema que podría resolver en Simple Domain
Permitir la recuperación de patrones íntegros a partir de consultas parciales, con valores ausentes (*missing values*) o perturbadas por ruido leve.

#### 2. Hechos establecidos en la literatura
- Introducidas por Hopfield (1982), son redes recurrentes con función de energía de Lyapunov donde los patrones almacenados actúan como mínimos locales de atracción.
- Las variantes modernas (redes de Hopfield densas o continuas, Krotov & Hopfield 2016, Ramsauer et al. 2020) aumentan exponencialmente la capacidad de almacenamiento respecto al límite clásico de $0.14N$.

#### 3. Requisitos de entrada y representación
- Vectores en dimensiones fijas con valores discretos o continuos normalizados y una regla de energía bien acotada.

#### 4. Limitaciones conocidas y riesgos
- **Estados espurios:** Dinámicas que convergen a mínimos locales que no corresponden a ningún patrón real observado.
- **Límite de capacidad y coste:** Las matrices de pesos simétricas requieren almacenamiento cuadrático respecto a la dimensión del vector, lo que penaliza la compacidad en CPU si las representaciones crecen.

#### 5. Hipótesis de investigación en Simple Domain
> *Hipótesis H-HOP:* "Una dinámica de atracción asociativa reconstruye registros tabulares con campos omitidos con mayor fidelidad que una imputación por moda o media condicional."

#### 6. Evidencia experimental requerida para su incorporación
Demostración de reconstrucción fiable en presencia de un porcentaje controlado de atributos enmascarados ($10\% - 40\%$) sin incurrir en colapsos hacia estados espurios.

---

### E. Representación y Razonamiento Neuro-Simbólicos

#### 1. Problema que podría resolver en Simple Domain
Evitar que la memoria interna degenere en una colección de vectores abstractos incomprensibles. Garantizar que cada nodo y arista mantenga su procedencia, su significado en el dominio original y los registros específicos que lo justifican.

#### 2. Hechos establecidos en la literatura
- Corriente que busca unificar el aprendizaje adaptativo/estadístico con la interpretabilidad, la lógica y los grafos de conocimiento explícitos (Marcus, 2020; Garcez et al., 2019).
- Permite formular explicaciones basadas en trazas de evidencia y realizar inferencias sobre relaciones conocidas.

#### 3. Requisitos de entrada y representación
- Metadatos estructurales preservados: nombre del campo, tipo de dato, archivo de origen y relaciones ontológicas básicas.

#### 4. Limitaciones conocidas y riesgos
- **Fragilidad ante inconsistencias:** Las representaciones puramente simbólicas pueden ser rígidas ante datos ruidosos o continuos si no se acoplan a un mecanismo probabilístico o continuo flexible.
- **Sobrecarga de metadatos:** Almacenar referencias detalladas para cada observación puede disparar el uso de memoria si no se definen resúmenes estadísticos suficientes.

#### 5. Hipótesis de investigación en Simple Domain
> *Hipótesis H-SYM:* "Almacenar la procedencia y la tipología de las relaciones permite generar explicaciones de anomalías comprensibles para un operador humano sin degradar la velocidad de actualización de la memoria."

#### 6. Evidencia experimental requerida para su incorporación
Verificación cualitativa y cuantitativa de que cada detección de anomalía va acompañada de una lista auditable de campos, umbrales y conexiones violadas.

---

## 3. Protocolo Experimental Inicial

Para contrastar las hipótesis anteriores de forma rigurosa y reproducible, se define el siguiente protocolo de experimentación controlada.

### A. Generador de Datos Sintéticos Controlados (Dataset Benchmark S1)

El dataset de prueba inicial será determinista, parametrizable y reproducible mediante una semilla aleatoria fija:

1. **Patrones Regulares Base ($P_{\text{base}}$):**
   - 3 a 5 tipos de entidades o transiciones periódicas con distribuciones de valores conocidas (ej. variables categóricas acopladas y valores numéricos con medias y varianzas definidas).
2. **Variaciones Legítimas ($V_{\text{legit}}$):**
   - Muestras que pertenecen a los patrones base pero presentan fluctuaciones estocásticas dentro de intervalos admisibles ($\pm 2\sigma$).
3. **Ruido Incoherente ($R_{\text{ruido}}$):**
   - Registros generados por muestreo aleatorio uniforme sobre el espacio de valores, sin correlación interna entre campos.
4. **Novedades Controladas ($N_{\text{novedad}}$):**
   - Un nuevo patrón coherente que no existía en las primeras $T_1$ observaciones y que comienza a presentarse de forma recurrente a partir de $T_2$.
5. **Anomalías Inyectadas ($A_{\text{anomalia}}$):**
   - *Anomalías puntuales:* Valores aislados extremos fuera de rango.
   - *Anomalías de contexto/relación:* Valores que individualmente son válidos, pero cuya coocurrencia viola una relación estructural consolidada (ej. campo $X = A$ con campo $Y = B$ cuando la regla aprendida es que $X=A \implies Y=C$).

---

### B. Línea Base Mínima de Comparación (Baseline 0)

Antes de ejecutar cualquier variante de GNG, ART o Predictive Coding, se medirá el rendimiento de un modelo simple y transparente:
- **Baseline 0:** Tabla de frecuencias empíricas de coocurrencia y estimación de densidad paramétrica univariada por campo.
- Todo mecanismo cognitivo candidato deberá superar justificadamente a Baseline 0 en precisión de detección o retención, compensando el coste de su complejidad adicional.

---

### C. Criterios de Evaluación y Métricas

| Dimensión | Métrica Operacional | Objetivo |
| :--- | :--- | :--- |
| **Reconocimiento de Patrones** | Pureza de categorías y error de reconstrucción | Identificar los clusters reales sin fragmentación excesiva. |
| **Detección de Anomalías** | $F_1\text{-Score}$ y AUC-ROC sobre $A_{\text{anomalia}}$ | Maximizar detección con mínima tasa de falsos positivos. |
| **Discriminación Novedad vs. Anomalía** | Tasa de adopción de $N_{\text{novedad}}$ vs. rechazo de $R_{\text{ruido}}$ | Incorporar novedades estables a la memoria sin adoptar ruido. |
| **Adaptación y Retención** | Exactitud sobre $P_{\text{base}}$ tras la introducción de $N_{\text{novedad}}$ | Cero olvido catastrófico demostrable. |
| **Uso de Memoria** | Número total de nodos, aristas y bytes en RAM | Crecimiento sublineal respecto al volumen de datos procesados. |
| **Coste Computacional** | Microsegundos ($\mu\text{s}$) de CPU por observación en flujo | Procesamiento en tiempo real sobre hardware estándar. |
| **Explicabilidad** | Precisión de los atributos señalados en la explicación de anomalía | Coincidencia exacta con los campos inyectados como anómalos. |

---

### D. Estrategia de Ablación Sistemática

La evaluación de combinaciones se realizará paso a paso mediante adición y sustracción controlada:

```text
Experimento 0: Baseline 0 (Conteo estadístico elemental)
       │
       ▼
Experimento 1: Baseline 0 + Módulo de Vigilancia (Evaluación aislada de hipótesis ART)
       │
       ▼
Experimento 2: Baseline 0 + Grafo de Hebb dinámico (Evaluación aislada de hipótesis GNG)
       │
       ▼
Experimento 3: Baseline 0 + Expectativa local (Evaluación aislada de hipótesis Predictive Coding)
       │
       ▼
Experimento 4: Combinación dual (únicamente de aquellos que superen a Baseline 0 individualmente)
       │
       ▼
Experimento 5: Evaluación de interferencias cruzadas y coste computacional neto
```

Si la adición de un mecanismo incrementa el coste computacional o la memoria sin generar una mejora estadísticamente significativa en las métricas de detección o retención, **se descarta formalmente de la arquitectura final.**

---

## 4. Estado de las Decisiones de Diseño

- [x] Caracterización de problemas operativos del sistema.
- [x] Delimitación de hipótesis teóricas sobre las 5 familias conceptuales.
- [x] Especificación del protocolo sintético parametrizado.
- [ ] Implementación del generador del Dataset Benchmark S1. *(Aplazada hasta aprobación del protocolo)*
- [ ] Implementación de Baseline 0. *(Aplazada hasta contar con el benchmark)*
- [ ] Selección y formalización matemática del primer mecanismo candidato. *(Aplazada tras resultados de Baseline 0)*
