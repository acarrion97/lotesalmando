import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { ComprobanteStorage } from "@/application/comprobantes/ports/ComprobanteStorage";
import type { DocumentoContratoStorage } from "@/application/contratos/ports/DocumentoContratoStorage";

export class DeleteClienteUseCase {
  private readonly clienteRepo: ClienteRepository;
  private readonly comprobanteStorage: ComprobanteStorage;
  private readonly documentoContratoStorage: DocumentoContratoStorage;

  constructor(
    clienteRepo: ClienteRepository,
    comprobanteStorage: ComprobanteStorage,
    documentoContratoStorage: DocumentoContratoStorage,
  ) {
    this.clienteRepo = clienteRepo;
    this.comprobanteStorage = comprobanteStorage;
    this.documentoContratoStorage = documentoContratoStorage;
  }

  async execute(
    id: number,
    motivo: string,
    idUsuario: number,
  ): Promise<{ archivosPendientesEliminar: number }> {
    const resultado = await this.clienteRepo.delete(id, motivo, idUsuario);
    const eliminaciones = await Promise.allSettled([
      ...resultado.documentosContrato.map((path) => this.documentoContratoStorage.removeByPath(path)),
      ...resultado.comprobantes.map((path) => this.comprobanteStorage.removeByPath(path)),
    ]);

    return {
      archivosPendientesEliminar: eliminaciones.filter((r) => r.status === "rejected").length,
    };
  }
}
