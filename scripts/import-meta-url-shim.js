// esbuild empties `import.meta.url` when bundling to the "cjs" format.
// Prisma's generated client (bundled, not external — see build-electron.mjs)
// reads `import.meta.url` at module load time, which would otherwise throw.
// Standard esbuild workaround: inject a real value computed from the CJS
// `__filename` that every bundled output file already has.
import { pathToFileURL } from "node:url";

export const importMetaUrl = pathToFileURL(__filename).href;
