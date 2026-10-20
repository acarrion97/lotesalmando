import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Tag,
  Descriptions,
  Modal,
  Row,
  Col,
  Space,
  Statistic,
  Tooltip,
  Typography,
} from "antd";
import { EyeOutlined, FileTextOutlined, FilePdfOutlined, FileWordOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";

const { Text } = Typography;
import { useContratos, useCotizaciones, useVentas, useInfoContratos } from "@/presentation/hooks";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { DocumentoContratoModal } from "@/presentation/components/contratos/DocumentoContratoModal";
import { FiltroRangoFechas, FILTRO_FECHAS_INICIAL, type FiltroFechas } from "@/presentation/components/ventas/FiltroRangoFechas";
import { ResumenRangoFechas } from "@/presentation/components/ventas/ResumenRangoFechas";
import { dentroDelRango, diaEnEmpresa, formatCurrency, formatDateOnly } from "@/utils";

type ContratoRow = {
  id_contrato: number;
  id_venta: number;
  numero_contrato: string;
  monto_total: number;
  documento_url?: string | null;
  documento_tipo?: string | null;
  documento_origen?: string | null;
};

export function ContratosPage() {
  const { data: contratos, isLoading } = useContratos();
  const { data: ventas } = useVentas();
  const { data: cotizaciones } = useCotizaciones();
  const { infoDeContrato } = useInfoContratos();
  const [filtroFechas, setFiltroFechas] = useState<FiltroFechas>(FILTRO_FECHAS_INICIAL);
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: ContratoRow | null }>({
    visible: false,
    record: null,
  });
  const [documentoModal, setDocumentoModal] = useState<{ visible: boolean; id: number | null }>({
    visible: false,
    id: null,
  });

  // Contrato -> venta -> cotización: la entrada y las condiciones de pago viven
  // en la cotización, no en el contrato (spec cotizaciones/plan-de-pago).
  const financiamientoDeVenta = useMemo(() => {
    const mapa = new Map<number, { monto_entrada: number; num_cuotas: number } | null>();
    for (const venta of ventas ?? []) {
      const cotizacion = cotizaciones?.find((c) => c.id_cotizacion === venta.id_cotizacion);
      mapa.set(
        venta.id_venta,
        cotizacion
          ? {
              monto_entrada: cotizacion.monto_entrada ?? 0,
              num_cuotas: cotizacion.num_cuotas ?? 12,
            }
          : null,
      );
    }
    return mapa;
  }, [ventas, cotizaciones]);

  // El contrato no guarda una fecha propia confiable: se usa la de su venta.
  const contratosEnRango = useMemo(
    () => (contratos ?? []).filter((c) => dentroDelRango(infoDeContrato(c.id_contrato)?.fechaVenta, filtroFechas.rango)),
    [contratos, infoDeContrato, filtroFechas],
  );

  const stats = useMemo(
    () => ({
      total: contratosEnRango.length,
      // Centavos enteros para que los flotantes no ensucien el total.
      montoTotal: contratosEnRango.reduce((sum, c) => sum + Math.round(c.monto_total * 100), 0) / 100,
    }),
    [contratosEnRango],
  );

  const filteredData = useMemo(() => {
    return contratosEnRango.filter(
      (c) =>
        c.numero_contrato.toLowerCase().includes(searchText.toLowerCase()) ||
        (infoDeContrato(c.id_contrato)?.cliente ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        (infoDeContrato(c.id_contrato)?.lote ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(c.id_venta).includes(searchText),
    );
  }, [contratosEnRango, searchText, infoDeContrato]);

  const contratoDetalle = viewModal.record;
  const financiamientoDetalle = contratoDetalle
    ? financiamientoDeVenta.get(contratoDetalle.id_venta)
    : undefined;
  const entradaDetalle = financiamientoDetalle?.monto_entrada ?? null;
  const financiadoDetalle =
    contratoDetalle !== null && entradaDetalle !== null
      ? contratoDetalle.monto_total - entradaDetalle
      : null;

  const columns: TableColumnType<ContratoRow>[] = [
    {
      title: "# Contrato",
      dataIndex: "numero_contrato",
      key: "numero_contrato",
      sorter: (a, b) => a.numero_contrato.localeCompare(b.numero_contrato),
      render: (text: string) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: "Cliente",
      key: "cliente",
      render: (_: unknown, record: ContratoRow) => infoDeContrato(record.id_contrato)?.cliente ?? "-",
      sorter: (a, b) =>
        (infoDeContrato(a.id_contrato)?.cliente ?? "").localeCompare(infoDeContrato(b.id_contrato)?.cliente ?? ""),
    },
    {
      title: "Lote",
      key: "lote",
      render: (_: unknown, record: ContratoRow) => infoDeContrato(record.id_contrato)?.lote ?? "-",
    },
    {
      title: "Fecha de venta",
      key: "fecha_venta",
      sorter: (a, b) =>
        (infoDeContrato(a.id_contrato)?.fechaVenta ?? "").localeCompare(infoDeContrato(b.id_contrato)?.fechaVenta ?? ""),
      render: (_: unknown, record: ContratoRow) => {
        const fecha = infoDeContrato(record.id_contrato)?.fechaVenta;
        return fecha ? formatDateOnly(diaEnEmpresa(fecha)) : "-";
      },
    },
    {
      title: "Venta",
      dataIndex: "id_venta",
      key: "id_venta",
      render: (id: number) => `Venta #${id}`,
      sorter: (a, b) => a.id_venta - b.id_venta,
    },
    {
      title: "Monto Total",
      dataIndex: "monto_total",
      key: "monto_total",
      sorter: (a, b) => a.monto_total - b.monto_total,
      render: (val: number) => <span style={{ fontWeight: 600 }}>${val.toLocaleString()}</span>,
    },
    {
      title: "Documento",
      key: "documento",
      render: (_: unknown, record: ContratoRow) => (
        <Space direction="vertical" size={2}>
          {record.documento_url ? (
            <Space size={4}>
              {record.documento_tipo === "pdf" ? (
                <FilePdfOutlined style={{ color: "#cf1322" }} />
              ) : (
                <FileWordOutlined style={{ color: "#1677ff" }} />
              )}
              <Tag color={record.documento_origen === "generado" ? "green" : "purple"}>
                {record.documento_origen === "generado" ? "Generado" : "Anexado"}
              </Tag>
            </Space>
          ) : (
            <Text type="secondary">Sin documento</Text>
          )}
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: "auto" }}
            onClick={() => setDocumentoModal({ visible: true, id: record.id_contrato })}
          >
            {record.documento_url ? "Administrar" : "Generar o anexar"}
          </Button>
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_: unknown, record: ContratoRow) => (
        <Tooltip title="Ver detalle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            style={{ color: "#1677ff" }}
            onClick={() => setViewModal({ visible: true, record })}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Contratos"
        subtitle="Contratos generados automaticamente al crear ventas"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar contrato..." }}
        extra={<FiltroRangoFechas value={filtroFechas} onChange={setFiltroFechas} />}
      />

      <ResumenRangoFechas filtro={filtroFechas} cantidad={stats.total} singular="contrato" plural="contratos" />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total Contratos</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
              prefix={<FileTextOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Monto Total</span>}
              value={stats.montoTotal}
              valueStyle={{ fontWeight: 700, fontSize: 18 }}
              formatter={(val) => `$${(val as number).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <DataTable<ContratoRow>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_contrato"
        loading={isLoading}
      />

      <Modal
        title="Detalle de Contrato"
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, record: null })}
        footer={[
          <Button key="documento" onClick={() => setDocumentoModal({ visible: true, id: viewModal.record?.id_contrato ?? null })}>
            Documento
          </Button>,
          <Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>
            Cerrar
          </Button>,
        ]}
        width={500}
      >
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Contrato">
              <Tag color="blue">{viewModal.record.numero_contrato}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="# Venta">{viewModal.record.id_venta}</Descriptions.Item>
            <Descriptions.Item label="Cliente" span={2}>{infoDeContrato(viewModal.record.id_contrato)?.cliente ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Lote" span={2}>{infoDeContrato(viewModal.record.id_contrato)?.lote ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Monto Total" span={2}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                ${viewModal.record.monto_total.toLocaleString()}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Entrada" span={2}>
              {entradaDetalle !== null ? (
                formatCurrency(entradaDetalle)
              ) : (
                <Text type="secondary">Sin cotización asociada</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Monto financiado" span={2}>
              {financiadoDetalle !== null ? (
                <span style={{ fontWeight: 600 }}>{formatCurrency(financiadoDetalle)}</span>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Descriptions.Item>
            {financiamientoDetalle && (
              <Descriptions.Item label="Número de cuotas" span={2}>
                {financiamientoDetalle.num_cuotas}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <DocumentoContratoModal
        contratoId={documentoModal.id}
        open={documentoModal.visible}
        onClose={() => setDocumentoModal({ visible: false, id: null })}
      />
    </div>
  );
}
