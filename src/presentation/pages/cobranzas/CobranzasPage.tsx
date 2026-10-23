import { useState, useMemo } from "react";
import { Card, Button, Tag, Descriptions, Modal, Row, Col, Statistic, Tooltip, message } from "antd";
import { EyeOutlined, WarningOutlined, ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, FileTextOutlined, SettingOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useCobranzas, useOnlineStatus, useContratos, useLookup, useInfoContratos, useComprobantes, usePagos, useRecibosPorPagos, useDescargarRecibo, useEmitirReciboPagoPrevio } from "@/presentation/hooks";
import { getContainer } from "@/infrastructure/container";
import { useQueryClient } from "@tanstack/react-query";
import { RequiresConnection } from "@/presentation/components/common/RequiresConnection";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { ConfiguracionPagosModal } from "@/presentation/components/pagos";
import { ComprobanteTag } from "@/presentation/components/comprobantes/ComprobanteTag";
import { ModalRevisionComprobante } from "@/presentation/components/comprobantes/ModalRevisionComprobante";
import type { Comprobante } from "@/domain/comprobante/entities";
import { FiltroRangoFechas, FILTRO_FECHAS_INICIAL, type FiltroFechas } from "@/presentation/components/ventas/FiltroRangoFechas";
import { ResumenRangoFechas } from "@/presentation/components/ventas/ResumenRangoFechas";
import { dentroDelRango, diaEnEmpresa, formatDateOnly, formatCurrency } from "@/utils";

type CobranzaRow = {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: "pendiente" | "pagada" | "vencida";
  fecha_vencimiento?: string;
};

const estadoConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pendiente: { color: "orange", icon: <ClockCircleOutlined />, label: "Pendiente" },
  pagada: { color: "green", icon: <CheckCircleOutlined />, label: "Pagada" },
  vencida: { color: "red", icon: <CloseCircleOutlined />, label: "Vencida" },
};

export function CobranzasPage() {
  const { data: cobranzas, isLoading } = useCobranzas();
  const { data: contratos } = useContratos();
  const { data: comprobantes } = useComprobantes();
  const { data: pagos } = usePagos();
  // Recibo de cada cuota: cobranza → pago → recibo persistido.
  const idsPago = useMemo(() => (pagos ?? []).map((p) => p.id_pago), [pagos]);
  const { data: recibos } = useRecibosPorPagos(idsPago);
  const idPagoPorCobranza = useMemo(
    () => new Map((pagos ?? []).map((p) => [p.id_cobranza, p.id_pago])),
    [pagos],
  );
  // True cuando la cuota tiene un recibo ya emitido (nunca se inventa uno).
  const cuotaConRecibo = useMemo(() => {
    const pagosConRecibo = new Set((recibos ?? []).map((r) => r.id_pago));
    return new Set(
      (pagos ?? [])
        .filter((p) => pagosConRecibo.has(p.id_pago))
        .map((p) => p.id_cobranza),
    );
  }, [pagos, recibos]);
  const descargarRecibo = useDescargarRecibo();
  // Cuotas pagadas antes del cambio de recibos: permiten emitirlo acá.
  const emitirRecibo = useEmitirReciboPagoPrevio();
  const contratoMap = useLookup(contratos, "id_contrato", "numero_contrato", "Contrato");
  const { infoDeContrato } = useInfoContratos();
  const [filtroFechas, setFiltroFechas] = useState<FiltroFechas>(FILTRO_FECHAS_INICIAL);
  const isOnline = useOnlineStatus();
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: CobranzaRow | null }>({ visible: false, record: null });
  // Datos fiscales de los recibos por proyecto (Configuración de pagos).
  const [configPagosAbierta, setConfigPagosAbierta] = useState(false);
  const [comprobanteSel, setComprobanteSel] = useState<{
    comprobante: Comprobante;
    contexto: string;
  } | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  // Último comprobante de cada cuota (el más reciente gana), igual que en
  // Clientes -> Deudas: así se ve sin abrir nada si la prueba ya llegó.
  const comprobantePorCobranza = useMemo(() => {
    const mapa = new Map<number, Comprobante>();
    for (const cp of comprobantes ?? []) {
      if (!mapa.has(cp.id_cobranza)) mapa.set(cp.id_cobranza, cp);
    }
    return mapa;
  }, [comprobantes]);

  const handleDetectarVencidas = async () => {
    try {
      const container = getContainer();
      const detectadas = await container.detectarCuotasVencidas.execute();
      await queryClient.invalidateQueries({ queryKey: ["cobranzas"] });
      await queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] });
      messageApi.success(`${detectadas} cuotas marcadas como vencidas`);
    } catch {
      messageApi.error("Error detectando cuotas vencidas");
    }
  };

  // Indicadores sobre las cuotas dentro del rango (mismas formulas que
  // GetCarteraMetricasUseCase); sin filtro equivalen a la cartera completa.
  const m = useMemo(() => {
    const enRango = (cobranzas ?? []).filter((c) => dentroDelRango(c.fecha_vencimiento, filtroFechas.rango));
    const suma = (lista: typeof enRango) => lista.reduce((s, c) => s + Math.round(c.monto_cuota * 100), 0) / 100;
    const pendientes = enRango.filter((c) => c.estado === "pendiente");
    const vencidas = enRango.filter((c) => c.estado === "vencida");
    const activas = pendientes.length + vencidas.length;
    return {
      totalCobranzas: enRango.length,
      pendientes: pendientes.length,
      vencidas: vencidas.length,
      morosidadPorcentaje: activas > 0 ? Math.round((vencidas.length / activas) * 100) : 0,
      montoTotal: suma(enRango),
      montoPendiente: suma(pendientes),
      montoVencido: suma(vencidas),
    };
  }, [cobranzas, filtroFechas]);

  const filteredData = useMemo(() => {
    if (!cobranzas) return [];
    return cobranzas.filter(
      (c) =>
        dentroDelRango(c.fecha_vencimiento, filtroFechas.rango) &&
        (String(c.id_contrato).includes(searchText) ||
        (infoDeContrato(c.id_contrato)?.cliente ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        (infoDeContrato(c.id_contrato)?.lote ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(c.numero_cuota).includes(searchText) ||
        c.estado.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [cobranzas, searchText, infoDeContrato, filtroFechas]);

  const columns: TableColumnType<CobranzaRow>[] = [
    {
      title: "Contrato",
      dataIndex: "id_contrato",
      key: "id_contrato",
      render: (id: number) => contratoMap[id] ?? `Contrato #${id}`,
      sorter: (a, b) => a.id_contrato - b.id_contrato,
    },
    {
      title: "Cliente",
      key: "cliente",
      render: (_: unknown, record: CobranzaRow) => infoDeContrato(record.id_contrato)?.cliente ?? "-",
      sorter: (a, b) =>
        (infoDeContrato(a.id_contrato)?.cliente ?? "").localeCompare(infoDeContrato(b.id_contrato)?.cliente ?? ""),
    },
    {
      title: "Lote",
      key: "lote",
      render: (_: unknown, record: CobranzaRow) => infoDeContrato(record.id_contrato)?.lote ?? "-",
    },
    {
      title: "Cuota",
      dataIndex: "numero_cuota",
      key: "numero_cuota",
      sorter: (a, b) => a.numero_cuota - b.numero_cuota,
    },
    {
      title: "Vencimiento",
      dataIndex: "fecha_vencimiento",
      key: "fecha_vencimiento",
      sorter: (a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""),
      render: (fecha?: string) => (fecha ? formatDateOnly(diaEnEmpresa(fecha)) : "-"),
    },
    {
      title: "Monto",
      dataIndex: "monto_cuota",
      key: "monto_cuota",
      sorter: (a, b) => a.monto_cuota - b.monto_cuota,
      render: (monto: number) => <span style={{ fontWeight: 600 }}>${monto.toLocaleString()}</span>,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: string) => {
        const config = estadoConfig[estado] ?? estadoConfig.pendiente;
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      },
    },
    {
      title: "Comprobante",
      key: "comprobante",
      width: 160,
      render: (_: unknown, record: CobranzaRow) => {
        const comprobante = comprobantePorCobranza.get(record.id_cobranza);
        if (!comprobante) return <span style={{ color: "#bfbfbf" }}>—</span>;
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <ComprobanteTag estado={comprobante.estado} />
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              icon={<EyeOutlined />}
              onClick={() =>
                setComprobanteSel({
                  comprobante,
                  contexto: `Contrato ${contratoMap[record.id_contrato] ?? `#${record.id_contrato}`} · Cuota ${record.numero_cuota} · ${formatCurrency(record.monto_cuota)}`,
                })
              }
            >
              Ver
            </Button>
          </div>
        );
      },
    },
    {
      title: "Recibo",
      key: "recibo",
      width: 110,
      render: (_: unknown, record: CobranzaRow) => {
        const idPago = idPagoPorCobranza.get(record.id_cobranza);
        if (idPago === undefined) return <span style={{ color: "#bfbfbf" }}>—</span>;
        if (cuotaConRecibo.has(record.id_cobranza)) {
          return (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              icon={<FileTextOutlined />}
              loading={descargarRecibo.isPending && descargarRecibo.variables === idPago}
              onClick={() => descargarRecibo.mutate(idPago)}
            >
              Descargar
            </Button>
          );
        }
        // Cuota pagada antes del cambio: se emite su recibo la primera vez.
        return (
          <Tooltip title={isOnline ? undefined : "Sin conexión: no se puede generar el recibo"}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto", color: "#8c8c8c" }}
              icon={<FileTextOutlined />}
              disabled={!isOnline}
              loading={emitirRecibo.isPending && emitirRecibo.variables === idPago}
              onClick={() =>
                emitirRecibo.mutate(idPago, {
                  onSuccess: (recibo) => descargarRecibo.mutate(recibo.id_pago),
                })
              }
            >
              Generar
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_: unknown, record: CobranzaRow) => (
        <Tooltip title="Ver detalle">
          <Button type="text" icon={<EyeOutlined />} style={{ color: "#1677ff" }} onClick={() => setViewModal({ visible: true, record })} />
        </Tooltip>
      ),
    },
  ];

  if (!isOnline && !isLoading && !cobranzas) {
    return <RequiresConnection />;
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Cobranzas"
        subtitle="Control de cuotas y morosidad"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar cobranza..." }}
        extra={<FiltroRangoFechas value={filtroFechas} onChange={setFiltroFechas} />}
        actions={
          <>
            <Button icon={<SettingOutlined />} onClick={() => setConfigPagosAbierta(true)}>
              Configuración de recibos
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleDetectarVencidas}>Detectar Vencidas</Button>
          </>
        }
      />

      <ResumenRangoFechas filtro={filtroFechas} cantidad={filteredData.length} singular="cuota" plural="cuotas" />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Cuotas</span>} value={m.totalCobranzas} styles={{ content: { fontWeight: 700, fontSize: 22 } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Pendientes</span>} value={m.pendientes} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#faad14" } }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffccc7" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Vencidas</span>} value={m.vencidas} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#ff4d4f" } }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Morosidad</span>} value={m.morosidadPorcentaje} styles={{ content: { fontWeight: 700, fontSize: 18, color: (m.morosidadPorcentaje) > 20 ? "#ff4d4f" : "#52c41a" } }} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Total Cartera</span>} value={m.montoTotal} styles={{ content: { fontWeight: 700, fontSize: 16 } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Pendiente</span>} value={m.montoPendiente} styles={{ content: { fontWeight: 700, fontSize: 16, color: "#faad14" } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Vencido</span>} value={m.montoVencido} styles={{ content: { fontWeight: 700, fontSize: 16, color: "#ff4d4f" } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
      </Row>

      <DataTable<CobranzaRow>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_cobranza"
        loading={isLoading}
      />

      <Modal title="Detalle de Cobranza" open={viewModal.visible} onCancel={() => setViewModal({ visible: false, record: null })} footer={[<Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>Cerrar</Button>]} width={500}>
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Cobranza">{viewModal.record.id_cobranza}</Descriptions.Item>
            <Descriptions.Item label="Estado"><Tag color={estadoConfig[viewModal.record.estado]?.color}>{estadoConfig[viewModal.record.estado]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Cliente" span={2}>{infoDeContrato(viewModal.record.id_contrato)?.cliente ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Lote" span={2}>{infoDeContrato(viewModal.record.id_contrato)?.lote ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Contrato">#{viewModal.record.id_contrato}</Descriptions.Item>
            <Descriptions.Item label="Cuota">#{viewModal.record.numero_cuota}</Descriptions.Item>
            <Descriptions.Item label="Vencimiento" span={2}>{viewModal.record.fecha_vencimiento ? formatDateOnly(diaEnEmpresa(viewModal.record.fecha_vencimiento)) : "-"}</Descriptions.Item>
            <Descriptions.Item label="Monto" span={2}><span style={{ fontWeight: 700, fontSize: 18 }}>${viewModal.record.monto_cuota.toLocaleString()}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <ModalRevisionComprobante
        comprobante={comprobanteSel?.comprobante ?? null}
        open={comprobanteSel !== null}
        onClose={() => setComprobanteSel(null)}
        contexto={comprobanteSel?.contexto}
      />

      <ConfiguracionPagosModal
        open={configPagosAbierta}
        onClose={() => setConfigPagosAbierta(false)}
      />
    </div>
  );
}
