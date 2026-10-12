import type { EntradaReserva } from "@/domain/entrada/entities";
import type { EntradaReservaRepository } from "@/domain/entrada/repositories";
import type { EntradaReservaDto } from "../dto/EntradaReservaDto";

export class GetEntradasReservaUseCase {
  private entradaRepo: EntradaReservaRepository;
  constructor(entradaRepo: EntradaReservaRepository) {
    this.entradaRepo = entradaRepo;
  }

  async execute(empresaId?: number): Promise<EntradaReservaDto[]> {
    if (!empresaId) return [];
    const entradas: EntradaReserva[] = await this.entradaRepo.getByEmpresaId(empresaId);
    return entradas.map((e) => this.toDto(e));
  }

  private toDto(entrada: EntradaReserva): EntradaReservaDto {
    return {
      id_entrada: entrada.id_entrada,
      id_lote: entrada.id_lote,
      id_prospecto: entrada.id_prospecto,
      id_empresa: entrada.id_empresa,
      id_usuario: entrada.id_usuario,
      monto: entrada.monto,
      fecha_pago: entrada.fecha_pago,
    };
  }
}
