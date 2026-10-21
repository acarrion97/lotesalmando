import type { PortalDatos } from "../entities";

export interface RegistrarComprobanteInput {
  cedula: string;
  idCobranza: number;
  montoPagado: number;
  /** Path del objeto en el bucket privado (no la URL pública). */
  archivoUrl: string;
  archivoTipo: "imagen" | "pdf";
  archivoNombre: string | null;
}

/** Resultado de la RPC: `ok=false` trae el mensaje de la base para el visitante. */
export interface ResultadoRegistroComprobante {
  ok: boolean;
  error?: string;
  estado?: string;
}

/**
 * Puerta del portal público (rol `anon`, sin sesión). Las dos operaciones
 * pasan por RPCs SECURITY DEFINER (migración 035): el navegador jamás
 * consulta las tablas `cliente`/`cobranzas` directamente.
 */
export interface PortalClienteRepository {
  /** Cuotas y contratos de quien presente esa cédula. */
  getByCedula(cedula: string): Promise<PortalDatos>;
  /** Deja el comprobante en `pendiente`; no cambia el estado de la cuota. */
  registrarComprobante(input: RegistrarComprobanteInput): Promise<ResultadoRegistroComprobante>;
}
