// Simple Domain — JSON View / Serializer
// Principio de Responsabilidad Única (SRP): Serialización y encabezados HTTP/CORS.

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, errorMessage) {
  sendJson(res, statusCode, { error: errorMessage });
}

export function sendNoContent(res) {
  setCorsHeaders(res);
  res.writeHead(204);
  res.end();
}

