import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { CobranzaDto } from "../dto/CobranzaDto";

export interface EditarCuotaInput {
  id_cobranza: number;
  monto_cuota: number;
  /** Fecha en formato YYYY-MM-DD. */
  fecha_vencimiento: string;
}

/**
 * Corrige el monto y el vencimiento de una cuota. El estado no se recibe desde
 * la UI: lo recalcula la RPC `editar_cuota` con los pagos ya registrados, para
 * que la cartera y el reporte de mora no queden desfasados.
 */
export class EditarCuotaUseCase {
  private cobranzaRepo: CobranzaRepository;

  constructor(cobranzaRepo: CobranzaRepository) {
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(input: EditarCuotaInput): Promise<CobranzaDto> {
    if (!Number.isFinite(input.monto_cuota) || input.monto_cuota <= 0) {
      throw new Error("El monto de la cuota debe ser mayor a cero");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_vencimiento)) {
      throw new Error("Indique una fecha de vencimiento válida");
    }

    const cuota = await this.cobranzaRepo.updateDatos(input.id_cobranza, {
      monto_cuota: input.monto_cuota,
      fecha_vencimiento: input.fecha_vencimiento,
    });

    return {
      id_cobranza: cuota.id_cobranza,
      id_contrato: cuota.id_contrato,
      numero_cuota: cuota.numero_cuota,
      monto_cuota: cuota.monto_cuota,
      estado: cuota.estado,
      fecha_vencimiento: cuota.fecha_vencimiento,
      created_at: cuota.created_at,
    };
  }
}
