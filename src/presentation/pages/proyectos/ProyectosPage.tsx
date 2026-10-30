import { useState, useMemo } from "react";
import { Alert, Button, Space, Input, Modal, Form, Descriptions, message, Steps } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useProyectos, useEmpresas, useLookup, usePlanDeEmpresa } from "@/presentation/hooks";
import type { Proyecto } from "@/domain/proyecto/entities/Proyecto";
import { getContainer } from "@/infrastructure/container";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";
import { MapaProyectoCard } from "@/presentation/pages/configuracion/MapaProyectoCard";
import { GaleriaProyectoCard } from "@/presentation/pages/configuracion/GaleriaProyectoCard";

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Proyecto | null;
}

export function ProyectosPage() {
  const { data: proyectos, isLoading } = useProyectos();
  // Limite de proyectos del plan de la empresa (null = sin limite).
  const plan = usePlanDeEmpresa();
  const enLimiteProyectos = plan.max_proyectos != null && (proyectos?.length ?? 0) >= plan.max_proyectos;
  const { empresaActual } = useEmpresa();
  const { data: empresas } = useEmpresas();
  const empresaMap = useLookup(empresas, "id_empresa", "razon_social");
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [createdProject, setCreatedProject] = useState<Proyecto | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  // Configuración (plano, galería y enlace público) del proyecto de la fila.
  const [configProyecto, setConfigProyecto] = useState<Proyecto | null>(null);
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
      setCreatingProject(true);
      const proyecto = await container.createProyecto.execute({
        ...values,
        id_empresa: empresaActual.id_empresa,
      });
      await refreshProyectos();
      messageApi.success("Proyecto creado correctamente");
      setCreatedProject(proyecto);
      setCreateStep(1);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear el proyecto");
    } finally {
      setCreatingProject(false);
    }
  };

  const cerrarWizard = () => {
    setCreateModalOpen(false);
    setCreateStep(0);
    setCreatedProject(null);
    createForm.resetFields();
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
      render: (id: number) => empresaMap[id] ?? id,
      sorter: (a, b) => a.id_empresa - b.id_empresa,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Proyecto) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openModal("view", record)}>Ver</Button>
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => setConfigProyecto(record)}
          >
            Configuración
          </Button>
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
        title="Proyectos"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              if (enLimiteProyectos) {
                messageApi.warning(
                  `Tu plan permite hasta ${plan.max_proyectos} proyecto(s). Amplia tu plan para crear mas.`
                );
                return;
              }
              setCreateStep(0);
              setCreatedProject(null);
              setCreateModalOpen(true);
            }}
          >
            Nuevo
          </Button>
        }
      />
      <DataTable<Proyecto>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_proyecto"
        loading={isLoading}
      />

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
            <Descriptions.Item label="Empresa">{empresaMap[modal.record.id_empresa] ?? modal.record.id_empresa}</Descriptions.Item>
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
        title={createStep === 0 ? "Nuevo Proyecto" : "Configurar proyecto"}
        open={createModalOpen}
        onCancel={cerrarWizard}
        footer={
          createStep === 0 ? (
            <Space>
              <Button onClick={cerrarWizard}>Cancelar</Button>
              <Button type="primary" loading={creatingProject} onClick={handleCreate}>
                Crear y continuar
              </Button>
            </Space>
          ) : (
            <Button type="primary" onClick={cerrarWizard}>
              Terminar
            </Button>
          )
        }
        width={900}
        destroyOnHidden
      >
        <Steps
          current={createStep}
          items={[{ title: "Datos del proyecto" }, { title: "Configuración" }]}
          style={{ margin: "16px 0 24px" }}
          responsive
        />
        {createStep === 0 ? (
          <Form form={createForm} layout="vertical">
            <Form.Item
              name="nombre"
              label="Nombre"
              rules={[{ required: true, message: "Ingrese el nombre del proyecto" }]}
            >
              <Input />
            </Form.Item>
          </Form>
        ) : (
          <>
            <Alert
              type="success"
              showIcon
              message={`${createdProject?.nombre ?? "Proyecto"} creado`}
              description="Ahora podés cargar el plano y agregar fotos o videos para configurar cómo se verá el proyecto en el mapa público."
              style={{ marginBottom: 16 }}
            />
            {createdProject && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <MapaProyectoCard proyectoId={createdProject.id_proyecto} />
                <GaleriaProyectoCard proyectoId={createdProject.id_proyecto} />
              </div>
            )}
          </>
        )}
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

      {/* Modal de configuración: mismo componente que en Configuración, fijado a la fila */}
      <Modal
        title={`Configuración — ${configProyecto?.nombre ?? ""}`}
        open={configProyecto !== null}
        onCancel={() => setConfigProyecto(null)}
        footer={[<Button key="close" onClick={() => setConfigProyecto(null)}>Cerrar</Button>]}
        width={900}
      >
        {configProyecto && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            <MapaProyectoCard proyectoId={configProyecto.id_proyecto} />
            <GaleriaProyectoCard proyectoId={configProyecto.id_proyecto} />
          </div>
        )}
      </Modal>
    </div>
  );
}
