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
    let path = raw === '/' ? '/index.html' : raw;
    if (path === '/app') path = '/ris.html';
    if (path === '/ris') path = '/ris.html';
    if (path === '/templates') path = '/templates.html';
    if (path === '/billing') path = '/reception.html';
    if (path === '/admin') path = '/admin.html';
    if (path === '/records') path = '/records.html';
    if (path === '/portal') path = '/patient-portal.html';
    if (/^\/portal\/[^/]+$/.test(path)) path = '/patient-portal.html';
    if (/^\/report\/[^/]+$/.test(path)) path = '/report.html';
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
