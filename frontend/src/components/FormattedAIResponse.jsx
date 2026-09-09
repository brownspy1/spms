import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export default function FormattedAIResponse({ text }) {
  if (!text) return null;

  // Split text into lines
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-200">
                <span className="text-emerald-400 mt-1 select-none text-[8px] leading-tight">●</span>
                <span className="flex-1 leading-relaxed">{formatInline(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-200">
                <span className="text-emerald-400 font-mono text-[10px] font-bold select-none mt-0.5">{idx + 1}.</span>
                <span className="flex-1 leading-relaxed">{formatInline(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headers (###, ##, #)
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-emerald-300 mt-3 mb-1 tracking-wide flex items-center gap-1.5 uppercase">
          <ChevronRight className="w-3 h-3 text-emerald-400 inline" />
          {formatInline(trimmed.substring(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-white mt-3.5 mb-1.5 border-b border-slate-800 pb-1">
          {formatInline(trimmed.substring(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-extrabold text-white mt-4 mb-2">
          {formatInline(trimmed.substring(2))}
        </h2>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(trimmed.replace(/^[-*•]\s+/, ''));
      continue;
    }

    // Numbered lists (e.g. 1. , 2. )
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(numMatch[2]);
      continue;
    }

    // Callout / Warning detection
    const isWarning = /^(warning|contraindication|caution|danger|adverse alert):/i.test(trimmed) || trimmed.startsWith('> [!WARNING]') || trimmed.startsWith('>');
    if (isWarning) {
      flushList();
      const cleanAlert = trimmed.replace(/^>\s*(\[!WARNING\])?/i, '').trim();
      elements.push(
        <div key={`warn-${i}`} className="my-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-relaxed font-medium">
            {formatInline(cleanAlert)}
          </div>
        </div>
      );
      continue;
    }

    flushList();
    elements.push(
      <p key={`p-${i}`} className="my-1.5 leading-relaxed text-slate-200 text-xs">
        {formatInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="formatted-ai-response space-y-1">{elements}</div>;
}

// Inline formatting for **bold**, *italic*, `code`
function formatInline(str) {
  if (!str) return '';
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
}
