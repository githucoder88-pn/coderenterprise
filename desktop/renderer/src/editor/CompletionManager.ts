import type * as Monaco from 'monaco-editor';

export class CompletionManager {
  private static registered = false;

  static register(monaco: typeof Monaco): void {
    if (CompletionManager.registered) return;
    CompletionManager.registered = true;

    const languages = ['typescript', 'javascript', 'json', 'markdown', 'css', 'html'];
    for (const language of languages) {
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', '/', '@', '#'],
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          return {
            suggestions: [
              {
                label: 'TODO: describe next step',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'TODO: ${1:describe next step}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Lightweight local snippet. Provider-backed suggestions can be routed through the existing orchestrator without changing APIs.',
                range,
              },
            ],
          };
        },
      });

      monaco.languages.registerInlineCompletionsProvider(language, {
        provideInlineCompletions(model, position) {
          const prefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
          if (!/console\.$/.test(prefix)) return { items: [], dispose: () => undefined };
          return {
            items: [{ insertText: 'log()', range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column) }],
            dispose: () => undefined,
          };
        },
        disposeInlineCompletions: () => undefined,
      });
    }
  }
}
