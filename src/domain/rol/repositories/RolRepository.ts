import type { Rol } from "../entities";

export interface RolRepository {
  getAll(): Promise<Rol[]>;
  getRolesByUsuarioId(usuarioId: number): Promise<Rol[]>;
  assignRol(usuarioId: number, rolId: number): Promise<void>;
  removeRol(usuarioId: number, rolId: number): Promise<void>;
}
