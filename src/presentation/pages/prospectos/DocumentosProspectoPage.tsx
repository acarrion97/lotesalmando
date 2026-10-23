import { useMemo, useState } from "react";
import { Button, Segmented, Space, Tag, Typography } from "antd";
import { EyeOutlined, FileProtectOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import { DOCUMENTOS_REQUERIDOS } from "@/domain/portalProspecto/entities";
import { useDocumentosProspecto } from "@/presentation/hooks";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { ModalRevisionProspecto } from "@/presentation/components/prospectos/ModalRevisionProspecto";
import { formatDateOnly } from "@/utils";

const { Text } = Typography;

const ESTADO: Record<string, { color: string; label: string }> = {
  pendiente: { color: "blue", label: "En revisión" },
  aprobado: { color: "green", label: "Aprobado" },
  rechazado: { color: "red", label: "Rechazado" },
};

const nombreDeTipo = (tipo: string) =>
  DOCUMENTOS_REQUERIDOS.find((d) => d.tipo === tipo)?.nombre ?? tipo;

type FiltroEstado = "todos" | "pendiente" | "aprobado" | "rechazado";

/**
 * Prospectos → Documentación: lo que los prospectos enviaron desde el
 * portal público (/portal-prospecto/:slug), para aprobar o rechazar.
 * Requiere el permiso `revisar_documentos_prospectos`.
 */
export function DocumentosProspectoPage() {
  const { data: documentos, isLoading } = useDocumentosProspecto();
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<DocumentoProspecto | null>(null);

  const pendientes = useMemo(
    () => (documentos ?? []).filter((d) => d.estado === "pendiente").length,
    [documentos],
  );

  const filtrados = useMemo(() => {
    const lista = documentos ?? [];
    const texto = busqueda.trim().toLowerCase();
    return lista.filter((d) => {
      if (filtro !== "todos" && d.estado !== filtro) return false;
      if (!texto) return true;
      return (
        (d.prospecto?.nombres ?? "").toLowerCase().includes(texto) ||
        (d.prospecto?.email ?? "").toLowerCase().includes(texto) ||
        nombreDeTipo(d.tipo).toLowerCase().includes(texto)
      );
    });
  }, [documentos, filtro, busqueda]);

  const columnas: TableColumnType<DocumentoProspecto>[] = [
    {
      title: "Prospecto",
      key: "prospecto",
      render: (_: unknown, record: DocumentoProspecto) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.prospecto?.nombres ?? `#${record.id_prospecto}`}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.prospecto?.email ?? "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Documento",
      dataIndex: "tipo",
      key: "tipo",
      render: (tipo: string) => nombreDeTipo(tipo),
    },
    {
      title: "Archivo",
      dataIndex: "archivo_nombre",
      key: "archivo_nombre",
      render: (nombre: string | null) => nombre ?? "-",
    },
    {
      title: "Enviado",
      dataIndex: "creado_en",
      key: "creado_en",
      render: (fecha: string | null) => (fecha ? formatDateOnly(fecha.slice(0, 10)) : "-"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado: string) => (
        <Tag color={ESTADO[estado]?.color ?? "default"}>
          {ESTADO[estado]?.label ?? estado}
        </Tag>
      ),
    },
    {
      title: "Observación",
      dataIndex: "nota_revision",
      key: "nota_revision",
      render: (nota: string | null) =>
        nota ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {nota}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "",
      key: "accion",
      width: 110,
      render: (_: unknown, record: DocumentoProspecto) => (
        <Button
          size="small"
          type={record.estado === "pendiente" ? "primary" : "default"}
          ghost={record.estado !== "pendiente"}
          icon={<EyeOutlined />}
          onClick={() => setAbierto(record)}
        >
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title={
          <Space>
            <FileProtectOutlined />
            <span>Documentación de prospectos</span>
            {pendientes > 0 && <Tag color="orange">{pendientes} pendientes</Tag>}
          </Space>
        }
        subtitle="Documentación legal enviada desde el portal público"
        search={{
          value: busqueda,
          onChange: setBusqueda,
          placeholder: "Buscar prospecto o documento...",
        }}
        extra={
          <Segmented
            value={filtro}
            onChange={(v) => setFiltro(v as FiltroEstado)}
            options={[
              { label: "Todos", value: "todos" },
              { label: "Pendientes", value: "pendiente" },
              { label: "Aprobados", value: "aprobado" },
              { label: "Rechazados", value: "rechazado" },
            ]}
          />
        }
      />

      <DataTable<DocumentoProspecto>
        rowKey="id_documento"
        loading={isLoading}
        columns={columnas}
        dataSource={filtrados}
      />

      <ModalRevisionProspecto
        open={!!abierto}
        documento={abierto}
        onClose={() => setAbierto(null)}
      />
    </div>
  );
}
