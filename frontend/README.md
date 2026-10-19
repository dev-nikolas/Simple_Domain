# SIMPLE DOMAIN — UX/UI FOUNDATION v1.0
### Full Audit & Repair · Clean Code · Accessibility · Responsive Layout

Interfaz visual cyberpunk industrial para **Simple Domain**, construida con **React**, **TypeScript**, **Vite** y **Tailwind CSS**.



## 1. Diagnóstico y Telemetría Real

- **`GET /health`**: Estado del servicio (`ok`), disponibilidad del detector (`READY` o `UNPREPARED`) y mensaje de preparación.
- **`GET /v1/info`**: Versiones, capacidades algorítmicas (`univariate_scoring`, `relational_compatibility`, etc.) y configuración pública del modelo.
- Sin datos inventados ni métricas simuladas de CPU, GPU o memoria.

---

## 2. Comandos de Validación

### Compilación Frontend
```bash
cd frontend
npm.cmd run build
```

### Pruebas Automatizadas Backend
```bash
pytest tests/
```
35/35 pruebas pasando exitosamente.
