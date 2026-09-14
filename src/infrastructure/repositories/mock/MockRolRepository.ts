import type { Rol } from "@/domain/rol/entities";
import type { RolRepository } from "@/domain/rol/repositories";
import { roles } from "@/mocks/roles.mock";

export class MockRolRepository implements RolRepository {
  private data: Rol[] = [...roles];

  async getAll(): Promise<Rol[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Rol | null> {
    return this.data.find((r) => r.id_rol === id) ?? null;
  }

  async create(data: Omit<Rol, "id_rol">): Promise<Rol> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((r) => r.id_rol)) + 1 : 1;
    const rol: Rol = { ...data, id_rol: newId };
    this.data.push(rol);
    return rol;
  }

  async update(id: number, data: Partial<Rol>): Promise<Rol> {
    const index = this.data.findIndex((r) => r.id_rol === id);
    if (index === -1) throw new Error(`Rol ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_rol: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((r) => r.id_rol !== id);
  }
}
