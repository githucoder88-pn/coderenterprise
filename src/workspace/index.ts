/**
 * Workspace Engine — Module Index
 */

// Types
export * from './types.js';

// File operations
export { FileService, type IFileService, type TreeNode } from './files/file-service.js';

// AST / Editors
export { AstParser } from './editors/ast-parser.js';

// Search engines
export { KeywordSearchEngine } from './search/keyword-search.js';
export { SemanticSearchEngine } from './search/semantic-search.js';
export { RegexSearchEngine } from './search/regex-search.js';
export { AstSearchEngine } from './search/ast-search.js';
export { HybridSearchEngine } from './search/hybrid-search.js';

// Diff & Patches
export { DiffEngine } from './diff/diff-engine.js';
export { PatchService, type IPatchService } from './patches/patch-service.js';

// Indexing
export { WorkspaceIndexer, type IIndexer } from './indexing/indexer.js';

// Snapshots & Backups
export { SnapshotService, type ISnapshotService } from './snapshots/snapshot-service.js';
export { BackupService, type IBackupService } from './snapshots/backup-service.js';

// Embeddings
export { EmbeddingService, type IEmbeddingService } from './embeddings/embedding-service.js';
