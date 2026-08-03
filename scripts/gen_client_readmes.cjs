const fs = require('fs');
const path = require('path');
const ROOT = '/home/user/coderenterprise';

// Folder hints per client
const HINTS = {
  'dashboard/src': 'Dashboard source (Next.js 15 App Router, React 19, TanStack Query).',
  'dashboard/src/app': 'Next.js App Router pages.',
  'dashboard/src/app/dashboard': 'Authenticated dashboard routes.',
  'dashboard/src/components': 'React components.',
  'dashboard/src/components/layout': 'Shell components: sidebar, topbar, app layout.',
  'dashboard/src/components/ui': 'Design-system primitives (button, card, badge, table, chart, stat).',
  'dashboard/src/hooks': 'TanStack Query hooks against the backend API.',
  'dashboard/src/lib': 'API client + utility helpers.',
  'dashboard/src/providers': 'React context providers (query, theme).',
  'dashboard/src/stores': 'Zustand stores (auth, UI).',
  'dashboard/src/styles': 'Tailwind/global styles.',
  'dashboard/src/tests': 'Vitest tests.',

  'desktop/electron': 'Electron main-process code.',
  'desktop/electron/main': 'Main process bootstrap (window lifecycle, menus).',
  'desktop/electron/preload': 'Preload script exposing a safe API bridge.',
  'desktop/electron/ipc': 'IPC handlers.',
  'desktop/electron/security': 'CSP and process-hardening policies.',
  'desktop/electron/services': 'Main-process services (api bridge, sqlite db, terminal manager).',
  'desktop/renderer': 'React 19 renderer (Vite + Tailwind).',
  'desktop/renderer/components': 'UI components.',
  'desktop/renderer/components/chat': 'Chat panel.',
  'desktop/renderer/components/editor': 'File editor pane.',
  'desktop/renderer/components/layout': 'Shell (app-shell, sidebar, title bar).',
  'desktop/renderer/components/terminal': 'xterm.js integration.',
  'desktop/renderer/lib': 'Utilities and API client.',
  'desktop/renderer/stores': 'Zustand app state.',
  'desktop/renderer/styles': 'Tailwind/global styles.',
  'desktop/renderer/views': 'Top-level views (workspace view).',
  'desktop/tests': 'Vitest unit tests.',

  'packages/cli/src': 'CLI source.',
  'packages/cli/src/commands': 'Commander commands.',
  'packages/cli/src/config': 'Configuration schema and conf-backed store.',
  'packages/cli/src/services': 'API client and helpers.',
  'packages/cli/src/storage': 'SQLite-backed conversation history.',
  'packages/cli/src/ui': 'Ink (React-for-terminals) components.',
  'packages/cli/src/tests': 'Vitest tests.',

  'packages/vscode/src': 'VS Code extension source.',
  'packages/vscode/src/authentication': 'Auth service (VS Code SecretStorage + API login).',
  'packages/vscode/src/commands': 'Command handlers registered in package.json.',
  'packages/vscode/src/providers': 'VS Code providers (hover, inline-completion, code-action).',
  'packages/vscode/src/services': 'API client, chat service, log service.',
  'packages/vscode/src/ui': 'Tree data providers for the sidebar views.',
  'packages/vscode/src/workspace': 'Workspace indexing + search.',
  'packages/vscode/src/tests': 'Vitest tests.',

  'apps/mobile/app': 'Expo Router file-based navigation.',
  'apps/mobile/app/(tabs)': 'Bottom-tab screens (Home, Chat, Workspaces, Agents, More).',
  'apps/mobile/app/conversation': 'Conversation detail screen.',
  'apps/mobile/components': 'Reusable UI components.',
  'apps/mobile/components/common': 'Core primitives (SafeLayout, Card, Icon, Pressable, OfflineBanner, TabIcon).',
  'apps/mobile/components/chat': 'Chat UI (MessageRenderer, MarkdownRenderer, Composer, MessageToolbar).',
  'apps/mobile/components/code': 'Code viewer/syntax highlighter/copy/language badge/toolbar.',
  'apps/mobile/components/voice': 'Voice recording UI (Waveform, Recorder, VoiceButton, Transcriber).',
  'apps/mobile/components/attachments': 'Image/camera/document/clipboard pickers.',
  'apps/mobile/components/sheet': 'Bottom sheet (Reanimated + Gesture Handler).',
  'apps/mobile/components/skeleton': 'Shimmer + skeleton loaders.',
  'apps/mobile/theme': 'Design tokens and ThemeProvider.',
  'apps/mobile/hooks': 'TanStack Query hooks (use-api, cached queries, biometrics).',
  'apps/mobile/lib': 'Shared client-side logic (slash commands).',
  'apps/mobile/notifications': 'Push-notification service wrapper.',
  'apps/mobile/offline': 'MMKV-backed cache, outbox queue, sync manager.',
  'apps/mobile/providers': 'React providers (AppProvider, QueryProvider).',
  'apps/mobile/security': 'Secure storage (expo-secure-store).',
  'apps/mobile/services': 'Fetch/SSE API client.',
  'apps/mobile/stores': 'Zustand stores (auth, app).',
  'apps/mobile/utils': 'Haptics wrapper, responsive breakpoints.',
  'apps/mobile/tests': 'Vitest tests.',
  'apps/mobile/assets': 'Static assets.',
};

function walk(dir){
  const out={subs:[],files:[]};
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','dist','.git','coverage','.expo'].includes(e.name))continue;
    const f=path.join(dir,e.name);
    if(e.isDirectory())out.subs.push(f);
    else if(/\.(ts|tsx|js|jsx|json)$/.test(e.name)&&!e.name.endsWith('.d.ts'))out.files.push(e.name);
  }
  return out;
}
const rel=abs=>path.relative(ROOT,abs);
function purpose(base){
  if(base==='page')return'Next.js page component.';
  if(base==='layout')return'Next.js layout component.';
  if(base==='index'||base==='main')return'Entry point / barrel.';
  if(/\.test$/.test(base))return'Unit tests.';
  if(/\.spec$/.test(base))return'Spec tests.';
  if(base==='api')return'API client.';
  if(base.endsWith('-store')||base==='stores')return'State management (Zustand).';
  if(base.includes('provider'))return'React context provider.';
  if(base.includes('hook'))return'React hook.';
  return'—';
}
function write(dir){
  const{subs,files}=walk(dir);
  const name=path.basename(dir);
  const hint=HINTS[rel(dir)]||'See parent for context.';
  const allFiles=files.sort();
  let md=`# ${name}\n\n**Purpose:** ${hint}\n\n`;
  if(subs.length){
    md+='## Subdirectories\n\n| Path | Purpose |\n|------|---------|\n';
    for(const s of subs.sort()){
      const h=HINTS[rel(s)]||'';
      md+=`| [${path.basename(s)}/](${path.basename(s)}/) | ${h} |\n`;
    }
    md+='\n';
  }
  if(allFiles.length){
    md+='## Files\n\n| File | Responsibility |\n|------|----------------|\n';
    for(const f of allFiles){
      const b=f.replace(/\.(ts|tsx|js|jsx)$/,'');
      md+=`| \`${f}\` | ${purpose(b)} |\n`;
    }
    md+='\n';
  }
  fs.writeFileSync(path.join(dir,'README.md'),md);
  for(const s of subs)write(s);
}

for (const target of ['dashboard/src','desktop/electron','desktop/renderer','desktop/tests',
  'packages/cli/src','packages/vscode/src','apps/mobile']) {
  const abs = path.join(ROOT, target);
  if (fs.existsSync(abs)) write(abs);
}

// top-level client package READMEs for dashboard/desktop/cli/vscode roots
const topLevel = {
  'dashboard': 'Web dashboard — Next.js 15, React 19, TanStack Query, Tailwind.',
  'desktop': 'Electron desktop app with embedded terminal, chat, and editor.',
  'packages/cli': 'Terminal CLI for CODER — Commander + Ink.',
  'packages/vscode': 'VS Code extension for CODER.',
  'apps/mobile': 'React Native / Expo mobile app (iOS/Android).',
};
for (const [k,v] of Object.entries(topLevel)) {
  const abs = path.join(ROOT,k);
  if(!fs.existsSync(abs)) continue;
  const subs=[];
  for(const e of fs.readdirSync(abs,{withFileTypes:true})){
    if(e.isDirectory()&&!['node_modules','dist','.git','coverage','.expo','assets'].includes(e.name))subs.push(e.name);
  }
  let md = `# ${path.basename(abs)}\n\n**Purpose:** ${v}\n\nSee the per-app documentation in \`docs/applications/<name>/\` for architecture, dependencies, and deployment.\n\n## Top-level contents\n\n`;
  for(const s of subs.sort()) md+=`- [${s}/](${s}/) — see its README\n`;
  const files=['package.json','README.md','tsconfig.json','vite.config.ts','next.config.ts','electron-builder.json','app.json','babel.config.js','vitest.config.ts','tsup.config.ts'];
  for(const f of files) if(fs.existsSync(path.join(abs,f))) md+=`- \`${f}\`\n`;
  fs.writeFileSync(path.join(abs,'README.md'),md);
}
console.log('done');
