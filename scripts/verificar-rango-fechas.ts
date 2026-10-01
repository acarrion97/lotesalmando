/**
 * Verificación del filtro de fechas de Ventas (tarea 5.1 del cambio
 * aceptar-cotizacion-genera-venta). Se ejecuta con:
 *
 *   node scripts/verificar-rango-fechas.ts
 */
import {
  dentroDelRango,
  diaEnEmpresa,
  rangoDelPreset,
} from "../src/utils/dates/rangoFechas.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

console.log("Zona horaria de la empresa (UTC-5)");
verificar(
  "una venta de las 21:06 UTC es del mismo día",
  diaEnEmpresa("2026-09-16T21:06:11.837872+00:00") === "2026-09-16",
  diaEnEmpresa("2026-09-16T21:06:11.837872+00:00"),
);
verificar(
  "01:30 UTC del día siguiente ya es el día anterior en la empresa",
  diaEnEmpresa("2026-09-17T01:30:00+00:00") === "2026-09-16",
  diaEnEmpresa("2026-09-17T01:30:00+00:00"),
);
verificar("fecha inválida -> cadena vacía", diaEnEmpresa("no-es-fecha") === "");

const hoy = new Date("2026-10-01T12:00:00-05:00");

console.log("Presets (sobre el 01/10/2026)");
const mesActual = rangoDelPreset("mes-actual", hoy);
verificar(
  "mes actual = 01/10/2026 a 31/10/2026",
  mesActual.desde === "2026-10-01" && mesActual.hasta === "2026-10-31",
  mesActual,
);
const mesPasado = rangoDelPreset("mes-pasado", hoy);
verificar(
  "mes pasado = 01/09/2026 a 30/09/2026",
  mesPasado.desde === "2026-09-01" && mesPasado.hasta === "2026-09-30",
  mesPasado,
);
const ultimos30 = rangoDelPreset("ultimos-30", hoy);
verificar(
  "últimos 30 días = 02/09/2026 a 01/10/2026",
  ultimos30.desde === "2026-09-02" && ultimos30.hasta === "2026-10-01",
  ultimos30,
);
const anio = rangoDelPreset("anio", hoy);
verificar(
  "este año = 01/01/2026 a 31/12/2026",
  anio.desde === "2026-01-01" && anio.hasta === "2026-12-31",
  anio,
);
verificar(
  "todo no filtra nada",
  rangoDelPreset("todo", hoy).desde === null && rangoDelPreset("todo", hoy).hasta === null,
);

console.log("Límites inclusive y casos borde");
const rango = { desde: "2026-09-01", hasta: "2026-09-30" };
verificar("primer día inclusive", dentroDelRango("2026-09-01T12:00:00+00:00", rango));
verificar(
  "último día inclusive aunque pase de medianoche UTC",
  dentroDelRango("2026-10-01T03:00:00+00:00", rango),
  diaEnEmpresa("2026-10-01T03:00:00+00:00"),
);
verificar("fuera del rango", !dentroDelRango("2026-08-31T23:00:00+00:00", rango));
verificar(
  "sin filtro pasa todo",
  dentroDelRango("2020-01-01T00:00:00+00:00", { desde: null, hasta: null }),
);
verificar(
  "sin fecha no puede entrar en un rango",
  !dentroDelRango(undefined, rango),
);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
