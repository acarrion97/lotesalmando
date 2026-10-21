import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";
import {
  tipoDeArchivoDocumentoContrato,
  validarArchivoDocumentoContrato,
  type DocumentoContratoStorage,
} from "../ports/DocumentoContratoStorage";

/**
 * Anexa un documento propio (PDF o Word) al contrato. Reemplaza al que
 * hubiera y borra el objeto viejo de forma best-effort.
 */
export class AnexarDocumentoContratoUseCase {
  private contratos: ContractRepository;
  private storage: DocumentoContratoStorage;

  constructor(contratos: ContractRepository, storage: DocumentoContratoStorage) {
    this.contratos = contratos;
    this.storage = storage;
  }

  async execute(contratoId: number, file: File): Promise<Contrato> {
    const error = validarArchivoDocumentoContrato(file);
    if (error) throw new Error(error);

    const contrato = await this.contratos.getById(contratoId);
    if (!contrato) throw new Error("No existe ese contrato");

    const { path, nombre } = await this.storage.upload({ contratoId, file });
    const actualizado = await this.contratos.setDocumento(contratoId, {
      url: path,
      tipo: tipoDeArchivoDocumentoContrato(file),
      nombre,
      origen: "subido",
    });

    if (contrato.documento_url) {
      await this.storage.removeByPath(contrato.documento_url).catch(() => undefined);
    }

    return actualizado;
  }
}
