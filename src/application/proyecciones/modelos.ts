import type {
  DatosBase,
  FilaProyeccion,
  MetricasProyeccion,
  ModeloAbsorcion,
  ProyeccionOpciones,
  ResumenProyeccion,
  ResultadoProyeccion,
} from "./dto/ProyeccionFinancieraDto";

/**
 * Modelos matemáticos de absorción y flujo de caja.
 *
 * Tres curvas "S" para la absorción de inventario, todas normalizadas para que
 * Q(T) = R (cierre exacto del inventario al final del horizonte) y Q(0) = 0.
 * Así la cola desacelera de forma natural en vez de concentrar el remanente en
 * el último mes.
 */

function normalizar(R: number, T: number, Qraw: (t: number) => number) {
  const base = Qraw(0);
  const span = Qraw(T) - base || 1;
  return (t: number) => (R * (Qraw(t) - base)) / span;
}

function curva(modelo: ModeloAbsorcion, R: number, T: number): (t: number) => number {
  if (modelo === "bass") {
    // p = innovación (publicidad/leads), q = imitación (referidos/boca a boca).
    const p = 0.03;
    const q = 0.38;
    return normalizar(
      R,
      T,
      (t) => (1 - Math.exp(-(p + q) * t)) / (1 + (q / p) * Math.exp(-(p + q) * t)),
    );
  }
  if (modelo === "gompertz") {
    // Pico levemente adelantado y desaceleración final más pronunciada.
    const a = 6 / T;
    const t0 = T * 0.45;
    return normalizar(R, T, (t) => Math.exp(-Math.exp(-a * (t - t0))));
  }
  // Logística (Pearl-Reed): S simétrica, pico a mitad de proyecto.
  const a = 6 / T;
  const t0 = T / 2;
  return normalizar(R, T, (t) => 1 / (1 + Math.exp(-a * (t - t0))));
}

/** Ventas enteras por mes que absorben exactamente R lotes en T meses. */
function distribuirVentas(modelo: ModeloAbsorcion, R: number, T: number): number[] {
  const Q = curva(modelo, R, T);
  const ventas: number[] = [];
  let acumEnt = 0;
  for (let t = 1; t <= T; t++) {
    let v = Math.round(Q(t)) - acumEnt;
    if (t === T) v = R - acumEnt; // cierra exacto el total
    v = Math.max(0, v);
    ventas.push(v);
    acumEnt += v;
  }
  return ventas;
}

/** Cuota mensual por lote. Sin interés reparte F/n; con interés usa French. */
function cuotaMensual(precio: number, enganchePct: number, cuotas: number, tasaAnualPct: number) {
  const F = precio * (1 - enganchePct / 100);
  const n = Math.max(1, cuotas);
  const i = tasaAnualPct / 100 / 12;
  if (i > 0) {
    const f = Math.pow(1 + i, n);
    return (F * i * f) / (f - 1);
  }
  return F / n;
}

/** Tasa interna de retorno mensual por bisección (null si no hay VPN con raíz). */
function tirMensualDe(flujos: number[]): number | null {
  const npv = (r: number) => flujos.reduce((s, f, k) => s + f / Math.pow(1 + r, k), 0);
  let lo = -0.99;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let n = 0; n < 200; n++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Calcula la proyección completa (absorción, valor contratado, flujo de caja y
 * flujo neto) a partir de los estadísticos reales de la etapa y las opciones.
 */
export function calcularProyeccion(
  datos: DatosBase,
  opciones: ProyeccionOpciones,
): ResultadoProyeccion {
  const meses = Math.max(1, Math.round(opciones.meses));
  const enganchePct = opciones.enganchePct ?? datos.enganchePct;
  const cuotas = Math.max(1, Math.round(opciones.cuotas ?? datos.cuotas));
  const precio = datos.precioPromedio;
  const porProyectar = Math.max(0, datos.porProyectar);

  const ventas = distribuirVentas(opciones.modelo, porProyectar, meses);
  const c = cuotaMensual(precio, enganchePct, cuotas, opciones.tasaAnualPct);

  // Lotes activos financiados por mes: los comprados en meses previos con
  // cuotas aún por correr (t - m <= n). La financiación arranca el mes
  // siguiente a la compra.
  const cartera: number[] = [];
  for (let t = 1; t <= meses; t++) {
    let activos = 0;
    for (let m = 1; m < t; m++) {
      if (t - m <= cuotas) activos += ventas[m - 1];
    }
    cartera.push(activos);
  }

  const filas: FilaProyeccion[] = [];
  let inv = porProyectar;
  let acumVendidos = datos.vendidos;
  let valorAcum = 0;
  let ingresoAcum = 0;
  let costoAcum = opciones.costoUrbTotal; // desembolso inicial (mes 0)
  let netoAcum = -opciones.costoUrbTotal;

  for (let t = 1; t <= meses; t++) {
    const vend = ventas[t - 1];
    const invInicial = inv;
    const invFinal = Math.max(0, invInicial - vend);
    inv = invFinal;
    acumVendidos += vend;

    const valorMes = vend * precio;
    valorAcum += valorMes;

    const enganches = vend * precio * (enganchePct / 100);
    const mensualidades = cartera[t - 1] * c;
    const ingresoMes = enganches + mensualidades;
    ingresoAcum += ingresoMes;

    const costoMes = ingresoMes * (opciones.costoVarPct / 100);
    costoAcum += costoMes;
    const netoMes = ingresoMes - costoMes;
    netoAcum += netoMes;

    filas.push({
      mes: t,
      vendidos: vend,
      acumVendidos,
      invInicial,
      invFinal,
      valorMes: redondear(valorMes),
      valorAcum: redondear(valorAcum),
      enganches: redondear(enganches),
      mensualidades: redondear(mensualidades),
      ingresoMes: redondear(ingresoMes),
      ingresoAcum: redondear(ingresoAcum),
      costoMes: redondear(costoMes),
      netoMes: redondear(netoMes),
      netoAcum: redondear(netoAcum),
    });
  }

  const conInversion = opciones.costoUrbTotal > 0;
  let paybackMes: number | null = null;
  if (conInversion) {
    const idx = filas.findIndex((f) => f.netoAcum >= 0);
    paybackMes = idx >= 0 ? filas[idx].mes : null;
  }

  const tirMensual = conInversion
    ? tirMensualDe([-opciones.costoUrbTotal, ...filas.map((f) => f.netoMes)])
    : null;

  const resumen: ResumenProyeccion = {
    idEtapa: datos.idEtapa,
    nombreEtapa: datos.nombreEtapa,
    totalLotes: datos.totalLotes,
    vendidos: datos.vendidos,
    reservados: datos.reservados,
    disponibles: datos.disponibles,
    precioPromedio: redondear(precio),
    porProyectar,
    enganchePct,
    cuotas,
    tasaAnualPct: opciones.tasaAnualPct,
    cuotaMensual: redondear(c),
    meses,
    modelo: opciones.modelo,
  };

  const metricas: MetricasProyeccion = {
    valorContratadoTotal: redondear(valorAcum),
    ingresoTotal: redondear(ingresoAcum),
    costoTotal: redondear(costoAcum),
    netoTotal: redondear(netoAcum),
    paybackMes,
    tirMensual,
    tirAnual: tirMensual !== null ? Math.pow(1 + tirMensual, 12) - 1 : null,
  };

  return { resumen, filas, metricas };
}
