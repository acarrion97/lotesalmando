/**
 * Verificación del plan de cuotas (tarea 2.4 del cambio
 * aceptar-cotizacion-genera-venta). Se ejecuta con:
 *
 *   node scripts/verificar-plan-cuotas.ts
 */
import { calcularPlanCuotas, sumarMeses } from "../src/domain/cotizacion/services/calcularPlanCuotas.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

console.log("Caso del spec: 62.000 / 10.000 / 24 cuotas");
const plan = calcularPlanCuotas(62000, 10000, 24, new Date(2026, 9, 30));

verificar("financiado = 52.000", plan.financiado === 52000, plan.financiado);
verificar("cuota base = 2.167", plan.cuota_base === 2167, plan.cuota_base);
verificar("24 cuotas", plan.cuotas.length === 24);
verificar("la suma de las cuotas = 52.000", plan.cuotas.reduce((s, c) => s + c.monto, 0) === 52000);
verificar(
  "la última cuota absorbe el redondeo (2.159)",
  plan.cuotas[23].monto === 52000 - 2167 * 23,
  plan.cuotas[23].monto,
);
verificar("primera cuota = un mes después (30/11/2026)", plan.cuotas[0].fecha_vencimiento === "2026-11-30", plan.cuotas[0].fecha_vencimiento);
verificar("segunda cuota = 30/12/2026", plan.cuotas[1].fecha_vencimiento === "2026-12-30", plan.cuotas[1].fecha_vencimiento);
verificar("mes corto recorta el día (28/02/2027)", plan.cuotas[3].fecha_vencimiento === "2027-02-28", plan.cuotas[3].fecha_vencimiento);

console.log("Sin entrada, 12 cuotas (práctica actual)");
const sinEntrada = calcularPlanCuotas(49000, 0, 12, new Date(2026, 8, 16));
verificar("cuota = 4.084 (igual que los datos reales)", sinEntrada.cuota_base === 4084, sinEntrada.cuota_base);
verificar("primera cuota = 16/10/2026", sinEntrada.cuotas[0].fecha_vencimiento === "2026-10-16", sinEntrada.cuotas[0].fecha_vencimiento);
verificar("la suma = 49.000", sinEntrada.cuotas.reduce((s, c) => s + c.monto, 0) === 49000);

console.log("Condiciones inválidas");
try {
  calcularPlanCuotas(50000, 50000, 12);
  verificar("entrada >= precio rechazada", false);
} catch {
  verificar("entrada >= precio rechazada", true);
}
try {
  calcularPlanCuotas(50000, 10000, 0);
  verificar("0 cuotas rechazado", false);
} catch {
  verificar("0 cuotas rechazado", true);
}

console.log("Recorte de fechas");
verificar(
  "31/01 + 1 mes = 28/02/2026",
  sumarMeses(new Date(2026, 0, 31), 1).getDate() === 28,
);
verificar(
  "31/03 + 1 mes = 30/04/2026",
  sumarMeses(new Date(2026, 2, 31), 1).getDate() === 30,
);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
