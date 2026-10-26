import type { Rol, Permiso } from "@/domain/rol/entities";
import type { RolRepository, AsignacionRol } from "@/domain/rol/repositories";
import { roles, usuarioRolAsignaciones } from "@/mocks/roles.mock";

export class MockRolRepository implements RolRepository {
  private data: Rol[] = [...roles];
  private asignaciones: { id_usuario: number; id_rol: number }[] = [...usuarioRolAsignaciones];
  private permisos: Permiso[] = [];
  private rolPermisos: { id_rol: number; id_permiso: number }[] = [];
  private siguientePermisoId = 1;

  async getAll(): Promise<Rol[]> {
    return [...this.data];
  }

  async getRolesByUsuarioId(usuarioId: number): Promise<Rol[]> {
    const rolIds = this.asignaciones.filter((a) => a.id_usuario === usuarioId).map((a) => a.id_rol);
    return this.data.filter((r) => rolIds.includes(r.id_rol));
  }

  async getAllAsignacionesRol(): Promise<AsignacionRol[]> {
    return this.asignaciones.flatMap((a) => {
      const rol = this.data.find((r) => r.id_rol === a.id_rol);
      return rol
        ? [{ id_usuario: a.id_usuario, id_rol: rol.id_rol, nombre_rol: rol.nombre_rol }]
        : [];
    });
  }

  async getPermisosByUsuarioId(_usuarioId: number): Promise<string[]> {
    // En modo mock un usuario con sesión ve todo: el catálogo de permisos no
    // se simula, así que se devuelven los permisos "ver_*" de todos los
    // módulos para no bloquear la navegación de prueba.
    return [
      "ver_dashboard",
      "ver_proyectos",
      "ver_etapas",
      "ver_manzanas",
      "ver_mapas",
      "ver_lotes",
      "ver_inventario",
      "ver_clientes",
      "ver_cotizaciones",
      "ver_ventas",
      "ver_prospectos",
      "ver_asesores",
      "ver_contratos",
      "ver_cobranzas",
      "ver_pagos",
      "ver_proyeccion",
      "ver_alertas",
      "ver_reportes",
      "exportar_reportes",
      "ver_usuarios",
      "ver_configuracion",
      "ver_roles",
      "ver_registros_de_todos",
    ];
  }

  async assignRol(usuarioId: number, rolId: number): Promise<void> {
    const yaAsignado = this.asignaciones.some((a) => a.id_usuario === usuarioId && a.id_rol === rolId);
    if (!yaAsignado) this.asignaciones.push({ id_usuario: usuarioId, id_rol: rolId });
  }

  async removeRol(usuarioId: number, rolId: number): Promise<void> {
    this.asignaciones = this.asignaciones.filter((a) => !(a.id_usuario === usuarioId && a.id_rol === rolId));
  }

  // ---- Gestión de roles ----

  async createRol(nombre: string): Promise<Rol> {
    if (this.data.some((r) => r.nombre_rol.toLowerCase() === nombre.toLowerCase())) {
      throw new Error("Ya existe un rol con ese nombre.");
    }
    const nuevo: Rol = { id_rol: Math.max(0, ...this.data.map((r) => r.id_rol)) + 1, nombre_rol: nombre };
    this.data.push(nuevo);
    return nuevo;
  }

  async updateRol(rolId: number, nombre: string): Promise<Rol> {
    const rol = this.data.find((r) => r.id_rol === rolId);
    if (!rol) throw new Error("Rol no encontrado");
    rol.nombre_rol = nombre;
    return { ...rol };
  }

  async deleteRol(rolId: number): Promise<void> {
    this.data = this.data.filter((r) => r.id_rol !== rolId);
    this.rolPermisos = this.rolPermisos.filter((rp) => rp.id_rol !== rolId);
  }

  // ---- Catálogo de permisos ----

  async getAllPermisos(): Promise<Permiso[]> {
    return [...this.permisos];
  }

  async createPermiso(nombre: string, modulo: string | null): Promise<Permiso> {
    if (this.permisos.some((p) => p.nombre_permiso === nombre)) {
      throw new Error("Ya existe un permiso con ese nombre.");
    }
    const nuevo: Permiso = { id_permiso: this.siguientePermisoId++, nombre_permiso: nombre, modulo };
    this.permisos.push(nuevo);
    return nuevo;
  }

  async deletePermiso(permisoId: number): Promise<void> {
    this.permisos = this.permisos.filter((p) => p.id_permiso !== permisoId);
    this.rolPermisos = this.rolPermisos.filter((rp) => rp.id_permiso !== permisoId);
  }

  // ---- Asignación rol <-> permiso ----

  async getPermisoIdsByRol(rolId: number): Promise<number[]> {
    return this.rolPermisos.filter((rp) => rp.id_rol === rolId).map((rp) => rp.id_permiso);
  }

  async assignPermisoARol(rolId: number, permisoId: number): Promise<void> {
    const ya = this.rolPermisos.some((rp) => rp.id_rol === rolId && rp.id_permiso === permisoId);
    if (!ya) this.rolPermisos.push({ id_rol: rolId, id_permiso: permisoId });
  }

  async removePermisoDeRol(rolId: number, permisoId: number): Promise<void> {
    this.rolPermisos = this.rolPermisos.filter(
      (rp) => !(rp.id_rol === rolId && rp.id_permiso === permisoId),
    );
  }
}
