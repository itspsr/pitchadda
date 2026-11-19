import { mkdir, readFile, writeFile } from 'node:fs/promises';

const page = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('./worker.mjs', import.meta.url), 'utf8');
const output = new URL('./dist/server/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.js', output), 'const PAGE = ' + JSON.stringify(page) + ';\n' + worker);
