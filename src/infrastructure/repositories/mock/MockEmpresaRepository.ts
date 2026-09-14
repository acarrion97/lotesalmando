import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository } from "@/domain/empresa/repositories";
import { empresas } from "@/mocks/empresa.mock";

export class MockEmpresaRepository implements EmpresaRepository {
  private data: Empresa[] = [...empresas];

  async getAll(): Promise<Empresa[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Empresa | null> {
    return this.data.find((e) => e.id_empresa === id) ?? null;
  }

  async create(data: Omit<Empresa, "id_empresa">): Promise<Empresa> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((e) => e.id_empresa)) + 1 : 1;
    const empresa: Empresa = { ...data, id_empresa: newId };
    this.data.push(empresa);
    return empresa;
  }

  async update(id: number, data: Partial<Empresa>): Promise<Empresa> {
    const index = this.data.findIndex((e) => e.id_empresa === id);
    if (index === -1) throw new Error(`Empresa ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_empresa: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((e) => e.id_empresa !== id);
  }
}
