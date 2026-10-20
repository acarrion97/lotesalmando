import type { Partnership } from "@/domain/partnership/entities";
import type { PartnershipRepository } from "@/domain/partnership/repositories";

export class MockPartnershipRepository implements PartnershipRepository {
  private data: Partnership[] = [
    {
      id_partner: 1,
      nombre: "Partner Demo",
      codigo: "DEMO10",
      email: "partner@demo.com",
      estado: "activo",
      created_at: new Date().toISOString(),
    },
  ];

  async getAll(): Promise<Partnership[]> {
    return [...this.data];
  }

  async getByCodigo(codigo: string): Promise<Partnership | null> {
    const normalizado = codigo.trim().toUpperCase();
    return this.data.find((p) => p.codigo === normalizado) ?? null;
  }

  async create(data: Omit<Partnership, "id_partner" | "created_at">): Promise<Partnership> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((p) => p.id_partner)) + 1 : 1;
    const partner: Partnership = { ...data, id_partner: newId, created_at: new Date().toISOString() };
    this.data.push(partner);
    return partner;
  }

  async update(id: number, data: Partial<Partnership>): Promise<Partnership> {
    const index = this.data.findIndex((p) => p.id_partner === id);
    if (index === -1) throw new Error(`Partnership ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_partner: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((p) => p.id_partner !== id);
  }
}
