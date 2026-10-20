import type { Comprobante } from "@/domain/comprobante/entities";
import type { ComprobanteRepository } from "@/domain/comprobante/repositories";

/**
 * Comprobantes que los clientes enviaron desde el portal, de la empresa
 * de la sesión. La cadena es comprobante → cuota → contrato → venta.
 */
export class GetComprobantesUseCase {
  private comprobantes: ComprobanteRepository;

  constructor(comprobantes: ComprobanteRepository) {
    this.comprobantes = comprobantes;
  }

  async execute(empresaId: number): Promise<Comprobante[]> {
    if (!empresaId) return [];
    return this.comprobantes.getByEmpresaId(empresaId);
  }
}
