import type { Cobranza, CobranzaEstado } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import { cobranzas } from "@/mocks/cobranzas.mock";

export class MockCobranzaRepository implements CobranzaRepository {
  private data: Cobranza[] = [...cobranzas];
  private readonly contractRepo: ContractRepository;
  private readonly saleRepo: SaleRepository;

  constructor(contractRepo: ContractRepository, saleRepo: SaleRepository) {
    this.contractRepo = contractRepo;
    this.saleRepo = saleRepo;
  }

  async getAll(): Promise<Cobranza[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Cobranza[]> {
    return [...this.data];
  }

  async getByContratoId(contratoId: number): Promise<Cobranza[]> {
    return this.data.filter((c) => c.id_contrato === contratoId);
  }

  async getById(id: number): Promise<Cobranza | null> {
    return this.data.find((c) => c.id_cobranza === id) ?? null;
  }

  async create(data: Omit<Cobranza, "id_cobranza">): Promise<Cobranza> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_cobranza)) + 1 : 1;
    const cobranza: Cobranza = { ...data, id_cobranza: newId };
    this.data.push(cobranza);
    // Alta de una cuota: si es para una venta ya 'completada', deja de estarlo.
    await this.recalcularEstadoVentaDe(cobranza.id_contrato);
    return cobranza;
  }

  async updateEstado(id: number, estado: CobranzaEstado): Promise<Cobranza> {
    const index = this.data.findIndex((c) => c.id_cobranza === id);
    if (index === -1) throw new Error(`Cobranza ${id} not found`);
    this.data[index] = { ...this.data[index], estado };
    await this.recalcularEstadoVentaDe(this.data[index].id_contrato);
    return this.data[index];
  }

  async getVencidas(): Promise<Cobranza[]> {
    return this.data.filter((c) => c.estado === "vencida");
  }

  /**
   * Réplica en memoria del trigger `trg_ventas_estado_por_cuotas`
   * (migraciones `040_ventas_estado_segun_cuotas.sql` y
   * `041_normaliza_estado_ventas.sql`): la venta pasa a `completada` recién
   * cuando todas sus cuotas quedan `pagada` y vuelve a `pendiente` si falta
   * alguna. Las reglas se replican una a una:
   * una venta sin cuotas no se evalúa y una venta `cancelada` no se toca.
   * Cualquier otro estado se re-evalúa y se normaliza (espejo del trigger
   * auto-sanador de la 041, que no exige que el valor esté ya escrito
   * exactamente `pendiente`/`completada`).
   */
  private async recalcularEstadoVentaDe(idContrato: number): Promise<void> {
    const contrato = await this.contractRepo.getById(idContrato);
    if (!contrato) return;

    const venta = await this.saleRepo.getById(contrato.id_venta);
    // Espejo de la guarda del trigger (migración 041): solo se respeta
    // `cancelada`; cualquier otro estado se re-evalúa y se normaliza al
    // valor canónico en lugar de descartarse.
    if (!venta || venta.estado === "cancelada") return;

    const cuotas = this.data.filter((c) => c.id_contrato === idContrato);
    if (cuotas.length === 0) return;

    const nuevo = cuotas.every((c) => c.estado === "pagada") ? "completada" : "pendiente";
    if (nuevo !== venta.estado) {
      await this.saleRepo.update(venta.id_venta, { estado: nuevo });
    }
  }
}
