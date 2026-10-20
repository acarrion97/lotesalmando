import type { Usuario } from "../entities";

export interface UsuarioRepository {
  getAll(): Promise<Usuario[]>;
  getByEmpresaId(empresaId: number): Promise<Usuario[]>;
  getById(id: number): Promise<Usuario | null>;
  create(data: Omit<Usuario, "id_usuario">): Promise<Usuario>;
  /** Crea la cuenta de acceso en Supabase Auth (RPC crear_usuario_auth). */
  createAuthUser(data: { email: string; password: string; nombres: string }): Promise<void>;
  update(id: number, data: Partial<Usuario>): Promise<Usuario>;
  delete(id: number): Promise<void>;
}
