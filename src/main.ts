import '../bun-shims/register-better-sqlite3.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NODE_MODULES_DIR = process.env.NODE_MODULES_DIR?.trim() || null;

// Embedded shim sources ensure bun compile binaries can recreate the patch payload.
const BETTER_SQLITE3_PACKAGE_JSON = '{\n  "name": "better-sqlite3",\n  "version": "0.0.0-bun-shim",\n  "main": "index.js"\n}\n';

const BETTER_SQLITE3_SHIM_BASE64 =
  'Y29uc3QgeyBEYXRhYmFzZTogQnVuRGF0YWJhc2UgfSA9IHJlcXVpcmUoJ2J1bjpzcWxpdGUnKTsKCmZ1bmN0aW9uIG5vcm1hbGl6ZUJpbmRpbmdzKGFyZ3MpIHsKICBpZiAoYXJncy5sZW5ndGggIT09IDEpIHsKICAgIHJldHVybiBhcmdzOwogIH0KICBjb25zdCBbdmFsdWVdID0gYXJnczsKICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHsKICAgIHJldHVybiBhcmdzOwogIH0KICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXModmFsdWUpOwogIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgewogICAgcmV0dXJuIGFyZ3M7CiAgfQogIGNvbnN0IGhhc1BsYWNlaG9sZGVyUHJlZml4ID0gZW50cmllcy5ldmVyeSgoW2tleV0pID0+IC9eW0A6JF0vLnRlc3Qoa2V5KSk7CiAgaWYgKGhhc1BsYWNlaG9sZGVyUHJlZml4KSB7CiAgICByZXR1cm4gYXJnczsKICB9CiAgY29uc3Qgbm9ybWFsaXplZCA9IHt9OwogIGZvciAoY29uc3QgW2tleSwgdmFsXSBvZiBlbnRyaWVzKSB7CiAgICBub3JtYWxpemVkW2BAJHtrZXl9YF0gPSB2YWw7CiAgICBub3JtYWxpemVkW2A6JHtrZXl9YF0gPSB2YWw7CiAgICBub3JtYWxpemVkW2AkJHtrZXl9YF0gPSB2YWw7CiAgfQogIHJldHVybiBbbm9ybWFsaXplZF07Cn0KCmNsYXNzIFN0YXRlbWVudFdyYXBwZXIgewogIGNvbnN0cnVjdG9yKHN0YXRlbWVudCwgdmVyYm9zZSkgewogICAgdGhpcy5zdGF0ZW1lbnQgPSBzdGF0ZW1lbnQ7CiAgICB0aGlzLnZlcmJvc2UgPSB2ZXJib3NlOwogIH0KCiAgcnVuKC4uLmFyZ3MpIHsKICAgIGlmICh0aGlzLnZlcmJvc2UpIHsKICAgICAgdGhpcy52ZXJib3NlKHRoaXMuc3RhdGVtZW50LnRvU3RyaW5nKCkpOwogICAgfQogICAgcmV0dXJuIHRoaXMuc3RhdGVtZW50LnJ1biguLi5ub3JtYWxpemVCaW5kaW5ncyhhcmdzKSk7CiAgfQoKICBnZXQoLi4uYXJncykgewogICAgcmV0dXJuIHRoaXMuc3RhdGVtZW50LmdldCguLi5ub3JtYWxpemVCaW5kaW5ncyhhcmdzKSk7CiAgfQoKICBhbGwoLi4uYXJncykgewogICAgcmV0dXJuIHRoaXMuc3RhdGVtZW50LmFsbCguLi5ub3JtYWxpemVCaW5kaW5ncyhhcmdzKSk7CiAgfQoKICBpdGVyYXRlKC4uLmFyZ3MpIHsKICAgIHJldHVybiB0aGlzLnN0YXRlbWVudC5pdGVyYXRlKC4uLm5vcm1hbGl6ZUJpbmRpbmdzKGFyZ3MpKTsKICB9CgogIGJpbmQoLi4uYXJncykgewogICAgdGhpcy5zdGF0ZW1lbnQuYmluZCguLi5ub3JtYWxpemVCaW5kaW5ncyhhcmdzKSk7CiAgICByZXR1cm4gdGhpczsKICB9CgogIHJhdyhlbmFibGVkID0gdHJ1ZSkgewogICAgaWYgKHR5cGVvZiB0aGlzLnN0YXRlbWVudC5yYXcgPT09ICdmdW5jdGlvbicpIHsKICAgICAgdGhpcy5zdGF0ZW1lbnQucmF3KGVuYWJsZWQpOwogICAgICByZXR1cm4gdGhpczsKICAgIH0KICAgIHRocm93IG5ldyBFcnJvcignU3RhdGVtZW50LnJhdygpIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIEJ1biBiZXR0ZXItc3FsaXRlMyBzaGltJyk7CiAgfQoKICBwbHVjayhlbmFibGVkID0gdHJ1ZSkgewogICAgaWYgKHR5cGVvZiB0aGlzLnN0YXRlbWVudC5wbHVjayA9PT0gJ2Z1bmN0aW9uJykgewogICAgICB0aGlzLnN0YXRlbWVudC5wbHVjayhlbmFibGVkKTsKICAgICAgcmV0dXJuIHRoaXM7CiAgICB9CiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0YXRlbWVudC5wbHVjaygpIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIEJ1biBiZXR0ZXItc3FsaXRlMyBzaGltJyk7CiAgfQoKICBleHBhbmQoZW5hYmxlZCA9IHRydWUpIHsKICAgIGlmICh0eXBlb2YgdGhpcy5zdGF0ZW1lbnQuZXhwYW5kID09PSAnZnVuY3Rpb24nKSB7CiAgICAgIHRoaXMuc3RhdGVtZW50LmV4cGFuZChlbmFibGVkKTsKICAgICAgcmV0dXJuIHRoaXM7CiAgICB9CiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0YXRlbWVudC5leHBhbmQoKSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBCdW4gYmV0dGVyLXNxbGl0ZTMgc2hpbScpOwogIH0KCiAgY29sdW1ucygpIHsKICAgIGlmICh0eXBlb2YgdGhpcy5zdGF0ZW1lbnQuY29sdW1ucyA9PT0gJ2Z1bmN0aW9uJykgewogICAgICByZXR1cm4gdGhpcy5zdGF0ZW1lbnQuY29sdW1ucygpOwogICAgfQogICAgcmV0dXJuIFtdOwogIH0KfQoKY2xhc3MgQmV0dGVyU3FsaXRlM1NoaW0gewogIGNvbnN0cnVjdG9yKGZpbGVuYW1lID0gJzptZW1vcnk6Jywgb3B0aW9ucyA9IHt9KSB7CiAgICBjb25zdCB1c2VNZW1vcnkgPSBvcHRpb25zLm1lbW9yeSB8fCBmaWxlbmFtZSA9PT0gJzptZW1vcnk6JzsKICAgIGNvbnN0IHRhcmdldCA9IHVzZU1lbW9yeSA/ICc6bWVtb3J5OicgOiBmaWxlbmFtZTsKICAgIGNvbnN0IG9wZW5PcHRpb25zID0gewogICAgICByZWFkd3JpdGU6ICEob3B0aW9ucy5yZWFkb25seSB8fCBvcHRpb25zLnJlYWRPbmx5KSwKICAgICAgcmVhZG9ubHk6ICEhKG9wdGlvbnMucmVhZG9ubHkgfHwgb3B0aW9ucy5yZWFkT25seSksCiAgICAgIGNyZWF0ZTogIW9wdGlvbnMuZmlsZU11c3RFeGlzdCwKICAgIH07CiAgICB0aGlzLmZpbGVuYW1lID0gdGFyZ2V0OwogICAgdGhpcy52ZXJib3NlID0gdHlwZW9mIG9wdGlvbnMudmVyYm9zZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMudmVyYm9zZSA6IG51bGw7CiAgICB0aGlzLmRhdGFiYXNlID0gbmV3IEJ1bkRhdGFiYXNlKHRhcmdldCwgb3Blbk9wdGlvbnMpOwogIH0KCiAgcHJlcGFyZShzcWwpIHsKICAgIGlmICh0aGlzLnZlcmJvc2UpIHsKICAgICAgdGhpcy52ZXJib3NlKHNxbCk7CiAgICB9CiAgICBjb25zdCBzdGF0ZW1lbnQgPSB0aGlzLmRhdGFiYXNlLnByZXBhcmUoc3FsKTsKICAgIHJldHVybiBuZXcgU3RhdGVtZW50V3JhcHBlcihzdGF0ZW1lbnQsIHRoaXMudmVyYm9zZSk7CiAgfQoKICBleGVjKHNxbCkgewogICAgY29uc3QgdGV4dCA9IEFycmF5LmlzQXJyYXkoc3FsKSA/IHNxbC5qb2luKCdcbicpIDogc3FsOwogICAgaWYgKHRoaXMudmVyYm9zZSkgewogICAgICB0aGlzLnZlcmJvc2UodGV4dCk7CiAgICB9CiAgICB0aGlzLmRhdGFiYXNlLmV4ZWModGV4dCk7CiAgICByZXR1cm4gdGhpczsKICB9CgogIGV4ZWN1dGUoc3FsKSB7CiAgICByZXR1cm4gdGhpcy5leGVjKHNxbCk7CiAgfQoKICBwcmFnbWEoc3RhdGVtZW50LCBvcHRpb25zID0ge30pIHsKICAgIGNvbnN0IHRleHQgPSBgUFJBR01BICR7c3RhdGVtZW50fWA7CiAgICBpZiAodGhpcy52ZXJib3NlKSB7CiAgICAgIHRoaXMudmVyYm9zZSh0ZXh0KTsKICAgIH0KICAgIGNvbnN0IGhhc0Fzc2lnbm1lbnQgPSAvPS8udGVzdChzdGF0ZW1lbnQpOwogICAgaWYgKG9wdGlvbnMuc2ltcGxlKSB7CiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuZGF0YWJhc2UucXVlcnkodGV4dCkuZ2V0KCk7CiAgICAgIGlmICghcmVzdWx0IHx8IHR5cGVvZiByZXN1bHQgIT09ICdvYmplY3QnKSB7CiAgICAgICAgcmV0dXJuIHJlc3VsdDsKICAgICAgfQogICAgICBjb25zdCBbZmlyc3RLZXldID0gT2JqZWN0LmtleXMocmVzdWx0KTsKICAgICAgcmV0dXJuIHJlc3VsdFtmaXJzdEtleV07CiAgICB9CiAgICBpZiAoaGFzQXNzaWdubWVudCkgewogICAgICB0aGlzLmRhdGFiYXNlLmV4ZWModGV4dCk7CiAgICAgIHJldHVybiB1bmRlZmluZWQ7CiAgICB9CiAgICByZXR1cm4gdGhpcy5kYXRhYmFzZS5xdWVyeSh0ZXh0KS5hbGwoKTsKICB9CgogIHRyYW5zYWN0aW9uKGZuKSB7CiAgICBjb25zdCB0eCA9IHRoaXMuZGF0YWJhc2UudHJhbnNhY3Rpb24oKC4uLmFyZ3MpID0+IGZuKC4uLmFyZ3MpKTsKICAgIHJldHVybiAoLi4uYXJncykgPT4gdHgoLi4uYXJncyk7CiAgfQoKICBjbG9zZSgpIHsKICAgIHRoaXMuZGF0YWJhc2UuY2xvc2UoKTsKICB9CgogIGxvYWRFeHRlbnNpb24oKSB7CiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NRTGl0ZSBleHRlbnNpb25zIGFyZSBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBCdW4gYmV0dGVyLXNxbGl0ZTMgc2hpbScpOwogIH0KfQoKbW9kdWxlLmV4cG9ydHMgPSBCZXR0ZXJTcWxpdGUzU2hpbTsKbW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IEJldHRlclNxbGl0ZTNTaGltOwptb2R1bGUuZXhwb3J0cy5EYXRhYmFzZSA9IEJldHRlclNxbGl0ZTNTaGltOwo=';

const BETTER_SQLITE3_SHIM_SOURCE = Buffer.from(BETTER_SQLITE3_SHIM_BASE64, 'base64').toString('utf-8');

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
  try {
    const require = createRequire(import.meta.url);
    const resolvedPackageJson = require.resolve('claude-flow/package.json');
    const candidate = path.dirname(resolvedPackageJson);
    const binPath = path.join(candidate, 'bin', 'claude-flow.js');
    if (existsSync(binPath)) {
      return candidate;
    }
  } catch {
    // Ignore resolution failures and fall back to manual search.
  }

  const candidates: string[] = [];

  if (NODE_MODULES_DIR) {
    candidates.push(path.join(NODE_MODULES_DIR, 'claude-flow'));
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

function installBetterSqlite3Shim(targetDir: string, label: string): void {
  const indexPath = path.join(targetDir, 'index.js');
  const packageJsonPath = path.join(targetDir, 'package.json');

  mkdirSync(targetDir, { recursive: true });

  const shimSource = BETTER_SQLITE3_SHIM_SOURCE;
  const desiredPackageJson = BETTER_SQLITE3_PACKAGE_JSON;
  let updated = false;

  if (!existsSync(indexPath) || readFileSync(indexPath, 'utf-8') !== shimSource) {
    writeFileSync(indexPath, shimSource, 'utf-8');
    updated = true;
  }

  if (!existsSync(packageJsonPath) || readFileSync(packageJsonPath, 'utf-8') !== desiredPackageJson) {
    writeFileSync(packageJsonPath, desiredPackageJson, 'utf-8');
    updated = true;
  }

  if (updated) {
    const displayPath = path.isAbsolute(targetDir) ? path.relative(process.cwd(), targetDir) : targetDir;
    console.log(`[claude-flow:bun] Installed better-sqlite3 shim for ${label} at ${displayPath || '.'}`);
  }
}

const claudeFlowRoot = resolveClaudeFlowRoot();
installBetterSqlite3Shim(path.join(claudeFlowRoot, 'node_modules', 'better-sqlite3'), 'claude-flow');
patchClaudeFlow(claudeFlowRoot);

function resolveSiblingPackage(baseRoot: string, packageName: string): string | null {
  const candidate = path.resolve(baseRoot, '..', packageName);
  const packageJson = path.join(candidate, 'package.json');
  return existsSync(packageJson) ? candidate : null;
}

function resolvePackageRoot(packageName: string): string | null {
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve(`${packageName}/package.json`);
    return path.dirname(resolved);
  } catch {
    return null;
  }
}

const siblingPackages = ['ruv-swarm', 'flow-nexus'];
for (const packageName of siblingPackages) {
  let root = resolvePackageRoot(packageName);
  if (!root) {
    root = resolveSiblingPackage(claudeFlowRoot, packageName);
  }
  if (!root) {
    const localCandidate = path.resolve(__dirname, '../node_modules', packageName);
    if (existsSync(path.join(localCandidate, 'package.json'))) {
      root = localCandidate;
    }
  }
  if (!root && NODE_MODULES_DIR) {
    const envCandidate = path.join(NODE_MODULES_DIR, packageName);
    if (existsSync(path.join(envCandidate, 'package.json'))) {
      root = envCandidate;
    }
  }
  if (root) {
    installBetterSqlite3Shim(path.join(root, 'node_modules', 'better-sqlite3'), packageName);
  } else {
    console.warn(`[claude-flow:bun] Could not locate ${packageName}; skipping shim installation.`);
  }
}

if (NODE_MODULES_DIR) {
  const globalBetterSqlite3Dir = path.join(NODE_MODULES_DIR, 'better-sqlite3');
  installBetterSqlite3Shim(globalBetterSqlite3Dir, 'NODE_MODULES_DIR');
}

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
