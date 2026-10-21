import type { Comprobante } from "@/domain/comprobante/entities";
import type { ComprobanteRepository, RevisionComprobante } from "@/domain/comprobante/repositories";
import { comprobantes } from "@/mocks/comprobantes.mock";

export class MockComprobanteRepository implements ComprobanteRepository {
  private data: Comprobante[] = [...comprobantes];

  async getAll(): Promise<Comprobante[]> {
    return [...this.data].sort((a, b) => (b.creado_en ?? "").localeCompare(a.creado_en ?? ""));
  }

  async getByEmpresaId(_empresaId: number): Promise<Comprobante[]> {
    return this.getAll();
  }

  async getByCobranzaId(cobranzaId: number): Promise<Comprobante[]> {
    return (await this.getAll()).filter((c) => c.id_cobranza === cobranzaId);
  }

  async getById(id: number): Promise<Comprobante | null> {
    return this.data.find((c) => c.id_comprobante === id) ?? null;
  }

  async revisar(
    id: number,
    revision: RevisionComprobante,
    idUsuario: number,
  ): Promise<Comprobante> {
    const index = this.data.findIndex((c) => c.id_comprobante === id);
    if (index === -1) throw new Error("No existe ese comprobante");
    const actualizado: Comprobante = {
      ...this.data[index],
      estado: revision.estado,
      nota_rechazo: revision.estado === "rechazado" ? revision.nota_rechazo ?? null : null,
      revisado_en: new Date().toISOString(),
      id_revisado_por: idUsuario,
    };
    this.data[index] = actualizado;
    return actualizado;
  }
}
