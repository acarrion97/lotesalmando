import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Typography, Modal, Descriptions, message } from "antd";
import { PlusOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { usePagos } from "@/presentation/hooks";
import type { Pago } from "@/domain/pago/entities/Pago";

const { Title } = Typography;

interface ModalState {
  type: "view" | null;
  visible: boolean;
  record: Pago | null;
}

export function PagosPage() {
  const { data: pagos, isLoading } = usePagos();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const filteredData = useMemo(() => {
    if (!pagos) return [];
    return pagos.filter(
      (p) =>
        String(p.id_cobranza).includes(searchText) ||
        String(p.monto_pagado).includes(searchText) ||
        p.fecha_pago.includes(searchText)
    );
  }, [pagos, searchText]);

  const openModal = (type: "view", record: Pago) => {
    setModal({ type, visible: true, record });
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
  };

  const handleCreate = () => {
    messageApi.success("Creado correctamente");
    setCreateModalOpen(false);
  };

  const columns: TableColumnType<Pago>[] = [
    {
      title: "Cobranza",
      dataIndex: "id_cobranza",
      key: "id_cobranza",
      sorter: (a, b) => a.id_cobranza - b.id_cobranza,
    },
    {
      title: "Monto Pagado",
      dataIndex: "monto_pagado",
      key: "monto_pagado",
      sorter: (a, b) => a.monto_pagado - b.monto_pagado,
      render: (monto: number) => `$${monto.toLocaleString()}`,
    },
    {
      title: "Fecha",
      dataIndex: "fecha_pago",
      key: "fecha_pago",
      sorter: (a, b) => a.fecha_pago.localeCompare(b.fecha_pago),
    },
    {
      title: "Usuario",
      dataIndex: "id_usuario",
      key: "id_usuario",
      sorter: (a, b) => a.id_usuario - b.id_usuario,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Pago) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openModal("view", record)}>Ver</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Pagos</Title>
        <Space>
          <Input
            placeholder="Buscar..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Nuevo
          </Button>
        </Space>
      </div>
      <Card>
        <Table<Pago>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_pago"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {contextHolder}

      {/* Create Info Modal */}
      <Modal
        title="Nuevo Pago"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <Typography.Paragraph type="secondary">
            Los pagos se crean automaticamente al registrar una cobranza. Contacte a un administrador para iniciar el proceso.
          </Typography.Paragraph>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        title="Detalle del Pago"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>Cerrar</Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID Pago">{modal.record.id_pago}</Descriptions.Item>
            <Descriptions.Item label="Cobranza">ID {modal.record.id_cobranza}</Descriptions.Item>
            <Descriptions.Item label="Monto Pagado">
              ${modal.record.monto_pagado.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha de Pago">{modal.record.fecha_pago}</Descriptions.Item>
            <Descriptions.Item label="Usuario">ID {modal.record.id_usuario}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
