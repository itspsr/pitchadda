// In-memory D1-compatible database for the dev server and exchange tests.
import { DatabaseSync } from 'node:sqlite';

export function createLocalDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  return {
    prepare(sql) {
      let bindings = [];
      const statement = () => sqlite.prepare(sql);
      return {
        bind(...values) {
          if (/\?\d+/.test(sql)) {
            const named = Object.fromEntries(values.map((value, index) => ['?' + (index + 1), value]));
            bindings = [named];
          } else {
            bindings = values;
          }
          return this;
        },
        run() { return statement().run(...bindings); },
        all() { return { results: statement().all(...bindings) }; },
        first(key) {
          const row = statement().get(...bindings);
          return key ? row?.[key] : row;
        },
      };
    },
    batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(statement => statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    close() { sqlite.close(); },
  };
}
