import '../bun-shims/register-better-sqlite3.js';
import { CLI } from 'claude-flow/dist/src/cli/cli-core.js';
import { setupCommands } from 'claude-flow/dist/src/cli/commands/index.js';

export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const cli = new CLI('claude-flow', 'Advanced AI Agent Orchestration System');
  setupCommands(cli);
  await cli.run(args);
}

const currentModulePath = new URL(import.meta.url).pathname;
const invokedPath = process.argv[1];
const isMainModule = Boolean(
  invokedPath &&
    (invokedPath === currentModulePath || invokedPath.endsWith('/main.js') || invokedPath.endsWith('/main.ts')),
);

if (isMainModule) {
  runCli().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
