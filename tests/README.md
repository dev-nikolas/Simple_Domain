# Simple Domain — Test Suite & Benchmarks

Estructura organizada de validación técnica, benchmarks y pruebas del sistema.

```text
tests/
├── integration/     # Pruebas de integración de Gateway, slots KV, memoria y herramientas
├── benchmarks/      # Scripts de medición de latencia, slots y rendimiento de modelos
├── python/          # Suites de pruebas en Python (APIs, normalizadores, pipelines)
├── reports/         # Informes de comparación, matrices y artefactos de resultados
└── fixtures/        # Datos de prueba estáticos
```

### Ejecución de Pruebas

- **Pruebas de integración de Gateway:**
  ```bash
  node tests/integration/test_relic_tools_and_memory.mjs
  ```

- **Pruebas de Python:**
  ```bash
  pytest tests/python/
  ```

- **Ejecución de Benchmarks:**
  ```bash
  node tests/benchmarks/benchmark_ab_testing.mjs
  ```

