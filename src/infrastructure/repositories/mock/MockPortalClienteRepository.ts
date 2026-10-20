import type { PortalDatos } from "@/domain/portal/entities";
import type {
  PortalClienteRepository,
  RegistrarComprobanteInput,
  ResultadoRegistroComprobante,
} from "@/domain/portal/repositories";
import { clientes } from "@/mocks/clientes.mock";
import { contratos } from "@/mocks/contratos.mock";
import { ventas } from "@/mocks/ventas.mock";
import { cobranzas } from "@/mocks/cobranzas.mock";
import { comprobantes } from "@/mocks/comprobantes.mock";

/** Solo para `VITE_DATA_PROVIDER=mock`: el portal responde con los mocks. */
export class MockPortalClienteRepository implements PortalClienteRepository {
  async getByCedula(cedula: string): Promise<PortalDatos> {
    const limpia = cedula.trim();
    const encontrados = clientes.filter((c) => c.cedula_ruc.trim() === limpia);
    if (encontrados.length === 0) return { existe: false, clientes: [] };

    return {
      existe: true,
      clientes: encontrados.map((cliente) => ({
        id_cliente: cliente.id_cliente,
        nombres: cliente.nombres,
        email: cliente.email,
        telefono: cliente.telefono,
        contratos: contratos
          .filter((contrato) =>
            ventas.some((v) => v.id_venta === contrato.id_venta && v.id_cliente === cliente.id_cliente),
          )
          .map((contrato) => ({
            id_contrato: contrato.id_contrato,
            numero_contrato: contrato.numero_contrato,
            monto_total: contrato.monto_total,
            fecha: ventas.find((v) => v.id_venta === contrato.id_venta)?.created_at ?? null,
            lote: `Lote ${ventas.find((v) => v.id_venta === contrato.id_venta)?.id_lote ?? ""}`.trim(),
            proyecto: null,
            cuotas: cobranzas
              .filter((cob) => cob.id_contrato === contrato.id_contrato)
              .sort((a, b) => a.numero_cuota - b.numero_cuota)
              .map((cob) => {
                const ultimo = comprobantes
                  .filter((cp) => cp.id_cobranza === cob.id_cobranza)
                  .sort((a, b) => (b.creado_en ?? "").localeCompare(a.creado_en ?? ""))[0];
                return {
                  id_cobranza: cob.id_cobranza,
                  numero_cuota: cob.numero_cuota,
                  monto_cuota: cob.monto_cuota,
                  fecha_vencimiento: cob.fecha_vencimiento,
                  estado: cob.estado,
                  comprobante: ultimo
                    ? {
                        estado: ultimo.estado,
                        monto_pagado: ultimo.monto_pagado,
                        fecha: ultimo.creado_en ?? null,
                        nota: ultimo.nota_rechazo,
                      }
                    : null,
                };
              }),
          })),
      })),
    };
  }

  async registrarComprobante(input: RegistrarComprobanteInput): Promise<ResultadoRegistroComprobante> {
    const datos = await this.getByCedula(input.cedula);
    const cliente = datos.clientes[0];
    const cuota = cliente?.contratos.flatMap((c) => c.cuotas).find((c) => c.id_cobranza === input.idCobranza);
    if (!cliente) return { ok: false, error: "No encontramos ninguna cuenta con esa cedula" };
    if (!cuota) return { ok: false, error: "Esa cuota no pertenece a tu cuenta" };
    if (cuota.estado === "pagada") return { ok: false, error: "Esa cuota ya figura como pagada" };
    if (input.montoPagado <= 0) return { ok: false, error: "El monto pagado debe ser mayor a cero" };

    comprobantes.push({
      id_comprobante: comprobantes.length + 1,
      id_cobranza: input.idCobranza,
      id_cliente: cliente.id_cliente,
      cedula: input.cedula.trim(),
      monto_pagado: input.montoPagado,
      archivo_url: input.archivoUrl,
      archivo_tipo: input.archivoTipo,
      archivo_nombre: input.archivoNombre,
      estado: "pendiente",
      nota_rechazo: null,
      creado_en: new Date().toISOString(),
    });

    return { ok: true, estado: "pendiente" };
  }
}
