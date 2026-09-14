import type { Permiso } from "../entities";

export interface PermisoRepository {
  getAll(): Promise<Permiso[]>;
  getById(id: number): Promise<Permiso | null>;
  getByModulo(modulo: string): Promise<Permiso[]>;
  create(data: Omit<Permiso, "id_permiso">): Promise<Permiso>;
  update(id: number, data: Partial<Permiso>): Promise<Permiso>;
  delete(id: number): Promise<void>;
}
