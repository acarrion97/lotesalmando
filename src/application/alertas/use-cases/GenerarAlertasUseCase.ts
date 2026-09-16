import type { LotRepository } from "@/domain/lote/repositories";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { Alerta } from "@/domain/alerta/entities";

export interface AlertasConfig {
  stockMinimo: number;
  horasSeguimiento: number;
  diasCarteraVencer: number;
}

const defaultConfig: AlertasConfig = {
  stockMinimo: 5,
  horasSeguimiento: 48,
  diasCarteraVencer: 7,
};

export class GenerarAlertasUseCase {
  private lotRepo: LotRepository;
  private prospectoRepo: ProspectoRepository;
  private cobranzaRepo: CobranzaRepository;

  constructor(
    lotRepo: LotRepository,
    prospectoRepo: ProspectoRepository,
    cobranzaRepo: CobranzaRepository,
  ) {
    this.lotRepo = lotRepo;
    this.prospectoRepo = prospectoRepo;
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(config: AlertasConfig = defaultConfig): Promise<Alerta[]> {
    const alertas: Alerta[] = [];

    // 1. Alertas de inventario
    const lotes = await this.lotRepo.getAll();
    const disponibles = lotes.filter((l) => l.estado === "disponible").length;
    if (disponibles < config.stockMinimo) {
      alertas.push({
        id: `inv-${Date.now()}`,
        tipo: "inventario",
        prioridad: disponibles === 0 ? "alta" : "media",
        titulo: "Stock de lotes bajo",
        descripcion: `Solo quedan ${disponibles} lotes disponibles (umbral: ${config.stockMinimo})`,
        entidad_tipo: "lote",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    // 2. Alertas de seguimiento
    const prospectos = await this.prospectoRepo.getAll();
    const ahora = new Date();
    for (const p of prospectos) {
      if (!p.fecha_ultimo_seguimiento) continue;
      const ultimaActividad = new Date(p.fecha_ultimo_seguimiento);
      const horasDesde = (ahora.getTime() - ultimaActividad.getTime()) / (1000 * 60 * 60);
      if (horasDesde > config.horasSeguimiento) {
        alertas.push({
          id: `seg-${p.id_prospecto}-${Date.now()}`,
          tipo: "seguimiento",
          prioridad: horasDesde > 72 ? "alta" : "media",
          titulo: "Prospecto sin seguimiento",
          descripcion: `${p.nombres} lleva ${Math.round(horasDesde)}h sin actividad`,
          entidad_tipo: "prospecto",
          entidad_id: p.id_prospecto,
          created_at: new Date().toISOString(),
          leida: false,
        });
      }
    }

    // 3. Alertas de cartera por vencer
    const cobranzas = await this.cobranzaRepo.getAll();
    const hoy = new Date();
    const en7Dias = new Date(hoy.getTime() + config.diasCarteraVencer * 24 * 60 * 60 * 1000);
    const porVencer = cobranzas.filter((c) => {
      if (c.estado !== "pendiente") return false;
      const fecha = new Date(c.fecha_vencimiento);
      return fecha >= hoy && fecha <= en7Dias;
    });
    if (porVencer.length > 0) {
      alertas.push({
        id: `car-vencer-${Date.now()}`,
        tipo: "cartera",
        prioridad: "media",
        titulo: "Cuotas por vencer",
        descripcion: `${porVencer.length} cuotas vencen en los proximos ${config.diasCarteraVencer} dias`,
        entidad_tipo: "cobranza",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    // 4. Alertas de morosidad
    const vencidas = cobranzas.filter((c) => c.estado === "vencida");
    if (vencidas.length > 0) {
      const montoVencido = vencidas.reduce((sum, c) => sum + c.monto_cuota, 0);
      alertas.push({
        id: `mora-${Date.now()}`,
        tipo: "mora",
        prioridad: vencidas.length > 5 ? "alta" : "media",
        titulo: "Cartera en mora",
        descripcion: `${vencidas.length} cuotas vencidas por $${montoVencido.toLocaleString()}`,
        entidad_tipo: "cobranza",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    return alertas;
  }
}
