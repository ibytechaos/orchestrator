const Module = require('module');
const path = require('path');

if (process.versions?.bun) {
  const shimPath = path.resolve(__dirname, 'better-sqlite3.js');
  const resolvedBetterSqlite = Module._resolveFilename('better-sqlite3', {
    id: 'bun-shim-loader',
    filename: shimPath,
    paths: Module._nodeModulePaths(process.cwd()),
  });

  const shimModule = Module.createRequire(shimPath)(shimPath);

  Module._cache[resolvedBetterSqlite] = {
    id: resolvedBetterSqlite,
    filename: resolvedBetterSqlite,
    loaded: true,
    exports: shimModule,
    children: [],
    paths: [],
  };

  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
    if (request === 'better-sqlite3') {
      return resolvedBetterSqlite;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
}
