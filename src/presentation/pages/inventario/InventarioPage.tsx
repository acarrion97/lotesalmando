import { useState, useMemo } from "react";
import { Button, Space, Input, Modal, Form, Select, message, Descriptions, Spin } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import type { Inventario } from "@/domain/inventario/entities/Inventario";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { FiltroProyecto } from "@/presentation/components/common/FiltroProyecto";
import { crearMapaProyectoPorLote } from "@/presentation/utils/proyectos";
import { useInventario, useLotes, useUsuarios, useLookup, useManzanas, useEtapas, useProyectos } from "@/presentation/hooks";
import { getContainer } from "@/infrastructure/container";
import { useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";

const estadoOptions = [
  { value: "disponible", label: "Disponible" },
  { value: "reservado", label: "Reservado" },
  { value: "en_negociacion", label: "En Negociacion" },
  { value: "vendido", label: "Vendido" },
  { value: "bloqueado", label: "Bloqueado" },
  { value: "no_disponible", label: "No Disponible" },
];

type ModalType = "create" | "edit" | "view" | "delete" | null;

interface ModalState {
  type: ModalType;
  visible: boolean;
  record: Inventario | null;
}

export function InventarioPage() {
  const { data: inventario, isLoading, error } = useInventario();
  const { data: lotes, isLoading: loadingLotes } = useLotes();
  const { data: manzanas, isLoading: loadingManzanas } = useManzanas();
  const { data: etapas, isLoading: loadingEtapas } = useEtapas();
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  const { data: usuarios } = useUsuarios();
  const loteMap = useLookup(lotes, "id_lote", "numero_lote", "Lote");
  const usuarioMap = useLookup(usuarios, "id_usuario", "nombres", "Usuario");
  const container = getContainer();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [searchText, setSearchText] = useState("");
  const [proyectoFilter, setProyectoFilter] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const proyectoPorLote = useMemo(
    () => crearMapaProyectoPorLote(lotes, manzanas, etapas),
    [lotes, manzanas, etapas],
  );

  const filteredData = useMemo(() => {
    if (!inventario) return [];
    return inventario.filter((i) => {
      const perteneceAlProyecto =
        proyectoFilter === null || proyectoPorLote.get(i.id_lote) === proyectoFilter;
      const coincideBusqueda =
        String(i.id_lote).includes(searchText) ||
        i.estado_anterior.toLowerCase().includes(searchText.toLowerCase()) ||
        i.estado_nuevo.toLowerCase().includes(searchText.toLowerCase());
      return perteneceAlProyecto && coincideBusqueda;
    });
  }, [inventario, searchText, proyectoFilter, proyectoPorLote]);

  const loteOptions = useMemo(
    () => (lotes ?? []).map((l) => ({ value: l.id_lote, label: `Lote ${l.numero_lote}` })),
    [lotes]
  );
  const usuarioOptions = useMemo(
    () => (usuarios ?? []).map((u) => ({ value: u.id_usuario, label: u.nombres })),
    [usuarios]
  );

  const handleCreateValuesChange = (changed: { id_lote?: number }) => {
    if (changed.id_lote === undefined) return;
    const lote = lotes?.find((l) => l.id_lote === changed.id_lote);
    if (lote) createForm.setFieldsValue({ estado_anterior: lote.estado });
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: inventoryKeys.inventario() });

  const openModal = (type: ModalType, record: Inventario | null = null) => {
    setModal({ type, visible: true, record });
    if (type === "edit" && record) {
      editForm.setFieldsValue({ estado_nuevo: record.estado_nuevo });
    }
    if (type === "create") {
      createForm.resetFields();
    }
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    createForm.resetFields();
    editForm.resetFields();
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await container.createInventario.execute({
        id_lote: values.id_lote,
        id_usuario: values.id_usuario,
        estado_anterior: values.estado_anterior,
        estado_nuevo: values.estado_nuevo,
      });
      await refresh();
      messageApi.success("Registro creado correctamente");
      closeModal();
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await container.updateInventario.execute(modal.record!.id_inventario, {
        estado_nuevo: values.estado_nuevo,
      });
      await refresh();
      messageApi.success("Registro actualizado correctamente");
      closeModal();
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await container.deleteInventario.execute(modal.record!.id_inventario);
      await refresh();
      messageApi.success("Registro eliminado correctamente");
      closeModal();
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const columns: TableColumnType<Inventario>[] = [
    {
      title: "Lote",
      dataIndex: "id_lote",
      key: "id_lote",
      render: (id: number) => loteMap[id] ? `${loteMap[id]} #${id}` : `Lote #${id}`,
      sorter: (a, b) => a.id_lote - b.id_lote,
    },
    {
      title: "Usuario",
      dataIndex: "id_usuario",
      key: "id_usuario",
      render: (id: number) => usuarioMap[id] ?? `Usuario #${id}`,
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
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openModal("view", record)}>
            Ver
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal("edit", record)}>
            Editar
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => openModal("delete", record)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  if (error) {
    return <div>Error al cargar inventario</div>;
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Inventario"
        search={{ value: searchText, onChange: setSearchText }}
        extra={
          <FiltroProyecto
            value={proyectoFilter}
            onChange={setProyectoFilter}
            options={(proyectos ?? []).map((p) => ({ value: p.id_proyecto, label: p.nombre }))}
            loading={loadingProyectos}
          />
        }
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal("create")}>
            Nuevo
          </Button>
        }
      />
      <Spin spinning={isLoading}>
        <DataTable<Inventario>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_inventario"
          loading={
            isLoading ||
            (proyectoFilter !== null &&
              (loadingLotes || loadingManzanas || loadingEtapas || loadingProyectos))
          }
        />
      </Spin>

      {/* Modal de Crear */}
      <Modal
        title="Crear Registro de Inventario"
        open={modal.visible && modal.type === "create"}
        onCancel={closeModal}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" onValuesChange={handleCreateValuesChange}>
          <Form.Item
            name="id_lote"
            label="Lote"
            rules={[{ required: true, message: "Seleccione el lote" }]}
          >
            <Select
              showSearch
              placeholder="Seleccionar lote"
              options={loteOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="id_usuario"
            label="Usuario"
            rules={[{ required: true, message: "Seleccione el usuario" }]}
          >
            <Select
              showSearch
              placeholder="Seleccionar usuario"
              options={usuarioOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="estado_anterior"
            label="Estado Anterior"
            rules={[{ required: true, message: "Seleccione el estado anterior" }]}
          >
            <Select placeholder="Seleccionar estado anterior" options={estadoOptions} />
          </Form.Item>
          <Form.Item
            name="estado_nuevo"
            label="Estado Nuevo"
            rules={[{ required: true, message: "Seleccione el estado nuevo" }]}
          >
            <Select placeholder="Seleccionar estado nuevo" options={estadoOptions} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Editar */}
      <Modal
        title="Editar Registro de Inventario"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Lote">{loteMap[modal.record.id_lote] ? `${loteMap[modal.record.id_lote]} #${modal.record.id_lote}` : `Lote #${modal.record.id_lote}`}</Descriptions.Item>
            <Descriptions.Item label="Usuario">{usuarioMap[modal.record.id_usuario] ?? `Usuario #${modal.record.id_usuario}`}</Descriptions.Item>
            <Descriptions.Item label="Estado Anterior">{modal.record.estado_anterior}</Descriptions.Item>
            <Descriptions.Item label="Estado Nuevo actual">{modal.record.estado_nuevo}</Descriptions.Item>
          </Descriptions>
        )}
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="estado_nuevo"
            label="Estado Nuevo"
            rules={[{ required: true, message: "Seleccione el estado nuevo" }]}
          >
            <Select placeholder="Seleccionar estado nuevo" options={estadoOptions} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Ver */}
      <Modal
        title="Detalle de Registro de Inventario"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={null}
      >
        {modal.record && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID Inventario">{modal.record.id_inventario}</Descriptions.Item>
            <Descriptions.Item label="Lote">{loteMap[modal.record.id_lote] ? `${loteMap[modal.record.id_lote]} #${modal.record.id_lote}` : `Lote #${modal.record.id_lote}`}</Descriptions.Item>
            <Descriptions.Item label="Usuario">{usuarioMap[modal.record.id_usuario] ?? `Usuario #${modal.record.id_usuario}`}</Descriptions.Item>
            <Descriptions.Item label="Estado Anterior">{modal.record.estado_anterior}</Descriptions.Item>
            <Descriptions.Item label="Estado Nuevo">{modal.record.estado_nuevo}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Modal de Eliminar */}
      <Modal
        title="Eliminar Registro de Inventario"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Estás seguro que deseas eliminar el registro del lote <strong>{modal.record?.id_lote}</strong>?
        </p>
      </Modal>
    </div>
  );
}
