import { Alert, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { calcularPlanCuotas, type CuotaDelPlan } from "@/domain/cotizacion/services";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Text } = Typography;

interface TablaPlanCuotasProps {
  precio_ofertado: number;
  monto_entrada: number;
  num_cuotas: number;
  /** Define los vencimientos; por defecto, hoy (la primera cuota es +1 mes). */
  fechaBase?: Date;
  /** Altura máxima con scroll interno (útil para planes largos). */
  scrollY?: number;
}

/**
 * Tabla de cuotas compartida por el wizard, el modal de detalle y el modal de
 * aceptación (spec `cotizaciones/plan-de-pago`, escenario "visibilidad").
 * Muestra un aviso en lugar de números incorrectos si las condiciones todavía
 * no son válidas (por ejemplo, mientras se escribe una entrada mayor al precio).
 */
export function TablaPlanCuotas({
  precio_ofertado,
  monto_entrada,
  num_cuotas,
  fechaBase,
  scrollY,
}: TablaPlanCuotasProps) {
  const plan = useMemo(() => {
    try {
      return {
        ok: true as const,
        plan: calcularPlanCuotas(precio_ofertado, monto_entrada, num_cuotas, fechaBase),
      };
    } catch (error) {
      return {
        ok: false as const,
        mensaje: error instanceof Error ? error.message : "Plan no válido",
      };
    }
  }, [precio_ofertado, monto_entrada, num_cuotas, fechaBase]);

  if (!plan.ok) {
    return <Alert type="warning" showIcon message={plan.mensaje} />;
  }

  const columns: ColumnsType<CuotaDelPlan> = [
    {
      title: "#",
      dataIndex: "numero",
      key: "numero",
      width: 56,
      align: "center",
    },
    {
      title: "Vencimiento",
      dataIndex: "fecha_vencimiento",
      key: "fecha_vencimiento",
      render: (fecha: string) => formatDateOnly(fecha),
    },
    {
      title: "Monto",
      dataIndex: "monto",
      key: "monto",
      align: "right",
      render: (monto: number) => formatCurrency(monto),
    },
  ];

  return (
    <Table<CuotaDelPlan>
      rowKey="numero"
      size="small"
      bordered
      columns={columns}
      dataSource={plan.plan.cuotas}
      pagination={false}
      scroll={scrollY ? { y: scrollY } : undefined}
      footer={() => (
        <>
          <Text strong>Financiado: {formatCurrency(plan.plan.financiado)}</Text>
          {" · "}
          <Text>
            {plan.plan.num_cuotas} cuotas de {formatCurrency(plan.plan.cuota_base)}
            {plan.plan.cuotas[plan.plan.num_cuotas - 1]?.monto !== plan.plan.cuota_base && (
              <> (la última: {formatCurrency(plan.plan.cuotas[plan.plan.num_cuotas - 1].monto)})</>
            )}
          </Text>
          {" · "}
          <Text strong>Total: {formatCurrency(plan.plan.financiado)}</Text>
        </>
      )}
    />
  );
}
