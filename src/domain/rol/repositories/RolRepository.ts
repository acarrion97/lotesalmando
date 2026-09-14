import type { Rol } from "../entities";

export interface RolRepository {
  getAll(): Promise<Rol[]>;
  getById(id: number): Promise<Rol | null>;
  create(data: Omit<Rol, "id_rol">): Promise<Rol>;
  update(id: number, data: Partial<Rol>): Promise<Rol>;
  delete(id: number): Promise<void>;
}
