/**
 * Verifica la interpretación de disponibilidad de Esri y el descenso a un
 * nivel con cobertura sin depender de la red.
 *
 * Ejecutar con: node scripts/verificar-disponibilidad-tiles-esri.ts
 */
import { register } from "node:module";

register("./resolver-alias.mjs", import.meta.url);
const { disponibilidadTilesEsri, nivelMaximoEsriConCobertura, tileEsriDisponible } =
  await import("../src/presentation/components/maps/tilesEsri.ts");

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

const fetchOriginal = globalThis.fetch;
const llamadas: string[] = [];
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  llamadas.push(url.pathname);
  const [nivel, fila, columna, ancho, alto] = url.pathname.split("/").slice(-5);
  const cantidad = Number(ancho) * Number(alto);
  const data = Array.from({ length: cantidad }, (_, indice) =>
    Number(nivel) <= 18 ||
    (nivel === "20" && fila === "20" && Number(columna) + indice !== 10)
      ? 1
      : 0,
  );
  return new Response(JSON.stringify({ valid: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

try {
  console.log("Disponibilidad agrupada de tiles");
  const agrupados = await disponibilidadTilesEsri(20, [
    { x: 10, y: 20 },
    { x: 11, y: 20 },
  ]);
  verificar("un bloque por fila consulta varios tiles", llamadas.length === 1, llamadas);
  verificar(
    "se reconocen tiles disponibles y sin cobertura",
    agrupados.get("10/20") === false && agrupados.get("11/20") === true,
    [...agrupados],
  );

  console.log("Descenso al nivel con cobertura");
  verificar(
    "un tile sin datos no se considera disponible",
    (await tileEsriDisponible(20, 10, 20)) === false,
  );
  const nivel = await nivelMaximoEsriConCobertura(
    { norte: 0.001, sur: -0.001, este: 0.001, oeste: -0.001 },
    19,
  );
  verificar("se selecciona el nivel máximo con cobertura total", nivel === 18, nivel);
} finally {
  globalThis.fetch = fetchOriginal;
}

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
