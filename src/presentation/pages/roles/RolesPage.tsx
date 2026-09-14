import { Table, Card, Typography } from "antd";
import type { TableColumnType } from "antd";

const { Title } = Typography;

interface Rol {
  id_rol: number;
  nombre_rol: string;
}

const columns: TableColumnType<Rol>[] = [
  { title: "ID", dataIndex: "id_rol", key: "id_rol" },
  { title: "Nombre del Rol", dataIndex: "nombre_rol", key: "nombre_rol" },
];

const mockRoles: Rol[] = [
  { id_rol: 1, nombre_rol: "Administrador" },
  { id_rol: 2, nombre_rol: "Vendedor" },
  { id_rol: 3, nombre_rol: "Cobrador" },
];

export function RolesPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Roles</Title>
      <Card>
        <Table<Rol>
          columns={columns}
          dataSource={mockRoles}
          rowKey="id_rol"
          pagination={false}
        />
      </Card>
    </div>
  );
}
