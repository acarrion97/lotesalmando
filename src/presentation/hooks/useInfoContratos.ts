import { useMemo } from "react";
import { etiquetaNumeroLote } from "@/utils";
import { useContratos } from "./useContratos";
import { useVentas } from "./useVentas";
import { useTodosClientes } from "./useTodosClientes";
import { useLotes } from "./useLotes";
import { useManzanas } from "./useManzanas";
import { useCobranzas } from "./useCobranzas";

export interface InfoContrato {
  idVenta: number;
  cliente: string;
  cedula: string;
  lote: string;
  /** Fecha de la venta (instante ISO), la que ordena y filtra los contratos. */
  fechaVenta: string | null;
}

/**
 * Resuelve a quien pertenece un contrato, una cuota o un pago: contrato ->
 * venta -> cliente y lote. Sirve para mostrar "de quien es" en las tablas que
 * solo guardan ids de contrato o cobranza.
 */
export function useInfoContratos() {
  const { data: contratos } = useContratos();
  const { data: ventas } = useVentas();
  const { data: clientes } = useTodosClientes();
  const { data: lotes } = useLotes();
  const { data: manzanas } = useManzanas();
  const { data: cobranzas } = useCobranzas();

  return useMemo(() => {
    const nombreManzana = new Map((manzanas ?? []).map((m) => [m.id_manzana, m.nombre_codigo]));
    const loteDe = new Map(
      (lotes ?? []).map((l) => [l.id_lote, etiquetaNumeroLote(l.numero_lote, nombreManzana.get(l.id_manzana))]),
    );
    const clienteDe = new Map((clientes ?? []).map((c) => [c.id_cliente, c]));
    const ventaDe = new Map((ventas ?? []).map((v) => [v.id_venta, v]));

    const porContrato = new Map<number, InfoContrato>();
    for (const ct of contratos ?? []) {
      const venta = ventaDe.get(ct.id_venta);
      if (!venta) continue;
      const cliente = clienteDe.get(venta.id_cliente);
      porContrato.set(ct.id_contrato, {
        idVenta: venta.id_venta,
        cliente: cliente?.nombres?.trim() || `Cliente #${venta.id_cliente}`,
        cedula: cliente?.cedula_ruc ?? "",
        lote: loteDe.get(venta.id_lote) ?? `Lote #${venta.id_lote}`,
        fechaVenta: venta.created_at ?? null,
      });
    }
    const contratoDeCobranza = new Map((cobranzas ?? []).map((c) => [c.id_cobranza, c.id_contrato]));

    return {
      infoDeContrato: (idContrato: number) => porContrato.get(idContrato),
      infoDeCobranza: (idCobranza: number) => {
        const idContrato = contratoDeCobranza.get(idCobranza);
        return idContrato === undefined ? undefined : porContrato.get(idContrato);
      },
    };
  }, [contratos, ventas, clientes, lotes, manzanas, cobranzas]);
}
