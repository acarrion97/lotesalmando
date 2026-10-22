/**
 * Aviso al cliente del resultado de la revision de su comprobante.
 *
 * URL: https://lotesalmando.com/api/comprobantes/avisar
 * Lo llama el front (useRevisionComprobante) apenas aprueba o rechaza.
 * Es un envio "best effort": si falla, la revision ya quedo hecha igual.
 *
 * Que hace, en orden:
 *   1) valida el access token de Supabase Auth (el de la sesion del asesor);
 *   2) ubica al usuario por su email y toma su empresa;
 *   3) sigue la cadena comprobante -> cobranza -> contrato -> venta ->
 *      cliente y comprueba que el cliente sea de esa misma empresa;
 *   4) manda el correo de "aprobado" o "rechazado" con el motivo.
 *
 * Por que no es un cron: el aviso tiene que salir apenas se revisa, no a las
 * 8:00 del dia siguiente. El token de la sesion ya identifica al asesor, asi
 * que no hace falta ningun secreto extra en el navegador.
 *
 * Variables de entorno (Vercel -> Settings -> Environment Variables):
 *   SUPABASE_URL              -> https://<proyecto>.supabase.co (obligatoria)
 *   SUPABASE_SERVICE_ROLE_KEY -> clave service_role (obligatoria)
 *   APP_URL                   -> opcional, base del portal (por defecto
 *                                https://lotesalmando.com)
 *   EMAIL_USER / EMAIL_PASS   -> Gmail y su contrasena de aplicacion; sin
 *                                ellas el aviso se omite y la revision
 *                                sigue funcionando.
 *
 * Respuestas: 400 sin idComprobante o revision todavia pendiente,
 * 401 sin token o token invalido, 403 si el cliente es de otra empresa,
 * 404 si no existe el comprobante y 200 con `correo` en el resto.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import {
  avisarComprobanteAprobado,
  avisarComprobanteRechazado,
  type EstadoCorreo,
} from "../../lib/correo.js";

type Req = IncomingMessage & { body?: unknown };

function responder(res: ServerResponse, status: number, cuerpo: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(cuerpo));
}

function cabecera(req: Req, nombre: string): string {
  const valor = req.headers[nombre];
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Body JSON: Vercel ya lo parsea, pero por las dudas acepta string. */
function cuerpo(req: Req): Record<string, unknown> {
  const body = req.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (body ?? {}) as Record<string, unknown>;
}

interface ComprobanteRow {
  id_comprobante: number;
  id_cobranza: number;
  id_cliente: number;
  monto_pagado: number;
  estado: string;
  nota_rechazo: string | null;
}

interface CobranzaRow {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
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
  id_empresa: number | null;
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method === "GET" || req.method === "OPTIONS") {
    return responder(res, 200, { ok: true, mensaje: "Aviso de revision de comprobante. Usa POST." });
  }
  if (req.method !== "POST") {
    return responder(res, 405, { ok: false, error: "Metodo no permitido." });
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

  // 1) Quien llama: el access token de la sesion del asesor.
  const token = cabecera(req, "authorization").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return responder(res, 401, { ok: false, error: "Falta el access token de la sesion." });
  }
  const { data: sesion, error: errorSesion } = await sb.auth.getUser(token);
  if (errorSesion || !sesion.user?.email) {
    return responder(res, 401, { ok: false, error: "Token invalido o vencido." });
  }

  // 2) El usuario de esa sesion (mismo cruce que hace AuthProvider en el front).
  const { data: usuario } = await sb
    .from("usuario")
    .select("id_usuario, id_empresa")
    .eq("email", sesion.user.email)
    .maybeSingle();
  if (!usuario?.id_empresa) {
    return responder(res, 403, { ok: false, error: "El usuario no pertenece a ninguna empresa." });
  }

  const body = cuerpo(req);
  const idComprobante = Number(body.idComprobante);
  if (!Number.isInteger(idComprobante) || idComprobante <= 0) {
    return responder(res, 400, { ok: false, error: "Falta idComprobante." });
  }

  // 3) Cadena comprobante -> cobranza -> contrato -> venta -> cliente.
  const { data: comprobante } = (await sb
    .from("comprobantes")
    .select("id_comprobante, id_cobranza, id_cliente, monto_pagado, estado, nota_rechazo")
    .eq("id_comprobante", idComprobante)
    .maybeSingle()) as { data: ComprobanteRow | null };
  if (!comprobante) {
    return responder(res, 404, { ok: false, error: "No existe ese comprobante." });
  }
  if (comprobante.estado === "pendiente") {
    return responder(res, 400, { ok: false, error: "El comprobante todavia no fue revisado." });
  }

  const { data: cobranza } = (await sb
    .from("cobranzas")
    .select("id_cobranza, id_contrato, numero_cuota")
    .eq("id_cobranza", comprobante.id_cobranza)
    .maybeSingle()) as { data: CobranzaRow | null };
  const { data: contrato } = cobranza
    ? ((await sb
        .from("contratos")
        .select("id_contrato, id_venta, numero_contrato")
        .eq("id_contrato", cobranza.id_contrato)
        .maybeSingle()) as { data: ContratoRow | null })
    : { data: null };
  const { data: venta } = contrato
    ? ((await sb
        .from("ventas")
        .select("id_venta, id_cliente, id_lote")
        .eq("id_venta", contrato.id_venta)
        .maybeSingle()) as { data: VentaRow | null })
    : { data: null };
  const { data: cliente } = venta
    ? ((await sb
        .from("cliente")
        .select("id_cliente, nombres, email, id_empresa")
        .eq("id_cliente", venta.id_cliente)
        .maybeSingle()) as { data: ClienteRow | null })
    : { data: null };

  if (!cobranza || !contrato || !venta || !cliente) {
    return responder(res, 404, { ok: false, error: "No encontramos los datos de ese comprobante." });
  }
  if (venta.id_cliente !== comprobante.id_cliente || cliente.id_empresa !== usuario.id_empresa) {
    return responder(res, 403, { ok: false, error: "Ese comprobante no pertenece a tu empresa." });
  }
  if (!cliente.email?.trim()) {
    return responder(res, 200, { ok: true, correo: "omitido", motivo: "El cliente no tiene correo." });
  }

  // Etiqueta del lote: "Manzana A - Lote P19" (mismo criterio que el cron).
  const { data: lote } = (await sb
    .from("lotes")
    .select("id_lote, numero_lote, id_manzana")
    .eq("id_lote", venta.id_lote)
    .maybeSingle()) as { data: { numero_lote: string; id_manzana: number } | null };
  const { data: manzana } = lote
    ? ((await sb
        .from("manzana_bloque")
        .select("id_manzana, nombre_codigo")
        .eq("id_manzana", lote.id_manzana)
        .maybeSingle()) as { data: { nombre_codigo: string | null } | null })
    : { data: null };
  const etiquetaLote = lote
    ? manzana?.nombre_codigo
      ? `${manzana.nombre_codigo} - Lote ${lote.numero_lote}`
      : `Lote ${lote.numero_lote}`
    : null;

  const { data: configuracion } = await sb
    .from("configuracion")
    .select("moneda")
    .eq("id_empresa", cliente.id_empresa)
    .maybeSingle();
  const moneda = (configuracion?.moneda as string | null) ?? "USD";
  const formatear = (valor: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: moneda }).format(Number(valor));

  const baseSitio = (process.env.APP_URL ?? "https://lotesalmando.com").replace(/\/+$/, "");
  const datos = {
    para: cliente.email.trim(),
    nombre: cliente.nombres,
    numeroContrato: contrato.numero_contrato,
    lote: etiquetaLote,
    numeroCuota: cobranza.numero_cuota,
    montoPagado: formatear(comprobante.monto_pagado),
    portalUrl: `${baseSitio}/portal-cliente`,
  };

  let correo: EstadoCorreo;
  try {
    correo =
      comprobante.estado === "aprobado"
        ? await avisarComprobanteAprobado(datos)
        : await avisarComprobanteRechazado({
            ...datos,
            motivo: comprobante.nota_rechazo?.trim() || "Sin motivo registrado",
          });
  } catch (error) {
    // El correo nunca rompe la revision: se avisa y listo.
    console.error("[avisar comprobante] fallo el envio:", error);
    return responder(res, 200, { ok: true, correo: "error", estado: comprobante.estado });
  }

  return responder(res, 200, { ok: true, correo, estado: comprobante.estado });
}
