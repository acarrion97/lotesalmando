import { supabase } from "@/infrastructure/supabase/client";
import type {
  AceptarCotizacionCommand,
  AceptarCotizacionPort,
  ResultadoAceptacion,
} from "@/application/cotizaciones/ports/AceptarCotizacionPort";

/**
 * Invoca la RPC `aceptar_cotizacion(p_id_cotizacion, p_id_usuario)` de la
 * migración `012_aceptar_cotizacion_venta.sql`: toda la creación de la venta
 * (venta, lote, inventario, contrato y cuotas) ocurre en una transacción en
 * la base de datos, no en llamadas secuenciales desde el navegador.
 */
export class SupabaseAceptarCotizacion implements AceptarCotizacionPort {
  async execute(command: AceptarCotizacionCommand): Promise<ResultadoAceptacion> {
    const { data, error } = await supabase.rpc("aceptar_cotizacion", {
      p_id_cotizacion: command.id_cotizacion,
      p_id_usuario: command.id_usuario,
    });

    if (error) throw new Error(error.message ?? "No se pudo aceptar la cotización");

    // La función devuelve TABLE: PostgREST responde con un arreglo de filas.
    const fila = Array.isArray(data) ? data[0] : data;
    if (!fila) throw new Error("La aceptación no devolvió resultado");

    return {
      id_venta: Number(fila.venta_id),
      id_contrato: Number(fila.contrato_id),
      cuotas_generadas: Number(fila.cuotas_generadas),
    };
  }
}
