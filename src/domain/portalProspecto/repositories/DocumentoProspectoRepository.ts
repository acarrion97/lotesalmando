import type { DocumentoProspecto, DocumentoProspectoEstado } from "../entities";

export interface RevisionDocumentoProspecto {
  estado: Exclude<DocumentoProspectoEstado, "pendiente">;
  /** Obligatorio al rechazar (el prospecto lo lee en su portal). */
  nota_revision?: string | null;
}

/**
 * Puerta del backoffice sobre los documentos del portal: listado por
 * empresa (RLS por empresa, migración 044) y revisión. El portal
 * anónimo NO usa este repositorio: habla por RPCs.
 */
export interface DocumentoProspectoRepository {
  /** Documentos de la empresa, del más reciente al más viejo. */
  getByEmpresaId(empresaId: number): Promise<DocumentoProspecto[]>;
  getById(id: number): Promise<DocumentoProspecto | null>;
  /** Aprueba o rechaza; deja `revisado_en` y el usuario que revisó. */
  revisar(
    id: number,
    revision: RevisionDocumentoProspecto,
    idUsuario: number,
  ): Promise<DocumentoProspecto>;
}
