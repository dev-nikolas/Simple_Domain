# Simple Domain
**Adaptive Pattern System & Data Audit Architecture**

> **Estado del proyecto:** Sistema experimental de aprendizaje estructural y auditoría de datos.  
> **Versión del núcleo:** `0.1.0` | **Interfaz UI:** `v1.0.0` | **Licencia / Modo:** Local-Only (sin telemetría externa).  
> **Aviso metodológico:** Las capacidades adaptativas se validan incrementalmente mediante protocolos de ablación reproducibles frente a referencias deterministas.

---

## 1. Visión y Propósito del Sistema

**Simple Domain** es un sistema compacto, auditable y determinista para la ingesta, perfilado, evaluación de calidad y descubrimiento adaptativo de patrones en datos estructurados.

El sistema resuelve una necesidad operativa concreta: **auditar datos dejando evidencia explícita de qué se examinó, qué se encontró, con qué nivel de confianza y cuáles son sus limitaciones**, combinando validaciones deterministas de calidad con detectores relacionales de anomalías.

### Principio Rector
> *"Desarrollar primero el mecanismo más sencillo y verificable que resuelva el problema. La auditoría determinista debe funcionar plenamente incluso si el motor adaptativo está desactivado; cada incremento de complejidad algorítmica debe justificar su aporte mediante métricas y ablaciones reproducibles."*

---

## 2. Las Tres Áreas de Utilidad Real

Simple Domain unifica una base común (ingesta, perfilado, métricas, validación, detección de anomalías y reportes) adaptada a tres dominios de aplicación:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   BASE COMÚN DE SIMPLE DOMAIN                          │
│     Ingesta · Perfilado · Validación · Métricas · Detección · Reportes │
└──────────────────┬───────────────────┬─────────────────────────────────┘
                   │                   │
         ┌─────────┴─────────┐         │         ┌───────────────────────┐
         ▼                   ▼         │         ▼                       ▼
┌──────────────────┐┌──────────────────┐┌────────────────────────────────┐
│ DATA INTELLIGENCE││   RESEARCH LAB   ││   CYBERSECURITY DATA AUDIT     │
│ CSV, Excel, JSON ││ Benchmarks S1..Sn││ Inventarios CVE, CISA KEV      │
│ Calidad & Esquema││ Ablación & ROC   ││ Detección de discrepancias     │
│ Patrones & Deriva││ Latencia & RAM   ││ Trazabilidad de vulnerabilidad │
└──────────────────┘└──────────────────┘└────────────────────────────────┘
```

### A. Data Intelligence
- **Perfilado estructural y calidad:** Ingesta y análisis de archivos CSV, Excel y JSON; inferencia de tipos de columnas, completitud y distribuciones.
- **Descubrimiento de relaciones:** Identificación de dependencias bivariadas, compatibilidad campo-valor y coocurrencias.
- **Detección contextual:** Detección de registros atípicos que cumplen rangos univariados pero violan relaciones multidimensionales legítimas.
- **Informes auditables:** Generación de resúmenes estructurados para gobierno de datos y preparación de datasets.

### B. Research Lab
- **Evaluación empírica reproducible:** Comparación cuantitativa de detectores contra referencias elementales (Baseline 0, detectores univariados, relacionales).
- **Protocolos de ablación:** Medición de ROC-AUC, precisión, recall, F1 y tasa de falsos positivos (FPR) bajo múltiples semillas deterministas (Benchmark S1).
- **Métricas de ingeniería:** Medición de latencia de inferencia por observación, huella de memoria en RAM y eficiencia computacional en CPU, aprovechando aprendizajes metodológicos previos sin mezclar alcances.

### C. Cybersecurity Data Audit
- **Auditoría de inventarios de seguridad:** Ingesta y validación de registros de vulnerabilidades conocidas (CVE) y catálogos de amenazas activas (CISA KEV).
- **Validación de esquemas y completitud:** Identificación de campos críticos ausentes, enlaces rotos, referencias malformadas y registros duplicados.
- **Cruce de fuentes autorizadas:** Cotejo de inventarios locales frente a especificaciones oficiales para señalar discrepancias y cambios de estado.
- **Distinción analítica rigurosa:**
  - Una anomalía estadística **no** demuestra que exista un ciberataque.
  - Un registro CVE incompleto **no** implica que la vulnerabilidad sea inexistente o falsa.
  - El sistema separa con total transparencia las validaciones deterministas de las alertas probabilísticas generadas por el detector.

---

## 3. La Auditoría como Función Central

Una auditoría en Simple Domain no se reduce a un clasificador que emite una puntuación opaca. El sistema genera informes estructurados a través de **ocho dimensiones de análisis**, inspiradas en precedentes de calidad de datos como *Great Expectations*:

| Dimensión | Qué Examina | Tipo de Validación |
| :--- | :--- | :--- |
| **Integridad Estructural** | Nombres de columnas, tipos de datos, conformidad de esquema y campos obligatorios. | Determinista |
| **Completitud** | Densidad de valores presentes, valores nulos, campos vacíos y registros truncados. | Determinista |
| **Consistencia** | Coherencia lógica interna, reglas de dominio y combinaciones de valores prohibidas. | Determinista / Lógica |
| **Unicidad** | Duplicidad de registros, identificadores únicos y claves primarias repetidas. | Determinista |
| **Distribución** | Rangos admisibles, cuantiles, varianza, valores atípicos marginales y deriva estadística. | Estadística univariada |
| **Relaciones** | Compatibilidad entre pares de atributos, coocurrencias condicionales e interdependencias. | Aprendizaje Relacional |
| **Anomalías** | Registros que se apartan significativamente de los patrones consolidados en memoria. | Inferencia Adaptativa |
| **Trazabilidad** | Origen del archivo, huella hash, versión del motor, esquema utilizado y timestamp. | Auditoría técnica |

---

## 4. Arquitectura por Capas Desacoplada

La arquitectura asegura que la auditoría determinista opere con total independencia del motor adaptativo:

```text
1. FUENTES DE DATOS
   └── Archivos CSV · Libros Excel · JSON Estructurado · Exportaciones CVE / KEV

2. INGESTA Y REPRESENTACIÓN COMÚN
   └── Normalización de tipos · Inferencia de esquemas · Metadatos · Control de tamaño (64 KB)

3. AUDITORÍA DETERMINISTA (Opera sin aprendizaje)
   └── Validación de reglas · Completitud · Integridad de esquema · Trazabilidad de origen

4. MOTOR ADAPTATIVO (Pipeline Relacional)
   └── Scoring univariado (marginal surprisal) · Compatibilidad relacional · Calibración de cuantiles

5. INFORMES Y MÉTRICAS
   └── Desglose explicable (ScoreBreakdown) · Evidencia auditable · Limitaciones explícitas
```

---

## 5. Implementación Actual y Estado del Proyecto

### Backend Python (`src/simple_domain/`)
- **Baseline 0 & Benchmark S1:** Generador sintético determinista con 6 canales (2 categóricos, 4 numéricos) y 5 escenarios de evaluación (normal, variaciones, ruido, novedades, anomalías).
- **Detector Relacional (`RelationalDetector`):** Modelo bivariado que evalúa compatibilidad condicional entre variables, validado en el experimento EXP-01.
- **Pipeline Principal (`SimpleDomainPipeline`):** Fusión univariada y relacional con calibración no paramétrica por cuantiles y emisión de `ScoreBreakdown`.
- **Servicio HTTP Local (`simple_domain.service`):** API FastAPI + Uvicorn vinculada exclusivamente a `127.0.0.1:4000` con CORS local restringido y endpoints `/health`, `/v1/info` y `/v1/score`.

### Frontend UI (`frontend/`)
- **Interfaz Cyberpunk Industrial v1.0:** React 18, TypeScript y Tailwind CSS, diseñada para ejecución 100% local.
- **Navegación Lateral (Sidebar):** Menú izquierdo colapsable (`w-60` / `w-16`), adaptable a móviles con drawer superpuesto y bloqueo de scroll.
- **Diagnóstico y Telemetría Bajo Demanda:** Modal focalizado que consulta `/health` y `/v1/info` con sondeo moderado (5s) activo únicamente con ventana visible y timeout de seguridad.
- **Grafo Relacional SVG:** Visualización interactiva y accesible con teclado (<kbd>Enter</kbd> / <kbd>Espacio</kbd>) de los 6 atributos de Benchmark S1.
- **Terminal de Entrada:** Buffer local de instrucciones con teclado <kbd>Enter</kbd> y avisos transparentes de capacidades.

---

## 6. Estructura del Repositorio

```text
simple_domain/
├── README.md                                    # Marco conceptual, arquitectura y visión estratégica
├── pyproject.toml                               # Configuración de paquete Python y dependencias
├── src/
│   └── simple_domain/
│       ├── baseline0.py                         # Referencia univariada de frecuencias y cuantiles
│       ├── metrics.py                           # ROC-AUC, Precision, Recall, F1, FPR deterministas
│       ├── pipeline.py                          # SimpleDomainPipeline y ScoreBreakdown
│       ├── experiments/
│       │   ├── benchmark_s1.py                  # Generador determinista Benchmark S1
│       │   ├── run_exp00.py                     # Ejecutor reproducible Baseline 0
│       │   ├── relational.py                    # RelationalDetector bivariado
│       │   └── run_exp01.py                     # Ejecutor experimento relacional
│       └── service/
│           ├── app.py                           # Aplicación FastAPI con CORS restringido
│           ├── schemas.py                       # Esquemas Pydantic v2 de entrada y salida
│           └── server.py                        # Entrypoint Uvicorn (localhost:4000)
├── frontend/                                    # Interfaz visual React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/                          # Sidebar, TopBar, DiagnosticsModal, CoreVisualization, etc.
│   │   ├── hooks/                               # useCoreTelemetry con sondeo moderado
│   │   ├── services/                            # simpleDomainApi con timeout y tipado
│   │   └── config/                              # env.ts y endpoints.ts centralizados
│   └── README.md                                # Documentación de la UI
├── tests/                                       # Suite de pruebas automatizadas (35/35 passing)
└── docs/                                        # Síntesis teórica y reportes experimentales
```

---

## 7. Instrucciones de Ejecución Local

### Backend Python (Servicio HTTP)
```bash
# Iniciar servidor local en puerto 4000 con modelo calibrado de demostración
python -m simple_domain.service.server --port 4000 --demo-model
```

### Frontend UI (Servidor de Desarrollo)
```bash
cd frontend
npm.cmd run dev
```
Acceso en navegador: `http://127.0.0.1:5173/`

### Validación de Pruebas y Compilación
```bash
# Pruebas automatizadas del motor Python (35 pruebas)
python -m pytest

# Compilación de producción de la UI (TypeScript + Vite)
cd frontend
npm.cmd run build
```
