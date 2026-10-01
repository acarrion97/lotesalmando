import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { CotizacionDto } from "../dto/CotizacionDto";

export class GetCotizacionesUseCase {
  private cotizacionRepo: CotizacionRepository;
  constructor(cotizacionRepo: CotizacionRepository) {
    this.cotizacionRepo = cotizacionRepo;
  }

  async execute(empresaId?: number): Promise<CotizacionDto[]> {
    const cotizaciones: Cotizacion[] = empresaId
      ? await this.cotizacionRepo.getByEmpresaId(empresaId)
      : await this.cotizacionRepo.getAll();
    return cotizaciones.map((c) => this.toDto(c));
  }

  private toDto(cotizacion: Cotizacion): CotizacionDto {
    return {
      id_cotizacion: cotizacion.id_cotizacion,
      id_cliente: cotizacion.id_cliente,
      id_lote: cotizacion.id_lote,
      precio_ofertado: cotizacion.precio_ofertado,
      estado: cotizacion.estado,
      id_asesor: cotizacion.id_asesor ?? null,
      // Defaults defensivos: solo aplican a filas creadas antes de la migración 011.
      monto_entrada: cotizacion.monto_entrada ?? 0,
      num_cuotas: cotizacion.num_cuotas ?? 12,
    };
  }
}
