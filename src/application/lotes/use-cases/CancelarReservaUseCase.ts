import type { Lote, LoteEstado } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { LoteDto } from "../dto/LoteDto";

export class CancelarReservaUseCase {
  private lotRepository: LotRepository;
  private inventarioRepo: InventarioRepository;
  constructor(lotRepository: LotRepository, inventarioRepo: InventarioRepository) {
    this.lotRepository = lotRepository;
    this.inventarioRepo = inventarioRepo;
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

    return this.toDto(loteActualizado);
  }

  private toDto(lote: Lote): LoteDto {
    return {
      id_lote: lote.id_lote,
      id_manzana: lote.id_manzana,
      numero_lote: lote.numero_lote,
      precio_lista: lote.precio_lista,
      estado: lote.estado,
    };
  }
}
