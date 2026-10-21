import { useState, useMemo } from "react";
import { Alert, Button, Space, Input, Modal, Form, Descriptions, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, WalletOutlined, LinkOutlined, MailOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useClientes } from "@/presentation/hooks";
import { usePuede } from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";
import type { Cliente } from "@/domain/cliente/entities/Cliente";
import { getContainer } from "@/infrastructure/container";
import { clienteSchema } from "@/presentation/validations";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { ClienteDeudasModal } from "./ClienteDeudasModal";

interface ModalState {
  type: "view" | "edit" | "delete" | "deudas" | null;
  visible: boolean;
  record: Cliente | null;
}

export function ClientesPage() {
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const { data: clientes, isLoading } = useClientes(empresaId);
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();
  const puedeCrear = usePuede("crear_clientes");
  const puedeEditar = usePuede("editar_clientes");
  const puedeEliminar = usePuede("eliminar_clientes");

  const refreshClientes = () => queryClient.invalidateQueries({ queryKey: ["clientes", empresaId] });

  // Sin correo no llega el aviso del cron de cuotas (api/cron/cuotas-vencimiento
  // saltea a los clientes sin email), así que se marcan acá para que se completen.
  const sinEmail = useMemo(() => (clientes ?? []).filter((c) => !c.email?.trim()), [clientes]);
  const [soloSinEmail, setSoloSinEmail] = useState(false);

  const filteredData = useMemo(() => {
    const base = soloSinEmail ? sinEmail : clientes ?? [];
    return base.filter(
      (c) =>
        c.nombres.toLowerCase().includes(searchText.toLowerCase()) ||
        c.cedula_ruc.includes(searchText) ||
        c.email.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [clientes, sinEmail, soloSinEmail, searchText]);

  const openModal = (type: "view" | "edit" | "delete" | "deudas", record: Cliente) => {
    setModal({ type, visible: true, record });
    if (type === "edit") {
      editForm.setFieldsValue({
        nombres: record.nombres,
        cedula_ruc: record.cedula_ruc,
        email: record.email,
        telefono: record.telefono ?? "",
      });
    }
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;

    try {
      const values = await editForm.validateFields();
      const parsed = clienteSchema.parse(values);
      await container.updateCliente.execute(modal.record.id_cliente, parsed);
      await refreshClientes();
      messageApi.success("Cliente actualizado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar el cliente");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;

    try {
      await container.deleteCliente.execute(modal.record.id_cliente);
      await refreshClientes();
      messageApi.success("Cliente eliminado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el cliente");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const parsed = clienteSchema.parse(values);
      await container.createCliente.execute({
        ...parsed,
        // El cliente nace en la empresa seleccionada (migración 019): es lo
        // que después filtra el listado y los selectores de cotización.
        id_empresa: empresaActual?.id_empresa ?? null,
      });
      await refreshClientes();
      messageApi.success("Cliente creado correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear el cliente");
    }
  };

  const columns: TableColumnType<Cliente>[] = [
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
      title: "Cedula / RUC",
      dataIndex: "cedula_ruc",
      key: "cedula_ruc",
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar cedula"
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
      onFilter: (value, record) => record.cedula_ruc.includes(String(value)),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) =>
        email?.trim() ? (
          <span>{email}</span>
        ) : (
          <span style={{ color: "#faad14" }} aria-label="Sin email">
            Sin correo: no recibe los avisos de cuota
          </span>
        ),
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
      title: "Telefono",
      dataIndex: "telefono",
      key: "telefono",
      width: 140,
      render: (telefono?: string | null) =>
        telefono ? (
          <span>{telefono}</span>
        ) : (
          <span style={{ color: "#bfbfbf" }} aria-label="Sin telefono">
            —
          </span>
        ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: Cliente) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openModal("view", record)}>Ver</Button>
          <Button type="link" icon={<WalletOutlined />} onClick={() => openModal("deudas", record)}>Deudas</Button>
          {puedeEditar && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openModal("edit", record)}>Editar</Button>
          )}
          {puedeEliminar && (
            <Button type="link" danger icon={<DeleteOutlined />} onClick={() => openModal("delete", record)}>Eliminar</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Clientes"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Space>
            <Button
              icon={<LinkOutlined />}
              onClick={() => {
                const url = `${window.location.origin}/portal-cliente`;
                void navigator.clipboard?.writeText(url);
                message.success("Link del portal copiado: mandáselo al cliente y entra con su cédula");
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              Portal del cliente
            </Button>
            {puedeCrear ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                Nuevo
              </Button>
            ) : null}
          </Space>
        }
      />

      {sinEmail.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<MailOutlined />}
          style={{ marginBottom: 16 }}
          message={`${sinEmail.length} cliente(s) sin correo no reciben los avisos de cuota`}
          description="El cron de vencimiento manda el aviso por correo; si el cliente no tiene email cargado, no se le avisa ni puede recibir la confirmación de su comprobante. Completá el correo desde Editar."
          action={
            <Space size="small">
              <Button
                size="small"
                onClick={() => setSoloSinEmail((v) => !v)}
                type={soloSinEmail ? "primary" : "default"}
              >
                {soloSinEmail ? "Ver todos" : "Ver solo esos"}
              </Button>
            </Space>
          }
        />
      )}

      <DataTable<Cliente>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_cliente"
        loading={isLoading}
      />

      {/* View Modal */}
      <Modal
        title="Detalle del Cliente"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>Cerrar</Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nombres">{modal.record.nombres}</Descriptions.Item>
            <Descriptions.Item label="Cedula / RUC">{modal.record.cedula_ruc}</Descriptions.Item>
            <Descriptions.Item label="Email">{modal.record.email}</Descriptions.Item>
            <Descriptions.Item label="Telefono">
              {modal.record.telefono ?? (
                <span style={{ color: "#bfbfbf" }} aria-label="Sin telefono">
                  Sin registrar
                </span>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Deudas Modal */}
      <ClienteDeudasModal
        cliente={modal.record}
        open={modal.visible && modal.type === "deudas"}
        onClose={closeModal}
      />

      {/* Edit Modal */}
      <Modal
        title="Editar Cliente"
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
            name="cedula_ruc"
            label="Cedula / RUC"
            rules={[{ required: true, message: "Ingrese la cedula o RUC" }]}
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
            name="telefono"
            label="Telefono"
            rules={[{ max: 50, message: "Maximo 50 caracteres" }]}
          >
            <Input placeholder="0991234567" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Cliente"
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
            name="cedula_ruc"
            label="Cedula / RUC"
            rules={[{ required: true, message: "Ingrese la cedula o RUC" }]}
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
            name="telefono"
            label="Telefono"
            rules={[{ max: 50, message: "Maximo 50 caracteres" }]}
          >
            <Input placeholder="0991234567" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Cliente"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Estás seguro que deseas eliminar al cliente <strong>{modal.record?.nombres}</strong>?
        </p>
      </Modal>
    </div>
  );
}
