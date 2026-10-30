import { useState, useMemo } from "react";
import { Button, Space, Input, Modal, Form, Select, Descriptions, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useManzanas, useEtapas, useProyectos, useLookup } from "@/presentation/hooks";
import type { Manzana } from "@/domain/manzana/entities/Manzana";
import { getContainer } from "@/infrastructure/container";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { FiltroProyecto } from "@/presentation/components/common/FiltroProyecto";

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Manzana | null;
}

export function ManzanasPage() {
  const { data: manzanas, isLoading } = useManzanas();
  const { data: etapas, isLoading: loadingEtapas } = useEtapas();
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  const etapaMap = useLookup(etapas, "id_etapa", "nombre", "Etapa");
  const proyectoMap = useLookup(proyectos, "id_proyecto", "nombre", "Proyecto");
  const [searchText, setSearchText] = useState("");
  const [etapaFilter, setEtapaFilter] = useState<number | null>(null);
  const [proyectoFilter, setProyectoFilter] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshManzanas = () => queryClient.invalidateQueries({ queryKey: ["manzanas"] });

  // Etiquetas con el proyecto delante para distinguir etapas homónimas de otro proyecto.
  const etapaOptions = useMemo(
    () =>
      (etapas ?? []).map((e) => ({
        value: e.id_etapa,
        label: proyectoMap[e.id_proyecto] ? `${proyectoMap[e.id_proyecto]} · ${e.nombre}` : e.nombre,
      })),
    [etapas, proyectoMap]
  );

  const filteredData = useMemo(() => {
    if (!manzanas) return [];
    return manzanas.filter(
      (m) =>
        (etapaFilter === null || m.id_etapa === etapaFilter) &&
        (proyectoFilter === null ||
          etapas?.find((etapa) => etapa.id_etapa === m.id_etapa)?.id_proyecto === proyectoFilter) &&
        (m.nombre_codigo ?? "").toLowerCase().includes(searchText.toLowerCase())
    );
  }, [manzanas, etapas, searchText, etapaFilter, proyectoFilter]);

  const openModal = (type: "view" | "edit" | "delete", record: Manzana) => {
    setModal({ type, visible: true, record });
    if (type === "edit") editForm.setFieldsValue({ nombre_codigo: record.nombre_codigo, id_etapa: record.id_etapa });
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
      await container.createManzana.execute({ ...values, id_etapa: Number(values.id_etapa) });
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
      title: "Etapa",
      dataIndex: "id_etapa",
      key: "id_etapa",
      render: (id: number) => etapaMap[id] ?? `Etapa #${id}`,
      filters: etapaOptions.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.id_etapa === value,
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
        extra={
          <>
            <FiltroProyecto
              value={proyectoFilter}
              onChange={setProyectoFilter}
              options={(proyectos ?? []).map((p) => ({ value: p.id_proyecto, label: p.nombre }))}
              loading={loadingProyectos}
            />
            <Select
              allowClear
              placeholder="Todas las etapas"
              value={etapaFilter}
              onChange={(value) => setEtapaFilter(value ?? null)}
              options={etapaOptions}
              style={{ minWidth: 240 }}
            />
          </>
        }
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.setFieldsValue({ id_etapa: etapaFilter ?? undefined }); setCreateModalOpen(true); }}>
            Nueva Manzana
          </Button>
        }
      />
      <DataTable<Manzana>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_manzana"
        loading={isLoading || (proyectoFilter !== null && (loadingEtapas || loadingProyectos))}
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
            <Descriptions.Item label="Etapa">{etapaMap[modal.record.id_etapa] ?? `Etapa #${modal.record.id_etapa}`}</Descriptions.Item>
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
          <Form.Item name="id_etapa" label="Etapa" rules={[{ required: true, message: "Seleccione la etapa" }]}>
            <Select options={etapaOptions} placeholder="Seleccione una etapa" showSearch optionFilterProp="label" />
          </Form.Item>
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
          <Form.Item name="id_etapa" label="Etapa" rules={[{ required: true, message: "Seleccione la etapa" }]}>
            <Select options={etapaOptions} placeholder="Seleccione una etapa" showSearch optionFilterProp="label" />
          </Form.Item>
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
