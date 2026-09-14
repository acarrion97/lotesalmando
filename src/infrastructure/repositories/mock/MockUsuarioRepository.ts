import type { Usuario } from "@/domain/usuario/entities";
import type { UsuarioRepository } from "@/domain/usuario/repositories";
import { usuarios } from "@/mocks/usuarios.mock";

export class MockUsuarioRepository implements UsuarioRepository {
  private data: Usuario[] = [...usuarios];

  async getAll(): Promise<Usuario[]> {
    return [...this.data];
  }

  async getByEmpresaId(empresaId: number): Promise<Usuario[]> {
    return this.data.filter((u) => u.id_empresa === empresaId);
  }

  async getById(id: number): Promise<Usuario | null> {
    return this.data.find((u) => u.id_usuario === id) ?? null;
  }

  async create(data: Omit<Usuario, "id_usuario">): Promise<Usuario> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((u) => u.id_usuario)) + 1 : 1;
    const usuario: Usuario = { ...data, id_usuario: newId };
    this.data.push(usuario);
    return usuario;
  }

  async update(id: number, data: Partial<Usuario>): Promise<Usuario> {
    const index = this.data.findIndex((u) => u.id_usuario === id);
    if (index === -1) throw new Error(`Usuario ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_usuario: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((u) => u.id_usuario !== id);
  }
}
