import { plugin } from 'bun';
import path from 'path';

plugin({
  name: 'claude-flow-swarm-memory-resolver',
  setup(builder) {
    builder.onResolve({ filter: /swarm-memory\.js$/ }, (args) => {
      const specifier = args.path;
      if (
        specifier === '../../memory/swarm-memory.js' ||
        specifier === '../memory/swarm-memory.js' ||
        specifier.endsWith('claude-flow/dist/src/memory/swarm-memory.js')
      ) {
        const target = path.resolve('node_modules/claude-flow/src/memory/swarm-memory.ts');
        return { path: target };
      }
      return null;
    });
  },
});
