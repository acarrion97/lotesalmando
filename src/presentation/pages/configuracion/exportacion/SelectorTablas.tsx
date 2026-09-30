import { Alert, Select, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { TableOutlined } from "@ant-design/icons";
import { EXPORT_TABLES } from "@/infrastructure/export/exportTableCatalog";
import type { TablaExport } from "@/infrastructure/export/exportTableCatalog";

interface SelectorTablasProps {
  value: string[];
  onChange: (tablas: string[]) => void;
  titulo: string;
  descripcion: string;
  /** Aclaración extra (ej. columnas que se completan solas). */
  nota?: ReactNode;
}

/** Paso 1 compartido: elige una o varias tablas y muestra sus columnas. */
export function SelectorTablas({
  value,
  onChange,
  titulo,
  descripcion,
  nota,
}: SelectorTablasProps) {
  const tablas: TablaExport[] = value
    .map((nombre) => EXPORT_TABLES.find((t) => t.tabla === nombre))
    .filter((t): t is TablaExport => Boolean(t));

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Text strong>{titulo}</Typography.Text>
        <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>{descripcion}</div>
      </div>

      <Select
        mode="multiple"
        placeholder="Elegir una o varias tablas"
        style={{ width: "100%" }}
        value={value}
        onChange={(valores) => onChange(valores as string[])}
        optionFilterProp="label"
        maxTagCount="responsive"
        options={EXPORT_TABLES.map((t) => ({
          value: t.tabla,
          label: `${t.etiqueta} · ${t.tabla}`,
        }))}
      />

      {nota}

      {tablas.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<TableOutlined />}
          message={`${tablas.length} tabla${tablas.length === 1 ? "" : "s"} seleccionada${
            tablas.length === 1 ? "" : "s"
          }`}
          description={
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {tablas.map((tabla) => (
                <div key={tabla.tabla}>
                  <Typography.Text strong>{tabla.etiqueta}</Typography.Text>{" "}
                  <Tag>{tabla.tabla}</Tag>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                    {tabla.columnas
                      .filter((col) => !col.sistema && !col.empresaActual)
                      .map((col) => col.key)
                      .join(", ")}
                    {tabla.claveNatural && tabla.claveNatural.length > 0 && (
                      <>
                        {" · "}
                        se identifica por{" "}
                        <Typography.Text code>{tabla.claveNatural.join(" / ")}</Typography.Text>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </Space>
          }
        />
      )}
    </Space>
  );
}
