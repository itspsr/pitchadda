import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { createLocalDatabase } from './local-db.mjs';
import worker from './dist/server/index.js';

const { values } = parseArgs({
  options: { host: { type: 'string' }, port: { type: 'string' } },
  strict: false,
});
const port = Number(values.port ?? process.env.PORT ?? 3000);
const host = values.host ?? process.env.HOST ?? '127.0.0.1';
const db = createLocalDatabase();

const server = createServer(async (incoming, outgoing) => {
  try {
    const headers = new Headers(incoming.headers);
    headers.set('oai-authenticated-user-id', 'local-founder');
    const requestHost = headers.get('x-forwarded-host') || headers.get('host');
    const protocol = headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const url = new URL(incoming.url, protocol + '://' + requestHost);
    const request = new Request(url, {
      method: incoming.method,
      headers,
      body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : incoming,
      duplex: 'half',
    });
    const response = await worker.fetch(request, { DB: db });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end('Local preview failed.');
  }
});

server.listen(port, host, () => console.log('PitchAdda development server listening on', server.address()));
