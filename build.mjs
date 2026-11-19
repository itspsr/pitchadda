import { mkdir, readFile, writeFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [template, worker, styles, flightStyles, coverStyles, script] = await Promise.all(
  ['index.html', 'worker.mjs', 'ui/style.css', 'ui/flight.css', 'ui/covers.css', 'ui/app.js'].map(read)
);
const page = template
  .replace('/* APP_STYLES */', () => [styles, flightStyles, coverStyles].join('\n'))
  .replace('/* APP_SCRIPT */', () => script);
const output = new URL('./dist/server/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.js', output), 'const PAGE = ' + JSON.stringify(page) + ';\n' + worker);
