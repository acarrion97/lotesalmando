import type {
  IniciarProspectoInput,
  PortalProspectoRepository,
  ResultadoPortal,
} from "@/domain/portalProspecto/repositories";

/**
 * Da de alta (o reutiliza) el prospecto del portal antes del primer
 * envío: el prospecto que no existe en el CRM debe dejar nombres y
 * teléfono mínimos. La dedupe por email la hace la RPC (migración 044),
 * así que nunca se crean duplicados.
 */
export class IniciarProspectoPortalUseCase {
  private portal: PortalProspectoRepository;

  constructor(portal: PortalProspectoRepository) {
    this.portal = portal;
  }

  async execute(input: IniciarProspectoInput): Promise<ResultadoPortal> {
    const email = input.email.trim();
    const nombres = input.nombres.trim();
    const telefono = input.telefono.trim();

    if (!input.slug.trim()) {
      return { ok: false, error: "El portal solicitado no existe" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Ingrese un email válido" };
    }
    if (nombres.length < 2) return { ok: false, error: "Ingrese sus nombres" };
    if (telefono.length < 5) {
      return { ok: false, error: "Ingrese un teléfono válido" };
    }

    return this.portal.iniciarProspecto({
      slug: input.slug.trim(),
      email,
      nombres,
      telefono,
    });
  }
}
