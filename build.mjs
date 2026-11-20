import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [template, styles, flightStyles, coverStyles, discoveryStyles, discovery, script] = await Promise.all(
  ['index.html', 'ui/style.css', 'ui/flight.css', 'ui/covers.css', 'ui/discovery.css', 'ui/discovery.js', 'ui/app.js'].map(read)
);
const page = template
  .replace('/* APP_STYLES */', () => [styles, flightStyles, coverStyles, discoveryStyles].join('\n'))
  .replace('/* APP_SCRIPT */', () => [discovery,script].join("\n"));
await build({
  absWorkingDir: root, entryPoints: ['worker.mjs'], outfile: 'dist/server/index.js',
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  define: { PAGE: JSON.stringify(page) }, loader: { '.png': 'binary' }
});
