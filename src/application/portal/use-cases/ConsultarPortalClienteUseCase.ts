import type { PortalDatos } from "@/domain/portal/entities";
import type { PortalClienteRepository } from "@/domain/portal/repositories";

/**
 * Cuotas y contratos del cliente que presenta su cédula. Es la única
 * lectura que hace el portal público (rol `anon`).
 */
export class ConsultarPortalClienteUseCase {
  private portal: PortalClienteRepository;

  constructor(portal: PortalClienteRepository) {
    this.portal = portal;
  }

  async execute(cedula: string): Promise<PortalDatos> {
    const limpia = cedula.trim();
    if (!limpia) return { existe: false, clientes: [] };
    return this.portal.getByCedula(limpia);
  }
}
