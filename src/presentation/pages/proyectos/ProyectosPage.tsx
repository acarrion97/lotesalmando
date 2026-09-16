import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Typography, Modal, Form, Descriptions, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useProyectos } from "@/presentation/hooks";
import type { Proyecto } from "@/domain/proyecto/entities/Proyecto";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";

const { Title } = Typography;

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Proyecto | null;
}

export function ProyectosPage() {
  const { data: proyectos, isLoading } = useProyectos();
  const { empresaActual } = useEmpresa();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshProyectos = () => queryClient.invalidateQueries({ queryKey: ["proyectos"] });

  const filteredData = useMemo(() => {
    if (!proyectos) return [];
    return proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [proyectos, searchText]);

  const openModal = (type: "view" | "edit" | "delete", record: Proyecto) => {
    setModal({ type, visible: true, record });
    if (type === "edit") editForm.setFieldsValue({ nombre: record.nombre });
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;

    try {
      const values = await editForm.validateFields();
      await container.updateProyecto.execute(modal.record.id_proyecto, values);
      await refreshProyectos();
      messageApi.success("Proyecto actualizado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar el proyecto");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;

    try {
      await container.deleteProyecto.execute(modal.record.id_proyecto);
      await refreshProyectos();
      messageApi.success("Proyecto eliminado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el proyecto");
    }
  };

  const handleCreate = async () => {
    if (!empresaActual) {
      messageApi.error("No se pudo determinar la empresa actual");
      return;
    }

    try {
      const values = await createForm.validateFields();
      await container.createProyecto.execute({ ...values, id_empresa: empresaActual.id_empresa });
      await refreshProyectos();
      messageApi.success("Proyecto creado correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear el proyecto");
    }
  };

  const columns: TableColumnType<Proyecto>[] = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
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
      onFilter: (value, record) => record.nombre.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Empresa",
      dataIndex: "id_empresa",
      key: "id_empresa",
      sorter: (a, b) => a.id_empresa - b.id_empresa,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Proyecto) => (
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
        <Title level={4} style={{ margin: 0 }}>Proyectos</Title>
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
        <Table<Proyecto>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_proyecto"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Detalle del Proyecto"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>Cerrar</Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nombre">{modal.record.nombre}</Descriptions.Item>
            <Descriptions.Item label="Empresa">ID {modal.record.id_empresa}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Proyecto"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "Ingrese el nombre del proyecto" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Proyecto"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "Ingrese el nombre del proyecto" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Proyecto"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Estás seguro que deseas eliminar el proyecto <strong>{modal.record?.nombre}</strong>?
        </p>
      </Modal>
    </div>
  );
}
