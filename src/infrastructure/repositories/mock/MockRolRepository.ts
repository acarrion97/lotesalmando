import type { Rol } from "@/domain/rol/entities";
import type { RolRepository } from "@/domain/rol/repositories";
import { roles, usuarioRolAsignaciones } from "@/mocks/roles.mock";

export class MockRolRepository implements RolRepository {
  private data: Rol[] = [...roles];
  private asignaciones: { id_usuario: number; id_rol: number }[] = [...usuarioRolAsignaciones];

  async getAll(): Promise<Rol[]> {
    return [...this.data];
  }

  async getRolesByUsuarioId(usuarioId: number): Promise<Rol[]> {
    const rolIds = this.asignaciones.filter((a) => a.id_usuario === usuarioId).map((a) => a.id_rol);
    return this.data.filter((r) => rolIds.includes(r.id_rol));
  }

  async assignRol(usuarioId: number, rolId: number): Promise<void> {
    const yaAsignado = this.asignaciones.some((a) => a.id_usuario === usuarioId && a.id_rol === rolId);
    if (!yaAsignado) this.asignaciones.push({ id_usuario: usuarioId, id_rol: rolId });
  }

  async removeRol(usuarioId: number, rolId: number): Promise<void> {
    this.asignaciones = this.asignaciones.filter((a) => !(a.id_usuario === usuarioId && a.id_rol === rolId));
  }
}
