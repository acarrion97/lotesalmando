import type {
  DocumentoProspectoTipo,
  PortalProspectoDatos,
} from "../entities";

/** Resultado de una RPC: `ok=false` trae el mensaje de la base para el visitante. */
export interface ResultadoPortal {
  ok: boolean;
  error?: string;
  id_prospecto?: number;
  /** `true` si el email ya existía (se reutiliza, nunca se duplica). */
  existe?: boolean;
}

export interface IniciarProspectoInput {
  slug: string;
  email: string;
  nombres: string;
  telefono: string;
}

export interface RegistrarDocumentoInput {
  email: string;
  idProspecto: number;
  tipo: DocumentoProspectoTipo;
  /** Path del objeto en el bucket privado (no la URL pública). */
  path: string;
  nombre: string | null;
}

/**
 * Puerta del portal de prospectos (rol `anon`, sin sesión). Las
 * operaciones pasan por RPCs SECURITY DEFINER (migración 044): el
 * navegador jamás consulta `prospectos`/`prospecto_documento` directo.
 */
export interface PortalProspectoRepository {
  /** Prospecto (si existe) y sus documentos, dentro de la empresa del slug. */
  getByEmail(slug: string, email: string): Promise<PortalProspectoDatos>;
  /** Crea el prospecto con origen `portal` o reutiliza el del email. */
  iniciarProspecto(input: IniciarProspectoInput): Promise<ResultadoPortal>;
  /** Deja el documento en `pendiente`; el reenvío sobrescribe el anterior. */
  registrarDocumento(
    input: RegistrarDocumentoInput,
  ): Promise<ResultadoPortal>;
}
