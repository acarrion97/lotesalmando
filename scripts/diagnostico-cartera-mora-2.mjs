#!/usr/bin/env node
/**
 * Diagnostico 2: que salen en "Cartera y mora" y por que.
 *
 * Para cada venta con cuotas en mora (estado != pagada y vencimiento pasado)
 * muestra: estado de la venta, cuotas pagadas / en mora, pagos registrados
 * y el ultimo pago. Busca el caso reportado: clientes al dia (cuotas pagadas
 * hasta octubre + parte de noviembre) que aun salen en cartera vencida.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_sec... \
 *     node scripts/diagnostico-cartera-mora-2.mjs
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
  pagina("ventas", "id_venta, id_cliente, estado, precio_final", "id_venta"),
  pagina("cliente", "id_cliente, nombres", "id_cliente"),
]);

const hoy = new Date().toISOString().slice(0, 10);
const ventaPorContrato = new Map(contratos.map((c) => [c.id_contrato, c.id_venta]));
const clientePorVenta = new Map(ventas.map((v) => [v.id_venta, v.id_cliente]));
const nombreCliente = new Map(clientes.map((c) => [c.id_cliente, c.nombres]));
const ventaPorId = new Map(ventas.map((v) => [v.id_venta, v]));

const pagosPorCuota = new Map();
for (const p of pagos) {
  const l = pagosPorCuota.get(p.id_cobranza) ?? [];
  l.push(p);
  pagosPorCuota.set(p.id_cobranza, l);
}

// Cuotas por venta
const cuotasPorVenta = new Map();
for (const c of cobranzas) {
  const idVenta = ventaPorContrato.get(c.id_contrato);
  if (idVenta === undefined) continue;
  const l = cuotasPorVenta.get(idVenta) ?? [];
  l.push(c);
  cuotasPorVenta.set(idVenta, l);
}

const enMora = (c) => c.estado !== "pagada" && c.fecha_vencimiento && c.fecha_vencimiento < hoy;

// Resumen por venta de las que tienen al menos una cuota en mora
const filas = [];
for (const [idVenta, lista] of cuotasPorVenta) {
  const mora = lista.filter(enMora);
  if (mora.length === 0) continue;
  const pagadas = lista.filter((c) => c.estado === "pagada");
  const pagosVenta = lista.flatMap((c) => pagosPorCuota.get(c.id_cobranza) ?? []);
  const pagado = pagosVenta.reduce((s, p) => s + centavos(p.monto_pagado), 0);
  const ultimo = pagosVenta.reduce(
    (acc, p) => (!acc || p.fecha_pago > acc ? p.fecha_pago : acc),
    undefined,
  );
  filas.push({
    idVenta,
    venta: ventaPorId.get(idVenta),
    cliente: nombreCliente.get(clientePorVenta.get(idVenta)) ?? `#${clientePorVenta.get(idVenta)}`,
    total: lista.length,
    pagadas: pagadas.length,
    mora: mora.length,
    montoMora: mora.reduce((s, c) => s + centavos(c.monto_cuota), 0),
    pagado,
    ultimo,
    idsMora: mora.map((c) => c.numero_cuota).sort((a, b) => a - b),
    estados: [...new Set(lista.map((c) => c.estado))].join("/"),
  });
}

filas.sort((a, b) => b.mora - a.mora);

console.log(`Ventas con cuotas en mora: ${filas.length}`);
console.log(
  `De esas, con pagos registrados: ${filas.filter((f) => f.pagado > 0).length}`,
);
console.log(
  `De esas, con venta cancelada: ${filas.filter((f) => f.venta?.estado === "cancelada").length}`,
);

console.log("\n== Ventas con cuotas en mora (primeras 40) ==");
console.log(
  "venta | cliente | venta.estado | cuotas(pagadas/total) | enMora | montoMora | pagado | ultimoPago | #cuotas en mora",
);
for (const f of filas.slice(0, 40)) {
  console.log(
    `${f.idVenta} | ${f.cliente.slice(0, 28)} | ${f.venta?.estado} | ${f.pagadas}/${f.total} | ` +
      `${f.mora} | ${money(f.montoMora)} | ${money(f.pagado)} | ${f.ultimo ?? "-"} | ${f.idsMora.join(",")}`,
  );
}

// Caso sospechoso: la venta tiene pagos y sus cuotas hasta cierto mes estan
// pagadas, pero aun asi quedan cuotas en mora con numero de cuota alto.
console.log("\n== Sospechosas: tienen pagos pero salen en mora ==");
const sospechosas = filas.filter((f) => f.pagado > 0);
for (const f of sospechosas.slice(0, 40)) {
  console.log(
    `${f.idVenta} | ${f.cliente.slice(0, 28)} | ${f.venta?.estado} | ${f.pagadas}/${f.total} | ` +
      `mora=${f.mora} (${f.idsMora.join(",")}) | montoMora=${money(f.montoMora)} | ` +
      `pagado=${money(f.pagado)} | ultimo=${f.ultimo ?? "-"} | estados=${f.estados}`,
  );
}
if (sospechosas.length > 40) console.log(`... y ${sospechosas.length - 40} mas`);

// Detalle de las cuotas en mora de esas ventas sospechosas
console.log("\n== Detalle de cuotas en mora de ventas con pagos ==");
for (const f of sospechosas.slice(0, 15)) {
  const lista = cuotasPorVenta.get(f.idVenta) ?? [];
  console.log(`\nventa ${f.idVenta} (${f.cliente}) estado=${f.venta?.estado}`);
  for (const c of lista.sort((a, b) => a.numero_cuota - b.numero_cuota)) {
    const ps = pagosPorCuota.get(c.id_cobranza) ?? [];
    console.log(
      `  cuota ${c.numero_cuota} id=${c.id_cobranza} vence=${c.fecha_vencimiento} ` +
        `estado=${c.estado} monto=${money(centavos(c.monto_cuota))} ` +
        `pagos=${ps.map((p) => `${p.fecha_pago}:${money(centavos(p.monto_pagado))}`).join(",") || "-"}`,
    );
  }
}
