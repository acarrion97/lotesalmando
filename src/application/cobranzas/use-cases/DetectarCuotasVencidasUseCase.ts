import type { CobranzaRepository } from "@/domain/cobranza/repositories";

export class DetectarCuotasVencidasUseCase {
  private cobranzaRepo: CobranzaRepository;
  constructor(cobranzaRepo: CobranzaRepository) {
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(): Promise<number> {
    const pendientes = await this.cobranzaRepo.getAll();
    const hoy = new Date();
    const vencidas = pendientes.filter((c) => c.estado === "pendiente" && new Date(c.fecha_vencimiento) < hoy);

    let detectadas = 0;
    for (const cuota of vencidas) {
      await this.cobranzaRepo.updateEstado(cuota.id_cobranza, "vencida");
      detectadas++;
    }
    return detectadas;
  }
}
