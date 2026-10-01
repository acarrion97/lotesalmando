import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { CotizacionDto } from "../dto/CotizacionDto";
import { validarCondicionesFinanciamiento } from "./validaciones/condicionesFinanciamiento";

export class CreateCotizacionUseCase {
  private cotizacionRepo: CotizacionRepository;
  constructor(cotizacionRepo: CotizacionRepository) {
    this.cotizacionRepo = cotizacionRepo;
  }

  async execute(data: Omit<CotizacionDto, "id_cotizacion">): Promise<CotizacionDto> {
    validarCondicionesFinanciamiento(data);

    const cotizacion: Cotizacion = await this.cotizacionRepo.create({
      id_cliente: data.id_cliente,
      id_lote: data.id_lote,
      precio_ofertado: data.precio_ofertado,
      estado: data.estado,
      id_asesor: data.id_asesor,
      monto_entrada: data.monto_entrada,
      num_cuotas: data.num_cuotas,
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
      id_asesor: cotizacion.id_asesor,
      monto_entrada: cotizacion.monto_entrada,
      num_cuotas: cotizacion.num_cuotas,
    };
  }
}
