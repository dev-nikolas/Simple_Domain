// Simple Domain — Catálogo de Esquemas de Herramientas Locales y MCP
// Definición de esquemas de funciones según especificación OpenAI / MCP

export const LOCAL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_code_file',
      description: 'Lee el contenido de un archivo de código fuente local en el proyecto.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta relativa o absoluta del archivo a leer',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'relic_fs_modify',
      description: 'Operaciones en el sistema de archivos (lectura, creación, eliminación, listado) en directorio de cuarentena.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta relativa del archivo o carpeta',
          },
          action: {
            type: 'string',
            enum: ['read', 'create', 'write', 'delete', 'mkdir', 'list'],
            description: 'Acción a ejecutar en el sistema de archivos',
          },
          content: {
            type: 'string',
            description: 'Contenido para operaciones de escritura o creación',
          },
        },
        required: ['path', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'relic_web_search',
      description: 'Ejecuta búsquedas técnicas y documentación sin requerir API key.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Consulta técnica o documentación a buscar',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'relic_memorize',
      description: 'Registra un hallazgo o conclusión técnica en la memoria episódica persistente.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Tema o componente analizado',
          },
          conclusion: {
            type: 'string',
            description: 'Conclusión técnica para contexto futuro',
          },
        },
        required: ['topic', 'conclusion'],
      },
    },
  },
];

