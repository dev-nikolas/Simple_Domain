# ==============================================================================
# Agentic Gateway — Orquestador SSE + RELIC MCP
# ==============================================================================

# Etapa 1: Compilar relic_mcp en Rust
FROM rust:1.85-slim-bookworm AS rust_builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /relic_build

# Copiar workspace de RELIC
COPY relic/Cargo.toml relic/Cargo.lock ./
COPY relic/crates/ relic/crates/
COPY relic/benchmarks/ relic/benchmarks/

# Compilar binario relic_mcp en release
RUN cargo build --release --package relic_mcp --bin relic_mcp
RUN strip /relic_build/target/release/relic_mcp

# Etapa 2: Runtime Node.js
FROM node:22-slim

WORKDIR /app

# Instalar binario del microkernel RELIC
COPY --from=rust_builder /relic_build/target/release/relic_mcp /usr/local/bin/relic_mcp
RUN chmod +x /usr/local/bin/relic_mcp

# Copiar código del gateway
COPY llm_server/agentic_gateway/package*.json ./
COPY llm_server/agentic_gateway/ .

ENV NODE_ENV=production
ENV PORT=4000
ENV RELIC_MCP_BIN=/usr/local/bin/relic_mcp
ENV LLAMA_URL=http://llm_engine:8080/v1/chat/completions

EXPOSE 4000

CMD ["node", "server.mjs"]

