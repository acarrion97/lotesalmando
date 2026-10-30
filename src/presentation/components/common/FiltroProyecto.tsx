import type { CSSProperties } from "react";
import { Select } from "antd";

interface FiltroProyectoProps {
  value: number | null;
  onChange: (value: number | null) => void;
  options: { value: number; label: string }[];
  loading?: boolean;
  style?: CSSProperties;
}

export function FiltroProyecto({ value, onChange, options, loading, style }: FiltroProyectoProps) {
  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder="Todos los proyectos"
      value={value ?? undefined}
      onChange={(selected) => onChange(selected ?? null)}
      options={options}
      loading={loading}
      style={{ minWidth: 220, ...style }}
    />
  );
}
