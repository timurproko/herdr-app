// Loopback only: the production client still constructs/validates its fixed URLs.
// No test environment override or live-network fallback exists in production.
import http from 'node:http';
export async function trelloServer(handler) {
  const calls = [], server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.invalid');
    calls.push({url, method: request.method, headers: request.headers});
    Promise.resolve().then(() => handler(url, request, response)).catch(() => { if (!response.headersSent) response.writeHead(500); response.end(); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {calls, origin,
    transport: (url, options) => {
      const u = new URL(url);
      if (!['https://api.trello.com', 'https://trello.com'].includes(u.origin)) throw Error('Unfaked origin');
      return fetch(origin + u.pathname + u.search, options);
    },
    close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}
export function json(response, value, status = 200, headers = {}) {
  response.writeHead(status, {'Content-Type': 'application/json', ...headers}); response.end(JSON.stringify(value));
}
