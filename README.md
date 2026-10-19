# Simple Domain

**Adaptive Pattern System**

> **Estado del documento:** Documento de investigación provisional (Fase 0: Formulación de problemas, hipótesis y protocolo experimental).  
> **Versión:** `0.1.0-research`  
> **Aviso de diseño:** Ninguna arquitectura cognitiva, combinación híbrida ni formulación matemática se asume validada ni definitiva a priori.

---

## 1. Visión y Propósito de la Investigación

Simple Domain es un proyecto experimental de ingeniería e investigación que explora el desarrollo de un sistema compacto y transparente de aprendizaje estructural adaptativo.

El objetivo central es investigar si es posible construir un sistema capaz de:
1. Observar datos heterogéneos (comenzando por estructuras tabulares y secuencias básicas).
2. Construir representaciones relacionales explícitas en memoria.
3. Descubrir regularidades y patrones recurrentes sin supervisión masiva.
4. Actualizar su memoria incrementalmente conforme llegan nuevos datos sin incurrir en olvido catastrófico.
5. Discernir rigurosamente entre variaciones legítimas, novedades estables y anomalías reales.
6. Ofrecer explicaciones auditables basadas en la evidencia utilizada.

El proyecto se fundamenta en un principio rector estricto: **diseñar primero la referencia más simple posible que exhiba una capacidad observable, y justificar cualquier incremento de complejidad mediante evidencia experimental reproducible.**

---

## 2. Los Problemas que el Sistema Debe Resolver

El diseño no parte de seleccionar algoritmos por su popularidad, sino de caracterizar cuatro problemas operacionales concretos:

1. **El dilema estabilidad-plasticidad en flujo continuo:**  
   ¿Cómo incorporar información sobre patrones no vistos previamente sin degradar ni sobreescribir las representaciones consolidadas con anterioridad?
2. **El problema de la dimensionalidad y topología no predeterminada:**  
   ¿Cómo permitir que la estructura interna de la memoria crezca o se contraiga según la riqueza intrínseca de los datos, sin fijar de antemano el número de nodos, categorías o componentes?
3. **La discriminación entre Novedad y Anomalía:**  
   ¿Cómo diferenciar una observación legítima pero infrecuente (que debería integrarse a la memoria si persiste) de un dato espurio, ruidoso o corrupto (que debe ser señalado como anomalía y no contaminar la memoria)?
4. **La explicabilidad de la evidencia:**  
   ¿Cómo garantizar que cada conclusión, expectativa o alerta emitida por el sistema pueda rastrearse hasta las observaciones, nodos y conexiones específicas que la originaron?

---

## 3. Líneas de Investigación Bajo Estudio

En lugar de imponer una arquitectura cerrada, el proyecto evalúa cinco familias conceptuales como fuentes de hipótesis:

| Línea de Investigación | Problema que Podría Resolver | Estado en el Proyecto |
| :--- | :--- | :--- |
| **Growing Neural Gas (GNG)** | Crecimiento topológico y adaptación continua de enlaces sin fijar tamaño a priori. | Hipótesis bajo estudio |
| **Adaptive Resonance Theory (ART)** | Regulación de vigilancia para crear categorías nuevas vs. actualizar existentes. | Hipótesis bajo estudio |
| **Predictive Coding** | Generación de expectativas y uso del error de predicción como señal de ajuste y sorpresa. | Hipótesis bajo estudio |
| **Memoria Asociativa (Hopfield)** | Reconstrucción de patrones conocidos a partir de datos ruidosos o incompletos. | Hipótesis bajo estudio |
| **IA Neuro-Simbólica** | Conservación de la semántica explícita, procedencia y relaciones auditables en grafos. | Hipótesis bajo estudio |

> [!IMPORTANT]
> **No asunción de aditividad:** No se asume que los cinco mecanismos deban integrarse conjuntamente, ni que sus beneficios teóricos se sumen linealmente. Cada mecanismo introduce costes computacionales, parámetros y posibles interferencias que deben medirse de forma aislada.

---

## 4. Estrategia de Percepción: Modalidades Progresivas

Para evitar la falacia de tratar "cualquier dato" como una masa homogénea indiferenciada, la entrada se estudiará en etapas secuenciales:

- **Nivel I (Foco Inicial):** Datos estructurados (CSV, JSON, tablas).  
  *Objetivo:* Probar relaciones de coocurrencia, asociaciones campo-valor y frecuencias relativas.
- **Nivel II:** Secuencias discretas y texto plano básico.  
  *Objetivo:* Probar transiciones de estado y ventanas temporales de orden corto.
- **Nivel III:** Flujos continuos y series temporales.  
  *Objetivo:* Probar expectativas predictivas continuas y detección de deriva (*concept drift*).
- **Nivel IV:** Señales complejas y multimodales (fuera del alcance inmediato).

---

## 5. Metodología Experimental y Protocolo de Ablación

Ningún módulo se incorporará al núcleo del sistema sin superar el protocolo de validación:

### A. Referencia Mínima de Comparación (Baseline 0)
Antes de evaluar mecanismos adaptativos complejos, se construirá un modelo de referencia elemental (conteo de frecuencias empíricas, clustering clásico o grafos de coocurrencia estáticos). Cualquier mecanismo propuesto deberá superar objetivamente a este baseline en tareas definidas.

### B. Pruebas con Datos Sintéticos Controlados
Se utilizarán conjuntos de datos sintéticos con propiedades rigurosamente parametrizadas:
1. **Patrones base conocidos:** Estructuras estables y periódicas generadas artificialmente.
2. **Variaciones legítimas:** Fluctuaciones estadísticas admisibles dentro del dominio.
3. **Ruido incoherente:** Perturbaciones aleatorias sin correlación estructural.
4. **Novedades controladas:** Introducción deliberada de nuevos patrones sostenidos en el tiempo.
5. **Anomalías inyectadas:** Discrepancias puntuales y violaciones de relaciones de contexto.

### C. Criterios de Evaluación Cuantitativos
1. **Calidad de reconocimiento de patrones:** Exactitud en la identificación de regularidades conocidas.
2. **Discriminación Novedad vs. Anomalía:** Tasa de verdaderos positivos en anomalías sin clasificar erróneamente novedades estables.
3. **Resistencia al olvido catastrófico:** Retención de patrones antiguos tras procesar nuevas distribuciones de datos.
4. **Eficiencia en recursos:** Huella de memoria en RAM (crecimiento de nodos/aristas) y tiempo de procesamiento por observación en CPU.
5. **Trazabilidad y Explicabilidad:** Capacidad para aislar la subestructura de memoria que motivó cada salida del sistema.

### D. Estrategia de Ablación
Cada mecanismo (vigilancia, crecimiento de aristas, señal de predicción) será desactivado y contrastado individualmente para medir su impacto neto en el rendimiento global.

---

## 6. Decisiones Arquitectónicas Aplazadas

Para mantener la integridad científica del proyecto, las siguientes decisiones quedan deliberadamente postergadas hasta contar con resultados experimentales:

- **Fórmulas matemáticas definitivas:** Las funciones de actualización y distancia se definirán operativamente durante los experimentos con Baseline 0.
- **Topologías predeterminadas:** No se impondrán restricciones espectrales o topológicas fijas (como grafos de Ramanujan) sin justificación empírica previa.
- **Persistencia en disco:** La serialización y el formato de almacenamiento se definirán cuando la estructura de memoria mínima demuestre estabilidad.
- **Interfaz gráfica de usuario:** La visualización interactiva se desarrollará una vez que las salidas del sistema y los datos a inspeccionar estén consolidados experimentalmente.

---

## 7. Estructura de Documentación del Repositorio

```text
simple_domain/
├── README.md                                    # Marco general y objetivos del proyecto
├── pyproject.toml                               # Entorno de pruebas mínimas
├── src/
│   └── simple_domain/                           # Módulos del sistema
├── docs/
│   ├── theory/
│   │   └── cognitive_core_synthesis.md          # Análisis detallado de líneas, hipótesis y protocolo
│   └── experiments/                             # Registros de pruebas y resultados empíricos
└── tests/                                       # Pruebas automatizadas de reproducibilidad
```

---

## 8. Principio Rector de Desarrollo

> *"Desarrollar primero el mecanismo más sencillo que permita comprobar una capacidad de aprendizaje observable. Cada nueva complejidad deberá justificar su incorporación mediante resultados comparables y reproducibles."*
