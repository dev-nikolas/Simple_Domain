/**
 * Simple Domain — Componente Modular CodeBlock
 * Resaltado Prism, copia al portapapeles, badge de lenguaje y estética Cyberpunk HUD.
 */

import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  codeString: string;
  props?: any;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  codeString,
  props,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const cleanLang = (language || 'c').toLowerCase();
  const lineCount = codeString.split('\n').length;

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-cyber-border/70 bg-[#0d0e15] shadow-lg shadow-black/50 group relative">
      {/* Barra superior de telemetría y lenguaje */}
      <div className="flex items-center justify-between bg-[#12131d] px-3.5 py-1.5 text-[11px] font-mono border-b border-cyber-border/50 select-none">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-cyber-yellow" />
          <span className="font-bold uppercase tracking-wider text-cyber-yellow px-1.5 py-0.2 bg-cyber-yellow/10 rounded border border-cyber-yellow/30 text-[10px]">
            {cleanLang}
          </span>
          <span className="text-cyber-muted text-[10px] hidden sm:inline">
            // {lineCount} {lineCount === 1 ? 'línea' : 'líneas'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          aria-label={`Copiar código ${cleanLang}`}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-cyber-yellow/15 text-cyber-muted hover:text-cyber-yellow border border-transparent hover:border-cyber-yellow/40 transition-all cursor-pointer font-sans text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-[11px]">COPIADO</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Editor / Bloque de código con scroll horizontal suave */}
      <div className="overflow-x-auto text-[12px] leading-relaxed font-mono">
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={cleanLang}
          PreTag="div"
          showLineNumbers={lineCount > 3}
          lineNumberStyle={{
            color: '#4b5563',
            fontSize: '10px',
            minWidth: '2.5em',
            paddingRight: '1em',
            userSelect: 'none',
          }}
          customStyle={{
            margin: 0,
            padding: '12px 14px',
            background: 'transparent',
            fontSize: '11.5px',
            lineHeight: '1.6',
          }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;

