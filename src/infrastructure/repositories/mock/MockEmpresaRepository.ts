import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository, CrearEmpresaConAdminInput } from "@/domain/empresa/repositories";
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
    const empresa: Empresa = { ...data, id_empresa: newId, created_at: new Date().toISOString() };
    this.data.push(empresa);
    return empresa;
  }

  /**
   * En modo mock no existe la RPC de Postgres ni Supabase Auth: se simula la
   * alta de la empresa (la fila `usuario` del admin vive en otro repositorio).
   */
  async createConAdmin(input: CrearEmpresaConAdminInput): Promise<Empresa> {
    if (input.admin_password.length < 6) {
      throw new Error("La contraseña del admin debe tener al menos 6 caracteres.");
    }
    return this.create({
      razon_social: input.razon_social,
      ruc: input.ruc ?? "",
      estado: "activo",
      plan: null,
    });
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
