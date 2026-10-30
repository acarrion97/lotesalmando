// Diagnóstico: replica la cadena que hace la app para leer pagos por empresa
// (proyectos -> etapas -> manzanas -> lotes -> ventas -> contratos ->
// cobranzas -> pagos) y compara contra la tabla pagos completa.
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const valor = (clave) => env.match(new RegExp(`^${clave}=(.*)$`, "m"))[1].trim();
const URL_SB = valor("VITE_SUPABASE_URL");
const KEY = valor("SUPABASE_SERVICE_ROLE_KEY");

const H = { Authorization: `Bearer ${KEY}`, apikey: KEY };

async function get(path) {
  const res = await fetch(`${URL_SB}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  return res.json();
}

async function idsFiltrados(tabla, col, filtroCol, vals) {
  const out = [];
  if (vals.length === 0) return out;
  const inList = vals.join(",");
  let offset = 0;
  for (;;) {
    const rows = await get(
      `${tabla}?select=${col}&${filtroCol}=in.(${inList})&order=${col}.asc&limit=1000&offset=${offset}`,
    );
    out.push(...rows.map((r) => r[col]));
    if (rows.length < 1000) return out;
    offset += 1000;
  }
}

const empresa = 14;
const proyectos = await get(`proyectos?select=id_proyecto&id_empresa=eq.${empresa}`);
const etapas = await idsFiltrados("etapas", "id_etapa", "id_proyecto", proyectos.map((p) => p.id_proyecto));
const manzanas = await idsFiltrados("manzana_bloque", "id_manzana", "id_etapa", etapas);
const lotes = await idsFiltrados("lotes", "id_lote", "id_manzana", manzanas);
const ventas = await idsFiltrados("ventas", "id_venta", "id_lote", lotes);
const contratos = await idsFiltrados("contratos", "id_contrato", "id_venta", ventas);
const cobranzas = await idsFiltrados("cobranzas", "id_cobranza", "id_contrato", contratos);

console.log(
  `empresa=${empresa} proyectos=${proyectos.length} etapas=${etapas.length} manzanas=${manzanas.length} lotes=${lotes.length} ventas=${ventas.length} contratos=${contratos.length} cobranzas=${cobranzas.length}`,
);

// Pagos por la misma ruta que SupabasePagoRepository: bloques de 500 ids.
const set = new Set(cobranzas);
const pagosApp = [];
for (let i = 0; i < cobranzas.length; i += 500) {
  const bloque = cobranzas.slice(i, i + 500);
  let offset = 0;
  for (;;) {
    const rows = await get(
      `pagos?select=id_pago,id_cobranza&id_cobranza=in.(${bloque.join(",")})&order=id_pago.desc&limit=1000&offset=${offset}`,
    );
    pagosApp.push(...rows.map((r) => r.id_pago));
    if (rows.length < 1000) break;
    offset += 1000;
  }
}

const todos = await get(`pagos?select=id_pago&id_pago=gt.0&order=id_pago.asc&limit=2000`);
const faltan = todos.map((p) => p.id_pago).filter((id) => !pagosApp.includes(id));
console.log(`cobranza 3563 en cadena: ${set.has(3563)}`);
console.log(`cobranza 3564 en cadena: ${set.has(3564)}`);
console.log(`pagos que veria la app: ${pagosApp.length} de ${todos.length} en BD`);
console.log(`ids > 714 en BD: ${todos.filter((p) => p.id_pago > 714).map((p) => p.id_pago).join(", ")}`);
console.log(`ids que la app NO veria (${faltan.length}): ${faltan.slice(-40).join(", ")}`);

// ¿A qué contrato/varta/lote pertenecen los que faltan?
if (faltan.length > 0) {
  const filas = await get(
    `pagos?select=id_pago,id_cobranza&id_pago=in.(${faltan.join(",")})&order=id_pago.asc`,
  );
  const cobs = [...new Set(filas.map((f) => f.id_cobranza))];
  const infoCob = await get(`cobranzas?select=id_cobranza,id_contrato&id_cobranza=in.(${cobs.join(",")})`);
  const contratosF = [...new Set(infoCob.map((c) => c.id_contrato))];
  const infoCon = await get(`contratos?select=id_contrato,id_venta&id_contrato=in.(${contratosF.join(",")})`);
  const ventasF = [...new Set(infoCon.map((c) => c.id_venta))];
  const infoVen = await get(`ventas?select=id_venta,id_lote&id_venta=in.(${ventasF.join(",")})`);
  const lotesF = [...new Set(infoVen.map((v) => v.id_lote))];
  const infoLote = await get(`lotes?select=id_lote,id_manzana&id_lote=in.(${lotesF.join(",")})`);
  const manzF = [...new Set(infoLote.map((l) => l.id_manzana))];
  const infoManz = await get(`manzana_bloque?select=id_manzana,id_etapa&id_manzana=in.(${manzF.join(",")})`);
  const etapF = [...new Set(infoManz.map((m) => m.id_etapa))];
  const infoEtap = await get(`etapas?select=id_etapa,id_proyecto&id_etapa=in.(${etapF.join(",")})`);
  const proyF = [...new Set(infoEtap.map((e) => e.id_proyecto))];
  const infoProy = await get(`proyectos?select=id_proyecto,id_empresa,nombre&id_proyecto=in.(${proyF.join(",")})`);
  console.log("proyectos de los pagos faltantes:");
  for (const p of infoProy) console.log(`  proyecto ${p.id_proyecto} "${p.nombre}" empresa=${p.id_empresa}`);
  console.log(`cobranzas faltantes en cadena: ${cobs.filter((c) => !set.has(c)).length} de ${cobs.length}`);
}
