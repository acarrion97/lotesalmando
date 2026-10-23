import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import type { DocumentoProspectoRepository } from "@/domain/portalProspecto/repositories";

/**
 * Documentación enviada desde el portal público, de la empresa de la
 * sesión: es lo que se revisa en Prospectos → Documentación.
 */
export class GetDocumentosProspectoUseCase {
  private documentos: DocumentoProspectoRepository;

  constructor(documentos: DocumentoProspectoRepository) {
    this.documentos = documentos;
  }

  async execute(empresaId: number): Promise<DocumentoProspecto[]> {
    if (!empresaId) return [];
    return this.documentos.getByEmpresaId(empresaId);
  }
}
