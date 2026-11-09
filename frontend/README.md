# Simple Domain — Frontend HUD

Interfaz web de usuario basada en una estética **Cyberpunk HUD (Kitsch 2077 / Edgerunners)**. Construida con **React 18**, **TypeScript**, **Vite** y **Tailwind CSS**, con una arquitectura de componentes modulares donde **ningún archivo supera las 180 líneas de código**.

---

## 1. Características Principales

- **Cyberpunk HUD Kitsch:** Estética con bordes biselados (`clip-path`), barras de telemetría de seguridad (`SEC LEVEL [01][02][03][04]`), medidor de sesiones (`08 / 18 SESS`), tipografía `Rajdhani` / `Orbitron` y paleta neón ámbar/cian.
- **Selector de Cartuchos LoRA (`CartridgeSelector.tsx`):** Cambio dinámico de dominio técnico (Auto, Sistemas, Ciberseguridad, GIS_Datos) con telemetría de adaptación y latencia.
- **Drawer de Memoria Episódica (`EpisodicMemoryDrawer.tsx`):** Inspección y gestión de las conclusiones persistidas por el motor de inferencia RELIC.
- **Feedback de Sandbox (`SandboxFeedbackCard.tsx`):** Tarjetas interactivas que muestran código de salida, salida estándar y errores de bloques de código verificados por el microkernel.
- **Acordeón de Herramientas MCP (`ToolExecutionCard.tsx`):** Desglose colapsable de llamadas a herramientas y sus argumentos.
- **Editor de Código con Resaltado Sintáctico (`CodeBlock.tsx`):** Resaltado Prism `vscDarkPlus`, contador de líneas y botón de copiado.

---

## 2. Estructura de Componentes

```text
src/
├── components/          # Componentes visuales HUD (< 180 líneas)
│   ├── CartridgeSelector.tsx     # Selector de cartucho LoRA/BM25
│   ├── EpisodicMemoryDrawer.tsx  # Drawer lateral de conclusiones técnicas
│   ├── EpisodicRuleForm.tsx      # Formulario de alta de memoria
│   ├── EpisodicRuleItem.tsx      # Elemento de regla en lista
│   ├── SandboxFeedbackCard.tsx   # Tarjeta de validación determinista
│   ├── ToolExecutionCard.tsx     # Acordeón de ejecución de herramientas
│   ├── CodeBlock.tsx             # Resaltado de sintaxis Prism
│   ├── MessageHeader.tsx         # Identificador de rol y telemetría
│   ├── TopBar.tsx                # Barra superior de estado y métricas
│   ├── CommandInput.tsx          # Consola de entrada de comandos
│   └── SidebarSessions.tsx       # Navegación y menú contextual de sesiones
│
├── hooks/               # Hooks de React desacoplados
│   ├── useChat.ts                # Orquestador del estado de chat
│   ├── useChatStream.ts          # Lógica de consumo de streams SSE
│   └── useChatSessions.ts        # Sincronización y persistencia de sesiones
│
├── services/            # Clientes de red y streaming
│   ├── relicClient.ts            # Cliente HTTP hacia el Gateway
│   ├── relicStreamService.ts     # Procesamiento de eventos en tiempo real
│   ├── relicMemoryService.ts     # Conector para la memoria episódica
│   └── sessionsApi.ts            # API de sesiones
│
├── views/               # Vistas principales
│   ├── HomeView.tsx              # Vista raíz
│   ├── ChatFeed.tsx              # Feed de mensajes y scroll
│   └── QuickActionTiles.tsx      # Acciones rápidas de inicio
│
└── types/               # Tipos TypeScript de dominio y API
```

---

## 3. Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con Hot Module Replacement (:5173)
npm run dev

# Compilación y verificación de tipos para producción
npm run build

# Ejecución de pruebas unitarias
npm test
```

---

## 4. Variables de Entorno

| Variable | Descripción |
| :--- | :--- |
| `VITE_GATEWAY_URL` | URL del Agentic Gateway (por defecto `http://localhost:3000`) |

