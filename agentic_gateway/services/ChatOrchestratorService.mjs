// Simple Domain — Chat Orchestrator Service (Opción A: Enrutador Cognitivo Tri-Capa)
// Principio de Responsabilidad Única (SRP):
// - Capa 1: Router Simbólico y Saludos (<1 ms, 0% CPU, sin tocar modelos)
// - Capa 2: Compilador Semántico RIR (JSON estricto, 64 tokens, puerto 8080)
// - Capa 3: Motor Conversacional SLM (puerto 8081) con contingencia local autónoma

import { config } from '../config.mjs';
import { initSSEStream, sendSSEDelta, endSSEStream } from '../views/sseView.mjs';
import { processSseStream } from '../controllers/conversationalDispatcher.mjs';
import { classifyQueryIntent, INTENT } from '../controllers/cognitiveRouter.mjs';
import { buildRirSlotPrompt, getRirInferenceParams, extractRirJson } from '../controllers/rirSlotCompiler.mjs';
import { dispatchLocalAutonomousChat } from '../controllers/localCognitiveDispatcher.mjs';

// Heurística rápida para detectar saludos o charlas que no requieren RIR/Herramientas
const CHAT_BYPASS_REGEX = /^(hola|buenos|buenas|hey|saludos|que tal|como estas|quien eres|explicame|resumen)[?!.\s]*$/i;
const FAST_GREETING_MESSAGE = "¡Hola! Soy RELIC. El motor neuro-simbólico está listo y en línea. ¿En qué te ayudo hoy?";

const MAX_FAILURES = 3;
const CIRCUIT_OPEN_MS = 15000; // 15 segundos de cuarentena

class CircuitBreaker {
  constructor(name = 'default') {
    this.name = name;
    this.failures = 0;
    this.openUntil = 0;
  }

  isOpen() {
    if (this.failures >= MAX_FAILURES) {
      if (Date.now() > this.openUntil) {
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure() {
    this.failures++;
    if (this.failures >= MAX_FAILURES) {
      this.openUntil = Date.now() + CIRCUIT_OPEN_MS;
      console.warn(`[CircuitBreaker:${this.name}] Circuito ABIERTO. Cuarentena de ${CIRCUIT_OPEN_MS}ms activada.`);
    }
  }

  recordSuccess() {
    this.failures = 0;
  }
}

export class ChatOrchestratorService {
  constructor(sessionStoreOrDeps, maybeMemoryStore, options = {}) {
    if (sessionStoreOrDeps && typeof sessionStoreOrDeps === 'object' && ('sessionStore' in sessionStoreOrDeps)) {
      this.sessionStore = sessionStoreOrDeps.sessionStore;
      this.memoryStore = sessionStoreOrDeps.memoryStore;
      this.conversationalEngineUrl = sessionStoreOrDeps.conversationalEngineUrl || config.CONVERSATIONAL_ENGINE_URL || 'http://127.0.0.1:8081/v1/chat/completions';
      this.relicCoreUrl = sessionStoreOrDeps.relicCoreUrl || config.RELIC_CORE_URL || 'http://127.0.0.1:8080/v1/chat/completions';
      this.fetchClient = sessionStoreOrDeps.fetchClient || globalThis.fetch;
    } else {
      this.sessionStore = sessionStoreOrDeps;
      this.memoryStore = maybeMemoryStore;
      this.conversationalEngineUrl = options.conversationalEngineUrl || config.CONVERSATIONAL_ENGINE_URL || 'http://127.0.0.1:8081/v1/chat/completions';
      this.relicCoreUrl = options.relicCoreUrl || config.RELIC_CORE_URL || 'http://127.0.0.1:8080/v1/chat/completions';
      this.fetchClient = options.fetchClient || globalThis.fetch;
    }
    this.circuitConv = new CircuitBreaker('conversational-8081');
    this.circuitCore = new CircuitBreaker('relic-core-8080');
  }

  async dispatch({ res, payload, relicEngineUrl, conversationalEngineUrl }) {
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const lastUser = messages.filter((m) => m.role === 'user').pop();
    const prompt = (payload.prompt || lastUser?.content || '').trim();
    const sessionId = payload.sessionId || payload.session_id;
    const cartridge = payload.cartridge || 'auto';

    // ──────────────────────────────────────────────────────────────────────────
    // CAPA 1: Router Simbólico & Cortocircuito de Saludos (<1 ms, 0% CPU)
    // ──────────────────────────────────────────────────────────────────────────
    const intent = classifyQueryIntent(prompt, cartridge);

    if (intent === INTENT.GREETING || CHAT_BYPASS_REGEX.test(prompt)) {
      initSSEStream(res);
      sendSSEDelta(res, FAST_GREETING_MESSAGE);
      endSSEStream(res);
      this.saveHistory(sessionId, prompt, FAST_GREETING_MESSAGE);
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CAPA 2: Compilador Semántico RIR para Microkernel (Puerto 8080, Cero CoT)
    // ──────────────────────────────────────────────────────────────────────────
    if (intent === INTENT.RIR_SLOTS) {
      initSSEStream(res);
      await this.routeToRelicCore(res, prompt, sessionId, payload, relicEngineUrl);
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CAPA 3: Inferencia Generativa & Conversacional (RELIC C99 Engine)
    // ──────────────────────────────────────────────────────────────────────────
    initSSEStream(res);
    const targetUrl = conversationalEngineUrl || relicEngineUrl || this.conversationalEngineUrl || this.relicCoreUrl;
    await this.routeToConversationalEngine(res, prompt, sessionId, payload, targetUrl);
  }

  async routeToConversationalEngine(res, prompt, sessionId, payload = {}, engineUrl = null) {
    const targetUrl = engineUrl || this.conversationalEngineUrl || this.relicCoreUrl;
    if (this.circuitConv.isOpen()) {
      console.warn(`[Orchestrator] CircuitBreaker (${targetUrl}) ABIERTO. Cortocircuitando a fallback inmediato.`);
      await this.executeAutonomousFallback(res, prompt, sessionId, payload.cartridge, targetUrl);
      return;
    }

    const timeoutMs = config.ENGINE_TIMEOUT_MS || 180000;

    const requestPayload = {
      model: payload.model || "relic_core",
      messages: Array.isArray(payload.messages) && payload.messages.length > 0
        ? payload.messages
        : [{ role: "user", content: prompt }],
      cartridge: payload.cartridge || 'auto',
      stream: true,
      temperature: payload.temperature !== undefined ? payload.temperature : 0.3,
      max_tokens: payload.max_tokens !== undefined ? payload.max_tokens : 256,
    };

    const connectController = new AbortController();
    const connectTimer = setTimeout(() => connectController.abort(new Error("ENGINE_CONNECT_TIMEOUT")), timeoutMs);
    let streamStarted = false;

    try {
      const response = await this.fetchClient(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: connectController.signal,
      });
      clearTimeout(connectTimer);

      if (!response.ok || !response.body) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      this.circuitConv.recordSuccess();
      streamStarted = true;
      const fullText = await processSseStream(response.body.getReader(), res);
      endSSEStream(res);
      this.saveHistory(sessionId, prompt, fullText);
    } catch (err) {
      clearTimeout(connectTimer);
      this.circuitConv.recordFailure();
      console.warn(`[Orchestrator] Motor de inferencia (${targetUrl}) inaccesible. Activando Fallback:`, err.message);
      if (!streamStarted) {
        await this.executeAutonomousFallback(res, prompt, sessionId, payload.cartridge, targetUrl);
      } else {
        endSSEStream(res);
      }
    }
  }

  async routeToRelicCore(res, prompt, sessionId, payload = {}, engineUrl = null) {
    let rawModelOutput = '';

    if (!this.circuitCore.isOpen()) {
      const targetUrl = engineUrl || this.relicCoreUrl;
      const rirPrompt = buildRirSlotPrompt(prompt);
      const rirParams = getRirInferenceParams();

      const rirPayload = {
        model: "relic_core_h1",
        messages: [
          { role: "system", content: "Extract intent and slots to JSON. Format: {\"action\":\"...\",\"slots\":{...}}" },
          { role: "user", content: rirPrompt }
        ],
        cartridge: 'rir',
        temperature: rirParams.temperature,
        max_tokens: rirParams.max_tokens || 64, // Límite estricto para evitar quemar CPU
        stop: rirParams.stop || ["<|box_end|>", "\n}"],
        stream: false
      };

      try {
        const response = await this.fetchClient(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rirPayload),
          signal: AbortSignal.timeout(config.ENGINE_TIMEOUT_MS || 5000),
        });

        if (!response.ok) {
          throw new Error(`Microkernel HTTP ${response.status}`);
        }

        this.circuitCore.recordSuccess();
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          rawModelOutput = json.choices?.[0]?.message?.content || '';
        } else if (response.body) {
          rawModelOutput = await processSseStream(response.body.getReader(), null);
        }
      } catch (err) {
        this.circuitCore.recordFailure();
        console.warn("[Orchestrator] Microkernel 8080 inaccesible para RIR:", err.message);
      }
    } else {
      console.warn("[Orchestrator] CircuitBreaker (8080) ABIERTO. Extrayendo RIR localmente sin llamada de red.");
    }

    const structured = extractRirJson(rawModelOutput || prompt);
    const outputText = "```json\n" + JSON.stringify(structured, null, 2) + "\n```";
    sendSSEDelta(res, outputText);
    endSSEStream(res);
    this.saveHistory(sessionId, prompt, outputText);
  }

  async executeAutonomousFallback(res, prompt, sessionId, cartridge = 'auto', targetUrl = null) {
    await dispatchLocalAutonomousChat({
      res,
      prompt,
      cartridge,
      sessionId,
      sessionStore: this.sessionStore,
      relicMemoryStore: this.memoryStore,
      targetUrl,
    });
  }

  saveHistory(sessionId, prompt, responseText) {
    if (sessionId && this.sessionStore && responseText) {
      this.sessionStore.addMessage(sessionId, { role: 'user', content: prompt });
      this.sessionStore.addMessage(sessionId, { role: 'assistant', content: responseText });
    }
  }
}
