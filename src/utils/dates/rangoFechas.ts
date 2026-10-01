/**
 * Filtro de fechas de Ventas (spec `ventas/consulta`).
 *
 * Todo se calcula en la zona horaria de la empresa (UTC-5, Ecuador continental,
 * sin horario de verano), no en la del navegador: si alguien abre la app desde
 * otra zona, "mes actual" debe ser el mes de la empresa.
 *
 * El filtro corre en el navegador sobre la lista de ventas (también en caché,
 * con lo que funciona sin conexión): no consulta a la base de datos.
 */

/** UTC-5 expresado en minutos respecto a UTC. */
const DESFASE_EMPRESA_MINUTOS = -300;
const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 86_400_000;

export interface RangoFechas {
  /** Primer día inclusive, formato YYYY-MM-DD, o `null` sin límite inferior. */
  desde: string | null;
  /** Último día inclusive, formato YYYY-MM-DD, o `null` sin límite superior. */
  hasta: string | null;
}

export type PresetRango = "todo" | "mes-actual" | "mes-pasado" | "ultimos-30" | "anio" | "libre";

export const RANGO_SIN_FILTRO: RangoFechas = { desde: null, hasta: null };

/** Desplaza un instante al reloj de la empresa para leer sus componentes con getUTC*. */
function comoRelojEmpresa(instante: Date | string): Date {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  return new Date(fecha.getTime() + DESFASE_EMPRESA_MINUTOS * MS_POR_MINUTO);
}

function aIso(fecha: Date): string {
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${mes}-${dia}`;
}

function desdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** Día (YYYY-MM-DD) de un instante según el reloj de la empresa. Vacío si la fecha no es válida. */
export function diaEnEmpresa(instante: Date | string): string {
  const reloj = comoRelojEmpresa(instante);
  if (Number.isNaN(reloj.getTime())) return "";
  return aIso(reloj);
}

function primerDiaDelMes(anio: number, mes: number): string {
  return aIso(new Date(Date.UTC(anio, mes, 1)));
}

function ultimoDiaDelMes(anio: number, mes: number): string {
  return aIso(new Date(Date.UTC(anio, mes + 1, 0)));
}

/**
 * Rango de un preset, calculado sobre el día de "hoy" en la empresa.
 * `todo` no filtra nada y `libre` se resuelve con los valores que elija el usuario.
 */
export function rangoDelPreset(preset: PresetRango, ahora: Date = new Date()): RangoFechas {
  const hoy = desdeIso(diaEnEmpresa(ahora));
  const anio = hoy.getUTCFullYear();
  const mes = hoy.getUTCMonth(); // 0 = enero

  switch (preset) {
    case "mes-actual":
      return { desde: primerDiaDelMes(anio, mes), hasta: ultimoDiaDelMes(anio, mes) };
    case "mes-pasado": {
      const anterior = new Date(Date.UTC(anio, mes - 1, 1));
      return {
        desde: primerDiaDelMes(anterior.getUTCFullYear(), anterior.getUTCMonth()),
        hasta: ultimoDiaDelMes(anterior.getUTCFullYear(), anterior.getUTCMonth()),
      };
    }
    case "ultimos-30":
      return { desde: aIso(new Date(hoy.getTime() - 29 * MS_POR_DIA)), hasta: aIso(hoy) };
    case "anio":
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    default:
      return RANGO_SIN_FILTRO;
  }
}

/** ¿La fecha de una fila cae dentro del rango (inclusive) por el reloj de la empresa? */
export function dentroDelRango(instante: string | null | undefined, rango: RangoFechas): boolean {
  const sinLimiteInferior = !rango.desde;
  const sinLimiteSuperior = !rango.hasta;
  if (sinLimiteInferior && sinLimiteSuperior) return true;

  const dia = instante ? diaEnEmpresa(instante) : "";
  if (!dia) return false; // fecha desconocida o inválida: queda fuera del rango

  if (rango.desde && dia < rango.desde) return false;
  if (rango.hasta && dia > rango.hasta) return false;
  return true;
}
