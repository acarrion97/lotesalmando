#!/usr/bin/env node
/**
 * Proyección de ventas e ingresos para un proyecto de lotificación.
 *
 * Lee datos REALES de Supabase (lotes, precios, esquema de cobranza) y proyecta
 * la absorción restante con un modelo matemático, para generar:
 *   1. Tabla de absorción (ventas mensuales)
 *   2. Tabla de valor contratado (acumulado)
 *   3. Flujo de caja mensual (enganches + mensualidades = ingresos) y neto
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=sb_pub_xxx \
 *     node scripts/proyeccion-financiera.mjs \
 *     [--etapa=3] [--meses=12] [--modelo=logistic|bass|gompertz] \
 *     [--enganche=7] [--cuotas=48] [--tasa=0] \
 *     [--vendidos=auto] [--costo_urb=0] [--costo_var=0]
 *
 * Todos los argumentos son opcionales y por defecto salen de los datos reales.
 */

// ---------------------------------------------------------------- imports
const SUPA = "@supabase/supabase-js";
let createClient;
try {
  ({ createClient } = await import(SUPA));
} catch {
  const local = new URL("../node_modules/@supabase/supabase-js/dist/index.mjs", import.meta.url);
  ({ createClient } = await import(local));
}

// ---------------------------------------------------------------- args
const argv = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v === undefined ? true : Number.isNaN(Number(v)) ? v : Number(v)];
  }),
);

const URL_ = process.env.SUPABASE_URL;
const KEY_ = process.env.SUPABASE_KEY;
if (!URL_ || !KEY_) {
  console.error("Faltan SUPABASE_URL y SUPABASE_KEY en el entorno.");
  process.exit(1);
}
const db = createClient(URL_, KEY_);

const q = async (t, cols = "*") => {
  const { data, error } = await db.from(t).select(cols);
  if (error) throw new Error(`${t}: ${error.message}`);
  return data;
};

// ---------------------------------------------------------------- datos
const [lotes, etapas, manzanas, cobranzas, contratos, ventas] = await Promise.all([
  q("lotes"), q("etapas"), q("manzana_bloque"), q("cobranzas"), q("contratos"), q("ventas"),
]);

// Etapa objetivo: por defecto la que más lotes tiene.
const conteoEtapa = {};
for (const m of manzanas) conteoEtapa[m.id_etapa] = (conteoEtapa[m.id_etapa] ?? 0) + 1;
const idEtapaSel = argv.etapa ?? Number(Object.entries(conteoEtapa).sort((a, b) => b[1] - a[1])[0][0]);
const etapaSel = etapas.find((e) => e.id_etapa === idEtapaSel);
const manzIds = new Set(manzanas.filter((m) => m.id_etapa === idEtapaSel).map((m) => m.id_manzana));
const lotesEtapa = lotes.filter((l) => manzIds.has(l.id_manzana));

// Inventario por estado
const est = {};
for (const l of lotesEtapa) est[l.estado] = (est[l.estado] ?? 0) + 1;
const K = lotesEtapa.length;                          // total de lotes
const vendidos = est.vendido ?? 0;
const reservados = est.reservado ?? 0;
const disponibles = est.disponible ?? 0;

// Esquema de cobranza real (mediana) para calibrar enganche y nº de cuotas
const contLote = new Map();
for (const v of ventas) { const c = contratos.find((c) => c.id_venta === v.id_venta); if (c) contLote.set(c.id_contrato, c); }
const cobPorCont = {};
for (const c of cobranzas) if (contLote.has(c.id_contrato)) (cobPorCont[c.id_contrato] ??= []).push(c);

const engPcts = [], nCuotas = [], precios = [];
for (const [id, arr] of Object.entries(cobPorCont)) {
  arr.sort((a, b) => a.numero_cuota - b.numero_cuota);
  const cont = contLote.get(id);
  if (arr[0] && cont?.monto_total) engPcts.push((Number(arr[0].monto_cuota) / Number(cont.monto_total)) * 100);
  nCuotas.push(arr.length - 1); // menos el enganche
}
for (const l of lotesEtapa) if (l.precio_lista) precios.push(Number(l.precio_lista));

const mediana = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const precioProm = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;

const ENGANCHE_PCT = argv.enganche ?? (engPcts.length ? mediana(engPcts) : 10);
const CUOTAS = argv.cuotas ?? (nCuotas.length ? Math.round(mediana(nCuotas)) : 48);
const TASA_ANUAL = argv.tasa ?? 0;                    // interés anual (0 = sin interés)
const MESES = argv.meses ?? 12;
// Por defecto proyecta todo lo que no está "vendido" (reservados + disponibles).
const POR_VENDER = argv.vendidos === "auto" || argv.vendidos === undefined ? K - vendidos : Number(argv.vendidos);

// Costos (supuestos; ajustar con datos reales del proyecto)
const COSTO_URB = argv.costo_urb ?? 0;                // urbanización total (se prorratea)
const COSTO_VAR_PCT = argv.costo_var ?? 0;            // % sobre ingreso (impuestos, comisiones)

// ---------------------------------------------------------------- modelos
// Cada modelo define una curva "cruda" Qraw(t) en escala 0..1. Se normaliza
// para que Q(T) = R exactamente (absorbe todo el inventario al final del
// horizonte) y Q(0) = 0. Así la cola desacelera de forma natural en vez de
// concentrar el remanente en el último mes.
function normalizar(R, T, Qraw) {
  const base = Qraw(0);
  const span = Qraw(T) - base || 1;
  return (t) => (R * (Qraw(t) - base)) / span;
}

const modelos = {
  // Logística (Pearl-Reed): S simétrica. `a` controla la pendiente; ~6/T cubre ~99%.
  logistic(R, T) {
    const a = 6 / T, t0 = T / 2;
    return normalizar(R, T, (t) => 1 / (1 + Math.exp(-a * (t - t0))));
  },
  // Bass: innovación (p) + imitación/boca en boca (q). Más realista si hay referidos.
  bass(R, T, p = 0.03, q = 0.38) {
    return normalizar(R, T, (t) => (1 - Math.exp(-(p + q) * t)) / (1 + (q / p) * Math.exp(-(p + q) * t)));
  },
  // Gompertz: asimétrica; pico antes de la mitad y desaceleración final más lenta.
  gompertz(R, T) {
    const a = 6 / T, t0 = T * 0.45;
    return normalizar(R, T, (t) => Math.exp(-Math.exp(-a * (t - t0))));
  },
};

const nombreModelo = argv.modelo ?? "logistic";
const Q = modelos[nombreModelo](POR_VENDER, MESES);

// Ventas por mes = diferencia del acumulado normalizado (redondeo consistente).
const ventasMes = [];
let acumEnt = 0;
for (let t = 1; t <= MESES; t++) {
  let v = Math.round(Q(t)) - acumEnt;
  if (t === MESES) v = POR_VENDER - acumEnt;          // cierra exacto el total
  v = Math.max(0, v);
  ventasMes.push(v); acumEnt += v;
}

// ---------------------------------------------------------------- flujo
// Cuota mensual del financiamiento (precio*(1-enganche) sobre `cuotas`, con interés opcional).
const financiadoProm = precioProm * (1 - ENGANCHE_PCT / 100);
const i = TASA_ANUAL / 100 / 12;
const cuotaMensual = i > 0
  ? (financiadoProm * i * Math.pow(1 + i, CUOTAS)) / (Math.pow(1 + i, CUOTAS) - 1)
  : financiadoProm / CUOTAS;

// Cartera: cada lote vendido en el mes m empieza a aportar su cuota en m+1.
const cartera = new Array(MESES + 1).fill(0);         // lotes activos por mes
for (let t = 1; t <= MESES; t++) {
  let activos = 0;
  for (let m = 1; m < t; m++) {                        // comprados en meses anteriores
    const cuotasTranscurridas = t - m;                 // cuotas ya vencidas (1..)
    if (cuotasTranscurridas <= CUOTAS) activos += ventasMes[m - 1];
  }
  cartera[t] = activos;
}

const filas = [];
let acumValor = 0, acumIngreso = 0, acumNeto = 0;
for (let t = 1; t <= MESES; t++) {
  const invIni = t === 1 ? disponibles + reservados : filas[t - 2].invFin;
  const vend = ventasMes[t - 1];
  const invFin = invIni - vend;

  const valorMes = vend * precioProm;
  acumValor += valorMes;

  const engancheMes = vend * precioProm * (ENGANCHE_PCT / 100);
  const mensualidadesMes = cartera[t] * cuotaMensual;
  const ingresoMes = engancheMes + mensualidadesMes;
  acumIngreso += ingresoMes;

  const urbMes = COSTO_URB / MESES;
  const costoVar = ingresoMes * (COSTO_VAR_PCT / 100);
  const costoMes = urbMes + costoVar;
  const netoMes = ingresoMes - costoMes;
  acumNeto += netoMes;

  filas.push({
    mes: t, vend, acumVend: vendidos + ventasMes.slice(0, t).reduce((a, b) => a + b, 0),
    invIni, invFin, valorMes, acumValor, engancheMes, mensualidadesMes, ingresoMes,
    acumIngreso, costoMes, netoMes, acumNeto, cartera: cartera[t],
  });
}

// ---------------------------------------------------------------- métricas
function tir(flujos) {
  const npv = (r) => flujos.reduce((s, f, k) => s + f / Math.pow(1 + r, k), 0);
  let lo = -0.99, hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let n = 0; n < 200; n++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
const netosConInversion = filas.map((f, k) => f.netoMes - (k === 0 ? COSTO_URB : 0));
const tirMensual = COSTO_URB > 0 ? tir(netosConInversion) : null;
const payback = filas.findIndex((f) => f.acumNeto >= 0) + 1;

// ---------------------------------------------------------------- salida
const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
console.log("\n# Proyección — " + (etapaSel?.nombre_etapa ?? `Etapa ${idEtapaSel}`));
console.log(`Modelo: ${nombreModelo} | ${MESES} meses | lote prom ${usd(precioProm)}`);
console.log(`Lotes: ${K} totales — ${vendidos} vendidos, ${reservados} reservados, ${disponibles} disponibles`);
console.log(`Por vender (proyectado): ${POR_VENDER} | enganche ${ENGANCHE_PCT.toFixed(1)}% | ${CUOTAS} cuotas | tasa ${(TASA_ANUAL * 100).toFixed(1)}% anual`);
console.log(`Cuota mensual promedio: ${usd(cuotaMensual)}\n`);

console.log("| Mes | Vendidos | Acum | Inv. inicial | Inv. final |");
console.log("|---|---|---|---|---|");
for (const f of filas) console.log(`| ${f.mes} | ${f.vend} | ${f.acumVend} | ${f.invIni} | ${f.invFin} |`);

console.log("\n## Valor contratado");
console.log("| Mes | Valor del mes | Acumulado |");
console.log("|---|---|---|");
for (const f of filas) console.log(`| ${f.mes} | ${usd(f.valorMes)} | ${usd(f.acumValor)} |`);

console.log("\n## Flujo de caja (ingresos)");
console.log("| Mes | Enganches | Mensualidades | Ingreso total | Acum. ingreso |");
console.log("|---|---|---|---|---|");
for (const f of filas) console.log(`| ${f.mes} | ${usd(f.engancheMes)} | ${usd(f.mensualidadesMes)} | ${usd(f.ingresoMes)} | ${usd(f.acumIngreso)} |`);

if (COSTO_URB > 0 || COSTO_VAR_PCT > 0) {
  console.log("\n## Flujo neto (ingresos − costos)");
  console.log("| Mes | Ingresos | Costos | Neto | Acum. neto |");
  console.log("|---|---|---|---|---|");
  for (const f of filas) console.log(`| ${f.mes} | ${usd(f.ingresoMes)} | ${usd(f.costoMes)} | ${usd(f.netoMes)} | ${usd(f.acumNeto)} |`);
}

console.log("\n## Métricas");
console.log(`- Valor contratado total proyectado: ${usd(acumValor)}`);
console.log(`- Ingreso de caja total proyectado:  ${usd(acumIngreso)}`);
if (tirMensual != null) {
  const tirAnual = (Math.pow(1 + tirMensual, 12) - 1) * 100;
  console.log(`- TIR mensual: ${(tirMensual * 100).toFixed(2)}%  |  TIR anual: ${tirAnual.toFixed(2)}%`);
}
if (payback > 0) console.log(`- Payback (neto acumulado ≥ 0): mes ${payback}`);
