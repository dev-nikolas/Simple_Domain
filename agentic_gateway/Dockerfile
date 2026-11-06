# ==============================================================================
# Agentic Gateway — Orquestador SSE + RELIC MCP
# ==============================================================================

FROM node:22-slim

WORKDIR /app

# Instalar dependencias del sistema mínimas si fueran requeridas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos del package y código del gateway
COPY package.json ./
RUN npm install --omit=dev || true

COPY *.mjs ./

ENV NODE_ENV=production
ENV PORT=3000
ENV RELIC_SERVER_URL=http://relic_ai:8080

EXPOSE 3000

CMD ["node", "server.mjs"]
