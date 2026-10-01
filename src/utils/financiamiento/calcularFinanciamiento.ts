export interface EntradaFinanciamiento {
  /** Precio de lista del lote (o el precio que escriba el visitante). */
  precio: number;
  /** Porcentaje del precio que se paga de una vez (0–100). */
  enganchePorcentaje: number;
  /** Cantidad de cuotas mensuales (1–360). */
  plazoMeses: number;
  /** Interés nominal anual en porcentaje (>= 0). */
  tasaAnualPorcentaje: number;
}

export interface ResultadoFinanciamiento {
  enganche: number;
  montoFinanciado: number;
  cuotaMensual: number;
  interesesTotales: number;
  totalAPagar: number;
}

export const RANGOS_FINANCIAMIENTO = {
  engancheMin: 0,
  engancheMax: 100,
  plazoMin: 1,
  plazoMax: 360,
  tasaMin: 0,
} as const;

/**
 * Motivo por el que la calculadora no puede mostrar resultados, o `null` si
 * los parámetros son válidos. Se muestra como aviso en la UI en lugar de
 * calcular números engañosos.
 */
export function validarFinanciamiento(e: EntradaFinanciamiento): string | null {
  if (!Number.isFinite(e.precio) || e.precio <= 0) {
    return "Elegí un lote o escribí un precio para simular";
  }
  if (
    !Number.isFinite(e.enganchePorcentaje) ||
    e.enganchePorcentaje < RANGOS_FINANCIAMIENTO.engancheMin ||
    e.enganchePorcentaje > RANGOS_FINANCIAMIENTO.engancheMax
  ) {
    return "El enganche debe estar entre 0 y 100 %";
  }
  if (
    !Number.isFinite(e.plazoMeses) ||
    e.plazoMeses < RANGOS_FINANCIAMIENTO.plazoMin ||
    e.plazoMeses > RANGOS_FINANCIAMIENTO.plazoMax
  ) {
    return `El plazo debe estar entre ${RANGOS_FINANCIAMIENTO.plazoMin} y ${RANGOS_FINANCIAMIENTO.plazoMax} meses`;
  }
  if (
    !Number.isFinite(e.tasaAnualPorcentaje) ||
    e.tasaAnualPorcentaje < RANGOS_FINANCIAMIENTO.tasaMin
  ) {
    return "La tasa de interés no puede ser negativa";
  }
  return null;
}

const redondear2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Amortización francesa (cuota fija): la tasa anual se convierte en mensual
 * y `cuota = P·i / (1 − (1+i)^−n)`. Con tasa 0 la cuota es `P/n`.
 * Asume parámetros ya validados con `validarFinanciamiento`.
 */
export function calcularFinanciamiento(e: EntradaFinanciamiento): ResultadoFinanciamiento {
  const enganche = redondear2(e.precio * (e.enganchePorcentaje / 100));
  const montoFinanciado = redondear2(e.precio - enganche);
  const meses = Math.round(e.plazoMeses);
  const i = e.tasaAnualPorcentaje / 100 / 12;

  const cuotaMensual =
    i === 0
      ? redondear2(montoFinanciado / meses)
      : redondear2((montoFinanciado * i) / (1 - Math.pow(1 + i, -meses)));

  const pagadoEnCuotas = redondear2(cuotaMensual * meses);
  return {
    enganche,
    montoFinanciado,
    cuotaMensual,
    interesesTotales: redondear2(pagadoEnCuotas - montoFinanciado),
    totalAPagar: redondear2(enganche + pagadoEnCuotas),
  };
}
