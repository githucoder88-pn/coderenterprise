/**
 * Slash command system — command palette for chat.
 */
export interface SlashCommand {
  command: string;
  description: string;
  icon: string;
  prefix?: string;
  argsHint?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/goal', description: 'Create a new goal for the agent team', icon: '🎯', prefix: '/goal ' },
  { command: '/teamwork', description: 'Run multi-agent workflow on a task', icon: '👥', prefix: '/teamwork ' },
  { command: '/review', description: 'Review the current code or file', icon: '🔍', prefix: '/review ' },
  { command: '/debug', description: 'Debug an error or stack trace', icon: '🐛', prefix: '/debug ' },
  { command: '/explain', description: 'Explain code or concept', icon: '💡', prefix: '/explain ' },
  { command: '/test', description: 'Write tests for the current code', icon: '✅', prefix: '/test ' },
  { command: '/document', description: 'Generate documentation', icon: '📄', prefix: '/document ' },
  { command: '/settings', description: 'Open settings quick actions', icon: '⚙️', prefix: '/settings' },
  { command: '/provider', description: 'Switch AI provider', icon: '☁️', prefix: '/provider ' },
  { command: '/models', description: 'Switch model', icon: '🧠', prefix: '/models ' },
];

export function matchCommand(text: string): SlashCommand[] {
  if (!text.startsWith('/')) return [];
  const q = text.slice(1).toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.command.slice(1).startsWith(q) || c.description.toLowerCase().includes(q));
}
