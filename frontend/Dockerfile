# ==============================================================================
# Simple Domain — Frontend Container (Production Multi-Stage)
# ==============================================================================

# Etapa 1: Build de TypeScript y Vite
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx ultra-ligero
FROM nginx:alpine-slim

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]

