const fs = require('fs');
const path = require('path');

const ROOT = '/home/user/coderenterprise';

const hints = {
  'src/core': 'Framework primitives: DI container, event bus, base service/repository classes, Result type.',
  'src/api': 'Hono API router that mounts all domain routes and applies middleware.',
  'src/api/routes': 'One Hono router file per domain (auth, conversations, providers, …).',
  'src/config': 'Zod-validated environment configuration.',
  'src/middleware': 'Hono middleware: auth, CORS, rate-limit, logging, security headers, error handler.',
  'src/modules': 'Domain modules (DDD): each module owns types, service, repository, and index.',
  'src/modules/auth': 'Authentication service (sign-in/up, token issuance).',
  'src/modules/users': 'User CRUD.',
  'src/modules/organizations': 'Organization CRUD and membership.',
  'src/modules/teams': 'Team management.',
  'src/modules/rbac': 'Role-based access control.',
  'src/modules/apikeys': 'API key CRUD and scope enforcement.',
  'src/modules/secrets': 'Encrypted secret storage.',
  'src/modules/audit': 'Append-only audit log.',
  'src/modules/billing': 'Billing plans and subscription lifecycle.',
  'src/modules/analytics': 'Usage, quota, invoices.',
  'src/modules/conversations': 'Conversation persistence.',
  'src/modules/notifications': 'In-app and push notification delivery.',
  'src/modules/prompts': 'Prompt library service.',
  'src/modules/models': 'Model registry.',
  'src/modules/providers': 'AI provider framework and resilience primitives.',
  'src/modules/providers/implementations': 'Concrete AI providers (OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama).',
  'src/modules/providers/resilience': 'Circuit breaker, load balancer, request queue.',
  'src/modules/extensions': 'Extension management metadata.',
  'src/modules/health': 'Liveness/readiness checks.',
  'src/modules/payments': 'Payment processor abstraction.',
  'src/modules/webhooks': 'Outbound webhook delivery with retries.',
  'src/modules/workspaces': 'Workspace metadata records.',
  'src/conversations': 'Conversation engine: streaming, context, memory, prompts, sessions.',
  'src/conversations/engine': 'Core conversation runtime.',
  'src/orchestrator': 'Multi-agent orchestration.',
  'src/orchestrator/planner': 'Task planner.',
  'src/orchestrator/execution': 'Execution engine / DAG runner.',
  'src/orchestrator/checkpoints': 'Checkpoint save/restore.',
  'src/orchestrator/registry': 'Agent type registry.',
  'src/intelligence': 'Higher-order reasoning layers.',
  'src/knowledge': 'RAG layer: indexing, memory, retrieval, summarization.',
  'src/workspace': 'Repository/workspace services.',
  'src/workspace/search': 'Search engines.',
  'src/tools': 'Built-in tools and tool registry.',
  'src/extensions': 'Runtime extension framework.',
  'src/marketplace': 'Extension marketplace services.',
  'src/enterprise': 'Enterprise-only features.',
  'src/cluster': 'Distributed clustering for horizontal scale-out.',
  'src/runtime': 'Runtime approvals/memory/policies.',
  'src/simulation': 'Benchmark/experiment harness.',
  'src/queues': 'BullMQ worker entry.',
  'src/telemetry': 'Logging, metrics, observability, OTel integrations.',
  'src/services': 'Cross-cutting services.',
  'src/services/security': 'CSRF, XSS, encryption, rate-limiter, zero-trust.',
  'src/infrastructure': 'Adapters to external services (Firebase, Redis).',
  'src/infrastructure/firebase': 'Auth, Firestore, Storage wrappers.',
  'src/infrastructure/redis': 'Redis client and cache.',
  'src/providers': 'Composition root.',
  'src/database': 'Logical schema and seed scripts.',
  'src/database/seeds': 'Seed scripts.',
  'src/types': 'Shared TypeScript types.',
  'src/tests': 'Tests and helpers.',
  'src/analytics': 'Analytics services.',
};

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const subdirs = [], files = [];
  for (const e of entries) {
    if (['node_modules','dist','.git','coverage','docs'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) subdirs.push(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) files.push(e.name);
  }
  return { subdirs, files };
}
function rel(abs){return path.relative(ROOT,abs);}
function exportsOf(dir) {
  const idx=path.join(dir,'index.ts'); if(!fs.existsSync(idx))return[];
  const text=fs.readFileSync(idx,'utf8');
  const out=new Set(); const re=/export\s+(?:const|class|function|abstract\s+class|enum|type|interface)\s+([A-Za-z0-9_]+)/g; let m;
  while((m=re.exec(text)))out.add(m[1]);
  return [...out];
}
function purpose(base){
  if(base==='index')return'Barrel file — re-exports public API of this module.';
  if(base==='types')return'TypeScript types and Zod schemas.';
  if(base.endsWith('.service'))return'Business-logic service.';
  if(base.endsWith('.repository'))return'Data access / persistence layer.';
  if(base.endsWith('.types'))return'Type definitions.';
  if(base.endsWith('.routes'))return'HTTP route handlers.';
  if(base.endsWith('.middleware'))return'Hono middleware.';
  if(base.endsWith('.tool'))return'Built-in tool exposed to agents.';
  if(base.endsWith('.test'))return'Unit tests.';
  if(base.includes('-engine'))return'Core engine logic.';
  if(base.includes('-manager'))return'Lifecycle/state manager.';
  if(base.includes('-client'))return'External-service client adapter.';
  if(base.includes('-provider'))return'Provider implementation.';
  if(base.includes('queue'))return'Queue logic.';
  return'—';
}
function write(dir) {
  const { subdirs, files } = walk(dir);
  const name = path.basename(dir);
  const hint = hints[rel(dir)] || 'Part of the CODER backend.';
  const tsFiles = files.sort();
  const exps = exportsOf(dir);
  let md = `# ${name}\n\n**Purpose:** ${hint}\n\n`;
  if (subdirs.length) {
    md += '## Subdirectories\n\n| Path | Purpose |\n|------|---------|\n';
    for (const s of subdirs.sort()) md += `| [${path.basename(s)}/](${path.basename(s)}/) | ${hints[rel(s)]||''} |\n`;
    md += '\n';
  }
  if (tsFiles.length) {
    md += '## Files\n\n| File | Responsibility |\n|------|----------------|\n';
    for (const f of tsFiles) md += `| \`${f}\` | ${purpose(f.replace(/\.(ts|tsx)$/,''))} |\n`;
    md += '\n';
  }
  if (exps.length) md += `## Public exports\n\n${exps.map(e=>'- `'+e+'`').join('\n')}\n\n`;
  md += '## Dependencies\n\n- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).\n- See `docs/FILE_RELATIONSHIPS.md` for layering rules.\n';
  fs.writeFileSync(path.join(dir,'README.md'), md);
  for (const s of subdirs) write(s);
}
write(path.join(ROOT,'src'));
console.log('done');
