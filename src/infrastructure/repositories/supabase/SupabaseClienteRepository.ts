import { supabase } from "@/infrastructure/supabase/client";
import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import { getLoteIdsForEmpresa } from "./shared/empresaScope";

export class SupabaseClienteRepository implements ClienteRepository {
  async getAll(): Promise<Cliente[]> {
    const { data, error } = await supabase.from("cliente").select("*");
    if (error) throw error;
    return (data ?? []) as Cliente[];
  }

  // `cliente` has no id_empresa column of its own — a client only belongs
  // to a tenant through the ventas it appears in, so scope by that instead.
  async getByEmpresaId(empresaId: number): Promise<Cliente[]> {
    const loteIds = await getLoteIdsForEmpresa(empresaId);
    if (loteIds.length === 0) return [];

    const { data: ventasData, error: ventasError } = await supabase
      .from("ventas")
      .select("id_cliente")
      .in("id_lote", loteIds);
    if (ventasError) throw ventasError;

    const clienteIds = [...new Set((ventasData ?? []).map((v) => v.id_cliente as number))];
    if (clienteIds.length === 0) return [];

    const { data, error } = await supabase.from("cliente").select("*").in("id_cliente", clienteIds);
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
