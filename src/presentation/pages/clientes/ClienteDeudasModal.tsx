import { useMemo, useState } from "react";
import { Modal, Button, Table, Tag, Tooltip, Typography, Spin, Empty, Space } from "antd";
import { EyeOutlined, PayCircleOutlined, EditOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useVentas, useContratos, useCobranzas, useOnlineStatus, useComprobantes, useInfoContratos, usePagos, usePuede } from "@/presentation/hooks";
import { RegistrarPagoModal, EditarCuotaModal, type CobranzaAPagar, type CuotaAEditar } from "@/presentation/components/pagos";
import { ComprobanteTag } from "@/presentation/components/comprobantes/ComprobanteTag";
import { ModalRevisionComprobante } from "@/presentation/components/comprobantes/ModalRevisionComprobante";
import type { Comprobante } from "@/domain/comprobante/entities";
import type { Cliente } from "@/domain/cliente/entities/Cliente";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Text } = Typography;

interface DeudaFila {
  id_cobranza: number;
  numero_contrato: string;
  numero_cuota: number;
  monto_cuota: number;
  estado: string;
  fecha_vencimiento: string | null;
}

const estadoCuota: Record<string, { color: string; label: string }> = {
  pendiente: { color: "processing", label: "Pendiente" },
  vencida: { color: "error", label: "Vencida" },
};

// Cada columna lleva ancho fijo: con `tableLayout` automático la tabla reparte
// el ancho del modal y los rótulos ("Vencimiento", "Estado") se parten letra
// por letra. Sumado a `scroll.x` la tabla se desplaza en pantallas angostas.
const columnasBase: TableColumnType<DeudaFila>[] = [
  { title: "Cuota", dataIndex: "numero_cuota", key: "numero_cuota", width: 70 },
  { title: "Contrato", dataIndex: "numero_contrato", key: "numero_contrato", width: 110 },
  {
    title: "Vencimiento",
    dataIndex: "fecha_vencimiento",
    key: "fecha_vencimiento",
    width: 120,
    render: (fecha?: string | null) => (fecha ? formatDateOnly(fecha.slice(0, 10)) : "-"),
  },
  {
    title: "Monto",
    dataIndex: "monto_cuota",
    key: "monto_cuota",
    width: 120,
    align: "right",
    render: (monto: number) => formatCurrency(monto),
  },
  {
    title: "Estado",
    dataIndex: "estado",
    key: "estado",
    width: 100,
    render: (estado: string) => {
      const cfg = estadoCuota[estado] ?? { color: "default", label: estado || "-" };
      return <Tag color={cfg.color}>{cfg.label}</Tag>;
    },
  },
];

/**
 * Modal con las deudas pendientes de un cliente. No hay relación directa
 * cliente↔cobranza: se resuelve la cadena cliente → ventas → contratos →
 * cuotas en memoria, usando los datos ya cargados a nivel de empresa
 * (useVentas/useContratos/useCobranzas) sin llamadas extra por apertura.
 */
export function ClienteDeudasModal({
  cliente,
  open,
  onClose,
  proyectoId,
}: {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
  proyectoId?: number | null;
}) {
  const { data: ventas, isLoading: loadingVentas } = useVentas();
  const { data: contratos } = useContratos();
  const { data: cobranzas } = useCobranzas();
  const { data: comprobantes } = useComprobantes();
  const { data: pagos } = usePagos();
  const { infoDeContrato, isLoading: loadingRelaciones } = useInfoContratos();
  const isOnline = useOnlineStatus();
  const puedeEditar = usePuede("editar_pagos");
  const [cobranzaAPagar, setCobranzaAPagar] = useState<CobranzaAPagar | null>(null);
  const [cuotaAEditar, setCuotaAEditar] = useState<CuotaAEditar | null>(null);
  const [comprobanteSel, setComprobanteSel] = useState<{
    comprobante: Comprobante;
    contexto: string;
  } | null>(null);

  // Último comprobante de cada cuota (el más reciente gana).
  const comprobantePorCobranza = useMemo(() => {
    const mapa = new Map<number, Comprobante>();
    for (const cp of comprobantes ?? []) {
      if (!mapa.has(cp.id_cobranza)) mapa.set(cp.id_cobranza, cp);
    }
    return mapa;
  }, [comprobantes]);

  /** Total pagado por cuota, para mostrarlo en el modal de edición. */
  const pagadoPorCobranza = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const p of pagos ?? []) {
      mapa.set(p.id_cobranza, (mapa.get(p.id_cobranza) ?? 0) + Math.round(p.monto_pagado * 100));
    }
    return new Map([...mapa.entries()].map(([id, centavos]) => [id, centavos / 100]));
  }, [pagos]);

  const { filas, saldo } = useMemo(() => {
    if (!cliente) return { filas: [] as DeudaFila[], saldo: 0 };

    // Ventas del cliente → ids de venta.
    const idsVenta = new Set(
      (ventas ?? []).filter((v) => v.id_cliente === cliente.id_cliente).map((v) => v.id_venta),
    );
    if (idsVenta.size === 0) return { filas: [] as DeudaFila[], saldo: 0 };

    // Contratos de esas ventas → mapa id_contrato → número de contrato.
    const numeroPorContrato = new Map<number, string>();
    for (const c of contratos ?? []) {
      if (
        idsVenta.has(c.id_venta) &&
        (proyectoId == null || infoDeContrato(c.id_contrato)?.idProyecto === proyectoId)
      ) {
        numeroPorContrato.set(c.id_contrato, c.numero_contrato);
      }
    }
    if (numeroPorContrato.size === 0) return { filas: [] as DeudaFila[], saldo: 0 };

    // Cuotas no pagadas de esos contratos.
    const deudas: DeudaFila[] = [];
    for (const cob of cobranzas ?? []) {
      const estado = (cob.estado ?? "").trim().toLowerCase();
      const numero = numeroPorContrato.get(cob.id_contrato);
      if (!numero || estado === "pagada") continue;
      deudas.push({
        id_cobranza: cob.id_cobranza,
        numero_contrato: numero,
        numero_cuota: cob.numero_cuota,
        monto_cuota: cob.monto_cuota,
        estado,
        fecha_vencimiento: cob.fecha_vencimiento ?? null,
      });
    }

    deudas.sort((a, b) =>
      a.numero_contrato === b.numero_contrato
        ? a.numero_cuota - b.numero_cuota
        : a.numero_contrato.localeCompare(b.numero_contrato),
    );

    // Centavos enteros para no arrastrar ruido de flotantes (mismo criterio
    // que CuotasPendientesVenta y CobranzasPage).
    const total = deudas.reduce((s, d) => s + Math.round(d.monto_cuota * 100), 0) / 100;
    return { filas: deudas, saldo: total };
  }, [cliente, ventas, contratos, cobranzas, proyectoId, infoDeContrato]);

  const cargando = open && (loadingVentas || (proyectoId != null && loadingRelaciones));

  // El botón de pago solo aparece en las cuotas que siguen en deuda (la lista
  // ya excluye las pagadas); se repite aquí para que una fila marcada como
  // pagada en otra pestaña no quede con acción disponible.
  const columnas = useMemo<TableColumnType<DeudaFila>[]>(
    () => [
      ...columnasBase,
      {
        title: "Acción",
        key: "accion",
        width: 150,
        render: (_: unknown, fila: DeudaFila) => {
          if (fila.estado === "pagada") return null;
          return (
            <Space size={4}>
              <Tooltip title={!isOnline ? "Sin conexión: no se puede registrar un pago" : undefined}>
                <Button
                  type="primary"
                  size="small"
                  icon={<PayCircleOutlined />}
                  disabled={!isOnline}
                  onClick={() =>
                    setCobranzaAPagar({
                      id_cobranza: fila.id_cobranza,
                      numero_cuota: fila.numero_cuota,
                      monto_cuota: fila.monto_cuota,
                      estado: fila.estado,
                      fecha_vencimiento: fila.fecha_vencimiento,
                      cliente: cliente?.nombres,
                      cedula: cliente?.cedula_ruc,
                      numero_contrato: fila.numero_contrato,
                    })
                  }
                >
                  Pagar
                </Button>
              </Tooltip>
              {puedeEditar && (
                <Tooltip
                  title={
                    isOnline
                      ? "Editar monto o vencimiento"
                      : "Sin conexión: no se puede editar"
                  }
                >
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    disabled={!isOnline}
                    onClick={() =>
                      setCuotaAEditar({
                        id_cobranza: fila.id_cobranza,
                        numero_cuota: fila.numero_cuota,
                        monto_cuota: fila.monto_cuota,
                        fecha_vencimiento: fila.fecha_vencimiento,
                        estado: fila.estado,
                        cliente: cliente?.nombres,
                        cedula: cliente?.cedula_ruc,
                        numero_contrato: fila.numero_contrato,
                        pagado: pagadoPorCobranza.get(fila.id_cobranza) ?? 0,
                      })
                    }
                  />
                </Tooltip>
              )}
            </Space>
          );
        },
      },
      {
        title: "Comprobante",
        key: "comprobante",
        width: 150,
        render: (_: unknown, fila: DeudaFila) => {
          const comprobante = comprobantePorCobranza.get(fila.id_cobranza);
          if (!comprobante) return <Text type="secondary">-</Text>;
          return (
            <Space direction="vertical" size={2}>
              <ComprobanteTag estado={comprobante.estado} />
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto" }}
                icon={<EyeOutlined />}
                onClick={() =>
                  setComprobanteSel({
                    comprobante,
                    contexto: `Contrato ${fila.numero_contrato} · Cuota ${fila.numero_cuota} · ${formatCurrency(fila.monto_cuota)}`,
                  })
                }
              >
                Ver
              </Button>
            </Space>
          );
        },
      },
    ],
    [isOnline, cliente, comprobantePorCobranza, puedeEditar, pagadoPorCobranza],
  );

  return (
    <>
      <Modal
        title="Deudas pendientes"
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Cerrar
          </Button>,
        ]}
        width={900}
      >
        {cliente && (
          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            {cliente.nombres} · {cliente.cedula_ruc}
          </Text>
        )}

        {cargando ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Spin />
          </div>
        ) : filas.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={4}>
                <span>Este cliente no tiene deudas pendientes</span>
                <Text type="secondary">
                  Las cuotas pagadas no se muestran aquí y se conservan en su historial financiero.
                </Text>
              </Space>
            }
            style={{ margin: "24px 0" }}
          />
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text strong>Cuotas por cobrar</Text>
              <Text type="secondary">Saldo pendiente {formatCurrency(saldo)}</Text>
            </div>
            <Table<DeudaFila>
              size="small"
              rowKey="id_cobranza"
              columns={columnas}
              dataSource={filas}
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: 820, y: 280 }}
            />
          </>
        )}
      </Modal>

      <EditarCuotaModal
        open={cuotaAEditar !== null}
        cuota={cuotaAEditar}
        onClose={() => setCuotaAEditar(null)}
      />

      <RegistrarPagoModal
        title="Registrar pago de cuota"
        cobranza={cobranzaAPagar}
        open={cobranzaAPagar !== null}
        onClose={() => setCobranzaAPagar(null)}
      />

      <ModalRevisionComprobante
        comprobante={comprobanteSel?.comprobante ?? null}
        open={comprobanteSel !== null}
        onClose={() => setComprobanteSel(null)}
        contexto={comprobanteSel?.contexto}
      />
    </>
  );
}
