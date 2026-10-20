import { supabase } from "@/infrastructure/supabase/client";
import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";

export class SupabaseContractRepository implements ContractRepository {
  async getAll(): Promise<Contrato[]> {
    const { data, error } = await supabase.from("contratos").select("*");
    if (error) throw error;
    return (data ?? []) as Contrato[];
  }

  async getByEmpresaId(empresaId: number): Promise<Contrato[]> {
    const { data, error } = await supabase
      .from("contratos")
      .select("*, ventas!inner(usuario!inner(id_empresa))")
      .eq("ventas.usuario.id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as unknown as Contrato[];
  }

  async getById(id: number): Promise<Contrato | null> {
    const { data, error } = await supabase.from("contratos").select("*").eq("id_contrato", id).single();
    if (error) return null;
    return data as Contrato;
  }

  async getByVentaId(ventaId: number): Promise<Contrato | null> {
    const { data, error } = await supabase.from("contratos").select("*").eq("id_venta", ventaId).single();
    if (error) return null;
    return data as Contrato;
  }

  async create(data: Omit<Contrato, "id_contrato">): Promise<Contrato> {
    const { data: created, error } = await supabase.from("contratos").insert(data).select().single();
    if (error) throw error;
    return created as Contrato;
  }

  async setDocumento(
    contratoId: number,
    documento: {
      url: string | null;
      tipo: "docx" | "pdf" | null;
      nombre: string | null;
      origen: "subido" | "generado" | null;
    },
  ): Promise<Contrato> {
    const { data, error } = await supabase
      .from("contratos")
      .update({
        documento_url: documento.url,
        documento_tipo: documento.tipo,
        documento_nombre: documento.nombre,
        documento_origen: documento.origen,
        documento_subido_en: documento.url ? new Date().toISOString() : null,
      })
      .eq("id_contrato", contratoId)
      .select()
      .single();
    if (error) throw error;
    return data as Contrato;
  }
}
