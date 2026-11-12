# Plan de Optimización del Núcleo y Microkernel (Enfoque 1) - COMPLETADO

**Goal:** Eliminar los 4 cuellos de botella del microkernel: implementar el búfer acumulativo de streaming UTF-8 para restaurar caracteres en español (tildes y "ñ"), estabilizar el KV-Cache eliminando el re-cómputo $O(N^2)$, implementar muestreo Top-K numéricamente estable en `sampler.rs`, y purgar el prompt del modelo nano para desacoplar el razonamiento formal hacia `reasoning_engine.rs`.

**Architecture:** Cero dependencias externas en Rust y C:
1. `ByteLevelStreamDecoder` en `relic_tokenizer`: decodificación en streaming acumulativa que retiene bytes parciales hasta formar secuencias UTF-8 válidas.
2. `KvCache`: preasignación de sesión reutilizable en `generate.rs` pasando cursor de posición mutable y saltando la proyección LM-Head en el prefill intermedio sin re-instanciar búferes por token.
3. `Sampler::sample_top_k`: filtro Top-K (K=40) con sustracción de máximo antes de exponencial para garantizar estabilidad numérica de f32.
4. Desacople CoT: modelo nano recibe entradas limpias y tareas de razonamiento formal se delegan al motor algorítmico determinista.

**Tech Stack:** Rust (crates `relic_core`, `relic_tokenizer`, `relic_server`, `relic_blackwall`, `relic_benchmarks`), C99 (`RELIC-project`), Node.js (Gateway).

---

### Task 1: Búfer Acumulativo UTF-8 en Streaming (`ByteLevelStreamDecoder`)

**Files:**
- Modify: `Simple_Domain/relic_mcp/crates/relic_tokenizer/src/byte_level.rs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_tokenizer/src/bpe.rs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_server/src/generate.rs`
- Test: `Simple_Domain/relic_mcp/crates/relic_tokenizer/tests/utf8_streaming_tests.rs`

- [x] **Step 1: Escribir el test fallido para decodificación UTF-8 en streaming**
- [x] **Step 2: Ejecutar `cargo test` para verificar el fallo**
- [x] **Step 3: Implementar `ByteLevelStreamDecoder` en `byte_level.rs` y conectar en `bpe.rs` y `generate.rs`**
- [x] **Step 4: Ejecutar `cargo test` y verificar que pasa** (`2/2 tests passed`)

---

### Task 2: Estabilización Matemática del Sampler (`sample_top_k`)

**Files:**
- Modify: `Simple_Domain/relic_mcp/crates/relic_core/src/sampler.rs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_server/src/generate.rs`
- Test: `Simple_Domain/relic_mcp/crates/relic_core/tests/sampler_top_k_tests.rs`

- [x] **Step 1: Escribir el test fallido para `sample_top_k`**
- [x] **Step 2: Ejecutar `cargo test` para verificar el fallo**
- [x] **Step 3: Implementar `sample_top_k` con selección parcial O(N) y normalización estable**
- [x] **Step 4: Conectar `sample_top_k` en `generate.rs` y verificar tests** (`3/3 tests passed`)

---

### Task 3: Optimización y Persistencia del KV-Cache en `generate.rs`

**Files:**
- Modify: `Simple_Domain/relic_mcp/crates/relic_core/src/model.rs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_core/src/kv_cache.rs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_server/src/generate.rs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_server/src/engine.rs`
- Test: `Simple_Domain/relic_mcp/crates/relic_core/tests/kv_cache_persistence_tests.rs`

- [x] **Step 1: Escribir el test de rendimiento y avance del KV-Cache**
- [x] **Step 2: Implementar optimizaciones en `model.rs` (`forward_decode_step_ex`), `kv_cache.rs` y `generate.rs` (bypasseo de LM-Head en prefill)**
- [x] **Step 3: Verificar compilación y tests con `cargo test`** (`kv_cache_persistence_tests` OK)

---

### Task 4: Desacople del Razonamiento Formal (CoT Purge & Engine Relay)

**Files:**
- Modify: `Simple_Domain/agentic_gateway/controllers/rirSlotCompiler.mjs`
- Modify: `Simple_Domain/relic_mcp/crates/relic_server/src/engine.rs`
- Test: `Simple_Domain/agentic_gateway/tests/rirSlotCompiler.test.mjs`
- Test: `Simple_Domain/relic_mcp/benchmarks/tests/validated_benchmarks_tests.rs`

- [x] **Step 1: Actualizar tests para verificar ausencia absoluta de CoT**
- [x] **Step 2: Implementar sanitización limpia y despacho formal determinista**
- [x] **Step 3: Ejecutar suite de validación cruzada** (Rust workspace OK, C99 build OK, Node Gateway 33/33 OK)
