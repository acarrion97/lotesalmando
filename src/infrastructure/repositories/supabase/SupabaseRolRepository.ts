import { supabase } from "@/infrastructure/supabase/client";
import type { Rol, Permiso } from "@/domain/rol/entities";
import type { RolRepository, AsignacionRol } from "@/domain/rol/repositories";

interface UsuarioRolRow {
  id_rol: number;
  roles: Rol | null;
}

export class SupabaseRolRepository implements RolRepository {
  async getAll(): Promise<Rol[]> {
    const { data, error } = await supabase.from("roles").select("*").order("nombre_rol");
    if (error) throw error;
    return (data ?? []) as Rol[];
  }

  async getRolesByUsuarioId(usuarioId: number): Promise<Rol[]> {
    const { data, error } = await supabase
      .from("usuario_rol")
      .select("id_rol, roles(id_rol, nombre_rol)")
      .eq("id_usuario", usuarioId);
    if (error) throw error;
    return ((data ?? []) as unknown as UsuarioRolRow[])
      .map((row) => row.roles)
      .filter((rol): rol is Rol => rol !== null);
  }

  /**
   * Todas las asignaciones usuario -> rol en una sola query. A diferencia de
   * `getRolesByUsuarioId`, no filtra: sirve para vistas que muestran usuarios
   * de muchas empresas a la vez (ej: /plataforma) sin disparar N+1 requests.
   */
  async getAllAsignacionesRol(): Promise<AsignacionRol[]> {
    const { data, error } = await supabase
      .from("usuario_rol")
      .select("id_usuario, id_rol, roles(id_rol, nombre_rol)");
    if (error) throw error;

    const filas = (data ?? []) as unknown as {
      id_usuario: number;
      id_rol: number;
      roles: Rol | null;
    }[];

    return filas
      .filter((fila): fila is typeof fila & { roles: Rol } => fila.roles !== null)
      .map((fila) => ({
        id_usuario: fila.id_usuario,
        id_rol: fila.roles.id_rol,
        nombre_rol: fila.roles.nombre_rol,
      }));
  }

  async getPermisosByUsuarioId(usuarioId: number): Promise<string[]> {
    // Ruta de joins: usuario_rol.id_rol -> roles -> rol_permiso.id_permiso -> permiso.
    const { data, error } = await supabase
      .from("usuario_rol")
      .select("roles(rol_permiso(permiso(nombre_permiso)))")
      .eq("id_usuario", usuarioId);
    if (error) throw error;

    const filas = (data ?? []) as unknown as {
      roles: {
        rol_permiso: { permiso: { nombre_permiso: string } | null }[] | null;
      } | null;
    }[];

    const nombres = new Set<string>();
    for (const fila of filas) {
      for (const rp of fila.roles?.rol_permiso ?? []) {
        if (rp.permiso?.nombre_permiso) nombres.add(rp.permiso.nombre_permiso);
      }
    }
    return [...nombres];
  }

  async assignRol(usuarioId: number, rolId: number): Promise<void> {
    const { error } = await supabase
      .from("usuario_rol")
      .upsert({ id_usuario: usuarioId, id_rol: rolId }, { onConflict: "id_usuario,id_rol", ignoreDuplicates: true });
    if (error) throw error;
  }

  async removeRol(usuarioId: number, rolId: number): Promise<void> {
    const { error } = await supabase.from("usuario_rol").delete().eq("id_usuario", usuarioId).eq("id_rol", rolId);
    if (error) throw error;
  }

  // ---- Gestión de roles ----

  async createRol(nombre: string): Promise<Rol> {
    const { data, error } = await supabase
      .from("roles")
      .insert({ nombre_rol: nombre })
      .select("*")
      .single();
    if (error) throw this.traducirError(error, "No se pudo crear el rol");
    return data as Rol;
  }

  async updateRol(rolId: number, nombre: string): Promise<Rol> {
    const { data, error } = await supabase
      .from("roles")
      .update({ nombre_rol: nombre })
      .eq("id_rol", rolId)
      .select("*")
      .single();
    if (error) throw this.traducirError(error, "No se pudo actualizar el rol");
    return data as Rol;
  }

  async deleteRol(rolId: number): Promise<void> {
    const { error } = await supabase.from("roles").delete().eq("id_rol", rolId);
    if (error) throw error;
  }

  // ---- Catálogo de permisos ----

  async getAllPermisos(): Promise<Permiso[]> {
    const { data, error } = await supabase
      .from("permiso")
      .select("*")
      .order("modulo", { ascending: true, nullsFirst: false })
      .order("nombre_permiso");
    if (error) throw error;
    return (data ?? []) as Permiso[];
  }

  async createPermiso(nombre: string, modulo: string | null): Promise<Permiso> {
    const { data, error } = await supabase
      .from("permiso")
      .insert({ nombre_permiso: nombre, modulo })
      .select("*")
      .single();
    if (error) throw this.traducirError(error, "No se pudo crear el permiso");
    return data as Permiso;
  }

  async deletePermiso(permisoId: number): Promise<void> {
    const { error } = await supabase.from("permiso").delete().eq("id_permiso", permisoId);
    if (error) throw error;
  }

  // ---- Asignación rol <-> permiso ----

  async getPermisoIdsByRol(rolId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from("rol_permiso")
      .select("id_permiso")
      .eq("id_rol", rolId);
    if (error) throw error;
    return (data ?? []).map((row) => (row as { id_permiso: number }).id_permiso);
  }

  async assignPermisoARol(rolId: number, permisoId: number): Promise<void> {
    const { error } = await supabase
      .from("rol_permiso")
      .upsert({ id_rol: rolId, id_permiso: permisoId }, { onConflict: "id_rol,id_permiso", ignoreDuplicates: true });
    if (error) throw error;
  }

  async removePermisoDeRol(rolId: number, permisoId: number): Promise<void> {
    const { error } = await supabase
      .from("rol_permiso")
      .delete()
      .eq("id_rol", rolId)
      .eq("id_permiso", permisoId);
    if (error) throw error;
  }

  /** Mensajes de error más legibles para los casos más comunes. */
  private traducirError(error: { code?: string; message: string }, fallback: string): Error {
    if (error.code === "23505") {
      return new Error("Ya existe un registro con ese nombre.");
    }
    return new Error(error.message || fallback);
  }
}
