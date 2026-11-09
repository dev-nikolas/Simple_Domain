/**
 * Simple Domain — Utilidad de Sanitización Markdown
 * Auto-cierra bloques de código ``` no terminados durante el streaming SSE
 * para evitar layout jumps y parpadeos en la vista.
 */

export function sanitizeStreamingMarkdown(content: string, isStreaming: boolean): string {
  if (!isStreaming || !content) return content;
  const matches = content.match(/```/g);
  const count = matches ? matches.length : 0;
  if (count % 2 !== 0) {
    return content + '\n```';
  }
  return content;
}

