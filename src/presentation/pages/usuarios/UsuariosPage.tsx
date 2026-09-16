import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Tag, Typography, Modal, Form, Select, Descriptions, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useUsuarios, useRoles } from "@/presentation/hooks";
import type { Usuario, UsuarioEstado } from "@/domain/usuario/entities/Usuario";
import { getContainer } from "@/infrastructure/container";
import { usuarioSchema } from "@/presentation/validations";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";

const { Title } = Typography;

const estadoColorMap: Record<UsuarioEstado, string> = {
  activo: "green",
  inactivo: "red",
};

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Usuario | null;
}

export function UsuariosPage() {
  const { data: usuarios, isLoading } = useUsuarios();
  const { data: roles } = useRoles();
  const { empresaActual } = useEmpresa();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [rolesAsignados, setRolesAsignados] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshUsuarios = () => queryClient.invalidateQueries({ queryKey: ["usuarios"] });

  const filteredData = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter(
      (u) =>
        u.nombres.toLowerCase().includes(searchText.toLowerCase()) ||
        u.email.toLowerCase().includes(searchText.toLowerCase()) ||
        u.estado.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [usuarios, searchText]);

  const openModal = async (type: "view" | "edit" | "delete", record: Usuario) => {
    setModal({ type, visible: true, record });
    if (type === "edit") {
      const rolesDelUsuario = await container.getRolesByUsuario.execute(record.id_usuario);
      const rolIds = rolesDelUsuario.map((r) => r.id_rol);
      setRolesAsignados(rolIds);
      editForm.setFieldsValue({ nombres: record.nombres, email: record.email, estado: record.estado, roles: rolIds });
    }
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;

    try {
      const { roles: rolesSeleccionados, ...values } = await editForm.validateFields();
      const parsed = usuarioSchema.partial().parse(values);
      await container.updateUsuario.execute(modal.record.id_usuario, parsed);

      const nuevos: number[] = rolesSeleccionados ?? [];
      const agregados = nuevos.filter((id) => !rolesAsignados.includes(id));
      const removidos = rolesAsignados.filter((id) => !nuevos.includes(id));
      await Promise.all([
        ...agregados.map((id) => container.assignRol.execute(modal.record!.id_usuario, id)),
        ...removidos.map((id) => container.removeRol.execute(modal.record!.id_usuario, id)),
      ]);

      await refreshUsuarios();
      messageApi.success("Usuario actualizado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar el usuario");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;

    try {
      await container.deleteUsuario.execute(modal.record.id_usuario);
      await refreshUsuarios();
      messageApi.success("Usuario eliminado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el usuario");
    }
  };

  const handleCreate = async () => {
    if (!empresaActual) {
      messageApi.error("No se pudo determinar la empresa actual");
      return;
    }

    try {
      const values = await createForm.validateFields();
      const parsed = usuarioSchema.parse(values);
      await container.createUsuario.execute({ ...parsed, id_empresa: empresaActual.id_empresa });
      await refreshUsuarios();
      messageApi.success("Usuario creado correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear el usuario");
    }
  };

  const columns: TableColumnType<Usuario>[] = [
    {
      title: "Nombres",
      dataIndex: "nombres",
      key: "nombres",
      sorter: (a, b) => a.nombres.localeCompare(b.nombres),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar nombre"
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
      onFilter: (value, record) => record.nombres.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar email"
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
      onFilter: (value, record) => record.email.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: [
        { text: "Activo", value: "activo" },
        { text: "Inactivo", value: "inactivo" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado: UsuarioEstado) => <Tag color={estadoColorMap[estado]}>{(estado ?? "sin estado").toUpperCase()}</Tag>,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Usuario) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openModal("view", record)}>Ver</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal("edit", record)}>Editar</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => openModal("delete", record)}>Eliminar</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Usuarios</Title>
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
        <Table<Usuario>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_usuario"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Detalle del Usuario"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>Cerrar</Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nombres">{modal.record.nombres}</Descriptions.Item>
            <Descriptions.Item label="Email">{modal.record.email}</Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={estadoColorMap[modal.record.estado]}>
                {(modal.record.estado ?? "sin estado").toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Empresa">ID {modal.record.id_empresa}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Usuario"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombres"
            label="Nombres"
            rules={[{ required: true, message: "Ingrese los nombres" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Ingrese el email" },
              { type: "email", message: "Ingrese un email valido" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select
              options={[
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
            />
          </Form.Item>
          <Form.Item name="roles" label="Roles">
            <Select
              mode="multiple"
              placeholder="Selecciona los roles del usuario"
              options={(roles ?? []).map((r) => ({ value: r.id_rol, label: r.nombre_rol }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Usuario"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombres"
            label="Nombres"
            rules={[{ required: true, message: "Ingrese los nombres" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Ingrese el email" },
              { type: "email", message: "Ingrese un email valido" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select
              options={[
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Usuario"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Estás seguro que deseas eliminar al usuario <strong>{modal.record?.nombres}</strong>?
        </p>
      </Modal>
    </div>
  );
}
