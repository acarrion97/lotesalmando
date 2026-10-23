import type { DocumentoProspectoRepository } from "@/domain/portalProspecto/repositories";
import type { PortalProspectoStorage } from "../ports/PortalProspectoStorage";

/**
 * Abre el archivo de un documento para verlo en la revisión: el bucket
 * es privado, así que se pide una URL firmada temporal (1 h).
 */
export class AbrirDocumentoProspectoUseCase {
  private documentos: DocumentoProspectoRepository;
  private storage: PortalProspectoStorage;

  constructor(documentos: DocumentoProspectoRepository, storage: PortalProspectoStorage) {
    this.documentos = documentos;
    this.storage = storage;
  }

  async execute(idDocumento: number): Promise<string> {
    const documento = await this.documentos.getById(idDocumento);
    if (!documento) throw new Error("No existe ese documento");
    return this.storage.firmarUrl(documento.archivo_path);
  }
}
