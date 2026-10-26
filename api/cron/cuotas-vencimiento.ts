/**
 * Cron diario de cuotas: avisa a los clientes que compraron un lote cuando
 * su cuota esta por vencer o ya vencio.
 *
 * URL: https://lotesalmando.com/api/cron/cuotas-vencimiento
 * Lo dispara el cron de Vercel (vercel.json -> crons) todos los dias a las
 * 8:00 UTC. Tambien se puede llamar a mano.
 *
 * Que hace, en orden:
 *   1) marca como `vencida` toda cuota pendiente cuya fecha ya paso;
 *   2) manda un aviso por correo a cada cliente con cuota por vencer
 *      (por defecto, dentro de los proximos 5 dias) o vencida;
 *   3) deja el aviso registrado en `aviso_cuota` para no repetirlo al dia
 *      siguiente (una vez por cuota y por tipo de aviso).
 *
 * El cliente que ya subio un comprobante (pendiente o aprobado) no recibe
 * el aviso de vencida: ya sabemos que esta pagando.
 *
 * Variables de entorno (Vercel -> Settings -> Environment Variables):
 *   SUPABASE_URL              -> https://<proyecto>.supabase.co (obligatoria)
 *   SUPABASE_SERVICE_ROLE_KEY -> clave service_role (obligatoria)
 *   CRON_SECRET               -> secreto que Vercel manda en el header
 *                                Authorization: Bearer <secreto> (obligatoria)
 *   APP_URL                   -> opcional, base del sitio (por defecto
 *                                https://lotesalmando.com)
 *   DIAS_AVISO_CUOTA          -> opcional, valor de respaldo si una empresa
 *                                no tiene configuracion (5)
 *   EMAIL_USER / EMAIL_PASS   -> Gmail y su contrasena de aplicacion; sin
 *                                ellas los correos se omiten y el cron
 *                                sigue funcionando.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { avisarCuotaPorVencer, avisarCuotaVencida, type EstadoCorreo } from "../../lib/correo.js";

type Req = IncomingMessage & { body?: unknown };

function responder(res: ServerResponse, status: number, cuerpo: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(cuerpo));
}

/** "2026-10-20" en hora local de Ecuador (UTC-5). */
function hoyLocal(): string {
  const ahora = new Date();
  // El negocio opera en America/Guayaquil: se toma la fecha de ahi.
  const enEcuador = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  return enEcuador.toISOString().slice(0, 10);
}

/** Dias calendario entre hoy y una fecha "YYYY-MM-DD". */
function diasHasta(fecha: string): number {
  const hoy = new Date(`${hoyLocal()}T00:00:00Z`).getTime();
  const objetivo = new Date(`${fecha.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((objetivo - hoy) / (24 * 60 * 60 * 1000));
}

function cabecera(req: Req, nombre: string): string {
  const valor = req.headers[nombre];
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

interface CuotaRow {
  id_cobranza: number;
  numero_cuota: number;
  monto_cuota: number;
  fecha_vencimiento: string | null;
  estado: string;
  id_contrato: number;
}

interface ContratoRow {
  id_contrato: number;
  id_venta: number;
  numero_contrato: string;
}

interface VentaRow {
  id_venta: number;
  id_cliente: number;
  id_lote: number;
}

interface ClienteRow {
  id_cliente: number;
  nombres: string;
  email: string | null;
  cedula_ruc: string | null;
  id_empresa: number | null;
}

interface LoteRow {
  id_lote: number;
  numero_lote: string;
  id_manzana: number;
}

interface ManzanaRow {
  id_manzana: number;
  nombre_codigo: string | null;
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method === "GET" || req.method === "OPTIONS") {
    return responder(res, 200, { ok: true, mensaje: "Avisos de cuotas. Usa GET o POST." });
  }

  // Vercel manda Authorization: Bearer <CRON_SECRET> en cada llamada del cron.
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return responder(res, 500, {
      ok: false,
      error: "Falta CRON_SECRET en las variables de entorno de Vercel.",
    });
  }
  const recibido = cabecera(req, "authorization").replace(/^Bearer\s+/i, "").trim();
  if (recibido !== secreto) {
    return responder(res, 401, { ok: false, error: "No autorizado." });
  }

  const urlSupabase = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !serviceKey) {
    return responder(res, 500, {
      ok: false,
      error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.",
    });
  }

  const sb = createClient(urlSupabase, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const diasAvisoConfigurado = Number(process.env.DIAS_AVISO_CUOTA ?? "5");
  const diasAvisoPorDefecto =
    Number.isInteger(diasAvisoConfigurado) &&
    diasAvisoConfigurado >= 1 &&
    diasAvisoConfigurado <= 30
      ? diasAvisoConfigurado
      : 5;
  const baseSitio = (process.env.APP_URL ?? "https://lotesalmando.com").replace(/\/+$/, "");
  const portalUrl = `${baseSitio}/portal-cliente`;
  const hoy = hoyLocal();

  // 1) Las cuotas que ya vencieron pasan a estado 'vencida'.
  const { error: errorVencidas } = await sb
    .from("cobranzas")
    .update({ estado: "vencida" })
    .eq("estado", "pendiente")
    .lt("fecha_vencimiento", hoy);
  if (errorVencidas) {
    return responder(res, 500, { ok: false, error: errorVencidas.message });
  }

  // 2) Cuotas a mirar: las que siguen pendientes o ya estan vencidas.
  const { data: cuotasRaw, error: errorCuotas } = await sb
    .from("cobranzas")
    .select("id_cobranza, numero_cuota, monto_cuota, fecha_vencimiento, estado, id_contrato")
    .in("estado", ["pendiente", "vencida"]);
  if (errorCuotas) {
    return responder(res, 500, { ok: false, error: errorCuotas.message });
  }
  const cuotas = (cuotasRaw ?? []) as CuotaRow[];
  if (cuotas.length === 0) {
    return responder(res, 200, { ok: true, marcados: 0, avisados: 0, mensaje: "No hay cuotas por avisar." });
  }

  // 3) Avisos ya enviados (idempotencia) y comprobantes ya subidos.
  const idsAviso = cuotas.map((c) => c.id_cobranza);
  const [{ data: avisosRaw }, { data: comprobantesRaw }] = await Promise.all([
    sb.from("aviso_cuota").select("id_cobranza, tipo").in("id_cobranza", idsAviso),
    sb.from("comprobantes").select("id_cobranza, estado").in("id_cobranza", idsAviso),
  ]);
  const yaAvisados = new Set(
    (avisosRaw ?? []).map((a) => `${a.id_cobranza}:${a.tipo}`),
  );
  const conComprobante = new Set(
    (comprobantesRaw ?? [])
      .filter((c) => c.estado === "pendiente" || c.estado === "aprobado")
      .map((c) => c.id_cobranza as number),
  );

  // 4) Datos de contrato, venta, cliente y lote (se resuelven en consultas
  //    sueltas: los joins anidados de PostgREST son fragiles con este schema).
  const idsContrato = [...new Set(cuotas.map((c) => c.id_contrato))];
  const { data: contratosRaw } = await sb
    .from("contratos")
    .select("id_contrato, id_venta, numero_contrato")
    .in("id_contrato", idsContrato);
  const contratos = (contratosRaw ?? []) as ContratoRow[];

  const idsVenta = [...new Set(contratos.map((c) => c.id_venta))];
  const { data: ventasRaw } = await sb
    .from("ventas")
    .select("id_venta, id_cliente, id_lote")
    .in("id_venta", idsVenta);
  const ventas = (ventasRaw ?? []) as VentaRow[];

  const idsCliente = [...new Set(ventas.map((v) => v.id_cliente))];
  const { data: clientesRaw } = await sb
    .from("cliente")
    .select("id_cliente, nombres, email, cedula_ruc, id_empresa")
    .in("id_cliente", idsCliente);
  const clientes = (clientesRaw ?? []) as ClienteRow[];

  // Moneda de cada empresa (el monto del correo va con su moneda).
  const idsEmpresa = [...new Set(clientes.map((c) => c.id_empresa).filter((v): v is number => v !== null))];
  let configuracionesRaw: {
    id_empresa: number;
    moneda: string | null;
    dias_aviso_cuota: number;
  }[] = [];
  if (idsEmpresa.length > 0) {
    const { data, error } = await sb
      .from("configuracion")
      .select("id_empresa, moneda, dias_aviso_cuota")
      .in("id_empresa", idsEmpresa);
    if (error) {
      return responder(res, 500, {
        ok: false,
        error: `No se pudo cargar la configuracion de las empresas: ${error.message}`,
      });
    }
    configuracionesRaw = data ?? [];
  }
  const monedaPorEmpresa = new Map(
    configuracionesRaw.map((c) => [c.id_empresa, c.moneda ?? "USD"]),
  );
  const diasAvisoPorEmpresa = new Map(
    configuracionesRaw.map((c) => [c.id_empresa, c.dias_aviso_cuota]),
  );

  const idsLote = [...new Set(ventas.map((v) => v.id_lote))];
  const { data: lotesRaw } = await sb
    .from("lotes")
    .select("id_lote, numero_lote, id_manzana")
    .in("id_lote", idsLote);
  const lotes = (lotesRaw ?? []) as LoteRow[];

  const idsManzana = [...new Set(lotes.map((l) => l.id_manzana))];
  const { data: manzanasRaw } = await sb
    .from("manzana_bloque")
    .select("id_manzana, nombre_codigo")
    .in("id_manzana", idsManzana);
  const manzanas = (manzanasRaw ?? []) as ManzanaRow[];

  const contratoPorId = new Map(contratos.map((c) => [c.id_contrato, c]));
  const ventaPorId = new Map(ventas.map((v) => [v.id_venta, v]));
  const clientePorId = new Map(clientes.map((c) => [c.id_cliente, c]));
  const lotePorId = new Map(lotes.map((l) => [l.id_lote, l]));
  const manzanaPorId = new Map(manzanas.map((m) => [m.id_manzana, m]));

  let enviados = 0;
  let omitidos = 0;
  const errores: string[] = [];

  for (const cuota of cuotas) {
    if (!cuota.fecha_vencimiento) continue;

    const contrato = contratoPorId.get(cuota.id_contrato);
    if (!contrato) continue;
    const venta = ventaPorId.get(contrato.id_venta);
    if (!venta) continue;
    const cliente = clientePorId.get(venta.id_cliente);
    const diasAviso = cliente?.id_empresa
      ? (diasAvisoPorEmpresa.get(cliente.id_empresa) ?? diasAvisoPorDefecto)
      : diasAvisoPorDefecto;
    const dias = diasHasta(cuota.fecha_vencimiento);
    const tipo: "por_vencer" | "vencida" | null =
      cuota.estado === "vencida" ? "vencida" : dias >= 0 && dias <= diasAviso ? "por_vencer" : null;
    if (!tipo) continue;

    // Ya se le aviso antes: no se repite.
    if (yaAvisados.has(`${cuota.id_cobranza}:${tipo}`)) continue;
    // Si el cliente ya mando la prueba, no se le reclama.
    if (tipo === "vencida" && conComprobante.has(cuota.id_cobranza)) continue;

    if (!cliente?.email?.trim()) {
      omitidos++;
      continue;
    }

    const lote = lotePorId.get(venta.id_lote);
    const manzana = lote ? manzanaPorId.get(lote.id_manzana) : undefined;
    const etiquetaLote = lote
      ? manzana?.nombre_codigo
        ? `${manzana.nombre_codigo} - Lote ${lote.numero_lote}`
        : `Lote ${lote.numero_lote}`
      : null;

    const datos = {
      para: cliente.email,
      nombre: cliente.nombres,
      numeroContrato: contrato.numero_contrato,
      lote: etiquetaLote,
      numeroCuota: cuota.numero_cuota,
      montoCuota: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cliente.id_empresa ? (monedaPorEmpresa.get(cliente.id_empresa) ?? "USD") : "USD",
      }).format(Number(cuota.monto_cuota)),
      fechaVencimiento: cuota.fecha_vencimiento.slice(0, 10),
      portalUrl,
    };

    let estado: EstadoCorreo;
    try {
      estado =
        tipo === "por_vencer"
          ? await avisarCuotaPorVencer({ ...datos, diasRestantes: dias })
          : await avisarCuotaVencida({ ...datos, diasVencida: Math.abs(dias) });
    } catch (error) {
      errores.push(`cuota ${cuota.id_cobranza}: ${(error as Error).message}`);
      continue;
    }

    if (estado === "enviado") {
      enviados++;
      // Se registra el aviso para no mandarlo otra vez manana.
      await sb
        .from("aviso_cuota")
        .insert({ id_cobranza: cuota.id_cobranza, tipo })
        .then(({ error }) => {
          if (error) errores.push(`aviso cuota ${cuota.id_cobranza}: ${error.message}`);
        });
    } else {
      omitidos++;
    }
  }

  return responder(res, 200, {
    ok: true,
    cuotasRevisadas: cuotas.length,
    correosEnviados: enviados,
    omitidos,
    errores,
  });
}
