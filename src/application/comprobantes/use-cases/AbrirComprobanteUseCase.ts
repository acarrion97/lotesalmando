import type { ComprobanteRepository } from "@/domain/comprobante/repositories";
import type { ComprobanteStorage } from "../ports/ComprobanteStorage";

/** URL firmada (1 h) para ver el archivo que subió el cliente. */
export class AbrirComprobanteUseCase {
  private comprobantes: ComprobanteRepository;
  private storage: ComprobanteStorage;

  constructor(comprobantes: ComprobanteRepository, storage: ComprobanteStorage) {
    this.comprobantes = comprobantes;
    this.storage = storage;
  }

  async execute(idComprobante: number): Promise<string> {
    const comprobante = await this.comprobantes.getById(idComprobante);
    if (!comprobante) throw new Error("No existe ese comprobante");
    return this.storage.firmarUrl(comprobante.archivo_url);
  }
}
