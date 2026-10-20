/**
 * Verificación de los filtros del plano (tarea 2.3 del cambio
 * improve-public-lotization-map). Se ejecuta con:
 *
 *   node scripts/verificar-filtros-plano.ts
 */
import type { LoteEstado } from "../src/domain/lote/entities/index.ts";
import type { LoteFiltrable } from "../src/utils/mapas/filtrosPlano.ts";
import {
  ESTADOS_PLANO,
  contarPorEstado,
  idsFiltradosPorEstado,
  tieneContorno,
} from "../src/utils/mapas/filtrosPlano.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

const contorno = [
  [0, 0],
  [0.1, 0],
  [0.1, 0.1],
  [0, 0.1],
];

function lote(id: number, estado: LoteEstado, dibujado = true): LoteFiltrable {
  return { id_lote: id, estado, poligono: dibujado ? contorno : null };
}

// Seis estados reales, más un lote sin ubicar que no debe entrar en nada.
const lotes: LoteFiltrable[] = [
  lote(1, "disponible"),
  lote(2, "disponible"),
  lote(3, "disponible"),
  lote(4, "reservado"),
  lote(5, "reservado"),
  lote(6, "vendido"),
  lote(7, "en_negociacion"),
  lote(8, "bloqueado"),
  lote(9, "no_disponible"),
  lote(10, "disponible", false),
];

console.log("Los seis estados se contemplan");
verificar("ESTADOS_PLANO tiene los seis estados", ESTADOS_PLANO.length === 6, ESTADOS_PLANO);
verificar(
  "los tres estados fuera de lo habitual están incluidos",
  ESTADOS_PLANO.includes("en_negociacion") &&
    ESTADOS_PLANO.includes("bloqueado") &&
    ESTADOS_PLANO.includes("no_disponible"),
  ESTADOS_PLANO,
);

console.log("Conteos");
const conteo = contarPorEstado(lotes);
verificar("disponibles = 3 (el décimo no está dibujado)", conteo.disponible === 3, conteo);
verificar("reservados = 2", conteo.reservado === 2);
verificar("vendidos = 1", conteo.vendido === 1);
verificar("en negociación = 1 y sí aparece contado", conteo.en_negociacion === 1, conteo);
verificar("bloqueados = 1", conteo.bloqueado === 1);
verificar("no disponibles = 1", conteo.no_disponible === 1);
verificar(
  "los seis estados tienen clave, aunque tengan 0 lotes",
  ESTADOS_PLANO.every((e) => typeof conteo[e] === "number"),
  conteo,
);

console.log("La suma cuadra con los lotes con contorno");
const dibujados = lotes.filter(tieneContorno).length;
verificar(`hay ${dibujados} lotes con contorno`, dibujados === 9, dibujados);
verificar(
  "la suma de conteos = lotes con contorno",
  ESTADOS_PLANO.reduce((suma, e) => suma + conteo[e], 0) === dibujados,
  conteo,
);

console.log("El filtro 'todos' no atenúa nada (contrato de resaltados)");
verificar("devuelve null", idsFiltradosPorEstado(lotes, "todos") === null);

console.log("Filtrar por un estado");
const reservados = idsFiltradosPorEstado(lotes, "reservado");
verificar("solo los dos reservados", reservados?.size === 2 && reservados.has(4) && reservados.has(5), [...(reservados ?? [])]);
const negociacion = idsFiltradosPorEstado(lotes, "en_negociacion");
verificar("un estado no habitual también filtra", negociacion?.size === 1 && negociacion.has(7));
const vendidos = idsFiltradosPorEstado(lotes, "vendido");
verificar("el filtro 'vendido' devuelve solo el lote 6", vendidos?.size === 1 && vendidos.has(6));
verificar("el filtro no cambia el estado de ningún lote", lotes[5].estado === "vendido" && lotes[0].estado === "disponible");

console.log("Los lotes sin contorno no se filtran ni se cuentan");
const disponibles = idsFiltradosPorEstado(lotes, "disponible");
verificar("el lote 10 (sin polígono) queda fuera del filtro", disponibles?.size === 3 && !disponibles.has(10));
verificar(
  "el lote 10 tampoco suma en el conteo",
  ESTADOS_PLANO.reduce((suma, e) => suma + contarPorEstado(lotes)[e], 0) === 9,
);
verificar("tieneContorno(null) es false", !tieneContorno(lote(11, "disponible", false)));

console.log("Un filtro sin lotes deja el conjunto vacío, no nulo");
const ninguno = idsFiltradosPorEstado([], "vendido");
verificar("devuelve un conjunto vacío", ninguno instanceof Set && ninguno.size === 0);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
