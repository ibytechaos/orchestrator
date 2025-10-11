import { plugin } from 'bun';
import path from 'path';

plugin({
  name: 'claude-flow-resolvers',
  setup(builder) {
    builder.onLoad({ filter: /^node:fs\/promises$/ }, () => ({
      contents: `import * as actual from 'fs/promises';
export * from 'fs/promises';
export const promises = actual;
export default actual;`,
      loader: 'js',
    }));

    builder.onResolve({ filter: /swarm-memory\.js$/ }, (args) => {
      const specifier = args.path;
      if (
        specifier === '../../memory/swarm-memory.js' ||
        specifier === '../memory/swarm-memory.js' ||
        specifier.endsWith('claude-flow/dist/src/memory/swarm-memory.js')
      ) {
        return { path: path.resolve('node_modules/claude-flow/src/memory/swarm-memory.ts') };
      }
      return null;
    });

    builder.onResolve({ filter: /commander-fix\.js$/ }, (args) => {
      const specifier = args.path;
      if (
        specifier === '../commander-fix.js' ||
        specifier === './commander-fix.js' ||
        specifier.endsWith('claude-flow/dist/src/cli/commander-fix.js')
      ) {
        return { path: path.resolve('node_modules/claude-flow/src/cli/commander-fix.ts') };
      }
      return null;
    });

    builder.onResolve({ filter: /scripts\/init-neural\.js$/ }, () => ({
      path: path.resolve('shims/init-neural.js'),
    }));

    builder.onResolve({ filter: /scripts\/init-goal\.js$/ }, () => ({
      path: path.resolve('shims/init-goal.js'),
    }));

    builder.onResolve({ filter: /package\.json$/ }, (args) => {
      if (args.importer && args.importer.includes('claude-flow')) {
        return {
          path: path.resolve('node_modules/claude-flow/package.json'),
          namespace: 'claude-flow-package-json',
        };
      }
      return null;
    });

    builder.onLoad({ filter: /.*/, namespace: 'claude-flow-package-json' }, async () => ({
      contents: await Bun.file(path.resolve('node_modules/claude-flow/package.json')).text(),
      loader: 'json',
    }));
  },
});
