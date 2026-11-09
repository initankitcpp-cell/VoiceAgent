import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleLocalization } from '../server/localization';

export default async function handler(
  request: IncomingMessage & { body?: unknown },
  response: ServerResponse,
) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers))
    if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
  let body = request.body;
  if (body === undefined && request.method === 'POST') {
    let raw = '';
    for await (const chunk of request) {
      raw += chunk.toString();
      if (raw.length > 4096) {
        response.writeHead(413);
        response.end('Request too large');
        return;
      }
    }
    body = raw;
  }
  const result = await handleLocalization(
    new Request(`https://${request.headers.host ?? 'localhost'}${request.url}`, {
      method: request.method,
      headers,
      body:
        request.method === 'POST'
          ? typeof body === 'string'
            ? body
            : JSON.stringify(body)
          : undefined,
    }),
    process.env,
  );
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(await result.text());
}
