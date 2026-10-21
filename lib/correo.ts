/**
 * Correos transaccionales de Lotes al Mando.
 *
 * Los manda el webhook de Hotmart (api/hotmart-webhook.ts) por SMTP de Gmail.
 * Gmail exige una "contraseña de aplicacion" (Google Cuenta -> Seguridad ->
 * Verificacion en dos pasos -> Contraseñas de aplicaciones). La cuenta debe
 * tener la verificacion en dos pasos activada.
 *
 * Variables de entorno (Vercel -> Settings -> Environment Variables):
 *   EMAIL_USER  -> cuenta Gmail que envia (obligatoria)
 *   EMAIL_PASS  -> contraseña de aplicacion de 16 caracteres (obligatoria)
 *   EMAIL_FROM  -> opcional, nombre visible ("Lotes al Mando <x@gmail.com>")
 *   ADMIN_EMAIL -> opcional, a quien avisar si entra un pago sin cuenta;
 *                  si falta se avisa a la propia EMAIL_USER.
 *
 * Si EMAIL_USER/EMAIL_PASS no estan cargadas, los envios se omiten y el
 * webhook sigue funcionando igual: un correo nunca rompe el cobro.
 */
import nodemailer from "nodemailer";

/** Resultado de un intento de envio (se refleja en la respuesta del webhook). */
export type EstadoCorreo = "enviado" | "omitido" | "error";

type Transporte = nodemailer.Transporter;

let cached: Transporte | null | undefined;

/** Transporte unico por frio de la funcion serverless. */
function transporte(): Transporte | null {
  if (cached !== undefined) return cached;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  cached =
    user && pass
      ? nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: { user, pass },
          sendTimeout: 15000,
        })
      : null;
  return cached;
}

/** Escapa texto antes de meterlo en el HTML (nombre y razon social los pone el usuario). */
function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plantilla unica de todos los correos: marca, color y pie iguales. */
function plantilla(titulo: string, cuerpo: string[], pie?: string): string {
  const filas = cuerpo
    .map((p) => `<p style="margin:0 0 16px;line-height:24px;color:#374151;font-size:15px">${p}</p>`)
    .join("");
  const cierre =
    pie ??
    "Este es un correo automatico de tu suscripcion, no respondas a este mensaje.";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#082B33;padding:24px;text-align:center">
      <div style="color:#fff;font-size:22px;font-weight:bold">Lotes al Mando</div>
    </div>
    <div style="padding:32px">
      <h1 style="margin:0 0 24px;font-size:20px;color:#082B33">${esc(titulo)}</h1>
      ${filas}
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px;color:#9ca3af;font-size:12px">
        ${esc(cierre)}
      </div>
    </div>
  </div>
</body></html>`;
}

/** Nombre visible del plan segun su clave (basico | inicial | avanzado). */
function nombreDePlan(clave: string | null | undefined): string {
  const mapa: Record<string, string> = {
    basico: "Básico",
    inicial: "Inicial",
    avanzado: "Avanzado",
  };
  if (!clave) return "tu plan";
  return mapa[clave] ?? clave;
}

/** Envia y nunca lanza: el webhook no debe fallar por un correo. */
async function enviar(
  para: string,
  asunto: string,
  texto: string,
  html: string,
): Promise<EstadoCorreo> {
  if (!para.trim()) return "omitido";
  const t = transporte();
  if (!t) {
    console.warn("[correo] EMAIL_USER/EMAIL_PASS sin configurar: se omite el envio.");
    return "omitido";
  }
  try {
    const user = process.env.EMAIL_USER!;
    const from = process.env.EMAIL_FROM?.trim() || `Lotes al Mando <${user}>`;
    await t.sendMail({ from, to: para.trim(), subject: asunto, text: texto, html });
    return "enviado";
  } catch (error) {
    console.error("[correo] fallo el envio:", error);
    return "error";
  }
}

/** ", de Mi Empresa" si hay razon social; nada si no. */
function deEmpresa(razonSocial: string): string {
  return razonSocial ? ` de ${esc(razonSocial)}` : "";
}

/** Saludo con el nombre del comprador; si no hay, generico. */
function saludo(datos: { nombre: string; razonSocial: string }): string {
  const quien = datos.nombre || datos.razonSocial;
  return quien ? `Hola ${esc(quien)},` : "Hola,";
}

/**
 * Compra confirmada o suscripcion activa.
 * `transaccion` es la que manda Hotmart (ej: HP16015479281022).
 */
export async function avisarPagoConfirmado(datos: {
  para: string;
  nombre: string;
  razonSocial: string;
  plan: string | null;
  transaccion: string;
  suscripcion: boolean;
}): Promise<EstadoCorreo> {
  const plan = nombreDePlan(datos.plan);
  const asunto = datos.suscripcion
    ? "Tu suscripcion esta activa - Lotes al Mando"
    : "Tu pago fue confirmado - Lotes al Mando";
  const cuerpo = datos.suscripcion
    ? [
        `${saludo(datos)} tu suscripcion al plan <strong>${esc(plan)}</strong>${deEmpresa(datos.razonSocial)} ya esta activa.`,
        `Ya puedes usar Lotes al Mando sin los limites de tu plan. Puedes cambiar de plan cuando quieras desde la plataforma.`,
        `Transaccion: <strong>${esc(datos.transaccion || "sin registro")}</strong>`,
      ]
    : [
        `${saludo(datos)} recibimos el pago del plan <strong>${esc(plan)}</strong>${deEmpresa(datos.razonSocial)}.`,
        `Tu empresa ya quedo activa en Lotes al Mando. Puedes cambiar de plan cuando quieras desde la plataforma.`,
        `Transaccion: <strong>${esc(datos.transaccion || "sin registro")}</strong>`,
      ];
  return enviar(
    datos.para,
    asunto,
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla(datos.suscripcion ? "Suscripcion activa" : "Pago confirmado", cuerpo),
  );
}

/** Baja de la suscripcion: cancelacion, reembolso o chargeback. */
export async function avisarSuscripcionBaja(datos: {
  para: string;
  nombre: string;
  razonSocial: string;
  plan: string | null;
  reembolso: boolean;
}): Promise<EstadoCorreo> {
  const plan = nombreDePlan(datos.plan);
  const asunto = datos.reembolso
    ? "Reembolso procesado - Lotes al Mando"
    : "Suscripcion cancelada - Lotes al Mando";
  const cuerpo = datos.reembolso
    ? [
        `${saludo(datos)} se proceso el reembolso de tu plan <strong>${esc(plan)}</strong>${deEmpresa(datos.razonSocial)}.`,
        `Tu acceso a Lotes al Mando queda desactivado. Si fue un error o quieres volver, escribenos y lo revisamos.`,
      ]
    : [
        `${saludo(datos)} la suscripcion del plan <strong>${esc(plan)}</strong>${deEmpresa(datos.razonSocial)} fue cancelada.`,
        `Tu acceso a Lotes al Mando se mantiene hasta el final del periodo ya pagado. Si fue un error, puedes reactivarla desde Hotmart o escribirnos.`,
      ];
  return enviar(
    datos.para,
    asunto,
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla(datos.reembolso ? "Reembolso procesado" : "Suscripcion cancelada", cuerpo),
  );
}

/**
 * Entra un pago pero el email del comprador no coincide con ninguna empresa:
 * no sabemos a quien avisarle, entonces se avisa al dueño de la plataforma
 * para que lo resuelva (asociar el pago a mano o devolver el dinero).
 */
export async function avisarPagoSinCuenta(datos: {
  emailComprador: string;
  nombre: string;
  evento: string;
  transaccion: string;
}): Promise<EstadoCorreo> {
  const destino = process.env.ADMIN_EMAIL?.trim() || process.env.EMAIL_USER?.trim() || "";
  const cuerpo = [
    `Entra un pago de Hotmart y el correo del comprador no coincide con ninguna empresa registrada.`,
    `Comprador: <strong>${esc(datos.nombre || "(sin nombre)")}</strong>`,
    `Correo del comprador: <strong>${esc(datos.emailComprador || "(sin correo)")}</strong>`,
    `Evento: <strong>${esc(datos.evento)}</strong>`,
    `Transaccion: <strong>${esc(datos.transaccion || "sin registro")}</strong>`,
    `Revisa Supabase (tabla <code>hotmart_evento</code>) y asocia el pago a la empresa correcta.`,
  ];
  return enviar(
    destino,
    "Pago recibido sin cuenta asociada - Lotes al Mando",
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla("Pago sin cuenta asociada", cuerpo),
  );
}

/** Datos de la cuota que se avisa al cliente (los usa el cron diario). */
export interface AvisoCuota {
  para: string;
  nombre: string;
  numeroContrato: string;
  lote: string | null;
  numeroCuota: number;
  /** Monto ya formateado con la moneda de la empresa (ej: "$1,458.00"). */
  montoCuota: string;
  fechaVencimiento: string;
  /** Link al portal del cliente (sin sesion: se entra con la cedula). */
  portalUrl: string;
}

const PIE_CUOTA =
  "Este es un correo automatico de Lotes al Mando. Si ya pagaste, subenos el comprobante desde el portal.";

/**
 * La cuota vence en pocos dias: se avisa antes de que venza para que el
 * cliente pueda pagar o enviar su comprobante sin mora.
 */
export async function avisarCuotaPorVencer(
  datos: AvisoCuota & { diasRestantes: number },
): Promise<EstadoCorreo> {
  const dias = datos.diasRestantes === 1 ? "mañana" : `en ${datos.diasRestantes} dias`;
  const cuerpo = [
    `${saludo({ nombre: datos.nombre, razonSocial: "" })} te recordamos que tu cuota <strong>${esc(
      `nº ${datos.numeroCuota}`,
    )}</strong> del contrato <strong>${esc(datos.numeroContrato)}</strong>${
      datos.lote ? ` (${esc(datos.lote)})` : ""
    } vence <strong>${esc(datos.fechaVencimiento)}</strong>.`,
    `Valor de la cuota: <strong>${esc(datos.montoCuota)}</strong>.`,
    `Puedes pagar ${dias} o, si ya lo hiciste, subir el comprobante (foto o PDF) desde el portal: <a href="${esc(
      datos.portalUrl,
    )}" style="color:#1677ff">${esc(datos.portalUrl)}</a>.`,
  ];
  return enviar(
    datos.para,
    `Tu cuota vence ${dias} - Lotes al Mando`,
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla("Tu cuota esta por vencer", cuerpo, PIE_CUOTA),
  );
}

/** Datos del resultado de la revision de un comprobante (los usa api/comprobantes/avisar). */
export interface AvisoRevisionComprobante {
  para: string;
  nombre: string;
  numeroContrato: string;
  lote: string | null;
  numeroCuota: number;
  /** Valor que declaro el cliente, ya formateado con la moneda de la empresa. */
  montoPagado: string;
  portalUrl: string;
}

/** Cabecera comun de los dos avisos de revision. */
function contextoRevision(datos: AvisoRevisionComprobante): string {
  return `tu comprobante de la cuota <strong>${esc(`nº ${datos.numeroCuota}`)}</strong> del contrato <strong>${esc(
    datos.numeroContrato,
  )}</strong>${datos.lote ? ` (${esc(datos.lote)})` : ""}`;
}

const PIE_REVISION =
  "Este es un correo automatico de Lotes al Mando. Si crees que hubo un error, comunicate con tu asesor.";

/**
 * El asesor reviso y aprobo el comprobante: la cuota ya figura como pagada
 * y el cliente no tiene que hacer nada mas.
 */
export async function avisarComprobanteAprobado(
  datos: AvisoRevisionComprobante,
): Promise<EstadoCorreo> {
  const cuerpo = [
    `${saludo({ nombre: datos.nombre, razonSocial: "" })} aprobamos ${contextoRevision(datos)}.`,
    `Valor pagado: <strong>${esc(datos.montoPagado)}</strong>. La cuota ya figura como pagada.`,
    `Puedes ver tus contratos y cuotas en el portal: <a href="${esc(
      datos.portalUrl,
    )}" style="color:#1677ff">${esc(datos.portalUrl)}</a>.`,
  ];
  return enviar(
    datos.para,
    "Tu comprobante fue aprobado - Lotes al Mando",
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla("Comprobante aprobado", cuerpo, PIE_REVISION),
  );
}

/**
 * El asesor rechazo el comprobante: el motivo es obligatorio porque el
 * cliente lo necesita para volver a enviarlo bien desde el portal.
 */
export async function avisarComprobanteRechazado(
  datos: AvisoRevisionComprobante & { motivo: string },
): Promise<EstadoCorreo> {
  const cuerpo = [
    `${saludo({ nombre: datos.nombre, razonSocial: "" })} no pudimos aceptar ${contextoRevision(datos)}.`,
    `Motivo del rechazo: <strong>${esc(datos.motivo)}</strong>.`,
    `Valor que enviaste: <strong>${esc(datos.montoPagado)}</strong>.`,
    `Puedes corregirlo y enviar el comprobante otra vez desde el portal: <a href="${esc(
      datos.portalUrl,
    )}" style="color:#1677ff">${esc(datos.portalUrl)}</a>.`,
  ];
  return enviar(
    datos.para,
    "Tu comprobante fue rechazado - Lotes al Mando",
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla("Comprobante rechazado", cuerpo, PIE_REVISION),
  );
}

/** La cuota ya vencio: se avisa para regularizar el pago. */
export async function avisarCuotaVencida(
  datos: AvisoCuota & { diasVencida: number },
): Promise<EstadoCorreo> {
  const cuerpo = [
    `${saludo({ nombre: datos.nombre, razonSocial: "" })} tu cuota <strong>${esc(
      `nº ${datos.numeroCuota}`,
    )}</strong> del contrato <strong>${esc(datos.numeroContrato)}</strong>${
      datos.lote ? ` (${esc(datos.lote)})` : ""
    } vencio el <strong>${esc(datos.fechaVencimiento)}</strong>.`,
    `Valor de la cuota: <strong>${esc(datos.montoCuota)}</strong>.`,
    `Podes regularizarlo en el portal: <a href="${esc(
      datos.portalUrl,
    )}" style="color:#1677ff">${esc(datos.portalUrl)}</a>. Tambien podes enviar el comprobante (foto o PDF) desde ahi.`,
  ];
  return enviar(
    datos.para,
    "Tu cuota esta vencida - Lotes al Mando",
    cuerpo.join("\n").replace(/<[^>]+>/g, ""),
    plantilla("Tu cuota esta vencida", cuerpo, PIE_CUOTA),
  );
}
