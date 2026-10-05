import { Descriptions, Tag, Typography } from "antd";
import { useVentas } from "@/presentation/hooks";
import type { Cliente } from "@/domain/cliente/entities/Cliente";
import { diaEnEmpresa, formatCurrency, formatDateOnly } from "@/utils";
import { CuotasPendientesVenta } from "../ventas/CuotasPendientesVenta";

const { Text } = Typography;

const estadoVenta: Record<string, { color: string; label: string }> = {
  completada: { color: "success", label: "Completada" },
  pendiente: { color: "processing", label: "Con saldo pendiente" },
  cancelada: { color: "error", label: "Cancelada" },
};

interface InfoVentaLoteProps {
  idLote: number;
  clientes: Cliente[] | undefined;
}

/**
 * A quien se vendio el lote y, si queda saldo, sus cuotas por cobrar. Solo se
 * usa en el panel administrativo (MapasPage): trae datos de clientes y cartera
 * que el mapa publico no debe mostrar.
 */
export function InfoVentaLote({ idLote, clientes }: InfoVentaLoteProps) {
  const { data: ventas } = useVentas();
  // Si hubo ventas canceladas previas del mismo lote, interesa la vigente.
  const venta = ventas
    ?.filter((v) => v.id_lote === idLote)
    .sort((a, b) => Number((a.estado === "cancelada")) - Number(b.estado === "cancelada"))[0];

  if (!venta) return null;

  const cliente = clientes?.find((c) => c.id_cliente === venta.id_cliente);
  const estado = estadoVenta[(venta.estado ?? "").trim().toLowerCase()] ?? {
    color: "default",
    label: venta.estado,
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <Text strong>Venta</Text>
      <Descriptions column={2} bordered size="small" style={{ marginTop: 8 }}>
        <Descriptions.Item label="Vendido a" span={2}>
          <Text strong>{cliente?.nombres?.trim() ?? `Cliente #${venta.id_cliente}`}</Text>
        </Descriptions.Item>
        {cliente?.cedula_ruc ? (
          <Descriptions.Item label="Cedula / RUC">{cliente.cedula_ruc}</Descriptions.Item>
        ) : null}
        {cliente?.email ? <Descriptions.Item label="Email">{cliente.email}</Descriptions.Item> : null}
        <Descriptions.Item label="Fecha de venta">
          {venta.created_at ? formatDateOnly(diaEnEmpresa(venta.created_at)) : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Precio final">{formatCurrency(venta.precio_final)}</Descriptions.Item>
        <Descriptions.Item label="Estado de la venta" span={2}>
          <Tag color={estado.color}>{estado.label}</Tag>
        </Descriptions.Item>
      </Descriptions>
      <CuotasPendientesVenta idVenta={venta.id_venta} />
    </div>
  );
}
