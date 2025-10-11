const { Database: BunDatabase } = require('bun:sqlite');

function normalizeBindings(args) {
  if (args.length !== 1) {
    return args;
  }
  const [value] = args;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return args;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return args;
  }
  const hasPlaceholderPrefix = entries.every(([key]) => /^[@:$]/.test(key));
  if (hasPlaceholderPrefix) {
    return args;
  }
  const normalized = {};
  for (const [key, val] of entries) {
    normalized[`@${key}`] = val;
    normalized[`:${key}`] = val;
    normalized[`$${key}`] = val;
  }
  return [normalized];
}

class StatementWrapper {
  constructor(statement, verbose) {
    this.statement = statement;
    this.verbose = verbose;
  }

  run(...args) {
    if (this.verbose) {
      this.verbose(this.statement.toString());
    }
    return this.statement.run(...normalizeBindings(args));
  }

  get(...args) {
    return this.statement.get(...normalizeBindings(args));
  }

  all(...args) {
    return this.statement.all(...normalizeBindings(args));
  }

  iterate(...args) {
    return this.statement.iterate(...normalizeBindings(args));
  }

  bind(...args) {
    this.statement.bind(...normalizeBindings(args));
    return this;
  }

  raw(enabled = true) {
    if (typeof this.statement.raw === 'function') {
      this.statement.raw(enabled);
      return this;
    }
    throw new Error('Statement.raw() is not supported by the Bun better-sqlite3 shim');
  }

  pluck(enabled = true) {
    if (typeof this.statement.pluck === 'function') {
      this.statement.pluck(enabled);
      return this;
    }
    throw new Error('Statement.pluck() is not supported by the Bun better-sqlite3 shim');
  }

  expand(enabled = true) {
    if (typeof this.statement.expand === 'function') {
      this.statement.expand(enabled);
      return this;
    }
    throw new Error('Statement.expand() is not supported by the Bun better-sqlite3 shim');
  }

  columns() {
    if (typeof this.statement.columns === 'function') {
      return this.statement.columns();
    }
    return [];
  }
}

class BetterSqlite3Shim {
  constructor(filename = ':memory:', options = {}) {
    const useMemory = options.memory || filename === ':memory:';
    const target = useMemory ? ':memory:' : filename;
    const openOptions = {
      readwrite: !(options.readonly || options.readOnly),
      readonly: !!(options.readonly || options.readOnly),
      create: !options.fileMustExist,
    };
    this.filename = target;
    this.verbose = typeof options.verbose === 'function' ? options.verbose : null;
    this.database = new BunDatabase(target, openOptions);
  }

  prepare(sql) {
    if (this.verbose) {
      this.verbose(sql);
    }
    const statement = this.database.prepare(sql);
    return new StatementWrapper(statement, this.verbose);
  }

  exec(sql) {
    const text = Array.isArray(sql) ? sql.join('\n') : sql;
    if (this.verbose) {
      this.verbose(text);
    }
    this.database.exec(text);
    return this;
  }

  execute(sql) {
    return this.exec(sql);
  }

  pragma(statement, options = {}) {
    const text = `PRAGMA ${statement}`;
    if (this.verbose) {
      this.verbose(text);
    }
    const hasAssignment = /=/.test(statement);
    if (options.simple) {
      const result = this.database.query(text).get();
      if (!result || typeof result !== 'object') {
        return result;
      }
      const [firstKey] = Object.keys(result);
      return result[firstKey];
    }
    if (hasAssignment) {
      this.database.exec(text);
      return undefined;
    }
    return this.database.query(text).all();
  }

  transaction(fn) {
    const tx = this.database.transaction((...args) => fn(...args));
    return (...args) => tx(...args);
  }

  close() {
    this.database.close();
  }

  loadExtension() {
    throw new Error('SQLite extensions are not supported by the Bun better-sqlite3 shim');
  }
}

module.exports = BetterSqlite3Shim;
module.exports.default = BetterSqlite3Shim;
module.exports.Database = BetterSqlite3Shim;
