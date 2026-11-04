// ¿Cuántos pagos "ve" cada empresa siguiendo la cadena de la app?
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

for (const empresa of [14, 16]) {
  const proyectos = await get(`proyectos?select=id_proyecto&id_empresa=eq.${empresa}`);
  const etapas = await idsFiltrados("etapas", "id_etapa", "id_proyecto", proyectos.map((p) => p.id_proyecto));
  const manzanas = await idsFiltrados("manzana_bloque", "id_manzana", "id_etapa", etapas);
  const lotes = await idsFiltrados("lotes", "id_lote", "id_manzana", manzanas);
  const ventas = await idsFiltrados("ventas", "id_venta", "id_lote", lotes);
  const contratos = await idsFiltrados("contratos", "id_contrato", "id_venta", ventas);
  const cobranzas = await idsFiltrados("cobranzas", "id_cobranza", "id_contrato", contratos);

  const pagosApp = [];
  for (let i = 0; i < cobranzas.length; i += 500) {
    const bloque = cobranzas.slice(i, i + 500);
    let offset = 0;
    for (;;) {
      const rows = await get(
        `pagos?select=id_pago&id_cobranza=in.(${bloque.join(",")})&order=id_pago.desc&limit=1000&offset=${offset}`,
      );
      pagosApp.push(...rows.map((r) => r.id_pago));
      if (rows.length < 1000) break;
      offset += 1000;
    }
  }
  const max = pagosApp.length ? Math.max(...pagosApp) : "-";
  console.log(
    `empresa ${empresa}: cobranzas=${cobranzas.length} pagos=${pagosApp.length} max id_pago=${max}`,
  );
  console.log(`   715 visible?: ${pagosApp.includes(715)} | 714 visible?: ${pagosApp.includes(714)}`);
}
