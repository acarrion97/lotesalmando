import type { ContractRepository } from "@/domain/contrato/repositories";
import type { DocumentoContratoStorage } from "../ports/DocumentoContratoStorage";

/**
 * URL firmada (1 h) para BAJAR el documento del contrato, con el nombre que
 * tenía el archivo (el que generó la app o el que anexó el usuario). El
 * bucket es privado, así que nadie ve el contrato con la URL del objeto tal
 * cual.
 */
export class DescargarDocumentoContratoUseCase {
  private contratos: ContractRepository;
  private storage: DocumentoContratoStorage;

  constructor(contratos: ContractRepository, storage: DocumentoContratoStorage) {
    this.contratos = contratos;
    this.storage = storage;
  }

  async execute(contratoId: number): Promise<{ url: string; nombre: string }> {
    const contrato = await this.contratos.getById(contratoId);
    if (!contrato?.documento_url) throw new Error("Este contrato todavía no tiene documento");

    const nombre = contrato.documento_nombre || `contrato-${contrato.numero_contrato}`;
    const url = await this.storage.firmarUrlDeDescarga(contrato.documento_url, nombre);
    return { url, nombre };
  }
}
