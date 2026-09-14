import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Tag, Typography, Modal, Descriptions } from "antd";
import { PlusOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useCobranzas } from "@/presentation/hooks";
import type { Cobranza, CobranzaEstado } from "@/domain/cobranza/entities/Cobranza";

const { Title } = Typography;

const estadoColorMap: Record<CobranzaEstado, string> = {
  pendiente: "orange",
  pagada: "green",
  vencida: "red",
};

interface ModalState {
  type: "view" | null;
  visible: boolean;
  record: Cobranza | null;
}

export function CobranzasPage() {
  const { data: cobranzas, isLoading } = useCobranzas();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!cobranzas) return [];
    return cobranzas.filter(
      (c) =>
        String(c.id_contrato).includes(searchText) ||
        String(c.numero_cuota).includes(searchText) ||
        c.estado.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [cobranzas, searchText]);

  const openModal = (type: "view", record: Cobranza) => {
    setModal({ type, visible: true, record });
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
  };

  const columns: TableColumnType<Cobranza>[] = [
    {
      title: "Contrato",
      dataIndex: "id_contrato",
      key: "id_contrato",
      sorter: (a, b) => a.id_contrato - b.id_contrato,
    },
    {
      title: "Cuota",
      dataIndex: "numero_cuota",
      key: "numero_cuota",
      sorter: (a, b) => a.numero_cuota - b.numero_cuota,
    },
    {
      title: "Monto",
      dataIndex: "monto_cuota",
      key: "monto_cuota",
      sorter: (a, b) => a.monto_cuota - b.monto_cuota,
      render: (monto: number) => `$${monto.toLocaleString()}`,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: [
        { text: "Pendiente", value: "pendiente" },
        { text: "Pagada", value: "pagada" },
        { text: "Vencida", value: "vencida" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado: CobranzaEstado) => <Tag color={estadoColorMap[estado]}>{(estado ?? "sin estado").toUpperCase()}</Tag>,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Cobranza) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openModal("view", record)}>Ver</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Cobranzas</Title>
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
        <Table<Cobranza>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_cobranza"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Detalle de la Cobranza"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>Cerrar</Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID Cobranza">{modal.record.id_cobranza}</Descriptions.Item>
            <Descriptions.Item label="Contrato">ID {modal.record.id_contrato}</Descriptions.Item>
            <Descriptions.Item label="Numero de Cuota">{modal.record.numero_cuota}</Descriptions.Item>
            <Descriptions.Item label="Monto Cuota">
              ${modal.record.monto_cuota.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={estadoColorMap[modal.record.estado]}>
                {(modal.record.estado ?? "sin estado").toUpperCase()}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Create Info Modal */}
      <Modal
        title="Nueva Cobranza"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCreateModalOpen(false)}>Cerrar</Button>,
        ]}
      >
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <Typography.Paragraph type="secondary">
            Las cobranzas se crean automaticamente al generar un contrato. Contacte a un administrador para iniciar el proceso.
          </Typography.Paragraph>
        </div>
      </Modal>
    </div>
  );
}
