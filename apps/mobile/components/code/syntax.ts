/**
 * Lightweight tokenizer for syntax highlighting — JS/TS/Python/Go/Rust/JSON/YAML/HTML/CSS/SQL/Bash.
 * Returns a flat array of {type, text} tokens. Pure JS — no native dep.
 */

export type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'type' | 'punct' | 'plain';

export interface Token { type: TokenType; text: string; }

const KEYWORDS: Record<string, string[]> = {
  javascript: ['const','let','var','function','return','if','else','for','while','class','extends','new','import','export','from','default','async','await','try','catch','finally','throw','true','false','null','undefined','typeof','instanceof','in','of','switch','case','break','continue','this','super','static','yield','void','delete'],
  typescript: ['const','let','var','function','return','if','else','for','while','class','extends','new','import','export','from','default','async','await','try','catch','finally','throw','true','false','null','undefined','typeof','instanceof','in','of','switch','case','break','continue','this','super','static','yield','void','delete','interface','type','enum','implements','readonly','public','private','protected','as','namespace','declare','abstract','keyof','never','unknown','any'],
  python: ['def','class','return','if','elif','else','for','while','import','from','as','with','try','except','finally','raise','pass','break','continue','True','False','None','self','lambda','yield','global','nonlocal','in','is','not','and','or','async','await'],
  go: ['package','import','func','return','if','else','for','range','var','const','type','struct','interface','map','chan','go','select','switch','case','default','break','continue','defer','true','false','nil'],
  rust: ['fn','let','mut','const','struct','enum','impl','trait','pub','use','mod','crate','self','Self','return','if','else','for','while','loop','match','true','false','as','in','where','ref','move','async','await','unsafe','static','pub','mod','dyn','break','continue'],
  json: ['true','false','null'],
  yaml: ['true','false','null','yes','no','on','off'],
  html: [],
  css: ['important','from','to'],
  sql: ['select','from','where','insert','into','update','set','delete','create','table','drop','alter','join','inner','left','right','outer','on','group','by','order','having','limit','offset','and','or','not','null','as','distinct','union','values','primary','key','foreign','references','index','view','trigger','begin','commit','rollback','case','when','then','else','end','is','like','in','exists','between'],
  bash: ['if','then','else','elif','fi','for','do','done','while','case','esac','function','return','in','export','echo','local','read','cd','ls','cat','grep','sed','awk','cp','mv','rm','mkdir','sudo','chmod','chown'],
};

const TYPES = ['string','number','boolean','void','any','unknown','never','Array','Object','Promise','Map','Set','Date','Error','Record','Partial','Readonly','Pick','Omit','int','int32','int64','float','float32','float64','bool','string','uint','uint8','byte','rune','str','list','dict','tuple','NoneType'];

export function detectLanguage(src: string, hint?: string): string {
  if (hint) {
    const h = hint.toLowerCase().trim();
    if (KEYWORDS[h] || ['js','ts','jsx','tsx','md','bash','shell','sh','zsh','py','rb','java','c','cpp','c++','cs','swift','kotlin','php','sql'].includes(h)) {
      if (h === 'js' || h === 'jsx') return 'javascript';
      if (h === 'ts' || h === 'tsx') return 'typescript';
      if (h === 'sh' || h === 'shell' || h === 'zsh') return 'bash';
      if (h === 'py') return 'python';
      if (h === 'c' || h === 'h') return 'cpp';
      if (h === 'cs') return 'csharp';
      return h;
    }
  }
  const t = src.trimStart();
  if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) return 'html';
  if (t.startsWith('{') || t.startsWith('[')) { try { JSON.parse(t); return 'json'; } catch {} }
  if (/^#!.*\b(bash|sh|zsh)\b/.test(t)) return 'bash';
  if (/^(package |import |func )/.test(t)) return 'go';
  if (/^(fn |use |pub fn |pub struct)/.test(t)) return 'rust';
  if (/^(def |import |from |class )/.test(t) && /:\s*$/.test(t.split('\n')[0] ?? '')) return 'python';
  if (/\b(function|const|let|var|=>|import .* from )/.test(t)) return 'typescript';
  if (/\bSELECT\b|\bINSERT\b|\bCREATE TABLE\b/i.test(t)) return 'sql';
  return 'plain';
}

export function tokenize(source: string, language: string): Token[] {
  const tokens: Token[] = [];
  if (!source) return tokens;
  const lang = language.toLowerCase();
  const keywords = KEYWORDS[lang] ?? KEYWORDS.javascript;

  let i = 0;
  const len = source.length;

  const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
  const isId = (c: string) => /[A-Za-z0-9_$]/.test(c);
  const isDigit = (c: string) => /[0-9]/.test(c);
  const isHex = (c: string) => /[0-9a-fA-F]/.test(c);

  const push = (type: TokenType, text: string) => {
    if (text) tokens.push({ type, text });
  };

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    // Line comments
    if ((ch === '/' && next === '/') || (lang === 'python' && ch === '#') || (lang === 'bash' && ch === '#')) {
      let end = source.indexOf('\n', i);
      if (end === -1) end = len;
      push('comment', source.slice(i, end));
      i = end;
      continue;
    }
    // Block comments
    if (ch === '/' && next === '*') {
      let end = source.indexOf('*/', i + 2);
      if (end === -1) end = len; else end += 2;
      push('comment', source.slice(i, end));
      i = end;
      continue;
    }
    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < len) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === quote) { j++; break; }
        if (quote !== '`' && source[j] === '\n') break;
        j++;
      }
      push('string', source.slice(i, j));
      i = j;
      continue;
    }
    // Numbers
    if (isDigit(ch) || (ch === '.' && isDigit(next))) {
      let j = i;
      if (ch === '0' && (next === 'x' || next === 'X')) { j += 2; while (j < len && isHex(source[j])) j++; }
      else {
        while (j < len && (isDigit(source[j]) || source[j] === '_')) j++;
        if (source[j] === '.') { j++; while (j < len && (isDigit(source[j]) || source[j] === '_')) j++; }
        if (source[j] === 'e' || source[j] === 'E') { j++; if (source[j] === '+' || source[j] === '-') j++; while (j < len && isDigit(source[j])) j++; }
        if (source[j] === 'n') j++;
      }
      push('number', source.slice(i, j));
      i = j;
      continue;
    }
    // Identifiers / keywords
    if (isIdStart(ch)) {
      let j = i + 1;
      while (j < len && isId(source[j])) j++;
      const word = source.slice(i, j);
      const lookahead = source[j];
      // Function detection: identifier followed by '('
      if (lookahead === '(' && !keywords.includes(word)) {
        push('function', word);
      } else if (keywords.includes(word)) {
        push('keyword', word);
      } else if (/^[A-Z]/.test(word) || TYPES.includes(word)) {
        push('type', word);
      } else {
        push('plain', word);
      }
      i = j;
      continue;
    }
    // Punctuation / whitespace
    if (/\s/.test(ch)) {
      let j = i; while (j < len && /\s/.test(source[j])) j++;
      push('plain', source.slice(i, j));
      i = j;
      continue;
    }
    if (/[{}()[\];,.:+\-*/%=<>!&|^~?]/.test(ch)) {
      // Multi-char operators
      let j = i + 1;
      const two = ch + (next ?? '');
      if (['==','!=','<=','>=','&&','||','=>','++','--','+=','-=','*=','/=','??','?.','::','->','<-','..','**'].includes(two)) {
        if (ch === '.' && next === '.' && source[i+2] === '.') j = i + 3;
        else j = i + 2;
      }
      push('punct', source.slice(i, j));
      i = j;
      continue;
    }
    push('plain', ch);
    i++;
  }

  return tokens;
}
