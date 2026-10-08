import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  InputNumber,
  Descriptions,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCotizaciones,
  useClientes,
  useLotes,
  useLookup,
  useAsesores,
  useAceptarCotizacion,
} from "@/presentation/hooks";
import { useAuth, useEmpresa } from "@/presentation/providers";
import type { Cotizacion, CotizacionEstado } from "@/domain/cotizacion/entities/Cotizacion";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { TablaPlanCuotas } from "@/presentation/components/cotizaciones/TablaPlanCuotas";
import { formatCurrency } from "@/utils";
import { getContainer } from "@/infrastructure/container";

const estadoConfig: Record<CotizacionEstado, { color: string; label: string }> = {
  borrador: { color: "default", label: "BORRADOR" },
  enviada: { color: "processing", label: "ENVIADA" },
  aceptada: { color: "success", label: "ACEPTADA" },
  rechazada: { color: "error", label: "RECHAZADA" },
};

const { Text } = Typography;

interface ModalState {
  type: "view" | "edit" | "create" | "accept" | null;
  visible: boolean;
  record: Cotizacion | null;
}

export function CotizacionesPage() {
  const { data: cotizaciones, isLoading } = useCotizaciones();
  const { empresaActual } = useEmpresa();
  // Selector de cliente acotado a la empresa seleccionada (019).
  const { data: clientes } = useClientes(empresaActual?.id_empresa ?? 0);
  const { data: lotes } = useLotes();
  const { data: asesores } = useAsesores();
  const { user } = useAuth();
  const aceptarMutation = useAceptarCotizacion();
  const clienteMap = useLookup(clientes, "id_cliente", "nombres", "Cliente");
  const loteMap = useLookup(lotes, "id_lote", "numero_lote", "Lote");
  const [searchText, setSearchText] = useState("");
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    visible: false,
    record: null,
  });
  const [aceptacionError, setAceptacionError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const stats = useMemo(() => {
    if (!cotizaciones) return { total: 0, borrador: 0, enviada: 0, aceptada: 0, rechazada: 0 };
    return {
      total: cotizaciones.length,
      borrador: cotizaciones.filter((c) => c.estado === "borrador").length,
      enviada: cotizaciones.filter((c) => c.estado === "enviada").length,
      aceptada: cotizaciones.filter((c) => c.estado === "aceptada").length,
      rechazada: cotizaciones.filter((c) => c.estado === "rechazada").length,
    };
  }, [cotizaciones]);

  const filteredData = useMemo(() => {
    if (!cotizaciones) return [];
    return cotizaciones.filter(
      (c) =>
        c.estado.toLowerCase().includes(searchText.toLowerCase()) ||
        String(c.precio_ofertado).includes(searchText),
    );
  }, [cotizaciones, searchText]);

  const openModal = (
    type: "view" | "edit" | "create" | "accept",
    record: Cotizacion | null = null,
  ) => {
    // Una cotización aceptada ya generó su venta: queda solo para consulta.
    const tipo = type === "edit" && record?.estado === "aceptada" ? "view" : type;
    setModalState({ type: tipo, visible: true, record });
    setAceptacionError(null);
    if (tipo === "edit" && record) {
      form.setFieldsValue({
        ...record,
        id_asesor: record.id_asesor ?? undefined,
        monto_entrada: record.monto_entrada ?? 0,
        num_cuotas: record.num_cuotas ?? 12,
      });
    }
    if (tipo === "create") {
      form.setFieldsValue({ monto_entrada: 0, num_cuotas: 12 });
    }
  };

  const closeModal = () => {
    setModalState({ type: null, visible: false, record: null });
    setAceptacionError(null);
    form.resetFields();
  };

  const handleAceptar = async () => {
    const record = modalState.record;
    if (!record) return;

    if (!user?.id_usuario) {
      setAceptacionError("Tu sesión no tiene un usuario registrado; no se puede asignar la venta.");
      return;
    }

    try {
      const resultado = await aceptarMutation.mutateAsync({
        id_cotizacion: record.id_cotizacion,
        id_usuario: user.id_usuario,
      });
      message.success(
        `Cotizacion #${record.id_cotizacion} aceptada: venta #${resultado.id_venta} con ${resultado.cuotas_generadas} cuotas`,
      );
      closeModal();
    } catch (error) {
      // El modal queda abierto con el error para poder reintentar; el estado
      // de la cotización lo decide la base de datos, no la interfaz.
      setAceptacionError(
        error instanceof Error ? error.message : "No se pudo aceptar la cotizacion",
      );
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    const container = getContainer();
    try {
      if (modalState.type === "edit" && modalState.record) {
        await container.updateCotizacion.execute(modalState.record.id_cotizacion, {
          id_cliente: values.id_cliente,
          id_lote: values.id_lote,
          precio_ofertado: values.precio_ofertado,
          estado: values.estado,
          id_asesor: values.id_asesor ?? null,
          monto_entrada: values.monto_entrada ?? 0,
          num_cuotas: values.num_cuotas ?? 12,
        });
        message.success("Cotizacion actualizada correctamente");
      } else {
        await container.createCotizacion.execute({
          id_cliente: values.id_cliente,
          id_lote: values.id_lote,
          precio_ofertado: values.precio_ofertado,
          estado: values.estado ?? "borrador",
          id_asesor: values.id_asesor ?? null,
          monto_entrada: values.monto_entrada ?? 0,
          num_cuotas: values.num_cuotas ?? 12,
        });
        message.success("Cotizacion creada correctamente");
      }

      await queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      closeModal();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "No se pudo guardar la cotizacion");
    }
  };

  const precioForm = Number(Form.useWatch("precio_ofertado", form) ?? 0) || 0;
  const entradaForm = Number(Form.useWatch("monto_entrada", form) ?? 0) || 0;
  const cuotasForm = Number(Form.useWatch("num_cuotas", form) ?? 12) || 12;

  /** Nombre del asesor de la cotización, o `null` si no tiene (spec plan-de-pago). */
  const nombreDeAsesor = (id: number | null | undefined): string | null =>
    id ? (asesores?.find((a) => a.id_asesor === id)?.nombre_comercial ?? `Asesor #${id}`) : null;

  const columns: TableColumnType<Cotizacion>[] = [
    {
      title: "ID",
      dataIndex: "id_cotizacion",
      key: "id_cotizacion",
      width: 80,
      sorter: (a, b) => a.id_cotizacion - b.id_cotizacion,
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
      render: (id: number) => <Tag>{loteMap[id] ? `${loteMap[id]} #${id}` : `Lote #${id}`}</Tag>,
    },
    {
      title: "Precio Ofertado",
      dataIndex: "precio_ofertado",
      key: "precio_ofertado",
      sorter: (a, b) => a.precio_ofertado - b.precio_ofertado,
      render: (precio: number) => (
        <span style={{ fontWeight: 600, color: "#1677ff" }}>${precio.toLocaleString()}</span>
      ),
    },
    {
      title: "Asesor",
      key: "asesor",
      width: 150,
      render: (_, record) => {
        const nombre = nombreDeAsesor(record.id_asesor);
        return nombre ? <span>{nombre}</span> : <Text type="secondary">Sin asesor</Text>;
      },
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: CotizacionEstado) => {
        const config = estadoConfig[estado];
        return (
          <Tag color={config.color} style={{ fontWeight: 600, borderRadius: 12 }}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "Entrada / Cuotas",
      key: "financiamiento",
      width: 150,
      sorter: (a, b) => a.num_cuotas - b.num_cuotas || a.monto_entrada - b.monto_entrada,
      render: (_, record) => (
        <span>
          {formatCurrency(record.monto_entrada ?? 0)}
          <br />
          <Text type="secondary">{record.num_cuotas ?? 12} cuotas</Text>
        </span>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 160,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openModal("view", record)}
              style={{ color: "#1677ff" }}
            />
          </Tooltip>
          <Tooltip title={record.estado === "aceptada" ? "Aceptada: ya generó su venta" : "Editar"}>
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={record.estado === "aceptada"}
              onClick={() => openModal("edit", record)}
              style={{ color: "#faad14" }}
            />
          </Tooltip>
          {record.estado !== "aceptada" && (
            <Tooltip title="Aceptar cotización">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => openModal("accept", record)}
                style={{ color: "#52c41a" }}
              />
            </Tooltip>
          )}
          <Popconfirm title="Eliminar cotizacion?" onConfirm={() => message.success("Eliminada")}>
            <Tooltip title="Eliminar">
              <Button type="text" icon={<DeleteOutlined />} style={{ color: "#ff4d4f" }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Cotizaciones"
        subtitle="Gestion de cotizaciones y presupuestos"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal("create")}>
            Nueva Cotizacion
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700, fontSize: 24 }}
              prefix={<FileTextOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Borrador</span>}
              value={stats.borrador}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#8c8c8c" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #91caff" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Enviadas</span>}
              value={stats.enviada}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Aceptadas</span>}
              value={stats.aceptada}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <DataTable<Cotizacion>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_cotizacion"
        loading={isLoading}
      />

      <Modal
        title={
          modalState.type === "create"
            ? "Nueva Cotizacion"
            : modalState.type === "edit"
              ? "Editar Cotizacion"
              : modalState.type === "accept"
                ? `Aceptar cotizacion #${modalState.record?.id_cotizacion ?? ""}`
                : "Detalle de Cotizacion"
        }
        open={modalState.visible}
        onCancel={closeModal}
        confirmLoading={aceptarMutation.isPending}
        footer={
          modalState.type === "view"
            ? [
                <Button key="close" onClick={closeModal}>
                  Cerrar
                </Button>,
              ]
            : modalState.type === "accept"
              ? [
                  <Button key="cancel" onClick={closeModal}>
                    Cancelar
                  </Button>,
                  <Button
                    key="confirm"
                    type="primary"
                    loading={aceptarMutation.isPending}
                    onClick={handleAceptar}
                  >
                    Confirmar
                  </Button>,
                ]
              : [
                  <Button key="cancel" onClick={closeModal}>
                    Cancelar
                  </Button>,
                  <Button key="submit" type="primary" onClick={handleSubmit}>
                    {modalState.type === "create" ? "Crear" : "Guardar"}
                  </Button>,
                ]
        }
        width={modalState.type === "accept" ? 760 : 600}
      >
        {modalState.type === "view" && modalState.record ? (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="ID">{modalState.record.id_cotizacion}</Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {clienteMap[modalState.record.id_cliente] ??
                  `Cliente #${modalState.record.id_cliente}`}
              </Descriptions.Item>
              <Descriptions.Item label="Lote">
                {loteMap[modalState.record.id_lote]
                  ? `${loteMap[modalState.record.id_lote]} #${modalState.record.id_lote}`
                  : `Lote #${modalState.record.id_lote}`}
              </Descriptions.Item>
              <Descriptions.Item label="Precio Ofertado">
                {formatCurrency(modalState.record.precio_ofertado)}
              </Descriptions.Item>
              <Descriptions.Item label="Asesor">
                {modalState.record.id_asesor ? (
                  (asesores?.find((a) => a.id_asesor === modalState.record?.id_asesor)
                    ?.nombre_comercial ?? `Asesor #${modalState.record.id_asesor}`)
                ) : (
                  <Text type="secondary">Sin asesor</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Entrada">
                {formatCurrency(modalState.record.monto_entrada ?? 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Número de cuotas">
                {modalState.record.num_cuotas ?? 12}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={estadoConfig[modalState.record.estado]?.color}>
                  {estadoConfig[modalState.record.estado]?.label}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <Text strong>Plan de cuotas</Text>
              <div style={{ marginTop: 8 }}>
                <TablaPlanCuotas
                  precio_ofertado={modalState.record.precio_ofertado}
                  monto_entrada={modalState.record.monto_entrada ?? 0}
                  num_cuotas={modalState.record.num_cuotas ?? 12}
                  scrollY={280}
                />
              </div>
            </div>
          </>
        ) : modalState.type === "accept" && modalState.record ? (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Cliente">
                {clienteMap[modalState.record.id_cliente] ??
                  `Cliente #${modalState.record.id_cliente}`}
              </Descriptions.Item>
              <Descriptions.Item label="Lote">
                {loteMap[modalState.record.id_lote]
                  ? `${loteMap[modalState.record.id_lote]} #${modalState.record.id_lote}`
                  : `Lote #${modalState.record.id_lote}`}
              </Descriptions.Item>
              <Descriptions.Item label="Precio">
                {formatCurrency(modalState.record.precio_ofertado)}
              </Descriptions.Item>
              <Descriptions.Item label="Asesor">
                {modalState.record.id_asesor ? (
                  (asesores?.find((a) => a.id_asesor === modalState.record?.id_asesor)
                    ?.nombre_comercial ?? `Asesor #${modalState.record.id_asesor}`)
                ) : (
                  <Text type="secondary">Sin asesor</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Entrada">
                {formatCurrency(modalState.record.monto_entrada ?? 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Número de cuotas">
                {modalState.record.num_cuotas ?? 12}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text strong>Plan de cuotas</Text>
              <div style={{ marginTop: 8 }}>
                <TablaPlanCuotas
                  precio_ofertado={modalState.record.precio_ofertado}
                  monto_entrada={modalState.record.monto_entrada ?? 0}
                  num_cuotas={modalState.record.num_cuotas ?? 12}
                  scrollY={260}
                />
              </div>
            </div>

            {aceptacionError && (
              <Alert
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                message="No se pudo aceptar la cotizacion"
                description={`${aceptacionError}. Nada se guardó: podés reintentar.`}
              />
            )}
          </>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="id_cliente"
              label="Cliente"
              rules={[{ required: true, message: "Seleccione un cliente" }]}
            >
              <Select
                placeholder="Seleccionar cliente"
                showSearch
                optionFilterProp="label"
                options={
                  clientes?.map((c) => ({
                    value: c.id_cliente,
                    label: c.cedula_ruc ? `${c.nombres} - ${c.cedula_ruc}` : c.nombres,
                  })) ?? []
                }
              />
            </Form.Item>
            <Form.Item
              name="id_lote"
              label="Lote"
              rules={[{ required: true, message: "Seleccione un lote" }]}
            >
              <Select
                placeholder="Seleccionar lote"
                showSearch
                optionFilterProp="label"
                options={
                  lotes?.map((l) => ({ value: l.id_lote, label: `Lote ${l.numero_lote}` })) ?? []
                }
              />
            </Form.Item>
            <Form.Item
              name="precio_ofertado"
              label="Precio Ofertado"
              rules={[{ required: true, message: "Ingrese el precio" }]}
            >
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={100}
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(value) => Number(value?.replace(/\$\s?|[,]/g, "") || 0)}
              />
            </Form.Item>
            <Form.Item
              name="id_asesor"
              label="Asesor"
              extra="Dejalo vacío si la cotización no la registra un asesor."
            >
              <Select
                placeholder="Seleccionar asesor"
                allowClear
                showSearch
                optionFilterProp="label"
                options={
                  (asesores ?? [])
                    .filter((a) => a.estado === "activo")
                    .map((a) => ({ value: a.id_asesor, label: a.nombre_comercial })) ?? []
                }
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="monto_entrada"
                  label="Entrada"
                  dependencies={["precio_ofertado"]}
                  rules={[
                    { required: true, message: "Ingrese la entrada" },
                    ({ getFieldValue }) => ({
                      validator: (_, value: number | null | undefined) => {
                        const precio = Number(getFieldValue("precio_ofertado") ?? 0);
                        if (value == null || value === undefined) return Promise.resolve();
                        if (value < 0)
                          return Promise.reject(new Error("La entrada no puede ser negativa"));
                        if (precio > 0 && value >= precio) {
                          return Promise.reject(
                            new Error(
                              `Debe ser menor al precio ofertado (${formatCurrency(precio)})`,
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <InputNumber<number>
                    style={{ width: "100%" }}
                    min={0}
                    step={100}
                    formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number(value?.replace(/\$\s?|[,]/g, "") || 0)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="num_cuotas"
                  label="Número de cuotas"
                  rules={[
                    { required: true, message: "Ingrese el número de cuotas" },
                    { type: "number", min: 1, message: "Debe ser al menos 1 cuota" },
                  ]}
                >
                  <InputNumber<number> style={{ width: "100%" }} min={1} max={360} />
                </Form.Item>
              </Col>
            </Row>
            {entradaForm >= precioForm && precioForm > 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message="La entrada debe ser menor al precio ofertado"
              />
            )}
            {modalState.type === "edit" && (
              <Form.Item
                name="estado"
                label="Estado"
                rules={[{ required: true, message: "Seleccione el estado" }]}
              >
                <Select
                  placeholder="Seleccionar estado"
                  options={Object.entries(estadoConfig)
                    .filter(([value]) => value !== "aceptada")
                    .map(([value, { label }]) => ({ value, label }))}
                />
              </Form.Item>
            )}
            <div>
              <Text strong>Plan de cuotas</Text>
              <div style={{ marginTop: 8 }}>
                <TablaPlanCuotas
                  precio_ofertado={precioForm}
                  monto_entrada={entradaForm}
                  num_cuotas={cuotasForm}
                  scrollY={200}
                />
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
