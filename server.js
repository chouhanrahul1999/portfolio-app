// Minimal static server for dist/ with SPA fallback
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'dist');
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function safePath(urlPath) {
  const clean = (urlPath || '/').split('?')[0].split('#')[0];
  const resolved = normalize(join(distDir, clean));
  if (!resolved.startsWith(distDir)) return distDir; // prevent path traversal
  return resolved;
}

const server = createServer(async (req, res) => {
  try {
    let requestPath = req.url === '/' ? '/index.html' : req.url || '/';
    let candidate = safePath(requestPath);
    let contentType = mimeByExt[extname(candidate).toLowerCase()] || 'application/octet-stream';

    try {
      const st = await stat(candidate);
      if (st.isDirectory()) {
        candidate = join(candidate, 'index.html');
        contentType = 'text/html; charset=utf-8';
      }
      res.setHeader('Content-Type', contentType);
      createReadStream(candidate).pipe(res);
      return;
    } catch {
      // If a top-level asset like /crtd.svg was requested, try /assets/<file>
      const fileName = (requestPath.split('?')[0] || '').split('/').pop();
      if (fileName) {
        const assetCandidate = join(distDir, 'assets', fileName);
        try {
          await stat(assetCandidate);
          const assetType = mimeByExt[extname(assetCandidate).toLowerCase()] || 'application/octet-stream';
          res.setHeader('Content-Type', assetType);
          createReadStream(assetCandidate).pipe(res);
          return;
        } catch {}
      }
      // SPA fallback to index.html for non-file routes
      const indexPath = join(distDir, 'index.html');
      const html = await readFile(indexPath);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      res.end(html);
      return;
    }
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Serving dist on http://localhost:${port}`);
});


