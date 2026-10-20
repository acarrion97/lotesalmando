import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Statistic,
  Tooltip,
  Dropdown,
  Modal,
  Form,
  InputNumber,
  Select,
  Descriptions,
  message,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useLotes, useManzanas, useEtapas, useProyectos, useLookup, usePlanDeEmpresa } from "@/presentation/hooks";
import { FreshnessBadge } from "@/presentation/components/common/FreshnessBadge";
import type { Lote, LoteEstado } from "@/domain/lote/entities/Lote";
import { getContainer } from "@/infrastructure/container";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { loteSchema } from "@/presentation/validations";
import { compararNumeroLote } from "@/utils";
import { ZodError } from "zod";

const estadoConfig: Record<LoteEstado, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  disponible: {
    color: "#52c41a",
    bg: "#f6ffed",
    border: "#b7eb8f",
    icon: <CheckCircleOutlined />,
  },
  reservado: {
    color: "#faad14",
    bg: "#fffbe6",
    border: "#ffe58f",
    icon: <ClockCircleOutlined />,
  },
  vendido: {
    color: "#ff4d4f",
    bg: "#fff2f0",
    border: "#ffccc7",
    icon: <StopOutlined />,
  },
  en_negociacion: {
    color: "#1677ff",
    bg: "#e6f4ff",
    border: "#91caff",
    icon: <ClockCircleOutlined />,
  },
  bloqueado: {
    color: "#8c8c8c",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    icon: <StopOutlined />,
  },
  no_disponible: {
    color: "#8c8c8c",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    icon: <StopOutlined />,
  },
};

/** Texto opcional: trim y `undefined` cuando quedo vacio (asi no se persiste "" en columnas con indice unico). */
function textoOpcional(value: unknown): string | undefined {
  const texto = typeof value === "string" ? value.trim() : "";
  return texto === "" ? undefined : texto;
}

/** Normaliza un numero de lote para comparar (trim + minusculas). */
function normalizarNumero(numero: unknown): string {
  return typeof numero === "string" ? numero.trim().toLowerCase() : "";
}

/**
 * El numero de lote es unico dentro de la empresa: no puede repetirse en ninguna
 * manzana ni proyecto. `idLoteExcluido` evita que la edicion de un lote choque
 * consigo mismo.
 */
function numeroYaUsado(
  lotes: Array<{ id_lote: number; numero_lote: string }> | undefined,
  numero: unknown,
  idLoteExcluido?: number,
): boolean {
  const buscado = normalizarNumero(numero);
  if (!buscado) return false;
  return (
    lotes?.some(
      (l) => l.id_lote !== idLoteExcluido && normalizarNumero(l.numero_lote) === buscado,
    ) ?? false
  );
}

/** Convierte el error capturado en un mensaje que el usuario pueda entender. */
function mensajeErrorLote(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    // 23505 = unique_violation (numero de lote repetido en la empresa o codigo catastral duplicado).
    if ((error as { code?: string }).code === "23505") {
      return "Ya existe un lote con esos datos: revisa el numero de lote en la manzana y el codigo catastral.";
    }
    const mensaje = (error as { message?: string }).message;
    if (mensaje) return mensaje;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Lote | null;
}

function LoteGridCard({ lote, manzanaNombre, onAction }: { lote: Lote; manzanaNombre?: string; onAction: (type: "view" | "edit" | "delete", record: Lote) => void }) {
  const config = estadoConfig[lote.estado] ?? estadoConfig.disponible;

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${config.border}`,
        transition: "all 0.3s",
      }}
      styles={{
        body: { padding: 0 },
      }}
    >
      <div
        style={{
          background: config.bg,
          padding: "16px 20px",
          borderBottom: `1px solid ${config.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: config.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
            }}
          >
            <HomeOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>{lote.numero_lote}</div>
            <div style={{ color: "#8c8c8c", fontSize: 12 }}>{manzanaNombre ?? `Manzana ${lote.id_manzana}`}</div>
          </div>
        </div>
        <Tag
          color={config.color}
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 11,
            padding: "2px 10px",
            borderRadius: 12,
          }}
        >
          {(lote.estado ?? "sin estado").toUpperCase()}
        </Tag>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>Precio de Lista</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a1a" }}>
              ${lote.precio_lista.toLocaleString()}
            </div>
          </div>
          <Dropdown
            menu={{
              items: [
                { key: "ver", icon: <EyeOutlined />, label: "Ver detalle", onClick: () => onAction("view", lote) },
                { key: "editar", icon: <EditOutlined />, label: "Editar", onClick: () => onAction("edit", lote) },
                { type: "divider" },
                { key: "eliminar", icon: <DeleteOutlined />, label: "Eliminar", danger: true, onClick: () => onAction("delete", lote) },
              ],
            }}
            trigger={["click"]}
          >
            <Button type="text" icon={<MoreOutlined />} style={{ color: "#8c8c8c" }} />
          </Dropdown>
        </div>
      </div>
    </Card>
  );
}

export function LotesPage() {
  const { data: lotes, isLoading, dataUpdatedAt } = useLotes();
  const { data: manzanas } = useManzanas();
  const { data: etapas } = useEtapas();
  const { data: proyectos } = useProyectos();
  // Limite de lotes por proyecto del plan de la empresa (null = sin limite).
  const plan = usePlanDeEmpresa();
  const manzanaMap = useLookup(manzanas, "id_manzana", "nombre_codigo", "Manzana");
  const etapaMap = useLookup(etapas, "id_etapa", "nombre", "Etapa");
  const proyectoMap = useLookup(proyectos, "id_proyecto", "nombre", "Proyecto");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // Evita doble envio mientras se persiste: sin esto, dos clics en "Crear" daban dos lotes.
  const [guardando, setGuardando] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshLotes = () => queryClient.invalidateQueries({ queryKey: ["lotes"] });

  // Opciones de manzana agrupadas por "Proyecto · Etapa" para poder asignar sin escribir IDs.
  const manzanaOptions = useMemo(() => {
    const groups = new Map<string, { label: string; options: { label: string; value: number }[] }>();
    for (const m of manzanas ?? []) {
      const etapa = etapas?.find((e) => e.id_etapa === m.id_etapa);
      const groupLabel =
        [etapa ? proyectoMap[etapa.id_proyecto] : undefined, etapaMap[m.id_etapa]]
          .filter(Boolean)
          .join(" · ") || "Sin etapa";
      const group = groups.get(groupLabel) ?? { label: groupLabel, options: [] };
      group.options.push({ label: m.nombre_codigo || `Manzana ${m.id_manzana}`, value: m.id_manzana });
      groups.set(groupLabel, group);
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [manzanas, etapas, etapaMap, proyectoMap]);

  const stats = useMemo(() => {
    if (!lotes) return { total: 0, disponibles: 0, reservados: 0, vendidos: 0, valorTotal: 0 };
    return {
      total: lotes.length,
      disponibles: lotes.filter((l) => l.estado === "disponible").length,
      reservados: lotes.filter((l) => l.estado === "reservado").length,
      vendidos: lotes.filter((l) => l.estado === "vendido").length,
      valorTotal: lotes.reduce((sum, l) => sum + l.precio_lista, 0),
    };
  }, [lotes]);

  const filteredData = useMemo(() => {
    if (!lotes) return [];
    return lotes
      .filter(
        (l) =>
          l.numero_lote.toLowerCase().includes(searchText.toLowerCase()) ||
          l.estado.toLowerCase().includes(searchText.toLowerCase()),
      )
      .sort(compararNumeroLote);
  }, [lotes, searchText]);

  const openModal = (type: "view" | "edit" | "delete", record: Lote) => {
    setModal({ type, visible: true, record });
    if (type === "edit") {
      editForm.setFieldsValue({
        numero_lote: record.numero_lote,
        precio_lista: record.precio_lista,
        estado: record.estado,
        id_manzana: record.id_manzana,
        superficie_m2: record.superficie_m2 ?? null,
        codigo_catastral: record.codigo_catastral ?? null,
        medidas: record.medidas ?? null,
      });
    }
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;

    let values: Record<string, unknown>;
    try {
      values = await editForm.validateFields();
    } catch {
      // Ya quedaron marcados en rojo los campos obligatorios: no hay nada que enviar.
      return;
    }

    const numeroEditado = textoOpcional(values.numero_lote) ?? modal.record.numero_lote;
    if (numeroYaUsado(lotes, numeroEditado, modal.record.id_lote)) {
      messageApi.error(`Ya existe un lote "${numeroEditado}" en esta empresa`);
      return;
    }

    setGuardando(true);
    try {
      const parsed = loteSchema.partial().parse({
        ...values,
        numero_lote: numeroEditado,
        id_manzana: values.id_manzana !== undefined ? Number(values.id_manzana) : undefined,
        // En edicion un campo vacio significa borrarlo: se manda `null` (ni "" ni omitido).
        codigo_catastral: textoOpcional(values.codigo_catastral) ?? null,
        medidas: textoOpcional(values.medidas) ?? null,
      });
      await container.updateLote.execute(modal.record.id_lote, parsed);
      await refreshLotes();
      messageApi.success("Lote actualizado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(mensajeErrorLote(error, "No se pudo actualizar el lote"));
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;

    try {
      await container.deleteLote.execute(modal.record.id_lote);
      await refreshLotes();
      messageApi.success("Lote eliminado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el lote");
    }
  };

  const handleCreate = async () => {
    let values: Record<string, unknown>;
    try {
      values = await createForm.validateFields();
    } catch {
      // Ya quedaron marcados en rojo los campos obligatorios: no hay nada que enviar.
      return;
    }

    const numeroLote = textoOpcional(values.numero_lote) ?? "";
    const idManzana = Number(values.id_manzana);

    if (numeroYaUsado(lotes, numeroLote)) {
      messageApi.error(`Ya existe un lote "${numeroLote}" en esta empresa`);
      return;
    }

    // Limite de lotes por proyecto del plan de la empresa (null = sin limite).
    if (plan.max_lotes_por_proyecto != null) {
      const manzanaDestino = (manzanas ?? []).find((m) => m.id_manzana === idManzana);
      const etapaDestino = manzanaDestino ? etapas?.find((e) => e.id_etapa === manzanaDestino.id_etapa) : undefined;
      const idProyectoDestino = etapaDestino?.id_proyecto;
      if (idProyectoDestino != null) {
        const lotesDelProyecto = (lotes ?? []).filter((l) => {
          const mz = (manzanas ?? []).find((m) => m.id_manzana === l.id_manzana);
          const et = mz ? etapas?.find((e) => e.id_etapa === mz.id_etapa) : undefined;
          return et?.id_proyecto === idProyectoDestino;
        }).length;
        if (lotesDelProyecto >= plan.max_lotes_por_proyecto) {
          messageApi.warning(
            `Tu plan permite hasta ${plan.max_lotes_por_proyecto} lotes por proyecto y el proyecto ya llego al limite. Amplia tu plan para cargar mas lotes.`
          );
          return;
        }
      }
    }

    setGuardando(true);
    try {
      const parsed = loteSchema.parse({
        ...values,
        numero_lote: numeroLote,
        id_manzana: idManzana,
        codigo_catastral: textoOpcional(values.codigo_catastral),
        medidas: textoOpcional(values.medidas),
      });
      await container.createLote.execute(parsed);
      await refreshLotes();
      messageApi.success("Lote creado correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(mensajeErrorLote(error, "No se pudo crear el lote"));
    } finally {
      setGuardando(false);
    }
  };

  const columns: TableColumnType<Lote>[] = [
    {
      title: "Numero",
      dataIndex: "numero_lote",
      key: "numero_lote",
      sorter: compararNumeroLote,
      render: (text: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#f0f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <HomeOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{text}</span>
        </div>
      ),
    },
    {
      title: "Manzana",
      dataIndex: "id_manzana",
      key: "id_manzana",
      sorter: (a, b) => a.id_manzana - b.id_manzana,
      filters: manzanas
        ? Array.from(new Set(manzanas.map((m) => m.id_manzana))).map((id) => ({ text: manzanaMap[id] ?? `Mz. ${id}`, value: id }))
        : [],
      onFilter: (value, record) => record.id_manzana === value,
      render: (id: number) => (
        <Tag style={{ borderRadius: 6, fontWeight: 500 }}>{manzanaMap[id] ?? `Mz. ${id}`}</Tag>
      ),
    },
    {
      title: "Precio Lista",
      dataIndex: "precio_lista",
      key: "precio_lista",
      sorter: (a, b) => a.precio_lista - b.precio_lista,
      render: (precio: number) => (
        <span style={{ fontWeight: 600, color: "#1a1a1a" }}>${precio.toLocaleString()}</span>
      ),
    },
    {
      title: "Superficie",
      dataIndex: "superficie_m2",
      key: "superficie_m2",
      sorter: (a, b) => (a.superficie_m2 ?? 0) - (b.superficie_m2 ?? 0),
      render: (m2: number | null | undefined) =>
        m2 != null ? `${m2.toLocaleString("es")} m²` : <span style={{ color: "#bfbfbf" }}>—</span>,
    },
    {
      title: "Cód. catastral",
      dataIndex: "codigo_catastral",
      key: "codigo_catastral",
      render: (codigo: string | null | undefined) =>
        codigo || <span style={{ color: "#bfbfbf" }}>—</span>,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: [
        { text: "Disponible", value: "disponible" },
        { text: "Reservado", value: "reservado" },
        { text: "En Negociacion", value: "en_negociacion" },
        { text: "Vendido", value: "vendido" },
        { text: "Bloqueado", value: "bloqueado" },
        { text: "No Disponible", value: "no_disponible" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado: LoteEstado) => {
        const config = estadoConfig[estado] ?? estadoConfig.disponible;
        return (
          <Tag
            color={config.color}
            style={{
              fontWeight: 600,
              fontSize: 11,
              padding: "2px 10px",
              borderRadius: 12,
              margin: 0,
            }}
          >
            {config.icon} {(estado ?? "sin estado").toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 200,
      render: (_: unknown, record: Lote) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              icon={<EyeOutlined />}
              style={{ color: "#1677ff" }}
              onClick={() => openModal("view", record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              style={{ color: "#faad14" }}
              onClick={() => openModal("edit", record)}
            />
          </Tooltip>
          <Popconfirm
            title="Eliminar lote"
            description="¿Estás seguro que deseas eliminar este lote?"
            onConfirm={() => {
              handleDelete();
            }}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                style={{ color: "#ff4d4f" }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Lotes"
        subtitle="Gestion de lotes por manzana y proyecto"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar lote..." }}
        extra={
          <>
            {lotes && <FreshnessBadge dataUpdatedAt={dataUpdatedAt} />}
            <div
              style={{
                display: "flex",
                border: "1px solid #d9d9d9",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Button
                type={viewMode === "table" ? "primary" : "text"}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode("table")}
                style={{ borderRadius: 0, border: "none" }}
              />
              <Button
                type={viewMode === "grid" ? "primary" : "text"}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("grid")}
                style={{ borderRadius: 0, border: "none" }}
              />
            </div>
          </>
        }
        actions={
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8, fontWeight: 600 }} onClick={() => setCreateModalOpen(true)}>
            Nuevo Lote
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #f0f0f0",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total Lotes</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700, fontSize: 24 }}
              prefix={<HomeOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #b7eb8f",
              background: "#fafafa",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Disponibles</span>}
              value={stats.disponibles}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#52c41a" }}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #ffe58f",
              background: "#fafafa",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Reservados</span>}
              value={stats.reservados}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#faad14" }}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #ffccc7",
              background: "#fafafa",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Vendidos</span>}
              value={stats.vendidos}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#ff4d4f" }}
              prefix={<StopOutlined style={{ color: "#ff4d4f" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
        styles={{
          body: { padding: 0 },
        }}
      >
        {viewMode === "table" ? (
          <DataTable<Lote>
            card={false}
            columns={columns}
            dataSource={filteredData}
            rowKey="id_lote"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total) => (
                <span style={{ color: "#8c8c8c" }}>
                  Mostrando <strong>{filteredData.length}</strong> de <strong>{total}</strong> lotes
                </span>
              ),
            }}
            style={{ margin: 0 }}
          />
        ) : (
          <div style={{ padding: 24 }}>
            {filteredData.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
                No se encontraron lotes
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredData.map((lote) => (
                  <Col key={lote.id_lote} xs={24} sm={12} md={8} lg={6}>
                    <LoteGridCard lote={lote} manzanaNombre={manzanaMap[lote.id_manzana] ?? `Manzana ${lote.id_manzana}`} onAction={openModal} />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </Card>

      {/* View Modal */}
      <Modal
        title="Detalle del Lote"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>
            Cerrar
          </Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Numero">{modal.record.numero_lote}</Descriptions.Item>
            <Descriptions.Item label="Manzana">{manzanaMap[modal.record.id_manzana] ?? `Manzana ${modal.record.id_manzana}`}</Descriptions.Item>
            <Descriptions.Item label="Precio de Lista">
              ${modal.record.precio_lista.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Superficie">
              {modal.record.superficie_m2 != null ? `${modal.record.superficie_m2.toLocaleString("es")} m²` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Código catastral">{modal.record.codigo_catastral || "—"}</Descriptions.Item>
            <Descriptions.Item label="Medidas">{modal.record.medidas || "—"}</Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={(estadoConfig[modal.record.estado] ?? estadoConfig.disponible).color}>
                {(modal.record.estado ?? "sin estado").toUpperCase()}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Lote"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="numero_lote"
            label="Numero de Lote"
            rules={[{ required: true, message: "Ingrese el numero de lote" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="id_manzana"
            label="Manzana"
            rules={[{ required: true, message: "Seleccione la manzana" }]}
          >
            <Select
              options={manzanaOptions}
              placeholder="Seleccione una manzana"
              showSearch
              optionFilterProp="label"
              notFoundContent={manzanas?.length ? "Sin manzanas disponibles" : "Cargando manzanas..."}
            />
          </Form.Item>
          <Form.Item
            name="precio_lista"
            label="Precio de Lista"
            rules={[{ required: true, message: "Ingrese el precio" }]}
          >
            <InputNumber<string | number>
              style={{ width: "100%" }}
              min={0}
              step={100}
              formatter={(value) =>
                value == null || value === ""
                  ? ""
                  : `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              // El parser DEBE devolver string: si devuelve un number, rc-input-number pierde el
              // contexto de tipeo y el precio se guarda mal (tipear "50000" guardaba 500.000).
              parser={(value) => value?.replace(/[^\d.-]/g, "") ?? ""}
            />
          </Form.Item>
          <Form.Item name="superficie_m2" label="Superficie (m²)">
            <InputNumber<number> style={{ width: "100%" }} min={0} step={0.01} decimalSeparator="," />
          </Form.Item>
          <Form.Item name="codigo_catastral" label="Código catastral">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="medidas" label="Medidas" extra="Lados del lote, p. ej. 8,00 x 18,00">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select
              options={[
                { value: "disponible", label: "Disponible" },
                { value: "reservado", label: "Reservado" },
                { value: "en_negociacion", label: "En Negociacion" },
                { value: "vendido", label: "Vendido" },
                { value: "bloqueado", label: "Bloqueado" },
                { value: "no_disponible", label: "No Disponible" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Lote"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        confirmLoading={guardando}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="numero_lote"
            label="Numero de Lote"
            rules={[{ required: true, message: "Ingrese el numero de lote" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="id_manzana"
            label="Manzana"
            rules={[{ required: true, message: "Seleccione la manzana" }]}
          >
            <Select
              options={manzanaOptions}
              placeholder="Seleccione una manzana"
              showSearch
              optionFilterProp="label"
              notFoundContent={manzanas?.length ? "Sin manzanas disponibles" : "Cargando manzanas..."}
            />
          </Form.Item>
          <Form.Item
            name="precio_lista"
            label="Precio de Lista"
            rules={[{ required: true, message: "Ingrese el precio" }]}
          >
            <InputNumber<string | number>
              style={{ width: "100%" }}
              min={0}
              step={100}
              formatter={(value) =>
                value == null || value === ""
                  ? ""
                  : `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              // El parser DEBE devolver string: si devuelve un number, rc-input-number pierde el
              // contexto de tipeo y el precio se guarda mal (tipear "50000" guardaba 500.000).
              parser={(value) => value?.replace(/[^\d.-]/g, "") ?? ""}
            />
          </Form.Item>
          <Form.Item name="superficie_m2" label="Superficie (m²)">
            <InputNumber<number> style={{ width: "100%" }} min={0} step={0.01} decimalSeparator="," />
          </Form.Item>
          <Form.Item name="codigo_catastral" label="Código catastral">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="medidas" label="Medidas" extra="Lados del lote, p. ej. 8,00 x 18,00">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select
              options={[
                { value: "disponible", label: "Disponible" },
                { value: "reservado", label: "Reservado" },
                { value: "en_negociacion", label: "En Negociacion" },
                { value: "vendido", label: "Vendido" },
                { value: "bloqueado", label: "Bloqueado" },
                { value: "no_disponible", label: "No Disponible" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete handled by Popconfirm in the table */}
    </div>
  );
}
