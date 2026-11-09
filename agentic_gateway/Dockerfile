# ==============================================================================
# Agentic Gateway — Orquestador SSE + RELIC MCP (MVC Architecture)
# ==============================================================================

FROM node:22-slim

WORKDIR /app

# Instalar dependencias del sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar manifiesto de dependencias
COPY package*.json ./
RUN npm install --omit=dev || true

# Copiar estructura modular completa
COPY config.mjs server.mjs mcpClient.mjs ./
COPY controllers/ ./controllers/
COPY models/ ./models/
COPY views/ ./views/
COPY routes/ ./routes/
COPY tools/ ./tools/

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV RELIC_SERVER_URL=http://relic_ai:8080

EXPOSE 3000

CMD ["node", "server.mjs"]
