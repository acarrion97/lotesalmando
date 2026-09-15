import type { CobranzaRepository } from "@/domain/cobranza/repositories";

export class DetectarCuotasVencidasUseCase {
  private cobranzaRepo: CobranzaRepository;
  constructor(cobranzaRepo: CobranzaRepository) {
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(): Promise<number> {
    const pendientes = await this.cobranzaRepo.getAll();
    const vencidas = pendientes.filter((c) => c.estado === "pendiente");

    let detectadas = 0;
    for (const cuota of vencidas) {
      await this.cobranzaRepo.updateEstado(cuota.id_cobranza, "vencida");
      detectadas++;
    }
    return detectadas;
  }
}
