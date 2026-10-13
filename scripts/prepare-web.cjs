const fs = require("node:fs");
const path = require("node:path");
const file = path.resolve(__dirname, "../dist/index.html");
let html = fs.readFileSync(file, "utf8");
if (!html.includes('rel="manifest"'))
  html = html.replace(
    "</head>",
    '<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon-192.png"><meta name="theme-color" content="#ad7277"></head>',
  );
// Leave room for the home indicator when the mobile app is installed.
if (!html.includes('viewport-fit=cover'))
  html = html.replace(/(<meta name="viewport" content=")([^"]+)(")/, '$1$2, viewport-fit=cover$3');
if (!html.includes('id="mobile-safe-area"'))
  html = html.replace(
    "</head>",
    '<style id="mobile-safe-area">#mobile-bottom-nav{padding-bottom:max(12px,env(safe-area-inset-bottom,0px))!important}</style></head>',
  );
fs.writeFileSync(file, html);
