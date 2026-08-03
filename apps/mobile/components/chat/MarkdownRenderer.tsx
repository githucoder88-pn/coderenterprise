/**
 * MarkdownRenderer — lightweight inline markdown renderer for mobile.
 * Handles headings, paragraphs, bold/italic/code/links, lists, blockquotes,
 * horizontal rules, tables (simple), and fenced code blocks (delegated to CodeBlock).
 *
 * This is a purpose-built renderer tuned for chat UX — no heavy markdown deps.
 */
import React, { useMemo, Fragment } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { CodeBlock } from '../code/CodeBlock';

type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string };

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; content: string }
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'code'; lang?: string; value: string }
  | { type: 'ul'; items: InlineSegment[][] }
  | { type: 'ol'; items: InlineSegment[][] }
  | { type: 'quote'; segments: InlineSegment[] }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blank' };

// ---------------- Parsing ----------------

function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let i = 0;
  let buf = '';
  const flush = () => { if (buf) { out.push({ type: 'text', value: buf }); buf = ''; } };

  while (i < text.length) {
    const ch = text[i];
    // Bold **text**
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) { flush(); out.push({ type: 'bold', value: text.slice(i + 2, end) }); i = end + 2; continue; }
    }
    // Italic *text*
    if (ch === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) { flush(); out.push({ type: 'italic', value: text.slice(i + 1, end) }); i = end + 1; continue; }
    }
    // Strikethrough ~~text~~
    if (ch === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) { flush(); out.push({ type: 'strike', value: text.slice(i + 2, end) }); i = end + 2; continue; }
    }
    // Inline code `code`
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) { flush(); out.push({ type: 'code', value: text.slice(i + 1, end) }); i = end + 1; continue; }
    }
    // Link [text](url)
    if (ch === '[') {
      const closeLabel = text.indexOf(']', i + 1);
      if (closeLabel !== -1 && text[closeLabel + 1] === '(') {
        const closeUrl = text.indexOf(')', closeLabel + 2);
        if (closeUrl !== -1) {
          flush();
          out.push({ type: 'link', value: text.slice(i + 1, closeLabel), href: text.slice(closeLabel + 2, closeUrl) });
          i = closeUrl + 1; continue;
        }
      }
    }
    // Autolink http://...
    if (text.slice(i, i + 4) === 'http') {
      const m = text.slice(i).match(/^https?:\/\/[^\s)]+/);
      if (m) {
        flush();
        out.push({ type: 'link', value: m[0], href: m[0] });
        i += m[0].length; continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || undefined;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      blocks.push({ type: 'code', lang, value: buf.join('\n') });
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length as 1 | 2 | 3, content: h[2] });
      i++; continue;
    }

    // HR
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ type: 'quote', segments: parseInline(buf.join(' ')) });
      continue;
    }

    // Table detection
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const headers = line.split('|').map((s) => s.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const cells = lines[i].split('|').map((s) => s.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
        rows.push(cells);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: InlineSegment[][] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*[-*+]\s+/, '')));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: InlineSegment[][] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*\d+\.\s+/, '')));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Blank
    if (!line.trim()) { blocks.push({ type: 'blank' }); i++; continue; }

    // Paragraph: collect until blank / block-start
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>\s?|```|\s*[-*+]\s+|\s*\d+\.\s+|.*\|\s*$)/.test(lines[i]) && !/^```/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    blocks.push({ type: 'paragraph', segments: parseInline(buf.join(' ')) });
  }

  return blocks;
}

// ---------------- Rendering ----------------

function Segments({ segments }: { segments: InlineSegment[] }) {
  const { colors, typography } = useTheme();
  return (
    <Text style={[typography.callout, { color: colors.text, lineHeight: 24 }]}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <Text key={i}>{seg.value}</Text>;
        if (seg.type === 'bold') return <Text key={i} style={{ fontWeight: '700' }}>{seg.value}</Text>;
        if (seg.type === 'italic') return <Text key={i} style={{ fontStyle: 'italic' }}>{seg.value}</Text>;
        if (seg.type === 'strike') return <Text key={i} style={{ textDecorationLine: 'line-through' }}>{seg.value}</Text>;
        if (seg.type === 'code') return (
          <Text key={i} style={{
            backgroundColor: colors.codeInlineBg, color: colors.text,
            fontFamily: 'Courier', fontSize: 13.5, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
          }}>{seg.value}</Text>
        );
        if (seg.type === 'link') return (
          <Text key={i} style={{ color: colors.primary, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(seg.href).catch(() => {})}
          >{seg.value}</Text>
        );
        return null;
      })}
    </Text>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const { colors, typography, spacing, radius } = useTheme();
  const blocks = useMemo(() => parseMarkdown(content ?? ''), [content]);

  return (
    <View style={{ gap: spacing['2'] }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return (
              <Text key={i} style={[
                b.level === 1 ? typography.title1 : b.level === 2 ? typography.title2 : typography.title3,
                { color: colors.text, marginTop: spacing['2'], marginBottom: spacing['1'] },
              ]}>{b.content}</Text>
            );
          case 'paragraph':
            return <Segments key={i} segments={b.segments} />;
          case 'code':
            return <CodeBlock key={i} code={b.value} language={b.lang} />;
          case 'ul':
            return (
              <View key={i} style={{ gap: 4, paddingLeft: 4 }}>
                {b.items.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: colors.textTertiary, marginTop: 6, fontSize: 8 }}>{'\u2B24'}</Text>
                    <View style={{ flex: 1 }}><Segments segments={item} /></View>
                  </View>
                ))}
              </View>
            );
          case 'ol':
            return (
              <View key={i} style={{ gap: 4, paddingLeft: 4 }}>
                {b.items.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: colors.textTertiary, width: 18, ...typography.footnote }}>{j + 1}.</Text>
                    <View style={{ flex: 1 }}><Segments segments={item} /></View>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={{
                borderLeftWidth: 3, borderLeftColor: colors.primary,
                paddingLeft: 12, paddingVertical: 4,
                backgroundColor: colors.primarySoft, borderRadius: radius.sm,
              }}>
                <Segments segments={b.segments} />
              </View>
            );
          case 'hr':
            return <View key={i} style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginVertical: spacing['2'] }} />;
          case 'table':
            return (
              <View key={i} style={{ borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceSecondary }}>
                  {b.headers.map((h, j) => (
                    <Text key={j} style={[styles.cell, typography.footnote, { color: colors.text, fontWeight: '700', flex: 1 }]}>{h}</Text>
                  ))}
                </View>
                {b.rows.map((row, r) => (
                  <View key={r} style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }}>
                    {row.map((cell, c) => (
                      <Text key={c} style={[styles.cell, typography.footnote, { color: colors.textSecondary, flex: 1 }]}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { paddingVertical: 8, paddingHorizontal: 10 },
});
