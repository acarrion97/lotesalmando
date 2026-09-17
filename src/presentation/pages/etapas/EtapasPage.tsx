import { useState, useMemo } from "react";
import { Button, Space, Input, Modal, Form, InputNumber, Descriptions, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useEtapas } from "@/presentation/hooks";
import type { Etapa } from "@/domain/etapa/entities/Etapa";
import { getContainer } from "@/infrastructure/container";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Etapa | null;
}

export function EtapasPage() {
  const { data: etapas, isLoading } = useEtapas();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshEtapas = () => queryClient.invalidateQueries({ queryKey: ["etapas"] });

  const filteredData = useMemo(() => {
    if (!etapas) return [];
    return etapas.filter((e) =>
      e.nombre.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [etapas, searchText]);

  const openModal = (type: "view" | "edit" | "delete", record: Etapa) => {
    setModal({ type, visible: true, record });
    if (type === "edit") editForm.setFieldsValue({ nombre: record.nombre, orden: record.orden });
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;
    try {
      const values = await editForm.validateFields();
      await container.updateEtapa.execute(modal.record.id_etapa, values);
      await refreshEtapas();
      messageApi.success("Etapa actualizada correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar la etapa");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;
    try {
      await container.deleteEtapa.execute(modal.record.id_etapa);
      await refreshEtapas();
      messageApi.success("Etapa eliminada correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar la etapa");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await container.createEtapa.execute({ ...values, id_proyecto: 1 });
      await refreshEtapas();
      messageApi.success("Etapa creada correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear la etapa");
    }
  };

  const columns: TableColumnType<Etapa>[] = [
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
      title: "Orden",
      dataIndex: "orden",
      key: "orden",
      sorter: (a, b) => a.orden - b.orden,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Etapa) => (
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
      <PageToolbar
        title="Etapas"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Nueva Etapa
          </Button>
        }
      />
      <DataTable<Etapa>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_etapa"
        loading={isLoading}
      />

      {/* View Modal */}
      <Modal
        title="Detalle de la Etapa"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[<Button key="close" onClick={closeModal}>Cerrar</Button>]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nombre">{modal.record.nombre}</Descriptions.Item>
            <Descriptions.Item label="Orden">{modal.record.orden}</Descriptions.Item>
            <Descriptions.Item label="Proyecto ID">{modal.record.id_proyecto}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Etapa"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: "Ingrese el nombre de la etapa" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="orden" label="Orden" rules={[{ required: true, message: "Ingrese el orden" }]}>
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nueva Etapa"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: "Ingrese el nombre de la etapa" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="orden" label="Orden" rules={[{ required: true, message: "Ingrese el orden" }]}>
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Etapa"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Estás seguro que deseas eliminar la etapa <strong>{modal.record?.nombre}</strong>?
        </p>
      </Modal>
    </div>
  );
}
