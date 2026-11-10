import { supabase } from "@/infrastructure/supabase/client";
import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";

export class SupabaseClienteRepository implements ClienteRepository {
  async getAll(): Promise<Cliente[]> {
    const { data, error } = await supabase.from("cliente").select("*");
    if (error) throw error;
    return (data ?? []) as Cliente[];
  }

  // `cliente.id_empresa` (migración 019) define el alcance directo: el
  // listado por empresa es una igualdad, no una inferencia por ventas y
  // cotizaciones. Los datos capturados al reservar ya no crean `cliente`
  // (viven en la oportunidad de la reserva), así que aquí solo entran
  // clientes reales.
  async getByEmpresaId(empresaId: number): Promise<Cliente[]> {
    if (!empresaId) return [];
    const { data, error } = await supabase
      .from("cliente")
      .select("*")
      .eq("id_empresa", empresaId)
      .order("nombres");
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

  async delete(id: number, motivo: string, idUsuario: number) {
    const { data, error } = await supabase.rpc("eliminar_cliente_en_cascada", {
      p_id_cliente: id,
      p_motivo: motivo,
      p_id_usuario: idUsuario,
    });
    if (error) throw error;
    if (!data || typeof data !== "object") {
      throw new Error("La eliminación del cliente no devolvió resultado");
    }

    const resultado = data as {
      documentos_contrato?: unknown;
      comprobantes?: unknown;
    };
    if (
      !Array.isArray(resultado.documentos_contrato) ||
      !Array.isArray(resultado.comprobantes) ||
      !resultado.documentos_contrato.every((path) => typeof path === "string") ||
      !resultado.comprobantes.every((path) => typeof path === "string")
    ) {
      throw new Error("La eliminación del cliente devolvió rutas de archivo inválidas");
    }

    return {
      documentosContrato: resultado.documentos_contrato,
      comprobantes: resultado.comprobantes,
    };
  }
}
