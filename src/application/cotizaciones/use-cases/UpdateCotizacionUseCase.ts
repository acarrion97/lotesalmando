import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { CotizacionDto } from "../dto/CotizacionDto";
import { validarCondicionesFinanciamiento } from "./validaciones/condicionesFinanciamiento";

export class UpdateCotizacionUseCase {
  private cotizacionRepo: CotizacionRepository;

  constructor(cotizacionRepo: CotizacionRepository) {
    this.cotizacionRepo = cotizacionRepo;
  }

  async execute(
    id: number,
    data: Partial<Omit<Cotizacion, "id_cotizacion">>,
  ): Promise<CotizacionDto> {
    // Las condiciones pueden venir incompletas (solo entrada, solo precio):
    // se validan contra la fila actual para no aprobar combinaciones inválidas.
    const actual = await this.cotizacionRepo.getById(id);
    if (!actual) throw new Error(`La cotización ${id} no existe`);

    validarCondicionesFinanciamiento({
      precio_ofertado: data.precio_ofertado ?? actual.precio_ofertado,
      monto_entrada: data.monto_entrada ?? actual.monto_entrada ?? 0,
      num_cuotas: data.num_cuotas ?? actual.num_cuotas ?? 12,
    });

    const cotizacion: Cotizacion = await this.cotizacionRepo.update(id, data);
    return this.toDto(cotizacion);
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
