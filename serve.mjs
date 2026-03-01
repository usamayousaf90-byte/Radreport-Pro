import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve('.');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

createServer(async (req, res) => {
  try {
    const raw = (req.url || '/').split('?')[0];
    const path = raw === '/' ? '/radreport-preview.html' : raw;
    const file = join(root, path);
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:4173');
});
