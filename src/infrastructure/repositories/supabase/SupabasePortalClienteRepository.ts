import { supabase } from "@/infrastructure/supabase/client";
import type { PortalDatos } from "@/domain/portal/entities";
import type {
  PortalClienteRepository,
  RegistrarComprobanteInput,
  ResultadoRegistroComprobante,
} from "@/domain/portal/repositories";

/** Shape crudo que devuelve la RPC `portal_cliente_por_cedula` (035). */
interface CrudoPortal {
  existe?: boolean;
  clientes?: Array<{
    id_cliente: number;
    nombres: string;
    email: string | null;
    telefono: string | null;
    contratos?: Array<{
      id_contrato: number;
      numero_contrato: string;
      monto_total: number;
      fecha: string | null;
      lote: string | null;
      proyecto: string | null;
      cuotas?: Array<{
        id_cobranza: number;
        numero_cuota: number;
        monto_cuota: number;
        fecha_vencimiento: string | null;
        estado: string;
        comprobante: {
          estado: string;
          monto_pagado: number;
          fecha: string | null;
          nota: string | null;
        } | null;
      }>;
    }>;
  }>;
}

/**
 * Puerta del portal público: todo pasa por RPCs SECURITY DEFINER con el
 * rol anon (migración 035). El navegador nunca consulta `cliente` ni
 * `cobranzas` a mano.
 */
export class SupabasePortalClienteRepository implements PortalClienteRepository {
  async getByCedula(cedula: string): Promise<PortalDatos> {
    const { data, error } = await supabase.rpc("portal_cliente_por_cedula", { p_cedula: cedula });
    if (error) throw error;
    const crudo = (data ?? {}) as CrudoPortal;

    return {
      existe: !!crudo.existe,
      clientes: (crudo.clientes ?? []).map((cliente) => ({
        id_cliente: cliente.id_cliente,
        nombres: cliente.nombres,
        email: cliente.email,
        telefono: cliente.telefono,
        contratos: (cliente.contratos ?? []).map((contrato) => ({
          id_contrato: contrato.id_contrato,
          numero_contrato: contrato.numero_contrato,
          monto_total: Number(contrato.monto_total),
          fecha: contrato.fecha,
          lote: contrato.lote,
          proyecto: contrato.proyecto,
          cuotas: (contrato.cuotas ?? []).map((cuota) => ({
            id_cobranza: cuota.id_cobranza,
            numero_cuota: cuota.numero_cuota,
            monto_cuota: Number(cuota.monto_cuota),
            fecha_vencimiento: cuota.fecha_vencimiento,
            estado: cuota.estado as "pendiente" | "pagada" | "vencida",
            comprobante: cuota.comprobante
              ? {
                  estado: cuota.comprobante.estado as "pendiente" | "aprobado" | "rechazado",
                  monto_pagado: Number(cuota.comprobante.monto_pagado),
                  fecha: cuota.comprobante.fecha,
                  nota: cuota.comprobante.nota,
                }
              : null,
          })),
        })),
      })),
    };
  }

  async registrarComprobante(input: RegistrarComprobanteInput): Promise<ResultadoRegistroComprobante> {
    const { data, error } = await supabase.rpc("portal_registrar_comprobante", {
      p_cedula: input.cedula,
      p_id_cobranza: input.idCobranza,
      p_monto: input.montoPagado,
      p_archivo_url: input.archivoUrl,
      p_archivo_tipo: input.archivoTipo,
      p_archivo_nombre: input.archivoNombre,
    });
    if (error) return { ok: false, error: error.message };
    const crudo = (data ?? {}) as { ok?: boolean; error?: string; estado?: string };
    return { ok: !!crudo.ok, error: crudo.error, estado: crudo.estado };
  }
}
