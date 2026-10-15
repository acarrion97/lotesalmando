/**
 * Webhook de Hotmart - Lotes al Mando.
 *
 * URL: https://lotesalmando.com/api/hotmart-webhook  (se registra en Hotmart
 * como "URL para envio de datos"). Es un serverless de Vercel: no hace falta
 * un backend ni un servidor propio, este unico archivo alcanza.
 *
 * Que hace: cuando alguien paga (o baja) la suscripcion, Hotmart envia un
 * POST con el evento. Nosotros:
 *   1) validamos que venga de Hotmart (Hottok o firma HMAC-SHA256),
 *   2) guardamos el evento en `hotmart_evento` (idempotencia: si Hotmart
 *      reenvia el mismo evento, la PK lo descarta),
 *   3) buscamos la empresa por el email del comprador y le actualizamos
 *      `estado_pago` ('pagado' | 'cancelado') en `empresa`.
 *
 * Variables de entorno necesarias en Vercel (Settings -> Environment Variables):
 *   SUPABASE_URL              -> https://kotfmqqewfczvglnvxmv.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY -> clave service_role (NUNCA la anon key)
 *   HOTMART_SECRET            -> Hottok de tu cuenta de Hotmart
 *                                (Tools -> Webhook) o el secreto de firma.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";

/** Formato que acepta la columna JSONB de `hotmart_evento.payload`. */
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Request de Vercel: trae el body ya parseado y a veces el body crudo. */
type ReqHotmart = IncomingMessage & { body?: unknown; rawBody?: Buffer | string };

/** Eventos que confirman el pago (v2 en mayusculas y variantes v1). */
const EVENTOS_PAGO = new Set([
  "purchase_approved",
  "order_approved",
  "purchase_complete",
  "subscription_confirmation",
  "subscription_reactivation",
  "checkout.order_approved",
]);

/** Eventos que dan de baja la suscripcion. */
const EVENTOS_BAJA = new Set([
  "purchase_canceled",
  "purchase_cancelled",
  "order_cancelled",
  "purchase_refunded",
  "order_refunded",
  "purchase_expired",
  "subscription_cancellation",
  "subscription_cancelled",
  "subscription_expiration",
  "subscription_expired",
  "chargeback",
]);

function responder(res: ServerResponse, status: number, cuerpo: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(cuerpo));
}

/** Comparacion que no filtra por tiempo (evita adivinar la clave por timing). */
function seguroIgual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** HMAC-SHA256 del body en hex y en base64: Hotmart puede mandar cualquiera. */
function firmasEsperadas(body: string, secreto: string): string[] {
  return [
    createHmac("sha256", secreto).update(body, "utf8").digest("hex"),
    createHmac("sha256", secreto).update(body, "utf8").digest("base64"),
  ];
}

function encabezado(req: ReqHotmart, nombre: string): string {
  const valor = req.headers[nombre];
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/**
 * El pedido viene de Hotmart? Tres formas, en este orden:
 *   1) Hottok en el BODY: Hotmart 2.0.0 lo manda como campo "hottok" del JSON
 *      (ej: {"hottok":"8stx1lGi..."}). Es el mas comun, va primero.
 *   2) Hottok en el header x-hotmart-hottok (versiones anteriores).
 *   3) Firma HMAC-SHA256 del body crudo, si el entorno la deja leer.
 * En los tres casos se compara contra HOTMART_SECRET: quien no conozca ese
 * secreto no puede firmar, asi que da igual donde lo traiga.
 */
function esDeHotmart(
  req: ReqHotmart,
  body: string,
  secreto: string,
  payload: Record<string, unknown>,
): boolean {
  const hottokBody = typeof payload?.hottok === "string" ? payload.hottok.trim() : "";
  if (hottokBody && seguroIgual(hottokBody, secreto)) return true;

  const hottok = encabezado(req, "x-hotmart-hottok").trim();
  if (hottok && seguroIgual(hottok, secreto)) return true;

  const firma = encabezado(req, "x-hotmart-signature") || encabezado(req, "hotmart-signature");
  if (!firma) return false;
  const limpia = firma.replace(/^sha256=/i, "").trim();
  return firmasEsperadas(body, secreto).some((candidata) => seguroIgual(limpia, candidata));
}

/** Email del comprador, en los formatos que manda Hotmart (v2 y v1). */
function emailDelPayload(payload: Record<string, unknown>): string {
  const data = (payload?.data ?? {}) as Record<string, unknown>;
  const comprador = (data.buyer ?? data.user ?? {}) as Record<string, unknown>;
  const candidato = comprador.email ?? data.email ?? payload.email;
  return typeof candidato === "string" ? candidato.trim().toLowerCase() : "";
}

/** Normaliza el nombre del evento para comparar sin importar mayusculas. */
function normalizarEvento(evento: string): string {
  return evento
    .trim()
    .toLowerCase()
    .replace(/[^a-z.]+/g, "_");
}

export default async function handler(req: ReqHotmart, res: ServerResponse) {
  // Hotmart valida la URL antes de guardarla: contestarle bien evita el
  // "Entra con una URL valida" del formulario.
  if (req.method === "GET" || req.method === "OPTIONS") {
    return responder(res, 200, { ok: true, mensaje: "Webhook de Lotes al Mando. Usa POST." });
  }
  if (req.method !== "POST") {
    return responder(res, 405, { ok: false, error: "Este endpoint solo acepta POST." });
  }

  const secreto = process.env.HOTMART_SECRET;
  if (!secreto) {
    return responder(res, 500, {
      ok: false,
      error: "Falta HOTMART_SECRET en las variables de entorno de Vercel.",
    });
  }

  const urlSupabase = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !serviceKey) {
    return responder(res, 500, {
      ok: false,
      error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.",
    });
  }

  // Body crudo si Vercel lo deja disponible (hace falta para la firma HMAC).
  const cuerpoBruto = req.rawBody
    ? Buffer.isBuffer(req.rawBody)
      ? req.rawBody.toString("utf8")
      : String(req.rawBody)
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body ?? {});

  // Se parsea antes de validar, pero solo en memoria: hace falta leer el
  // campo "hottok" del body. No se escribe nada en la BD sin validar antes.
  let payload: Record<string, unknown>;
  try {
    payload =
      typeof req.body === "object" && req.body !== null
        ? (req.body as Record<string, unknown>)
        : (JSON.parse(cuerpoBruto) as Record<string, unknown>);
  } catch {
    return responder(res, 400, { ok: false, error: "El body no es JSON valido." });
  }

  if (!esDeHotmart(req, cuerpoBruto, secreto, payload)) {
    return responder(res, 401, { ok: false, error: "Hottok o firma invalidos." });
  }

  const evento = String(payload.event ?? "");
  const email = emailDelPayload(payload);
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const compra = (data.purchase ?? data.order ?? data.subscription ?? {}) as Record<
    string,
    unknown
  >;
  const transaccion = String(compra.transaction ?? compra.id ?? "");
  const idEvento = String(payload.id ?? "");
  const clave = idEvento || `sha1-${createHash("sha1").update(cuerpoBruto).digest("hex")}`;

  const supabase = createClient(urlSupabase, serviceKey, { auth: { persistSession: false } });

  // Idempotencia: si Hotmart reenvia el mismo evento, no se vuelve a aplicar.
  const { error: errorEvento } = await supabase.from("hotmart_evento").insert({
    id_evento: clave,
    evento,
    email_comprador: email || null,
    transaccion: transaccion || null,
    payload: payload as unknown as Json,
  });

  if (errorEvento) {
    if (errorEvento.code === "23505") {
      return responder(res, 200, { ok: true, duplicado: true });
    }
    return responder(res, 500, {
      ok: false,
      error: `No se pudo registrar el evento: ${errorEvento.message}`,
    });
  }

  const normalizado = normalizarEvento(evento);
  const esPago = EVENTOS_PAGO.has(normalizado);
  const esBaja = EVENTOS_BAJA.has(normalizado);

  let resultado = "ignorado";

  if ((esPago || esBaja) && !email) {
    resultado = "sin_email";
  } else if (esPago || esBaja) {
    const { data: idEmpresa, error: errorBusqueda } = await supabase.rpc(
      "buscar_empresa_por_email",
      {
        p_email: email,
      },
    );

    if (errorBusqueda) {
      return responder(res, 500, {
        ok: false,
        error: `No se pudo buscar la empresa: ${errorBusqueda.message}`,
      });
    }

    if (!idEmpresa) {
      resultado = "empresa_no_encontrada";
    } else {
      const { error: errorUpdate } = await supabase
        .from("empresa")
        .update({
          estado_pago: esPago ? "pagado" : "cancelado",
          pagado_en: esPago ? new Date().toISOString() : null,
          transaccion_id: transaccion || null,
        })
        .eq("id_empresa", idEmpresa as number);

      if (errorUpdate) {
        return responder(res, 500, {
          ok: false,
          error: `No se pudo actualizar la empresa: ${errorUpdate.message}`,
        });
      }
      resultado = esPago ? "pagado" : "cancelado";
    }
  }

  // Deja traza del resultado para poder auditar despues.
  await supabase.from("hotmart_evento").update({ resultado }).eq("id_evento", clave);

  return responder(res, 200, { ok: true, resultado });
}
