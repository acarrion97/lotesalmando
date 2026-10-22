import type { Lote, LoteEstado } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { LoteDto } from "../dto/LoteDto";

export class CancelarReservaUseCase {
  private lotRepository: LotRepository;
  private inventarioRepo: InventarioRepository;
  private oportunidadRepo: OportunidadRepository;
  constructor(
    lotRepository: LotRepository,
    inventarioRepo: InventarioRepository,
    oportunidadRepo: OportunidadRepository,
  ) {
    this.lotRepository = lotRepository;
    this.inventarioRepo = inventarioRepo;
    this.oportunidadRepo = oportunidadRepo;
  }

  async execute(loteId: number, usuarioId: number): Promise<LoteDto> {
    const lote: Lote | null = await this.lotRepository.getById(loteId);
    if (!lote) throw new Error(`Lote ${loteId} not found`);

    if (lote.estado !== "reservado") {
      throw new Error(`Lote ${loteId} no esta reservado (estado: ${lote.estado})`);
    }

    const estadoAnterior: LoteEstado = lote.estado;
    const loteActualizado: Lote = await this.lotRepository.updateEstado(loteId, "disponible");

    await this.inventarioRepo.create({
      id_lote: loteId,
      id_usuario: usuarioId,
      estado_anterior: estadoAnterior,
      estado_nuevo: "disponible",
    });

    // La reserva deja de existir: se borra su oportunidad (etapa 'reserva') del
    // lote, que es donde vive el snapshot del cliente. Así un lote solo tiene
    // una reserva activa a la vez y re-reservar parte limpio.
    const oportunidades = await this.oportunidadRepo.getByLoteId(loteId);
    for (const oportunidad of oportunidades) {
      if (oportunidad.etapa === "reserva") {
        await this.oportunidadRepo.delete(oportunidad.id_oportunidad).catch(() => undefined);
      }
    }

    return this.toDto(loteActualizado);
  }

  private toDto(lote: Lote): LoteDto {
    return {
      id_lote: lote.id_lote,
      id_manzana: lote.id_manzana,
      numero_lote: lote.numero_lote,
      precio_lista: lote.precio_lista,
      estado: lote.estado,
      superficie_m2: lote.superficie_m2 ?? null,
      codigo_catastral: lote.codigo_catastral ?? null,
      medidas: lote.medidas ?? null,
    };
  }
}
