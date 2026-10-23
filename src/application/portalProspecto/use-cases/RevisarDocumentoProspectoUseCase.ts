import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import type { DocumentoProspectoRepository } from "@/domain/portalProspecto/repositories";

/**
 * Aprueba o rechaza un documento que el prospecto envió desde el
 * portal. El rechazo exige observación: es lo que el prospecto lee en
 * su checklist para poder reenviar el archivo corregido.
 */
export class RevisarDocumentoProspectoUseCase {
  private documentos: DocumentoProspectoRepository;

  constructor(documentos: DocumentoProspectoRepository) {
    this.documentos = documentos;
  }

  async execute(
    idDocumento: number,
    idUsuario: number,
    estado: "aprobado" | "rechazado",
    nota: string | null,
  ): Promise<DocumentoProspecto> {
    if (!idDocumento) throw new Error("No existe ese documento");
    if (!idUsuario) throw new Error("No se identificó al usuario que revisa");

    const texto = nota?.trim() ? nota.trim() : null;
    if (estado === "rechazado" && !texto) {
      throw new Error("Escribí el motivo del rechazo para que el prospecto pueda corregirlo");
    }

    const existente = await this.documentos.getById(idDocumento);
    if (!existente) throw new Error("No existe ese documento");

    return this.documentos.revisar(
      idDocumento,
      { estado, nota_revision: estado === "rechazado" ? texto : null },
      idUsuario,
    );
  }
}
