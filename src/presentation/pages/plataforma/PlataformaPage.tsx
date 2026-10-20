import { useMemo } from "react";
import { Card, Col, Row, Skeleton, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { usePlataformaMetricas, useUsuariosPlataforma, useRolesPorUsuarios } from "@/presentation/hooks";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import type { EmpresaResumen } from "@/application/empresa/use-cases/GetPlataformaMetricasUseCase";
import type { UsuarioDto } from "@/application/usuarios/dto/UsuarioDto";

const { Text } = Typography;

const estadoColor = (estado: string) =>
  (estado ?? "").toLowerCase() === "activo" ? "green" : "red";

/**
 * Dashboard de superadmin: cuántas empresas y usuarios hay registrados en la
 * plataforma, cuántos son nuevos este mes y un desglose por empresa.
 *
 * Detrás del permiso `ver_plataforma`. Agrega datos de TODA la plataforma
 * (todas las empresas), no solo de la empresa de la sesión.
 */
export function PlataformaPage() {
  const { data, isLoading } = usePlataformaMetricas();
  const { data: usuarios, isLoading: cargandoUsuarios } = useUsuariosPlataforma();
  // Roles de todos los usuarios, en una sola consulta (evita N+1).
  const { data: rolesPorUsuario } = useRolesPorUsuarios();

  // Índice de usuarios por empresa, para poder expandir cada fila.
  const usuariosPorEmpresa = useMemo(() => {
    const mapa = new Map<number, UsuarioDto[]>();
    for (const u of usuarios ?? []) {
      const lista = mapa.get(u.id_empresa);
      if (lista) lista.push(u);
      else mapa.set(u.id_empresa, [u]);
    }
    // Orden alfabético por nombre dentro de cada empresa.
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.nombres.localeCompare(b.nombres));
    }
    return mapa;
  }, [usuarios]);

  // Columnas de la tabla anidada que se despliega al expandir una empresa.
  const columnasUsuarios: ColumnsType<UsuarioDto> = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "nombres",
        key: "nombres",
        sorter: (a, b) => a.nombres.localeCompare(b.nombres),
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        render: (email: string) => <Text copyable={{ text: email }}>{email}</Text>,
      },
      {
        title: "Rol",
        key: "rol",
        // Un usuario puede tener más de un rol; se muestran todos.
        render: (_, fila) => {
          const roles = rolesPorUsuario?.[fila.id_usuario] ?? [];
          if (roles.length === 0) return <Text type="secondary">Sin rol</Text>;
          return (
            <>
              {roles.map((nombre) => (
                <Tag key={nombre} color="blue" style={{ marginInlineEnd: 4 }}>
                  {nombre}
                </Tag>
              ))}
            </>
          );
        },
      },
      {
        title: "Estado",
        dataIndex: "estado",
        key: "estado",
        filters: [
          { text: "Activo", value: "activo" },
          { text: "Inactivo", value: "inactivo" },
        ],
        onFilter: (valor, fila) => (fila.estado ?? "").toLowerCase() === valor,
        render: (estado: string) => <Tag color={estadoColor(estado)}>{estado || "—"}</Tag>,
      },
      {
        title: "Registrado",
        dataIndex: "created_at",
        key: "created_at",
        sorter: (a, b) =>
          new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
        render: (iso: string | null) =>
          iso ? new Date(iso).toLocaleDateString() : <Text type="secondary">—</Text>,
      },
    ],
    [rolesPorUsuario],
  );

  const columnas: ColumnsType<EmpresaResumen> = useMemo(
    () => [
      {
        title: "Empresa",
        dataIndex: "razon_social",
        key: "razon_social",
        sorter: (a, b) => a.razon_social.localeCompare(b.razon_social),
      },
      {
        title: "Estado",
        dataIndex: "estado",
        key: "estado",
        filters: [
          { text: "Activo", value: "activo" },
          { text: "Inactivo", value: "inactivo" },
        ],
        onFilter: (valor, fila) => (fila.estado ?? "").toLowerCase() === valor,
        render: (estado: string) => <Tag color={estadoColor(estado)}>{estado || "—"}</Tag>,
      },
      {
        title: "Usuarios",
        dataIndex: "total_usuarios",
        key: "total_usuarios",
        sorter: (a, b) => a.total_usuarios - b.total_usuarios,
        render: (total: number, fila) => (
          <span>
            {total} <Text type="secondary">({fila.usuarios_activos} activos)</Text>
          </span>
        ),
      },
      {
        title: "Registrada",
        dataIndex: "created_at",
        key: "created_at",
        sorter: (a, b) =>
          new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
        render: (iso: string | null) =>
          iso ? new Date(iso).toLocaleDateString() : <Text type="secondary">—</Text>,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div>
        <PageToolbar title="Plataforma" subtitle="Cargando métricas…" />
        <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 24 }} />
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  const tarjetas = [
    {
      title: "Empresas registradas",
      value: data?.total_empresas ?? 0,
      icon: <BankOutlined style={{ fontSize: 24, color: "#1677ff" }} />,
      color: "#e6f4ff",
    },
    {
      title: "Empresas activas",
      value: data?.empresas_activas ?? 0,
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
    },
    {
      title: "Empresas nuevas (mes)",
      value: data?.empresas_nuevas_este_mes ?? 0,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: "#faad14" }} />,
      color: "#fffbe6",
    },
    {
      title: "Usuarios registrados",
      value: data?.total_usuarios ?? 0,
      icon: <TeamOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      color: "#f9f0ff",
    },
    {
      title: "Usuarios activos",
      value: data?.usuarios_activos ?? 0,
      icon: <UserOutlined style={{ fontSize: 24, color: "#13c2c2" }} />,
      color: "#e6fffb",
    },
    {
      title: "Usuarios nuevos (mes)",
      value: data?.usuarios_nuevos_este_mes ?? 0,
      icon: <UserAddOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />,
      color: "#fff2f0",
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Plataforma"
        subtitle="Empresas y usuarios registrados en Lotes al Mando."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {tarjetas.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.title}>
            <Card hoverable style={{ borderRadius: 10 }} styles={{ body: { padding: "20px 24px" } }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </div>
                <Statistic
                  title={card.title}
                  value={card.value}
                  styles={{ content: { fontSize: 22, fontWeight: 700 } }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Promedio de usuarios por empresa" style={{ borderRadius: 10 }}>
            <Statistic
              value={data?.promedio_usuarios_por_empresa ?? 0}
              precision={1}
              styles={{ content: { fontWeight: 700 } }}
              prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Resumen" style={{ borderRadius: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Empresas inactivas</Text>
                <Text strong>{data?.empresas_inactivas ?? 0}</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Usuarios inactivos</Text>
                <Text strong>{data?.usuarios_inactivos ?? 0}</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Total de empresas</Text>
                <Text strong>{data?.total_empresas ?? 0}</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="Empresas y sus usuarios"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>Expandí una empresa para ver su detalle de usuarios</Text>}
        style={{ borderRadius: 10 }}
      >
        <Table<EmpresaResumen>
          dataSource={data?.empresas ?? []}
          columns={columnas}
          rowKey="id_empresa"
          size="middle"
          scroll={{ x: "max-content" }}
          loading={cargandoUsuarios}
          expandable={{
            // Solo expande empresas que tengan usuarios; las demás muestran un
            // texto corto en vez de una tabla vacía.
            rowExpandable: (fila) => (usuariosPorEmpresa.get(fila.id_empresa)?.length ?? 0) > 0,
            expandedRowRender: (fila) => {
              const lista = usuariosPorEmpresa.get(fila.id_empresa) ?? [];
              return (
                <Table<UsuarioDto>
                  dataSource={lista}
                  columns={columnasUsuarios}
                  rowKey="id_usuario"
                  size="small"
                  pagination={lista.length > 10 ? { pageSize: 10 } : false}
                  scroll={{ x: "max-content" }}
                />
              );
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} empresas`,
          }}
        />
      </Card>
    </div>
  );
}
