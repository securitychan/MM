const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4175);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
    }[ext] || "application/octet-stream"
  );
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(requestUrl.pathname);
  const requestedPath =
    cleanPath === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, cleanPath);
  const normalized = path.normalize(requestedPath);

  if (!normalized.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(normalized, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": getContentType(normalized),
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

http.createServer(serveStatic).listen(PORT, HOST, () => {
  console.log(`Trade history analyzer running at http://${HOST}:${PORT}`);
});
