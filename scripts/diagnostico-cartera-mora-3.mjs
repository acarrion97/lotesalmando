#!/usr/bin/env node
/**
 * Diagnostico 3: buscar el caso reportado.
 *
 * 1) Cuotas 'pagada' con pago parcial (cubren menos del 100%).
 * 2) Pagos recientes (octubre/noviembre 2026) y el estado de su cuota.
 * 3) Clientes con VARIAS ventas: si pagan en una venta y la mora viene de
 *    otra venta duplicada del mismo cliente, el reporte no coincide con pagos.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_sec... \
 *     node scripts/diagnostico-cartera-mora-3.mjs
 */
const SUPA = "@supabase/supabase-js";
let createClient;
try {
  ({ createClient } = await import(SUPA));
} catch {
  const local = new URL("../node_modules/@supabase/supabase-js/dist/index.mjs", import.meta.url);
  ({ createClient } = await import(local));
}

const URL_ = process.env.SUPABASE_URL;
const KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
if (!URL_ || !KEY_) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const sb = createClient(URL_, KEY_, { auth: { persistSession: false } });

const centavos = (n) => Math.round(Number(n ?? 0) * 100);
const money = (c) => `$${(c / 100).toFixed(2)}`;

async function pagina(tabla, select, orden) {
  const salida = [];
  let desde = 0;
  const tam = 1000;
  for (;;) {
    const { data, error } = await sb
      .from(tabla)
      .select(select)
      .order(orden, { ascending: true })
      .range(desde, desde + tam - 1);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    salida.push(...(data ?? []));
    if (!data || data.length < tam) break;
    desde += tam;
  }
  return salida;
}

const [cobranzas, pagos, contratos, ventas, clientes] = await Promise.all([
  pagina("cobranzas", "id_cobranza, id_contrato, numero_cuota, monto_cuota, estado, fecha_vencimiento", "id_cobranza"),
  pagina("pagos", "id_pago, id_cobranza, monto_pagado, fecha_pago", "id_pago"),
  pagina("contratos", "id_contrato, id_venta", "id_contrato"),
  pagina("ventas", "id_venta, id_cliente, id_lote, estado, precio_final, created_at", "id_venta"),
  pagina("cliente", "id_cliente, nombres", "id_cliente"),
]);

const hoy = new Date().toISOString().slice(0, 10);
const ventaPorContrato = new Map(contratos.map((c) => [c.id_contrato, c.id_venta]));
const clientePorVenta = new Map(ventas.map((v) => [v.id_venta, v.id_cliente]));
const nombreCliente = new Map(clientes.map((c) => [c.id_cliente, c.nombres]));
const ventaPorId = new Map(ventas.map((v) => [v.id_venta, v]));
const cuotaPorId = new Map(cobranzas.map((c) => [c.id_cobranza, c]));

const pagosPorCuota = new Map();
for (const p of pagos) {
  const l = pagosPorCuota.get(p.id_cobranza) ?? [];
  l.push(p);
  pagosPorCuota.set(p.id_cobranza, l);
}

// ---------------------------------------------------------- 1) parciales
console.log("== 1) Cuotas 'pagada' con pago PARCIAL (no cubren el monto) ==");
let parciales = [];
for (const c of cobranzas) {
  if (c.estado !== "pagada") continue;
  const ps = pagosPorCuota.get(c.id_cobranza) ?? [];
  const pagado = ps.reduce((s, p) => s + centavos(p.monto_pagado), 0);
  if (ps.length > 0 && pagado < centavos(c.monto_cuota)) {
    parciales.push({ c, pagado, monto: centavos(c.monto_cuota), ps });
  }
}
console.log(`Total: ${parciales.length}`);
for (const x of parciales.slice(0, 20)) {
  const idVenta = ventaPorContrato.get(x.c.id_contrato);
  console.log(
    `cuota ${x.c.id_cobranza} venta ${idVenta} (#${x.c.numero_cuota}) vence=${x.c.fecha_vencimiento} ` +
      `monto=${money(x.monto)} pagado=${money(x.pagado)} ` +
      `(${Math.round((x.pagado / x.monto) * 100)}%) pagos=${x.ps.map((p) => `${p.fecha_pago}:${money(centavos(p.monto_pagado))}`).join(",")}`,
  );
}

// ------------------------------------------------- 2) pagos recientes
console.log("\n== 2) Pagos desde septiembre 2026 y estado de su cuota ==");
const recientes = pagos
  .filter((p) => p.fecha_pago >= "2026-09-01")
  .sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));
console.log(`Total: ${recientes.length}`);
const porFecha = new Map();
for (const p of recientes) {
  porFecha.set(p.fecha_pago, (porFecha.get(p.fecha_pago) ?? 0) + 1);
}
console.log("por fecha:", [...porFecha.entries()].sort().map(([f, n]) => `${f}:${n}`).join(" "));

// ------------------------------------------------- 3) ventas duplicadas
console.log("\n== 3) Clientes con varias ventas: pagos vs mora por venta ==");
const ventasPorCliente = new Map();
for (const v of ventas) {
  const l = ventasPorCliente.get(v.id_cliente) ?? [];
  l.push(v);
  ventasPorCliente.set(v.id_cliente, l);
}

const cuotasPorVenta = new Map();
for (const c of cobranzas) {
  const idVenta = ventaPorContrato.get(c.id_contrato);
  if (idVenta === undefined) continue;
  const l = cuotasPorVenta.get(idVenta) ?? [];
  l.push(c);
  cuotasPorVenta.set(idVenta, l);
}

const enMora = (c) => c.estado !== "pagada" && c.fecha_vencimiento && c.fecha_vencimiento < hoy;

const conVarias = [...ventasPorCliente.entries()].filter(([, l]) => l.length > 1);
console.log(`Clientes con mas de una venta: ${conVarias.length}`);

let casos = 0;
for (const [idCliente, lista] of conVarias) {
  const filas = lista.map((v) => {
    const cs = cuotasPorVenta.get(v.id_venta) ?? [];
    const pagado = cs.reduce(
      (s, c) => s + (pagosPorCuota.get(c.id_cobranza) ?? []).reduce((t, p) => t + centavos(p.monto_pagado), 0),
      0,
    );
    const mora = cs.filter(enMora);
    return {
      v,
      total: cs.length,
      pagadas: cs.filter((c) => c.estado === "pagada").length,
      pagado,
      mora: mora.length,
      montoMora: mora.reduce((s, c) => s + centavos(c.monto_cuota), 0),
      idsMora: mora.map((c) => c.numero_cuota).sort((a, b) => a - b),
      ultima: cs
        .flatMap((c) => pagosPorCuota.get(c.id_cobranza) ?? [])
        .reduce((acc, p) => (!acc || p.fecha_pago > acc ? p.fecha_pago : acc), undefined),
    };
  });
  // Al menos una venta con pagos y otra con mora, o pagos en la misma venta
  // con mora restante.
  const conPagos = filas.filter((f) => f.pagado > 0);
  const conMora = filas.filter((f) => f.mora > 0);
  if (conPagos.length === 0 || conMora.length === 0) continue;
  casos++;
  if (casos > 25) continue;
  console.log(`\ncliente ${idCliente} (${(nombreCliente.get(idCliente) ?? "").slice(0, 30)})`);
  for (const f of filas) {
    console.log(
      `  venta ${f.v.id_venta} lote ${f.v.id_lote} estado=${f.v.estado} cuotas=${f.pagadas}/${f.total} ` +
        `pagado=${money(f.pagado)} ultimo=${f.ultima ?? "-"} ` +
        `mora=${f.mora}(${f.idsMora.join(",")}) montoMora=${money(f.montoMora)}`,
    );
  }
}
console.log(`\nClientes con pagos y mora (en una o varias ventas): ${casos}`);

// ------------------------------------ 4) el caso exacto: al dia hasta octubre
console.log("\n== 4) Ventas con pagos hasta octubre 2026 y aun con cuotas en mora ==");
let exactos = 0;
for (const [idVenta, cs] of cuotasPorVenta) {
  const pagosVenta = cs.flatMap((c) => pagosPorCuota.get(c.id_cobranza) ?? []);
  if (pagosVenta.length === 0) continue;
  const ultimo = pagosVenta.reduce(
    (acc, p) => (!acc || p.fecha_pago > acc ? p.fecha_pago : acc),
    undefined,
  );
  if (!ultimo || ultimo < "2026-10-01") continue;
  const mora = cs.filter(enMora);
  if (mora.length === 0) continue;
  exactos++;
  if (exactos > 25) continue;
  const idCliente = clientePorVenta.get(idVenta);
  console.log(
    `venta ${idVenta} (${(nombreCliente.get(idCliente) ?? "").slice(0, 28)}) ` +
      `ultimoPago=${ultimo} pagos=${pagosVenta.length} ` +
      `mora=${mora.map((c) => `${c.numero_cuota}(${c.fecha_vencimiento},${c.estado},${money(centavos(c.monto_cuota))})`).join(" ")}`,
  );
}
console.log(`Total: ${exactos}`);
