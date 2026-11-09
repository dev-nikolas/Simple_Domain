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
    <div className="my-3 rounded-lg overflow-hidden border border-[#232736] bg-[#090a0f] shadow-lg shadow-black/60 group relative font-mono">
      <div className="flex items-center justify-between bg-[#0e1017] px-3.5 py-1.5 text-[11px] border-b border-[#232736]/60 select-none">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-cyber-red" />
          <span className="font-bold uppercase tracking-wider text-cyber-red px-1.5 py-0.2 bg-cyber-red/10 rounded border border-cyber-red/30 text-[10px]">
            {cleanLang}
          </span>
          <span className="text-gray-500 text-[10px] hidden sm:inline">
            // {lineCount} {lineCount === 1 ? 'línea' : 'líneas'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          aria-label={`Copiar código ${cleanLang}`}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-cyber-red/15 text-gray-400 hover:text-white border border-transparent hover:border-cyber-red/40 transition-all cursor-pointer font-sans text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-cyber-red" />
              <span className="text-cyber-red font-semibold text-[11px]">COPIADO</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Copiar</span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto text-[12px] leading-relaxed">
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
