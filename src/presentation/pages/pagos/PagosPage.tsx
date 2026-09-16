import { useState, useMemo } from "react";
import { Table, Card, Button, Input, Tag, Typography, Descriptions, Modal, Form, InputNumber, message, Row, Col, Statistic } from "antd";
import { PlusOutlined, SearchOutlined, EyeOutlined, DollarOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { usePagos } from "@/presentation/hooks";
import { getContainer } from "@/infrastructure/container";
import { pagoSchema } from "@/presentation/validations";

const { Title, Text } = Typography;

type PagoRow = {
  id_pago: number;
  id_cobranza: number;
  id_usuario: number;
  monto_pagado: number;
  fecha_pago: string;
};

export function PagosPage() {
  const { data: pagos, isLoading } = usePagos();
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: PagoRow | null }>({ visible: false, record: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const stats = useMemo(() => {
    if (!pagos) return { total: 0, montoTotal: 0 };
    return {
      total: pagos.length,
      montoTotal: pagos.reduce((sum, p) => sum + p.monto_pagado, 0),
    };
  }, [pagos]);

  const filteredData = useMemo(() => {
    if (!pagos) return [];
    return pagos.filter(
      (p) =>
        String(p.id_cobranza).includes(searchText) ||
        String(p.monto_pagado).includes(searchText) ||
        p.fecha_pago.includes(searchText)
    );
  }, [pagos, searchText]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const parsed = pagoSchema.parse(values);
      const container = getContainer();
      await container.registerPago.execute({
        id_cobranza: parsed.id_cobranza,
        id_usuario: 1,
        monto_pagado: parsed.monto_pagado,
        fecha_pago: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["pagos"] });
      await queryClient.invalidateQueries({ queryKey: ["cobranzas"] });
      await queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] });
      messageApi.success("Pago registrado correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      else messageApi.error("Error al registrar pago");
    }
  };

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
      render: (id: number) => <Tag>#{id}</Tag>,
    },
    {
      title: "Monto Pagado",
      dataIndex: "monto_pagado",
      key: "monto_pagado",
      sorter: (a, b) => a.monto_pagado - b.monto_pagado,
      render: (monto: number) => <span style={{ fontWeight: 600, color: "#52c41a" }}>${monto.toLocaleString()}</span>,
    },
    {
      title: "Fecha",
      dataIndex: "fecha_pago",
      key: "fecha_pago",
      sorter: (a, b) => a.fecha_pago.localeCompare(b.fecha_pago),
      render: (fecha: string) => fecha ? new Date(fecha).toLocaleDateString() : "-",
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_: unknown, record: PagoRow) => (
        <Button type="text" icon={<EyeOutlined />} style={{ color: "#1677ff" }} onClick={() => setViewModal({ visible: true, record })} />
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Pagos</Title>
          <Text type="secondary">Registro de pagos recibidos</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>Registrar Pago</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Pagos</span>} value={stats.total} styles={{ content: { fontWeight: 700, fontSize: 22 } }} prefix={<DollarOutlined style={{ color: "#52c41a" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Total Recibido</span>} value={stats.montoTotal} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#52c41a" } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Buscar pago..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300, borderRadius: 8 }} allowClear />
        </div>
        <Table<PagoRow>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_pago"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {/* View Modal */}
      <Modal title="Detalle del Pago" open={viewModal.visible} onCancel={() => setViewModal({ visible: false, record: null })} footer={[<Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>Cerrar</Button>]} width={500}>
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Pago">{viewModal.record.id_pago}</Descriptions.Item>
            <Descriptions.Item label="Cobranza"><Tag>#{viewModal.record.id_cobranza}</Tag></Descriptions.Item>
            <Descriptions.Item label="Monto Pagado"><span style={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }}>${viewModal.record.monto_pagado.toLocaleString()}</span></Descriptions.Item>
            <Descriptions.Item label="Fecha">{viewModal.record.fecha_pago ? new Date(viewModal.record.fecha_pago).toLocaleDateString() : "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal title="Registrar Pago" open={createModalOpen} onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }} onOk={handleCreate} okText="Registrar" cancelText="Cancelar">
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="id_cobranza" label="ID Cobranza" rules={[{ required: true, message: "Ingrese el ID de la cobranza" }]}>
            <InputNumber style={{ width: "100%" }} min={1} placeholder="ID de la cobranza a pagar" />
          </Form.Item>
          <Form.Item name="monto_pagado" label="Monto a Pagar" rules={[{ required: true, message: "Ingrese el monto" }]}>
            <InputNumber style={{ width: "100%" }} min={0} step={100} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
