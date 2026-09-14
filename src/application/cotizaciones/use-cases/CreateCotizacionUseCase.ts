import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { CotizacionDto } from "../dto/CotizacionDto";

export class CreateCotizacionUseCase {
  private cotizacionRepo: CotizacionRepository;
  constructor(cotizacionRepo: CotizacionRepository) {
    this.cotizacionRepo = cotizacionRepo;
  }

  async execute(data: Omit<CotizacionDto, "id_cotizacion">): Promise<CotizacionDto> {
    const cotizacion: Cotizacion = await this.cotizacionRepo.create({
      id_cliente: data.id_cliente,
      id_lote: data.id_lote,
      precio_ofertado: data.precio_ofertado,
      estado: data.estado,
    });

    return this.toDto(cotizacion);
  }

  private toDto(cotizacion: Cotizacion): CotizacionDto {
    return {
      id_cotizacion: cotizacion.id_cotizacion,
      id_cliente: cotizacion.id_cliente,
      id_lote: cotizacion.id_lote,
      precio_ofertado: cotizacion.precio_ofertado,
      estado: cotizacion.estado,
    };
  }
}
