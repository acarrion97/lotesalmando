import type { Comprobante } from "@/domain/comprobante/entities";
import type { ComprobanteRepository } from "@/domain/comprobante/repositories";

/**
 * Rechaza un comprobante (la foto no se lee, el monto no coincide, etc.).
 * La nota es para el cliente: el portal la muestra junto a la cuota.
 */
export class RechazarComprobanteUseCase {
  private comprobantes: ComprobanteRepository;

  constructor(comprobantes: ComprobanteRepository) {
    this.comprobantes = comprobantes;
  }

  async execute(
    idComprobante: number,
    idUsuario: number,
    nota: string | null,
  ): Promise<Comprobante> {
    const comprobante = await this.comprobantes.getById(idComprobante);
    if (!comprobante) throw new Error("No existe ese comprobante");
    if (comprobante.estado === "aprobado") throw new Error("Ese comprobante ya fue aprobado");

    const texto = nota?.trim() ? nota.trim() : null;
    if (!texto) throw new Error("Escribí el motivo del rechazo para avisarle al cliente");

    return this.comprobantes.revisar(
      idComprobante,
      { estado: "rechazado", nota_rechazo: texto },
      idUsuario,
    );
  }
}
