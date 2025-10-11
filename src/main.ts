import '../bun-shims/register-better-sqlite3.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure child Node processes always preload the better-sqlite3 shim.
(() => {
  const shimPath = path.resolve(__dirname, '../bun-shims/register-better-sqlite3.js');
  const requireFlag = `--require ${shimPath}`;
  const current = process.env.NODE_OPTIONS ?? '';
  if (!current.includes(requireFlag)) {
    process.env.NODE_OPTIONS = current.length ? `${requireFlag} ${current}` : requireFlag;
  }
})();

function resolveClaudeFlowRoot(): string {
  const candidates: string[] = [];

  if (process.env.CLAUDE_FLOW_ROOT) {
    candidates.push(process.env.CLAUDE_FLOW_ROOT);
  }

  candidates.push(path.resolve(__dirname, '../node_modules/claude-flow'));

  const bunGlobal = typeof Bun !== 'undefined' && typeof Bun.which === 'function' ? Bun.which('claude-flow') : null;
  if (bunGlobal) {
    const candidate = path.resolve(path.dirname(bunGlobal), '../node_modules/claude-flow');
    candidates.push(candidate);
  }

  if (process.env.BUN_INSTALL_CACHE) {
    candidates.push(path.join(process.env.BUN_INSTALL_CACHE, 'install', 'global', 'node_modules', 'claude-flow'));
  }

  const home = os.homedir();
  if (home) {
    candidates.push(path.join(home, '.bun', 'install', 'global', 'node_modules', 'claude-flow'));
    candidates.push(path.join(home, '.cache', '.bun', 'install', 'global', 'node_modules', 'claude-flow'));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const binPath = path.join(candidate, 'bin', 'claude-flow.js');
    if (existsSync(binPath)) {
      return candidate;
    }
  }

  console.error('[claude-flow:bun] Could not locate claude-flow installation.');
  console.error('Please install it globally with: bun install -g claude-flow@alpha');
  process.exit(1);
}

function patchFile(root: string, relativePath: string, searchValue: string, replaceValue: string): void {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) return;
  const content = readFileSync(fullPath, 'utf-8');
  if (content.includes(replaceValue)) return;
  if (!content.includes(searchValue)) return;
  const updated = content.replace(searchValue, replaceValue);
  writeFileSync(fullPath, updated, 'utf-8');
  console.log(`[claude-flow:bun] Patched ${relativePath}`);
}

function patchClaudeFlow(root: string): void {
  const targets = [
    ['dist/src/cli/simple-commands/coordination.js', 'const isAvailable = await checkRuvSwarmAvailable();', 'let isAvailable = await checkRuvSwarmAvailable();'],
    ['dist/src/cli/simple-commands/swarm.js', 'const swarmPrompt = `You are orchestrating a Claude Flow Swarm using Claude Code\'s Task tool for agent execution.', 'let swarmPrompt = `You are orchestrating a Claude Flow Swarm using Claude Code\'s Task tool for agent execution.'],
    ['dist/src/cli/simple-commands/hive-mind.js', 'const hiveMindPrompt = generateHiveMindPrompt', 'let hiveMindPrompt = generateHiveMindPrompt'],
    ['src/cli/simple-commands/coordination.js', 'const isAvailable = await checkRuvSwarmAvailable();', 'let isAvailable = await checkRuvSwarmAvailable();'],
    ['src/cli/simple-commands/swarm.js', 'const swarmPrompt = `You are orchestrating a Claude Flow Swarm using Claude Code\'s Task tool for agent execution.', 'let swarmPrompt = `You are orchestrating a Claude Flow Swarm using Claude Code\'s Task tool for agent execution.'],
    ['src/cli/simple-commands/hive-mind.js', 'const hiveMindPrompt = generateHiveMindPrompt', 'let hiveMindPrompt = generateHiveMindPrompt'],
  ];

  for (const [relativePath, searchValue, replaceValue] of targets) {
    patchFile(root, relativePath, searchValue, replaceValue);
  }
}

const claudeFlowRoot = resolveClaudeFlowRoot();
patchClaudeFlow(claudeFlowRoot);

try {
  const packageJsonPath = path.join(claudeFlowRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    if (pkg?.version) {
      process.env.CLAUDE_FLOW_VERSION = pkg.version;
    }
  }
} catch (error) {
  console.warn('[claude-flow:bun] Unable to determine version from package.json');
}

const entryUrl = pathToFileURL(path.join(claudeFlowRoot, 'bin', 'claude-flow.js')).href;
await import(entryUrl);
