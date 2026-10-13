import { supabase } from "@/infrastructure/supabase/client";
import type { Usuario } from "@/domain/usuario/entities";
import type { UsuarioRepository } from "@/domain/usuario/repositories";

export class SupabaseUsuarioRepository implements UsuarioRepository {
  async getAll(): Promise<Usuario[]> {
    const { data, error } = await supabase.from("usuario").select("*");
    if (error) throw error;
    return (data ?? []) as Usuario[];
  }

  async getByEmpresaId(empresaId: number): Promise<Usuario[]> {
    const { data, error } = await supabase.from("usuario").select("*").eq("id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as Usuario[];
  }

  async getById(id: number): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from("usuario")
      .select("*")
      .eq("id_usuario", id)
      .single();
    if (error) return null;
    return data as Usuario;
  }

  async create(data: Omit<Usuario, "id_usuario">): Promise<Usuario> {
    const { data: created, error } = await supabase.from("usuario").insert(data).select().single();
    if (error) throw error;
    return created as Usuario;
  }

  async createAuthUser(data: { email: string; password: string; nombres: string }): Promise<void> {
    const { error } = await supabase.rpc("crear_usuario_auth", {
      p_email: data.email,
      p_password: data.password,
      p_nombres: data.nombres,
    });
    if (error) throw new Error(error.message);
  }

  async update(id: number, data: Partial<Usuario>): Promise<Usuario> {
    const { data: updated, error } = await supabase
      .from("usuario")
      .update(data)
      .eq("id_usuario", id)
      .select()
      .single();
    if (error) throw error;
    return updated as Usuario;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("usuario").delete().eq("id_usuario", id);
    if (error) throw error;
  }
}
