const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createAuth } = require("./auth.cjs");
const root = path.resolve(__dirname, "../dist");
const directory =
  process.env.TRESNYA_DATA_DIR || path.resolve(__dirname, "../.local");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};
(async () => {
  const auth = await createAuth(directory);
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (await auth.handle(req, res, pathname)) return;
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      let file = path.resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
        file = path.join(root, "index.html");
      fs.readFile(file, (error, data) => {
        if (error) {
          res.writeHead(404);
          res.end("Run npm.cmd run build first.");
          return;
        }
        res.writeHead(200, {
          "Content-Type":
            types[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "same-origin",
          "X-Frame-Options": "DENY",
        });
        res.end(req.method === "HEAD" ? undefined : data);
      });
    } catch {
      if (!res.headersSent)
        res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Permintaan tidak valid." }));
    }
  });
  server.listen(
    Number(process.env.PORT || 4173),
    process.env.TRESNYA_HOST || "127.0.0.1",
    () =>
      console.log(
        `TresNya: http://localhost:${process.env.PORT || 4173}\nInitial credentials are in the configured private data directory.`,
      ),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      server.close(() => {
        auth.close();
        process.exit(0);
      }),
    );
})().catch((error) => {
  console.error("Could not start TresNya:", error.message);
  process.exit(1);
});
