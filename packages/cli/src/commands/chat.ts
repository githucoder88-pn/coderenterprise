/**
 * coder chat — Interactive conversation command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api, CLIError } from '../services/api.js';
import { get } from '../config/store.js';
import { createConversation, addMessage, getMessages, listConversations, getConversation } from '../storage/conversation-store.js';
import { input } from '@inquirer/prompts';
import { renderMarkdown } from '../ui/markdown.js';

export const chatCommand = new Command('chat')
  .description('Start or continue a conversation')
  .option('-p, --provider <provider>', 'AI provider to use')
  .option('-m, --model <model>', 'Model to use')
  .option('-c, --continue', 'Continue last conversation')
  .option('-s, --system <prompt>', 'System prompt')
  .option('--no-stream', 'Disable streaming')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    const provider = opts.provider ?? get('defaultProvider');
    const model = opts.model ?? get('defaultModel');
    const stream = opts.stream !== false && get('streamByDefault');

    let conversationId: string = '';

    // Continue last conversation
    if (opts.continue) {
      const recent = listConversations(1);
      if (recent.length > 0) {
        conversationId = recent[0]!.id;
        console.log(chalk.dim(`Continuing: ${recent[0]!.title}`));
      }
    }

    // Create or use conversation
    if (!conversationId) {
      const spinner = ora('Creating conversation…').start();
      try {
        const conv = await api.createConversation({
          workspaceId: 'default',
          model: model ?? 'gpt-4o',
          provider: provider ?? 'openai',
          systemPrompt: opts.system,
        });
        conversationId = conv.id;
        createConversation(conv.title ?? 'New conversation', model ?? undefined, provider ?? undefined);
        spinner.succeed('Conversation started');
      } catch (error) {
        spinner.fail('Failed to create conversation');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    }

    // Interactive loop
    console.log(chalk.dim('\nType your message. Use /exit to quit, /clear to clear screen.\n'));

    while (true) {
      try {
        const message = await input({ message: chalk.cyan('You: ') });

        if (message.trim() === '') continue;
        if (message === '/exit' || message === '/quit') {
          console.log(chalk.dim('Goodbye.'));
          break;
        }
        if (message === '/clear') {
          console.clear();
          continue;
        }

        addMessage(conversationId, 'user', message);

        if (stream) {
          process.stdout.write(chalk.green('\nAssistant: '));
          let fullResponse = '';

          try {
            for await (const chunk of api.streamMessage(conversationId, { content: message, model: model ?? undefined, provider: provider ?? undefined })) {
              process.stdout.write(chunk);
              fullResponse += chunk;
            }
            console.log('\n');
            addMessage(conversationId, 'assistant', fullResponse, model ?? 'default', provider ?? 'default');
          } catch (error) {
            console.log('');
            console.error(chalk.red(`Stream error: ${error instanceof Error ? error.message : String(error)}`));
          }
        } else {
          const spinner = ora('Thinking…').start();
          try {
            const result = await api.sendMessage(conversationId, { content: message, model: model ?? undefined, provider: provider ?? undefined });
            spinner.stop();

            const response = result.response ?? result.content ?? '';
            if (opts.json) {
              console.log(JSON.stringify(result, null, 2));
            } else {
              console.log(chalk.green('\nAssistant: ') + renderMarkdown(response) + '\n');
            }
            addMessage(conversationId, 'assistant', response, model ?? 'default', provider ?? 'default');
          } catch (error) {
            spinner.fail('Request failed');
            console.error(chalk.red(error instanceof Error ? error.message : String(error)));
          }
        }
      } catch {
        // Ctrl+C
        console.log(chalk.dim('\nGoodbye.'));
        break;
      }
    }
  });
