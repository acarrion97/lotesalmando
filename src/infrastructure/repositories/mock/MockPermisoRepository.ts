import type { Permiso } from "@/domain/permiso/entities";
import type { PermisoRepository } from "@/domain/permiso/repositories";
import { permisos } from "@/mocks/permisos.mock";

export class MockPermisoRepository implements PermisoRepository {
  private data: Permiso[] = [...permisos];

  async getAll(): Promise<Permiso[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Permiso | null> {
    return this.data.find((p) => p.id_permiso === id) ?? null;
  }

  async getByModulo(modulo: string): Promise<Permiso[]> {
    return this.data.filter((p) => p.modulo === modulo);
  }

  async create(data: Omit<Permiso, "id_permiso">): Promise<Permiso> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((p) => p.id_permiso)) + 1 : 1;
    const permiso: Permiso = { ...data, id_permiso: newId };
    this.data.push(permiso);
    return permiso;
  }

  async update(id: number, data: Partial<Permiso>): Promise<Permiso> {
    const index = this.data.findIndex((p) => p.id_permiso === id);
    if (index === -1) throw new Error(`Permiso ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_permiso: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((p) => p.id_permiso !== id);
  }
}
