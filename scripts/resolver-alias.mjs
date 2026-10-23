/**
 * Resuelve el alias `@/` (definido en tsconfig.app.json y en Vite) dentro de
 * Node, para que los scripts de verificación puedan importar directamente
 * código de `src/`. Se registra desde el propio script con `module.register`,
 * así el comando sigue siendo `node scripts/<script>.ts`.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = new URL("../", import.meta.url);
const SUFIJOS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = `src/${specifier.slice(2)}`;
    for (const sufijo of SUFIJOS) {
      const candidato = new URL(base + sufijo, RAIZ);
      if (existsSync(fileURLToPath(candidato))) {
        return nextResolve(candidato.href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
