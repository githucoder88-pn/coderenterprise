# Broken Components

## Compile/Build Breakers

### Backend

```text

> coderenterprise-backend@1.0.0 typecheck
> tsc --noEmit

src/workspace/indexing/indexer.ts(17,103): error TS1005: ';' expected.
src/workspace/indexing/indexer.ts(17,104): error TS1109: Expression expected.
src/workspace/indexing/indexer.ts(18,20): error TS1005: ',' expected.
src/workspace/indexing/indexer.ts(18,29): error TS1005: ';' expected.
src/workspace/indexing/indexer.ts(18,35): error TS1109: Expression expected.
src/workspace/indexing/indexer.ts(19,23): error TS1005: ',' expected.
src/workspace/indexing/indexer.ts(19,32): error TS1005: ';' expected.
src/workspace/indexing/indexer.ts(20,18): error TS1005: ',' expected.
src/workspace/indexing/indexer.ts(20,27): error TS1005: ';' expected.
src/workspace/indexing/indexer.ts(21,22): error TS1005: ',' expected.
src/workspace/indexing/indexer.ts(21,31): error TS1005: ';' expected.
src/workspace/indexing/indexer.ts(22,22): error TS1005: ',' expected.
src/workspace/indexing/indexer.ts(22,31): error TS1005: ';' expected.
src/workspace/indexing/indexer.ts(23,1): error TS1128: Declaration or statement expected.

```

### Dashboard Typecheck

```text
src/hooks/use-api.ts(22,32): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/hooks/use-api.ts(30,35): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(30,41): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(34,40): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(46,40): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(77,33): error TS2322: Type 'Record<string, string> | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/hooks/use-api.ts(92,37): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(130,35): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(140,34): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(146,32): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(146,38): error TS2322: Type 'number' is not assignable to type 'string'.
src/hooks/use-api.ts(152,32): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/tests/unit/components.test.tsx(2,32): error TS2307: Cannot find module '@testing-library/react' or its corresponding type declarations.

```

### CLI Typecheck

```text
src/commands/chat.ts(11,23): error TS2307: Cannot find module '@inquirer/prompts' or its corresponding type declarations.
src/commands/chat.ts(75,20): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/commands/chat.ts(82,57): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/commands/chat.ts(87,24): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/commands/chat.ts(95,50): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/commands/chat.ts(104,24): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.
src/commands/login.ts(10,23): error TS2307: Cannot find module '@inquirer/prompts' or its corresponding type declarations.
src/commands/tools.ts(79,31): error TS2551: Property 'getToolStats' does not exist on type '{ login: (body: { email: string; password: string; }) => Promise<any>; signup: (body: { email: string; password: string; }) => Promise<any>; logout: () => Promise<void>; ... 23 more ...; searchMemory: (q: string) => Promise<...>; }'. Did you mean 'getTools'?

```

### VS Code Typecheck

```text
src/commands/editor-commands.ts(23,34): error TS2769: No overload matches this call.
  Overload 1 of 3, '(document: TextDocument, column?: ViewColumn | undefined, preserveFocus?: boolean | undefined): Thenable<TextEditor>', gave the following error.
    Argument of type 'Thenable<TextDocument>' is not assignable to parameter of type 'TextDocument'.
      Type 'Thenable<TextDocument>' is missing the following properties from type 'TextDocument': uri, fileName, isUntitled, languageId, and 14 more.
  Overload 2 of 3, '(document: TextDocument, options?: TextDocumentShowOptions | undefined): Thenable<TextEditor>', gave the following error.
    Argument of type 'Thenable<TextDocument>' is not assignable to parameter of type 'TextDocument'.
      Type 'Thenable<TextDocument>' is missing the following properties from type 'TextDocument': uri, fileName, isUntitled, languageId, and 14 more.
  Overload 3 of 3, '(uri: Uri, options?: TextDocumentShowOptions | undefined): Thenable<TextEditor>', gave the following error.
    Argument of type 'Thenable<TextDocument>' is not assignable to parameter of type 'Uri'.
      Type 'Thenable<TextDocument>' is missing the following properties from type 'Uri': scheme, authority, path, query, and 4 more.
src/commands/utility-commands.ts(32,87): error TS2339: Property 'label' does not exist on type 'string'.
src/commands/utility-commands.ts(33,76): error TS2339: Property 'label' does not exist on type 'string'.
src/commands/utility-commands.ts(49,84): error TS2339: Property 'label' does not exist on type 'string'.
src/commands/utility-commands.ts(50,73): error TS2339: Property 'label' does not exist on type 'string'.
src/commands/workspace-commands.ts(86,55): error TS2339: Property 'description' does not exist on type 'string'.
src/extension.ts(25,37): error TS2345: Argument of type 'Thenable<string | undefined>' is not assignable to parameter of type 'string'.
src/providers/inline-completion.ts(23,68): error TS2339: Property 'Explicit' does not exist on type 'typeof InlineCompletionTriggerKind'.

```

### Mobile Typecheck

```text
app/_layout.tsx(7,27): error TS2307: Cannot find module 'expo-status-bar' or its corresponding type declarations.

```

## Runtime/API Brokenness

- `/tools/*` calls from dashboard/desktop/CLI/mobile/VS Code return 404 because tools router is not mounted.
- `/workspace/*` calls from desktop/CLI/mobile/VS Code return 404 because workspace engine router is not mounted.
- `/billing-analytics/*` calls return 404 because billing analytics router is not mounted.
- `/orchestrator/*` calls return 404 because orchestrator router is not mounted.
- `/conversations/:id/send` and `/send/stream` are absent from mounted router.
