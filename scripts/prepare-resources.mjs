import fs from "node:fs";
import path from "node:path";

// Pre-assembles everything electron-builder's `extraResources` needs into
// resources/ using plain fs.cpSync, instead of letting electron-builder glob
// + copy .next/standalone directly. electron-builder's own file-matching
// engine silently dropped nested packages (e.g. node_modules/next itself)
// when copying .next/standalone via extraResources filters — copying it
// ourselves first, with full control, is the reliable alternative.

const root = path.resolve(import.meta.dirname, "..");
const resourcesDir = path.join(root, "resources");

fs.rmSync(resourcesDir, { recursive: true, force: true });

const standaloneDest = path.join(resourcesDir, "next-standalone");
fs.cpSync(path.join(root, ".next", "standalone"), standaloneDest, {
  recursive: true,
  dereference: true,
});
fs.cpSync(path.join(root, ".next", "static"), path.join(standaloneDest, ".next", "static"), {
  recursive: true,
  dereference: true,
});
fs.cpSync(path.join(root, "public"), path.join(standaloneDest, "public"), {
  recursive: true,
  dereference: true,
});

fs.cpSync(path.join(root, "prisma", "migrations"), path.join(resourcesDir, "prisma-migrations"), {
  recursive: true,
  dereference: true,
});

console.log("[prepare-resources] resources/ staged for electron-builder.");
