/** Formato del documento que se genera o anexa. */
export type FormatoDocumentoContrato = "docx" | "pdf";

/**
 * Datos del contrato que van al documento. Todo sale de la base
 * (contrato → venta → cotización → cliente → lote → cuotas) y de la
 * configuración legal de la empresa: no se le pide nada al usuario.
 */
export interface ContenidoContrato {
  numero_contrato: string;
  /** Fecha de firma/venta en `YYYY-MM-DD`. */
  fecha: string;
  empresa: {
    nombre: string;
    ruc: string | null;
    /** Quien representa a la empresa (gerente/apoderado). */
    representante: string | null;
    representante_cedula: string | null;
    representante_email: string | null;
    /** Ciudad donde se firma. */
    ciudad: string | null;
    /** Cuentas donde se reciben los pagos. */
    cuentas_bancarias: string | null;
    /** Direccion para canjear las papeletas de deposito. */
    direccion_canje: string | null;
  };
  cliente: { nombres: string; cedula: string | null; email: string | null; telefono: string | null };
  proyecto: string | null;
  /** Codigo de la manzana (Mz) del lote. */
  manzana: string | null;
  lote: string | null;
  /** Lados del lote en texto libre, p. ej. "8,00 x 18,00". */
  medidas: string | null;
  /** Superficie en m2 del plano de lotizacion. */
  superficie_m2: number | null;
  precio_total: number;
  /** `null` cuando la venta no vino de una cotizacion. */
  entrada: number | null;
  financiado: number | null;
  num_cuotas: number | null;
  cuotas: { numero: number; fecha_vencimiento: string | null; monto: number }[];
  moneda: string;
}

/**
 * Fragmento de texto con su estilo: así una cláusula puede llevar en
 * negrita el nombre de la empresa o del representante, como en el
 * documento original.
 */
export interface SegmentoTexto {
  texto: string;
  negrita?: boolean;
}

export type BloqueDocumento =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  /** Clausula legal: encabezado en negrita y cuerpo justificado. */
  | { tipo: "clausula"; encabezado: string; cuerpo: SegmentoTexto[] }
  | { tipo: "parrafo"; texto: string; negrita?: boolean }
  /** Bloque de firmas: una columna por firmante, con sus lineas. */
  | { tipo: "firmas"; columnas: { lineas: string[] }[] }
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
