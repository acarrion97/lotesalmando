import type { Rol, Permiso } from "../entities";

/** Asignación usuario -> rol, en bruto, para vistas que muestran muchos usuarios. */
export interface AsignacionRol {
  id_usuario: number;
  id_rol: number;
  nombre_rol: string;
}

export interface RolRepository {
  getAll(): Promise<Rol[]>;
  getRolesByUsuarioId(usuarioId: number): Promise<Rol[]>;
  /**
   * Todas las asignaciones usuario -> rol en una sola consulta. Pensado para
   * vistas que listan muchos usuarios a la vez (ej: el desglose de
   * `/plataforma`), donde hacer `getRolesByUsuarioId` por cada usuario
   * produciría N+1 requests.
   */
  getAllAsignacionesRol(): Promise<AsignacionRol[]>;
  /**
   * Nombres de permiso (`permiso.nombre_permiso`) que el usuario tiene a
   * través de todos sus roles (usuario_rol -> rol_permiso -> permiso). Es la
   * fuente que usa el frontend para decidir menú, rutas, acciones y alcance
   * de datos.
   */
  getPermisosByUsuarioId(usuarioId: number): Promise<string[]>;
  assignRol(usuarioId: number, rolId: number): Promise<void>;
  removeRol(usuarioId: number, rolId: number): Promise<void>;

  // ---- Gestión de roles (UI Roles y Permisos) ----
  createRol(nombre: string): Promise<Rol>;
  updateRol(rolId: number, nombre: string): Promise<Rol>;
  deleteRol(rolId: number): Promise<void>;

  // ---- Catálogo de permisos ----
  getAllPermisos(): Promise<Permiso[]>;
  /** Crea un permiso nuevo; lanza error si el nombre ya existe. */
  createPermiso(nombre: string, modulo: string | null): Promise<Permiso>;
  deletePermiso(permisoId: number): Promise<void>;

  // ---- Asignación rol <-> permiso ----
  /** Ids de permisos asignados a un rol. */
  getPermisoIdsByRol(rolId: number): Promise<number[]>;
  assignPermisoARol(rolId: number, permisoId: number): Promise<void>;
  removePermisoDeRol(rolId: number, permisoId: number): Promise<void>;
}
