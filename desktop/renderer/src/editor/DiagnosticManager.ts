import type { editor } from 'monaco-editor';
import { useEditorStore, type EditorDiagnostic } from './EditorStore';

const severityMap = {
  hint: 1,
  info: 2,
  warning: 4,
  error: 8,
} as const;

export class DiagnosticManager {
  static set(path: string, diagnostics: EditorDiagnostic[]): void {
    useEditorStore.getState().setDiagnostics(path, diagnostics);
  }

  static apply(monaco: typeof import('monaco-editor'), model: editor.ITextModel): void {
    const path = model.uri.path.replace(/^\//, '');
    const diagnostics = useEditorStore.getState().diagnostics[path] ?? [];
    monaco.editor.setModelMarkers(model, 'coder', diagnostics.map((diagnostic) => ({
      ...diagnostic,
      severity: severityMap[diagnostic.severity],
    })));
  }
}
