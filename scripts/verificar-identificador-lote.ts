/**
 * Verificación del identificador público de lote (tarea 2.1 del cambio
 * improve-public-lotization-map). Se ejecuta con:
 *
 *   node scripts/verificar-identificador-lote.ts
 */
import { identificadorPublicoLote } from "../src/utils/mapas/identificadorLote.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

// Los valores de abajo son los reales del mapa publicado ciudadela-san-lucas.
console.log("El identificador es el número de lote tal cual viene de los datos");
verificar("H1 -> H1", identificadorPublicoLote({ numero_lote: "H1" }) === "H1");
verificar("H10 -> H10", identificadorPublicoLote({ numero_lote: "H10" }) === "H10");
verificar("L1.10 -> L1.10", identificadorPublicoLote({ numero_lote: "L1.10" }) === "L1.10");
verificar(
  "los espacios se recortan",
  identificadorPublicoLote({ numero_lote: "  H7  " }) === "H7",
  identificadorPublicoLote({ numero_lote: "  H7  " }),
);

console.log("No se compone con el nombre de la manzana");
verificar(
  "el número ya lleva la letra de su manzana, no hace falta añadir nada",
  identificadorPublicoLote({ numero_lote: "H1" })!.length === 2,
);
verificar(
  "etiquetas cortas: la más larga del plano real mide 5 caracteres",
  identificadorPublicoLote({ numero_lote: "L1.10" })!.length === 5,
);

console.log("Faltan datos: no se inventa identificador");
verificar("número vacío -> null", identificadorPublicoLote({ numero_lote: "" }) === null);
verificar(
  "número en blanco -> null",
  identificadorPublicoLote({ numero_lote: "   " }) === null,
);
verificar(
  "número nulo -> null",
  identificadorPublicoLote({ numero_lote: null }) === null,
);
verificar(
  "número indefinido -> null",
  identificadorPublicoLote({ numero_lote: undefined }) === null,
);

console.log("Nunca se deriva de la posición en la lista");
const lotes = [{ numero_lote: "H1" }, { numero_lote: "H10" }, { numero_lote: "H11" }];
const enOrden = lotes.map(identificadorPublicoLote);
const invertidos = [...lotes].reverse().map(identificadorPublicoLote);
verificar(
  "cada lote conserva su identificador al reordenar la lista",
  JSON.stringify([...invertidos].reverse()) === JSON.stringify(enOrden),
  { enOrden, invertidos },
);
verificar(
  "dos lotes distintos siguen distinguiéndose tras el reordenado",
  invertidos[1] === "H10",
  invertidos,
);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
