/**
 * CodeBlock — syntax-highlighted, copyable, collapsible code viewer.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { tokenize, detectLanguage } from './syntax';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import * as Clipboard from 'expo-clipboard';
import { HapticsService } from '@/utils/haptics';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxInitialLines?: number;
}

export function CodeBlock({ code, language, showLineNumbers = true, maxInitialLines = 16 }: CodeBlockProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lang = useMemo(() => detectLanguage(code, language), [code, language]);
  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  const tokensByLine = useMemo(() => lines.map((line) => tokenize(line, lang)), [lines, lang]);

  const collapsed = !expanded && lines.length > maxInitialLines;
  const visibleLines = collapsed ? lines.slice(0, maxInitialLines) : lines;
  const visibleTokens = collapsed ? tokensByLine.slice(0, maxInitialLines) : tokensByLine;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      HapticsService.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const colorFor = (type: string) => {
    switch (type) {
      case 'keyword': return colors.codeKeyword;
      case 'string': return colors.codeString;
      case 'number': return colors.codeNumber;
      case 'comment': return colors.codeComment;
      case 'function': return colors.codeFunction;
      case 'type': return colors.codeType;
      case 'punct': return colors.codePunct;
      default: return colors.codeText;
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.codeBg, borderRadius: radius.lg }]}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: '#ff5f57' }]} />
          <View style={[styles.dot, { backgroundColor: '#febc2e' }]} />
          <View style={[styles.dot, { backgroundColor: '#28c840' }]} />
        </View>
        <Text style={[styles.lang, { color: colors.textTertiary }]}>{lang}</Text>
        <HPressable onPress={handleCopy} haptic="selection" style={styles.copyBtn}>
          {copied
            ? <Icon.Check size={16} color={colors.success} />
            : <Icon.Copy size={16} color={colors.textTertiary} />}
          <Text style={[styles.copyText, { color: copied ? colors.success : colors.textTertiary }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </HPressable>
      </View>

      {/* Code */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: spacing['3'] }}
      >
        <View style={styles.codeInner}>
          {visibleTokens.map((toks, i) => (
            <View key={i} style={styles.line}>
              {showLineNumbers && (
                <Text selectable={false} style={[styles.lineNum, typography.monoSm, { color: colors.textTertiary }]}>
                  {String(i + 1).padStart(String(lines.length).length, ' ')}
                </Text>
              )}
              <Text selectable style={[styles.codeText, typography.mono, { color: colors.codeText }]}>
                {toks.map((t, j) => (
                  <Text key={j} style={{ color: colorFor(t.type) }}>{t.text}</Text>
                ))}
                {i === visibleLines.length - 1 && collapsed ? null : null}
              </Text>
            </View>
          ))}
          {collapsed && (
            <Pressable onPress={() => { setExpanded(true); HapticsService.press(); }} style={styles.fade}>
              <View style={styles.fadeGradient} />
              <View style={[styles.expandBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <Icon.ChevronDown size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                  Show {lines.length - maxInitialLines} more lines
                </Text>
              </View>
            </Pressable>
          )}
          {expanded && lines.length > maxInitialLines && (
            <Pressable onPress={() => { setExpanded(false); HapticsService.press(); }} style={{ paddingTop: 6 }}>
              <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: '600' }}>Show less</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8, overflow: 'hidden' },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dots: { flexDirection: 'row', gap: 6, marginRight: 'auto' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lang: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 10 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  copyText: { fontSize: 12, fontWeight: '600' },
  codeInner: { paddingHorizontal: 12, minWidth: '100%' },
  line: { flexDirection: 'row', alignItems: 'flex-start' },
  lineNum: { width: 36, opacity: 0.6, textAlign: 'right', marginRight: 12, userSelect: 'none' },
  codeText: { flex: 1 },
  fade: { position: 'relative', marginTop: -24, paddingTop: 24 },
  fadeGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 24,
    backgroundColor: 'transparent',
  },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 4,
  },
});
