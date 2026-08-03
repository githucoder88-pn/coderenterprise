import { CompletionManager } from './CompletionManager';

let monacoPromise: Promise<typeof import('monaco-editor')> | null = null;

export class MonacoProvider {
  static load(): Promise<typeof import('monaco-editor')> {
    monacoPromise ??= import('monaco-editor').then((monaco) => {
      monaco.editor.defineTheme('coder-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6b7280' },
          { token: 'keyword', foreground: '93c5fd' },
          { token: 'string', foreground: '86efac' },
          { token: 'number', foreground: 'fca5a5' },
        ],
        colors: {
          'editor.background': '#0a0a0a',
          'editor.foreground': '#fafafa',
          'editorLineNumber.foreground': '#525252',
          'editorLineNumber.activeForeground': '#a3a3a3',
          'editorCursor.foreground': '#60a5fa',
          'editor.selectionBackground': '#1d4ed866',
          'editor.inactiveSelectionBackground': '#262626',
          'editorIndentGuide.background1': '#262626',
          'editorIndentGuide.activeBackground1': '#404040',
        },
      });

      monaco.editor.setTheme('coder-dark');
      const typescript = (monaco.languages as unknown as { typescript?: any }).typescript;
      typescript?.typescriptDefaults?.setCompilerOptions({
        jsx: typescript.JsxEmit?.ReactJSX,
        allowNonTsExtensions: true,
        moduleResolution: typescript.ModuleResolutionKind?.NodeJs,
        module: typescript.ModuleKind?.ESNext,
        target: typescript.ScriptTarget?.ES2022,
        strict: true,
      });
      typescript?.typescriptDefaults?.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
      CompletionManager.register(monaco);
      return monaco;
    });

    return monacoPromise;
  }
}
