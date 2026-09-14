import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Typography, Modal } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useContratos } from "@/presentation/hooks";
import type { Contrato } from "@/domain/contrato/entities/Contrato";

const { Title } = Typography;

export function ContratosPage() {
  const { data: contratos, isLoading } = useContratos();
  const [searchText, setSearchText] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!contratos) return [];
    return contratos.filter(
      (c) =>
        c.numero_contrato.toLowerCase().includes(searchText.toLowerCase()) ||
        String(c.id_venta).includes(searchText)
    );
  }, [contratos, searchText]);

  const columns: TableColumnType<Contrato>[] = [
    {
      title: "Numero Contrato",
      dataIndex: "numero_contrato",
      key: "numero_contrato",
      sorter: (a, b) => a.numero_contrato.localeCompare(b.numero_contrato),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar numero"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: "block" }}
          />
          <Button type="primary" onClick={() => confirm()} size="small" icon={<SearchOutlined />}>
            Buscar
          </Button>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />,
      onFilter: (value, record) => record.numero_contrato.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Venta",
      dataIndex: "id_venta",
      key: "id_venta",
      sorter: (a, b) => a.id_venta - b.id_venta,
    },
    {
      title: "Monto Total",
      dataIndex: "monto_total",
      key: "monto_total",
      sorter: (a, b) => a.monto_total - b.monto_total,
      render: (monto: number) => `$${monto.toLocaleString()}`,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: () => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>Ver</Button>
          <Button type="link" icon={<EditOutlined />}>Editar</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>Eliminar</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Contratos</Title>
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
        <Table<Contrato>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_contrato"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {/* Create Info Modal */}
      <Modal
        title="Nuevo Contrato"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCreateModalOpen(false)}>Cerrar</Button>,
        ]}
      >
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <Typography.Paragraph type="secondary">
            Los contratos se crean automaticamente al confirmar una venta. Contacte a un administrador para iniciar el proceso.
          </Typography.Paragraph>
        </div>
      </Modal>
    </div>
  );
}
