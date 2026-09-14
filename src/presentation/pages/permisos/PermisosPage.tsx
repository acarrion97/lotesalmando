import { Table, Card, Typography } from "antd";
import type { TableColumnType } from "antd";

const { Title } = Typography;

interface Permiso {
  id_permiso: number;
  nombre_permiso: string;
  modulo: string;
}

const columns: TableColumnType<Permiso>[] = [
  { title: "ID", dataIndex: "id_permiso", key: "id_permiso" },
  { title: "Permiso", dataIndex: "nombre_permiso", key: "nombre_permiso" },
  { title: "Modulo", dataIndex: "modulo", key: "modulo" },
];

const mockPermisos: Permiso[] = [
  { id_permiso: 1, nombre_permiso: "Ver Proyectos", modulo: "Proyectos" },
  { id_permiso: 2, nombre_permiso: "Crear Proyectos", modulo: "Proyectos" },
  { id_permiso: 3, nombre_permiso: "Ver Clientes", modulo: "Clientes" },
  { id_permiso: 4, nombre_permiso: "Crear Cotizaciones", modulo: "Cotizaciones" },
];

export function PermisosPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Permisos</Title>
      <Card>
        <Table<Permiso>
          columns={columns}
          dataSource={mockPermisos}
          rowKey="id_permiso"
          pagination={false}
        />
      </Card>
    </div>
  );
}
