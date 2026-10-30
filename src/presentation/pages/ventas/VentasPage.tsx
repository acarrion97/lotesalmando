import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Descriptions,
  Row,
  Col,
  Statistic,
  Tooltip,
} from "antd";
import {
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import {
  useVentas,
  useClientes,
  useLotes,
  useManzanas,
  useUsuarios,
  useAsesores,
  useLookup,
  useContratos,
  useDescargarDocumentoContrato,
  useEtapas,
  useProyectos,
} from "@/presentation/hooks";
import type { Venta, VentaEstado } from "@/domain/venta/entities/Venta";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { FiltroProyecto } from "@/presentation/components/common/FiltroProyecto";
import { crearMapaProyectoPorLote } from "@/presentation/utils/proyectos";
import {
  FiltroRangoFechas,
  FILTRO_FECHAS_INICIAL,
  type FiltroFechas,
} from "@/presentation/components/ventas/FiltroRangoFechas";
import { dentroDelRango, diaEnEmpresa, formatCurrency, formatDateOnly } from "@/utils";
import { useEmpresa } from "@/presentation/providers";
import { CuotasPendientesVenta } from "./CuotasPendientesVenta";

const { Title, Text } = Typography;

const estadoConfig: Record<VentaEstado, { color: string; label: string; icon: React.ReactNode }> = {
  pendiente: { color: "processing", label: "PENDIENTE", icon: <ClockCircleOutlined /> },
  completada: { color: "success", label: "COMPLETADA", icon: <CheckCircleOutlined /> },
  cancelada: { color: "error", label: "CANCELADA", icon: <StopOutlined /> },
};

type EstadoConfig = (typeof estadoConfig)[VentaEstado];

/** Valor del filtro por asesor para las ventas que no tienen ninguno. */
const FILTRO_SIN_ASESOR = "sin-asesor";

/**
 * `ventas.estado` es VARCHAR(50) sin CHECK en la BD y la importación de
 * archivos acepta texto libre, así que puede llegar un valor fuera del catálogo
 * (ej. "Confirmada") o null. Se normaliza a minúsculas y, si no está en el
 * catálogo, se muestra el valor crudo en lugar de romper el render.
 */
function configDeEstado(estado?: string | null): EstadoConfig {
  const clave = (estado ?? "").trim().toLowerCase() as VentaEstado;
  const conocida = estadoConfig[clave];
  if (conocida) return conocida;

  const crudo = (estado ?? "").trim();
  return {
    color: "default",
    label: crudo ? crudo.toUpperCase() : "SIN ESTADO",
    icon: <InfoCircleOutlined />,
  };
}

/** Clave canónica del estado, para búsqueda, filtros y conteos. */
function claveEstado(estado?: string | null): string {
  return (estado ?? "").trim().toLowerCase();
}

interface ModalState {
  type: "view" | "info" | null;
  visible: boolean;
  record: Venta | null;
}

export function VentasPage() {
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const { data: ventas, isLoading } = useVentas();
  const { data: clientes } = useClientes(empresaId);
  const { data: lotes, isLoading: loadingLotes } = useLotes();
  const { data: usuarios } = useUsuarios();
  const clienteMap = useLookup(clientes, "id_cliente", "nombres", "Cliente");
  const { data: manzanas, isLoading: loadingManzanas } = useManzanas();
  const { data: etapas, isLoading: loadingEtapas } = useEtapas();
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  // Etiqueta del lote: si el numero ya trae letras (H3, L1.7) basta con el; si es
  // solo numerico (3) se antepone el nombre de la manzana para ubicarlo.
  const loteEtiqueta = useMemo(() => {
    const nombreManzana = Object.fromEntries((manzanas ?? []).map((m) => [m.id_manzana, m.nombre_codigo]));
    return Object.fromEntries(
      (lotes ?? []).map((l) => {
        const numero = String(l.numero_lote ?? "").trim();
        const manzana = nombreManzana[l.id_manzana];
        const etiqueta = /[A-Za-z]/.test(numero) || !manzana ? numero : `${manzana} - ${numero}`;
        return [l.id_lote, etiqueta || `Lote #${l.id_lote}`];
      }),
    ) as Record<number, string>;
  }, [lotes, manzanas]);
  const usuarioMap = useLookup(usuarios, "id_usuario", "nombres", "Usuario");
  const { data: asesores } = useAsesores();
  const asesorMap = useLookup(asesores, "id_asesor", "nombre_comercial", "Asesor");

  // El contrato de la venta: sirve para ofrecer su documento (el que generó
  // la app o el que anexó un usuario) sin salir del módulo de Ventas.
  const { data: contratos } = useContratos();
  const contratoPorVenta = useMemo(
    () => new Map((contratos ?? []).map((c) => [c.id_venta, c])),
    [contratos],
  );
  const descargarContrato = useDescargarDocumentoContrato();

  // Quién vendió el lote: distinto del usuario que registró la venta.
  // Si la venta no tiene asesor, o el asesor ya no existe, se muestra el respaldo.
  const nombreAsesor = (idAsesor?: number | null) =>
    (idAsesor ? asesorMap[idAsesor] : undefined) ?? "Sin asesor";
  const [searchText, setSearchText] = useState("");
  const [proyectoFilter, setProyectoFilter] = useState<number | null>(null);
  const [filtroFechas, setFiltroFechas] = useState<FiltroFechas>(FILTRO_FECHAS_INICIAL);
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    visible: false,
    record: null,
  });

  const proyectoPorLote = useMemo(
    () => crearMapaProyectoPorLote(lotes, manzanas, etapas),
    [lotes, manzanas, etapas],
  );

  // Búsqueda + filtro de fechas: todo en cliente, sobre la lista (o su caché),
  // por lo que sigue funcionando sin conexión.
  const filteredData = useMemo(() => {
    if (!ventas) return [];
    const texto = searchText.trim().toLowerCase();
    return ventas.filter(
      (v) =>
        (proyectoFilter === null || proyectoPorLote.get(v.id_lote) === proyectoFilter) &&
        dentroDelRango(v.created_at, filtroFechas.rango) &&
        (texto === "" ||
          claveEstado(v.estado).includes(texto) ||
          String(v.precio_final).includes(texto)),
    );
  }, [ventas, searchText, filtroFechas, proyectoFilter, proyectoPorLote]);

  // Los indicadores derivan de la lista ya filtrada, así que reflejan el rango.
  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      pendiente: filteredData.filter((v) => claveEstado(v.estado) === "pendiente").length,
      completada: filteredData.filter((v) => claveEstado(v.estado) === "completada").length,
      cancelada: filteredData.filter((v) => claveEstado(v.estado) === "cancelada").length,
      // Se suma en centavos enteros para que los flotantes no ensucien el total.
      valorTotal: filteredData.reduce((sum, v) => sum + Math.round(v.precio_final * 100), 0) / 100,
    };
  }, [filteredData]);

  // Contrato de la venta abierta en el detalle.
  const contratoDetalle = modalState.record
    ? contratoPorVenta.get(modalState.record.id_venta)
    : undefined;

  const columns: TableColumnType<Venta>[] = [
    {
      title: "ID",
      dataIndex: "id_venta",
      key: "id_venta",
      width: 80,
      sorter: (a, b) => a.id_venta - b.id_venta,
    },
    {
      title: "Cliente",
      dataIndex: "id_cliente",
      key: "id_cliente",
      render: (id: number) => (
        <span style={{ fontWeight: 500 }}>{clienteMap[id] ?? `Cliente #${id}`}</span>
      ),
    },
    {
      title: "Lote",
      dataIndex: "id_lote",
      key: "id_lote",
      render: (id: number) => <Tag>{loteEtiqueta[id] ?? `Lote #${id}`}</Tag>,
    },
    {
      title: "Asesor",
      key: "asesor",
      filters: [
        ...(asesores ?? []).map((a) => ({ text: a.nombre_comercial, value: a.id_asesor })),
        { text: "Sin asesor", value: FILTRO_SIN_ASESOR },
      ],
      onFilter: (value: unknown, record: Venta) =>
        value === FILTRO_SIN_ASESOR
          ? !record.id_asesor
          : record.id_asesor === (value as number),
      sorter: (a, b) => nombreAsesor(a.id_asesor).localeCompare(nombreAsesor(b.id_asesor)),
      render: (_: unknown, record: Venta) => {
        const nombre = nombreAsesor(record.id_asesor);
        return nombre === "Sin asesor" ? (
          <Text type="secondary">{nombre}</Text>
        ) : (
          <span>{nombre}</span>
        );
      },
    },
    {
      title: "Precio Final",
      dataIndex: "precio_final",
      key: "precio_final",
      sorter: (a, b) => a.precio_final - b.precio_final,
      render: (precio: number) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>{formatCurrency(precio)}</span>
      ),
    },
    {
      title: "Fecha",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      sorter: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      render: (fecha?: string) => {
        const dia = fecha ? diaEnEmpresa(fecha) : "";
        return dia ? formatDateOnly(dia) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => claveEstado(record.estado) === value,
      render: (estado?: string) => {
        const config = configDeEstado(estado);
        return (
          <Tag
            color={config.color}
            icon={config.icon}
            style={{ fontWeight: 600, borderRadius: 12 }}
          >
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "Contrato",
      key: "contrato",
      render: (_: unknown, record: Venta) => {
        const contrato = contratoPorVenta.get(record.id_venta);
        if (!contrato) return <Text type="secondary">-</Text>;
        if (!contrato.documento_url) {
          return (
            <Space direction="vertical" size={2}>
              <Tag color="blue">{contrato.numero_contrato}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Sin documento
              </Text>
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={2}>
            <Space size={4}>
              {contrato.documento_tipo === "pdf" ? (
                <FilePdfOutlined style={{ color: "#cf1322" }} />
              ) : (
                <FileWordOutlined style={{ color: "#1677ff" }} />
              )}
              <Tag color={contrato.documento_origen === "generado" ? "green" : "purple"}>
                {contrato.documento_origen === "generado" ? "Generado" : "Anexado"}
              </Tag>
            </Space>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              icon={<DownloadOutlined />}
              loading={
                descargarContrato.isPending &&
                descargarContrato.variables === contrato.id_contrato
              }
              onClick={() => descargarContrato.mutate(contrato.id_contrato)}
            >
              Descargar
            </Button>
          </Space>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => setModalState({ type: "view", visible: true, record })}
              style={{ color: "#1677ff" }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Ventas"
        subtitle="Registro de ventas realizadas"
        search={{ value: searchText, onChange: setSearchText }}
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalState({ type: "info", visible: true, record: null })}
          >
            Nueva Venta
          </Button>
        }
      />

      {(filtroFechas.rango.desde || filtroFechas.rango.hasta) && (
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          Período: {filtroFechas.rango.desde ? formatDateOnly(filtroFechas.rango.desde) : "…"} —{" "}
          {filtroFechas.rango.hasta ? formatDateOnly(filtroFechas.rango.hasta) : "…"}
          {" · "}
          {stats.total} venta{stats.total === 1 ? "" : "s"} en el rango
        </Text>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total Ventas</span>}
              value={stats.total}
              styles={{ content: { fontWeight: 700, fontSize: 24 } }}
              prefix={<DollarOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Completadas</span>}
              value={stats.completada}
              styles={{ content: { fontWeight: 700, fontSize: 24, color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #91caff" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Pendientes</span>}
              value={stats.pendiente}
              styles={{ content: { fontWeight: 700, fontSize: 24, color: "#1677ff" } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #f0f0f0" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Valor Total</span>}
              value={stats.valorTotal}
              precision={2}
              styles={{ content: { fontWeight: 700, fontSize: 24, color: "#262626" } }}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>

      <DataTable<Venta>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_venta"
        loading={
          isLoading ||
          (proyectoFilter !== null && (loadingLotes || loadingManzanas || loadingEtapas || loadingProyectos))
        }
      />

      <Modal
        title={modalState.type === "view" ? "Detalle de Venta" : "Nueva Venta"}
        open={modalState.visible}
        onCancel={() => setModalState({ type: null, visible: false, record: null })}
        footer={
          modalState.type === "view"
            ? [
                <Button
                  key="close"
                  onClick={() => setModalState({ type: null, visible: false, record: null })}
                >
                  Cerrar
                </Button>,
              ]
            : null
        }
        width={600}
      >
        {modalState.type === "view" && modalState.record ? (
          <>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{modalState.record.id_venta}</Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {modalState.record.created_at
                ? formatDateOnly(diaEnEmpresa(modalState.record.created_at))
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Cliente">
              {clienteMap[modalState.record.id_cliente] ??
                `Cliente #${modalState.record.id_cliente}`}
            </Descriptions.Item>
            <Descriptions.Item label="Lote">
              {loteEtiqueta[modalState.record.id_lote] ?? `Lote #${modalState.record.id_lote}`}
            </Descriptions.Item>
            <Descriptions.Item label="Cotizacion">
              Cotizacion #{modalState.record.id_cotizacion}
            </Descriptions.Item>
            <Descriptions.Item label="Asesor">{nombreAsesor(modalState.record.id_asesor)}</Descriptions.Item>
            <Descriptions.Item label="Usuario">
              {usuarioMap[modalState.record.id_usuario] ??
                `Usuario #${modalState.record.id_usuario}`}
            </Descriptions.Item>
            <Descriptions.Item label="Precio Final">
              {formatCurrency(modalState.record.precio_final)}
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={configDeEstado(modalState.record.estado).color}>
                {configDeEstado(modalState.record.estado).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Contrato">
              {contratoDetalle ? (
                <Space direction="vertical" size={2}>
                  <Space>
                    <Tag color="blue">{contratoDetalle.numero_contrato}</Tag>
                    {contratoDetalle.documento_url ? (
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        loading={
                          descargarContrato.isPending &&
                          descargarContrato.variables === contratoDetalle.id_contrato
                        }
                        onClick={() => descargarContrato.mutate(contratoDetalle.id_contrato)}
                      >
                        Descargar contrato
                      </Button>
                    ) : (
                      <Text type="secondary">Sin documento</Text>
                    )}
                  </Space>
                  {contratoDetalle.documento_nombre && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {contratoDetalle.documento_nombre}
                    </Text>
                  )}
                </Space>
              ) : (
                <Text type="secondary">Esta venta no tiene contrato</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
          <CuotasPendientesVenta idVenta={modalState.record.id_venta} />
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <InfoCircleOutlined style={{ fontSize: 48, color: "#1677ff", marginBottom: 16 }} />
            <Title level={5}>Las ventas se crean al aceptar una cotizacion</Title>
            <Text type="secondary">
              Para crear una venta, primero debe crear y aceptar una cotizacion desde el modulo de
              Cotizaciones.
            </Text>
            <br />
            <br />
            <Button
              type="primary"
              onClick={() => setModalState({ type: null, visible: false, record: null })}
            >
              Ir a Cotizaciones
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
