import type { PortalProspectoDatos } from "@/domain/portalProspecto/entities";
import type { PortalProspectoRepository } from "@/domain/portalProspecto/repositories";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Consulta la documentación del prospecto que presenta su email. Es la
 * única lectura que hace el portal público (rol `anon`); un email mal
 * formado ni siquiera llega a la base.
 */
export class ConsultarPortalProspectoUseCase {
  private portal: PortalProspectoRepository;

  constructor(portal: PortalProspectoRepository) {
    this.portal = portal;
  }

  async execute(slug: string, email: string): Promise<PortalProspectoDatos> {
    const limpio = email.trim();
    if (!EMAIL_RE.test(limpio)) {
      return {
        ok: false,
        error: "Ingrese un email válido",
        prospecto: null,
        documentos: [],
      };
    }
    return this.portal.getByEmail(slug.trim(), limpio);
  }
}
