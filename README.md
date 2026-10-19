# PRESENT_SIMPLE

**Dominio Simple — Adaptive Pattern System**

PRESENT_SIMPLE es un proyecto experimental de ingeniería e investigación que explora un modelo de **aprendizaje estructural adaptativo** basado en topología dinámica, formación de categorías, codificación predictiva y memoria relacional explicable.

Su objetivo es construir un sistema compacto, interpretable y libre de dependencias masivas, capaz de aprender regularidades a partir de datos heterogéneos, adaptarse incrementalmente y discernir con rigor entre **novedades legítimas** y **anomalías reales**.

---

## 1. Fundamentación Teórica y Arquitecturas de Referencia

PRESENT_SIMPLE no parte de una red neuronal profunda convencional (black-box), no utiliza Transformers ni depende de Modelos de Lenguaje (LLMs). En su lugar, converge ideas clave de la neurocomputación y la ciencia cognitiva que resuelven problemas concretos de adaptación, plasticidad y estructura:

### A. Growing Neural Gas (GNG) — *Crecimiento Topológico*
- **Aporte conceptual:** La red incorpora nodos y conexiones de manera continua e incremental según la distribución y densidad de las observaciones.
- **Por qué nos interesa:** Evita prefijar el número de categorías o la topología de la memoria desde el inicio. La memoria crece y se reconfigura orgánicamente a medida que el sistema descubre regularidades.

### B. Adaptive Resonance Theory (ART) — *Formación y Vigilancia de Categorías*
- **Aporte conceptual:** Resuelve el dilema estabilidad-plasticidad mediante un mecanismo de vigilancia que decide si un patrón entrante resuena con una categoría existente (actualizándola) o si exige la creación de una nueva categoría prototípica.
- **Por qué nos interesa:** Impide dos fallos extremos: no crea un nodo para cada dato individual (sobreajuste trivial) ni colapsa observaciones dispares en una sola categoría (olvido catastrófico).

### C. Predictive Coding — *Expectativas y Señal de Sorpresa*
- **Aporte conceptual:** El sistema genera activamente expectativas sobre lo que debería observar a continuación. La diferencia entre lo predicho y lo observado constituye el *error de predicción*, que actúa como señal motora para ajustar representaciones internas.
- **Por qué nos interesa:** Permite detectar regularidades temporales/estructurales y proporciona una métrica cuantitativa de sorpresa para identificar desviaciones y anomalías contextuales.

### D. Memoria Asociativa y Modelos de Hopfield — *Recuperación de Patrones*
- **Aporte conceptual:** Reconstrucción de estados conocidos a partir de estímulos parciales, ruidosos o incompletos mediante mínimos de energía / convergencia de estados.
- **Por qué nos interesa:** Facilita el reconocimiento asociativo: asociar una observación con patrones conocidos aunque falten atributos o varíen valores secundarios.

### E. IA Neuro-Simbólica — *Interpretabilidad y Relaciones Explícitas*
- **Aporte conceptual:** Fusión de representaciones estadísticas aprendidas con grafos de conocimiento, entidades explícitas y reglas de inferencia.
- **Por qué nos interesa:** La memoria no es una colección de tensores opacos. Conserva qué representa cada nodo, qué relaciones guarda con otros y qué evidencia respalda cada conclusión.

---

## 2. ¿Por qué NO una arquitectura Mixture of Experts (MoE)?

La decisión de descartar MoE como núcleo fundacional responde a un análisis de pertinencia técnica:

- **Problema que resuelve MoE:** Repartir la capacidad de computación en modelos neuronales profundos masivos activando únicamente subredes especializadas mediante mecanismos de enrutamiento (*gating networks*).
- **Problema de PRESENT_SIMPLE:** Construir representaciones relacionales transparentes a partir de datos estructurados heterogéneos, aprendiendo de forma incremental y explicable.
- Que una entrada sea un archivo Excel y otra un JSON no requiere dos redes neuronales que compitan por procesar los datos; requiere adaptadores de ingesta e interpretación semántica precisos que generen observaciones compatibles con un núcleo de aprendizaje común.
- MoE introduce complejidad de balanceo de carga, entrenamiento concurrente y opacidad que contradice los principios de minimalismo e interpretabilidad del proyecto.

---

## 3. Arquitectura Propuesta: Núcleo de Aprendizaje Adaptativo

La arquitectura sintetiza una base híbrida:
$$\text{Aprendizaje Topológico (GNG)} + \text{Vigilancia de Categorías (ART)} + \text{Codificación Predictiva} + \text{Memoria Relacional Explicable}$$

```text
                                  ┌───────────────────────────┐
                                  │      01 · PERCEPCIÓN      │
                                  │  (Adaptadores por formato │
                                  │   y tipado de observación)│
                                  └─────────────┬─────────────┘
                                                │ Observación tipada
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 02 · NÚCLEO COGNITIVO                                     │
│                                                                                           │
│      ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────────┐   │
│      │ Formación Categorías  │  │ Crecimiento Topología │  │  Predicción y Sorpresa  │   │
│      │   (Inspiración ART)   │  │   (Inspiración GNG)   │  │ (Inspiración Pred. Cod.)│   │
│      │ Vigilancia & Prototipos│ │ Nodos & Enlaces Dinám.│  │ Expectativa vs Realidad │   │
│      └───────────┬───────────┘  └───────────┬───────────┘  └────────────┬────────────┘   │
│                  │                          │                           │                 │
│                  └──────────────────┐       │       ┌───────────────────┘                 │
│                                     ▼       ▼       ▼                                     │
│                             ┌───────────────────────────────┐                             │
│                             │   03 · MEMORIA RELACIONAL     │                             │
│                             │          (Grafo Activo)       │                             │
│                             │ Prototipos · Coocurrencias    │                             │
│                             │ Pesos · Historial · Topología │                             │
│                             └───────────────┬───────────────┘                             │
└─────────────────────────────────────────────┼─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                               04 · ANÁLISIS Y EXPLICACIÓN                                 │
│                                                                                           │
│   Triple Evaluación ante estímulo nuevo:                                                  │
│   1. Semejanza (¿Encaja con algún prototipo existente?)                                    │
│   2. Relaciones (¿Coherente con los enlaces estructurales aprendidos?)                    │
│   3. Predicción (¿Genera sorpresa o contradice la expectativa contextual?)                 │
│                                                                                           │
│   Veredicto explicable:  [Patrón Conocido]  |  [Novedad Legítima]  |  [Anomalía Candidata] │
│   + Evidencia trazable y grado de confianza.                                              │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │     05 · VISUALIZACIÓN    │
                                │ (UI Python/Tkinter Grafo) │
                                └───────────────────────────┘
```

### El Grafo como Componente Activo de Aprendizaje
En arquitecturas convencionales, el grafo suele ser una base de datos pasiva donde se almacena información. En PRESENT_SIMPLE, **el grafo es el propio motor de cómputo y aprendizaje**:
- Sus nodos representan prototipos o estados adaptativos con umbrales locales.
- Sus aristas representan asociaciones estadísticas, transiciones temporales y restricciones de coocurrencia moduladas por plasticidad.
- El aprendizaje actualiza pesos, poda conexiones redundantes y expande la red ante evidencia sólida.

---

## 4. Dinámica de Aprendizaje: Novedad vs. Anomalía

Cuando el sistema recibe una observación, no emite juicios binarios precipitados. Ejecuta una **evaluación en tres dimensiones**:

1. **Semejanza métrica/categórica:** ¿Qué tan cerca está de un prototipo existente dentro del radio de vigilancia?
2. **Topología relacional:** ¿Aparece en un contexto de coocurrencia coherente con los vecinos observados en el grafo?
3. **Error de predicción:** ¿El estado anterior del sistema anticipaba esta observación o rompe la secuencia esperada?

### Gestión de la Plasticidad
- **Patrón conocido:** Refuerza los prototipos y las aristas de conexión existentes.
- **Novedad legítima:** Una observación que no coincide con prototipos previos pero que, al repetirse o presentarse en un contexto estructurado, fomenta la creación de un nuevo nodo y conexiones estables.
- **Anomalía candidata:** Una observación que exhibe alta rareza intrínseca, viola las relaciones topológicas aprendidas o genera un pico inusual de error predictivo, manteniéndose aislada sin confirmación estadística.

---

## 5. El Problema de la Entrada: Percepción por Modalidades Progresivas

«Cualquier dato» no puede significar «una única bolsa indiferenciada». Los formatos de archivo son contenedores; comprender su contenido requiere representaciones semánticas bien calibradas.

La percepción se estructura en fases de madurez progresiva:

| Nivel | Entradas | Capacidades Iniciales | Representación |
| :---: | :--- | :--- | :--- |
| **I** | **CSV, JSON, Excel** | Valores tipados, categorías, asociaciones campo-valor, frecuencia y desviaciones puntuales. | Observaciones tabulares y jerárquicas tipadas con procedencia explícita. |
| **II** | **TXT y Secuencias** | N-gramas, fragmentos recurrentes, transiciones sintácticas y patrones secuenciales. | Tokens, secuencias discretas y ventanas deslizantes de transición. |
| **III** | **Series Temporales y Flujos** | Dinámica temporal, deriva de concepto (*concept drift*), predicción de tendencias y cambios de régimen. | Ventanas continuas de estados, diferencias de primer orden y expectativas dinámicas. |
| **IV** | **Formatos Complejos (Imágenes, Audio)** | Mecanismos de percepción espacial/espectral específicos (fase futura). | Descriptores de características antes de integrarse al grafo de memoria común. |

*Estrategia:* Todos los niveles convergen en el mismo núcleo cognitivo y memoria relacional, manteniendo especializados únicamente los módulos de percepción.

---

## 6. Marco de Validación Experimental y Ablación

Para garantizar que cada elemento de la arquitectura aporte valor medible sin inflar la complejidad innecesariamente, el desarrollo se regirá por **pruebas de ablación sistemáticas**:

1. **Prueba de aprendizaje de regularidades:** ¿Con qué precisión y velocidad converge el grafo ante patrones sintéticos controlados?
2. **Prueba del dilema estabilidad-plasticidad:** ¿Puede el sistema incorporar una nueva regularidad sin degradar o borrar los patrones aprendidos previamente (*olvido catastrófico*)?
3. **Prueba de discriminación Novedad vs. Anomalía:** ¿Distingue una mutación legítima de proceso frente a una inyección de ruido o dato corrupto?
4. **Pruebas de ablación por mecanismo:**
   - ¿Qué aporta el crecimiento de GNG frente a un grafo estático de $K$ nodos fijos?
   - ¿Qué aporta el parámetro de vigilancia ART frente a un clustering estándar (k-means)?
   - ¿Qué aporta la codificación predictiva frente a un conteo puro de coocurrencias?
5. **Eficiencia y recursos:** Medición estricta de tiempo de CPU por observación, huella de memoria RAM del grafo y velocidad de serialización en disco.

---

## 7. Decisiones Técnicas y Filosofía de Implementación

| Componente | Decisión | Fundamento |
| :--- | :--- | :--- |
| **Lenguaje** | Python | Agilidad de prototipado, legibilidad, trazabilidad matemática. |
| **Interfaz Gráfica** | Tkinter | Integrada en Python estándar, ligera, sin frameworks pesados ni dependencias web. |
| **Manejo de Datos** | Estándar (`json`, `csv`) + `openpyxl` | Mínima huella de dependencias externas. |
| **Grafo y Algoritmos** | Implementación propia | Transparencia absoluta en la mecánica de pesos, podas y distancias. |
| **Cálculo** | CPU determinista | Ejecutable en cualquier máquina estándar, sin requerir aceleración GPU dedicada. |
| **C++** | Evaluación posterior | Sólo se considerará migrar partes del motor si los perfiles de rendimiento (*profiling*) demuestran un cuello de botella real. |
| **Teoría Matemática** | Grafos y Espectros | Modelos como grafos de Ramanujan se consideran líneas teóricas de investigación espectral; **no se forzarán a priori** a menos que aporten ventajas demostrables en la difusión relacional. |

---

## 8. Estructura del Proyecto

```text
PRESENT_SIMPLE/
├── README.md                 # Carta magna, arquitectura y fundamentos
├── pyproject.toml            # Definición del paquete y dependencias de test
├── docs/                     # Especificaciones formales y notas de investigación
│   ├── theory/               # GNG, ART, Predictive Coding, Grafos
│   └── experiments/          # Protocolos experimentales y benchmarks
├── src/
│   └── present_simple/
│       ├── perception/       # Nivel I: CSV, JSON, TXT, Excel
│       ├── core/
│       │   ├── categories.py # Formación adaptativa (ART)
│       │   ├── topology.py   # Crecimiento relacional (GNG)
│       │   ├── predictive.py # Codificación predictiva y error
│       │   └── memory.py     # Grafo relacional unificado
│       ├── analysis/         # Explicabilidad, novedad y anomalías
│       ├── storage/          # Persistencia JSON estructurada
│       └── ui/               # Interfaz visual interactiva
├── tests/                    # Pruebas unitarias y de integración
└── experiments/              # Datasets sintéticos y scripts de validación
```

---

## 9. Estado del Proyecto

- **Fase actual:** Investigación arquitectónica y formulación matemática de los tres mecanismos de aprendizaje.
- **Versión:** `0.1.0` (Fase de diseño formal).
- **Consenso de diseño:** No apresurar código en `src/` hasta formalizar la interacción matemática entre vigilancia (ART), topología (GNG) y error predictivo en las observaciones de Nivel I.
