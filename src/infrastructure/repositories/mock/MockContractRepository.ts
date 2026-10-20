import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";
import { contratos } from "@/mocks/contratos.mock";

export class MockContractRepository implements ContractRepository {
  private data: Contrato[] = [...contratos];

  async getAll(): Promise<Contrato[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Contrato[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Contrato | null> {
    return this.data.find((c) => c.id_contrato === id) ?? null;
  }

  async getByVentaId(ventaId: number): Promise<Contrato | null> {
    return this.data.find((c) => c.id_venta === ventaId) ?? null;
  }

  async create(data: Omit<Contrato, "id_contrato">): Promise<Contrato> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_contrato)) + 1 : 1;
    const contrato: Contrato = { ...data, id_contrato: newId };
    this.data.push(contrato);
    return contrato;
  }

  async setDocumento(
    contratoId: number,
    documento: {
      url: string | null;
      tipo: "docx" | "pdf" | null;
      nombre: string | null;
      origen: "subido" | "generado" | null;
    },
  ): Promise<Contrato> {
    const index = this.data.findIndex((c) => c.id_contrato === contratoId);
    if (index === -1) throw new Error("No existe ese contrato");
    const actualizado: Contrato = {
      ...this.data[index],
      documento_url: documento.url,
      documento_tipo: documento.tipo,
      documento_nombre: documento.nombre,
      documento_origen: documento.origen,
      documento_subido_en: documento.url ? new Date().toISOString() : null,
    };
    this.data[index] = actualizado;
    return actualizado;
  }
}
