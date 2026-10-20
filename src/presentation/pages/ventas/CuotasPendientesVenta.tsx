import { useMemo } from "react";
import { Table, Tag, Typography, Spin } from "antd";
import type { TableColumnType } from "antd";
import { useContratos, useCobranzasByContrato } from "@/presentation/hooks";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Text } = Typography;

interface CuotaFila {
  id_cobranza: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: string;
  fecha_vencimiento: string;
}

const estadoCuota: Record<string, { color: string; label: string }> = {
  pendiente: { color: "processing", label: "Pendiente" },
  vencida: { color: "error", label: "Vencida" },
};

const columnas: TableColumnType<CuotaFila>[] = [
  { title: "Cuota", dataIndex: "numero_cuota", key: "numero_cuota", width: 70 },
  {
    title: "Vencimiento",
    dataIndex: "fecha_vencimiento",
    key: "fecha_vencimiento",
    render: (fecha?: string) => (fecha ? formatDateOnly(fecha.slice(0, 10)) : "-"),
  },
  {
    title: "Monto",
    dataIndex: "monto_cuota",
    key: "monto_cuota",
    align: "right",
    render: (monto: number) => formatCurrency(monto),
  },
  {
    title: "Estado",
    dataIndex: "estado",
    key: "estado",
    render: (estado: string) => {
      const cfg = estadoCuota[estado] ?? { color: "default", label: estado || "-" };
      return <Tag color={cfg.color}>{cfg.label}</Tag>;
    },
  },
];

/**
 * Cuotas aun por cobrar de una venta. Si el contrato no tiene saldo (todas las
 * cuotas pagadas) o la venta no tiene contrato/cuotas, no renderiza nada.
 */
export function CuotasPendientesVenta({ idVenta }: { idVenta: number }) {
  const { data: contratos } = useContratos();
  const contrato = contratos?.find((c) => c.id_venta === idVenta);
  const { data: cuotas, isLoading } = useCobranzasByContrato(contrato?.id_contrato);

  const resumen = useMemo(() => {
    const todas = cuotas ?? [];
    const norm = todas.map((c) => ({ ...c, estado: (c.estado ?? "").trim().toLowerCase() }));
    const pendientes = norm.filter((c) => c.estado !== "pagada");
    // Centavos enteros para que el saldo no arrastre ruido de flotantes.
    const saldo = pendientes.reduce((s, c) => s + Math.round(c.monto_cuota * 100), 0) / 100;
    return { total: norm.length, pagadas: norm.length - pendientes.length, pendientes, saldo };
  }, [cuotas]);

  if (isLoading) return <Spin size="small" style={{ marginTop: 16 }} />;
  if (resumen.total === 0 || resumen.pendientes.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <Text strong>Cuotas por cobrar</Text>
        <Text type="secondary">
          {resumen.pagadas} de {resumen.total} pagadas · Saldo {formatCurrency(resumen.saldo)}
        </Text>
      </div>
      <Table<CuotaFila>
        size="small"
        rowKey="id_cobranza"
        columns={columnas}
        dataSource={resumen.pendientes}
        pagination={false}
        scroll={{ y: 240 }}
      />
    </div>
  );
}
