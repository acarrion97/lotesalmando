import { formatCurrency, formatDateOnly } from "@/utils";

/** Formato del documento que se genera o anexa. */
export type FormatoDocumentoContrato = "docx" | "pdf";

/**
 * Datos del contrato que van al documento. Todo sale de la base
 * (contrato → venta → cotización → cliente → lote → cuotas): no se le
 * pide nada al usuario.
 */
export interface ContenidoContrato {
  numero_contrato: string;
  /** Fecha de firma/venta en `YYYY-MM-DD`. */
  fecha: string;
  empresa: { nombre: string; ruc: string | null };
  cliente: { nombres: string; cedula: string | null; email: string | null; telefono: string | null };
  proyecto: string | null;
  lote: string | null;
  precio_total: number;
  /** `null` cuando la venta no vino de una cotización. */
  entrada: number | null;
  financiado: number | null;
  num_cuotas: number | null;
  cuotas: { numero: number; fecha_vencimiento: string | null; monto: number }[];
  moneda: string;
}

export type BloqueDocumento =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "etiqueta_valor"; etiqueta: string; valor: string }
  | { tipo: "tabla"; encabezados: string[]; filas: string[][] }
  | { tipo: "espacio" };

/**
 * Texto del documento ya ordenado, sin librería de Word ni PDF de por
 * medio. Los dos generadores recorren esta misma estructura, así que un
 * cambio de redacción se hace una sola vez y sale igual en los dos
 * archivos.
 */
export interface DocumentoPlano {
  titulo: string;
  bloques: BloqueDocumento[];
}

export function moneyDeContenido(valor: number, moneda: string): string {
  return formatCurrency(valor, moneda);
}

export function fechaDeContenido(o: string | null | undefined): string {
  return o ? formatDateOnly(o.slice(0, 10)) : "—";
}

export function datoDeContenido(valor: string | null | undefined): string {
  return valor && valor.trim() ? valor : "—";
}

/**
 * Construye el documento del contrato (Word o PDF).
 */
export interface GeneradorDocumentoContrato {
  generar(formato: FormatoDocumentoContrato, contenido: ContenidoContrato): Promise<Blob>;
}

/** `contrato-C-1234.docx`, sin caracteres raros (Windows no acepta varios). */
export function nombreArchivoContrato(
  contenido: Pick<ContenidoContrato, "numero_contrato">,
  formato: FormatoDocumentoContrato,
): string {
  const base = contenido.numero_contrato
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `contrato-${base || "sin-numero"}.${formato}`;
}
