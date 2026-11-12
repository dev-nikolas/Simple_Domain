// agentic_gateway/utils/httpBodyParser.mjs
// Principio de Responsabilidad Única (SRP): Parseo seguro de cuerpos JSON HTTP con límite de tamaño (DoS protection).

import { sendError } from '../views/jsonView.mjs';

const DEFAULT_MAX_BYTES = 1024 * 1024; // 1 MB

/**
 * Parsea el cuerpo JSON de una petición HTTP de forma segura.
 * Rechaza payloads mayores a maxBytes con HTTP 413.
 * Maneja errores de transporte en el socket.
 * Soporta tanto estilo Promise (await) como estilo Callback síncrono/asíncrono.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {number|Function} [maxBytesOrCallback]
 * @param {Function} [maybeCallback]
 * @returns {Promise<any|null>}
 */
export function parseJsonBody(req, res, maxBytesOrCallback, maybeCallback) {
  let maxBytes = DEFAULT_MAX_BYTES;
  let callback = null;

  if (typeof maxBytesOrCallback === 'function') {
    callback = maxBytesOrCallback;
  } else if (typeof maxBytesOrCallback === 'number') {
    maxBytes = maxBytesOrCallback;
    if (typeof maybeCallback === 'function') {
      callback = maybeCallback;
    }
  }

  let raw = '';
  let bytesReceived = 0;
  let aborted = false;

  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const finish = (result) => {
    if (callback) {
      try {
        const ret = callback(result);
        resolvePromise(ret);
      } catch (err) {
        rejectPromise(err);
      }
    } else {
      resolvePromise(result);
    }
  };

  req.on('data', (chunk) => {
    if (aborted) return;
    bytesReceived += (chunk?.length || 0);
    if (bytesReceived > maxBytes) {
      aborted = true;
      if (typeof req.destroy === 'function') req.destroy();
      sendError(res, 413, `Payload demasiado grande (límite: ${maxBytes} bytes)`);
      return finish(null);
    }
    raw += chunk;
  });

  req.on('end', () => {
    if (aborted) return;
    if (!raw.trim()) {
      return finish({});
    }
    try {
      const parsed = JSON.parse(raw);
      finish(parsed);
    } catch {
      sendError(res, 400, 'JSON malformado');
      finish(null);
    }
  });

  if (typeof req.on === 'function') {
    req.on('error', (err) => {
      if (aborted) return;
      aborted = true;
      sendError(res, 400, `Error en la recepción de datos: ${err.message}`);
      finish(null);
    });
  }

  return promise;
}
