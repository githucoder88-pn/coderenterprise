import { useMemo } from 'react';

function splitMarkdown(content: string) {
  const parts: Array<{ type: 'code' | 'text'; value: string; lang?: string }> = [];
  const pattern = /```([\w-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    parts.push({ type: 'code', lang: match[1], value: match[2] });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
  return parts;
}

function TextBlock({ value }: { value: string }) {
  const lines = value.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-2" />;
        if (/^\s*[-*]\s+/.test(line)) return <div key={index} className="pl-3 before:mr-2 before:content-['•']">{line.replace(/^\s*[-*]\s+/, '')}</div>;
        if (/^#{1,3}\s/.test(line)) return <div key={index} className="font-semibold text-[var(--color-text)]">{line.replace(/^#{1,3}\s/, '')}</div>;
        if (/^\|.*\|$/.test(line)) return <pre key={index} className="overflow-x-auto rounded bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]">{line}</pre>;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  const parts = useMemo(() => splitMarkdown(content), [content]);
  return (
    <div className="space-y-3 whitespace-normal break-words">
      {parts.map((part, index) => part.type === 'code' ? (
        <div key={index} className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[#0d1117]">
          <div className="flex h-7 items-center justify-between border-b border-white/10 px-3 text-[10px] uppercase tracking-wide text-slate-400">
            <span>{part.lang || 'text'}</span>
            <button onClick={() => void navigator.clipboard?.writeText(part.value)} className="normal-case tracking-normal hover:text-white">Copy</button>
          </div>
          <pre className="overflow-x-auto p-3 text-[12px] leading-5 text-slate-100"><code>{part.value}</code></pre>
        </div>
      ) : <TextBlock key={index} value={part.value} />)}
    </div>
  );
}
