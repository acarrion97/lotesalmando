import { useState, useMemo } from "react";
import { Card, Button, Tag, Descriptions, Modal, Row, Col, Statistic, Tooltip, Space } from "antd";
import { PlusOutlined, EyeOutlined, DollarOutlined, FileTextOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import {
  usePagos,
  useOnlineStatus,
  useCobranzas,
  useContratos,
  useLookup,
  useInfoContratos,
  useRecibosPorPagos,
  useDescargarRecibo,
  useEmitirReciboPagoPrevio,
  useProyectos,
} from "@/presentation/hooks";
import { RegistrarPagoModal, type CobranzaAPagar } from "@/presentation/components/pagos";
import { RequiresConnection } from "@/presentation/components/common/RequiresConnection";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { FiltroProyecto } from "@/presentation/components/common/FiltroProyecto";
import {
  FiltroRangoFechas,
  FILTRO_FECHAS_INICIAL,
  type FiltroFechas,
} from "@/presentation/components/ventas/FiltroRangoFechas";
import { ResumenRangoFechas } from "@/presentation/components/ventas/ResumenRangoFechas";
import { dentroDelRango, diaEnEmpresa, formatDateOnly } from "@/utils";

type PagoRow = {
  id_pago: number;
  id_cobranza: number;
  id_usuario: number;
  monto_pagado: number;
  fecha_pago: string;
};

export function PagosPage() {
  const { data: pagos, isLoading } = usePagos();
  const { data: cobranzas } = useCobranzas();
  const { data: contratos } = useContratos();
  // Recibos ya emitidos: solo los pagos con recibo ofrecen la descarga.
  const idsPago = useMemo(() => (pagos ?? []).map((p) => p.id_pago), [pagos]);
  const { data: recibos } = useRecibosPorPagos(idsPago);
  const reciboPorPago = useMemo(
    () => new Map((recibos ?? []).map((r) => [r.id_pago, r])),
    [recibos],
  );
  const descargarRecibo = useDescargarRecibo();
  // Pagos antiguos sin recibo: permiten emitirlo desde la lista.
  const emitirRecibo = useEmitirReciboPagoPrevio();
  const cobranzaMap = useLookup(cobranzas, "id_cobranza", "numero_cuota", "Cobranza");
  const contratoMap = useLookup(contratos, "id_contrato", "numero_contrato", "Contrato");
  const { infoDeCobranza, isLoading: loadingRelaciones } = useInfoContratos();
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  const [filtroFechas, setFiltroFechas] = useState<FiltroFechas>(FILTRO_FECHAS_INICIAL);
  const [proyectoFilter, setProyectoFilter] = useState<number | null>(null);
  const isOnline = useOnlineStatus();
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: PagoRow | null }>({
    visible: false,
    record: null,
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const pagosEnRango = useMemo(
    () =>
      (pagos ?? []).filter(
        (p) =>
          (proyectoFilter === null ||
            infoDeCobranza(p.id_cobranza)?.idProyecto === proyectoFilter) &&
          dentroDelRango(p.fecha_pago, filtroFechas.rango),
      ),
    [pagos, filtroFechas, infoDeCobranza, proyectoFilter],
  );

  const stats = useMemo(
    () => ({
      total: pagosEnRango.length,
      // Centavos enteros para que los flotantes no ensucien el total.
      montoTotal: pagosEnRango.reduce((sum, p) => sum + Math.round(p.monto_pagado * 100), 0) / 100,
    }),
    [pagosEnRango],
  );

  // Cuotas cobrables con su cliente resuelto: es lo que alimenta el selector
  // del modal de registro (así se ve de quién es cada cobranza).
  const cobranzasAPagar = useMemo<CobranzaAPagar[]>(
    () =>
      (cobranzas ?? [])
        .filter((c) => c.estado !== "pagada")
        .map((c) => {
          const info = infoDeCobranza(c.id_cobranza);
          return {
            id_cobranza: c.id_cobranza,
            numero_cuota: c.numero_cuota,
            monto_cuota: c.monto_cuota,
            estado: c.estado,
            fecha_vencimiento: c.fecha_vencimiento ?? null,
            cliente: info?.cliente,
            cedula: info?.cedula,
            lote: info?.lote,
            numero_contrato: contratoMap[c.id_contrato] ?? `Contrato #${c.id_contrato}`,
          };
        }),
    [cobranzas, infoDeCobranza, contratoMap],
  );

  const filteredData = useMemo(() => {
    return pagosEnRango.filter(
      (p) =>
        String(p.id_cobranza).includes(searchText) ||
        (infoDeCobranza(p.id_cobranza)?.cliente ?? "")
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        (infoDeCobranza(p.id_cobranza)?.lote ?? "")
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        String(p.monto_pagado).includes(searchText) ||
        p.fecha_pago.includes(searchText),
    );
  }, [pagosEnRango, searchText, infoDeCobranza]);

  const columns: TableColumnType<PagoRow>[] = [
    {
      title: "# Pago",
      dataIndex: "id_pago",
      key: "id_pago",
      sorter: (a, b) => a.id_pago - b.id_pago,
    },
    {
      title: "Cobranza",
      dataIndex: "id_cobranza",
      key: "id_cobranza",
      sorter: (a, b) => a.id_cobranza - b.id_cobranza,
      // Bajo la cuota, el cliente al que pertenece: es lo que responde
      // "de quién es esta cobranza" sin tener que mirar otra columna.
      render: (id: number, record: PagoRow) => (
        <div>
          <Tag>{cobranzaMap[id] ? `Cuota ${cobranzaMap[id]}` : `Cobranza #${id}`}</Tag>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
            {infoDeCobranza(record.id_cobranza)?.cliente ?? "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Cliente",
      key: "cliente",
      render: (_: unknown, record: PagoRow) => infoDeCobranza(record.id_cobranza)?.cliente ?? "-",
      sorter: (a, b) =>
        (infoDeCobranza(a.id_cobranza)?.cliente ?? "").localeCompare(
          infoDeCobranza(b.id_cobranza)?.cliente ?? "",
        ),
    },
    {
      title: "Lote",
      key: "lote",
      render: (_: unknown, record: PagoRow) => infoDeCobranza(record.id_cobranza)?.lote ?? "-",
    },
    {
      title: "Monto Pagado",
      dataIndex: "monto_pagado",
      key: "monto_pagado",
      sorter: (a, b) => a.monto_pagado - b.monto_pagado,
      render: (monto: number) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>${monto.toLocaleString()}</span>
      ),
    },
    {
      title: "Fecha",
      dataIndex: "fecha_pago",
      key: "fecha_pago",
      sorter: (a, b) => a.fecha_pago.localeCompare(b.fecha_pago),
      render: (fecha: string) => (fecha ? formatDateOnly(diaEnEmpresa(fecha)) : "-"),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_: unknown, record: PagoRow) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            style={{ color: "#1677ff" }}
            onClick={() => setViewModal({ visible: true, record })}
          />
          {/* Con recibo se descarga; un pago anterior al cambio lo tiene sin
              recibo y ofrece emitirlo (primera emisión, reserva número). */}
          {reciboPorPago.has(record.id_pago) ? (
            <Tooltip title="Descargar recibo">
              <Button
                type="text"
                icon={<FileTextOutlined />}
                loading={descargarRecibo.isPending && descargarRecibo.variables === record.id_pago}
                style={{ color: "#d4380d" }}
                onClick={() => descargarRecibo.mutate(record.id_pago)}
              />
            </Tooltip>
          ) : (
            <Tooltip title={isOnline ? "Generar recibo" : "Sin conexión: no se puede generar el recibo"}>
              <Button
                type="text"
                icon={<FileTextOutlined />}
                disabled={!isOnline}
                loading={emitirRecibo.isPending && emitirRecibo.variables === record.id_pago}
                style={{ color: "#8c8c8c" }}
                onClick={() =>
                  emitirRecibo.mutate(record.id_pago, {
                    onSuccess: (recibo) => descargarRecibo.mutate(recibo.id_pago),
                  })
                }
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (!isOnline && !isLoading && !pagos) {
    return <RequiresConnection />;
  }

  return (
    <div>
      <PageToolbar
        title="Pagos"
        subtitle="Registro de pagos recibidos"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar pago..." }}
        extra={
          <>
            <FiltroProyecto
              value={proyectoFilter}
              onChange={setProyectoFilter}
              options={(proyectos ?? []).map((p) => ({ value: p.id_proyecto, label: p.nombre }))}
              loading={loadingProyectos}
            />
            <FiltroRangoFechas value={filtroFechas} onChange={setFiltroFechas} />
          </>
        }
        actions={
          <Tooltip title={!isOnline ? "Sin conexión: no se puede registrar un pago" : undefined}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!isOnline}
              onClick={() => setCreateModalOpen(true)}
            >
              Registrar Pago
            </Button>
          </Tooltip>
        }
      />

      <ResumenRangoFechas
        filtro={filtroFechas}
        cantidad={stats.total}
        singular="pago"
        plural="pagos"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total Pagos</span>}
              value={stats.total}
              styles={{ content: { fontWeight: 700, fontSize: 22 } }}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Monto Total Recibido</span>}
              value={stats.montoTotal}
              styles={{ content: { fontWeight: 700, fontSize: 18, color: "#52c41a" } }}
              formatter={(val) => `$${(val as number).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <DataTable<PagoRow>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_pago"
        loading={isLoading || (proyectoFilter !== null && (loadingRelaciones || loadingProyectos))}
      />

      {/* View Modal */}
      <Modal
        title="Detalle del Pago"
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, record: null })}
        footer={[
          viewModal.record && !reciboPorPago.has(viewModal.record.id_pago) ? (
            <Button
              key="recibo"
              icon={<FileTextOutlined />}
              disabled={!isOnline}
              loading={
                emitirRecibo.isPending &&
                viewModal.record !== null &&
                emitirRecibo.variables === viewModal.record.id_pago
              }
              onClick={() =>
                viewModal.record &&
                emitirRecibo.mutate(viewModal.record.id_pago, {
                  onSuccess: (recibo) => descargarRecibo.mutate(recibo.id_pago),
                })
              }
            >
              Generar recibo
            </Button>
          ) : (
            <Button
              key="recibo"
              icon={<FileTextOutlined />}
              disabled={!viewModal.record || !reciboPorPago.has(viewModal.record.id_pago)}
              loading={
                descargarRecibo.isPending &&
                viewModal.record !== null &&
                descargarRecibo.variables === viewModal.record.id_pago
              }
              onClick={() => viewModal.record && descargarRecibo.mutate(viewModal.record.id_pago)}
            >
              Descargar recibo
            </Button>
          ),
          <Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>
            Cerrar
          </Button>,
        ]}
        width={500}
      >
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Pago">{viewModal.record.id_pago}</Descriptions.Item>
            <Descriptions.Item label="Cobranza">
              <Tag>#{viewModal.record.id_cobranza}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Cliente" span={2}>
              {infoDeCobranza(viewModal.record.id_cobranza)?.cliente ?? "-"}
              {infoDeCobranza(viewModal.record.id_cobranza)?.cedula
                ? ` · ${infoDeCobranza(viewModal.record.id_cobranza)?.cedula}`
                : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Lote" span={2}>
              {infoDeCobranza(viewModal.record.id_cobranza)?.lote ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Monto Pagado">
              <span style={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }}>
                ${viewModal.record.monto_pagado.toLocaleString()}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {viewModal.record.fecha_pago
                ? formatDateOnly(diaEnEmpresa(viewModal.record.fecha_pago))
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Registrar pago: selector de cuota con el cliente de cada cobranza */}
      <RegistrarPagoModal
        open={createModalOpen}
        opciones={cobranzasAPagar}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
