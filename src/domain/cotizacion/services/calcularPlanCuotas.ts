/**
 * Plan de cuotas de una cotización — spec `cotizaciones/plan-de-pago`.
 *
 * Reglas (práctica actual, sin interés):
 *   financiado = precio_ofertado - monto_entrada
 *   cuota_base = ceil(financiado / num_cuotas)
 *   la última cuota absorbe la diferencia de redondeo
 *   primera cuota = un mes después de la fecha base; después, mensualidades
 *   consecutivas preservando el día (recortado si el mes no lo tiene)
 *
 * La RPC `aceptar_cotizacion` de `supabase/migrations/012_aceptar_cotizacion_venta.sql`
 * replica exactamente estas reglas en SQL: si cambia una, hay que cambiar las dos.
 */

export interface CuotaDelPlan {
  numero: number;
  /** Fecha en formato local YYYY-MM-DD (sin el desfase de `toISOString`). */
  fecha_vencimiento: string;
  /** Importe de la cuota, con dos decimales. */
  monto: number;
}

export interface PlanDePago {
  precio_ofertado: number;
  monto_entrada: number;
  /** Monto a financiar: precio menos la entrada. */
  financiado: number;
  num_cuotas: number;
  /** Cuota repetida en las cuotas 1..n-1; la última cuota es distinta. */
  cuota_base: number;
  cuotas: CuotaDelPlan[];
}

const dinero = (valor: number): number => Math.round(valor * 100) / 100;

/** Suma meses preservando el día, recortándolo si el mes destino es más corto. */
export function sumarMeses(fecha: Date, meses: number): Date {
  const dia = fecha.getDate();
  const objetivo = new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1);
  const ultimoDia = new Date(objetivo.getFullYear(), objetivo.getMonth() + 1, 0).getDate();
  return new Date(objetivo.getFullYear(), objetivo.getMonth(), Math.min(dia, ultimoDia));
}

/** Fecha local en YYYY-MM-DD. `toISOString` usaría UTC y corrida un día. */
function fechaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function normalizar(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/**
 * Calcula el plan completo de cuotas. Lanza error si las condiciones son
 * inválidas (entrada ≥ precio o cuotas < 1); la validación compartida vive en
 * `application/cotizaciones/use-cases/validaciones/condicionesFinanciamiento`.
 */
export function calcularPlanCuotas(
  precio_ofertado: number,
  monto_entrada: number,
  num_cuotas: number,
  fechaBase: Date = new Date(),
): PlanDePago {
  if (monto_entrada < 0 || monto_entrada >= precio_ofertado) {
    throw new Error("La entrada debe ser menor al precio ofertado");
  }
  if (!Number.isInteger(num_cuotas) || num_cuotas < 1) {
    throw new Error("El número de cuotas debe ser al menos 1");
  }

  const financiado = dinero(precio_ofertado - monto_entrada);
  const cuota_base = Math.ceil(dinero(financiado / num_cuotas));
  const base = normalizar(fechaBase);

  const cuotas: CuotaDelPlan[] = [];
  for (let numero = 1; numero <= num_cuotas; numero++) {
    const monto =
      numero === num_cuotas ? dinero(financiado - cuota_base * (num_cuotas - 1)) : cuota_base;
    cuotas.push({
      numero,
      fecha_vencimiento: fechaLocal(sumarMeses(base, numero)),
      monto,
    });
  }

  return {
    precio_ofertado,
    monto_entrada,
    financiado,
    num_cuotas,
    cuota_base,
    cuotas,
  };
}
