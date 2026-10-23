/**
 * Aviso al asesor de que un prospecto envio documentacion al portal publico.
 *
 * URL: https://lotesalmando.com/api/prospectos/avisar
 * Lo llama el front (usePortalProspecto) apenas sube un documento.
 * Es un envio "best effort": si falla, el documento ya quedo registrado igual.
 *
 * Quien lo invoca es el PROSPECTO (anonimo, sin sesion), asi que el endpoint
 * no valida token de sesion: se protege por el lado del servidor con la logica
 * de negocio (decision D8 del design):
 *   1) resuelve la empresa por el slug del mapa y ubica al prospecto por su
 *      email dentro de esa empresa (el slug y el email no son suficientes para
 *      tocar a un prospecto de otra empresa);
 *   2) exige un documento `pendiente` creado hace 15 minutos o menos: no se
 *      puede disparar avisos por documentos viejos;
 *   3) reclama el slot del dia en `aviso_documento_prospecto` (UNIQUE por
 *      prospecto y fecha): maximo un correo por prospecto por dia;
 *   4) manda el correo al asesor asignado (o a ADMIN_EMAIL si no tiene).
 *
 * Variables de entorno (Vercel -> Settings -> Environment Variables):
 *   SUPABASE_URL              -> https://<proyecto>.supabase.co (obligatoria)
 *   SUPABASE_SERVICE_ROLE_KEY -> clave service_role (obligatoria)
 *   APP_URL                   -> opcional, base del backoffice (por defecto
 *                                https://lotesalmando.com)
 *   ADMIN_EMAIL               -> opcional, destino si el prospecto no tiene
 *                                asesor asignado.
 *   EMAIL_USER / EMAIL_PASS   -> Gmail y su contrasena de aplicacion; sin
 *                                ellas el aviso se omite y el envio del
 *                                documento sigue funcionando.
 *
 * Respuestas: 400 sin slug/email, 404 si el portal no existe, el email no
 * pertenece a esa empresa o no hay documentos recientes, 200 con `correo`
 * en el resto (enviado, omitido o error: un correo nunca rompe el envio del
 * prospecto).
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { avisarDocumentacionProspecto, type EstadoCorreo } from "../../lib/correo.js";

type Req = IncomingMessage & { body?: unknown };

function responder(res: ServerResponse, status: number, cuerpo: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(cuerpo));
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

/** ilike trata % y _ como comodines: un email con _ no debe matchear de mas. */
function escaparIlike(valor: string): string {
  return valor.replace(/([%_\\])/g, "\\$1");
}

/**
 * Etiquetas visibles de la checklist. La fuente de verdad de la lista es
 * `DOCUMENTOS_REQUERIDOS` (src/domain/portalProspecto/entities): si cambia
 * ahi, cambiarla tambien aca (el endpoint no puede importar de src/).
 */
const DOCUMENTOS_TIPOS: Record<string, string> = {
  cedula: "Cedula de identidad",
  comprobante_domicilio: "Comprobante de domicilio",
  constitucion: "Acta de constitucion / RUC",
  comprobante_ingresos: "Comprobante de ingresos",
};

interface ProspectoRow {
  id_prospecto: number;
  nombres: string;
  email: string | null;
  id_asesor: number | null;
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method === "GET" || req.method === "OPTIONS") {
    return responder(res, 200, { ok: true, mensaje: "Aviso de documentacion de prospecto. Usa POST." });
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

  const body = cuerpo(req);
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!slug) return responder(res, 400, { ok: false, error: "Falta el slug del portal." });
  if (!email || !email.includes("@")) {
    return responder(res, 400, { ok: false, error: "Falta el email del prospecto." });
  }

  // 1) La empresa se resuelve por el slug publico (igual que la RPC 044).
  const { data: proyecto } = await sb
    .from("mapas")
    .select("id_proyecto, proyectos:id_proyecto(id_empresa)")
    .ilike("slug", escaparIlike(slug))
    .limit(1)
    .maybeSingle();
  const idEmpresa = (proyecto?.proyectos as unknown as { id_empresa: number } | null)?.id_empresa;
  if (!idEmpresa) {
    return responder(res, 404, { ok: false, error: "El portal solicitado no existe." });
  }

  // 2) Prospecto del email dentro de ESA empresa (nada de ids a mano).
  const { data: prospecto } = await sb
    .from("prospectos")
    .select("id_prospecto, nombres, email, id_asesor")
    .eq("id_empresa", idEmpresa)
    .ilike("email", escaparIlike(email))
    .order("id_prospecto", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!prospecto) {
    return responder(res, 404, { ok: false, error: "Ese email no pertenece a este portal." });
  }
  const fila = prospecto as unknown as ProspectoRow;

  // 3) Exige un documento `pendiente` reciente: sin esto no se puede usar el
  //    endpoint para disparar avisos con documentos viejos.
  const hace15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: documentos } = await sb
    .from("prospecto_documento")
    .select("tipo, creado_en")
    .eq("id_prospecto", fila.id_prospecto)
    .eq("estado", "pendiente")
    .gte("creado_en", hace15)
    .order("creado_en", { ascending: false });
  const recientes = documentos ?? [];
  if (recientes.length === 0) {
    return responder(res, 404, {
      ok: false,
      error: "No hay documentos recientes pendientes de aviso.",
    });
  }

  // 4) Idempotencia: maximo un aviso por prospecto por dia. La segunda
  //    llamada del dia responde 200 sin mandar nada.
  const { data: avisoHoy } = await sb
    .from("aviso_documento_prospecto")
    .select("id_aviso")
    .eq("id_prospecto", fila.id_prospecto)
    .eq("fecha", new Date().toISOString().slice(0, 10));
  if ((avisoHoy ?? []).length > 0) {
    return responder(res, 200, { ok: true, correo: "omitido", motivo: "Ya se aviso hoy." });
  }
  try {
    const { error: errorAviso } = await sb
      .from("aviso_documento_prospecto")
      .insert({ id_prospecto: fila.id_prospecto });
    if (errorAviso && errorAviso.code !== "23505") {
      // 23505 = otro request reclamo el mismo dia: ya se esta avisando.
      console.error("[avisar documento prospecto] no se pudo registrar el aviso:", errorAviso);
    }
  } catch (error) {
    console.error("[avisar documento prospecto] no se pudo registrar el aviso:", error);
  }

  // 5) Destinatario: el asesor asignado (de la misma empresa) o ADMIN_EMAIL.
  let para: string | null = null;
  if (fila.id_asesor) {
    const { data: asesor } = await sb
      .from("usuario")
      .select("email, id_empresa")
      .eq("id_usuario", fila.id_asesor)
      .maybeSingle();
    if (asesor?.email && asesor.id_empresa === idEmpresa) para = asesor.email;
  }
  if (!para) para = process.env.ADMIN_EMAIL?.trim() || null;
  if (!para) {
    return responder(res, 200, {
      ok: true,
      correo: "omitido",
      motivo: "El prospecto no tiene asesor y falta ADMIN_EMAIL.",
    });
  }

  const baseSitio = (process.env.APP_URL ?? "https://lotesalmando.com").replace(/\/+$/, "");
  let correo: EstadoCorreo;
  try {
    correo = await avisarDocumentacionProspecto({
      para,
      nombreProspecto: fila.nombres,
      emailProspecto: fila.email?.trim() || email,
      documentos: [...new Set(recientes.map((d) => DOCUMENTOS_TIPOS[d.tipo] ?? d.tipo))],
      revisionUrl: `${baseSitio}/prospectos/documentacion`,
    });
  } catch (error) {
    // El correo nunca rompe el envio del documento: se avisa y listo.
    console.error("[avisar documento prospecto] fallo el envio:", error);
    return responder(res, 200, { ok: true, correo: "error" });
  }

  return responder(res, 200, { ok: true, correo });
}
