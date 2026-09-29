import { Alert, Select, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { TableOutlined } from "@ant-design/icons";
import { EXPORT_TABLES } from "@/infrastructure/export/exportTableCatalog";

interface SelectorTablaProps {
  value: string | null;
  onChange: (tabla: string | null) => void;
  titulo: string;
  descripcion: string;
  /** Aclaración extra (ej. columnas que se completan solas). */
  nota?: ReactNode;
}

/** Paso 1 compartido: elige la tabla destino y muestra sus columnas. */
export function SelectorTabla({ value, onChange, titulo, descripcion, nota }: SelectorTablaProps) {
  const tabla = EXPORT_TABLES.find((t) => t.tabla === value) ?? null;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Text strong>{titulo}</Typography.Text>
        <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>{descripcion}</div>
      </div>

      <Select
        placeholder="Elegir tabla"
        style={{ width: "100%" }}
        value={value}
        onChange={(valor) => onChange(valor ?? null)}
        allowClear
        showSearch
        optionFilterProp="label"
        options={EXPORT_TABLES.map((t) => ({
          value: t.tabla,
          label: `${t.etiqueta} · ${t.tabla}`,
        }))}
      />

      {nota}

      {tabla && (
        <Alert
          type="info"
          showIcon
          icon={<TableOutlined />}
          message={`${tabla.etiqueta} (${tabla.tabla})`}
          description={
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <span>{tabla.descripcion}</span>
              <Space wrap>
                {tabla.columnas.map((col) => (
                  <Tag
                    key={col.key}
                    color={
                      col.sistema || col.empresaActual ? "default" : col.requerida ? "red" : "green"
                    }
                    style={col.sistema || col.empresaActual ? { opacity: 0.6 } : undefined}
                  >
                    {col.key}
                    {col.requerida && !col.sistema && !col.empresaActual ? " *" : ""}
                  </Tag>
                ))}
              </Space>
              <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                Rojo: obligatoria · Verde: opcional · Gris: técnica o de empresa (no se incluye en
                la plantilla por defecto).
              </span>
            </Space>
          }
        />
      )}
    </Space>
  );
}
