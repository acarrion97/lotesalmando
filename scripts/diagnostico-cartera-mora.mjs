#!/usr/bin/env node
/**
 * Diagnostico: por que el reporte de cartera vencida no coincide con pagos.
 *
 * Cruza `cobranzas.estado` contra la suma real de `pagos` por cuota y lista:
 *   A) cuotas NO pagadas cuyo total de pagos ya cubre el monto (deberian
 *      estar 'pagada' pero siguen saliendo en cartera/mora),
 *   B) cuotas 'pagadas' que no tienen pagos o no cubren el monto,
 *   C) cuotas parcialmente pagadas (como el 40% de noviembre): el reporte
 *      las muestre por el monto COMPLETO de la cuota, no por el saldo.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_sec... \
 *     node scripts/diagnostico-cartera-mora.mjs
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

const [cobranzas, pagos, contratos] = await Promise.all([
  pagina("cobranzas", "id_cobranza, id_contrato, numero_cuota, monto_cuota, estado, fecha_vencimiento", "id_cobranza"),
  pagina("pagos", "id_pago, id_cobranza, monto_pagado, fecha_pago", "id_pago"),
  pagina("contratos", "id_contrato, id_venta", "id_contrato"),
]);

const ventaPorContrato = new Map(contratos.map((c) => [c.id_contrato, c.id_venta]));
const pagosPorCuota = new Map();
for (const p of pagos) {
  const lista = pagosPorCuota.get(p.id_cobranza) ?? [];
  lista.push(p);
  pagosPorCuota.set(p.id_cobranza, lista);
}

const hoy = new Date().toISOString().slice(0, 10);
const enMora = (c) =>
  c.estado !== "pagada" && c.fecha_vencimiento && c.fecha_vencimiento < hoy;

const A = []; // pagadas de facto, siguen en cartera
const B = []; // estado pagada sin pagos que la cubran
const C = []; // pagos parciales sobre cuota en mora

for (const c of cobranzas) {
  const ps = pagosPorCuota.get(c.id_cobranza) ?? [];
  const pagado = ps.reduce((s, p) => s + centavos(p.monto_pagado), 0);
  const monto = centavos(c.monto_cuota);
  const cubierta = pagado >= monto;

  if (c.estado !== "pagada" && cubierta) {
    A.push({ c, pagado, monto, ps });
  } else if (c.estado === "pagada" && !cubierta) {
    B.push({ c, pagado, monto, ps });
  } else if (enMora(c) && pagado > 0 && !cubierta) {
    C.push({ c, pagado, monto, ps });
  }
}

const resumen = (lista) =>
  lista.reduce((s, x) => s + (x.monto - x.pagado), 0);

console.log("== Cruce cobranzas.estado vs pagos ==");
console.log(`Cuotas totales: ${cobranzas.length} | pagos: ${pagos.length}`);
console.log(`A) Con pagos que cubren la cuota pero estado != pagada: ${A.length}`);
console.log(`   Saldo que el reporte aun cobra de ellas: ${money(resumen(A))}`);
console.log(`B) Estado 'pagada' sin pagos que la cubran: ${B.length}`);
console.log(`C) Cuotas en mora con pago parcial (el reporte muestra el monto completo): ${C.length}`);
console.log(`   Pagado en ellas: ${money(C.reduce((s, x) => s + x.pagado, 0))} | monto completo que reporta: ${money(C.reduce((s, x) => s + x.monto, 0))}`);
console.log(`   Saldo real: ${money(C.reduce((s, x) => s + (x.monto - x.pagado), 0))}`);

const mostrar = (titulo, lista, limite = 25) => {
  console.log(`\n== ${titulo} (${lista.length}) ==`);
  for (const x of lista.slice(0, limite)) {
    const fechas = x.ps.map((p) => `${p.fecha_pago}:${money(centavos(p.monto_pagado))}`).join(" ");
    console.log(
      `cuota ${x.c.id_cobranza} venta ${ventaPorContrato.get(x.c.id_contrato) ?? "?"} ` +
        `#${x.c.numero_cuota} vence ${x.c.fecha_vencimiento} estado=${x.c.estado} ` +
        `monto=${money(x.monto)} pagado=${money(x.pagado)} saldo=${money(x.monto - x.pagado)} | ${fechas}`,
    );
  }
  if (lista.length > limite) console.log(`... y ${lista.length - limite} mas`);
};

mostrar("A) Cubiertas pero en cartera (las que no deberian salir)", A);
mostrar("C) En mora con pago parcial", C);
mostrar("B) Pagadas sin pagos que las cubran", B, 10);
