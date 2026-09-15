import type { CobranzaRepository } from "@/domain/cobranza/repositories";

export interface CarteraMetricas {
  totalCobranzas: number;
  pendientes: number;
  pagadas: number;
  vencidas: number;
  montoTotal: number;
  montoPendiente: number;
  montoPagado: number;
  montoVencido: number;
  morosidadPorcentaje: number;
}

export class GetCarteraMetricasUseCase {
  private cobranzaRepo: CobranzaRepository;
  constructor(cobranzaRepo: CobranzaRepository) {
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(): Promise<CarteraMetricas> {
    const cobranzas = await this.cobranzaRepo.getAll();

    const pendientes = cobranzas.filter((c) => c.estado === "pendiente");
    const pagadas = cobranzas.filter((c) => c.estado === "pagada");
    const vencidas = cobranzas.filter((c) => c.estado === "vencida");

    const montoTotal = cobranzas.reduce((sum, c) => sum + c.monto_cuota, 0);
    const montoPendiente = pendientes.reduce((sum, c) => sum + c.monto_cuota, 0);
    const montoPagado = pagadas.reduce((sum, c) => sum + c.monto_cuota, 0);
    const montoVencido = vencidas.reduce((sum, c) => sum + c.monto_cuota, 0);

    const totalActivas = pendientes.length + vencidas.length;
    const morosidadPorcentaje = totalActivas > 0 ? Math.round((vencidas.length / totalActivas) * 100) : 0;

    return {
      totalCobranzas: cobranzas.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      vencidas: vencidas.length,
      montoTotal,
      montoPendiente,
      montoPagado,
      montoVencido,
      morosidadPorcentaje,
    };
  }
}
