import type { DocumentoProspectoEstado, DocumentoProspectoTipo } from "./PortalProspecto";

/**
 * Documento enviado por un prospecto, tal como lo ve el backoffice en
 * la revisión (incluye los datos del prospecto para identificarlo).
 */
export interface DocumentoProspecto {
  id_documento: number;
  id_prospecto: number;
  id_empresa: number;
  tipo: DocumentoProspectoTipo;
  /** Path en el bucket privado `documentos_prospectos`. */
  archivo_path: string;
  archivo_nombre: string | null;
  estado: DocumentoProspectoEstado;
  creado_en: string | null;
  revisado_en: string | null;
  id_revisado_por: number | null;
  nota_revision: string | null;
  prospecto: {
    nombres: string;
    email: string | null;
    telefono: string | null;
  } | null;
}
