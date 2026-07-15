import * as esbuild from "esbuild";

// Bundles the Electron main + preload entrypoints (and our own shared/ and
// generated/prisma/ source) into single self-contained CJS files. Bundling
// (rather than a plain tsc emit) is what lets us pull in Prisma's generated
// client, which ships as ESM-only TypeScript source (uses `import.meta.url`)
// straight into a CJS Electron runtime without any module-format gymnastics —
// esbuild rewrites `import.meta.url` correctly when targeting the "cjs" format.
//
// Real npm dependencies are left external so they're resolved from
// node_modules at runtime as usual (required for native addons like
// better-sqlite3, and for heavy packages like wppconnect/puppeteer).
//
// main and preload are built as two SEPARATE esbuild calls, not one call with
// two entryPoints: the import.meta.url shim (needed by main.js because of the
// bundled Prisma client) references `__filename`, which does not exist in
// Electron's sandboxed preload context — injecting it into preload.js as well
// throws "__filename is not defined" and silently breaks contextBridge.

const isWatch = process.argv.includes("--watch");

const external = [
  "electron",
  "better-sqlite3",
  "@prisma/adapter-better-sqlite3",
  "@prisma/client",
  "@prisma/client/*",
  "@wppconnect-team/wppconnect",
  "electron-log",
  "electron-log/*",
  "p-queue",
  "exceljs",
  "libphonenumber-js",
];

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  outdir: "dist-electron",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  external,
  logLevel: "info",
};

/** @type {import('esbuild').BuildOptions} */
const mainOptions = {
  ...sharedOptions,
  entryPoints: { main: "electron/main.ts" },
  define: { "import.meta.url": "importMetaUrl" },
  inject: ["scripts/import-meta-url-shim.js"],
};

/** @type {import('esbuild').BuildOptions} */
const preloadOptions = {
  ...sharedOptions,
  entryPoints: { preload: "electron/preload.ts" },
};

if (isWatch) {
  const [mainCtx, preloadCtx] = await Promise.all([
    esbuild.context(mainOptions),
    esbuild.context(preloadOptions),
  ]);
  await Promise.all([mainCtx.watch(), preloadCtx.watch()]);
  console.log("[esbuild] watching electron/ for changes...");
} else {
  await Promise.all([esbuild.build(mainOptions), esbuild.build(preloadOptions)]);
  console.log("[esbuild] electron main/preload built.");
}
