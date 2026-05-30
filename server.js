// 潮汐猎人 - 本地服务器
// 使用 Node.js 内置模块，无需 npm install
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ogg':  'audio/ogg',
  '.md':   'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // 安全检查：防止目录穿越
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║    🌊 潮汐猎人 Tide Hunter MVP     ║');
  console.log('  ║                                  ║');
  console.log(`  ║  服务器已启动: http://localhost:${PORT}  ║`);
  console.log('  ║  按 Ctrl+C 关闭服务器             ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
