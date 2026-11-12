// Simple Domain — Chat Controller (Adaptador I/O y Orquestación HTTP)
// Principio de Responsabilidad Única (SRP):
// El controlador solo se encarga de la validación HTTP I/O, control DoS de carga útil,
// y delegación de la inferencia al ChatOrchestratorService.

import { parseJsonBody } from '../utils/httpBodyParser.mjs';
import { sendError } from '../views/jsonView.mjs';
import { ChatOrchestratorService } from '../services/ChatOrchestratorService.mjs';
import { classifyQueryIntent, INTENT } from './cognitiveRouter.mjs';

const FAST_GREETING_MESSAGE = "¡Hola! Soy RELIC. El motor neuro-simbólico está listo y en línea. ¿En qué te ayudo hoy?";

export function checkFastConversationalBypass(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const intent = classifyQueryIntent(userMessage);
  if (intent === INTENT.GREETING) {
    return FAST_GREETING_MESSAGE;
  }
  return null;
}

/**
 * Fábrica de controlador con Inyección de Dependencias (DIP / SRP).
 * @param {object} sessionStore
 * @param {object} memoryStore
 * @returns {Function}
 */
export function buildChatHandler(sessionStore, memoryStore) {
  const orchestrator = new ChatOrchestratorService(sessionStore, memoryStore);

  return function handleChatCompletion(req, res) {
    return parseJsonBody(req, res, 1024 * 512, async (payload) => {
      if (!payload) return;
      try {
        await orchestrator.dispatch({ res, payload });
      } catch (err) {
        console.error('[ChatController] Error orquestando inferencia:', err);
        if (!res.headersSent) {
          sendError(res, 500, 'Error interno del despachador conversacional');
        } else {
          res.end();
        }
      }
    });
  };
}

/**
 * Adaptador de compatibilidad para el enrutador MVC y tests de integración.
 */
export function handleChatCompletion(reqOrParams, maybeRes) {
  let req, res, sessionStore, memoryStore, relicEngineUrl, conversationalEngineUrl;

  if (reqOrParams && reqOrParams.req && reqOrParams.res) {
    req = reqOrParams.req;
    res = reqOrParams.res;
    sessionStore = reqOrParams.sessionStore;
    memoryStore = reqOrParams.relicMemoryStore;
    relicEngineUrl = reqOrParams.relicEngineUrl;
    conversationalEngineUrl = reqOrParams.conversationalEngineUrl;
  } else {
    req = reqOrParams;
    res = maybeRes;
  }

  const orchestrator = new ChatOrchestratorService(sessionStore, memoryStore);

  return parseJsonBody(req, res, 1024 * 512, async (payload) => {
    if (!payload) return;
    try {
      await orchestrator.dispatch({
        res,
        payload,
        relicEngineUrl,
        conversationalEngineUrl,
      });
    } catch (err) {
      console.error('[ChatController] Error orquestando inferencia:', err);
      if (!res.headersSent) {
        sendError(res, 500, 'Error interno del despachador conversacional');
      } else {
        res.end();
      }
    }
  });
}
