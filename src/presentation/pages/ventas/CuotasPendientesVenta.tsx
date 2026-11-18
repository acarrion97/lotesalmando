import { useMemo, useState } from "react";
import { Table, Tag, Typography, Spin, Button, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useContratos, useCobranzasByContrato, useOnlineStatus, usePagos, usePuede } from "@/presentation/hooks";
import { EditarCuotaModal, type CuotaAEditar } from "@/presentation/components/pagos";
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

/**
 * Cuotas aun por cobrar de una venta. Si el contrato no tiene saldo (todas las
 * cuotas pagadas) o la venta no tiene contrato/cuotas, no renderiza nada.
 */
export function CuotasPendientesVenta({ idVenta }: { idVenta: number }) {
  const { data: contratos } = useContratos();
  const contrato = contratos?.find((c) => c.id_venta === idVenta);
  const { data: cuotas, isLoading } = useCobranzasByContrato(contrato?.id_contrato);
  const { data: pagos } = usePagos();
  const isOnline = useOnlineStatus();
  const puedeEditar = usePuede("editar_pagos");
  const [cuotaAEditar, setCuotaAEditar] = useState<CuotaAEditar | null>(null);

  const pagadoPorCobranza = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const p of pagos ?? []) {
      mapa.set(p.id_cobranza, (mapa.get(p.id_cobranza) ?? 0) + Math.round(p.monto_pagado * 100));
    }
    return new Map([...mapa.entries()].map(([id, centavos]) => [id, centavos / 100]));
  }, [pagos]);

  const resumen = useMemo(() => {
    const todas = cuotas ?? [];
    const norm = todas.map((c) => ({ ...c, estado: (c.estado ?? "").trim().toLowerCase() }));
    const pendientes = norm.filter((c) => c.estado !== "pagada");
    // Centavos enteros para que el saldo no arrastre ruido de flotantes.
    const saldo = pendientes.reduce((s, c) => s + Math.round(c.monto_cuota * 100), 0) / 100;
    return { total: norm.length, pagadas: norm.length - pendientes.length, pendientes, saldo };
  }, [cuotas]);

  const columnas = useMemo<TableColumnType<CuotaFila>[]>(
    () => [
      { title: "Cuota", dataIndex: "numero_cuota", key: "numero_cuota", width: 70 },
      {
        title: "Vencimiento",
        dataIndex: "fecha_vencimiento",
        key: "fecha_vencimiento",
        width: 120,
        render: (fecha?: string) => (fecha ? formatDateOnly(fecha.slice(0, 10)) : "-"),
      },
      {
        title: "Monto",
        dataIndex: "monto_cuota",
        key: "monto_cuota",
        width: 130,
        align: "right",
        render: (monto: number) => formatCurrency(monto),
      },
      {
        title: "Estado",
        dataIndex: "estado",
        key: "estado",
        width: 105,
        render: (estado: string) => {
          const cfg = estadoCuota[estado] ?? { color: "default", label: estado || "-" };
          return <Tag color={cfg.color}>{cfg.label}</Tag>;
        },
      },
      {
        title: "Acción",
        key: "accion",
        width: 75,
        render: (_: unknown, fila: CuotaFila) =>
          puedeEditar ? (
            <Tooltip
              title={isOnline ? "Editar monto o vencimiento" : "Sin conexión: no se puede editar"}
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                disabled={!isOnline}
                style={{ color: "#faad14" }}
                onClick={() =>
                  setCuotaAEditar({
                    id_cobranza: fila.id_cobranza,
                    numero_cuota: fila.numero_cuota,
                    monto_cuota: fila.monto_cuota,
                    fecha_vencimiento: fila.fecha_vencimiento,
                    estado: fila.estado,
                    numero_contrato: contrato?.numero_contrato,
                    pagado: pagadoPorCobranza.get(fila.id_cobranza) ?? 0,
                  })
                }
              />
            </Tooltip>
          ) : null,
      },
    ],
    [contrato, isOnline, pagadoPorCobranza, puedeEditar],
  );

  if (isLoading) return <Spin size="small" style={{ marginTop: 16 }} />;
  if (resumen.total === 0 || resumen.pendientes.length === 0) return null;

  return (
    <>
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
          tableLayout="fixed"
          scroll={{ x: 500, y: 240 }}
        />
      </div>
      <EditarCuotaModal
        open={cuotaAEditar !== null}
        cuota={cuotaAEditar}
        onClose={() => setCuotaAEditar(null)}
      />
    </>
  );
}
