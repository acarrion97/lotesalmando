import { supabase } from "@/infrastructure/supabase/client";
import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";

export class SupabaseClienteRepository implements ClienteRepository {
  async getAll(): Promise<Cliente[]> {
    const { data, error } = await supabase.from("cliente").select("*");
    if (error) throw error;
    return (data ?? []) as Cliente[];
  }

  async getByEmpresaId(_empresaId: number): Promise<Cliente[]> {
    const { data, error } = await supabase.from("cliente").select("*").eq("id_empresa", _empresaId);
    if (error) throw error;
    return (data ?? []) as Cliente[];
  }

  async getById(id: number): Promise<Cliente | null> {
    const { data, error } = await supabase.from("cliente").select("*").eq("id_cliente", id).single();
    if (error) return null;
    return data as Cliente;
  }

  async create(data: Omit<Cliente, "id_cliente">): Promise<Cliente> {
    const { data: created, error } = await supabase.from("cliente").insert(data).select().single();
    if (error) throw error;
    return created as Cliente;
  }

  async update(id: number, data: Partial<Cliente>): Promise<Cliente> {
    const { data: updated, error } = await supabase.from("cliente").update(data).eq("id_cliente", id).select().single();
    if (error) throw error;
    return updated as Cliente;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("cliente").delete().eq("id_cliente", id);
    if (error) throw error;
  }
}
