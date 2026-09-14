import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Typography } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import type { Inventario } from "@/domain/inventario/entities/Inventario";

const { Title } = Typography;

const mockData: Inventario[] = [];

export function InventarioPage() {
  const [searchText, setSearchText] = useState("");

  const filteredData = useMemo(() => {
    return mockData.filter(
      (i) =>
        String(i.id_lote).includes(searchText) ||
        i.estado_anterior.toLowerCase().includes(searchText.toLowerCase()) ||
        i.estado_nuevo.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  const columns: TableColumnType<Inventario>[] = [
    {
      title: "Lote",
      dataIndex: "id_lote",
      key: "id_lote",
      sorter: (a, b) => a.id_lote - b.id_lote,
    },
    {
      title: "Usuario",
      dataIndex: "id_usuario",
      key: "id_usuario",
      sorter: (a, b) => a.id_usuario - b.id_usuario,
    },
    {
      title: "Estado Anterior",
      dataIndex: "estado_anterior",
      key: "estado_anterior",
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar estado"
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
      onFilter: (value, record) => record.estado_anterior.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Estado Nuevo",
      dataIndex: "estado_nuevo",
      key: "estado_nuevo",
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar estado"
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
      onFilter: (value, record) => record.estado_nuevo.toLowerCase().includes(String(value).toLowerCase()),
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
        <Title level={4} style={{ margin: 0 }}>Inventario</Title>
        <Space>
          <Input
            placeholder="Buscar..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />}>
            Nuevo
          </Button>
        </Space>
      </div>
      <Card>
        <Table<Inventario>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_inventario"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>
    </div>
  );
}
