import { supabase } from "@/infrastructure/supabase/client";
import type { Rol } from "@/domain/rol/entities";
import type { RolRepository } from "@/domain/rol/repositories";

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
}
