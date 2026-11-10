/**
 * Simple Domain — Utilidad de Sanitización Markdown y Normalización LaTeX/KaTeX
 * Auto-cierra bloques de código ``` y bloques matemáticos $$ durante el streaming SSE,
 * y normaliza delimitadores LaTeX (\[...\], \(...\), \boxed{...}) para KaTeX.
 */

export function normalizeLatexMath(text: string): string {
  if (!text) return text;
  let out = text;

  // Normalizar \[ ... \] a $$ ... $$ con saltos de línea limpios
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `\n$$\n${body.trim()}\n$$\n`);

  // Normalizar \( ... \) a $ ... $ asegurando espacios con palabras adyacentes
  out = out.replace(/([A-Za-zÁÉÍÓÚáéíóúñÑ0-9])\\\(/g, '$1 \\(');
  out = out.replace(/\\\)([A-Za-zÁÉÍÓÚáéíóúñÑ0-9])/g, '\\) $1');
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => `$${body.trim()}$`);

  // Normalizar (\boxed{...}) a $\boxed{...}$
  out = out.replace(/\(\s*(\\boxed\{[^{}\n]+\})\s*\)/g, (_m, boxed) => `$${boxed}$`);

  // Envolver \boxed{...} sueltos que no estén ya dentro de $...$
  out = out.replace(/(^|[^$\\])(\\boxed\{[^{}\n]+\})(?!\$)/gm, (_m, prefix, boxed) => `${prefix}$${boxed}$`);

  return out;
}

export function sanitizeStreamingMarkdown(content: string, isStreaming: boolean): string {
  if (!content) return content;
  let result = normalizeLatexMath(content);

  if (!isStreaming) return result;

  const fenceMatches = result.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    result += '\n```';
  }

  const mathBlockMatches = result.match(/\$\$/g);
  if (mathBlockMatches && mathBlockMatches.length % 2 !== 0) {
    result += '\n$$';
  }

  return result;
}
