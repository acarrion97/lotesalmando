import type { ContractRepository } from "@/domain/contrato/repositories";
import type { DocumentoContratoStorage } from "../ports/DocumentoContratoStorage";

/** Quita el documento del contrato: borra el objeto y limpia la fila. */
export class QuitarDocumentoContratoUseCase {
  private contratos: ContractRepository;
  private storage: DocumentoContratoStorage;

  constructor(contratos: ContractRepository, storage: DocumentoContratoStorage) {
    this.contratos = contratos;
    this.storage = storage;
  }

  async execute(contratoId: number): Promise<void> {
    const contrato = await this.contratos.getById(contratoId);
    if (!contrato?.documento_url) return;

    await this.contratos.setDocumento(contratoId, {
      url: null,
      tipo: null,
      nombre: null,
      origen: null,
    });
    await this.storage.removeByPath(contrato.documento_url).catch(() => undefined);
  }
}
