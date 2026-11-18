import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "www");

const excluded = new Set([
  ".git",
  ".github",
  "node_modules",
  "www",
  "android",
  "scripts",
  "package.json",
  "package-lock.json",
  "capacitor.config.json",
  "README.md",
  "chat-worker.js"
]);

const allowedExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".mp3",
  ".wav",
  ".ogg"
]);

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

function copySite(source, destination) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (source === root && excluded.has(entry.name)) continue;

    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copySite(from, to);
    } else if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      fs.copyFileSync(from, to);
    }
  }
}

copySite(root, output);

if (!fs.existsSync(path.join(output, "index.html"))) {
  throw new Error("Mobile build failed: index.html was not copied into www/");
}

console.log("Cascade web files prepared for Capacitor in www/");
