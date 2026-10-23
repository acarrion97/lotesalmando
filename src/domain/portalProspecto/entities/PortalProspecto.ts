/**
 * Lo que ve un prospecto que entra al portal de documentación con su
 * email (sin sesión). Se arma en la RPC `portal_prospecto_por_email`
 * (migración 044).
 */

/** Tipos de documento que acepta la venta de un lote. Misma lista que valida
 *  la RPC `portal_registrar_documento` (migración 044) y `DOCUMENTOS_REQUERIDOS`. */
export type DocumentoProspectoTipo =
  | "cedula"
  | "comprobante_domicilio"
  | "constitucion"
  | "comprobante_ingresos";

export type DocumentoProspectoEstado = "pendiente" | "aprobado" | "rechazado";

export interface PortalProspecto {
  id_prospecto: number;
  nombres: string;
  email: string | null;
  telefono: string | null;
  estado: string | null;
}

/** Documento ya enviado por el prospecto; los tipos ausentes de la lista
 *  están "pendientes de enviar" (los arma el portal contra la checklist). */
export interface PortalDocumento {
  tipo: DocumentoProspectoTipo;
  estado: DocumentoProspectoEstado;
  archivo_nombre: string | null;
  nota_revision: string | null;
  creado_en: string | null;
  revisado_en: string | null;
}

export interface PortalProspectoDatos {
  ok: boolean;
  error?: string;
  /** `null` cuando el email aún no existe en la CRM: el portal pide el alta. */
  prospecto: PortalProspecto | null;
  documentos: PortalDocumento[];
}

/**
 * Checklist legal para concretar la venta de un lote. Es la única fuente
 * de verdad: la usa el portal para pintar la lista y la RPC para validar
 * `p_tipo` (mantener ambas en sincronía al agregar un documento).
 */
export const DOCUMENTOS_REQUERIDOS: ReadonlyArray<{
  tipo: DocumentoProspectoTipo;
  nombre: string;
  descripcion: string;
}> = [
  {
    tipo: "cedula",
    nombre: "Cédula de identidad",
    descripcion: "Frente y reverso, en una sola imagen o PDF",
  },
  {
    tipo: "comprobante_domicilio",
    nombre: "Comprobante de domicilio",
    descripcion: "Recibo de luz, agua o teléfono con antigüedad menor a 3 meses",
  },
  {
    tipo: "constitucion",
    nombre: "Acta de constitución / RUC",
    descripcion: "Solo personas jurídicas: acta constitutiva y RUC",
  },
  {
    tipo: "comprobante_ingresos",
    nombre: "Comprobante de ingresos",
    descripcion: "Certificado bancario, contrato o declaración de impuestos",
  },
];
