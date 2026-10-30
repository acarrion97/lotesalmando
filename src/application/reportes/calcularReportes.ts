/**
 * Cálculos de reportería. Funciones puras sobre las listas que ya cargan los
 * hooks (ventas, cobranzas, pagos, lotes...): no consultan la base de datos,
 * así los reportes también funcionan con los datos en caché sin conexión.
 *
 * Los importes se suman en centavos para no arrastrar error de coma flotante
 * (mismo criterio que la cartera de Cobranzas).
 */
import type { Venta } from "@/domain/venta/entities";
import type { Cobranza } from "@/domain/cobranza/entities";
import type { Pago } from "@/domain/pago/entities";
import type { Lote, LoteEstado } from "@/domain/lote/entities";
import type { Prospecto, ProspectoEstado } from "@/domain/prospecto/entities";
import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { Asesor } from "@/domain/asesor/entities";
import { diaEnEmpresa } from "@/utils";

const MS_POR_DIA = 86_400_000;

export const aCentavos = (monto: number): number => Math.round(monto * 100);
export const deCentavos = (centavos: number): number => centavos / 100;
const sumar = <T>(lista: T[], valor: (item: T) => number): number =>
  deCentavos(lista.reduce((s, item) => s + aCentavos(valor(item)), 0));

/** Días calendario entre dos fechas YYYY-MM-DD (positivo si `hasta` es posterior). */
export function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / MS_POR_DIA);
}

/** Mes (YYYY-MM) de un instante según el reloj de la empresa. */
export function mesDe(instante: string | undefined | null): string {
  return instante ? diaEnEmpresa(instante).slice(0, 7) : "";
}

// ---------------------------------------------------------------- Ventas

export interface ResumenVentas {
  cantidad: number;
  completadas: number;
  pendientes: number;
  canceladas: number;
  /** Monto de las ventas no canceladas. */
  montoVendido: number;
  ticketPromedio: number;
}

export function resumirVentas(ventas: Venta[]): ResumenVentas {
  const vigentes = ventas.filter((v) => v.estado !== "cancelada");
  const montoVendido = sumar(vigentes, (v) => v.precio_final);
  return {
    cantidad: ventas.length,
    completadas: ventas.filter((v) => v.estado === "completada").length,
    pendientes: ventas.filter((v) => v.estado === "pendiente").length,
    canceladas: ventas.filter((v) => v.estado === "cancelada").length,
    montoVendido,
    ticketPromedio:
      vigentes.length > 0 ? Math.round((montoVendido / vigentes.length) * 100) / 100 : 0,
  };
}

export interface VentasPorMes {
  mes: string;
  cantidad: number;
  monto: number;
}

/** Ventas no canceladas agrupadas por mes, de la más antigua a la más reciente. */
export function ventasPorMes(ventas: Venta[]): VentasPorMes[] {
  const grupos = new Map<string, Venta[]>();
  for (const v of ventas) {
    if (v.estado === "cancelada") continue;
    const mes = mesDe(v.created_at);
    if (!mes) continue;
    grupos.set(mes, [...(grupos.get(mes) ?? []), v]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, lista]) => ({
      mes,
      cantidad: lista.length,
      monto: sumar(lista, (v) => v.precio_final),
    }));
}

/**
 * Forma de pago que más monto cubrió entre los pagos dados: la principal de
 * una venta, ya que el precio puede repartirse en varias formas de pago. Con
 * empate gana la alfabéticamente primera para que el resultado sea estable.
 * Devuelve `sinPagos` si la venta todavía no tiene pagos registrados.
 */
export function formaPagoPrincipal(
  pagos: Pago[],
  etiqueta: (p: Pago) => string,
  sinPagos = "Sin pagos",
): string {
  if (pagos.length === 0) return sinPagos;
  const centavos = new Map<string, number>();
  for (const p of pagos) {
    const clave = etiqueta(p);
    centavos.set(clave, (centavos.get(clave) ?? 0) + aCentavos(p.monto_pagado));
  }
  return [...centavos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

// ---------------------------------------------------------------- Cartera

export type TramoMora = "por_vencer" | "1_30" | "31_60" | "61_90" | "mas_90";

export const TRAMOS_MORA: { key: TramoMora; label: string }[] = [
  { key: "por_vencer", label: "Por vencer" },
  { key: "1_30", label: "1 a 30 días" },
  { key: "31_60", label: "31 a 60 días" },
  { key: "61_90", label: "61 a 90 días" },
  { key: "mas_90", label: "Más de 90 días" },
];

export function tramoDeMora(diasMora: number): TramoMora {
  if (diasMora <= 0) return "por_vencer";
  if (diasMora <= 30) return "1_30";
  if (diasMora <= 60) return "31_60";
  if (diasMora <= 90) return "61_90";
  return "mas_90";
}

export interface CuotaEnCartera extends Cobranza {
  /** Días de atraso respecto de `hoy`; <= 0 si todavía no vence. */
  diasMora: number;
  tramo: TramoMora;
}

/** Cuotas sin cobrar (pendientes o vencidas) con sus días de mora a la fecha `hoy`. */
export function cuotasEnCartera(cobranzas: Cobranza[], hoy: string): CuotaEnCartera[] {
  return cobranzas
    .filter((c) => c.estado !== "pagada")
    .map((c) => {
      const diasMora = c.fecha_vencimiento ? diasEntre(c.fecha_vencimiento, hoy) : 0;
      return { ...c, diasMora, tramo: tramoDeMora(diasMora) };
    });
}

export interface FilaAntiguedad {
  tramo: TramoMora;
  label: string;
  cuotas: number;
  monto: number;
  porcentaje: number;
}

/** Antigüedad de saldos: monto por cobrar repartido por tramo de mora. */
export function antiguedadDeSaldos(cuotas: CuotaEnCartera[]): FilaAntiguedad[] {
  const total = cuotas.reduce((s, c) => s + aCentavos(c.monto_cuota), 0);
  return TRAMOS_MORA.map(({ key, label }) => {
    const lista = cuotas.filter((c) => c.tramo === key);
    const centavos = lista.reduce((s, c) => s + aCentavos(c.monto_cuota), 0);
    return {
      tramo: key,
      label,
      cuotas: lista.length,
      monto: deCentavos(centavos),
      porcentaje: total > 0 ? Math.round((centavos / total) * 1000) / 10 : 0,
    };
  });
}

// ----------------------------------------------------------- Recaudación

export interface FilaAgrupada {
  clave: string;
  cantidad: number;
  monto: number;
}

/** Agrupa pagos por una clave y suma sus montos; mayor monto primero. */
export function agruparPagos(pagos: Pago[], clave: (p: Pago) => string): FilaAgrupada[] {
  const grupos = new Map<string, Pago[]>();
  for (const p of pagos) {
    const k = clave(p);
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  return [...grupos.entries()]
    .map(([k, lista]) => ({
      clave: k,
      cantidad: lista.length,
      monto: sumar(lista, (p) => p.monto_pagado),
    }))
    .sort((a, b) => b.monto - a.monto);
}

export const totalPagos = (pagos: Pago[]): number => sumar(pagos, (p) => p.monto_pagado);

// ------------------------------------------------------------ Inventario

export interface FilaInventario {
  proyecto: string;
  total: number;
  porEstado: Record<LoteEstado, number>;
  /** Suma del precio de lista de los lotes disponibles. */
  valorDisponible: number;
  /** Lotes vendidos sobre el total, en %. */
  avanceVentas: number;
}

export const ESTADOS_LOTE: { key: LoteEstado; label: string }[] = [
  { key: "disponible", label: "Disponible" },
  { key: "reservado", label: "Reservado" },
  { key: "en_negociacion", label: "En negociación" },
  { key: "vendido", label: "Vendido" },
  { key: "bloqueado", label: "Bloqueado" },
  { key: "no_disponible", label: "No disponible" },
];

const estadosVacios = (): Record<LoteEstado, number> => ({
  disponible: 0,
  reservado: 0,
  vendido: 0,
  en_negociacion: 0,
  bloqueado: 0,
  no_disponible: 0,
});

/**
 * Lotes por proyecto y estado. `proyectoDeLote` resuelve el nombre del proyecto
 * (lote -> manzana -> etapa -> proyecto); los lotes sin proyecto se agrupan
 * bajo "Sin proyecto".
 */
export function resumenInventario(
  lotes: Lote[],
  proyectoDeLote: (l: Lote) => string | undefined,
): FilaInventario[] {
  const grupos = new Map<string, Lote[]>();
  for (const l of lotes) {
    const nombre = proyectoDeLote(l) ?? "Sin proyecto";
    grupos.set(nombre, [...(grupos.get(nombre) ?? []), l]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([proyecto, lista]) => {
      const porEstado = estadosVacios();
      for (const l of lista) porEstado[l.estado] += 1;
      return {
        proyecto,
        total: lista.length,
        porEstado,
        valorDisponible: sumar(
          lista.filter((l) => l.estado === "disponible"),
          (l) => l.precio_lista,
        ),
        avanceVentas:
          lista.length > 0 ? Math.round((porEstado.vendido / lista.length) * 1000) / 10 : 0,
      };
    });
}

// -------------------------------------------------------------- Comercial

export interface FilaEmbudo {
  estado: ProspectoEstado;
  label: string;
  cantidad: number;
  /** % sobre el total de prospectos. */
  porcentaje: number;
}

export const ESTADOS_PROSPECTO: { key: ProspectoEstado; label: string }[] = [
  { key: "nuevo", label: "Nuevo" },
  { key: "contactado", label: "Contactado" },
  { key: "interesado", label: "Interesado" },
  { key: "negociacion", label: "Negociación" },
  { key: "reserva", label: "Reserva" },
  { key: "perdido", label: "Perdido" },
];

export function embudoProspectos(prospectos: Prospecto[]): FilaEmbudo[] {
  return ESTADOS_PROSPECTO.map(({ key, label }) => {
    const cantidad = prospectos.filter((p) => p.estado === key).length;
    return {
      estado: key,
      label,
      cantidad,
      porcentaje:
        prospectos.length > 0 ? Math.round((cantidad / prospectos.length) * 1000) / 10 : 0,
    };
  });
}

export interface FilaAsesor {
  id_asesor: number | null;
  asesor: string;
  prospectos: number;
  cotizaciones: number;
  ventas: number;
  montoVendido: number;
  /** Meta mensual del asesor (0 si no es un asesor registrado). */
  metaMensual: number;
  /** Monto vendido sobre la meta del período, en % (null sin meta). */
  cumplimientoMeta: number | null;
}

/**
 * Desempeño por asesor. `mesesDelPeriodo` multiplica la meta mensual para
 * comparar contra lo vendido en un período de varios meses.
 */
export function desempenoPorAsesor(
  asesores: Asesor[],
  prospectos: Prospecto[],
  cotizaciones: Cotizacion[],
  ventas: Venta[],
  mesesDelPeriodo: number,
): FilaAsesor[] {
  const filas: FilaAsesor[] = asesores.map((a) => {
    const vigentes = ventas.filter((v) => v.id_asesor === a.id_asesor && v.estado !== "cancelada");
    const montoVendido = sumar(vigentes, (v) => v.precio_final);
    const meta = a.meta_ventas_mensual * Math.max(mesesDelPeriodo, 1);
    return {
      id_asesor: a.id_asesor,
      asesor: a.nombre_comercial,
      prospectos: prospectos.filter((p) => p.id_asesor === a.id_asesor).length,
      cotizaciones: cotizaciones.filter((c) => c.id_asesor === a.id_asesor).length,
      ventas: vigentes.length,
      montoVendido,
      metaMensual: a.meta_ventas_mensual,
      cumplimientoMeta: meta > 0 ? Math.round((montoVendido / meta) * 1000) / 10 : null,
    };
  });

  const sinAsesor = ventas.filter((v) => v.id_asesor == null && v.estado !== "cancelada");
  const prospectosSin = prospectos.filter((p) => p.id_asesor == null).length;
  const cotizacionesSin = cotizaciones.filter((c) => c.id_asesor == null).length;
  if (sinAsesor.length > 0 || prospectosSin > 0 || cotizacionesSin > 0) {
    filas.push({
      id_asesor: null,
      asesor: "Sin asesor",
      prospectos: prospectosSin,
      cotizaciones: cotizacionesSin,
      ventas: sinAsesor.length,
      montoVendido: sumar(sinAsesor, (v) => v.precio_final),
      metaMensual: 0,
      cumplimientoMeta: null,
    });
  }
  return filas.sort((a, b) => b.montoVendido - a.montoVendido);
}

/** Meses (>= 1) que abarca un rango YYYY-MM-DD; 1 si el rango es abierto. */
export function mesesDelRango(desde: string | null, hasta: string | null): number {
  if (!desde || !hasta) return 1;
  const [a1, m1] = desde.split("-").map(Number);
  const [a2, m2] = hasta.split("-").map(Number);
  return Math.max((a2 - a1) * 12 + (m2 - m1) + 1, 1);
}
