import { useState, useMemo } from "react";
import { Button, Space, Input, Modal, Form, Descriptions, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useManzanas } from "@/presentation/hooks";
import type { Manzana } from "@/domain/manzana/entities/Manzana";
import { getContainer } from "@/infrastructure/container";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Manzana | null;
}

export function ManzanasPage() {
  const { data: manzanas, isLoading } = useManzanas();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshManzanas = () => queryClient.invalidateQueries({ queryKey: ["manzanas"] });

  const filteredData = useMemo(() => {
    if (!manzanas) return [];
    return manzanas.filter((m) =>
      (m.nombre_codigo ?? "").toLowerCase().includes(searchText.toLowerCase())
    );
  }, [manzanas, searchText]);

  const openModal = (type: "view" | "edit" | "delete", record: Manzana) => {
    setModal({ type, visible: true, record });
    if (type === "edit") editForm.setFieldsValue({ nombre_codigo: record.nombre_codigo });
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;
    try {
      const values = await editForm.validateFields();
      await container.updateManzana.execute(modal.record.id_manzana, values);
      await refreshManzanas();
      messageApi.success("Manzana actualizada correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar la manzana");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;
    try {
      await container.deleteManzana.execute(modal.record.id_manzana);
      await refreshManzanas();
      messageApi.success("Manzana eliminada correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar la manzana");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await container.createManzana.execute({ ...values, id_etapa: 1 });
      await refreshManzanas();
      messageApi.success("Manzana creada correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear la manzana");
    }
  };

  const columns: TableColumnType<Manzana>[] = [
    {
      title: "Codigo",
      dataIndex: "nombre_codigo",
      key: "nombre_codigo",
      sorter: (a, b) => (a.nombre_codigo ?? "").localeCompare(b.nombre_codigo ?? ""),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar codigo"
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
      onFilter: (value, record) => (record.nombre_codigo ?? "").toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Etapa ID",
      dataIndex: "id_etapa",
      key: "id_etapa",
      sorter: (a, b) => a.id_etapa - b.id_etapa,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Manzana) => (
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
        title="Manzanas"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Nueva Manzana
          </Button>
        }
      />
      <DataTable<Manzana>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_manzana"
        loading={isLoading}
      />

      {/* View Modal */}
      <Modal
        title="Detalle de la Manzana"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[<Button key="close" onClick={closeModal}>Cerrar</Button>]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Codigo">{modal.record.nombre_codigo ?? "S/N"}</Descriptions.Item>
            <Descriptions.Item label="Etapa ID">{modal.record.id_etapa}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Manzana"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre_codigo" label="Codigo" rules={[{ required: true, message: "Ingrese el codigo de la manzana" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nueva Manzana"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre_codigo" label="Codigo" rules={[{ required: true, message: "Ingrese el codigo de la manzana" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Manzana"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Estás seguro que deseas eliminar la manzana <strong>{modal.record?.nombre_codigo ?? "S/N"}</strong>?
        </p>
      </Modal>
    </div>
  );
}
